import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Volume2, VolumeX, Loader, Trophy } from 'lucide-react';
import gameAudio from '../../utils/audio';
import LeaderboardModal from '../LeaderboardModal';

const DIFFICULTY_CONFIG = {
    easy: { label: 'Easy', attempts: 8, multiplier: 1, minLength: 4, maxLength: 5 },
    medium: { label: 'Medium', attempts: 6, multiplier: 1.5, minLength: 6, maxLength: 8 },
    hard: { label: 'Hard', attempts: 4, multiplier: 2.5, minLength: 8, maxLength: 12 }
};

function Hangman() {
    const [word, setWord] = useState('');
    const [hint, setHint] = useState('');
    const [guessedLetters, setGuessedLetters] = useState(new Set());
    const [wrongGuesses, setWrongGuesses] = useState(0);
    const [difficulty, setDifficulty] = useState('medium');
    const [gameStatus, setGameStatus] = useState('idle');
    const [audioEnabled, setAudioEnabled] = useState(!gameAudio.isMuted());
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [viewingLeaderboard, setViewingLeaderboard] = useState(false);
    const [score, setScore] = useState(0);

    const config = DIFFICULTY_CONFIG[difficulty];
    const maxWrong = config.attempts;

    const fetchWord = useCallback(async () => {
        setGameStatus('loading');
        try {
            const len = config.minLength + Math.floor(Math.random() * (config.maxLength - config.minLength));
            const res = await fetch(`https://api.datamuse.com/words?sp=${'?'.repeat(len)}&max=50`);
            const data = await res.json();

            if (data.length > 0) {
                const randomWordIdx = Math.floor(Math.random() * data.length);
                const randomWord = data[randomWordIdx].word.toUpperCase();
                setWord(randomWord);

                try {
                    const defRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${randomWord.toLowerCase()}`);
                    if (defRes.ok) {
                        const defData = await defRes.json();

                        // Collect all valid definitions from all entries
                        const allDefinitions = [];

                        if (Array.isArray(defData)) {
                            defData.forEach(entry => {
                                if (entry.meanings) {
                                    entry.meanings.forEach(meaning => {
                                        if (meaning.definitions) {
                                            meaning.definitions.forEach(def => {
                                                // Filter out definitions that contain the word itself (spoiler protection)
                                                if (def.definition && !def.definition.toLowerCase().includes(randomWord.toLowerCase())) {
                                                    allDefinitions.push({
                                                        text: def.definition,
                                                        partOfSpeech: meaning.partOfSpeech
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }

                        if (allDefinitions.length > 0) {
                            // Select a random definition to avoid invalid/archaic first entries
                            const randomDef = allDefinitions[Math.floor(Math.random() * allDefinitions.length)];
                            setHint(`${randomDef.partOfSpeech ? `(${randomDef.partOfSpeech}) ` : ''}${randomDef.text}`);
                        } else {
                            // Fallback if all definitions contained the word or none found
                            const meaning = defData[0]?.meanings?.[0]?.definitions?.[0]?.definition || '';
                            setHint(meaning.slice(0, 100));
                        }
                    } else {
                        setHint('No hint available');
                    }
                } catch (err) {
                    console.error('Error fetching hint:', err);
                    setHint('No hint available');
                }

                setGuessedLetters(new Set());
                setWrongGuesses(0);
                setGameStatus('playing');
                return;
            }
        } catch (err) {
            console.error('Failed to fetch word:', err);
        }

        const fallbackWords = ['JAVASCRIPT', 'PROGRAMMING', 'COMPUTER', 'ALGORITHM', 'DEVELOPER'];
        const fallback = fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
        setWord(fallback);
        setHint('Technology related');
        setGuessedLetters(new Set());
        setWrongGuesses(0);
        setGameStatus('playing');
    }, [config.minLength, config.maxLength]);

    const startGame = () => {
        gameAudio.init();
        gameAudio.resume();
        setScore(0);
        setShowLeaderboard(false);
        fetchWord();
    };

    const guessLetter = useCallback((letter) => {
        if (gameStatus !== 'playing' || guessedLetters.has(letter)) return;

        const newGuessed = new Set(guessedLetters);
        newGuessed.add(letter);
        setGuessedLetters(newGuessed);

        if (word.includes(letter)) {
            gameAudio.play('correct');
            const won = word.split('').every(l => newGuessed.has(l));
            if (won) {
                const remainingAttempts = maxWrong - wrongGuesses;
                const finalScore = Math.round((remainingAttempts * 100 + word.length * 20) * config.multiplier);
                setScore(finalScore);
                setGameStatus('won');
                gameAudio.play('win');
                setShowLeaderboard(true);
            }
        } else {
            const newWrongGuesses = wrongGuesses + 1;
            setWrongGuesses(newWrongGuesses);
            gameAudio.play('wrong');

            if (newWrongGuesses >= maxWrong) {
                const finalScore = Math.round(word.split('').filter(l => newGuessed.has(l)).length * 10 * config.multiplier);
                setScore(finalScore);
                setGameStatus('lost');
                gameAudio.play('gameOver');
                // Show leaderboard after delay so user can see the word
                setTimeout(() => {
                    setShowLeaderboard(true);
                }, 2000);
            }
        }
    }, [gameStatus, guessedLetters, word, wrongGuesses, maxWrong, config.multiplier]);

    // Audio Subscription
    useEffect(() => {
        const unsubscribe = gameAudio.subscribe((muted) => {
            setAudioEnabled(!muted);
        });
        return unsubscribe;
    }, []);

    // Keyboard input
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (gameStatus !== 'playing') return;
            const key = e.key.toUpperCase();
            if (/^[A-Z]$/.test(key)) {
                guessLetter(key);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameStatus, guessLetter]);

    const toggleAudio = () => {
        gameAudio.toggle();
        gameAudio.resume();
        if (!gameAudio.isMuted()) gameAudio.play('click');
    };

    const getAchievement = () => {
        if (gameStatus === 'won') {
            return `${config.label}: Won with ${maxWrong - wrongGuesses} attempts left`;
        }
        return `${config.label}: Tried but lost`;
    };

    const keyboard = 'QWERTYUIOPASDFGHJKLZXCVBNM'.split('');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/games" className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        <ArrowLeft size={24} className="text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white">Hangman</h1>
                        <p className="text-gray-500 text-sm">Guess the word before you run out of attempts!</p>
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

            {/* Game container - NO Framer Motion */}
            <div className="glass-panel rounded-2xl p-4 sm:p-6">
                {/* Difficulty selector */}
                {gameStatus === 'idle' && (
                    <div className="mb-6">
                        <p className="text-sm text-gray-400 mb-3">Select Difficulty:</p>
                        <div className="flex gap-2 flex-wrap">
                            {Object.entries(DIFFICULTY_CONFIG).map(([key, val]) => (
                                <button
                                    key={key}
                                    onClick={() => setDifficulty(key)}
                                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${difficulty === key
                                        ? 'bg-primary text-dark'
                                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                        }`}
                                >
                                    {val.label} ({val.attempts} attempts)
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Loading */}
                {gameStatus === 'loading' && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader className="animate-spin text-primary mb-4" size={32} />
                        <p className="text-gray-400">Fetching a word...</p>
                    </div>
                )}

                {/* Game area */}
                {(gameStatus === 'playing' || gameStatus === 'won' || gameStatus === 'lost') && (
                    <>
                        {/* Hangman drawing */}
                        <div className="flex justify-center mb-6">
                            <svg width="150" height="180" viewBox="0 0 150 180" className="sm:w-[200px] sm:h-[240px]">
                                {/* Gallows */}
                                <line x1="20" y1="170" x2="80" y2="170" stroke="#444" strokeWidth="3" />
                                <line x1="50" y1="170" x2="50" y2="20" stroke="#444" strokeWidth="3" />
                                <line x1="50" y1="20" x2="100" y2="20" stroke="#444" strokeWidth="3" />
                                <line x1="100" y1="20" x2="100" y2="40" stroke="#444" strokeWidth="3" />

                                {/* Body parts */}
                                {wrongGuesses >= 1 && <circle cx="100" cy="55" r="15" fill="none" stroke="#00f0ff" strokeWidth="3" />}
                                {wrongGuesses >= 2 && <line x1="100" y1="70" x2="100" y2="110" stroke="#00f0ff" strokeWidth="3" />}
                                {wrongGuesses >= 3 && <line x1="100" y1="80" x2="75" y2="100" stroke="#00f0ff" strokeWidth="3" />}
                                {wrongGuesses >= 4 && <line x1="100" y1="80" x2="125" y2="100" stroke="#00f0ff" strokeWidth="3" />}
                                {wrongGuesses >= 5 && <line x1="100" y1="110" x2="80" y2="145" stroke="#00f0ff" strokeWidth="3" />}
                                {wrongGuesses >= 6 && <line x1="100" y1="110" x2="120" y2="145" stroke="#00f0ff" strokeWidth="3" />}
                                {wrongGuesses >= 7 && <line x1="80" y1="145" x2="75" y2="155" stroke="#00f0ff" strokeWidth="3" />}
                                {wrongGuesses >= 8 && <line x1="120" y1="145" x2="125" y2="155" stroke="#00f0ff" strokeWidth="3" />}
                            </svg>
                        </div>

                        {/* Attempts counter */}
                        <div className="text-center mb-4">
                            <span className="text-gray-400">Attempts remaining: </span>
                            <span className={`font-bold font-mono ${maxWrong - wrongGuesses <= 2 ? 'text-red-500' : 'text-primary'}`}>
                                {maxWrong - wrongGuesses}
                            </span>
                        </div>

                        {/* Word display - Plain CSS, no Framer Motion */}
                        <div className="flex justify-center flex-wrap mb-4">
                            {word.split('').map((letter, i) => (
                                <span
                                    key={i}
                                    className={`inline-flex items-center justify-center w-8 h-10 sm:w-12 sm:h-14 mx-0.5 sm:mx-1 rounded-lg font-mono text-xl sm:text-2xl font-bold transition-colors ${guessedLetters.has(letter)
                                        ? 'bg-primary/20 text-primary border border-primary/30'
                                        : 'bg-white/10 text-transparent border border-glass-border'
                                        }`}
                                >
                                    {guessedLetters.has(letter) ? letter : '_'}
                                </span>
                            ))}
                        </div>

                        {/* Hint */}
                        {hint && (
                            <p className="text-center text-sm text-gray-500 mb-6 italic">
                                Hint: {hint}
                            </p>
                        )}

                        {/* Win/Lose messages */}
                        {gameStatus === 'won' && (
                            <div className="text-center mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                                <p className="text-green-400 text-lg font-bold">🎉 You Won!</p>
                                <p className="text-gray-400">Score: <span className="text-primary font-mono">{score}</span></p>
                            </div>
                        )}
                        {gameStatus === 'lost' && (
                            <div className="text-center mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                                <p className="text-red-400 text-lg font-bold">Game Over!</p>
                                <p className="text-gray-400">The word was: <span className="text-white font-mono">{word}</span></p>
                            </div>
                        )}

                        {/* Virtual keyboard */}
                        <div className="flex flex-wrap justify-center gap-1 sm:gap-2 max-w-md mx-auto">
                            {keyboard.map(letter => {
                                const isGuessed = guessedLetters.has(letter);
                                const isCorrect = isGuessed && word.includes(letter);
                                const isWrong = isGuessed && !word.includes(letter);

                                return (
                                    <button
                                        key={letter}
                                        onClick={() => guessLetter(letter)}
                                        disabled={isGuessed || gameStatus !== 'playing'}
                                        className={`w-8 h-10 sm:w-10 sm:h-12 rounded-lg font-mono font-bold text-sm sm:text-base transition-colors ${isCorrect
                                            ? 'bg-green-500/30 text-green-400 border border-green-500/50'
                                            : isWrong
                                                ? 'bg-red-500/30 text-red-400 border border-red-500/50'
                                                : 'bg-white/10 text-white hover:bg-white/20'
                                            } disabled:cursor-not-allowed`}
                                    >
                                        {letter}
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Start/Play Again */}
                <div className="flex justify-center gap-4 mt-6">
                    {(gameStatus === 'idle' || gameStatus === 'won' || gameStatus === 'lost') && (
                        <button
                            onClick={startGame}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-dark font-bold hover:opacity-90 transition-opacity"
                        >
                            <RotateCcw size={20} />
                            {gameStatus === 'idle' ? 'Start Game' : 'Play Again'}
                        </button>
                    )}
                </div>
            </div>

            <LeaderboardModal
                isOpen={showLeaderboard}
                onClose={() => setShowLeaderboard(false)}
                game="hangman"
                currentScore={score}
                onSubmitScore={getAchievement}
            />
            <LeaderboardModal
                isOpen={viewingLeaderboard}
                onClose={() => setViewingLeaderboard(false)}
                game="hangman"
            />
        </div>
    );
}

export default Hangman;
