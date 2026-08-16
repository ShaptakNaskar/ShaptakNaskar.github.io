import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
    ArrowLeft,
    ArrowRight,
    ChevronLeft,
    Gauge,
    Pause,
    Play,
    RotateCcw,
    Shield,
    Trophy,
    Volume2,
    VolumeX,
    Zap,
} from 'lucide-react';
import gameAudio from '../../utils/audio';
import LeaderboardModal from '../LeaderboardModal';

const Motion = motion;

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 520;
const HORIZON_Y = 92;
const PLAYER_Y = 430;
const LANES = 3;
const MAX_OVERCHARGE = 100;
const UI_UPDATE_MS = 80;

const SPRINGS = {
    snappy: { type: 'spring', stiffness: 400, damping: 30, mass: 1 },
    bouncy: { type: 'spring', stiffness: 500, damping: 18, mass: 1 },
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (start, end, amount) => start + (end - start) * amount;

function getRoadEdges(y) {
    const progress = clamp((y - HORIZON_Y) / (CANVAS_HEIGHT - HORIZON_Y), 0, 1);
    return {
        left: lerp(355, 58, progress),
        right: lerp(545, 842, progress),
    };
}

function getLaneX(lane, y) {
    const { left, right } = getRoadEdges(y);
    return left + ((lane + 0.5) / LANES) * (right - left);
}

function makeStars() {
    return Array.from({ length: 62 }, (_, index) => ({
        x: (index * 137 + Math.random() * 80) % CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        speed: 12 + Math.random() * 44,
        size: index % 9 === 0 ? 2 : 1,
    }));
}

function createGame(status = 'idle') {
    return {
        status,
        playerLane: 1,
        playerX: getLaneX(1, PLAYER_Y),
        entities: [],
        particles: [],
        stars: makeStars(),
        score: 0,
        packets: 0,
        combo: 1,
        bestCombo: 1,
        shield: 0,
        overcharge: 0,
        overclockTimer: 0,
        elapsed: 0,
        distance: 0,
        speed: 215,
        level: 1,
        spawnTimer: 0.65,
        gridOffset: 0,
        flash: 0,
        shake: 0,
        lastTimestamp: 0,
        lastUiUpdate: 0,
        entityId: 0,
    };
}

function addEntity(state, kind, lane, y = HORIZON_Y - 24) {
    state.entities.push({
        id: state.entityId++,
        kind,
        lane,
        y,
        rotation: Math.random() * Math.PI * 2,
        resolved: false,
    });
}

function shuffledLanes() {
    const lanes = [0, 1, 2];
    for (let index = lanes.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [lanes[index], lanes[swapIndex]] = [lanes[swapIndex], lanes[index]];
    }
    return lanes;
}

function spawnRow(state) {
    const roll = Math.random();

    if (roll < 0.15) {
        const lane = Math.floor(Math.random() * LANES);
        addEntity(state, 'packet', lane, HORIZON_Y - 18);
        addEntity(state, 'packet', lane, HORIZON_Y - 92);
        addEntity(state, 'packet', lane, HORIZON_Y - 166);
        return;
    }

    if (roll < 0.25) {
        const lane = Math.floor(Math.random() * LANES);
        addEntity(state, Math.random() < 0.48 ? 'shield' : 'battery', lane);
        return;
    }

    const lanes = shuffledLanes();
    const hazardCount = state.elapsed > 17 && Math.random() < 0.42 ? 2 : 1;
    const hazardLanes = lanes.slice(0, hazardCount);
    const safeLanes = lanes.slice(hazardCount);

    hazardLanes.forEach((lane, index) => {
        const corruptionChance = state.elapsed > 12 ? 0.34 : 0.12;
        addEntity(state, Math.random() < corruptionChance ? 'corruption' : 'firewall', lane, HORIZON_Y - index * 3);
    });

    if (Math.random() < 0.78) {
        const safeLane = safeLanes[Math.floor(Math.random() * safeLanes.length)];
        addEntity(state, 'packet', safeLane, HORIZON_Y - 4);
    }
}

function burst(state, x, y, color, count, reducedMotion) {
    const particleCount = reducedMotion ? Math.min(3, count) : count;
    for (let index = 0; index < particleCount; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const force = 45 + Math.random() * 125;
        state.particles.push({
            x,
            y,
            vx: Math.cos(angle) * force,
            vy: Math.sin(angle) * force,
            life: 1,
            size: 1.5 + Math.random() * 3.5,
            color,
        });
    }
}

function drawDiamond(ctx, x, y, radius, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = color;
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#03141b';
    ctx.fillRect(-radius * 0.48, -radius * 0.48, radius * 0.96, radius * 0.96);
    ctx.fillStyle = '#d8feff';
    ctx.fillRect(-radius * 0.18, -radius * 0.18, radius * 0.36, radius * 0.36);
    ctx.restore();
}

function drawFirewall(ctx, x, y, size) {
    const width = size * 1.75;
    const height = size * 1.05;
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = '#ff335f';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#8f1234';
    ctx.fillRect(-width / 2, -height / 2, width, height);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ff6b89';
    ctx.lineWidth = Math.max(1, size * 0.08);
    ctx.strokeRect(-width / 2, -height / 2, width, height);
    ctx.beginPath();
    for (let offset = -width; offset < width; offset += size * 0.42) {
        ctx.moveTo(offset, height / 2);
        ctx.lineTo(offset + height, -height / 2);
    }
    ctx.strokeStyle = 'rgba(255, 177, 191, 0.55)';
    ctx.stroke();
    ctx.restore();
}

function drawCorruption(ctx, x, y, size, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.shadowColor = '#b44cff';
    ctx.shadowBlur = 22;
    ctx.fillStyle = '#7f20bd';
    ctx.beginPath();
    for (let point = 0; point < 12; point += 1) {
        const angle = (point / 12) * Math.PI * 2;
        const radius = point % 2 === 0 ? size : size * 0.55;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (point === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f0c9ff';
    ctx.fillRect(-size * 0.12, -size * 0.62, size * 0.24, size * 1.24);
    ctx.restore();
}

function drawPowerup(ctx, x, y, size, kind, rotation) {
    const color = kind === 'shield' ? '#5cf5ff' : '#ffd45c';
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation * 0.45);
    ctx.shadowColor = color;
    ctx.shadowBlur = 22;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, size * 0.12);
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (kind === 'shield') {
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.6);
        ctx.lineTo(size * 0.52, -size * 0.3);
        ctx.lineTo(size * 0.4, size * 0.42);
        ctx.lineTo(0, size * 0.7);
        ctx.lineTo(-size * 0.4, size * 0.42);
        ctx.lineTo(-size * 0.52, -size * 0.3);
        ctx.closePath();
        ctx.fillStyle = 'rgba(92, 245, 255, 0.42)';
        ctx.fill();
    } else {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(size * 0.1, -size * 0.72);
        ctx.lineTo(-size * 0.42, size * 0.08);
        ctx.lineTo(-size * 0.02, size * 0.08);
        ctx.lineTo(-size * 0.16, size * 0.72);
        ctx.lineTo(size * 0.45, -size * 0.14);
        ctx.lineTo(size * 0.04, -size * 0.14);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

function drawPlayer(ctx, state) {
    const x = state.playerX;
    const overclocked = state.overclockTimer > 0;
    const playerColor = overclocked ? '#ffd45c' : '#43f6ff';

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const trail = ctx.createLinearGradient(x, PLAYER_Y, x, CANVAS_HEIGHT);
    trail.addColorStop(0, overclocked ? 'rgba(255, 212, 92, 0.72)' : 'rgba(67, 246, 255, 0.66)');
    trail.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = trail;
    ctx.beginPath();
    ctx.moveTo(x - 12, PLAYER_Y + 8);
    ctx.lineTo(x + 12, PLAYER_Y + 8);
    ctx.lineTo(x + 32, CANVAS_HEIGHT);
    ctx.lineTo(x - 32, CANVAS_HEIGHT);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, PLAYER_Y);
    ctx.shadowColor = playerColor;
    ctx.shadowBlur = 26;
    ctx.fillStyle = playerColor;
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(24, 20);
    ctx.lineTo(0, 12);
    ctx.lineTo(-24, 20);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#07131c';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(10, 12);
    ctx.lineTo(0, 8);
    ctx.lineTo(-10, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    if (state.shield > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(92, 245, 255, 0.88)';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#5cf5ff';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.ellipse(x, PLAYER_Y, 39, 47, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

function drawScene(ctx, state, reducedMotion) {
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (state.shake > 0 && !reducedMotion) {
        ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }

    const background = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    background.addColorStop(0, '#09051a');
    background.addColorStop(0.52, '#041222');
    background.addColorStop(1, '#02050b');
    ctx.fillStyle = background;
    ctx.fillRect(-12, -12, CANVAS_WIDTH + 24, CANVAS_HEIGHT + 24);

    const horizonGlow = ctx.createRadialGradient(CANVAS_WIDTH / 2, HORIZON_Y, 2, CANVAS_WIDTH / 2, HORIZON_Y, 330);
    horizonGlow.addColorStop(0, 'rgba(88, 45, 255, 0.34)');
    horizonGlow.addColorStop(0.5, 'rgba(0, 225, 255, 0.08)');
    horizonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, 0, CANVAS_WIDTH, 330);

    state.stars.forEach((star) => {
        ctx.globalAlpha = 0.3 + (star.speed / 56) * 0.55;
        ctx.fillStyle = star.size > 1 ? '#c7b6ff' : '#7cecff';
        ctx.fillRect(star.x, star.y, star.size, reducedMotion ? star.size : star.size + state.speed / 180);
    });
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(4, 9, 21, 0.92)';
    for (let index = 0; index < 18; index += 1) {
        const width = 38 + (index % 4) * 11;
        const height = 30 + ((index * 47) % 84);
        const x = index * 55 - 18;
        ctx.fillRect(x, HORIZON_Y - height + 7, width, height);
        ctx.fillStyle = index % 3 === 0 ? 'rgba(168, 85, 247, 0.4)' : 'rgba(0, 240, 255, 0.26)';
        for (let windowY = HORIZON_Y - height + 17; windowY < HORIZON_Y - 2; windowY += 14) {
            ctx.fillRect(x + 8, windowY, 3, 4);
        }
        ctx.fillStyle = 'rgba(4, 9, 21, 0.92)';
    }

    const road = ctx.createLinearGradient(0, HORIZON_Y, 0, CANVAS_HEIGHT);
    road.addColorStop(0, 'rgba(18, 20, 48, 0.78)');
    road.addColorStop(1, 'rgba(3, 11, 20, 0.98)');
    ctx.fillStyle = road;
    ctx.beginPath();
    ctx.moveTo(355, HORIZON_Y);
    ctx.lineTo(545, HORIZON_Y);
    ctx.lineTo(842, CANVAS_HEIGHT);
    ctx.lineTo(58, CANVAS_HEIGHT);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.shadowColor = '#00efff';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = 'rgba(0, 239, 255, 0.72)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(355, HORIZON_Y);
    ctx.lineTo(58, CANVAS_HEIGHT);
    ctx.moveTo(545, HORIZON_Y);
    ctx.lineTo(842, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.restore();

    for (let boundary = 1; boundary < LANES; boundary += 1) {
        const topX = 355 + (boundary / LANES) * (545 - 355);
        const bottomX = 58 + (boundary / LANES) * (842 - 58);
        ctx.strokeStyle = 'rgba(116, 76, 255, 0.34)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(topX, HORIZON_Y);
        ctx.lineTo(bottomX, CANVAS_HEIGHT);
        ctx.stroke();
    }

    for (let index = 0; index < 13; index += 1) {
        const raw = ((index * 58 + state.gridOffset) % 754) / 754;
        const progress = raw * raw;
        const y = HORIZON_Y + progress * (CANVAS_HEIGHT - HORIZON_Y);
        const { left, right } = getRoadEdges(y);
        ctx.strokeStyle = `rgba(54, 214, 255, ${0.08 + progress * 0.22})`;
        ctx.lineWidth = 1 + progress;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.stroke();
    }

    ctx.save();
    ctx.shadowColor = '#9b5cff';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#a96bff';
    ctx.fillRect(350, HORIZON_Y - 1, 200, 2);
    ctx.restore();

    state.entities.forEach((entity) => {
        if (entity.y < HORIZON_Y - 45) return;
        const progress = clamp((entity.y - HORIZON_Y) / (CANVAS_HEIGHT - HORIZON_Y), 0, 1);
        const size = 7 + progress * 30;
        const x = getLaneX(entity.lane, entity.y);
        if (entity.kind === 'packet') drawDiamond(ctx, x, entity.y, size * 0.48, '#39f5ff');
        else if (entity.kind === 'firewall') drawFirewall(ctx, x, entity.y, size);
        else if (entity.kind === 'corruption') drawCorruption(ctx, x, entity.y, size, entity.rotation);
        else drawPowerup(ctx, x, entity.y, size * 0.78, entity.kind, entity.rotation);
    });

    state.particles.forEach((particle) => {
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    });
    ctx.globalAlpha = 1;

    drawPlayer(ctx, state);

    if (state.overclockTimer > 0) {
        ctx.fillStyle = `rgba(255, 212, 92, ${0.025 + Math.sin(state.elapsed * 10) * 0.015})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    if (state.flash > 0) {
        ctx.fillStyle = `rgba(255, 64, 104, ${state.flash * 0.35})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    ctx.restore();
}

function getUiSnapshot(state) {
    return {
        status: state.status,
        score: Math.floor(state.score),
        packets: state.packets,
        combo: state.combo,
        bestCombo: state.bestCombo,
        shield: state.shield,
        overcharge: Math.floor(state.overcharge),
        overclocked: state.overclockTimer > 0,
        level: state.level,
    };
}

function PacketRush() {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const loopRef = useRef(null);
    const leaderboardTimerRef = useRef(null);
    const touchStartRef = useRef(null);
    const gameRef = useRef(createGame());
    const reducedMotion = useReducedMotion();
    const reducedMotionRef = useRef(Boolean(reducedMotion));

    const [ui, setUi] = useState({
        status: 'idle',
        score: 0,
        packets: 0,
        combo: 1,
        bestCombo: 1,
        shield: 0,
        overcharge: 0,
        overclocked: false,
        level: 1,
    });
    const [audioEnabled, setAudioEnabled] = useState(!gameAudio.isMuted());
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [viewingLeaderboard, setViewingLeaderboard] = useState(false);

    useEffect(() => {
        reducedMotionRef.current = Boolean(reducedMotion);
    }, [reducedMotion]);

    useEffect(() => {
        gameAudio.init();
        const context = canvasRef.current?.getContext('2d');
        drawScene(context, gameRef.current, reducedMotionRef.current);

        const unsubscribe = gameAudio.subscribe((muted) => setAudioEnabled(!muted));
        return () => {
            unsubscribe();
            cancelAnimationFrame(animationRef.current);
            clearTimeout(leaderboardTimerRef.current);
        };
    }, []);

    const finishGame = useCallback(() => {
        const state = gameRef.current;
        if (state.status !== 'playing') return;

        state.status = 'gameOver';
        state.overclockTimer = 0;
        cancelAnimationFrame(animationRef.current);
        setUi(getUiSnapshot(state));
        gameAudio.play('gameOver');

        clearTimeout(leaderboardTimerRef.current);
        leaderboardTimerRef.current = setTimeout(() => setShowLeaderboard(true), 700);
    }, []);

    const gameLoop = useCallback((timestamp) => {
        const state = gameRef.current;
        const context = canvasRef.current?.getContext('2d');
        if (!context || state.status !== 'playing') return;

        if (!state.lastTimestamp) state.lastTimestamp = timestamp;
        const delta = Math.min((timestamp - state.lastTimestamp) / 1000, 0.05);
        state.lastTimestamp = timestamp;
        state.elapsed += delta;
        state.level = Math.min(12, Math.floor(state.elapsed / 14) + 1);
        state.speed = Math.min(520, 215 + state.elapsed * 7.1);

        const overclocked = state.overclockTimer > 0;
        const worldDelta = delta * (overclocked ? 0.46 : 1);
        state.overclockTimer = Math.max(0, state.overclockTimer - delta);
        state.playerX = lerp(state.playerX, getLaneX(state.playerLane, PLAYER_Y), Math.min(1, delta * 14));
        state.distance += state.speed * worldDelta;
        state.score += state.speed * worldDelta * 0.105 * (overclocked ? 1.35 : 1);
        state.gridOffset = (state.gridOffset + state.speed * worldDelta) % 754;
        state.flash = Math.max(0, state.flash - delta * 3.2);
        state.shake = Math.max(0, state.shake - delta * 36);

        state.stars.forEach((star) => {
            star.y += star.speed * worldDelta * (state.speed / 215);
            if (star.y > CANVAS_HEIGHT) {
                star.y = -8;
                star.x = Math.random() * CANVAS_WIDTH;
            }
        });

        state.spawnTimer -= worldDelta;
        if (state.spawnTimer <= 0) {
            spawnRow(state);
            const interval = Math.max(0.37, 0.84 - state.elapsed * 0.0085);
            state.spawnTimer = interval * (0.9 + Math.random() * 0.22);
        }

        let crashed = false;
        state.entities.forEach((entity) => {
            entity.y += state.speed * worldDelta;
            entity.rotation += worldDelta * 2.2;
            if (entity.resolved || entity.y < PLAYER_Y - 44 || entity.y > PLAYER_Y + 45) return;

            const entityX = getLaneX(entity.lane, entity.y);
            const hit = Math.abs(entityX - state.playerX) < 47;
            if (!hit) return;

            entity.resolved = true;
            if (entity.kind === 'packet') {
                state.packets += 1;
                state.score += 110 * state.combo;
                state.combo = Math.min(8, state.combo + 1);
                state.bestCombo = Math.max(state.bestCombo, state.combo);
                state.overcharge = Math.min(MAX_OVERCHARGE, state.overcharge + 12);
                burst(state, entityX, entity.y, '#43f6ff', 10, reducedMotionRef.current);
                gameAudio.play('correct');
            } else if (entity.kind === 'shield') {
                state.shield = 1;
                state.score += 175;
                burst(state, entityX, entity.y, '#5cf5ff', 14, reducedMotionRef.current);
                gameAudio.play('levelUp');
            } else if (entity.kind === 'battery') {
                state.overcharge = Math.min(MAX_OVERCHARGE, state.overcharge + 38);
                state.score += 150;
                burst(state, entityX, entity.y, '#ffd45c', 14, reducedMotionRef.current);
                gameAudio.play('merge');
            } else if (state.shield > 0) {
                state.shield = 0;
                state.combo = 1;
                state.flash = 0.7;
                state.shake = 12;
                burst(state, entityX, entity.y, '#ff5f7f', 20, reducedMotionRef.current);
                gameAudio.play('bounce');
            } else {
                state.flash = 1;
                state.shake = 18;
                burst(state, entityX, entity.y, '#ff335f', 24, reducedMotionRef.current);
                crashed = true;
            }
        });

        state.entities.forEach((entity) => {
            if (entity.kind === 'packet' && !entity.resolved && entity.y > PLAYER_Y + 48) {
                entity.resolved = true;
                state.combo = 1;
            }
        });
        state.entities = state.entities.filter((entity) => !entity.resolved && entity.y < CANVAS_HEIGHT + 80);

        state.particles.forEach((particle) => {
            particle.x += particle.vx * delta;
            particle.y += particle.vy * delta;
            particle.vx *= 0.97;
            particle.vy *= 0.97;
            particle.life -= delta * 1.8;
        });
        state.particles = state.particles.filter((particle) => particle.life > 0);

        drawScene(context, state, reducedMotionRef.current);

        if (timestamp - state.lastUiUpdate >= UI_UPDATE_MS) {
            state.lastUiUpdate = timestamp;
            setUi(getUiSnapshot(state));
        }

        if (crashed) {
            finishGame();
            return;
        }

        animationRef.current = requestAnimationFrame(loopRef.current);
    }, [finishGame]);

    useEffect(() => {
        loopRef.current = gameLoop;
    }, [gameLoop]);

    const startGame = useCallback(() => {
        clearTimeout(leaderboardTimerRef.current);
        cancelAnimationFrame(animationRef.current);
        gameAudio.init();
        gameAudio.resume();

        const state = createGame('playing');
        gameRef.current = state;
        setUi(getUiSnapshot(state));
        setShowLeaderboard(false);
        setViewingLeaderboard(false);
        animationRef.current = requestAnimationFrame(gameLoop);
    }, [gameLoop]);

    const moveLane = useCallback((direction) => {
        const state = gameRef.current;
        if (state.status !== 'playing') return;
        const nextLane = clamp(state.playerLane + direction, 0, LANES - 1);
        if (nextLane !== state.playerLane) {
            state.playerLane = nextLane;
            gameAudio.play('click');
        }
    }, []);

    const activateOverclock = useCallback(() => {
        const state = gameRef.current;
        if (state.status !== 'playing' || state.overcharge < MAX_OVERCHARGE || state.overclockTimer > 0) return;
        state.overcharge = 0;
        state.overclockTimer = 3.2;
        state.score += 250;
        setUi(getUiSnapshot(state));
        gameAudio.play('levelUp');
    }, []);

    const togglePause = useCallback(() => {
        const state = gameRef.current;
        if (state.status === 'playing') {
            state.status = 'paused';
            cancelAnimationFrame(animationRef.current);
            setUi(getUiSnapshot(state));
            drawScene(canvasRef.current?.getContext('2d'), state, reducedMotionRef.current);
        } else if (state.status === 'paused') {
            state.status = 'playing';
            state.lastTimestamp = 0;
            setUi(getUiSnapshot(state));
            animationRef.current = requestAnimationFrame(gameLoop);
        }
    }, [gameLoop]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            const status = gameRef.current.status;
            const gameKey = ['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ', 'a', 'A', 'd', 'D', 'p', 'P', 'Escape', 'Enter'].includes(event.key);
            if (gameKey && ['playing', 'paused', 'idle', 'gameOver'].includes(status)) event.preventDefault();
            if (event.repeat && !['p', 'P', 'Escape'].includes(event.key)) return;

            if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') moveLane(-1);
            else if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') moveLane(1);
            else if (event.key === 'ArrowUp' || event.key === ' ') activateOverclock();
            else if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') togglePause();
            else if (event.key === 'Enter' && (status === 'idle' || status === 'gameOver')) startGame();
        };

        const handleVisibility = () => {
            if (document.hidden && gameRef.current.status === 'playing') togglePause();
        };

        window.addEventListener('keydown', handleKeyDown);
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [activateOverclock, moveLane, startGame, togglePause]);

    const toggleAudio = () => {
        gameAudio.init();
        const enabled = gameAudio.toggle();
        setAudioEnabled(enabled);
        if (enabled) gameAudio.play('click');
    };

    const handleCanvasClick = (event) => {
        if (gameRef.current.status !== 'playing') return;
        const rect = event.currentTarget.getBoundingClientRect();
        const position = (event.clientX - rect.left) / rect.width;
        if (position < 0.4) moveLane(-1);
        else if (position > 0.6) moveLane(1);
        else activateOverclock();
    };

    const handleTouchStart = (event) => {
        const touch = event.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (event) => {
        event.preventDefault();
        if (!touchStartRef.current || gameRef.current.status !== 'playing') return;
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - touchStartRef.current.x;
        const deltaY = touch.clientY - touchStartRef.current.y;
        touchStartRef.current = null;

        if (Math.abs(deltaX) > 28 && Math.abs(deltaX) > Math.abs(deltaY)) moveLane(deltaX > 0 ? 1 : -1);
        else if (deltaY < -28) activateOverclock();
    };

    const getAchievement = () => {
        if (ui.bestCombo >= 8) return 'Perfect x8 data chain';
        if (ui.packets >= 30) return `${ui.packets} packets secured`;
        return `Sector ${ui.level} • ${ui.packets} packets`;
    };

    const isReady = ui.overcharge >= MAX_OVERCHARGE && !ui.overclocked;
    const pageMotion = reducedMotion
        ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
        : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: SPRINGS.snappy };

    return (
        <Motion.div {...pageMotion} className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        to="/games"
                        aria-label="Back to the arcade"
                        className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <Gauge className="text-primary" size={24} />
                            <h1 className="bg-gradient-to-r from-primary via-white to-secondary bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-3xl">
                                Packet Rush
                            </h1>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">Route clean data. Break the firewall. Stay online.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                        type="button"
                        onClick={() => setViewingLeaderboard(true)}
                        className="group flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-white/15 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <Trophy size={18} className="transition-transform group-hover:-translate-y-0.5" />
                        <span className="hidden sm:inline">Leaderboard</span>
                    </button>
                    <button
                        type="button"
                        onClick={toggleAudio}
                        aria-label={audioEnabled ? 'Mute game audio' : 'Enable game audio'}
                        className={`rounded-xl p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${audioEnabled ? 'bg-primary/15 text-primary' : 'bg-white/10 text-gray-400 hover:text-white'}`}
                    >
                        {audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                    </button>
                </div>
            </div>

            <Motion.div
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reducedMotion ? { duration: 0.2 } : { ...SPRINGS.snappy, delay: 0.08 }}
                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            >
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">Score</p>
                    <p className="mt-1 font-mono text-xl font-bold text-white">{ui.score.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">Data chain</p>
                    <p className={`mt-1 font-mono text-xl font-bold ${ui.combo > 1 ? 'text-primary' : 'text-white'}`}>×{ui.combo}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">Packets</p>
                    <p className="mt-1 font-mono text-xl font-bold text-white">{ui.packets}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="flex items-center justify-between">
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">Overclock</p>
                        {ui.shield > 0 && <Shield size={14} className="text-primary" aria-label="Shield active" />}
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                        <Motion.div
                            className={`h-full origin-left rounded-full ${ui.overclocked ? 'bg-yellow-300' : 'bg-gradient-to-r from-secondary to-primary'}`}
                            animate={{ scaleX: ui.overclocked ? 1 : ui.overcharge / MAX_OVERCHARGE }}
                            transition={reducedMotion ? { duration: 0 } : SPRINGS.snappy}
                        />
                    </div>
                </div>
            </Motion.div>

            <Motion.div
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={reducedMotion ? { duration: 0.2 } : { ...SPRINGS.snappy, delay: 0.16 }}
                className="relative overflow-hidden rounded-2xl border border-primary/20 bg-black shadow-[0_0_60px_rgba(0,240,255,0.08)]"
            >
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    onClick={handleCanvasClick}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    className="block aspect-[45/26] w-full touch-none select-none"
                    role="img"
                    aria-label="Packet Rush game field with three neon data lanes"
                />

                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[length:100%_4px] opacity-40" />

                <AnimatePresence mode="wait">
                    {ui.status !== 'playing' && (
                        <Motion.div
                            key={ui.status}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: reducedMotion ? 0.15 : 0.25 }}
                            className="absolute inset-0 flex items-center justify-center bg-[#030711]/72 p-4 backdrop-blur-[3px]"
                        >
                            <Motion.div
                                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 12 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={reducedMotion ? { duration: 0.15 } : SPRINGS.bouncy}
                                className="pointer-events-auto max-w-sm text-center"
                            >
                                {ui.status === 'idle' && (
                                    <>
                                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-[0_0_35px_rgba(0,240,255,0.18)]">
                                            <Zap size={28} />
                                        </div>
                                        <h2 className="text-2xl font-black text-white">Open the channel</h2>
                                        <p className="mt-2 text-sm leading-relaxed text-gray-400">
                                            Switch lanes, secure cyan packets, and dodge every hostile node.
                                        </p>
                                    </>
                                )}
                                {ui.status === 'paused' && (
                                    <>
                                        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Channel suspended</p>
                                        <h2 className="mt-2 text-2xl font-black text-white">Paused</h2>
                                    </>
                                )}
                                {ui.status === 'gameOver' && (
                                    <>
                                        <p className="font-mono text-xs uppercase tracking-[0.3em] text-red-400">Connection severed</p>
                                        <h2 className="mt-2 text-2xl font-black text-white">Run complete</h2>
                                        <p className="mt-2 font-mono text-3xl font-bold text-primary">{ui.score.toLocaleString()}</p>
                                        <p className="mt-1 text-sm text-gray-400">{ui.packets} packets secured • best chain ×{ui.bestCombo}</p>
                                    </>
                                )}

                                <button
                                    type="button"
                                    onClick={ui.status === 'paused' ? togglePause : startGame}
                                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-6 py-3 font-bold text-dark shadow-[0_10px_30px_rgba(0,240,255,0.18)] transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                >
                                    <Play size={19} fill="currentColor" />
                                    {ui.status === 'paused' ? 'Resume run' : ui.status === 'gameOver' ? 'Run again' : 'Start run'}
                                </button>
                            </Motion.div>
                        </Motion.div>
                    )}
                </AnimatePresence>

                <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/35 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400 backdrop-blur-sm">
                    Sector {String(ui.level).padStart(2, '0')}
                    <span className="h-1 w-1 rounded-full bg-primary" />
                    {ui.overclocked ? <span className="text-yellow-300">Time dilated</span> : <span>Link stable</span>}
                </div>
            </Motion.div>

            <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-3">
                <Motion.button
                    type="button"
                    whileTap={reducedMotion ? undefined : { scale: 0.92 }}
                    onClick={() => moveLane(-1)}
                    disabled={ui.status !== 'playing'}
                    aria-label="Move one lane left"
                    className="flex min-h-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-gray-200 transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                    <ChevronLeft size={26} />
                </Motion.button>
                <Motion.button
                    type="button"
                    whileTap={reducedMotion ? undefined : { scale: 0.92 }}
                    onClick={activateOverclock}
                    disabled={!isReady || ui.status !== 'playing'}
                    aria-label={isReady ? 'Activate overclock' : `Overclock ${ui.overcharge} percent charged`}
                    className={`relative flex min-h-14 items-center justify-center gap-2 overflow-hidden rounded-xl border font-mono text-xs font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 ${isReady ? 'border-yellow-300/60 bg-yellow-300/15 text-yellow-200 shadow-[0_0_28px_rgba(253,224,71,0.12)]' : 'border-white/10 bg-white/[0.04] text-gray-500'} disabled:cursor-not-allowed`}
                >
                    <Zap size={18} fill={isReady ? 'currentColor' : 'none'} />
                    {ui.overclocked ? 'Active' : isReady ? 'Engage' : `${ui.overcharge}%`}
                </Motion.button>
                <Motion.button
                    type="button"
                    whileTap={reducedMotion ? undefined : { scale: 0.92 }}
                    onClick={() => moveLane(1)}
                    disabled={ui.status !== 'playing'}
                    aria-label="Move one lane right"
                    className="flex min-h-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-gray-200 transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                    <ArrowRight size={26} />
                </Motion.button>
            </div>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-5 sm:flex-row">
                <p className="text-center text-xs text-gray-500 sm:text-left sm:text-sm">
                    <span className="hidden sm:inline">A/D or arrows to route • Space to overclock • P to pause</span>
                    <span className="sm:hidden">Swipe or tap the controls • Swipe up to overclock</span>
                </p>
                <div className="flex gap-2">
                    {(ui.status === 'playing' || ui.status === 'paused') && (
                        <button
                            type="button"
                            onClick={togglePause}
                            className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            {ui.status === 'paused' ? <Play size={15} /> : <Pause size={15} />}
                            {ui.status === 'paused' ? 'Resume' : 'Pause'}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={startGame}
                        className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <RotateCcw size={15} />
                        Restart
                    </button>
                </div>
            </div>

            <p className="sr-only" aria-live="polite">
                {ui.status === 'gameOver' ? `Run complete with ${ui.score} points and ${ui.packets} packets.` : ''}
            </p>

            <LeaderboardModal
                isOpen={showLeaderboard}
                onClose={() => setShowLeaderboard(false)}
                game="packet-rush"
                currentScore={ui.status === 'gameOver' ? ui.score : undefined}
                onSubmitScore={getAchievement}
            />
            <LeaderboardModal
                isOpen={viewingLeaderboard}
                onClose={() => setViewingLeaderboard(false)}
                game="packet-rush"
            />
        </Motion.div>
    );
}

export default PacketRush;
