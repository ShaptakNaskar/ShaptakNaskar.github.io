import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, Volume2, VolumeX, Trophy } from 'lucide-react';
import gameAudio from '../../utils/audio';
import LeaderboardModal from '../LeaderboardModal';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT = 80;
const BALL_SIZE = 12;
const INITIAL_BALL_SPEED = 5;
const WIN_SCORE = 11;

// FPS Management
const TARGET_FPS_HIGH = 60;
const TARGET_FPS_LOW = 30;
const FRAME_TIME_HIGH = 1000 / TARGET_FPS_HIGH;
const FRAME_TIME_LOW = 1000 / TARGET_FPS_LOW;
const LAG_THRESHOLD_MS = 20; // If frame takes 20ms+ consistently, drop to 30fps
const LAG_SAMPLE_COUNT = 30; // Check over 30 frames before deciding

// Touch offset - paddle appears above finger
const TOUCH_OFFSET_Y = 60;

function Paddles() {
    const canvasRef = useRef(null);
    const canvasStaticRef = useRef(null);
    const ctxRef = useRef(null);
    const ctxStaticRef = useRef(null);
    const animationRef = useRef(null);
    const lastFrameTimeRef = useRef(0);

    // FPS management refs
    const fpsRef = useRef({
        mode: 'high', // 'high' (60fps) or 'low' (30fps)
        locked: false, // Once set to low, stays low for session
        frameTimes: [], // Recent frame times for averaging
        lastTime: performance.now(),
        accumulator: 0
    });

    // Input refs
    const inputRef = useRef({
        targetY: null,
        keyUp: false,
        keyDown: false
    });

    const pointerLockedRef = useRef(false);

    const gameStateRef = useRef({
        playerY: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
        aiY: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
        ballX: CANVAS_WIDTH / 2,
        ballY: CANVAS_HEIGHT / 2,
        ballVX: INITIAL_BALL_SPEED,
        ballVY: INITIAL_BALL_SPEED * 0.5,
        playerScore: 0,
        aiScore: 0,
        rallyCount: 0,
        speedMultiplier: 1,
        status: 'idle'
    });

    const [uiState, setUiState] = useState({
        playerScore: 0,
        aiScore: 0,
        status: 'idle',
        fpsMode: 'high'
    });
    const [audioEnabled, setAudioEnabled] = useState(!gameAudio.isMuted());
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [viewingLeaderboard, setViewingLeaderboard] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

    // Cache canvas contexts on mount
    useEffect(() => {
        const canvas = canvasRef.current;
        const canvasStatic = canvasStaticRef.current;
        if (canvas && canvasStatic) {
            ctxRef.current = canvas.getContext('2d', { alpha: true }); // Alpha true for transparent top layer
            ctxStaticRef.current = canvasStatic.getContext('2d', { alpha: false });
            drawStatic();
        }
    }, [canvasSize]); // Redraw static when size changes

    // Responsive sizing
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

        // Background
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Center line
        ctx.setLineDash([10, 10]);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(CANVAS_WIDTH / 2, 0);
        ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
        ctx.stroke();
        ctx.setLineDash([]);
    };

    const drawIdleScreen = () => {
        const ctx = ctxRef.current;
        if (!ctx) return;
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); // Clear dynamic layer

        ctx.font = '24px monospace';
        ctx.fillStyle = '#555';
        ctx.textAlign = 'center';
        ctx.fillText('Click to Start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.font = '14px monospace';
        ctx.fillText('or press the Start button', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
    };

    const resetBall = (direction = 1) => {
        const state = gameStateRef.current;
        state.ballX = CANVAS_WIDTH / 2;
        state.ballY = CANVAS_HEIGHT / 2;
        state.ballVX = INITIAL_BALL_SPEED * direction * state.speedMultiplier;
        state.ballVY = (Math.random() - 0.5) * INITIAL_BALL_SPEED * state.speedMultiplier;
        state.rallyCount = 0;
    };

    // Request pointer lock
    const requestPointerLock = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        try {
            if (canvas.requestPointerLock) {
                canvas.requestPointerLock();
            }
        } catch (e) {
            // Pointer lock not available, continue without
        }
    };

    // Release pointer lock
    const releasePointerLock = () => {
        try {
            if (document.pointerLockElement === canvasRef.current) {
                document.exitPointerLock();
            }
        } catch (e) {
            // Ignore
        }
        pointerLockedRef.current = false;
    };

    // Fixed timestep game loop with adaptive FPS
    const gameLoop = useCallback((currentTime) => {
        const ctx = ctxRef.current;
        const state = gameStateRef.current;
        const fps = fpsRef.current;

        if (!ctx || state.status !== 'playing') return;

        // Calculate frame time
        const deltaTime = currentTime - fps.lastTime;
        fps.lastTime = currentTime;

        // Track frame times for FPS adaptation (only if not locked)
        if (!fps.locked) {
            fps.frameTimes.push(deltaTime);
            if (fps.frameTimes.length > LAG_SAMPLE_COUNT) {
                fps.frameTimes.shift();
                // Check average frame time
                const avgFrameTime = fps.frameTimes.reduce((a, b) => a + b, 0) / fps.frameTimes.length;
                if (avgFrameTime > LAG_THRESHOLD_MS && fps.mode === 'high') {
                    // Switch to 30fps and lock it
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

        // Physics Scaling
        const timeScale = targetFrameTime / FRAME_TIME_HIGH;

        // Apply continuous keyboard input - REMOVED per request
        // const keySpeed = 8 * timeScale;
        // if (inputRef.current.keyUp) {
        //    state.playerY = Math.max(0, state.playerY - keySpeed);
        // }
        // if (inputRef.current.keyDown) {
        //    state.playerY = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, state.playerY + keySpeed);
        // }

        // Apply mouse/touch input
        if (inputRef.current.targetY !== null) {
            state.playerY = Math.max(0, Math.min(
                CANVAS_HEIGHT - PADDLE_HEIGHT,
                inputRef.current.targetY - PADDLE_HEIGHT / 2
            ));
        }


        // Clear dynamic canvas
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Center line is on static canvas now

        // Update ball
        state.ballX += state.ballVX * timeScale;
        state.ballY += state.ballVY * timeScale;

        // Ball collision with top/bottom
        if (state.ballY <= BALL_SIZE / 2 || state.ballY >= CANVAS_HEIGHT - BALL_SIZE / 2) {
            state.ballVY *= -1;
            state.ballY = Math.max(BALL_SIZE / 2, Math.min(CANVAS_HEIGHT - BALL_SIZE / 2, state.ballY));
            gameAudio.play('bounce');
        }

        // AI paddle movement
        const aiCenter = state.aiY + PADDLE_HEIGHT / 2;
        const aiSpeed = (4 + state.speedMultiplier) * timeScale;
        if (state.ballX > CANVAS_WIDTH / 2) {
            if (aiCenter < state.ballY - 20) state.aiY += aiSpeed;
            else if (aiCenter > state.ballY + 20) state.aiY -= aiSpeed;
        }
        state.aiY = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, state.aiY));

        // Player paddle collision
        if (
            state.ballX - BALL_SIZE / 2 <= PADDLE_WIDTH + 20 &&
            state.ballY >= state.playerY &&
            state.ballY <= state.playerY + PADDLE_HEIGHT &&
            state.ballVX < 0
        ) {
            state.ballVX *= -1;
            state.ballX = PADDLE_WIDTH + 20 + BALL_SIZE / 2;
            const hitPos = (state.ballY - state.playerY) / PADDLE_HEIGHT;
            state.ballVY = (hitPos - 0.5) * 10 * state.speedMultiplier;
            state.rallyCount++;
            if (state.rallyCount % 5 === 0) {
                state.speedMultiplier += 0.15;
            }
            gameAudio.play('bounce');
        }

        // AI paddle collision
        if (
            state.ballX + BALL_SIZE / 2 >= CANVAS_WIDTH - PADDLE_WIDTH - 20 &&
            state.ballY >= state.aiY &&
            state.ballY <= state.aiY + PADDLE_HEIGHT &&
            state.ballVX > 0
        ) {
            state.ballVX *= -1;
            state.ballX = CANVAS_WIDTH - PADDLE_WIDTH - 20 - BALL_SIZE / 2;
            const hitPos = (state.ballY - state.aiY) / PADDLE_HEIGHT;
            state.ballVY = (hitPos - 0.5) * 8 * state.speedMultiplier;
            state.rallyCount++;
            gameAudio.play('bounce');
        }

        // Scoring
        if (state.ballX < 0) {
            state.aiScore++;
            gameAudio.play('score');
            if (state.aiScore >= WIN_SCORE) {
                state.status = 'ended';
                releasePointerLock();
                gameAudio.play('gameOver');
                setUiState({ playerScore: state.playerScore, aiScore: state.aiScore, status: 'ended', fpsMode: fpsRef.current.mode });
                setShowLeaderboard(true);
                return;
            }
            setUiState(prev => ({ ...prev, aiScore: state.aiScore }));
            resetBall(-1);
        } else if (state.ballX > CANVAS_WIDTH) {
            state.playerScore++;
            gameAudio.play('score');
            if (state.playerScore >= WIN_SCORE) {
                state.status = 'ended';
                releasePointerLock();
                gameAudio.play('win');
                setUiState({ playerScore: state.playerScore, aiScore: state.aiScore, status: 'ended', fpsMode: fpsRef.current.mode });
                setShowLeaderboard(true);
                return;
            }
            setUiState(prev => ({ ...prev, playerScore: state.playerScore }));
            resetBall(1);
        }

        // Draw paddles
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(20, state.playerY, PADDLE_WIDTH, PADDLE_HEIGHT);
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(CANVAS_WIDTH - 20 - PADDLE_WIDTH, state.aiY, PADDLE_WIDTH, PADDLE_HEIGHT);

        // Draw ball
        ctx.beginPath();
        ctx.arc(state.ballX, state.ballY, BALL_SIZE / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();

        // Draw HUD managed by React State/Overlay now
        // Removed ctx.fillText calls

        animationRef.current = requestAnimationFrame(gameLoop);
    }, []);

    const startGame = useCallback(() => {
        gameAudio.init();
        const state = gameStateRef.current;
        state.playerScore = 0;
        state.aiScore = 0;
        state.speedMultiplier = 1;
        state.playerY = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
        state.aiY = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
        state.status = 'playing';

        inputRef.current = { targetY: null, keyUp: false, keyDown: false };
        fpsRef.current.lastTime = performance.now();
        fpsRef.current.accumulator = 0;

        setUiState({ playerScore: 0, aiScore: 0, status: 'playing', fpsMode: fpsRef.current.mode });
        resetBall(Math.random() > 0.5 ? 1 : -1);

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

    // Canvas click to start
    const handleCanvasClick = useCallback(() => {
        const state = gameStateRef.current;
        if (state.status === 'idle' || state.status === 'ended') {
            startGame();
        } else if (state.status === 'paused') {
            pauseGame(); // Resume
        }
    }, [startGame, pauseGame]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            releasePointerLock();
        };
    }, []);

    // Pointer lock change handler
    useEffect(() => {
        const handleLockChange = () => {
            pointerLockedRef.current = document.pointerLockElement === canvasRef.current;
        };
        document.addEventListener('pointerlockchange', handleLockChange);
        return () => document.removeEventListener('pointerlockchange', handleLockChange);
    }, []);

    // Input handlers
    useEffect(() => {
        const handleKeyDown = (e) => {
            const state = gameStateRef.current;

            // ESC releases pointer lock and pauses
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

            // Movement keys removed per request
        };

        const handleKeyUp = (e) => {
            // Movement keys removed per request
        };

        const handleMouseMove = (e) => {
            const state = gameStateRef.current;
            if (state.status !== 'playing') return;

            if (pointerLockedRef.current) {
                // Pointer locked - use movement delta
                const deltaY = e.movementY / scale;
                const currentY = inputRef.current.targetY ?? (state.playerY + PADDLE_HEIGHT / 2);
                inputRef.current.targetY = Math.max(PADDLE_HEIGHT / 2, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT / 2, currentY + deltaY));
            } else {
                // Not locked - use absolute position
                const canvas = canvasRef.current;
                if (!canvas) return;
                const rect = canvas.getBoundingClientRect();
                inputRef.current.targetY = (e.clientY - rect.top) / scale;
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
            // Apply offset so paddle is above finger
            const y = (touch.clientY - rect.top) / scale - TOUCH_OFFSET_Y;
            inputRef.current.targetY = y;
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
        const enabled = !audioEnabled;
        setAudioEnabled(enabled);
        gameAudio.setMuted(!enabled);
        gameAudio.init();
        if (enabled) gameAudio.play('click');
    };

    const getAchievement = () => {
        if (uiState.playerScore >= WIN_SCORE) return `Won ${uiState.playerScore}-${uiState.aiScore}`;
        return `Lost ${uiState.playerScore}-${uiState.aiScore}`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/games" className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        <ArrowLeft size={24} className="text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white">Paddles</h1>
                        <p className="text-gray-500 text-sm">First to {WIN_SCORE} wins • Ball speeds up every 5 rallies</p>
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
                {/* Score display */}
                <div className="flex justify-center items-center gap-8 mb-4">
                    <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">You</p>
                        <p className="text-3xl sm:text-4xl font-bold font-mono text-primary">{uiState.playerScore}</p>
                    </div>
                    <div className="text-2xl text-gray-600">vs</div>
                    <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">AI</p>
                        <p className="text-3xl sm:text-4xl font-bold font-mono text-secondary">{uiState.aiScore}</p>
                    </div>
                </div>

                {/* FPS indicator */}
                {uiState.fpsMode === 'low' && (
                    <p className="text-center text-yellow-500 text-xs mb-2">Performance mode: 30 FPS</p>
                )}


                {/* Canvas Container - Relative positioning for layering */}
                <div className="flex justify-center relative" style={{ width: canvasSize.width, height: canvasSize.height, margin: '0 auto' }}>
                    {/* Static Background Layer */}
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

                    {/* Dynamic Game Layer */}
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
                    <span className="hidden sm:inline">Use Mouse to move • Space/ESC to pause</span>
                    <span className="sm:hidden">Touch to move paddle</span>
                </p>
            </div>

            <LeaderboardModal
                isOpen={showLeaderboard}
                onClose={() => setShowLeaderboard(false)}
                game="paddles"
                currentScore={uiState.playerScore}
                onSubmitScore={getAchievement}
            />
            <LeaderboardModal
                isOpen={viewingLeaderboard}
                onClose={() => setViewingLeaderboard(false)}
                game="paddles"
            />
        </div>
    );
}

export default Paddles;
