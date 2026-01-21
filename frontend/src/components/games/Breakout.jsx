import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, Volume2, VolumeX, Trophy } from 'lucide-react';
import gameAudio from '../../utils/audio';
import LeaderboardModal from '../LeaderboardModal';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_HEIGHT = 12;
const BALL_RADIUS = 8;
const BRICK_ROWS = 5;
const BRICK_COLS = 10;
const BRICK_WIDTH = 70;
const BRICK_HEIGHT = 20;
const BRICK_PADDING = 5;
const BRICK_OFFSET_TOP = 60;
const BRICK_OFFSET_LEFT = 35;

// FPS Management
const TARGET_FPS_HIGH = 60;
const TARGET_FPS_LOW = 30;
const FRAME_TIME_HIGH = 1000 / TARGET_FPS_HIGH;
const FRAME_TIME_LOW = 1000 / TARGET_FPS_LOW;
const LAG_THRESHOLD_MS = 20;
const LAG_SAMPLE_COUNT = 30;

// Touch offset
const TOUCH_OFFSET_Y = 80;

const BRICK_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#00f0ff'];

// Procedural Level Generation
function generateLevel(levelNum) {
    // Difficulty scaling
    const speedMultiplier = 1 + (levelNum * 0.15); // Increase speed by 15% per level
    const paddleWidth = Math.max(60, 100 - (levelNum * 5)); // Decrease paddle width, min 60

    // Pattern Generation
    const patterns = ['full', 'checkerboard', 'rows', 'random', 'dense', 'columns'];
    // Cycle patterns but vary based on level
    const patternType = patterns[levelNum % patterns.length];

    // More dense/complex patterns at higher levels
    const densityChance = Math.min(0.8, 0.4 + (levelNum * 0.05));

    return {
        levelNum,
        speedMultiplier,
        paddleWidth,
        patternType,
        densityChance
    };
}

function createBrickGrid(levelConfig) {
    const grid = [];
    const { patternType, densityChance } = levelConfig;

    for (let row = 0; row < BRICK_ROWS; row++) {
        const rowBricks = [];
        for (let col = 0; col < BRICK_COLS; col++) {
            let active = true;

            // Pattern Logic
            if (patternType === 'checkerboard' && (row + col) % 2 === 0) active = false;
            if (patternType === 'rows' && row % 2 !== 0) active = false;
            if (patternType === 'columns' && col % 2 !== 0) active = false;
            if (patternType === 'random' && Math.random() > densityChance) active = false;

            // Dense pattern has some durable bricks
            const hits = (patternType === 'dense' && row < 2) ? 2 : 1;

            if (active) {
                rowBricks.push({
                    row,
                    col,
                    x: BRICK_OFFSET_LEFT + col * (BRICK_WIDTH + BRICK_PADDING),
                    y: BRICK_OFFSET_TOP + row * (BRICK_HEIGHT + BRICK_PADDING),
                    width: BRICK_WIDTH,
                    height: BRICK_HEIGHT,
                    color: BRICK_COLORS[row % BRICK_COLORS.length],
                    hits: hits,
                    active: true
                });
            } else {
                rowBricks.push(null); // No brick here
            }
        }
        grid.push(rowBricks);
    }
    return grid;
}

function Breakout() {
    const canvasRef = useRef(null);
    const canvasStaticRef = useRef(null);
    const ctxRef = useRef(null);
    const ctxStaticRef = useRef(null);
    const animationRef = useRef(null);

    // FPS management
    const fpsRef = useRef({
        mode: 'high',
        locked: false,
        frameTimes: [],
        lastTime: performance.now(),
        accumulator: 0
    });

    // Input refs - continuous keyboard state
    const inputRef = useRef({
        targetX: null,
        keyLeft: false,
        keyRight: false
    });

    const pointerLockedRef = useRef(false);

    const gameStateRef = useRef({
        paddleX: CANVAS_WIDTH / 2 - 50,
        ballX: CANVAS_WIDTH / 2,
        ballY: CANVAS_HEIGHT - 80,
        ballVX: -4,
        ballVY: -4, // Ensure ballVY is initialized
        brickGrid: [],
        brickCount: 0,
        lives: 3,
        score: 0,
        level: 0,
        currentConfig: null,
        status: 'idle'
    });

    const [uiState, setUiState] = useState({
        score: 0,
        lives: 3,
        level: 0,
        status: 'idle',
        fpsMode: 'high'
    });
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [viewingLeaderboard, setViewingLeaderboard] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

    useEffect(() => {
        const canvas = canvasRef.current;
        const canvasStatic = canvasStaticRef.current;
        if (canvas && canvasStatic) {
            ctxRef.current = canvas.getContext('2d', { alpha: true });
            ctxStaticRef.current = canvasStatic.getContext('2d', { alpha: false });
            drawIdleScreen();
        }
    }, [canvasSize]);

    useEffect(() => {
        let timeout;
        const updateSize = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                const maxWidth = Math.min(window.innerWidth - 48, CANVAS_WIDTH);
                const scale = maxWidth / CANVAS_WIDTH;
                setCanvasSize({ width: maxWidth, height: CANVAS_HEIGHT * scale });
            }, 100);
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => {
            window.removeEventListener('resize', updateSize);
            clearTimeout(timeout);
        };
    }, []);

    const scale = canvasSize.width / CANVAS_WIDTH;

    const drawStatic = () => {
        const ctx = ctxStaticRef.current;
        if (!ctx) return;
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    };

    const drawBricks = (grid) => {
        const ctx = ctxStaticRef.current;
        if (!ctx) return;

        // If full redraw needed (e.g. init)
        grid.forEach(row => {
            row.forEach(brick => {
                if (brick && brick.active) {
                    ctx.fillStyle = brick.color;
                    ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
                }
            });
        });
    };

    const clearBrick = (brick) => {
        const ctx = ctxStaticRef.current;
        if (!ctx) return;
        // Clear area of the brick
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    };

    const updateBrickVisual = (brick) => {
        const ctx = ctxStaticRef.current;
        if (!ctx) return;
        ctx.fillStyle = brick.color;
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    };

    const drawIdleScreen = () => {
        drawStatic();
        const ctx = ctxRef.current;
        if (!ctx) return;
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.font = '24px monospace';
        ctx.fillStyle = '#555';
        ctx.textAlign = 'center';
        ctx.fillText('Click to Start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.font = '14px monospace';
        ctx.fillText('Infinite levels with increasing difficulty', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
    };

    const resetBall = () => {
        const state = gameStateRef.current;
        const baseSpeed = 4 * state.currentConfig.speedMultiplier;

        state.ballX = CANVAS_WIDTH / 2;
        state.ballY = CANVAS_HEIGHT - 80;
        state.ballVX = (Math.random() > 0.5 ? 1 : -1) * baseSpeed;
        state.ballVY = -baseSpeed;
    };

    const loadLevel = (levelNum) => {
        const state = gameStateRef.current;
        state.level = levelNum;
        const config = generateLevel(levelNum);
        state.currentConfig = config;
        state.brickGrid = createBrickGrid(config);

        // Count active bricks
        let count = 0;
        state.brickGrid.forEach(row => row.forEach(b => { if (b) count++; }));
        state.brickCount = count;

        drawStatic();
        drawBricks(state.brickGrid);
        resetBall();
    };

    const requestPointerLock = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        try {
            if (canvas.requestPointerLock) {
                canvas.requestPointerLock();
            }
        } catch (e) { }
    };

    const releasePointerLock = () => {
        try {
            if (document.pointerLockElement === canvasRef.current) {
                document.exitPointerLock();
            }
        } catch (e) { }
        pointerLockedRef.current = false;
    };

    const gameLoop = useCallback((currentTime) => {
        const ctx = ctxRef.current;
        const state = gameStateRef.current;
        const fps = fpsRef.current;

        if (!ctx || state.status !== 'playing') return;

        const deltaTime = currentTime - fps.lastTime;
        fps.lastTime = currentTime;

        // FPS adaptation
        if (!fps.locked) {
            fps.frameTimes.push(deltaTime);
            if (fps.frameTimes.length > LAG_SAMPLE_COUNT) {
                fps.frameTimes.shift();
                const avgFrameTime = fps.frameTimes.reduce((a, b) => a + b, 0) / fps.frameTimes.length;
                if (avgFrameTime > LAG_THRESHOLD_MS && fps.mode === 'high') {
                    fps.mode = 'low';
                    fps.locked = true;
                    setUiState(prev => ({ ...prev, fpsMode: 'low' }));
                }
            }
        }

        // Frame rate limiting
        const targetFrameTime = fps.mode === 'high' ? FRAME_TIME_HIGH : FRAME_TIME_LOW;
        fps.accumulator += deltaTime;
        if (fps.accumulator < targetFrameTime) {
            animationRef.current = requestAnimationFrame(gameLoop);
            return;
        }
        fps.accumulator = fps.accumulator % targetFrameTime;

        const paddleWidth = state.currentConfig.paddleWidth;

        // Apply continuous keyboard input
        const keySpeed = 10;
        if (inputRef.current.keyLeft) {
            state.paddleX = Math.max(0, state.paddleX - keySpeed);
        }
        if (inputRef.current.keyRight) {
            state.paddleX = Math.min(CANVAS_WIDTH - paddleWidth, state.paddleX + keySpeed);
        }

        // Apply mouse/touch input
        if (inputRef.current.targetX !== null) {
            state.paddleX = Math.max(0, Math.min(
                CANVAS_WIDTH - paddleWidth,
                inputRef.current.targetX - paddleWidth / 2
            ));
        }

        // Clear dynamic canvas
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Update ball
        state.ballX += state.ballVX;
        state.ballY += state.ballVY;

        // Wall collisions
        if (state.ballX <= BALL_RADIUS || state.ballX >= CANVAS_WIDTH - BALL_RADIUS) {
            state.ballVX *= -1;
            state.ballX = Math.max(BALL_RADIUS, Math.min(CANVAS_WIDTH - BALL_RADIUS, state.ballX));
            gameAudio.play('bounce');
        }
        if (state.ballY <= BALL_RADIUS) {
            state.ballVY *= -1;
            state.ballY = BALL_RADIUS;
            gameAudio.play('bounce');
        }

        // Paddle collision
        const paddleTop = CANVAS_HEIGHT - 30;
        if (
            state.ballY + BALL_RADIUS >= paddleTop &&
            state.ballY - BALL_RADIUS < paddleTop + PADDLE_HEIGHT &&
            state.ballX >= state.paddleX &&
            state.ballX <= state.paddleX + paddleWidth &&
            state.ballVY > 0
        ) {
            const hitPos = (state.ballX - state.paddleX) / paddleWidth;
            const angle = (hitPos - 0.5) * Math.PI * 0.6;
            const speed = Math.sqrt(state.ballVX ** 2 + state.ballVY ** 2);
            state.ballVX = Math.sin(angle) * speed;
            state.ballVY = -Math.cos(angle) * speed;
            state.ballY = paddleTop - BALL_RADIUS;
            gameAudio.play('bounce');
        }

        // Ball out
        if (state.ballY > CANVAS_HEIGHT) {
            state.lives--;
            if (state.lives <= 0) {
                state.status = 'ended';
                releasePointerLock();
                gameAudio.play('gameOver');
                setUiState(prev => ({ ...prev, lives: 0, status: 'ended' }));
                setShowLeaderboard(true);
                return;
            }
            gameAudio.play('wrong');
            setUiState(prev => ({ ...prev, lives: state.lives }));
            resetBall();
        }

        // Spatial Grid Collision
        let startRow = Math.floor((state.ballY - BALL_RADIUS - BRICK_OFFSET_TOP) / (BRICK_HEIGHT + BRICK_PADDING));
        let endRow = Math.floor((state.ballY + BALL_RADIUS - BRICK_OFFSET_TOP) / (BRICK_HEIGHT + BRICK_PADDING));
        let startCol = Math.floor((state.ballX - BALL_RADIUS - BRICK_OFFSET_LEFT) / (BRICK_WIDTH + BRICK_PADDING));
        let endCol = Math.floor((state.ballX + BALL_RADIUS - BRICK_OFFSET_LEFT) / (BRICK_WIDTH + BRICK_PADDING));

        // Clamp indices
        startRow = Math.max(0, startRow);
        endRow = Math.min(BRICK_ROWS - 1, endRow);
        startCol = Math.max(0, startCol);
        endCol = Math.min(BRICK_COLS - 1, endCol);

        let collisionFound = false;

        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                if (collisionFound) break;

                const brick = state.brickGrid[r] && state.brickGrid[r][c];
                if (brick && brick.active) {
                    if (
                        state.ballX + BALL_RADIUS > brick.x &&
                        state.ballX - BALL_RADIUS < brick.x + brick.width &&
                        state.ballY + BALL_RADIUS > brick.y &&
                        state.ballY - BALL_RADIUS < brick.y + brick.height
                    ) {
                        brick.hits--;
                        if (brick.hits <= 0) {
                            brick.active = false;
                            state.brickCount--;
                            state.score += 10 * (state.level + 1);
                            gameAudio.play('score');
                            clearBrick(brick);
                        } else {
                            brick.color = '#888';
                            gameAudio.play('bounce');
                            updateBrickVisual(brick);
                        }

                        const overlapLeft = (state.ballX + BALL_RADIUS) - brick.x;
                        const overlapRight = (brick.x + brick.width) - (state.ballX - BALL_RADIUS);
                        const overlapTop = (state.ballY + BALL_RADIUS) - brick.y;
                        const overlapBottom = (brick.y + brick.height) - (state.ballY - BALL_RADIUS);

                        const minOverlapX = Math.min(overlapLeft, overlapRight);
                        const minOverlapY = Math.min(overlapTop, overlapBottom);

                        if (minOverlapX < minOverlapY) {
                            state.ballVX *= -1; // Side hit
                        } else {
                            state.ballVY *= -1; // Top/Bottom hit
                        }

                        collisionFound = true;
                    }
                }
            }
        }

        // Level complete - Infinite levels
        if (state.brickCount <= 0) {
            gameAudio.play('levelUp');
            // Advance to next level indefinitely
            loadLevel(state.level + 1);
            setUiState(prev => ({ ...prev, level: state.level, score: state.score }));
        }

        // Draw paddle
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(state.paddleX, paddleTop, paddleWidth, PADDLE_HEIGHT);

        // Draw ball
        ctx.beginPath();
        ctx.arc(state.ballX, state.ballY, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();

        animationRef.current = requestAnimationFrame(gameLoop);
    }, []);

    const startGame = useCallback(() => {
        gameAudio.init();
        const state = gameStateRef.current;
        state.lives = 3;
        state.score = 0;
        state.paddleX = CANVAS_WIDTH / 2 - 50;
        state.status = 'playing';

        inputRef.current = { targetX: null, keyLeft: false, keyRight: false };
        fpsRef.current.lastTime = performance.now();
        fpsRef.current.accumulator = 0;

        loadLevel(0);
        setUiState({ score: 0, lives: 3, level: 0, status: 'playing', fpsMode: fpsRef.current.mode });

        requestPointerLock();

        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        animationRef.current = requestAnimationFrame(gameLoop);
    }, [gameLoop]);

    const pauseGame = useCallback(() => {
        const state = gameStateRef.current;
        if (state.status === 'playing') {
            state.status = 'paused';
            releasePointerLock();
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            setUiState(prev => ({ ...prev, status: 'paused' }));
        } else if (state.status === 'paused') {
            state.status = 'playing';
            fpsRef.current.lastTime = performance.now();
            setUiState(prev => ({ ...prev, status: 'playing' }));
            requestPointerLock();
            animationRef.current = requestAnimationFrame(gameLoop);
        }
    }, [gameLoop]);

    const handleCanvasClick = useCallback(() => {
        const state = gameStateRef.current;
        if (state.status === 'idle' || state.status === 'ended') {
            startGame();
        } else if (state.status === 'paused') {
            pauseGame();
        }
    }, [startGame, pauseGame]);

    useEffect(() => {
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            releasePointerLock();
        };
    }, []);

    useEffect(() => {
        const handleLockChange = () => {
            pointerLockedRef.current = document.pointerLockElement === canvasRef.current;
        };
        document.addEventListener('pointerlockchange', handleLockChange);
        return () => document.removeEventListener('pointerlockchange', handleLockChange);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            const state = gameStateRef.current;

            if (e.key === 'Escape' && state.status === 'playing') {
                pauseGame();
                return;
            }

            if (e.key === ' ') {
                e.preventDefault();
                if (state.status === 'playing' || state.status === 'paused') {
                    pauseGame();
                }
                return;
            }

            if (state.status !== 'playing') return;

            if (e.key === 'ArrowLeft' || e.key === 'a') {
                inputRef.current.keyLeft = true;
            } else if (e.key === 'ArrowRight' || e.key === 'd') {
                inputRef.current.keyRight = true;
            }
        };

        const handleKeyUp = (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a') {
                inputRef.current.keyLeft = false;
            } else if (e.key === 'ArrowRight' || e.key === 'd') {
                inputRef.current.keyRight = false;
            }
        };

        const handleMouseMove = (e) => {
            const state = gameStateRef.current;
            if (state.status !== 'playing') return;

            if (pointerLockedRef.current) {
                const paddleWidth = state.currentConfig.paddleWidth;
                const deltaX = e.movementX / scale;
                state.paddleX = Math.max(0, Math.min(CANVAS_WIDTH - paddleWidth, state.paddleX + deltaX));
                inputRef.current.targetX = null;
            } else {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const rect = canvas.getBoundingClientRect();
                const paddleWidth = state.currentConfig?.paddleWidth || 100;
                inputRef.current.targetX = (e.clientX - rect.left) / scale;
            }
        };

        const handleTouchMove = (e) => {
            const state = gameStateRef.current;
            if (state.status !== 'playing') return;
            e.preventDefault();

            const touch = e.touches[0];
            const canvas = canvasRef.current;
            if (!canvas || !touch) return;
            const rect = canvas.getBoundingClientRect();
            inputRef.current.targetX = (touch.clientX - rect.left) / scale;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        const canvas = canvasRef.current;
        if (canvas) {
            canvas.addEventListener('mousemove', handleMouseMove);
            canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            if (canvas) {
                canvas.removeEventListener('mousemove', handleMouseMove);
                canvas.removeEventListener('touchmove', handleTouchMove);
            }
        };
    }, [scale, pauseGame]);

    const toggleAudio = () => {
        gameAudio.init();
        const enabled = gameAudio.toggle();
        setAudioEnabled(enabled);
        if (enabled) gameAudio.play('click');
    };

    const getAchievement = () => `Reached Level ${uiState.level + 1}`;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/games" className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        <ArrowLeft size={24} className="text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white">Breakout</h1>
                        <p className="text-gray-500 text-sm">Infinite levels of brick-breaking action</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setViewingLeaderboard(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 text-gray-400 hover:bg-primary/20 hover:text-primary transition-colors text-sm"
                    >
                        <Trophy size={18} />
                        <span className="hidden sm:inline">Leaderboard</span>
                    </button>
                    <button
                        onClick={toggleAudio}
                        className={`p-2 rounded-lg transition-colors ${audioEnabled ? 'bg-primary/20 text-primary' : 'bg-white/10 text-gray-400'}`}
                    >
                        {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    </button>
                </div>
            </div>

            {/* Game container */}
            <div className="glass-panel rounded-2xl p-4 sm:p-6">
                {/* Stats */}
                <div className="flex justify-center gap-6 mb-4">
                    <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase">Score</p>
                        <p className="text-2xl font-bold font-mono text-primary">{uiState.score.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase">Level</p>
                        <p className="text-2xl font-bold font-mono text-secondary">{uiState.level + 1}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase">Lives</p>
                        <p className="text-xl">
                            {/* Detailed heart display: Red for remaining, Black for lost */}
                            {[...Array(3)].map((_, i) => (
                                <span key={i} className={i < uiState.lives ? "text-red-500" : "text-black"}>
                                    ❤
                                </span>
                            ))}
                        </p>
                    </div>
                </div>

                {uiState.fpsMode === 'low' && (
                    <p className="text-center text-yellow-500 text-xs mb-2">Performance mode: 30 FPS</p>
                )}

                {/* Canvas */}
                <div className="flex justify-center">
                    {/* Canvas Container */}
                    <div className="flex justify-center relative" style={{ width: canvasSize.width, height: canvasSize.height, margin: '0 auto' }}>
                        {/* Static Layer */}
                        <canvas
                            ref={canvasStaticRef}
                            width={CANVAS_WIDTH}
                            height={CANVAS_HEIGHT}
                            style={{
                                width: '100%',
                                height: '100%',
                                imageRendering: 'pixelated',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                zIndex: 1
                            }}
                            className="rounded-xl border border-glass-border"
                        />

                        {/* Dynamic Layer */}
                        <canvas
                            ref={canvasRef}
                            width={CANVAS_WIDTH}
                            height={CANVAS_HEIGHT}
                            onClick={handleCanvasClick}
                            style={{
                                width: '100%',
                                height: '100%',
                                imageRendering: 'pixelated',
                                position: 'relative',
                                zIndex: 2
                            }}
                            className="rounded-xl cursor-pointer touch-none"
                        />
                    </div>
                </div>

                {/* Controls */}
                <div className="flex justify-center gap-4 mt-6">
                    {uiState.status === 'idle' || uiState.status === 'ended' ? (
                        <button
                            onClick={startGame}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-dark font-bold hover:opacity-90 transition-opacity"
                        >
                            <Play size={20} />
                            {uiState.status === 'ended' ? 'Play Again' : 'Start Game'}
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={pauseGame}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                            >
                                {uiState.status === 'paused' ? <Play size={20} /> : <Pause size={20} />}
                                {uiState.status === 'paused' ? 'Resume' : 'Pause'}
                            </button>
                            <button
                                onClick={startGame}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                            >
                                <RotateCcw size={20} />
                                Restart
                            </button>
                        </>
                    )}
                </div>

                <p className="text-center text-gray-500 text-sm mt-4">
                    <span className="hidden sm:inline">Arrow Keys or Mouse • Space/ESC to pause</span>
                    <span className="sm:hidden">Touch to move paddle</span>
                </p>
            </div>

            <LeaderboardModal
                isOpen={showLeaderboard}
                onClose={() => setShowLeaderboard(false)}
                game="breakout"
                currentScore={uiState.score}
                onSubmitScore={getAchievement}
            />
            <LeaderboardModal
                isOpen={viewingLeaderboard}
                onClose={() => setViewingLeaderboard(false)}
                game="breakout"
            />
        </div>
    );
}

export default Breakout;
