import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Volume2, VolumeX, Trophy, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import gameAudio from '../../utils/audio';
import LeaderboardModal from '../LeaderboardModal';

// ==================== CONSTANTS ====================

const COLORS = ['red', 'blue', 'green', 'yellow'];
const PLAYER_NAMES = ['You', 'Blaze', 'Storm', 'Viper'];
const CARDS_PER_PLAYER = 7;
const MERCY_LIMIT = 25;

const COLOR_MAP = {
    red: { bg: 'bg-red-500', ring: 'ring-red-400', glow: 'shadow-red-500/50', text: 'text-red-400', cardText: 'text-white' },
    blue: { bg: 'bg-blue-500', ring: 'ring-blue-400', glow: 'shadow-blue-500/50', text: 'text-blue-400', cardText: 'text-white' },
    green: { bg: 'bg-emerald-500', ring: 'ring-emerald-400', glow: 'shadow-emerald-500/50', text: 'text-emerald-400', cardText: 'text-white' },
    yellow: { bg: 'bg-yellow-400', ring: 'ring-yellow-300', glow: 'shadow-yellow-400/50', text: 'text-yellow-300', cardText: 'text-gray-900' },
};

// ==================== DECK HELPERS ====================

function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function createDeck(mode) {
    const deck = [];
    let id = 0;

    for (const color of COLORS) {
        // One 0 per color
        deck.push({ id: id++, color, type: 'number', value: 0 });
        // Two each of 1–9
        for (let v = 1; v <= 9; v++) {
            deck.push({ id: id++, color, type: 'number', value: v });
            deck.push({ id: id++, color, type: 'number', value: v });
        }

        if (mode === 'classic') {
            // Classic: 2 each of Skip, Reverse, Draw Two per color
            for (let i = 0; i < 2; i++) {
                deck.push({ id: id++, color, type: 'skip', value: null });
                deck.push({ id: id++, color, type: 'reverse', value: null });
                deck.push({ id: id++, color, type: 'draw2', value: null });
            }
        } else {
            // No Mercy: 3 each of Skip, Reverse, Draw Two; 2 each of Draw Four, Discard All, Skip Everyone
            for (let i = 0; i < 3; i++) {
                deck.push({ id: id++, color, type: 'skip', value: null });
                deck.push({ id: id++, color, type: 'reverse', value: null });
                deck.push({ id: id++, color, type: 'draw2', value: null });
            }
            for (let i = 0; i < 2; i++) {
                deck.push({ id: id++, color, type: 'draw4', value: null });
                deck.push({ id: id++, color, type: 'discard_all', value: null });
                deck.push({ id: id++, color, type: 'skip_all', value: null });
            }
        }
    }

    if (mode === 'classic') {
        // 4 Wild, 4 Wild Draw Four
        for (let i = 0; i < 4; i++) {
            deck.push({ id: id++, color: 'wild', type: 'wild', value: null });
            deck.push({ id: id++, color: 'wild', type: 'wild_draw4', value: null });
        }
    } else {
        // No Mercy wilds: Wild Reverse Draw 4, Wild Draw 6, Wild Draw 10, Wild Color Roulette
        for (let i = 0; i < 4; i++) {
            deck.push({ id: id++, color: 'wild', type: 'wild_rev_draw4', value: null });
            deck.push({ id: id++, color: 'wild', type: 'wild_draw6', value: null });
            deck.push({ id: id++, color: 'wild', type: 'wild_draw10', value: null });
            deck.push({ id: id++, color: 'wild', type: 'wild_roulette', value: null });
        }
    }

    return deck;
}

function getCardSymbol(card) {
    switch (card.type) {
        case 'number': return String(card.value);
        case 'skip': return '⊘';
        case 'reverse': return '⇄';
        case 'draw2': return '+2';
        case 'draw4': return '+4';
        case 'wild': return '★';
        case 'wild_draw4': return '+4';
        case 'wild_rev_draw4': return '⇄+4';
        case 'wild_draw6': return '+6';
        case 'wild_draw10': return '+10';
        case 'wild_roulette': return '🎲';
        case 'discard_all': return '✕ALL';
        case 'skip_all': return '⊘ALL';
        default: return '?';
    }
}

function getCardLabel(card) {
    switch (card.type) {
        case 'skip': return 'SKIP';
        case 'reverse': return 'REV';
        case 'draw2': return 'DRAW';
        case 'draw4': return 'DRAW';
        case 'wild': return 'WILD';
        case 'wild_draw4': return 'WILD';
        case 'wild_rev_draw4': return 'REV';
        case 'wild_draw6': return 'WILD';
        case 'wild_draw10': return 'WILD';
        case 'wild_roulette': return 'ROUL';
        case 'discard_all': return 'DISC';
        case 'skip_all': return 'SKIP';
        default: return '';
    }
}

function isDrawCard(card) {
    return ['draw2', 'draw4', 'wild_draw4', 'wild_rev_draw4', 'wild_draw6', 'wild_draw10'].includes(card.type);
}

function getDrawAmount(card) {
    switch (card.type) {
        case 'draw2': return 2;
        case 'draw4': return 4;
        case 'wild_draw4': return 4;
        case 'wild_rev_draw4': return 4;
        case 'wild_draw6': return 6;
        case 'wild_draw10': return 10;
        default: return 0;
    }
}

function getCardTooltip(card, mode) {
    switch (card.type) {
        case 'number':
            if (mode === 'nomercy' && card.value === 7) return '7 — Swap hands with a player!';
            if (mode === 'nomercy' && card.value === 0) return '0 — All hands pass around!';
            return '';
        case 'skip': return 'Skip — Next player loses turn';
        case 'reverse': return 'Reverse — Change direction of play';
        case 'draw2': return mode === 'nomercy' ? 'Draw 2 — Stackable!' : 'Draw 2 — Next player draws 2';
        case 'draw4': return 'Draw 4 — Stackable! Next player draws 4';
        case 'wild': return 'Wild — Choose any color';
        case 'wild_draw4': return 'Wild +4 — Choose color, next player draws 4';
        case 'wild_rev_draw4': return 'Wild Reverse +4 — Reverse + next draws 4. Stackable!';
        case 'wild_draw6': return 'Wild +6 — Next player draws 6. Stackable!';
        case 'wild_draw10': return 'Wild +10 — Next player draws 10. Stackable!';
        case 'wild_roulette': return 'Roulette — Next player picks color, draws until finding it!';
        case 'discard_all': return 'Discard All — Dump every card of this color!';
        case 'skip_all': return 'Skip Everyone — All others lose their turn!';
        default: return '';
    }
}

function calculateScore(players, winnerIdx) {
    let score = 0;
    players.forEach((p, i) => {
        if (i === winnerIdx) return;
        if (p.isOut) {
            score += 250; // Bonus for knocked-out players
        } else {
            p.hand.forEach(c => {
                if (c.type === 'number') score += c.value;
                else if (['skip', 'reverse', 'draw2', 'draw4', 'discard_all', 'skip_all'].includes(c.type)) score += 20;
                else score += 50; // Wild cards
            });
        }
    });
    return score;
}

// ==================== GAME LOGIC ====================

function ensureDrawPile(g) {
    if (g.drawPile.length > 0) return g;
    if (g.discardPile.length <= 1) return g;
    const topCard = g.discardPile[g.discardPile.length - 1];
    // Set aside knocked-out players' cards (they go back into the reshuffle)
    return {
        ...g,
        drawPile: shuffle(g.discardPile.slice(0, -1)),
        discardPile: [topCard],
    };
}

function drawCards(g, count) {
    g = ensureDrawPile(g);
    const drawn = g.drawPile.slice(0, Math.min(count, g.drawPile.length));
    g.drawPile = g.drawPile.slice(drawn.length);
    return { g, drawn };
}

function nextActivePlayer(currentIdx, direction, players) {
    const n = players.length;
    let idx = currentIdx;
    for (let i = 0; i < n; i++) {
        idx = ((idx + direction) % n + n) % n;
        if (!players[idx].isOut) return idx;
    }
    return currentIdx; // All out (shouldn't happen)
}

function countActivePlayers(players) {
    return players.filter(p => !p.isOut).length;
}

function canPlayCard(card, topCard, currentColor, drawStack, mode) {
    // During stacking in No Mercy, only draw cards of equal or higher value
    if (drawStack > 0 && mode === 'nomercy') {
        if (!isDrawCard(card)) return false;
        const topDraw = getDrawAmount(topCard);
        return getDrawAmount(card) >= topDraw;
    }
    // Wild cards always playable
    if (card.color === 'wild') return true;
    // Match by color
    if (card.color === currentColor) return true;
    // Match by type+value
    if (card.type === topCard.type) {
        if (card.type === 'number') return card.value === topCard.value;
        return true;
    }
    return false;
}

function checkMercy(g) {
    // Returns game state with mercy rule knockouts applied
    let messages = [];
    const newPlayers = g.players.map((p, i) => {
        if (!p.isOut && p.hand.length >= MERCY_LIMIT) {
            messages.push(`${p.name} has ${p.hand.length} cards — KNOCKED OUT! 💀`);
            return { ...p, isOut: true, hand: [] };
        }
        return p;
    });
    return { g: { ...g, players: newPlayers }, messages };
}

function initializeGame(mode) {
    let deck = shuffle(createDeck(mode));
    const players = PLAYER_NAMES.map((name, i) => ({
        id: i,
        name,
        hand: deck.slice(i * CARDS_PER_PLAYER, (i + 1) * CARDS_PER_PLAYER),
        isHuman: i === 0,
        isOut: false,
    }));
    deck = deck.slice(CARDS_PER_PLAYER * 4);

    // Find first number card for initial discard
    let firstIdx = deck.findIndex(c => c.type === 'number');
    if (firstIdx === -1) firstIdx = 0;
    const firstCard = deck[firstIdx];
    deck = [...deck.slice(0, firstIdx), ...deck.slice(firstIdx + 1)];

    return {
        players,
        drawPile: deck,
        discardPile: [firstCard],
        currentColor: firstCard.color === 'wild' ? COLORS[Math.floor(Math.random() * 4)] : firstCard.color,
        currentPlayerIdx: 0,
        direction: 1,
        drawStack: 0,
        mode,
        winner: null,
        hasDrawn: false,
    };
}

// ==================== AI LOGIC ====================

function aiSelectCard(hand, topCard, currentColor, drawStack, mode) {
    const playable = hand.filter(c => canPlayCard(c, topCard, currentColor, drawStack, mode));
    if (playable.length === 0) return null;

    // Stacking — pick highest draw value
    if (drawStack > 0) {
        const sorted = [...playable].sort((a, b) => getDrawAmount(b) - getDrawAmount(a));
        const chosen = sorted[0];
        return { card: chosen, index: hand.indexOf(chosen) };
    }

    // Prefer action cards, save wilds
    const actions = playable.filter(c => !['number', 'wild', 'wild_draw4', 'wild_rev_draw4', 'wild_draw6', 'wild_draw10', 'wild_roulette'].includes(c.type));
    const numbers = playable.filter(c => c.type === 'number');
    const wilds = playable.filter(c => c.color === 'wild');

    let chosen;

    // Discard All if it dumps ≥ 2 extra cards
    const discardAlls = actions.filter(c => c.type === 'discard_all');
    for (const da of discardAlls) {
        if (hand.filter(c => c.color === da.color && c.id !== da.id).length >= 2) {
            chosen = da;
            break;
        }
    }

    if (!chosen && actions.length > 0 && Math.random() > 0.25) {
        chosen = actions[Math.floor(Math.random() * actions.length)];
    } else if (!chosen && numbers.length > 0) {
        numbers.sort((a, b) => b.value - a.value);
        chosen = numbers[0];
    } else if (!chosen && actions.length > 0) {
        chosen = actions[0];
    } else if (!chosen) {
        chosen = wilds[0] || playable[0];
    }

    return { card: chosen, index: hand.indexOf(chosen) };
}

function aiSelectColor(hand) {
    const counts = { red: 0, blue: 0, green: 0, yellow: 0 };
    hand.forEach(c => { if (c.color !== 'wild') counts[c.color]++; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function aiSelectSwapTarget(aiIdx, players) {
    // Swap with the player who has the fewest cards
    let best = -1, bestCount = Infinity;
    players.forEach((p, i) => {
        if (i === aiIdx || p.isOut) return;
        if (p.hand.length < bestCount) {
            bestCount = p.hand.length;
            best = i;
        }
    });
    return best >= 0 ? best : nextActivePlayer(aiIdx, 1, players);
}

// ==================== CARD COMPONENT ====================

function GameCard({ card, playable = false, faceDown = false, onClick, size = 'normal', mode }) {
    if (faceDown) {
        const sizeClass = size === 'small' ? 'w-7 h-10' : size === 'large' ? 'w-20 h-[120px] sm:w-24 sm:h-36' : 'w-12 h-[72px] sm:w-14 sm:h-[84px]';
        return (
            <div className={`${sizeClass} rounded-lg bg-gradient-to-br from-indigo-700 to-purple-900 border border-indigo-400/30 shadow-lg flex items-center justify-center flex-shrink-0`}>
                <div className="w-3/4 h-3/4 rounded-full border border-indigo-400/20 flex items-center justify-center">
                    <span className="text-indigo-300 text-[8px] font-black select-none">WC</span>
                </div>
            </div>
        );
    }

    const symbol = getCardSymbol(card);
    const label = getCardLabel(card);
    const tooltip = getCardTooltip(card, mode);
    const isWild = card.color === 'wild';

    const bgClass = isWild
        ? 'bg-gradient-to-br from-violet-700 via-fuchsia-600 to-rose-600'
        : COLOR_MAP[card.color]?.bg || 'bg-gray-600';
    const txtClass = isWild ? 'text-white' : COLOR_MAP[card.color]?.cardText || 'text-white';

    const sizeClass = size === 'small' ? 'w-7 h-10' : size === 'large' ? 'w-20 h-[120px] sm:w-24 sm:h-36' : 'w-12 h-[72px] sm:w-14 sm:h-[84px]';
    const centerTxt = size === 'large' ? 'text-2xl sm:text-3xl' : size === 'small' ? 'text-[8px]' : 'text-base sm:text-lg';
    const cornerTxt = size === 'large' ? 'text-xs' : size === 'small' ? 'text-[5px]' : 'text-[8px] sm:text-[9px]';
    const labelTxt = size === 'large' ? 'text-[9px] sm:text-xs' : 'text-[5px] sm:text-[6px]';

    return (
        <div
            title={tooltip}
            className={`
                ${sizeClass} rounded-xl ${bgClass} shadow-lg flex-shrink-0 relative overflow-hidden select-none
                transition-all duration-200
                ${playable ? 'cursor-pointer hover:-translate-y-2 sm:hover:-translate-y-3 ring-2 ring-white/60 hover:ring-white hover:shadow-xl z-10' : 'opacity-80 cursor-default'}
            `}
            onClick={playable ? onClick : undefined}
        >
            <div className="absolute inset-[15%] bg-white/20 rounded-[50%] transform rotate-[20deg]" />
            <span className={`absolute top-0.5 left-0.5 ${txtClass} font-black ${cornerTxt} drop-shadow-md`}>{symbol}</span>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`${txtClass} font-black ${centerTxt} drop-shadow-lg leading-none`}>{symbol}</span>
                {label && <span className={`${txtClass} opacity-80 font-bold ${labelTxt} mt-0.5`}>{label}</span>}
            </div>
            <span className={`absolute bottom-0.5 right-0.5 ${txtClass} font-black ${cornerTxt} rotate-180 drop-shadow-md`}>{symbol}</span>
        </div>
    );
}

// ==================== MAIN COMPONENT ====================

function CardBlitz() {
    const [phase, setPhase] = useState('menu');
    // phases: menu | playing | color_pick | swap_pick | roulette_pick | game_over
    const [game, setGame] = useState(null);
    const [messages, setMessages] = useState([]);
    const [aiThinking, setAiThinking] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(!gameAudio.isMuted());
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [viewingLeaderboard, setViewingLeaderboard] = useState(false);
    const [score, setScore] = useState(0);
    const [wildActive, setWildActive] = useState(false); // WILD! call
    const [turnKey, setTurnKey] = useState(0);

    // Refs for pending data during overlays
    const pendingCardRef = useRef(null);
    const pendingPlayerRef = useRef(null);

    const aiTimeoutRef = useRef(null);
    const wildTimeoutRef = useRef(null);
    const msgTimeoutRef = useRef(null);

    // --- Audio ---
    useEffect(() => {
        const unsub = gameAudio.subscribe((muted) => setAudioEnabled(!muted));
        gameAudio.reset();
        return () => {
            unsub();
            clearTimeout(aiTimeoutRef.current);
            clearTimeout(wildTimeoutRef.current);
        };
    }, []);

    // --- Message helper ---
    const showMsg = useCallback((msg, duration = 3000) => {
        setMessages(prev => [...prev.slice(-4), msg]);
        clearTimeout(msgTimeoutRef.current);
        msgTimeoutRef.current = setTimeout(() => setMessages(prev => prev.slice(1)), duration);
    }, []);

    // --- Game over detection ---
    useEffect(() => {
        if (!game || phase === 'menu' || phase === 'game_over') return;

        // Check if someone won by emptying hand
        const emptyPlayer = game.players.find(p => !p.isOut && p.hand.length === 0);
        if (emptyPlayer) {
            const finalScore = calculateScore(game.players, emptyPlayer.id);
            setScore(emptyPlayer.isHuman ? finalScore : 0);
            setGame(prev => prev ? { ...prev, winner: emptyPlayer.id } : prev);
            setPhase('game_over');
            gameAudio.play(emptyPlayer.isHuman ? 'win' : 'gameOver');
            return;
        }

        // Check if only one player remains (mercy knockouts)
        const active = game.players.filter(p => !p.isOut);
        if (active.length === 1) {
            const winner = active[0];
            const finalScore = calculateScore(game.players, winner.id);
            setScore(winner.isHuman ? finalScore : 0);
            setGame(prev => prev ? { ...prev, winner: winner.id } : prev);
            setPhase('game_over');
            gameAudio.play(winner.isHuman ? 'win' : 'gameOver');
        }
    }, [game?.players, phase]);

    // --- AI Turn Driver ---
    useEffect(() => {
        if (!game || phase !== 'playing') return;
        const current = game.players[game.currentPlayerIdx];
        if (!current || current.isHuman || current.isOut) return;

        setAiThinking(true);
        const delay = 800 + Math.random() * 700;

        aiTimeoutRef.current = setTimeout(() => {
            executeAiTurn();
            setAiThinking(false);
        }, delay);

        return () => clearTimeout(aiTimeoutRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game?.currentPlayerIdx, phase, turnKey]);

    function executeAiTurn() {
        setGame(prev => {
            if (!prev) return prev;
            let g = deepCopy(prev);
            const aiIdx = g.currentPlayerIdx;
            const ai = g.players[aiIdx];
            if (ai.isOut || ai.isHuman) return prev;

            const topCard = g.discardPile[g.discardPile.length - 1];

            // --- Handle draw stack (No Mercy stacking) ---
            if (g.drawStack > 0 && g.mode === 'nomercy') {
                const choice = aiSelectCard(ai.hand, topCard, g.currentColor, g.drawStack, g.mode);
                if (choice) {
                    const card = choice.card;
                    g.players[aiIdx].hand = ai.hand.filter((_, i) => i !== choice.index);
                    g.discardPile = [...g.discardPile, card];
                    g.drawStack += getDrawAmount(card);

                    if (card.color === 'wild') {
                        g.currentColor = aiSelectColor(g.players[aiIdx].hand);
                    } else {
                        g.currentColor = card.color;
                    }

                    // Wild Reverse Draw 4: also reverse direction
                    if (card.type === 'wild_rev_draw4') {
                        g.direction *= -1;
                    }

                    showMsg(`${ai.name} stacks ${getCardSymbol(card)}! Stack: +${g.drawStack} 😱`);
                    g = checkAndApplyMercy(g);
                    g = checkWildCallAi(g, aiIdx);
                    g.currentPlayerIdx = nextActivePlayer(aiIdx, g.direction, g.players);
                    return g;
                } else {
                    // AI can't stack, draws the full penalty
                    const count = g.drawStack;
                    const result = drawCards(g, count);
                    g = result.g;
                    g.players[aiIdx].hand = [...g.players[aiIdx].hand, ...result.drawn];
                    g.drawStack = 0;
                    showMsg(`${ai.name} draws ${result.drawn.length} cards! 💀`);
                    g = checkAndApplyMercy(g);
                    g.currentPlayerIdx = nextActivePlayer(aiIdx, g.direction, g.players);
                    return g;
                }
            }

            // --- Normal AI play ---
            const choice = aiSelectCard(ai.hand, topCard, g.currentColor, 0, g.mode);

            if (choice) {
                const card = choice.card;
                g.players[aiIdx].hand = ai.hand.filter((_, i) => i !== choice.index);
                g.discardPile = [...g.discardPile, card];

                // Set color
                if (card.color === 'wild') {
                    if (card.type === 'wild_roulette') {
                        g.currentColor = COLORS[Math.floor(Math.random() * 4)];
                    } else {
                        g.currentColor = aiSelectColor(g.players[aiIdx].hand);
                    }
                } else {
                    g.currentColor = card.color;
                }

                // Apply card effects
                g = applyCardEffectsMulti(g, card, aiIdx, showMsg);

            } else {
                // AI must draw
                if (g.mode === 'nomercy') {
                    // Draw until playable
                    g = aiDrawUntilPlayable(g, aiIdx, showMsg);
                } else {
                    // Classic: draw one card
                    const result = drawCards(g, 1);
                    g = result.g;
                    if (result.drawn.length > 0) {
                        const drawnCard = result.drawn[0];
                        // Check if drawn card is playable
                        const newTop = g.discardPile[g.discardPile.length - 1];
                        if (canPlayCard(drawnCard, newTop, g.currentColor, 0, g.mode) && Math.random() < 0.7) {
                            g.discardPile = [...g.discardPile, drawnCard];
                            if (drawnCard.color === 'wild') {
                                g.currentColor = aiSelectColor(g.players[aiIdx].hand);
                            } else {
                                g.currentColor = drawnCard.color;
                            }
                            g = applyCardEffectsMulti(g, drawnCard, aiIdx, showMsg);
                            showMsg(`${ai.name} draws and plays ${getCardSymbol(drawnCard)}!`);
                            return g;
                        } else {
                            g.players[aiIdx].hand = [...g.players[aiIdx].hand, drawnCard];
                        }
                    }
                    showMsg(`${ai.name} draws a card`);
                    g.currentPlayerIdx = nextActivePlayer(aiIdx, g.direction, g.players);
                }
            }

            return g;
        });

        advanceTurn();
    }

    function aiDrawUntilPlayable(g, aiIdx, msgFn) {
        let drawn = [];
        let found = null;
        for (let i = 0; i < 50; i++) { // Safety limit
            g = ensureDrawPile(g);
            if (g.drawPile.length === 0) break;
            const card = g.drawPile[0];
            g.drawPile = g.drawPile.slice(1);
            const topCard = g.discardPile[g.discardPile.length - 1];
            if (canPlayCard(card, topCard, g.currentColor, 0, g.mode)) {
                found = card;
                break;
            }
            drawn.push(card);
            g.players[aiIdx].hand = [...g.players[aiIdx].hand, card];
            // Check mercy mid-draw
            if (g.players[aiIdx].hand.length >= MERCY_LIMIT) {
                const { g: g2, messages } = checkMercy(g);
                g = g2;
                messages.forEach(m => msgFn(m));
                if (g.players[aiIdx].isOut) {
                    g.currentPlayerIdx = nextActivePlayer(aiIdx, g.direction, g.players);
                    return g;
                }
            }
        }

        if (found) {
            g.discardPile = [...g.discardPile, found];
            if (found.color === 'wild') {
                if (found.type === 'wild_roulette') {
                    g.currentColor = COLORS[Math.floor(Math.random() * 4)];
                } else {
                    g.currentColor = aiSelectColor(g.players[aiIdx].hand);
                }
            } else {
                g.currentColor = found.color;
            }
            if (drawn.length > 0) {
                msgFn(`${g.players[aiIdx].name} draws ${drawn.length} card${drawn.length !== 1 ? 's' : ''} then plays ${getCardSymbol(found)}`);
            } else {
                msgFn(`${g.players[aiIdx].name} draws and plays ${getCardSymbol(found)}`);
            }
            g = applyCardEffectsMulti(g, found, aiIdx, msgFn);
        } else {
            if (drawn.length > 0) {
                msgFn(`${g.players[aiIdx].name} draws ${drawn.length} card${drawn.length !== 1 ? 's' : ''}, can't play`);
            } else {
                msgFn(`${g.players[aiIdx].name} can't draw — pile empty`);
            }
            g.currentPlayerIdx = nextActivePlayer(aiIdx, g.direction, g.players);
        }

        return g;
    }

    function checkAndApplyMercy(g) {
        if (g.mode !== 'nomercy') return g;
        const { g: g2, messages } = checkMercy(g);
        messages.forEach(m => showMsg(m));
        return g2;
    }

    function checkWildCallAi(g, aiIdx) {
        if (g.players[aiIdx].hand.length === 1) {
            if (Math.random() < 0.80) {
                setTimeout(() => showMsg(`${g.players[aiIdx].name} calls WILD! ⚡`), 400);
            } else {
                // Penalty: draw 2
                const result = drawCards(g, 2);
                g = result.g;
                g.players[aiIdx].hand = [...g.players[aiIdx].hand, ...result.drawn];
                setTimeout(() => showMsg(`${g.players[aiIdx].name} forgot WILD! +2 penalty ⚡`), 400);
            }
        }
        return g;
    }

    /**
     * Apply card effects for 4-player game.
     * Mutates g (should already be a deep copy).
     */
    function applyCardEffectsMulti(g, card, playerIdx, msgFn) {
        const player = g.players[playerIdx];
        const activePlayers = countActivePlayers(g.players);

        // Discard All — dump same-color cards
        if (card.type === 'discard_all') {
            const extra = g.players[playerIdx].hand.filter(c => c.color === card.color);
            g.players[playerIdx].hand = g.players[playerIdx].hand.filter(c => c.color !== card.color);
            g.discardPile = [...g.discardPile, ...extra];
            msgFn(`${player.name} discards ${extra.length + 1} ${card.color} cards! ✕`);
            g.currentPlayerIdx = nextActivePlayer(playerIdx, g.direction, g.players);
            g = checkWildCallAi(g, playerIdx);
            return g;
        }

        switch (card.type) {
            case 'skip':
                msgFn(`${player.name} plays Skip!`);
                // Skip next active player
                g.currentPlayerIdx = nextActivePlayer(
                    nextActivePlayer(playerIdx, g.direction, g.players),
                    g.direction, g.players
                );
                break;

            case 'reverse':
                g.direction *= -1;
                if (activePlayers === 2) {
                    // Acts like skip in 2-player
                    msgFn(`${player.name} plays Reverse! (acts as skip)`);
                    g.currentPlayerIdx = nextActivePlayer(
                        nextActivePlayer(playerIdx, g.direction, g.players),
                        g.direction, g.players
                    );
                } else {
                    msgFn(`${player.name} plays Reverse!`);
                    g.currentPlayerIdx = nextActivePlayer(playerIdx, g.direction, g.players);
                }
                break;

            case 'skip_all':
                msgFn(`${player.name} plays Skip Everyone! Your turn again!`);
                g.currentPlayerIdx = playerIdx; // Play again
                break;

            case 'draw2':
            case 'draw4':
                if (g.mode === 'nomercy') {
                    g.drawStack += getDrawAmount(card);
                    msgFn(`${player.name} plays ${getCardSymbol(card)}! Stack: +${g.drawStack}`);
                    g.currentPlayerIdx = nextActivePlayer(playerIdx, g.direction, g.players);
                } else {
                    const amt = getDrawAmount(card);
                    const victimIdx = nextActivePlayer(playerIdx, g.direction, g.players);
                    const result = drawCards(g, amt);
                    g = result.g;
                    g.players[victimIdx].hand = [...g.players[victimIdx].hand, ...result.drawn];
                    msgFn(`${g.players[victimIdx].name} draws ${result.drawn.length}!`);
                    // Skip victim, go to player after victim
                    g.currentPlayerIdx = nextActivePlayer(victimIdx, g.direction, g.players);
                    g = checkAndApplyMercy(g);
                }
                break;

            case 'wild':
                msgFn(`${player.name} plays Wild → ${g.currentColor.toUpperCase()}`);
                g.currentPlayerIdx = nextActivePlayer(playerIdx, g.direction, g.players);
                break;

            case 'wild_draw4':
                if (g.mode === 'classic') {
                    const victimIdx = nextActivePlayer(playerIdx, g.direction, g.players);
                    const result = drawCards(g, 4);
                    g = result.g;
                    g.players[victimIdx].hand = [...g.players[victimIdx].hand, ...result.drawn];
                    msgFn(`${g.players[victimIdx].name} draws 4!`);
                    g.currentPlayerIdx = nextActivePlayer(victimIdx, g.direction, g.players);
                    g = checkAndApplyMercy(g);
                }
                break;

            case 'wild_rev_draw4':
                g.direction *= -1;
                if (g.mode === 'nomercy') {
                    g.drawStack += 4;
                    if (activePlayers === 2) {
                        msgFn(`${player.name} plays Wild Reverse +4! (reverse in 2p — ${player.name} draws 4!)`);
                    } else {
                        msgFn(`${player.name} plays Wild Reverse +4! Direction reversed, stack: +${g.drawStack}`);
                    }
                    g.currentPlayerIdx = nextActivePlayer(playerIdx, g.direction, g.players);
                }
                break;

            case 'wild_draw6':
                if (g.mode === 'nomercy') {
                    g.drawStack += 6;
                    msgFn(`${player.name} plays Wild +6! Stack: +${g.drawStack}`);
                    g.currentPlayerIdx = nextActivePlayer(playerIdx, g.direction, g.players);
                }
                break;

            case 'wild_draw10':
                if (g.mode === 'nomercy') {
                    g.drawStack += 10;
                    msgFn(`${player.name} plays Wild +10! Stack: +${g.drawStack} 🔥`);
                    g.currentPlayerIdx = nextActivePlayer(playerIdx, g.direction, g.players);
                }
                break;

            case 'wild_roulette': {
                // Next player is the roulette victim
                const victimIdx = nextActivePlayer(playerIdx, g.direction, g.players);
                const victim = g.players[victimIdx];

                // AI victim selects a random color, then draws until finding it
                if (!victim.isHuman) {
                    const chosenColor = COLORS[Math.floor(Math.random() * 4)];
                    g.currentColor = chosenColor;
                    let revealed = [];
                    let foundCard = null;
                    for (let i = 0; i < 50; i++) {
                        g = ensureDrawPile(g);
                        if (g.drawPile.length === 0) break;
                        const c = g.drawPile[0];
                        g.drawPile = g.drawPile.slice(1);
                        revealed.push(c);
                        if (c.color === chosenColor) { foundCard = c; break; }
                    }
                    g.players[victimIdx].hand = [...g.players[victimIdx].hand, ...revealed];
                    msgFn(`${victim.name} picks ${chosenColor.toUpperCase()}, draws ${revealed.length} card${revealed.length !== 1 ? 's' : ''}! 🎲`);
                    g = checkAndApplyMercy(g);
                    // Skip victim
                    g.currentPlayerIdx = nextActivePlayer(victimIdx, g.direction, g.players);
                } else {
                    // Human is the victim — need roulette_pick phase
                    // We'll handle this externally
                    msgFn(`${player.name} plays Color Roulette on you! Pick a color! 🎲`);
                    g.currentPlayerIdx = victimIdx; // Set to human for roulette handling
                    // The caller must set phase to 'roulette_pick'
                    g._rouletteVictim = true;
                }
                break;
            }

            case 'number':
                if (g.mode === 'nomercy') {
                    if (card.value === 7) {
                        // 7: swap hands with a chosen player
                        if (player.isHuman) {
                            // Need swap_pick phase — handled externally
                            g._needSwapPick = true;
                            msgFn(`${player.name} plays 7! Choose someone to swap hands with! 🔄`);
                        } else {
                            const targetIdx = aiSelectSwapTarget(playerIdx, g.players);
                            const tmp = g.players[playerIdx].hand;
                            g.players[playerIdx].hand = [...g.players[targetIdx].hand];
                            g.players[targetIdx].hand = [...tmp];
                            msgFn(`${player.name} plays 7! Swaps hands with ${g.players[targetIdx].name}! 🔄`);
                        }
                        g.currentPlayerIdx = nextActivePlayer(playerIdx, g.direction, g.players);
                        break;
                    }
                    if (card.value === 0) {
                        // 0: all hands pass in direction of play
                        const activeList = [];
                        let idx = playerIdx;
                        for (let i = 0; i < g.players.length; i++) {
                            if (!g.players[idx].isOut) activeList.push(idx);
                            idx = ((idx + g.direction) % g.players.length + g.players.length) % g.players.length;
                        }
                        if (activeList.length >= 2) {
                            const hands = activeList.map(i => [...g.players[i].hand]);
                            for (let i = 0; i < activeList.length; i++) {
                                const nextI = (i + 1) % activeList.length;
                                g.players[activeList[nextI]].hand = hands[i];
                            }
                            msgFn(`${player.name} plays 0! All hands rotate! 🔄`);
                        }
                        g.currentPlayerIdx = nextActivePlayer(playerIdx, g.direction, g.players);
                        break;
                    }
                }
                // Regular number
                g.currentPlayerIdx = nextActivePlayer(playerIdx, g.direction, g.players);
                break;

            default:
                g.currentPlayerIdx = nextActivePlayer(playerIdx, g.direction, g.players);
                break;
        }

        g = checkWildCallAi(g, playerIdx);
        g = checkAndApplyMercy(g);
        return g;
    }

    function deepCopy(g) {
        return {
            ...g,
            players: g.players.map(p => ({ ...p, hand: [...p.hand] })),
            drawPile: [...g.drawPile],
            discardPile: [...g.discardPile],
        };
    }

    function advanceTurn() {
        setTurnKey(k => k + 1);
    }

    // ==================== START / RESET ====================

    function startGame(selectedMode) {
        gameAudio.init();
        gameAudio.resume();
        const g = initializeGame(selectedMode);
        setGame(g);
        setPhase('playing');
        setScore(0);
        setMessages([]);
        setWildActive(false);
        setTurnKey(0);
        pendingCardRef.current = null;
        pendingPlayerRef.current = null;
        showMsg(selectedMode === 'nomercy'
            ? 'No Mercy! Stacking, 7-swap, 0-pass, Mercy Rule & more!' : 'Classic mode — match colors & numbers!', 4000);
    }

    function resetGame() {
        clearTimeout(aiTimeoutRef.current);
        clearTimeout(wildTimeoutRef.current);
        setGame(null);
        setPhase('menu');
        setMessages([]);
        setAiThinking(false);
        setWildActive(false);
        setScore(0);
        pendingCardRef.current = null;
        pendingPlayerRef.current = null;
    }

    // ==================== WILD! CALL ====================

    function triggerWildCheck() {
        setWildActive(true);
        wildTimeoutRef.current = setTimeout(() => {
            setWildActive(false);
            showMsg('Forgot to call WILD! +2 penalty! ⚡');
            gameAudio.play('wrong');
            setGame(prev => {
                if (!prev || prev.players[0].hand.length !== 1) return prev;
                let g = deepCopy(prev);
                const result = drawCards(g, 2);
                g = result.g;
                g.players[0].hand = [...g.players[0].hand, ...result.drawn];
                return g;
            });
        }, 4000);
    }

    function callWild() {
        if (!wildActive) return;
        clearTimeout(wildTimeoutRef.current);
        setWildActive(false);
        showMsg('WILD! ⚡');
        gameAudio.play('score');
    }

    // ==================== PLAYER ACTIONS ====================

    function handlePlayerPlay(cardIndex) {
        if (!game || game.currentPlayerIdx !== 0 || phase !== 'playing' || aiThinking || wildActive) return;

        const card = game.playerHand?.[cardIndex] ?? game.players[0].hand[cardIndex];
        const topCard = game.discardPile[game.discardPile.length - 1];

        if (!canPlayCard(card, topCard, game.currentColor, game.drawStack, game.mode)) {
            showMsg("Can't play that card!", 1500);
            gameAudio.play('wrong');
            return;
        }

        gameAudio.play('click');

        // Save for pending actions
        pendingCardRef.current = { card, cardIndex };

        // Wild cards need color pick
        if (card.color === 'wild') {
            // Remove card, place on discard, then ask for color
            setGame(prev => {
                const g = deepCopy(prev);
                g.players[0].hand = g.players[0].hand.filter((_, i) => i !== cardIndex);
                g.discardPile = [...g.discardPile, card];
                g.hasDrawn = false;
                return g;
            });
            setPhase('color_pick');
            return;
        }

        // Colored card — play immediately
        playColoredCard(card, cardIndex);
    }

    function playColoredCard(card, cardIndex) {
        setGame(prev => {
            let g = deepCopy(prev);
            g.players[0].hand = g.players[0].hand.filter((_, i) => i !== cardIndex);
            g.discardPile = [...g.discardPile, card];
            g.currentColor = card.color;
            g.hasDrawn = false;

            // Check for swap_pick or other special
            g = applyCardEffectsMulti(g, card, 0, showMsg);

            if (g._needSwapPick) {
                delete g._needSwapPick;
                pendingPlayerRef.current = 0;
                // We need to set phase to swap_pick AFTER state update
                setTimeout(() => setPhase('swap_pick'), 50);
                return g;
            }

            return g;
        });

        // Check if player has 1 card → trigger WILD! check
        setTimeout(() => {
            setGame(prev => {
                if (!prev) return prev;
                if (prev.players[0].hand.length === 1) {
                    triggerWildCheck();
                }
                return prev;
            });
        }, 100);

        advanceTurn();
    }

    function chooseColor(color) {
        const { card } = pendingCardRef.current || {};
        setPhase('playing');
        pendingCardRef.current = null;

        setGame(prev => {
            if (!prev) return prev;
            let g = deepCopy(prev);
            g.currentColor = color;

            if (card) {
                g = applyCardEffectsMulti(g, card, 0, showMsg);

                if (g._rouletteVictim) {
                    delete g._rouletteVictim;
                    // Roulette on AI is already handled in applyCardEffectsMulti
                }

                if (g._needSwapPick) {
                    delete g._needSwapPick;
                    pendingPlayerRef.current = 0;
                    setTimeout(() => setPhase('swap_pick'), 50);
                    return g;
                }
            }

            return g;
        });

        showMsg(`Color → ${color.toUpperCase()}`);

        // WILD! check
        setTimeout(() => {
            setGame(prev => {
                if (!prev) return prev;
                if (prev.players[0].hand.length === 1) {
                    triggerWildCheck();
                }
                return prev;
            });
        }, 100);

        advanceTurn();
    }

    function chooseSwapTarget(targetIdx) {
        setPhase('playing');
        setGame(prev => {
            if (!prev) return prev;
            const g = deepCopy(prev);
            const tmp = [...g.players[0].hand];
            g.players[0].hand = [...g.players[targetIdx].hand];
            g.players[targetIdx].hand = tmp;
            showMsg(`Swapped hands with ${g.players[targetIdx].name}! 🔄`);
            return g;
        });
        advanceTurn();
    }

    function chooseRouletteColor(color) {
        setPhase('playing');
        setGame(prev => {
            if (!prev) return prev;
            let g = deepCopy(prev);
            g.currentColor = color;

            // Draw until finding that color
            let revealed = [];
            for (let i = 0; i < 50; i++) {
                g = ensureDrawPile(g);
                if (g.drawPile.length === 0) break;
                const c = g.drawPile[0];
                g.drawPile = g.drawPile.slice(1);
                revealed.push(c);
                if (c.color === color) break;
            }
            g.players[0].hand = [...g.players[0].hand, ...revealed];
            showMsg(`Roulette: picked ${color.toUpperCase()}, drew ${revealed.length} card${revealed.length !== 1 ? 's' : ''}! 🎲`);
            g = checkAndApplyMercy(g);
            // Skip human's turn (roulette victim loses turn)
            g.currentPlayerIdx = nextActivePlayer(0, g.direction, g.players);
            return g;
        });
        advanceTurn();
    }

    function handlePlayerDraw() {
        if (!game || game.currentPlayerIdx !== 0 || phase !== 'playing' || aiThinking || wildActive) return;
        if (game.hasDrawn && game.mode === 'classic') return;

        gameAudio.play('hit');

        // Draw stack penalty (No Mercy)
        if (game.drawStack > 0 && game.mode === 'nomercy') {
            const count = game.drawStack;
            setGame(prev => {
                let g = deepCopy(prev);
                const result = drawCards(g, count);
                g = result.g;
                g.players[0].hand = [...g.players[0].hand, ...result.drawn];
                g.drawStack = 0;
                showMsg(`Drew ${result.drawn.length} cards from stack!`);
                g = checkAndApplyMercy(g);
                g.currentPlayerIdx = nextActivePlayer(0, g.direction, g.players);
                return g;
            });
            advanceTurn();
            return;
        }

        if (game.mode === 'nomercy') {
            // Draw until playable
            setGame(prev => {
                let g = deepCopy(prev);
                let drawn = [];
                let found = null;
                for (let i = 0; i < 50; i++) {
                    g = ensureDrawPile(g);
                    if (g.drawPile.length === 0) break;
                    const card = g.drawPile[0];
                    g.drawPile = g.drawPile.slice(1);
                    const topCard = g.discardPile[g.discardPile.length - 1];
                    if (canPlayCard(card, topCard, g.currentColor, 0, g.mode)) {
                        found = card;
                        break;
                    }
                    drawn.push(card);
                    g.players[0].hand = [...g.players[0].hand, card];
                    if (g.players[0].hand.length >= MERCY_LIMIT) {
                        g = checkAndApplyMercy(g);
                        if (g.players[0].isOut) {
                            g.currentPlayerIdx = nextActivePlayer(0, g.direction, g.players);
                            return g;
                        }
                    }
                }

                if (found) {
                    if (drawn.length > 0) {
                        showMsg(`Drew ${drawn.length} card${drawn.length !== 1 ? 's' : ''} then found a playable one!`);
                    }
                    // Auto-play the found card
                    if (found.color === 'wild') {
                        // Need color pick
                        g.discardPile = [...g.discardPile, found];
                        pendingCardRef.current = { card: found, cardIndex: -1 };
                        setTimeout(() => setPhase('color_pick'), 50);
                        return g;
                    }

                    g.discardPile = [...g.discardPile, found];
                    g.currentColor = found.color;
                    g = applyCardEffectsMulti(g, found, 0, showMsg);

                    if (g._needSwapPick) {
                        delete g._needSwapPick;
                        pendingPlayerRef.current = 0;
                        setTimeout(() => setPhase('swap_pick'), 50);
                        return g;
                    }
                } else {
                    if (drawn.length > 0) {
                        showMsg(`Drew ${drawn.length} card${drawn.length !== 1 ? 's' : ''}, none playable`);
                    } else {
                        showMsg('Draw pile empty!');
                    }
                    g.currentPlayerIdx = nextActivePlayer(0, g.direction, g.players);
                }

                return g;
            });
            advanceTurn();
        } else {
            // Classic: draw one
            setGame(prev => {
                let g = deepCopy(prev);
                const result = drawCards(g, 1);
                g = result.g;
                if (result.drawn.length > 0) {
                    g.players[0].hand = [...g.players[0].hand, result.drawn[0]];
                    g.hasDrawn = true;
                    showMsg('Drew a card');
                } else {
                    showMsg('Draw pile empty!');
                }
                return g;
            });
        }
    }

    function handlePlayerPass() {
        if (!game || game.currentPlayerIdx !== 0 || !game.hasDrawn) return;
        setGame(prev => {
            const g = deepCopy(prev);
            g.hasDrawn = false;
            g.currentPlayerIdx = nextActivePlayer(0, g.direction, g.players);
            return g;
        });
        showMsg('Turn passed');
        advanceTurn();
    }

    // ==================== AUTO-PASS for human when roulette victim  ====================
    useEffect(() => {
        if (!game || phase !== 'playing') return;
        const current = game.players[game.currentPlayerIdx];
        if (!current || !current.isHuman || current.isOut) return;

        // Check if roulette victim flag is set (AI played roulette on human)
        if (game._rouletteVictim) {
            setGame(prev => {
                if (!prev) return prev;
                const g = deepCopy(prev);
                delete g._rouletteVictim;
                return g;
            });
            setPhase('roulette_pick');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game?.currentPlayerIdx, phase, turnKey]);

    // ==================== DERIVED STATE ====================

    const topCard = game?.discardPile?.[game.discardPile.length - 1];
    const isPlayerTurn = game?.currentPlayerIdx === 0 && phase === 'playing' && !game?.players[0]?.isOut;

    const playableIndices = useMemo(() => {
        if (!game || !isPlayerTurn || wildActive) return new Set();
        const top = game.discardPile[game.discardPile.length - 1];
        const indices = new Set();
        game.players[0].hand.forEach((card, i) => {
            if (canPlayCard(card, top, game.currentColor, game.drawStack, game.mode)) {
                indices.add(i);
            }
        });
        return indices;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game?.players?.[0]?.hand, game?.currentColor, game?.drawStack, isPlayerTurn, wildActive]);

    const canDraw = isPlayerTurn && !wildActive && !(game?.hasDrawn && game?.mode === 'classic' && playableIndices.size > 0);
    const mustDrawStack = isPlayerTurn && game?.drawStack > 0 && game?.mode === 'nomercy';

    // ==================== RENDER: MODE SELECT ====================

    if (phase === 'menu') {
        return (
            <div className="space-y-8">
                <div className="flex items-center gap-4">
                    <Link to="/games" className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        <ArrowLeft size={24} className="text-gray-400" />
                    </Link>
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl sm:text-4xl font-bold"
                        >
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-amber-500">
                                Wild Cards ⚡
                            </span>
                        </motion.h1>
                        <p className="text-gray-500 mt-1 text-sm">1 vs 3 AI opponents — be first to empty your hand!</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto mt-12">
                    {/* Classic */}
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        onClick={() => startGame('classic')}
                        className="glass-panel rounded-2xl p-8 text-left hover:scale-[1.02] transition-all duration-300 border border-transparent hover:border-blue-400/30 group"
                    >
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <span className="text-3xl">🃏</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Classic</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Standard rules with 4 players. Match colour or number, use action cards to disrupt opponents.
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {['Skip', 'Reverse', '+2', 'Wild', 'Wild +4'].map(t => (
                                <span key={t} className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full">{t}</span>
                            ))}
                        </div>
                    </motion.button>

                    {/* No Mercy */}
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        onClick={() => startGame('nomercy')}
                        className="glass-panel rounded-2xl p-8 text-left hover:scale-[1.02] transition-all duration-300 border border-transparent hover:border-red-400/30 group"
                    >
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <span className="text-3xl">🔥</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No Mercy</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Brutal variant! Stack draws, 7-swap, 0-pass, Discard All, Mercy Rule (25+ cards = OUT)!
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {['Stack +2/+4/+6/+10', '7-Swap', '0-Pass', 'Draw Until Play', 'Mercy KO', 'Skip All', 'Discard All', 'Roulette'].map(t => (
                                <span key={t} className="px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded-full">{t}</span>
                            ))}
                        </div>
                    </motion.button>
                </div>

                {/* Rules */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="max-w-2xl mx-auto glass-panel rounded-xl p-6 mt-8"
                >
                    <h3 className="text-white font-bold mb-3">How to Play</h3>
                    <ul className="text-gray-400 text-sm space-y-1.5">
                        <li>• Match the top card by <span className="text-white">colour</span>, <span className="text-white">number</span>, or <span className="text-white">symbol</span></li>
                        <li>• <span className="text-white">Wild</span> cards let you choose any colour</li>
                        <li>• <span className="text-white">Skip</span> skips the next player, <span className="text-white">Reverse</span> changes direction</li>
                        <li>• Draw cards force the next player to pick up cards</li>
                        <li>• Call <span className="text-yellow-400">WILD!</span> when you have one card left or draw 2 penalty!</li>
                        <li>• First to empty their hand wins!</li>
                    </ul>
                    <h4 className="text-red-400 font-bold mt-4 mb-2">No Mercy Extras</h4>
                    <ul className="text-gray-400 text-sm space-y-1.5">
                        <li>• <span className="text-red-300">Stacking</span> — counter draw cards with equal or higher draws</li>
                        <li>• <span className="text-red-300">7 = Swap</span> — swap hands with any player</li>
                        <li>• <span className="text-red-300">0 = Pass</span> — all hands rotate in play direction</li>
                        <li>• <span className="text-red-300">Mercy Rule</span> — 25+ cards = knocked out!</li>
                        <li>• <span className="text-red-300">Draw Until Playable</span> — must keep drawing until you find a card you can play</li>
                        <li>• <span className="text-red-300">Discard All</span> — dump every card of that colour</li>
                        <li>• <span className="text-red-300">Skip Everyone</span> — take another turn</li>
                        <li>• <span className="text-red-300">Color Roulette</span> — victim picks a colour, draws until they find it</li>
                    </ul>
                </motion.div>
            </div>
        );
    }

    // ==================== RENDER: GAME BOARD ====================

    const directionLabel = game?.direction === 1 ? '→ Clockwise' : '← Counter-clockwise';
    const currentPlayerName = game?.players[game.currentPlayerIdx]?.name || '';
    const aiPlayers = game?.players?.slice(1) || [];

    return (
        <div className="space-y-3 sm:space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <button onClick={resetGame} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                        <ArrowLeft size={18} className="text-gray-400" />
                    </button>
                    <h1 className="text-lg sm:text-xl font-bold">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-amber-500">
                            Wild Cards
                        </span>
                    </h1>
                    {game?.mode === 'nomercy' && <span className="text-red-400 text-xs font-bold">NO MERCY</span>}
                    <span className="text-gray-600 text-xs hidden sm:inline">{directionLabel}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <button onClick={() => gameAudio.toggle()} className={`p-1.5 rounded-lg transition-colors ${audioEnabled ? 'bg-primary/20 text-primary' : 'bg-white/10 text-gray-400'}`}>
                        {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    </button>
                    <button onClick={resetGame} className="p-1.5 rounded-lg bg-white/10 text-gray-400 hover:bg-white/20 transition-colors">
                        <RotateCcw size={16} />
                    </button>
                    <button onClick={() => { setViewingLeaderboard(true); setShowLeaderboard(true); }} className="p-1.5 rounded-lg bg-white/10 text-gray-400 hover:bg-white/20 transition-colors">
                        <Trophy size={16} />
                    </button>
                </div>
            </div>

            {/* AI Opponents */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {aiPlayers.map((ai, idx) => {
                    const isCurrentTurn = game?.currentPlayerIdx === ai.id;
                    return (
                        <div
                            key={ai.id}
                            className={`glass-panel rounded-xl p-2 sm:p-3 transition-all ${ai.isOut ? 'opacity-40' : ''} ${isCurrentTurn ? 'ring-1 ring-yellow-400/50' : ''}`}
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <span className={`text-xs sm:text-sm font-bold ${ai.isOut ? 'text-red-400 line-through' : isCurrentTurn ? 'text-yellow-400' : 'text-gray-300'}`}>
                                    {ai.name}
                                </span>
                                <span className="text-gray-500 text-xs">
                                    {ai.isOut ? '💀' : `${ai.hand.length} 🃏`}
                                </span>
                            </div>
                            {!ai.isOut && (
                                <div className="flex overflow-hidden">
                                    {ai.hand.slice(0, 15).map((card, i) => (
                                        <div key={card.id} className="flex-shrink-0" style={{ marginLeft: i > 0 ? '-4px' : '0' }}>
                                            <GameCard card={card} faceDown size="small" />
                                        </div>
                                    ))}
                                    {ai.hand.length > 15 && (
                                        <span className="text-gray-500 text-[10px] self-center ml-1">+{ai.hand.length - 15}</span>
                                    )}
                                </div>
                            )}
                            {ai.isOut && <p className="text-red-400/70 text-[10px]">Knocked out!</p>}
                            {isCurrentTurn && !ai.isOut && <span className="text-yellow-400 text-[10px] animate-pulse">Thinking…</span>}
                        </div>
                    );
                })}
            </div>

            {/* Centre: piles, color, draw stack */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 py-2">
                {/* Direction indicator */}
                <div className="flex flex-col items-center gap-0.5">
                    <span className="text-gray-500 text-[10px]">Direction</span>
                    <span className="text-lg">{game?.direction === 1 ? '🔃' : '🔄'}</span>
                    <span className="text-gray-500 text-[10px]">{game?.direction === 1 ? 'CW' : 'CCW'}</span>
                </div>

                {/* Current Colour */}
                <div className="flex flex-col items-center gap-0.5">
                    <span className="text-gray-500 text-[10px]">Color</span>
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full ${COLOR_MAP[game?.currentColor]?.bg} shadow-xl ${COLOR_MAP[game?.currentColor]?.glow} transition-colors duration-300`} />
                    <span className={`text-[10px] font-bold capitalize ${COLOR_MAP[game?.currentColor]?.text}`}>{game?.currentColor}</span>
                </div>

                {/* Draw Pile */}
                <div className="flex flex-col items-center gap-0.5">
                    <span className="text-gray-500 text-[10px]">Draw</span>
                    <button
                        onClick={(canDraw || mustDrawStack) ? handlePlayerDraw : undefined}
                        className={`transition-transform ${(canDraw || mustDrawStack) ? 'hover:scale-105 cursor-pointer' : 'cursor-default opacity-80'}`}
                        disabled={!canDraw && !mustDrawStack}
                    >
                        <GameCard card={{}} faceDown size="large" />
                    </button>
                    <span className="text-gray-500 text-[10px]">{game?.drawPile.length} left</span>
                </div>

                {/* Discard Pile */}
                <div className="flex flex-col items-center gap-0.5">
                    <span className="text-gray-500 text-[10px]">Discard</span>
                    {topCard && <GameCard card={topCard} size="large" mode={game?.mode} />}
                    <span className="text-gray-500 text-[10px]">{game?.discardPile.length} cards</span>
                </div>

                {/* Draw Stack */}
                {game?.drawStack > 0 && (
                    <div className="flex flex-col items-center gap-0.5">
                        <span className="text-red-400 text-[10px] font-bold">STACK</span>
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center animate-pulse">
                            <span className="text-red-400 text-xl font-black">+{game.drawStack}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Messages */}
            <div className="min-h-[28px] text-center">
                <AnimatePresence mode="wait">
                    {messages.length > 0 && (
                        <motion.div
                            key={messages[messages.length - 1]}
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="inline-block px-3 py-1 rounded-full bg-white/10 text-white text-xs sm:text-sm font-medium backdrop-blur-sm"
                        >
                            {messages[messages.length - 1]}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Turn indicator */}
            <div className="text-center min-h-[20px]">
                {isPlayerTurn && !wildActive && (
                    <span className="text-primary text-xs sm:text-sm font-medium">
                        {mustDrawStack
                            ? `Stack a draw card (≥${getDrawAmount(topCard)}) or draw ${game.drawStack}!`
                            : game?.hasDrawn
                                ? 'Play a card or pass'
                                : game?.mode === 'nomercy'
                                    ? playableIndices.size > 0 ? 'Your turn — play a card' : 'No playable cards — draw!'
                                    : 'Your turn — play a card or draw'}
                    </span>
                )}
                {game?.players[0]?.isOut && (
                    <span className="text-red-400 text-sm font-bold">You've been knocked out! 💀</span>
                )}
                {game?.currentPlayerIdx !== 0 && phase === 'playing' && !game?.players[0]?.isOut && (
                    <span className="text-gray-500 text-xs">{currentPlayerName}'s turn…</span>
                )}
            </div>

            {/* Player Hand */}
            <div className={`glass-panel rounded-xl p-2 sm:p-3 ${game?.currentPlayerIdx === 0 && phase === 'playing' ? 'ring-1 ring-primary/30' : ''}`}>
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-gray-300 text-xs sm:text-sm font-medium">
                        Your Hand — {game?.players[0].hand.length} card{game?.players[0].hand.length !== 1 ? 's' : ''}
                        {game?.mode === 'nomercy' && game?.players[0].hand.length >= 20 && (
                            <span className="text-red-400 ml-2">⚠️ {MERCY_LIMIT - game.players[0].hand.length} until knockout!</span>
                        )}
                    </span>
                    <div className="flex gap-2">
                        {game?.hasDrawn && isPlayerTurn && game?.mode === 'classic' && (
                            <button
                                onClick={handlePlayerPass}
                                className="px-2.5 py-1 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 text-xs font-medium transition-colors"
                            >
                                Pass Turn
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex gap-1 sm:gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/20">
                    {game?.players[0].hand.map((card, i) => (
                        <motion.div
                            key={card.id}
                            layout
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex-shrink-0"
                        >
                            <GameCard
                                card={card}
                                playable={playableIndices.has(i) && !wildActive}
                                onClick={() => handlePlayerPlay(i)}
                                mode={game?.mode}
                            />
                        </motion.div>
                    ))}
                    {game?.players[0].hand.length === 0 && (
                        <span className="text-gray-500 text-sm py-4">No cards!</span>
                    )}
                </div>
            </div>

            {/* WILD! Button */}
            <AnimatePresence>
                {wildActive && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="flex justify-center"
                    >
                        <button
                            onClick={callWild}
                            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black text-2xl hover:scale-110 transition-transform shadow-2xl shadow-yellow-500/50 animate-pulse"
                        >
                            ⚡ WILD! ⚡
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Colour Picker Overlay */}
            <AnimatePresence>
                {phase === 'color_pick' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
                        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} className="glass-panel rounded-2xl p-6 sm:p-8 max-w-xs w-full mx-4">
                            <h3 className="text-white text-lg font-bold text-center mb-5">Choose a Colour</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {COLORS.map(color => (
                                    <button key={color} onClick={() => chooseColor(color)} className={`${COLOR_MAP[color].bg} rounded-xl p-4 ${COLOR_MAP[color].cardText} font-bold text-base capitalize hover:scale-105 active:scale-95 transition-transform shadow-lg`}>
                                        {color}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Swap Target Picker (7 in No Mercy) */}
            <AnimatePresence>
                {phase === 'swap_pick' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
                        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} className="glass-panel rounded-2xl p-6 sm:p-8 max-w-sm w-full mx-4">
                            <h3 className="text-white text-lg font-bold text-center mb-2">🔄 Swap Hands!</h3>
                            <p className="text-gray-400 text-sm text-center mb-5">Choose a player to swap hands with</p>
                            <div className="space-y-3">
                                {game?.players.slice(1).filter(p => !p.isOut).map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => chooseSwapTarget(p.id)}
                                        className="w-full glass-panel rounded-xl p-4 text-left hover:scale-[1.02] transition-all border border-transparent hover:border-primary/30 flex items-center justify-between"
                                    >
                                        <span className="text-white font-bold">{p.name}</span>
                                        <span className="text-gray-400 text-sm">{p.hand.length} cards</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Roulette Color Picker (victim chooses) */}
            <AnimatePresence>
                {phase === 'roulette_pick' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
                        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} className="glass-panel rounded-2xl p-6 sm:p-8 max-w-xs w-full mx-4">
                            <h3 className="text-white text-lg font-bold text-center mb-2">🎲 Color Roulette!</h3>
                            <p className="text-gray-400 text-sm text-center mb-5">Pick a colour — you'll draw until you find it!</p>
                            <div className="grid grid-cols-2 gap-3">
                                {COLORS.map(color => (
                                    <button key={color} onClick={() => chooseRouletteColor(color)} className={`${COLOR_MAP[color].bg} rounded-xl p-4 ${COLOR_MAP[color].cardText} font-bold text-base capitalize hover:scale-105 active:scale-95 transition-transform shadow-lg`}>
                                        {color}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Game Over Overlay */}
            <AnimatePresence>
                {phase === 'game_over' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
                        <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 20 }} className="glass-panel rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
                            <div className="text-6xl mb-4">{game?.winner === 0 ? '🎉' : '😔'}</div>
                            <h2 className="text-2xl font-bold text-white mb-2">
                                {game?.winner === 0 ? 'You Win!' : `${game?.players[game?.winner]?.name} Wins!`}
                            </h2>
                            {game?.winner === 0 && score > 0 && (
                                <p className="text-primary text-lg font-bold mb-1">Score: {score}</p>
                            )}
                            <div className="text-gray-400 text-sm mb-6 space-y-0.5">
                                {game?.players.filter((_, i) => i !== game?.winner).map(p => (
                                    <p key={p.id}>{p.name}: {p.isOut ? 'Knocked out 💀' : `${p.hand.length} cards`}</p>
                                ))}
                            </div>
                            <div className="flex gap-3 justify-center flex-wrap">
                                {game?.winner === 0 && (
                                    <button
                                        onClick={() => setShowLeaderboard(true)}
                                        className="px-4 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 font-medium transition-colors flex items-center gap-2"
                                    >
                                        <Trophy size={16} /> Leaderboard
                                    </button>
                                )}
                                <button
                                    onClick={resetGame}
                                    className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 font-medium transition-colors flex items-center gap-2"
                                >
                                    <RotateCcw size={16} /> Play Again
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Leaderboard */}
            <LeaderboardModal
                isOpen={showLeaderboard}
                onClose={() => { setShowLeaderboard(false); setViewingLeaderboard(false); }}
                game="wild-cards"
                currentScore={viewingLeaderboard ? undefined : (game?.winner === 0 ? score : undefined)}
            />
        </div>
    );
}

export default CardBlitz;
