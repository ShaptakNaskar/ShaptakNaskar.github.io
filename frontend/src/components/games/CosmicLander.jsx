import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, Volume2, VolumeX, Trophy, Rocket, ChevronUp, RotateCw, RotateCcw as RotateCcwIcon } from 'lucide-react';
import gameAudio from '../../utils/audio';
import LeaderboardModal from '../LeaderboardModal';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.004; // Reduced another 50%
const THRUST_POWER = 0.011; // Adjusted ratio
const ROTATION_SPEED = 0.03;
const LANDING_MAX_SPEED = 0.8;
const LANDING_MAX_ANGLE = 0.15; // approx 8 degrees
const FUEL_CONSUMPTION = 0.5;

// Terrain generation
const TERRAIN_POINTS = 20;
const LANDING_PAD_WIDTH = 60;

function CosmicLander() {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const lastFrameTimeRef = useRef(0);

    const inputsRef = useRef({
        thrust: false,
        left: false,
        right: false
    });

    const gameStateRef = useRef({
        x: CANVAS_WIDTH / 2,
        y: 100,
        vx: 0,
        vy: 0,
        angle: 0, // radians, 0 is pointing up
        fuel: 1000,
        terrain: [], // Array of {x, y}
        landingPad: null, // {x, width}
        status: 'idle', // idle, playing, paused, landed, crashed
        score: 0,
        particles: [] // {x, y, vx, vy, life}
    });

    const [uiState, setUiState] = useState({
        fuel: 1000,
        score: 0,
        altitude: 0,
        speed: 0,
        status: 'idle',
        message: ''
    });

    const [audioEnabled, setAudioEnabled] = useState(!gameAudio.isMuted());
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

    // Generators
    const generateTerrain = () => {
        const points = [];
        const segmentWidth = CANVAS_WIDTH / (TERRAIN_POINTS - 1);

        // Pick a random spot for the landing pad
        const padIndex = Math.floor(Math.random() * (TERRAIN_POINTS - 4)) + 2;

        for (let i = 0; i < TERRAIN_POINTS; i++) {
            let x = i * segmentWidth;
            let y;

            if (i === padIndex || i === padIndex + 1) {
                // Landing pad - flat
                y = CANVAS_HEIGHT - 100; // Fixed height for pad
                if (i === padIndex) {
                    gameStateRef.current.landingPad = { x, width: segmentWidth, y };
                }
            } else {
                // Random terrain
                const noise = Math.random() * 200;
                y = CANVAS_HEIGHT - 50 - noise;
            }
            points.push({ x, y });
        }
        return points;
    };

    const resetGame = (fullReset = false) => {
        const state = gameStateRef.current;
        state.x = CANVAS_WIDTH / 2;
        state.y = 80;
        state.vx = (Math.random() - 0.5) * 1;
        state.vy = 0;
        state.angle = 0;
        state.fuel = fullReset ? 1000 : state.fuel;
        state.terrain = generateTerrain();
        state.particles = [];
        state.status = 'playing';
        if (fullReset) state.score = 0;

        setUiState(prev => ({
            ...prev,
            fuel: state.fuel,
            score: state.score,
            status: 'playing',
            message: ''
        }));
    };

    // Game Loop
    const gameLoop = useCallback((currentTime) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const state = gameStateRef.current;

        if (!ctx || state.status === 'paused') return;

        const deltaTime = currentTime - lastFrameTimeRef.current;
        lastFrameTimeRef.current = currentTime;

        if (state.status === 'playing') {
            // Physics
            state.vy += GRAVITY;

            if (inputsRef.current.thrust && state.fuel > 0) {
                state.vx += Math.sin(state.angle) * THRUST_POWER;
                state.vy -= Math.cos(state.angle) * THRUST_POWER;
                state.fuel = Math.max(0, state.fuel - FUEL_CONSUMPTION);

                // Play thrust sound (throttled by audio util)
                if (Math.floor(currentTime / 100) % 2 === 0) { // Slight throttle
                    gameAudio.play('thrust');
                }

                // Add particles
                for (let i = 0; i < 3; i++) {
                    state.particles.push({
                        x: state.x - Math.sin(state.angle) * 10,
                        y: state.y + Math.cos(state.angle) * 10,
                        vx: state.vx + (Math.random() - 0.5) * 2,
                        vy: state.vy + 2 + Math.random() * 2,
                        life: 1.0,
                        color: Math.random() > 0.5 ? '#ff9900' : '#ff5500'
                    });
                }
            }

            if (inputsRef.current.left) state.angle -= ROTATION_SPEED;
            if (inputsRef.current.right) state.angle += ROTATION_SPEED;

            state.x += state.vx;
            state.y += state.vy;

            // Boundaries
            if (state.x < 0) { state.x = 0; state.vx *= -0.5; }
            if (state.x > CANVAS_WIDTH) { state.x = CANVAS_WIDTH; state.vx *= -0.5; }
            if (state.y < 0) { state.y = 0; state.vy = 0; }

            // Collision Detection
            // Simple point collision with lines for now (bottom of lander)
            const landerBottomX = state.x + Math.sin(state.angle) * 10;
            const landerBottomY = state.y + Math.cos(state.angle) * 10;

            // Find terrain segment below lander
            const terrain = state.terrain;
            let hit = false;

            for (let i = 0; i < terrain.length - 1; i++) {
                const p1 = terrain[i];
                const p2 = terrain[i + 1];

                if (state.x >= p1.x && state.x <= p2.x) {
                    // Interpolate Y at lander X
                    const t = (state.x - p1.x) / (p2.x - p1.x);
                    const groundY = p1.y + t * (p2.y - p1.y);

                    if (state.y + 10 >= groundY) {
                        hit = true;
                        // Check if it's the landing pad
                        const isPad = state.landingPad && state.x >= state.landingPad.x && state.x <= state.landingPad.x + state.landingPad.width;

                        const speed = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
                        const angleOk = Math.abs(state.angle) < LANDING_MAX_ANGLE;

                        if (isPad && speed < LANDING_MAX_SPEED && angleOk) {
                            state.status = 'landed';
                            const landingScore = Math.floor(state.fuel / 5) + 500;
                            state.score += landingScore;
                            gameAudio.play('win');
                            setUiState(prev => ({
                                ...prev,
                                status: 'landed',
                                score: state.score,
                                message: `Perfect Landing! +${landingScore}`
                            }));
                            setTimeout(() => setShowLeaderboard(true), 2000);
                        } else {
                            state.status = 'crashed';
                            gameAudio.play('gameOver');
                            const reasons = [];
                            if (!isPad) reasons.push("Missed the pad");
                            if (speed >= LANDING_MAX_SPEED) reasons.push("Too fast");
                            if (!angleOk) reasons.push("Bad angle");

                            setUiState(prev => ({
                                ...prev,
                                status: 'crashed',
                                message: `CRASHED! ${reasons.join(', ')}`
                            }));
                            setTimeout(() => setShowLeaderboard(true), 2000);
                        }
                    }
                }
            }
        }

        // Update UI occasionally (throttle)
        if (state.frameCount === undefined) state.frameCount = 0;
        state.frameCount++;

        if (state.frameCount % 10 === 0) {
            setUiState(prev => ({
                ...prev,
                fuel: Math.floor(state.fuel),
                altitude: Math.max(0, Math.floor(CANVAS_HEIGHT - state.y)),
                speed: Math.sqrt(state.vx * state.vx + state.vy * state.vy).toFixed(1)
            }));
        }

        // Drawing
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw Terrain
        ctx.beginPath();
        ctx.moveTo(state.terrain[0].x, CANVAS_HEIGHT);
        ctx.lineTo(state.terrain[0].x, state.terrain[0].y);
        for (let i = 1; i < state.terrain.length; i++) {
            ctx.lineTo(state.terrain[i].x, state.terrain[i].y);
        }
        ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();

        ctx.beginPath();
        for (let i = 0; i < state.terrain.length - 1; i++) {
            ctx.moveTo(state.terrain[i].x, state.terrain[i].y);
            ctx.lineTo(state.terrain[i + 1].x, state.terrain[i + 1].y);
        }
        ctx.strokeStyle = '#555';
        ctx.stroke();

        // Draw Landing Pad
        if (state.landingPad) {
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(state.landingPad.x, state.landingPad.y - 2, state.landingPad.width, 4);
            // Guide lights
            if (Math.floor(currentTime / 500) % 2 === 0) {
                ctx.fillStyle = '#00ff00AA';
                ctx.fillRect(state.landingPad.x + 5, state.landingPad.y + 5, 5, 5);
                ctx.fillRect(state.landingPad.x + state.landingPad.width - 10, state.landingPad.y + 5, 5, 5);
            }
        }

        // Draw Particles
        state.particles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.05;
            if (p.life > 0) {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            } else {
                state.particles.splice(i, 1);
            }
        });

        // Draw Lander
        if (state.status !== 'crashed' || Math.floor(currentTime / 200) % 2 === 0) {
            ctx.save();
            ctx.translate(state.x, state.y);
            ctx.rotate(state.angle);

            // Lander body
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-10, 10);
            ctx.lineTo(0, -15);
            ctx.lineTo(10, 10);
            ctx.closePath();
            ctx.stroke();

            // Legs
            ctx.beginPath();
            ctx.moveTo(-10, 10);
            ctx.lineTo(-15, 18);
            ctx.moveTo(10, 10);
            ctx.lineTo(15, 18);
            ctx.stroke();

            // Flame if thrusting
            if (inputsRef.current.thrust && state.fuel > 0) {
                ctx.fillStyle = '#f00';
                ctx.beginPath();
                ctx.moveTo(-6, 12);
                ctx.lineTo(0, 25 + Math.random() * 10);
                ctx.lineTo(6, 12);
                ctx.fill();
            }

            ctx.restore();
        }

        animationRef.current = requestAnimationFrame(gameLoop);
    }, []);

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
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    useEffect(() => {
        const unsubscribe = gameAudio.subscribe((muted) => {
            setAudioEnabled(!muted);
        });
        return unsubscribe;
    }, []);

    // Input handling
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
            if (e.repeat) return;
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case ' ':
                    inputsRef.current.thrust = true;
                    if (audioEnabled && gameStateRef.current.fuel > 0) {
                        // Loop sound? for now just discrete
                    }
                    break;
                case 'ArrowLeft':
                case 'a':
                    inputsRef.current.left = true; break;
                case 'ArrowRight':
                case 'd':
                    inputsRef.current.right = true; break;
                case 'Escape':
                    if (gameStateRef.current.status === 'playing') setUiState(prev => ({ ...prev, status: 'paused' }));
                    break;
            }
        };

        const handleKeyUp = (e) => {
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case ' ':
                    inputsRef.current.thrust = false; break;
                case 'ArrowLeft':
                case 'a':
                    inputsRef.current.left = false; break;
                case 'ArrowRight':
                case 'd':
                    inputsRef.current.right = false; break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [audioEnabled]);

    const startGame = () => {
        gameAudio.init();
        gameAudio.resume();
        if (gameStateRef.current.status === 'idling' || gameStateRef.current.status === 'landed' || gameStateRef.current.status === 'crashed' || gameStateRef.current.status === 'ended') {
            resetGame(gameStateRef.current.status === 'crashed' || gameStateRef.current.status === 'ended' ? true : false); // Only full reset if crashed? No, cumulative? Let's restart level
            // If landed, we keep fuel and score but easy reset for now
            if (gameStateRef.current.status === 'landed') {
                // Next level style
                resetGame(false);
            } else {
                resetGame(true);
            }
        } else {
            gameStateRef.current.status = 'playing';
            setUiState(prev => ({ ...prev, status: 'playing' }));
            lastFrameTimeRef.current = performance.now();
            animationRef.current = requestAnimationFrame(gameLoop);
        }

    };

    // Start initial loop
    useEffect(() => {
        // Initial draw or idle state
        resetGame(true);
        gameStateRef.current.status = 'idle';
        setUiState(prev => ({ ...prev, status: 'idle' }));

        lastFrameTimeRef.current = performance.now();
        animationRef.current = requestAnimationFrame(gameLoop);

        return () => cancelAnimationFrame(animationRef.current);
    }, [gameLoop]);


    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/games" className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        <ArrowLeft size={24} className="text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                            <Rocket className="text-purple-500" /> Cosmic Lander
                        </h1>
                        <p className="text-gray-500 text-sm">Land on the green pad. Watch your velocity!</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            gameAudio.toggle();
                            gameAudio.resume();
                            if (!gameAudio.isMuted()) gameAudio.play('click');
                        }}
                        className={`p-2 rounded-lg transition-colors ${audioEnabled ? 'bg-primary/20 text-primary' : 'bg-white/10 text-gray-400'}`}
                    >
                        {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    </button>
                    <div className="bg-white/10 px-4 py-2 rounded-lg text-white">
                        <span className="text-gray-400 text-sm">Score:</span>
                        <span className="ml-2 font-mono font-bold text-xl">{uiState.score}</span>
                    </div>
                    <button
                        onClick={() => setShowLeaderboard(true)}
                        className="p-2 rounded-lg bg-white/10 text-gray-400 hover:bg-primary/20 hover:text-primary transition-colors"
                    >
                        <Trophy size={20} />
                    </button>
                </div>
            </div>

            {/* Game Container */}
            <div className="glass-panel rounded-2xl p-4 sm:p-6">

                {/* HUD */}
                <div className="grid grid-cols-3 gap-4 mb-4 text-center font-mono text-sm">
                    <div className={`p-2 rounded bg-opacity-20 ${uiState.fuel < 200 ? 'bg-red-500 text-red-400' : 'bg-green-500 text-green-400'}`}>
                        FUEL: {uiState.fuel}
                    </div>
                    <div className="p-2 rounded bg-white/5 text-blue-300">
                        ALT: {uiState.altitude}
                    </div>
                    <div className={`p-2 rounded bg-opacity-20 ${parseFloat(uiState.speed) > LANDING_MAX_SPEED ? 'bg-red-500 text-red-400' : 'bg-green-500 text-green-400'}`}>
                        SPEED: {uiState.speed}
                    </div>
                </div>

                {/* Canvas */}
                <div className="relative mx-auto border border-white/10 rounded-xl overflow-hidden"
                    style={{ width: canvasSize.width, height: canvasSize.height }}>

                    <canvas
                        ref={canvasRef}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        className="w-full h-full object-contain"
                    />

                    {/* Overlays */}
                    {uiState.status !== 'playing' && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
                            <h2 className={`text-3xl font-bold mb-2 ${uiState.status === 'landed' ? 'text-green-400' : uiState.status === 'crashed' ? 'text-red-400' : 'text-white'}`}>
                                {uiState.status === 'idle' ? 'COSMIC LANDER' :
                                    uiState.status === 'paused' ? 'PAUSED' :
                                        uiState.status === 'landed' ? 'MISSION ACCOMPLISHED' : 'CRASHED'}
                            </h2>

                            {uiState.message && <p className="text-lg text-gray-300 mb-6">{uiState.message}</p>}

                            <button
                                onClick={() => {
                                    gameAudio.init(); // Force audio context resume
                                    startGame();
                                }}
                                className="flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 font-bold hover:scale-105 transition-transform"
                            >
                                <Play size={20} />
                                {uiState.status === 'idle' ? 'Start Mission' : uiState.status === 'paused' ? 'Resume' : 'Try Again'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Mobile Controls */}
                <div className="sm:hidden mt-6 flex justify-between gap-4">
                    <button
                        className="flex-1 py-4 bg-white/10 rounded-xl active:bg-white/20 flex flex-col items-center justify-center gap-1 touch-none"
                        onTouchStart={(e) => { e.preventDefault(); inputsRef.current.left = true; }}
                        onTouchEnd={(e) => { e.preventDefault(); inputsRef.current.left = false; }}
                    >
                        <RotateCcwIcon /> Left
                    </button>

                    <button
                        className="flex-1 py-4 bg-purple-500/20 rounded-xl active:bg-purple-500/40 border border-purple-500/50 flex flex-col items-center justify-center gap-1 touch-none"
                        onTouchStart={(e) => { e.preventDefault(); inputsRef.current.thrust = true; }}
                        onTouchEnd={(e) => { e.preventDefault(); inputsRef.current.thrust = false; }}
                    >
                        <ChevronUp /> Thrust
                    </button>

                    <button
                        className="flex-1 py-4 bg-white/10 rounded-xl active:bg-white/20 flex flex-col items-center justify-center gap-1 touch-none"
                        onTouchStart={(e) => { e.preventDefault(); inputsRef.current.right = true; }}
                        onTouchEnd={(e) => { e.preventDefault(); inputsRef.current.right = false; }}
                    >
                        <RotateCw /> Right
                    </button>
                </div>

                <p className="text-center text-gray-500 text-sm mt-4 hidden sm:block">
                    Arrow Keys/WASD to Move • Space for Thrust • P for Pause
                </p>
            </div>

            <LeaderboardModal
                isOpen={showLeaderboard}
                onClose={() => setShowLeaderboard(false)}
                game="cosmic-lander"
                currentScore={uiState.score}
                onSubmitScore={() => uiState.status === 'landed' ? `Landed with ${uiState.fuel} fuel` : 'Crashed'}
            />
        </div>
    );
}

export default CosmicLander;
