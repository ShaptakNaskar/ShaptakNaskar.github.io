import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Volume2, VolumeX, Trophy, Disc, FileQuestion, Grid3X3, Layers, Rocket, Crosshair } from 'lucide-react';
import gameAudio from '../utils/audio';
import LeaderboardModal from './LeaderboardModal';

const games = [
    {
        id: 'paddles',
        name: 'Paddles',
        description: 'Classic paddle game with increasing difficulty',
        gradient: 'from-cyan-500 to-blue-600',
        Icon: Disc,
        path: '/games/paddles'
    },
    {
        id: 'wordguess',
        name: 'Word Guess',
        description: 'Guess the 6-letter word in 6 tries',
        gradient: 'from-purple-500 to-pink-600',
        Icon: FileQuestion,
        path: '/games/wordguess'
    },
    {
        id: '2048',
        name: '2048',
        description: 'Slide tiles and merge to reach 2048',
        gradient: 'from-orange-500 to-red-600',
        Icon: Grid3X3,
        path: '/games/2048'
    },
    {
        id: 'breakout',
        name: 'Breakout',
        description: 'Infinite levels of brick-breaking action',
        gradient: 'from-green-500 to-teal-600',
        Icon: Layers,
        path: '/games/breakout'
    },
    {
        id: 'cosmic-lander',
        name: 'Cosmic Lander',
        description: 'Navigate gravity and land safely',
        gradient: 'from-purple-500 to-indigo-600',
        Icon: Rocket,
        path: '/games/cosmic-lander'
    },
    {
        id: 'space-defender',
        name: 'Space Defender',
        description: 'Defend the cosmos from alien waves',
        gradient: 'from-blue-600 to-cyan-500',
        Icon: Crosshair,
        path: '/games/space-defender'
    }
];

function Games() {
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [selectedGame, setSelectedGame] = useState(null);

    useEffect(() => {
        gameAudio.init();
    }, []);

    const toggleAudio = () => {
        const enabled = gameAudio.toggle();
        setAudioEnabled(enabled);
        if (enabled) {
            gameAudio.play('click');
        }
    };

    const openLeaderboard = (gameId, e) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedGame(gameId);
        setShowLeaderboard(true);
    };

    return (
        <div className="space-y-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        to="/"
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft size={24} className="text-gray-400" />
                    </Link>
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl sm:text-4xl font-bold"
                        >
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-purple-600 dark:from-primary dark:to-white">
                                Game Arcade
                            </span>
                        </motion.h1>
                        <p className="text-gray-500 mt-1 text-sm sm:text-base">Choose a game and compete for the leaderboard!</p>
                    </div>
                </div>

                {/* Audio toggle */}
                <button
                    onClick={toggleAudio}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${audioEnabled
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                        }`}
                >
                    {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    <span className="text-sm font-medium hidden sm:inline">
                        {audioEnabled ? 'Sound On' : 'Sound Off'}
                    </span>
                </button>
            </div>

            {/* Games Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {games.map((game, index) => (
                    <motion.div
                        key={game.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Link
                            to={game.path}
                            className="group block glass-panel rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 border border-transparent hover:border-primary/30"
                        >
                            {/* Game icon */}
                            <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${game.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                <game.Icon size={32} className="text-white" />
                            </div>

                            {/* Game info */}
                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">
                                {game.name}
                            </h3>
                            <p className="text-gray-400 text-sm mb-4">
                                {game.description}
                            </p>

                            {/* Play button and Leaderboard */}
                            <div className="flex items-center justify-between">
                                <span className="text-primary font-medium text-sm group-hover:translate-x-2 transition-transform inline-flex items-center gap-1">
                                    Play Now
                                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                                </span>
                                <button
                                    onClick={(e) => openLeaderboard(game.id, e)}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-primary/20 text-gray-400 hover:text-primary transition-all text-xs font-medium"
                                >
                                    <Trophy size={14} />
                                    <span className="hidden sm:inline">Leaderboard</span>
                                </button>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>

            {/* Mobile touch hint */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center text-gray-500 text-sm sm:hidden"
            >
                All games support touch controls
            </motion.p>

            {/* Leaderboard Modal */}
            <LeaderboardModal
                isOpen={showLeaderboard}
                onClose={() => setShowLeaderboard(false)}
                game={selectedGame}
            />
        </div>
    );
}

export default Games;
