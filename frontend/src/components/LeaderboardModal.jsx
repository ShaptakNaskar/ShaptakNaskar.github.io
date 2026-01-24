import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, Crown, Medal, Award } from 'lucide-react';

const rankIcons = [
    <Crown className="text-yellow-400" size={20} />,
    <Medal className="text-gray-300" size={20} />,
    <Award className="text-amber-600" size={20} />,
    <span className="text-gray-400 font-bold">4</span>,
    <span className="text-gray-400 font-bold">5</span>,
];

function LeaderboardModal({ isOpen, onClose, game, currentScore, onSubmitScore }) {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [playerName, setPlayerName] = useState('');
    const [qualifies, setQualifies] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && game) {
            fetchLeaderboard();
        }
    }, [isOpen, game]);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/leaderboard/${game}`);
            const data = await res.json();

            if (Array.isArray(data)) {
                setLeaderboard(data);

                // Check if current score qualifies
                if (currentScore !== undefined && currentScore !== null) {
                    const qualifiesForTop5 = data.length < 5 || currentScore > data[data.length - 1]?.score;
                    setQualifies(qualifiesForTop5);
                }
            } else {
                setLeaderboard([]);
                console.error('Leaderboard data is not an array:', data);
            }
        } catch (err) {
            console.error('Failed to fetch leaderboard:', err);
            setError('Failed to load leaderboard');
        }
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!playerName.trim() || submitted) return;

        try {
            const res = await fetch('/api/leaderboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    game,
                    playerName: playerName.trim(),
                    score: currentScore,
                    achievement: onSubmitScore?.() || ''
                })
            });

            const data = await res.json();
            if (data.qualified) {
                setSubmitted(true);
                fetchLeaderboard(); // Refresh to show new score
            }
        } catch (err) {
            setError('Failed to submit score');
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const gameNames = {
        paddles: 'Paddles',
        wordguess: 'Word Guess',
        '2048': '2048',
        breakout: 'Breakout',
        'cosmic-lander': 'Cosmic Lander',
        'space-defender': 'Space Defender'
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="relative w-full max-w-md glass-panel rounded-2xl p-6"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <X size={20} className="text-gray-400" />
                        </button>

                        {/* Header */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20">
                                <Trophy className="text-primary" size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{gameNames[game]} Leaderboard</h2>
                                {currentScore !== undefined && (
                                    <p className="text-sm text-gray-400">Your score: <span className="text-primary font-mono">{currentScore}</span></p>
                                )}
                            </div>
                        </div>

                        {/* Qualifying score input */}
                        {qualifies && !submitted && currentScore !== undefined && (
                            <motion.form
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                onSubmit={handleSubmit}
                                className="mb-6 p-4 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/30"
                            >
                                <p className="text-sm text-primary mb-3 font-medium">🎉 You made the top 5! Enter your name:</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={playerName}
                                        onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
                                        placeholder="Your name"
                                        maxLength={20}
                                        className="flex-1 px-4 py-2 rounded-lg bg-dark/50 border border-glass-border text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                                        autoFocus
                                    />
                                    <button
                                        type="submit"
                                        disabled={!playerName.trim()}
                                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-dark font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
                                    >
                                        Save
                                    </button>
                                </div>
                            </motion.form>
                        )}

                        {submitted && (
                            <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                                ✓ Score saved successfully!
                            </div>
                        )}

                        {/* Leaderboard table */}
                        {loading ? (
                            <div className="text-center py-8 text-gray-400">Loading...</div>
                        ) : error ? (
                            <div className="text-center py-8 text-red-400">{error}</div>
                        ) : leaderboard.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                No scores yet. Be the first!
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {leaderboard.map((entry, index) => (
                                    <motion.div
                                        key={entry._id || index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className={`flex items-center gap-4 p-3 rounded-xl ${index === 0 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-white/5'
                                            }`}
                                    >
                                        <div className="w-8 h-8 flex items-center justify-center">
                                            {rankIcons[index]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-white truncate">{entry.playerName}</p>
                                            <p className="text-xs text-gray-500">
                                                {entry.achievement || formatDate(entry.createdAt)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-mono font-bold text-primary">{entry.score.toLocaleString()}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Play again button */}
                        <button
                            onClick={onClose}
                            className="w-full mt-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                        >
                            {currentScore !== undefined ? 'Play Again' : 'Close'}
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default LeaderboardModal;
