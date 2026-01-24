import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Volume2, VolumeX, Trophy } from 'lucide-react';
import gameAudio from '../../utils/audio';
import LeaderboardModal from '../LeaderboardModal';

const SIZE = 4;
const TILE_COLORS = {
    2: 'bg-gray-200 text-gray-800',
    4: 'bg-gray-300 text-gray-800',
    8: 'bg-orange-300 text-white',
    16: 'bg-orange-400 text-white',
    32: 'bg-orange-500 text-white',
    64: 'bg-orange-600 text-white',
    128: 'bg-yellow-400 text-white',
    256: 'bg-yellow-500 text-white',
    512: 'bg-yellow-600 text-white',
    1024: 'bg-cyan-400 text-gray-900',
    2048: 'bg-cyan-500 text-gray-900',
    4096: 'bg-purple-500 text-white',
    8192: 'bg-purple-600 text-white',
};

const createEmptyGrid = () => Array(SIZE).fill(null).map(() => Array(SIZE).fill(0));

const addRandomTile = (grid) => {
    const emptyCells = [];
    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {
            if (grid[i][j] === 0) emptyCells.push({ row: i, col: j });
        }
    }
    if (emptyCells.length === 0) return grid;

    const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const newGrid = grid.map(r => [...r]);
    newGrid[row][col] = Math.random() < 0.9 ? 2 : 4;
    return newGrid;
};

const slideRow = (row) => {
    const nonEmpty = row.filter(x => x !== 0);
    const merged = [];
    let score = 0;

    for (let i = 0; i < nonEmpty.length; i++) {
        if (i + 1 < nonEmpty.length && nonEmpty[i] === nonEmpty[i + 1]) {
            const newVal = nonEmpty[i] * 2;
            merged.push(newVal);
            score += newVal;
            i++;
        } else {
            merged.push(nonEmpty[i]);
        }
    }

    while (merged.length < SIZE) merged.push(0);
    return { row: merged, score };
};

const rotateGrid = (grid, times = 1) => {
    let result = grid;
    for (let t = 0; t < times; t++) {
        const newGrid = createEmptyGrid();
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE; j++) {
                newGrid[j][SIZE - 1 - i] = result[i][j];
            }
        }
        result = newGrid;
    }
    return result;
};

function Game2048() {
    const [grid, setGrid] = useState(() => addRandomTile(addRandomTile(createEmptyGrid())));
    const [score, setScore] = useState(0);
    const [bestTile, setBestTile] = useState(2);
    const [gameStatus, setGameStatus] = useState('playing');
    const [audioEnabled, setAudioEnabled] = useState(!gameAudio.isMuted());
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [viewingLeaderboard, setViewingLeaderboard] = useState(false);
    const [hasWon, setHasWon] = useState(false);

    const checkGameOver = useCallback((g) => {
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE; j++) {
                if (g[i][j] === 0) return false;
            }
        }
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE; j++) {
                if (j + 1 < SIZE && g[i][j] === g[i][j + 1]) return false;
                if (i + 1 < SIZE && g[i][j] === g[i + 1][j]) return false;
            }
        }
        return true;
    }, []);

    const move = useCallback((direction) => {
        if (gameStatus !== 'playing') return;

        const rotations = { left: 0, up: 3, right: 2, down: 1 };
        let rotated = rotateGrid(grid, rotations[direction]);

        let totalScore = 0;
        let moved = false;
        const newGrid = rotated.map(row => {
            const { row: newRow, score: rowScore } = slideRow(row);
            if (JSON.stringify(row) !== JSON.stringify(newRow)) moved = true;
            totalScore += rowScore;
            return newRow;
        });

        if (!moved) return;

        const finalGrid = rotateGrid(newGrid, (4 - rotations[direction]) % 4);
        const withNewTile = addRandomTile(finalGrid);

        setGrid(withNewTile);
        setScore(s => s + totalScore);

        let maxTile = 0;
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE; j++) {
                maxTile = Math.max(maxTile, withNewTile[i][j]);
            }
        }
        setBestTile(Math.max(bestTile, maxTile));

        if (totalScore > 0) {
            gameAudio.play('merge');
        }

        if (maxTile >= 2048 && !hasWon) {
            setHasWon(true);
            gameAudio.play('win');
        }

        if (checkGameOver(withNewTile)) {
            setGameStatus('lost');
            gameAudio.play('gameOver');
            setShowLeaderboard(true);
        }
    }, [grid, gameStatus, bestTile, hasWon, checkGameOver]);

    // Handle keyboard input
    const handleKeyDown = useCallback((e) => {
        const keyMap = {
            ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
            a: 'left', d: 'right', w: 'up', s: 'down'
        };
        if (keyMap[e.key]) {
            e.preventDefault();
            move(keyMap[e.key]);
        }
    }, [move]);

    // Handle touch swipe
    const [touchStart, setTouchStart] = useState(null);

    const handleTouchStart = (e) => {
        const touch = e.touches[0];
        setTouchStart({ x: touch.clientX, y: touch.clientY });
    };

    const handleTouchEnd = (e) => {
        if (!touchStart) return;
        const touch = e.changedTouches[0];
        const dx = touch.clientX - touchStart.x;
        const dy = touch.clientY - touchStart.y;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (Math.max(absDx, absDy) > 30) {
            if (absDx > absDy) {
                move(dx > 0 ? 'right' : 'left');
            } else {
                move(dy > 0 ? 'down' : 'up');
            }
        }
        setTouchStart(null);
    };

    useEffect(() => {
        gameAudio.reset();
        const unsubscribe = gameAudio.subscribe((muted) => {
            setAudioEnabled(!muted);
        });
        return unsubscribe;
    }, []);

    // Add event listener for keyboard
    React.useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const startGame = () => {
        gameAudio.init();
        gameAudio.resume();
        setGrid(addRandomTile(addRandomTile(createEmptyGrid())));
        setScore(0);
        setBestTile(2);
        setGameStatus('playing');
        setHasWon(false);
    };

    const toggleAudio = () => {
        gameAudio.toggle();
        gameAudio.resume();
        if (!gameAudio.isMuted()) gameAudio.play('click');
    };

    const getAchievement = () => `Best tile: ${bestTile}`;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/games" className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        <ArrowLeft size={24} className="text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white">2048</h1>
                        <p className="text-gray-500 text-sm">Merge tiles to reach 2048!</p>
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
                    <button
                        onClick={startGame}
                        className="p-2 rounded-lg bg-white/10 text-gray-400 hover:bg-white/20 transition-colors"
                    >
                        <RotateCcw size={20} />
                    </button>
                </div>
            </div>

            {/* Game container - NO Framer Motion */}
            <div className="glass-panel rounded-2xl p-4 sm:p-6">
                {/* Score display */}
                <div className="flex justify-center gap-6 mb-6">
                    <div className="text-center px-6 py-2 rounded-xl bg-white/10">
                        <p className="text-xs text-gray-500 uppercase">Score</p>
                        <p className="text-2xl font-bold font-mono text-primary">{score.toLocaleString()}</p>
                    </div>
                    <div className="text-center px-6 py-2 rounded-xl bg-white/10">
                        <p className="text-xs text-gray-500 uppercase">Best Tile</p>
                        <p className="text-2xl font-bold font-mono text-secondary">{bestTile}</p>
                    </div>
                </div>

                {/* Won badge */}
                {hasWon && (
                    <div className="text-center mb-4 p-3 rounded-xl bg-primary/20 text-primary font-bold">
                        🎉 You reached 2048! Keep going for a higher score!
                    </div>
                )}

                {/* Grid - Simple CSS, no Framer Motion */}
                <div
                    className="relative mx-auto rounded-xl bg-dark/50 p-2 sm:p-3 touch-none select-none"
                    style={{ width: 'fit-content', maxWidth: '100%' }}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    <div
                        className="grid gap-2 sm:gap-3"
                        style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(60px, 80px))` }}
                    >
                        {grid.map((row, i) =>
                            row.map((cell, j) => (
                                <div
                                    key={`${i}-${j}`}
                                    className={`aspect-square rounded-lg flex items-center justify-center font-bold text-lg sm:text-2xl transition-colors duration-100 ${cell ? TILE_COLORS[cell] || 'bg-purple-700 text-white' : 'bg-white/5'
                                        }`}
                                >
                                    {cell > 0 && cell}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Game over overlay */}
                    {gameStatus === 'lost' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark/80 rounded-xl">
                            <p className="text-2xl font-bold text-white mb-4">Game Over!</p>
                            <button
                                onClick={startGame}
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-dark font-bold"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>

                {/* Controls hint */}
                <p className="text-center text-gray-500 text-sm mt-4">
                    <span className="hidden sm:inline">Use Arrow Keys or WASD to move</span>
                    <span className="sm:hidden">Swipe to move tiles</span>
                </p>
            </div>

            <LeaderboardModal
                isOpen={showLeaderboard}
                onClose={() => setShowLeaderboard(false)}
                game="2048"
                currentScore={score}
                onSubmitScore={getAchievement}
            />
            <LeaderboardModal
                isOpen={viewingLeaderboard}
                onClose={() => setViewingLeaderboard(false)}
                game="2048"
            />
        </div>
    );
}

export default Game2048;
