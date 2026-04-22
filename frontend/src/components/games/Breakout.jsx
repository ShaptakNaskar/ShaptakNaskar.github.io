import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, Volume2, VolumeX, Trophy } from 'lucide-react';
import gameAudio from '../../utils/audio';
import LeaderboardModal from '../LeaderboardModal';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_HEIGHT = 12;
const PADDLE_Y = CANVAS_HEIGHT - 30;
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

const BRICK_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#00f0ff'];

// Brick types
const BT_NORMAL = 'normal';
const BT_HARD = 'hard';
const BT_STEEL = 'steel';
const BT_EXPLOSIVE = 'explosive';

const BRICK_HITS = {
    [BT_NORMAL]: 1,
    [BT_HARD]: 2,
    [BT_STEEL]: 3,
    [BT_EXPLOSIVE]: 1
};

// Powerup types
const PU_GUN = 'gun';
const PU_LASER = 'laser';
const PU_MULTI = 'multi';
const PU_BIG = 'big';
const PU_SLOW = 'slow';
const PU_LIFE = 'life';

const POWERUP_META = {
    [PU_GUN]:   { label: 'G', color: '#fbbf24', name: 'Guns' },
    [PU_LASER]: { label: 'L', color: '#ef4444', name: 'Laser' },
    [PU_MULTI]: { label: 'M', color: '#a855f7', name: 'Multiball' },
    [PU_BIG]:   { label: 'P', color: '#22c55e', name: 'Big Paddle' },
    [PU_SLOW]:  { label: 'S', color: '#00f0ff', name: 'Slow' },
    [PU_LIFE]:  { label: '+', color: '#ec4899', name: '+1 Life' }
};

// Weighted pool — duplicates = more common
const POWERUP_POOL = [
    PU_GUN, PU_GUN, PU_GUN,
    PU_LASER, PU_LASER,
    PU_MULTI, PU_MULTI,
    PU_BIG, PU_BIG,
    PU_SLOW,
    PU_LIFE
];

const POWERUP_DROP_CHANCE = 0.22;
const POWERUP_SPEED = 2.8;
const POWERUP_SIZE = 22;

// Bullets (machine gun)
const BULLET_SPEED = 9;
const BULLET_WIDTH = 4;
const BULLET_HEIGHT = 12;
const GUN_DURATION = 10000;
const GUN_FIRE_RATE = 140;

// Laser (continuous beam)
const LASER_DURATION = 5000;
const LASER_WIDTH = 24;
const LASER_TICK_RATE = 90;

// Modifiers
const BIG_PADDLE_DURATION = 15000;
const SLOW_BALL_DURATION = 10000;
const SLOW_BALL_FACTOR = 0.6;
const BIG_PADDLE_FACTOR = 1.6;
const MAX_BALL_SPEED = 14;
const MAX_BALLS = 12;

// Level transition animation
const BRICK_TRANSITION_MS = 650;
const BRICK_SLIDE_DISTANCE = 280;


// Procedural Level Generation
function generateLevel(levelNum) {
    const speedMultiplier = 1 + (levelNum * 0.12);
    const paddleWidth = Math.max(60, 100 - (levelNum * 4));

    const allPatterns = [
        'checkerboard', 'rows', 'columns', 'random', 'dense',
        'diamond', 'pyramid', 'border', 'waves', 'diagonal', 'cross', 'arches'
    ];
    const easyPatterns = ['checkerboard', 'rows', 'columns', 'pyramid'];

    const pool = levelNum === 0 ? easyPatterns : allPatterns;
    const patternType = pool[Math.floor(Math.random() * pool.length)];

    const densityChance = Math.min(0.85, 0.4 + (levelNum * 0.04));

    const rowOffset = Math.floor(Math.random() * 2);
    const colOffset = Math.floor(Math.random() * 2);
    const inverted = Math.random() > 0.5;
    const colorOffset = Math.floor(Math.random() * BRICK_COLORS.length);
    const waveFreq = 0.5 + Math.random() * 0.8;

    return {
        levelNum,
        speedMultiplier,
        paddleWidth,
        patternType,
        densityChance,
        rowOffset,
        colOffset,
        inverted,
        colorOffset,
        waveFreq
    };
}

function isCellActive(patternType, row, col, config) {
    const { rowOffset, colOffset, inverted, densityChance, waveFreq } = config;
    const cr = (BRICK_ROWS - 1) / 2;
    const cc = (BRICK_COLS - 1) / 2;

    let base = true;

    switch (patternType) {
        case 'checkerboard':
            base = (row + col + rowOffset) % 2 === 0;
            break;
        case 'rows':
            base = (row + rowOffset) % 2 === 0;
            break;
        case 'columns':
            base = (col + colOffset) % 2 === 0;
            break;
        case 'random':
            return Math.random() < densityChance;
        case 'dense':
            return true;
        case 'diamond': {
            const dist = Math.abs(row - cr) + Math.abs(col - cc) * 0.6;
            base = dist <= 2.5;
            break;
        }
        case 'pyramid': {
            const half = (BRICK_COLS - 1) / 2;
            base = col >= half - row && col <= half + row;
            break;
        }
        case 'border':
            base = row === 0 || row === BRICK_ROWS - 1 || col === 0 || col === BRICK_COLS - 1;
            break;
        case 'waves': {
            const wave = Math.sin(col * waveFreq + rowOffset) * 1.5 + cr;
            base = Math.abs(row - wave) < 1.2;
            break;
        }
        case 'diagonal':
            base = (row + col + rowOffset) % 3 !== 0;
            break;
        case 'cross': {
            const midR = Math.floor(BRICK_ROWS / 2);
            const midC = Math.floor(BRICK_COLS / 2);
            base = row === midR || row === midR - 1 || col === midC || col === midC - 1;
            break;
        }
        case 'arches':
            base = row === 0 || col === 0 || col === BRICK_COLS - 1 || (row < 2 && col % 3 === 0);
            break;
    }

    return inverted ? !base : base;
}

function rollBrickType(row, levelNum) {
    if (levelNum === 0) return BT_NORMAL;

    const hardChance = Math.min(0.35, 0.08 + levelNum * 0.04);
    const steelChance = Math.min(0.18, levelNum * 0.025);
    const explosiveChance = Math.min(0.08, 0.01 + levelNum * 0.012);

    const rowBonus = row === 0 ? 0.15 : row === 1 ? 0.05 : 0;
    const rand = Math.random();

    if (rand < explosiveChance) return BT_EXPLOSIVE;
    if (rand < explosiveChance + steelChance + (row === 0 ? 0.08 : 0)) return BT_STEEL;
    if (rand < explosiveChance + steelChance + hardChance + rowBonus) return BT_HARD;
    return BT_NORMAL;
}

function createBrickGrid(levelConfig) {
    const grid = [];
    const { patternType, colorOffset, levelNum } = levelConfig;

    for (let row = 0; row < BRICK_ROWS; row++) {
        const rowBricks = [];
        for (let col = 0; col < BRICK_COLS; col++) {
            const active = isCellActive(patternType, row, col, levelConfig);

            if (active) {
                const type = rollBrickType(row, levelNum);
                rowBricks.push({
                    row, col,
                    x: BRICK_OFFSET_LEFT + col * (BRICK_WIDTH + BRICK_PADDING),
                    y: BRICK_OFFSET_TOP + row * (BRICK_HEIGHT + BRICK_PADDING),
                    width: BRICK_WIDTH,
                    height: BRICK_HEIGHT,
                    color: BRICK_COLORS[(row + colorOffset) % BRICK_COLORS.length],
                    type,
                    hits: BRICK_HITS[type],
                    maxHits: BRICK_HITS[type],
                    active: true
                });
            } else {
                rowBricks.push(null);
            }
        }
        grid.push(rowBricks);
    }
    return grid;
}

// Paint a brick on a given context at a given y (allows slide-in animation on dynamic canvas).
// Clips all decoration to the brick's rectangle — steel stripes used to leak outside.
function paintBrick(ctx, brick, y) {
    if (!ctx) return;
    const x = brick.x;
    const w = brick.width;
    const h = brick.height;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    if (brick.type === BT_EXPLOSIVE) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    } else if (brick.type === BT_STEEL) {
        ctx.fillStyle = '#9ca3af';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 1;
        for (let i = -h; i < w; i += 6) {
            ctx.beginPath();
            ctx.moveTo(x + i, y + h);
            ctx.lineTo(x + i + h, y);
            ctx.stroke();
        }
        const damaged = brick.maxHits - brick.hits;
        if (damaged > 0) {
            ctx.fillStyle = `rgba(0,0,0,${0.25 * damaged})`;
            ctx.fillRect(x, y, w, h);
        }
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    } else if (brick.type === BT_HARD) {
        ctx.fillStyle = brick.color;
        ctx.fillRect(x, y, w, h);
        if (brick.hits < brick.maxHits) {
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = 'rgba(0,0,0,0.7)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x + 8, y + h / 2 - 2);
            ctx.lineTo(x + w / 2, y + 3);
            ctx.lineTo(x + w - 10, y + h / 2 + 4);
            ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    } else {
        ctx.fillStyle = brick.color;
        ctx.fillRect(x, y, w, h);
    }

    ctx.restore();
}

function Breakout() {
    const canvasRef = useRef(null);
    const canvasStaticRef = useRef(null);
    const ctxRef = useRef(null);
    const ctxStaticRef = useRef(null);
    const animationRef = useRef(null);

    const fpsRef = useRef({
        mode: 'high',
        locked: false,
        frameTimes: [],
        lastTime: performance.now(),
        accumulator: 0
    });

    const inputRef = useRef({
        targetX: null,
        keyLeft: false,
        keyRight: false
    });

    const pointerLockedRef = useRef(false);

    const gameStateRef = useRef({
        paddleX: CANVAS_WIDTH / 2 - 50,
        balls: [],
        bullets: [],
        powerups: [],
        effects: { gun: 0, laser: 0, big: 0, slow: 0 },
        lastBulletTime: 0,
        lastLaserTick: 0,
        lastUiScore: 0,
        lastEffectsSignature: 0,
        brickGrid: [],
        brickCount: 0,
        lives: 5,
        score: 0,
        level: 0,
        currentConfig: null,
        status: 'idle',
        pauseStart: 0,
        brickTransitionEnd: 0
    });

    const [uiState, setUiState] = useState({
        score: 0,
        lives: 5,
        level: 0,
        status: 'idle',
        fpsMode: 'high',
        activeEffects: []
    });
    const [audioEnabled, setAudioEnabled] = useState(!gameAudio.isMuted());
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [viewingLeaderboard, setViewingLeaderboard] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

    // Grab contexts once. Don't redraw on canvasSize change — the canvas internal buffer
    // is fixed-size so browser zoom doesn't touch pixel data.
    useEffect(() => {
        const canvas = canvasRef.current;
        const canvasStatic = canvasStaticRef.current;
        if (canvas && canvasStatic) {
            ctxRef.current = canvas.getContext('2d', { alpha: true });
            ctxStaticRef.current = canvasStatic.getContext('2d', { alpha: false });
            drawIdleScreen();
        }
        // Only runs once on mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    const drawBrick = (brick) => {
        paintBrick(ctxStaticRef.current, brick, brick.y);
    };

    const drawBricks = (grid) => {
        grid.forEach(row => {
            row.forEach(brick => {
                if (brick && brick.active) drawBrick(brick);
            });
        });
    };

    const clearBrickCell = (brick) => {
        const ctx = ctxStaticRef.current;
        if (!ctx) return;
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    };

    const updateBrickVisual = (brick) => {
        clearBrickCell(brick);
        drawBrick(brick);
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
        ctx.fillText('Infinite levels • Powerups • Guns • Laser', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
    };

    const resetBalls = () => {
        const state = gameStateRef.current;
        const baseSpeed = Math.min(MAX_BALL_SPEED, 6 * state.currentConfig.speedMultiplier);

        state.balls = [{
            x: CANVAS_WIDTH / 2,
            y: CANVAS_HEIGHT - 80,
            vx: (Math.random() > 0.5 ? 1 : -1) * baseSpeed,
            vy: -baseSpeed
        }];
    };

    // transitioning=true keeps balls/powerups/bullets/effects alive, slides new bricks in.
    // transitioning=false (fresh start) wipes everything and respawns the ball.
    const loadLevel = (levelNum, transitioning = false) => {
        const state = gameStateRef.current;
        state.level = levelNum;
        const config = generateLevel(levelNum);
        state.currentConfig = config;
        state.brickGrid = createBrickGrid(config);

        let count = 0;
        state.brickGrid.forEach(row => row.forEach(b => { if (b) count++; }));
        state.brickCount = count;

        if (transitioning) {
            state.brickTransitionEnd = performance.now() + BRICK_TRANSITION_MS;
            drawStatic();
        } else {
            state.bullets = [];
            state.powerups = [];
            state.effects = { gun: 0, laser: 0, big: 0, slow: 0 };
            state.lastBulletTime = 0;
            state.lastLaserTick = 0;
            state.lastEffectsSignature = 0;
            state.brickTransitionEnd = 0;
            drawStatic();
            drawBricks(state.brickGrid);
            resetBalls();
        }
    };

    const requestPointerLock = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        try {
            if (canvas.requestPointerLock) {
                canvas.requestPointerLock();
            }
        } catch {
            // pointer lock API unavailable
        }
    };

    const releasePointerLock = () => {
        try {
            if (document.pointerLockElement === canvasRef.current) {
                document.exitPointerLock();
            }
        } catch {
            // pointer lock API unavailable
        }
        pointerLockedRef.current = false;
    };

    const getEffectivePaddleWidth = (state, now) => {
        const base = state.currentConfig.paddleWidth;
        return state.effects.big > now ? base * BIG_PADDLE_FACTOR : base;
    };

    const maybeDropPowerup = (brick, state) => {
        if (Math.random() >= POWERUP_DROP_CHANCE) return;
        const type = POWERUP_POOL[Math.floor(Math.random() * POWERUP_POOL.length)];
        state.powerups.push({
            x: brick.x + brick.width / 2 - POWERUP_SIZE / 2,
            y: brick.y + brick.height / 2 - POWERUP_SIZE / 2,
            type
        });
    };

    const damageBrickChain = (startBrick, damage, state) => {
        const queue = [{ brick: startBrick, damage }];
        let anyKilled = false;
        while (queue.length) {
            const { brick, damage: dmg } = queue.shift();
            if (!brick || !brick.active) continue;
            brick.hits -= dmg;

            if (brick.hits <= 0) {
                brick.active = false;
                state.brickCount--;
                state.score += 10 * (state.level + 1);
                clearBrickCell(brick);
                anyKilled = true;
                maybeDropPowerup(brick, state);

                if (brick.type === BT_EXPLOSIVE) {
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            if (dr === 0 && dc === 0) continue;
                            const nr = brick.row + dr;
                            const nc = brick.col + dc;
                            if (nr >= 0 && nr < BRICK_ROWS && nc >= 0 && nc < BRICK_COLS) {
                                const neighbor = state.brickGrid[nr][nc];
                                if (neighbor && neighbor.active) {
                                    queue.push({ brick: neighbor, damage: 2 });
                                }
                            }
                        }
                    }
                }
            } else {
                state.score += 2 * (state.level + 1);
                updateBrickVisual(brick);
            }
        }
        if (anyKilled) gameAudio.play('score');
        return anyKilled;
    };

    const applyPowerup = (type, state) => {
        const now = performance.now();
        switch (type) {
            case PU_GUN:
                state.effects.gun = now + GUN_DURATION;
                break;
            case PU_LASER:
                state.effects.laser = now + LASER_DURATION;
                break;
            case PU_BIG:
                state.effects.big = now + BIG_PADDLE_DURATION;
                break;
            case PU_SLOW:
                state.effects.slow = now + SLOW_BALL_DURATION;
                break;
            case PU_MULTI: {
                const additions = [];
                for (const b of state.balls) {
                    if (state.balls.length + additions.length >= MAX_BALLS) break;
                    const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 6;
                    const baseAngle = Math.atan2(b.vy, b.vx);
                    additions.push({
                        x: b.x, y: b.y,
                        vx: Math.cos(baseAngle + 0.45) * speed,
                        vy: Math.sin(baseAngle + 0.45) * speed
                    });
                    if (state.balls.length + additions.length < MAX_BALLS) {
                        additions.push({
                            x: b.x, y: b.y,
                            vx: Math.cos(baseAngle - 0.45) * speed,
                            vy: Math.sin(baseAngle - 0.45) * speed
                        });
                    }
                }
                state.balls.push(...additions);
                break;
            }
            case PU_LIFE:
                state.lives = Math.min(5, state.lives + 1);
                break;
        }
    };

    const gameLoop = useCallback((currentTime) => {
        const ctx = ctxRef.current;
        const state = gameStateRef.current;
        const fps = fpsRef.current;

        if (!ctx || state.status !== 'playing') return;

        const deltaTime = currentTime - fps.lastTime;
        fps.lastTime = currentTime;

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

        const targetFrameTime = fps.mode === 'high' ? FRAME_TIME_HIGH : FRAME_TIME_LOW;
        fps.accumulator += deltaTime;
        if (fps.accumulator < targetFrameTime) {
            animationRef.current = requestAnimationFrame(gameLoop);
            return;
        }
        fps.accumulator = fps.accumulator % targetFrameTime;

        const timeScale = targetFrameTime / FRAME_TIME_HIGH;
        const now = currentTime;
        const paddleWidth = getEffectivePaddleWidth(state, now);
        const slowActive = state.effects.slow > now;
        const ballTimeScale = timeScale * (slowActive ? SLOW_BALL_FACTOR : 1);
        const transitioning = state.brickTransitionEnd > now;

        // Paddle movement
        const keySpeed = 10 * timeScale;
        if (inputRef.current.keyLeft) {
            state.paddleX = Math.max(0, state.paddleX - keySpeed);
        }
        if (inputRef.current.keyRight) {
            state.paddleX = Math.min(CANVAS_WIDTH - paddleWidth, state.paddleX + keySpeed);
        }
        if (inputRef.current.targetX !== null) {
            state.paddleX = Math.max(0, Math.min(
                CANVAS_WIDTH - paddleWidth,
                inputRef.current.targetX - paddleWidth / 2
            ));
        }
        // Clamp after big-paddle shrink
        if (state.paddleX + paddleWidth > CANVAS_WIDTH) {
            state.paddleX = CANVAS_WIDTH - paddleWidth;
        }

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Update balls
        const deadBalls = [];
        for (let i = 0; i < state.balls.length; i++) {
            const ball = state.balls[i];
            ball.x += ball.vx * ballTimeScale;
            ball.y += ball.vy * ballTimeScale;

            if (ball.x <= BALL_RADIUS || ball.x >= CANVAS_WIDTH - BALL_RADIUS) {
                ball.vx *= -1;
                ball.x = Math.max(BALL_RADIUS, Math.min(CANVAS_WIDTH - BALL_RADIUS, ball.x));
                gameAudio.play('bounce');
            }
            if (ball.y <= BALL_RADIUS) {
                ball.vy *= -1;
                ball.y = BALL_RADIUS;
                gameAudio.play('bounce');
            }

            if (
                ball.y + BALL_RADIUS >= PADDLE_Y &&
                ball.y - BALL_RADIUS < PADDLE_Y + PADDLE_HEIGHT &&
                ball.x >= state.paddleX &&
                ball.x <= state.paddleX + paddleWidth &&
                ball.vy > 0
            ) {
                const hitPos = (ball.x - state.paddleX) / paddleWidth;
                const angle = (hitPos - 0.5) * Math.PI * 0.6;
                const speed = Math.min(MAX_BALL_SPEED, Math.sqrt(ball.vx ** 2 + ball.vy ** 2));
                ball.vx = Math.sin(angle) * speed;
                ball.vy = -Math.cos(angle) * speed;
                ball.y = PADDLE_Y - BALL_RADIUS;
                gameAudio.play('bounce');
            }

            if (ball.y > CANVAS_HEIGHT) {
                deadBalls.push(i);
                continue;
            }

            // Bricks are intangible while sliding in
            if (transitioning) continue;

            let startRow = Math.floor((ball.y - BALL_RADIUS - BRICK_OFFSET_TOP) / (BRICK_HEIGHT + BRICK_PADDING));
            let endRow = Math.floor((ball.y + BALL_RADIUS - BRICK_OFFSET_TOP) / (BRICK_HEIGHT + BRICK_PADDING));
            let startCol = Math.floor((ball.x - BALL_RADIUS - BRICK_OFFSET_LEFT) / (BRICK_WIDTH + BRICK_PADDING));
            let endCol = Math.floor((ball.x + BALL_RADIUS - BRICK_OFFSET_LEFT) / (BRICK_WIDTH + BRICK_PADDING));

            startRow = Math.max(0, startRow);
            endRow = Math.min(BRICK_ROWS - 1, endRow);
            startCol = Math.max(0, startCol);
            endCol = Math.min(BRICK_COLS - 1, endCol);

            let collided = false;
            for (let r = startRow; r <= endRow && !collided; r++) {
                for (let c = startCol; c <= endCol && !collided; c++) {
                    const brick = state.brickGrid[r] && state.brickGrid[r][c];
                    if (brick && brick.active &&
                        ball.x + BALL_RADIUS > brick.x &&
                        ball.x - BALL_RADIUS < brick.x + brick.width &&
                        ball.y + BALL_RADIUS > brick.y &&
                        ball.y - BALL_RADIUS < brick.y + brick.height
                    ) {
                        const overlapLeft = (ball.x + BALL_RADIUS) - brick.x;
                        const overlapRight = (brick.x + brick.width) - (ball.x - BALL_RADIUS);
                        const overlapTop = (ball.y + BALL_RADIUS) - brick.y;
                        const overlapBottom = (brick.y + brick.height) - (ball.y - BALL_RADIUS);
                        const minOverlapX = Math.min(overlapLeft, overlapRight);
                        const minOverlapY = Math.min(overlapTop, overlapBottom);

                        if (minOverlapX < minOverlapY) ball.vx *= -1;
                        else ball.vy *= -1;

                        damageBrickChain(brick, 1, state);
                        collided = true;
                    }
                }
            }
        }

        for (let i = deadBalls.length - 1; i >= 0; i--) {
            state.balls.splice(deadBalls[i], 1);
        }

        if (state.balls.length === 0) {
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
            resetBalls();
        }

        // Powerups keep falling/being catchable during transition
        state.powerups = state.powerups.filter(p => {
            p.y += POWERUP_SPEED * timeScale;
            if (
                p.y + POWERUP_SIZE >= PADDLE_Y &&
                p.y <= PADDLE_Y + PADDLE_HEIGHT &&
                p.x + POWERUP_SIZE >= state.paddleX &&
                p.x <= state.paddleX + paddleWidth
            ) {
                applyPowerup(p.type, state);
                gameAudio.play('levelUp');
                return false;
            }
            if (p.y > CANVAS_HEIGHT) return false;
            return true;
        });

        // Guns autofire
        if (state.effects.gun > now && now - state.lastBulletTime > GUN_FIRE_RATE) {
            state.lastBulletTime = now;
            state.bullets.push({
                x: state.paddleX + 4,
                y: PADDLE_Y - BULLET_HEIGHT
            });
            state.bullets.push({
                x: state.paddleX + paddleWidth - 4 - BULLET_WIDTH,
                y: PADDLE_Y - BULLET_HEIGHT
            });
            gameAudio.play('click');
        }

        state.bullets = state.bullets.filter(b => {
            b.y -= BULLET_SPEED * timeScale;
            if (b.y + BULLET_HEIGHT < 0) return false;
            if (transitioning) return true;
            const col = Math.floor((b.x + BULLET_WIDTH / 2 - BRICK_OFFSET_LEFT) / (BRICK_WIDTH + BRICK_PADDING));
            const row = Math.floor((b.y - BRICK_OFFSET_TOP) / (BRICK_HEIGHT + BRICK_PADDING));
            if (row >= 0 && row < BRICK_ROWS && col >= 0 && col < BRICK_COLS) {
                const brick = state.brickGrid[row][col];
                if (brick && brick.active &&
                    b.x + BULLET_WIDTH > brick.x &&
                    b.x < brick.x + brick.width &&
                    b.y < brick.y + brick.height
                ) {
                    damageBrickChain(brick, 1, state);
                    return false;
                }
            }
            return true;
        });

        const laserActive = state.effects.laser > now;
        if (laserActive && !transitioning && now - state.lastLaserTick > LASER_TICK_RATE) {
            state.lastLaserTick = now;
            const laserX = state.paddleX + paddleWidth / 2 - LASER_WIDTH / 2;
            const laserRight = laserX + LASER_WIDTH;
            const colStart = Math.max(0, Math.floor((laserX - BRICK_OFFSET_LEFT) / (BRICK_WIDTH + BRICK_PADDING)));
            const colEnd = Math.min(BRICK_COLS - 1, Math.floor((laserRight - BRICK_OFFSET_LEFT) / (BRICK_WIDTH + BRICK_PADDING)));
            let target = null;
            for (let r = BRICK_ROWS - 1; r >= 0 && !target; r--) {
                for (let c = colStart; c <= colEnd; c++) {
                    const brick = state.brickGrid[r] && state.brickGrid[r][c];
                    if (brick && brick.active &&
                        brick.x + brick.width > laserX &&
                        brick.x < laserRight) {
                        target = brick;
                        break;
                    }
                }
            }
            if (target) damageBrickChain(target, 1, state);
        }

        if (state.score !== state.lastUiScore) {
            state.lastUiScore = state.score;
            setUiState(prev => ({ ...prev, score: state.score }));
        }

        const sig =
            (state.effects.gun > now ? 1 : 0) |
            (state.effects.laser > now ? 2 : 0) |
            (state.effects.big > now ? 4 : 0) |
            (state.effects.slow > now ? 8 : 0);
        if (sig !== state.lastEffectsSignature) {
            state.lastEffectsSignature = sig;
            const list = [];
            if (sig & 1) list.push(PU_GUN);
            if (sig & 2) list.push(PU_LASER);
            if (sig & 4) list.push(PU_BIG);
            if (sig & 8) list.push(PU_SLOW);
            setUiState(prev => ({ ...prev, activeEffects: list, lives: state.lives }));
        }

        // Level complete: start smooth slide-in, keep balls/powerups/effects/bullets
        if (!transitioning && state.brickCount <= 0) {
            gameAudio.play('levelUp');
            loadLevel(state.level + 1, true);
            setUiState(prev => ({ ...prev, level: state.level, score: state.score }));
        }

        // Finalize transition: commit bricks to static, rescue any ball stuck inside a brick
        if (state.brickTransitionEnd > 0 && state.brickTransitionEnd <= now) {
            drawStatic();
            drawBricks(state.brickGrid);
            state.brickTransitionEnd = 0;
            state.balls.forEach(ball => {
                const col = Math.floor((ball.x - BRICK_OFFSET_LEFT) / (BRICK_WIDTH + BRICK_PADDING));
                const row = Math.floor((ball.y - BRICK_OFFSET_TOP) / (BRICK_HEIGHT + BRICK_PADDING));
                if (row >= 0 && row < BRICK_ROWS && col >= 0 && col < BRICK_COLS) {
                    const brick = state.brickGrid[row][col];
                    if (brick && brick.active) {
                        ball.y = BRICK_OFFSET_TOP + BRICK_ROWS * (BRICK_HEIGHT + BRICK_PADDING) + 20;
                        if (ball.vy < 0) ball.vy = -ball.vy;
                    }
                }
            });
        }

        // --- Render dynamic layer ---

        // Sliding bricks during transition (drawn on dynamic canvas so no static flicker)
        if (transitioning) {
            const progress = 1 - (state.brickTransitionEnd - now) / BRICK_TRANSITION_MS;
            const eased = 1 - Math.pow(1 - progress, 3);
            const yOffset = (eased - 1) * BRICK_SLIDE_DISTANCE;
            for (let r = 0; r < BRICK_ROWS; r++) {
                for (let c = 0; c < BRICK_COLS; c++) {
                    const brick = state.brickGrid[r][c];
                    if (brick && brick.active) {
                        paintBrick(ctx, brick, brick.y + yOffset);
                    }
                }
            }
        }

        if (laserActive) {
            const laserX = state.paddleX + paddleWidth / 2 - LASER_WIDTH / 2;
            const grad = ctx.createLinearGradient(laserX, 0, laserX + LASER_WIDTH, 0);
            grad.addColorStop(0, 'rgba(239,68,68,0)');
            grad.addColorStop(0.5, 'rgba(239,68,68,0.85)');
            grad.addColorStop(1, 'rgba(239,68,68,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(laserX, 0, LASER_WIDTH, PADDLE_Y);
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.fillRect(laserX + LASER_WIDTH / 2 - 2, 0, 4, PADDLE_Y);
        }

        const hasGun = state.effects.gun > now;
        const hasBig = state.effects.big > now;
        let paddleColor = '#00f0ff';
        if (laserActive) paddleColor = '#ef4444';
        else if (hasGun) paddleColor = '#fbbf24';
        else if (hasBig) paddleColor = '#22c55e';
        ctx.fillStyle = paddleColor;
        ctx.fillRect(state.paddleX, PADDLE_Y, paddleWidth, PADDLE_HEIGHT);

        if (hasGun) {
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(state.paddleX + 3, PADDLE_Y - 4, 5, 5);
            ctx.fillRect(state.paddleX + paddleWidth - 8, PADDLE_Y - 4, 5, 5);
        }
        if (laserActive) {
            ctx.fillStyle = '#fde68a';
            ctx.fillRect(state.paddleX + paddleWidth / 2 - LASER_WIDTH / 2, PADDLE_Y - 3, LASER_WIDTH, 3);
        }

        ctx.fillStyle = '#fde047';
        for (const b of state.bullets) {
            ctx.fillRect(b.x, b.y, BULLET_WIDTH, BULLET_HEIGHT);
        }

        ctx.fillStyle = slowActive ? '#00f0ff' : '#fff';
        for (const ball of state.balls) {
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.lineWidth = 2;
        for (const p of state.powerups) {
            const meta = POWERUP_META[p.type];
            ctx.fillStyle = meta.color;
            ctx.fillRect(p.x, p.y, POWERUP_SIZE, POWERUP_SIZE);
            ctx.strokeStyle = '#0a0a0a';
            ctx.strokeRect(p.x + 0.5, p.y + 0.5, POWERUP_SIZE - 1, POWERUP_SIZE - 1);
            ctx.fillStyle = '#0a0a0a';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(meta.label, p.x + POWERUP_SIZE / 2, p.y + POWERUP_SIZE / 2 + 1);
        }

        animationRef.current = requestAnimationFrame(gameLoop);
    }, []);

    const startGame = useCallback(() => {
        gameAudio.init();
        gameAudio.resume();
        const state = gameStateRef.current;
        state.lives = 5;
        state.score = 0;
        state.lastUiScore = 0;
        state.paddleX = CANVAS_WIDTH / 2 - 50;
        state.status = 'playing';

        inputRef.current = { targetX: null, keyLeft: false, keyRight: false };
        fpsRef.current.lastTime = performance.now();
        fpsRef.current.accumulator = 0;

        loadLevel(0, false);
        setUiState({ score: 0, lives: 5, level: 0, status: 'playing', fpsMode: fpsRef.current.mode, activeEffects: [] });

        requestPointerLock();

        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        animationRef.current = requestAnimationFrame(gameLoop);
    }, [gameLoop]);

    const pauseGame = useCallback(() => {
        const state = gameStateRef.current;
        if (state.status === 'playing') {
            state.status = 'paused';
            state.pauseStart = performance.now();
            releasePointerLock();
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            setUiState(prev => ({ ...prev, status: 'paused' }));
        } else if (state.status === 'paused') {
            state.status = 'playing';
            const now = performance.now();
            const pauseDuration = now - state.pauseStart;
            if (state.effects.gun > 0) state.effects.gun += pauseDuration;
            if (state.effects.laser > 0) state.effects.laser += pauseDuration;
            if (state.effects.big > 0) state.effects.big += pauseDuration;
            if (state.effects.slow > 0) state.effects.slow += pauseDuration;
            if (state.brickTransitionEnd > 0) state.brickTransitionEnd += pauseDuration;
            state.lastBulletTime += pauseDuration;
            state.lastLaserTick += pauseDuration;
            fpsRef.current.lastTime = now;
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
        const unsubscribe = gameAudio.subscribe((muted) => {
            setAudioEnabled(!muted);
        });
        gameAudio.reset();
        return unsubscribe;
    }, []);

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

    // Auto-pause when tab/window loses focus — QoL so the game doesn't run unattended.
    useEffect(() => {
        const handleBlur = () => {
            if (gameStateRef.current.status === 'playing') {
                pauseGame();
            }
        };
        window.addEventListener('blur', handleBlur);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) handleBlur();
        });
        return () => {
            window.removeEventListener('blur', handleBlur);
        };
    }, [pauseGame]);

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
                e.preventDefault();
                inputRef.current.keyLeft = true;
            } else if (e.key === 'ArrowRight' || e.key === 'd') {
                e.preventDefault();
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
                const paddleWidth = getEffectivePaddleWidth(state, performance.now());
                const deltaX = e.movementX / scale;
                state.paddleX = Math.max(0, Math.min(CANVAS_WIDTH - paddleWidth, state.paddleX + deltaX));
                inputRef.current.targetX = null;
            } else {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const rect = canvas.getBoundingClientRect();
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
        gameAudio.toggle();
        gameAudio.resume();
        if (!gameAudio.isMuted()) gameAudio.play('click');
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
                        <p className="text-gray-500 text-sm">Infinite levels • Powerups • Chaos</p>
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
                            {[...Array(5)].map((_, i) => (
                                <span key={i} className={i < uiState.lives ? "text-red-500" : "text-gray-800"}>
                                    ❤
                                </span>
                            ))}
                        </p>
                    </div>
                </div>

                {/* Active effects — fixed-height slot prevents the canvas from jerking when a powerup activates */}
                <div className="h-8 flex justify-center gap-2 mb-2 flex-wrap items-center">
                    {uiState.activeEffects.map(eff => {
                        const meta = POWERUP_META[eff];
                        return (
                            <span
                                key={eff}
                                className="text-xs px-2.5 py-1 rounded-full font-mono font-bold"
                                style={{ backgroundColor: meta.color + '33', color: meta.color, border: `1px solid ${meta.color}66` }}
                            >
                                {meta.label} {meta.name}
                            </span>
                        );
                    })}
                </div>

                {/* FPS indicator also reserved so it doesn't shift layout */}
                <div className="h-5 text-center text-yellow-500 text-xs mb-1">
                    {uiState.fpsMode === 'low' ? 'Performance mode: 30 FPS' : ''}
                </div>

                {/* Canvas */}
                <div className="flex justify-center">
                    <div className="flex justify-center relative" style={{ width: canvasSize.width, height: canvasSize.height, margin: '0 auto' }}>
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
                    <span className="hidden sm:inline">Arrow Keys or Mouse • Space/ESC to pause • Catch falling powerups</span>
                    <span className="sm:hidden">Touch to move • Catch powerups</span>
                </p>

                {/* Powerup Legend */}
                <div className="mt-4 flex justify-center gap-3 flex-wrap text-xs text-gray-400">
                    {Object.entries(POWERUP_META).map(([key, meta]) => (
                        <span key={key} className="flex items-center gap-1.5">
                            <span
                                className="inline-flex items-center justify-center w-5 h-5 rounded-sm font-bold font-mono text-black"
                                style={{ backgroundColor: meta.color }}
                            >
                                {meta.label}
                            </span>
                            {meta.name}
                        </span>
                    ))}
                </div>
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
