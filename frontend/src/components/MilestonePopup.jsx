import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy } from 'lucide-react';
import ReactConfetti from 'react-confetti';

const MilestonePopup = ({ isOpen, onClose, hitCount }) => {
    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!isOpen) return null;

    const isEasterEgg = hitCount >= 10000000000;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <ReactConfetti
                        width={windowSize.width}
                        height={windowSize.height}
                        recycle={true}
                        numberOfPieces={isEasterEgg ? 400 : 100}
                    />

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, y: 100 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.5, opacity: 0, y: 100 }}
                        className="relative bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-teal-500/20 z-10 text-center overflow-hidden"
                    >
                        {/* Background Glow */}
                        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                            <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-to-br from-teal-500/10 via-purple-500/10 to-pink-500/10 animate-spin-slow" />
                        </div>

                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>

                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", delay: 0.2 }}
                            className="w-20 h-20 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg"
                        >
                            <Trophy className="w-10 h-10 text-white" />
                        </motion.div>

                        <h2 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-purple-600 dark:from-teal-400 dark:to-purple-400">
                            {isEasterEgg ? "LEGENDARY STATUS!" : "Congratulations!"}
                        </h2>

                        <p className="text-gray-600 dark:text-gray-300 mb-6 text-lg">
                            {isEasterEgg ? (
                                <span>
                                    You are the <span className="font-bold text-yellow-500">10 Billionth</span> visitor!
                                    <br />
                                    The universe has aligned for this moment.
                                </span>
                            ) : (
                                <span>
                                    You are the <span className="font-bold text-primary">{hitCount?.toLocaleString()}th</span> visitor!
                                    <br />
                                    Thanks for stopping by!
                                </span>
                            )}
                        </p>

                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-gradient-to-r from-teal-500 to-purple-600 text-white rounded-full font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
                        >
                            Awesome!
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default MilestonePopup;
