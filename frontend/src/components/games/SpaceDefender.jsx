import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Trophy, Crosshair, Zap, Skull } from 'lucide-react';
import gameAudio from '../../utils/audio';
import LeaderboardModal from '../LeaderboardModal';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;
const PLAYER_SPEED = 5;
const LASER_SPEED = 12;
const ENEMY_SPEED = 3;
const SPAWN_RATE_INITIAL = 60; // Frames

function SpaceDefender() {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const lastFrameTimeRef = useRef(0);

    // Refs for mutable game state avoids re-renders
    const gameStateRef = useRef({
        player: { x: 50, y: CANVAS_HEIGHT / 2, w: 40, h: 20, vy: 0, hp: 3 },
        lasers: [],
        enemies: [],
        particles: [],
        stars: [],
        score: 0,
        frameCount: 0,
        status: 'idle', // idle, playing, paused, gameOver
        spawnRate: SPAWN_RATE_INITIAL
    });

    const inputsRef = useRef({
        up: false,
        down: false,
        left: false,
        right: false,
        shoot: false
    });

    const [uiState, setUiState] = useState({
        score: 0,
        hp: 3,
        status: 'idle'
    });

    const [audioEnabled, setAudioEnabled] = useState(!gameAudio.isMuted());
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

    // Initialize Stars
    const initStars = () => {
        const stars = [];
        for (let i = 0; i < 100; i++) {
            stars.push({
                x: Math.random() * CANVAS_WIDTH,
                y: Math.random() * CANVAS_HEIGHT,
                speed: Math.random() * 2 + 0.5,
                size: Math.random() < 0.9 ? 1 : 2
            });
        }
        return stars;
    };

    const resetGame = () => {
        const state = gameStateRef.current;
        state.player = { x: 50, y: CANVAS_HEIGHT / 2, w: 40, h: 20, vy: 0, hp: 3 };
        state.lasers = [];
        state.enemies = [];
        state.particles = [];
        state.stars = initStars();
        state.score = 0;
        state.frameCount = 0;
        state.status = 'playing';
        state.spawnRate = SPAWN_RATE_INITIAL;

        setUiState({ score: 0, hp: 3, status: 'playing' });
    };

    const spawnEnemy = () => {
        const state = gameStateRef.current;
        const type = Math.random();
        let enemy = {
            x: CANVAS_WIDTH + 50,
            y: Math.random() * (CANVAS_HEIGHT - 40) + 20,
            w: 30,
            h: 30,
            vx: -ENEMY_SPEED - Math.random() * 2,
            vy: (Math.random() - 0.5) * 2, // Slight sine wave movement
            hp: 1,
            color: '#ff4444',
            score: 100
        };

        // Tougher enemy
        if (state.score > 500 && type > 0.8) {
            enemy.w = 40;
            enemy.h = 40;
            enemy.hp = 3;
            enemy.vx = -ENEMY_SPEED * 0.8;
            enemy.color = '#ffaa00';
            enemy.score = 300;
        }

        // Fast enemy
        if (state.score > 1000 && type < 0.2) {
            enemy.w = 20;
            enemy.h = 10;
            enemy.hp = 1;
            enemy.vx = -ENEMY_SPEED * 2;
            enemy.vy = Math.sin(state.frameCount * 0.1) * 3;
            enemy.color = '#00ffff';
            enemy.score = 200;
        }

        state.enemies.push(enemy);
    };

    const createExplosion = (x, y, color, count = 10) => {
        const state = gameStateRef.current;
        for (let i = 0; i < count; i++) {
            state.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.0,
                color: color,
                decay: 0.05 + Math.random() * 0.05
            });
        }
    };

    const drawAlien = (ctx, x, y, width, height, color, type) => {
        ctx.fillStyle = color;
        ctx.save();
        ctx.translate(x, y);

        if (type === 'basic') {
            // Invader shape
            ctx.beginPath();
            const w = width / 2;
            const h = height / 2;
            ctx.moveTo(-w, -h / 2);
            ctx.lineTo(-w + w / 3, -h);
            ctx.lineTo(w - w / 3, -h);
            ctx.lineTo(w, -h / 2);
            ctx.lineTo(w, h / 2);
            ctx.lineTo(w / 2, h);
            ctx.lineTo(-w / 2, h);
            ctx.lineTo(-w, h / 2);
            ctx.closePath();
            ctx.fill();

            // Eyes
            ctx.fillStyle = '#000';
            ctx.fillRect(-w / 2, -h / 4, w / 3, h / 3);
            ctx.fillRect(w / 6, -h / 4, w / 3, h / 3);
        } else if (type === 'tough') {
            // Heavy cruiser
            ctx.beginPath();
            const w = width / 2;
            const h = height / 2;
            ctx.moveTo(-w, 0);
            ctx.lineTo(-w / 2, -h);
            ctx.lineTo(w / 2, -h);
            ctx.lineTo(w, 0);
            ctx.lineTo(w / 2, h);
            ctx.lineTo(-w / 2, h);
            ctx.closePath();
            ctx.fill();

            // Cockpit
            ctx.fillStyle = '#330000';
            ctx.beginPath();
            ctx.arc(0, 0, w / 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (type === 'fast') {
            // Dart
            ctx.beginPath();
            const w = width / 2;
            const h = height / 2;
            ctx.moveTo(w, 0);
            ctx.lineTo(-w, -h);
            ctx.lineTo(-w / 2, 0);
            ctx.lineTo(-w, h);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    };

    const gameLoop = useCallback((currentTime) => {
        if (!canvasRef.current || gameStateRef.current.status === 'paused') return;
        const ctx = canvasRef.current.getContext('2d');
        const state = gameStateRef.current;

        if (state.status === 'playing') {
            state.frameCount++;

            // Input Handling
            if (inputsRef.current.up) state.player.y -= PLAYER_SPEED;
            if (inputsRef.current.down) state.player.y += PLAYER_SPEED;
            if (inputsRef.current.left) state.player.x -= PLAYER_SPEED;
            if (inputsRef.current.right) state.player.x += PLAYER_SPEED;

            // Bounds
            state.player.y = Math.max(state.player.h, Math.min(CANVAS_HEIGHT - state.player.h, state.player.y));
            state.player.x = Math.max(0, Math.min(CANVAS_WIDTH / 2, state.player.x));

            // Shooting
            if (inputsRef.current.shoot && state.frameCount % 10 === 0) {
                state.lasers.push({
                    x: state.player.x + state.player.w,
                    y: state.player.y,
                    w: 15,
                    h: 4,
                    vx: LASER_SPEED,
                    color: '#00ffaa'
                });
                gameAudio.play('laser');
            }

            // Update Stars
            state.stars.forEach(star => {
                star.x -= star.speed;
                if (star.x < 0) {
                    star.x = CANVAS_WIDTH;
                    star.y = Math.random() * CANVAS_HEIGHT;
                }
            });

            // Update Lasers
            for (let i = state.lasers.length - 1; i >= 0; i--) {
                const laser = state.lasers[i];
                laser.x += laser.vx;
                if (laser.x > CANVAS_WIDTH) {
                    state.lasers.splice(i, 1);
                    continue;
                }

                // Collision with enemies
                for (let j = state.enemies.length - 1; j >= 0; j--) {
                    const enemy = state.enemies[j];
                    if (
                        laser.x < enemy.x + enemy.w &&
                        laser.x + laser.w > enemy.x - enemy.w / 2 &&
                        laser.y < enemy.y + enemy.h / 2 &&
                        laser.y + laser.h > enemy.y - enemy.h / 2
                    ) {
                        enemy.hp--;
                        state.lasers.splice(i, 1); // Remove laser
                        createExplosion(laser.x, laser.y, '#fff', 3);
                        gameAudio.play('bounce'); // Use bounce as hit sound for now

                        if (enemy.hp <= 0) {
                            createExplosion(enemy.x, enemy.y, enemy.color, 15);
                            state.score += enemy.score;
                            state.enemies.splice(j, 1);
                            gameAudio.play('score'); // Kill sound
                        }
                        break;
                    }
                }
            }

            // Spawning
            if (state.frameCount % Math.max(20, Math.floor(state.spawnRate - state.score / 100)) === 0) {
                spawnEnemy();
            }

            // Update Enemies
            for (let i = state.enemies.length - 1; i >= 0; i--) {
                const enemy = state.enemies[i];
                enemy.x += enemy.vx;
                enemy.y += enemy.vy || 0;

                // Player Collision
                if (
                    state.player.x + state.player.w / 2 > enemy.x - enemy.w / 2 &&
                    state.player.x - state.player.w / 2 < enemy.x + enemy.w / 2 &&
                    state.player.y + state.player.h / 2 > enemy.y - enemy.h / 2 &&
                    state.player.y - state.player.h / 2 < enemy.y + enemy.h / 2
                ) {
                    state.player.hp--;
                    createExplosion(state.player.x, state.player.y, '#ff0000', 20);
                    state.enemies.splice(i, 1);
                    gameAudio.play('wrong');

                    if (state.player.hp <= 0) {
                        state.status = 'gameOver';
                        gameAudio.play('gameOver');
                        setUiState({ ...uiState, status: 'gameOver', score: state.score });
                        setShowLeaderboard(true);
                    }
                    continue; // Enemy gone
                }

                if (enemy.x < -50) {
                    state.enemies.splice(i, 1);
                }
            }

            // Update Particles
            for (let i = state.particles.length - 1; i >= 0; i--) {
                const p = state.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life -= p.decay;
                if (p.life <= 0) state.particles.splice(i, 1);
            }

            // Update UI Score occasionally
            if (state.frameCount % 30 === 0) {
                setUiState(prev => ({ ...prev, score: state.score, hp: state.player.hp }));
            }
        }

        // DRAWING
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw Stars
        ctx.fillStyle = '#ffffff';
        state.stars.forEach(star => {
            ctx.globalAlpha = Math.random() * 0.5 + 0.5;
            ctx.fillRect(star.x, star.y, star.size, star.size);
        });
        ctx.globalAlpha = 1;

        // Draw Player
        if (state.status !== 'gameOver' || Math.floor(currentTime / 100) % 2 === 0) {
            ctx.fillStyle = '#00f0ff';
            ctx.beginPath();
            ctx.moveTo(state.player.x + state.player.w / 2, state.player.y);
            ctx.lineTo(state.player.x - state.player.w / 2, state.player.y - state.player.h / 2);
            ctx.lineTo(state.player.x - state.player.w / 2 + 5, state.player.y);
            ctx.lineTo(state.player.x - state.player.w / 2, state.player.y + state.player.h / 2);
            ctx.fill();

            // Engine flame
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath();
            ctx.moveTo(state.player.x - state.player.w / 2, state.player.y - 5);
            ctx.lineTo(state.player.x - state.player.w / 2 - 15 - Math.random() * 10, state.player.y);
            ctx.lineTo(state.player.x - state.player.w / 2, state.player.y + 5);
            ctx.fill();
        }

        // Draw Lasers
        state.lasers.forEach(laser => {
            ctx.fillStyle = laser.color;
            ctx.fillRect(laser.x, laser.y - laser.h / 2, laser.w, laser.h);
            // Glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = laser.color;
            ctx.fillRect(laser.x, laser.y - laser.h / 2, laser.w, laser.h);
            ctx.shadowBlur = 0;
        });

        // Draw Enemies
        state.enemies.forEach(enemy => {
            // Determine type based on props (simplified check)
            let type = 'basic';
            if (enemy.hp === 3) type = 'tough';
            if (enemy.hp === 1 && enemy.w < 25) type = 'fast';

            drawAlien(ctx, enemy.x, enemy.y, enemy.w, enemy.h, enemy.color, type);
        });

        // Draw Particles
        state.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, 3, 3);
        });
        ctx.globalAlpha = 1;

        animationRef.current = requestAnimationFrame(gameLoop);
    }, [uiState.status]);

    // Resize
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

    // Audio subscription
    useEffect(() => {
        const unsubscribe = gameAudio.subscribe((muted) => {
            setAudioEnabled(!muted);
        });
        return unsubscribe;
    }, []);

    // Inputs
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.repeat && e.key !== ' ') return;
            switch (e.key) {
                case 'ArrowUp':
                case 'w': inputsRef.current.up = true; break;
                case 'ArrowDown':
                case 's': inputsRef.current.down = true; break;
                case 'ArrowLeft':
                case 'a': inputsRef.current.left = true; break;
                case 'ArrowRight':
                case 'd': inputsRef.current.right = true; break;
                case ' ': inputsRef.current.shoot = true; break;
                case 'Escape':
                    if (gameStateRef.current.status === 'playing') setUiState(p => ({ ...p, status: 'paused' }));
                    break;
            }
        };
        const handleKeyUp = (e) => {
            switch (e.key) {
                case 'ArrowUp':
                case 'w': inputsRef.current.up = false; break;
                case 'ArrowDown':
                case 's': inputsRef.current.down = false; break;
                case 'ArrowLeft':
                case 'a': inputsRef.current.left = false; break;
                case 'ArrowRight':
                case 'd': inputsRef.current.right = false; break;
                case ' ': inputsRef.current.shoot = false; break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);


    // Initial Start
    useEffect(() => {
        gameStateRef.current.stars = initStars();
        animationRef.current = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(animationRef.current);
    }, [gameLoop]);

    const handleStart = () => {
        gameAudio.init();
        gameAudio.resume();
        if (gameStateRef.current.status !== 'playing') {
            if (gameStateRef.current.status === 'gameOver' || gameStateRef.current.status === 'idle') {
                resetGame();
            } else {
                gameStateRef.current.status = 'playing';
                setUiState(p => ({ ...p, status: 'playing' }));
            }
        }
    };


    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/games" className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        <ArrowLeft size={24} className="text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                            <Crosshair className="text-blue-500" /> Space Defender
                        </h1>
                        <p className="text-gray-500 text-sm">Defend your sector from the alien waves!</p>
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
                    <div className="bg-white/10 px-4 py-2 rounded-lg flex items-center gap-4">
                        <div className="flex items-center gap-1 text-red-400">
                            <Zap size={16} fill="currentColor" />
                            <span>{uiState.hp}</span>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-400">
                            <Trophy size={16} />
                            <span className="font-mono font-bold text-xl">{uiState.score}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowLeaderboard(true)}
                        className="p-2 rounded-lg bg-white/10 text-gray-400 hover:bg-primary/20 hover:text-primary transition-colors"
                    >
                        <Trophy size={20} />
                    </button>
                </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 sm:p-6">
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
                            <h2 className={`text-4xl font-bold mb-2 ${uiState.status === 'gameOver' ? 'text-red-500' : 'text-blue-400'}`}>
                                {uiState.status === 'idle' ? 'SPACE DEFENDER' :
                                    uiState.status === 'paused' ? 'SYSTEM PAUSED' :
                                        'MISSION FAILED'}
                            </h2>

                            {uiState.status === 'gameOver' && (
                                <p className="text-xl text-white mb-6">Final Score: {uiState.score}</p>
                            )}

                            <button
                                onClick={handleStart}
                                className="flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 font-bold hover:scale-105 transition-transform"
                            >
                                <Play size={20} />
                                {uiState.status === 'idle' ? 'Launch Ship' : uiState.status === 'paused' ? 'Resume' : 'Re-Deploy'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Mobile Controls */}
                <div className="sm:hidden mt-6 grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-xl p-4 h-32 relative touch-none">
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500 pointer-events-none">D-Pad</div>
                        {/* Implementing a simple invisible touch pad for movement */}
                        <div className="absolute inset-0 z-10"
                            onTouchStart={(e) => {
                                // Simple logic: touch top/btm/left/right of box
                                const r = e.target.getBoundingClientRect();
                                const t = e.touches[0];
                                const x = t.clientX - r.left;
                                const y = t.clientY - r.top;
                                if (y < r.height / 3) inputsRef.current.up = true;
                                if (y > r.height * 2 / 3) inputsRef.current.down = true;
                                if (x < r.width / 3) inputsRef.current.left = true;
                                if (x > r.width * 2 / 3) inputsRef.current.right = true;
                            }}
                            onTouchEnd={() => {
                                inputsRef.current.up = false;
                                inputsRef.current.down = false;
                                inputsRef.current.left = false;
                                inputsRef.current.right = false;
                            }}
                        ></div>
                    </div>
                    <button
                        className="bg-red-500/20 border border-red-500/50 rounded-xl flex items-center justify-center active:bg-red-500/40 touch-none"
                        onTouchStart={(e) => { e.preventDefault(); inputsRef.current.shoot = true; }}
                        onTouchEnd={(e) => { e.preventDefault(); inputsRef.current.shoot = false; }}
                    >
                        <Crosshair size={32} className="text-red-400" />
                    </button>
                </div>

                <div className="text-center text-gray-500 text-sm mt-4 hidden sm:flex justify-center gap-8">
                    <span className="flex items-center gap-2"><div className="w-4 h-4 border border-gray-500 rounded flex items-center justify-center text-[10px]">W</div> Move</span>
                    <span className="flex items-center gap-2"><div className="w-12 h-4 border border-gray-500 rounded flex items-center justify-center text-[10px]">SPACE</div> Shoot</span>
                </div>
            </div>

            <LeaderboardModal
                isOpen={showLeaderboard}
                onClose={() => setShowLeaderboard(false)}
                game="space-defender"
                currentScore={uiState.score}
                onSubmitScore={() => `Wave Survivor - Score ${uiState.score}`}
            />
        </div>
    );
}

export default SpaceDefender;
