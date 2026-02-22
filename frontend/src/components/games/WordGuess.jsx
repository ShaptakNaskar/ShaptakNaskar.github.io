import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Volume2, VolumeX, Trophy, HelpCircle, Delete, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import gameAudio from '../../utils/audio';
import LeaderboardModal from '../LeaderboardModal';

const WORD_LENGTH = 6;
const MAX_GUESSES = 6;
const MIN_DATAMUSE_SCORE = 50000;
const FALLBACK_WORDS = [
    { word: 'PLANET', hint: 'A large round object that moves around a star.' },
    { word: 'ROCKET', hint: 'A vehicle designed to travel using powerful thrust.' },
    { word: 'SYSTEM', hint: 'A set of connected parts working together.' },
    { word: 'CODING', hint: 'The activity of writing instructions for computers.' },
    { word: 'SERVER', hint: 'A computer that provides data or services to others.' },
    { word: 'SCRIPT', hint: 'A small program used to automate tasks.' },
    { word: 'DESIGN', hint: 'The process of planning how something should look or work.' }
];

const getMeaningHint = (wordEntry, fallbackWord) => {
    if (Array.isArray(wordEntry?.defs) && wordEntry.defs.length > 0) {
        const meaning = wordEntry.defs[0].split('\t').slice(1).join(' ').trim();
        if (meaning) return meaning;
    }
    return `Starts with ${fallbackWord[0]} and ends with ${fallbackWord[fallbackWord.length - 1]}.`;
};

function WordGuess() {
    const [targetWord, setTargetWord] = useState('');
    const [guesses, setGuesses] = useState([]);
    const [currentGuess, setCurrentGuess] = useState('');
    const [gameStatus, setGameStatus] = useState('loading'); // loading, playing, won, lost
    const [message, setMessage] = useState('');
    const [audioEnabled, setAudioEnabled] = useState(!gameAudio.isMuted());
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [viewingLeaderboard, setViewingLeaderboard] = useState(false);
    const [score, setScore] = useState(0);
    const [canRestart, setCanRestart] = useState(true);
    const [wordHint, setWordHint] = useState('');

    // Fetch a 6-letter word
    const fetchWord = useCallback(async () => {
        setGameStatus('loading');
        try {
            // Fetch 6-letter words plus definitions from Datamuse
            const res = await fetch('https://api.datamuse.com/words?sp=??????&md=d&max=1000');
            const data = await res.json();

            const commonWords = data.filter((entry) => (
                typeof entry.word === 'string'
                && /^[a-z]{6}$/.test(entry.word)
                && (entry.score ?? 0) >= MIN_DATAMUSE_SCORE
            ));

            const candidateWords = commonWords.length > 0
                ? commonWords
                : data.filter((entry) => (
                    typeof entry.word === 'string'
                    && /^[a-z]{6}$/.test(entry.word)
                    && (entry.score ?? 0) >= 400
                ));

            if (candidateWords.length > 0) {
                const selectedWord = candidateWords[Math.floor(Math.random() * candidateWords.length)];
                const randomWord = selectedWord.word.toUpperCase();
                if (/^[A-Z]{6}$/.test(randomWord)) {
                    setTargetWord(randomWord);
                    setWordHint(getMeaningHint(selectedWord, randomWord));
                    setGameStatus('playing');
                    return;
                }
            }
            throw new Error('No valid word found');
        } catch (err) {
            console.error('Failed to fetch word:', err);
            // Fallback words
            const fallback = FALLBACK_WORDS[Math.floor(Math.random() * FALLBACK_WORDS.length)];
            setTargetWord(fallback.word);
            setWordHint(fallback.hint);
            setGameStatus('playing');
        }
    }, []);

    const startGame = () => {
        gameAudio.init();
        gameAudio.resume();
        setGuesses([]);
        setCurrentGuess('');
        setScore(0);
        setMessage('');
        setWordHint('');
        fetchWord();
    };

    useEffect(() => {
        // Since WordGuess doesn't have an explicit audio subscription effect block, I need to check where it subscribes.
        // Wait, I see lines 57-64 in step 522 were just reset and startGame.
        // I need to check if WordGuess has a subscription.
        // Looking at file content from step 564. It does NOT have a useEffect subscription!
        // It initializes `audioEnabled` from `gameAudio.isMuted()` in line 17.
        // And `toggleAudio` (line 158) relies on local state update? No, it calls `gameAudio.toggle()`.
        // But if `reset()` changes it externally, `audioEnabled` won't update?
        // Ah, `WordGuess` controls update via `audioEnabled` state.
        // I must add a subscription here.

        const unsubscribe = gameAudio.subscribe((muted) => {
            setAudioEnabled(!muted);
        });
        gameAudio.reset();
        startGame();
        return unsubscribe;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const submitGuess = () => {
        if (currentGuess.length !== WORD_LENGTH) {
            showMessage("Word must be 6 letters");
            gameAudio.play('wrong');
            return;
        }

        const newGuesses = [...guesses, currentGuess];
        setGuesses(newGuesses);
        setCurrentGuess('');

        if (currentGuess === targetWord) {
            // Win
            const remainingGuesses = MAX_GUESSES - newGuesses.length;
            const finalScore = (remainingGuesses + 1) * 100 + 500; // Bonus for winning
            setScore(finalScore);
            setGameStatus('won');
            gameAudio.play('win');
            setGameStatus('won');
            gameAudio.play('win');
            setCanRestart(false);
            setTimeout(() => {
                setShowLeaderboard(true);
                setCanRestart(true);
            }, 2000);
        } else if (newGuesses.length >= MAX_GUESSES) {
            // Loss
            setGameStatus('lost');
            setGameStatus('lost');
            gameAudio.play('gameOver');
            setCanRestart(false);
            setTimeout(() => {
                setShowLeaderboard(true);
                setCanRestart(true);
            }, 2000);
        } else {
            gameAudio.play('click');
        }
    };

    const handleKey = useCallback((key) => {
        if (gameStatus !== 'playing') return;

        if (key === 'ENTER') {
            submitGuess();
        } else if (key === 'BACKSPACE') {
            setCurrentGuess(prev => prev.slice(0, -1));
        } else if (/^[A-Z]$/.test(key)) {
            if (currentGuess.length < WORD_LENGTH) {
                setCurrentGuess(prev => prev + key);
            }
        }
    }, [currentGuess, gameStatus, guesses, targetWord]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const key = e.key.toUpperCase();
            if (key === 'ENTER' || key === 'BACKSPACE' || /^[A-Z]$/.test(key)) {
                handleKey(key);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKey]);

    const showMessage = (msg) => {
        setMessage(msg);
        setTimeout(() => setMessage(''), 2000);
    };

    const getLetterStatus = (letter, index, word) => {
        if (!word) return 'empty';
        if (targetWord[index] === letter) return 'correct';
        if (targetWord.includes(letter)) return 'present';
        return 'absent';
    };

    const getKeyStatus = (key) => {
        let status = 'default';
        for (const guess of guesses) {
            for (let i = 0; i < WORD_LENGTH; i++) {
                if (guess[i] === key) {
                    if (targetWord[i] === key) return 'correct'; // Green beats all
                    if (targetWord.includes(key)) status = 'present'; // Yellow beats gray
                    else if (status === 'default') status = 'absent';
                }
            }
        }
        return status;
    };

    const toggleAudio = () => {
        gameAudio.toggle();
        gameAudio.resume();
        if (!gameAudio.isMuted()) gameAudio.play('click');
    };

    const getAchievement = () => {
        if (gameStatus === 'won') {
            return `Solved in ${guesses.length} attempts`;
        }
        return `Failed to solve`;
    };

    // Keyboard rows
    const keyboardRows = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
    ];

    return (
        <div className="space-y-6 max-w-lg mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <Link to="/games" className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        <ArrowLeft size={24} className="text-gray-400" />
                    </Link>
                    <h1 className="text-2xl font-bold text-white">Word Guess</h1>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setViewingLeaderboard(true)}
                        className="p-2 rounded-lg bg-white/10 text-gray-400 hover:text-primary transition-colors"
                    >
                        <Trophy size={20} />
                    </button>
                    <button
                        onClick={toggleAudio}
                        className={`p-2 rounded-lg transition-colors ${audioEnabled ? 'bg-primary/20 text-primary' : 'bg-white/10 text-gray-400'}`}
                    >
                        {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    </button>
                    <button
                        onClick={(e) => {
                            e.currentTarget.blur();
                            startGame();
                        }}
                        disabled={!canRestart}
                        className={`p-2 rounded-lg bg-white/10 text-gray-400 hover:text-primary transition-colors ${!canRestart ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <RotateCcw size={20} />
                    </button>
                </div>
            </div>

            {/* Game Grid */}
            <div className="glass-panel p-4 rounded-2xl">
                <div className="grid grid-rows-6 gap-2 mb-4">
                    {[...Array(MAX_GUESSES)].map((_, rowIndex) => {
                        const guess = guesses[rowIndex] || (rowIndex === guesses.length ? currentGuess : '');
                        const isSubmitted = rowIndex < guesses.length;

                        return (
                            <div key={rowIndex} className="grid grid-cols-6 gap-2">
                                {[...Array(WORD_LENGTH)].map((_, colIndex) => {
                                    const letter = guess[colIndex] || '';
                                    let status = 'empty';
                                    let animDelay = 0;

                                    if (isSubmitted) {
                                        status = getLetterStatus(letter, colIndex, guess);
                                        animDelay = colIndex * 0.1;
                                    }

                                    let bgColor = 'bg-white/5 border-gray-700';
                                    if (status === 'correct') bgColor = 'bg-green-500 border-green-600 text-white';
                                    if (status === 'present') bgColor = 'bg-yellow-500 border-yellow-600 text-white';
                                    if (status === 'absent') bgColor = 'bg-gray-700 border-gray-800 text-gray-400';
                                    if (!isSubmitted && letter) bgColor = 'bg-white/10 border-gray-500 text-white';

                                    return (
                                        <motion.div
                                            key={colIndex}
                                            initial={false}
                                            animate={isSubmitted ? { rotateX: [0, 90, 0], scale: [1, 1.1, 1] } : { scale: letter ? 1.05 : 1 }}
                                            transition={{ delay: animDelay, duration: 0.4 }}
                                            className={`aspect-square flex items-center justify-center rounded-lg border-2 text-xl sm:text-2xl font-bold ${bgColor}`}
                                        >
                                            {letter}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* Message Toast */}
                <div className="h-8 flex items-center justify-center mb-2">
                    <AnimatePresence>
                        {message && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="bg-white text-dark px-4 py-1 rounded-full text-sm font-bold"
                            >
                                {message}
                            </motion.div>
                        )}
                        {gameStatus === 'won' && !message && (
                            <div className="text-green-400 font-bold">🎉 Excellent!</div>
                        )}
                        {gameStatus === 'lost' && !message && (
                            <div className="text-red-400 font-bold">Word was: {targetWord}</div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-primary/30">
                <div className="flex items-center gap-2 mb-2">
                    <HelpCircle size={18} className="text-primary" />
                    <h2 className="text-sm uppercase tracking-wider text-primary font-bold">Hint</h2>
                </div>
                <p className="text-white text-base sm:text-lg leading-relaxed min-h-[3rem]">
                    {wordHint || 'Loading hint...'}
                </p>
            </div>

            {/* Keyboard */}
            <div className="grid gap-2">
                {keyboardRows.map((row, i) => (
                    <div key={i} className="flex justify-center gap-1 sm:gap-2">
                        {row.map(key => {
                            const status = getKeyStatus(key);
                            let bg = 'bg-white/10 text-gray-300';
                            if (status === 'correct') bg = 'bg-green-500 text-white';
                            if (status === 'present') bg = 'bg-yellow-500 text-white';
                            if (status === 'absent') bg = 'bg-gray-800 text-gray-500';

                            const isWide = key === 'ENTER' || key === 'BACKSPACE';

                            return (
                                <button
                                    key={key}
                                    onClick={() => handleKey(key)}
                                    className={`${isWide ? 'px-3 sm:px-6' : 'w-7 sm:w-10'} h-12 sm:h-14 rounded-lg font-bold text-xs sm:text-sm transition-all hover:bg-white/20 active:scale-95 ${bg}`}
                                >
                                    {key === 'BACKSPACE' ? <Delete size={20} /> : key}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>

            <LeaderboardModal
                isOpen={showLeaderboard}
                onClose={() => setShowLeaderboard(false)}
                game="wordguess"
                currentScore={score}
                onSubmitScore={getAchievement}
            />
            <LeaderboardModal
                isOpen={viewingLeaderboard}
                onClose={() => setViewingLeaderboard(false)}
                game="wordguess"
            />
        </div>
    );
}

export default WordGuess;
