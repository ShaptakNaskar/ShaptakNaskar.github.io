// CardBlitz.jsx — UNO No Mercy (polished remake)
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Volume2, VolumeX, Trophy, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import gameAudio from '../../utils/audio';
import LeaderboardModal from '../LeaderboardModal';

/* ─────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────── */

const COLORS = ['red', 'blue', 'green', 'yellow'];
const PLAYER_NAMES = ['You', 'Blaze', 'Storm', 'Viper'];
const CARDS_PER_PLAYER = 7;
const MERCY_LIMIT = 25;
const WILD_CALL_MS = 4000;

// Colour style tokens used throughout the UI
const CS = {
    red:    { bg: 'bg-red-500',      grad: 'from-red-700 to-red-400',          text: 'text-white',     dim: 'text-red-400',     ring: 'ring-red-400',    border: 'border-red-500'    },
    blue:   { bg: 'bg-blue-600',     grad: 'from-blue-800 to-blue-500',         text: 'text-white',     dim: 'text-blue-400',    ring: 'ring-blue-400',   border: 'border-blue-500'   },
    green:  { bg: 'bg-emerald-600',  grad: 'from-emerald-800 to-emerald-400',   text: 'text-white',     dim: 'text-emerald-400', ring: 'ring-emerald-400',border: 'border-emerald-500'},
    yellow: { bg: 'bg-yellow-400',   grad: 'from-yellow-500 to-yellow-300',     text: 'text-gray-900',  dim: 'text-yellow-400',  ring: 'ring-yellow-300', border: 'border-yellow-400' },
};

/* ─────────────────────────────────────────────────────
   DECK HELPERS
───────────────────────────────────────────────────── */

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function createDeck(mode) {
    const deck = [];
    let id = 0;
    for (const color of COLORS) {
        deck.push({ id: id++, color, type: 'number', value: 0 });
        for (let v = 1; v <= 9; v++) {
            deck.push({ id: id++, color, type: 'number', value: v });
            deck.push({ id: id++, color, type: 'number', value: v });
        }
        if (mode === 'classic') {
            for (let i = 0; i < 2; i++) {
                deck.push({ id: id++, color, type: 'skip', value: null });
                deck.push({ id: id++, color, type: 'reverse', value: null });
                deck.push({ id: id++, color, type: 'draw2', value: null });
            }
        } else {
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
        for (let i = 0; i < 4; i++) {
            deck.push({ id: id++, color: 'wild', type: 'wild', value: null });
            deck.push({ id: id++, color: 'wild', type: 'wild_draw4', value: null });
        }
    } else {
        for (let i = 0; i < 4; i++) {
            deck.push({ id: id++, color: 'wild', type: 'wild_rev_draw4', value: null });
            deck.push({ id: id++, color: 'wild', type: 'wild_draw6', value: null });
            deck.push({ id: id++, color: 'wild', type: 'wild_draw10', value: null });
            deck.push({ id: id++, color: 'wild', type: 'wild_roulette', value: null });
        }
    }
    return deck;
}

/* ─────────────────────────────────────────────────────
   CARD UTILITIES
───────────────────────────────────────────────────── */

function getSymbol(card) {
    switch (card.type) {
        case 'number':        return String(card.value);
        case 'skip':          return '⊘';
        case 'reverse':       return '↺';
        case 'draw2':         return '+2';
        case 'draw4':         return '+4';
        case 'wild':          return '★';
        case 'wild_draw4':    return '+4';
        case 'wild_rev_draw4':return '↺+4';
        case 'wild_draw6':    return '+6';
        case 'wild_draw10':   return '+10';
        case 'wild_roulette': return '🎲';
        case 'discard_all':   return '✕';
        case 'skip_all':      return '⊘⊘';
        default:              return '?';
    }
}

function getLabel(card) {
    switch (card.type) {
        case 'skip':          return 'SKIP';
        case 'reverse':       return 'REV';
        case 'draw2':         return 'DRAW';
        case 'draw4':         return 'DRAW';
        case 'wild':          return 'WILD';
        case 'wild_draw4':    return 'WILD';
        case 'wild_rev_draw4':return 'WILD';
        case 'wild_draw6':    return 'WILD';
        case 'wild_draw10':   return 'WILD';
        case 'wild_roulette': return 'ROUL';
        case 'discard_all':   return 'DISC';
        case 'skip_all':      return 'SKIP';
        default:              return '';
    }
}

function getTooltip(card, mode) {
    switch (card.type) {
        case 'number':
            if (mode === 'nomercy' && card.value === 7) return '7 — Swap hands with any player';
            if (mode === 'nomercy' && card.value === 0) return '0 — All hands rotate in play direction';
            return '';
        case 'skip':          return 'Skip — Next player loses their turn';
        case 'reverse':       return 'Reverse — Change direction of play';
        case 'draw2':         return mode === 'nomercy' ? 'Draw 2 — Stackable! Counter with +2 or higher' : 'Draw 2 — Next player draws 2 & is skipped';
        case 'draw4':         return 'Draw 4 — Stackable! Next player draws 4';
        case 'wild':          return 'Wild — Choose any colour';
        case 'wild_draw4':    return 'Wild +4 — Choose colour, next player draws 4';
        case 'wild_rev_draw4':return 'Wild Reverse +4 — Reverse + next player draws 4 (stackable)';
        case 'wild_draw6':    return 'Wild +6 — Next player draws 6 (stackable)';
        case 'wild_draw10':   return 'Wild +10 — Next player draws 10 (stackable!) 🔥';
        case 'wild_roulette': return 'Colour Roulette — Victim picks a colour, draws until they find it';
        case 'discard_all':   return 'Discard All — Dump ALL cards of this colour from your hand';
        case 'skip_all':      return 'Skip Everyone — All others skip, you play again!';
        default:              return '';
    }
}

function isDrawCard(card) {
    return ['draw2', 'draw4', 'wild_draw4', 'wild_rev_draw4', 'wild_draw6', 'wild_draw10'].includes(card.type);
}

function getDrawAmt(card) {
    const map = { draw2: 2, draw4: 4, wild_draw4: 4, wild_rev_draw4: 4, wild_draw6: 6, wild_draw10: 10 };
    return map[card.type] ?? 0;
}

function canPlayCard(card, top, color, stack, mode) {
    if (stack > 0 && mode === 'nomercy') {
        return isDrawCard(card) && getDrawAmt(card) >= getDrawAmt(top);
    }
    if (card.color === 'wild') return true;
    if (card.color === color) return true;
    if (card.type === top.type) {
        return card.type === 'number' ? card.value === top.value : true;
    }
    return false;
}

function calcScore(players, winnerIdx) {
    let score = 0;
    players.forEach((p, i) => {
        if (i === winnerIdx) return;
        if (p.isOut) { score += 250; return; }
        p.hand.forEach(c => {
            if (c.type === 'number') score += c.value;
            else if (['skip', 'reverse', 'draw2', 'draw4', 'discard_all', 'skip_all'].includes(c.type)) score += 20;
            else score += 50;
        });
    });
    return score;
}

/* ─────────────────────────────────────────────────────
   GAME LOGIC HELPERS
───────────────────────────────────────────────────── */

function ensureDrawPile(g) {
    if (g.drawPile.length > 0) return g;
    if (g.discardPile.length <= 1) return g;
    const top = g.discardPile[g.discardPile.length - 1];
    return { ...g, drawPile: shuffle(g.discardPile.slice(0, -1)), discardPile: [top] };
}

function drawCards(g, n) {
    g = ensureDrawPile(g);
    const drawn = g.drawPile.slice(0, Math.min(n, g.drawPile.length));
    return { g: { ...g, drawPile: g.drawPile.slice(drawn.length) }, drawn };
}

function nextActive(idx, dir, players) {
    const n = players.length;
    for (let i = 0; i < n; i++) {
        idx = ((idx + dir) % n + n) % n;
        if (!players[idx].isOut) return idx;
    }
    return idx;
}

function countActive(players) {
    return players.filter(p => !p.isOut).length;
}

function applyMercyKnockouts(g) {
    const msgs = [];
    const players = g.players.map(p => {
        if (!p.isOut && p.hand.length >= MERCY_LIMIT) {
            msgs.push(`${p.name} has ${p.hand.length} cards — KNOCKED OUT! 💀`);
            return { ...p, isOut: true, hand: [] };
        }
        return p;
    });
    return { g: { ...g, players }, msgs };
}

function initGame(mode) {
    let deck = shuffle(createDeck(mode));
    const players = PLAYER_NAMES.map((name, i) => ({
        id: i, name,
        hand: deck.slice(i * CARDS_PER_PLAYER, (i + 1) * CARDS_PER_PLAYER),
        isHuman: i === 0,
        isOut: false,
    }));
    deck = deck.slice(CARDS_PER_PLAYER * 4);
    let fi = deck.findIndex(c => c.type === 'number');
    if (fi === -1) fi = 0;
    const first = deck[fi];
    deck = [...deck.slice(0, fi), ...deck.slice(fi + 1)];
    return {
        players,
        drawPile: deck,
        discardPile: [first],
        currentColor: first.color === 'wild' ? COLORS[Math.floor(Math.random() * 4)] : first.color,
        currentPlayerIdx: 0,
        direction: 1,
        drawStack: 0,
        mode,
        winner: null,
        hasDrawn: false,
    };
}

function deepCopy(g) {
    return {
        ...g,
        players: g.players.map(p => ({ ...p, hand: [...p.hand] })),
        drawPile: [...g.drawPile],
        discardPile: [...g.discardPile],
    };
}

/* ─────────────────────────────────────────────────────
   AI LOGIC
───────────────────────────────────────────────────── */

function aiPickCard(hand, top, color, stack, mode) {
    const playable = hand.filter(c => canPlayCard(c, top, color, stack, mode));
    if (!playable.length) return null;

    if (stack > 0) {
        const sorted = [...playable].sort((a, b) => getDrawAmt(b) - getDrawAmt(a));
        return { card: sorted[0], index: hand.indexOf(sorted[0]) };
    }

    const actions = playable.filter(c => !['number', 'wild', 'wild_draw4', 'wild_rev_draw4', 'wild_draw6', 'wild_draw10', 'wild_roulette'].includes(c.type));
    const numbers = playable.filter(c => c.type === 'number');
    const wilds = playable.filter(c => c.color === 'wild');
    let chosen;

    for (const da of actions.filter(c => c.type === 'discard_all')) {
        if (hand.filter(c => c.color === da.color && c.id !== da.id).length >= 2) { chosen = da; break; }
    }

    if (!chosen && actions.length && Math.random() > 0.25) chosen = actions[Math.floor(Math.random() * actions.length)];
    else if (!chosen && numbers.length) { const n = [...numbers].sort((a, b) => b.value - a.value); chosen = n[0]; }
    else if (!chosen && actions.length) chosen = actions[0];
    else if (!chosen) chosen = wilds[0] ?? playable[0];

    return { card: chosen, index: hand.indexOf(chosen) };
}

function aiPickColor(hand) {
    const cnt = { red: 0, blue: 0, green: 0, yellow: 0 };
    hand.forEach(c => { if (c.color !== 'wild') cnt[c.color]++; });
    return Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0];
}

function aiPickSwapTarget(aiIdx, players) {
    let best = -1, bestCnt = Infinity;
    players.forEach((p, i) => {
        if (i === aiIdx || p.isOut) return;
        if (p.hand.length < bestCnt) { bestCnt = p.hand.length; best = i; }
    });
    return best >= 0 ? best : nextActive(aiIdx, 1, players);
}

/* ─────────────────────────────────────────────────────
   GAME CARD COMPONENT
───────────────────────────────────────────────────── */

const CARD_SIZES = {
    sm: { wrap: 'w-7 h-[44px]',      sym: 'text-[8px]',   corner: 'text-[5px]'  },
    md: { wrap: 'w-[52px] h-[76px]',  sym: 'text-sm',      corner: 'text-[7px]'  },
    lg: { wrap: 'w-[68px] h-[100px]', sym: 'text-xl',      corner: 'text-[9px]'  },
};

function GameCard({ card, playable = false, faceDown = false, onClick, size = 'md', mode, isNew = false }) {
    const s = CARD_SIZES[size] || CARD_SIZES.md;

    if (faceDown) {
        return (
            <motion.div
                initial={isNew ? { opacity: 0, y: -12, scale: 0.8 } : false}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                className={`${s.wrap} rounded-xl flex-shrink-0 relative overflow-hidden border border-white/10 shadow-md cursor-default`}
                style={{ background: 'linear-gradient(145deg, #1a1035 0%, #2d1b69 55%, #1a1035 100%)' }}
            >
                <div className="absolute inset-0 opacity-[0.06]"
                    style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 8px)' }} />
                <div className="absolute inset-[16%] rounded border border-white/20 flex items-center justify-center">
                    <span className="text-white/20 font-black tracking-wider" style={{ fontSize: '0.36rem' }}>UNO</span>
                </div>
            </motion.div>
        );
    }

    const symbol  = getSymbol(card);
    const label   = getLabel(card);
    const tooltip = getTooltip(card, mode);
    const isWild  = card.color === 'wild';
    const cs      = isWild ? null : CS[card.color];

    return (
        <motion.div
            layoutId={`card-${card.id}`}
            layout="position"
            initial={isNew ? { opacity: 0, y: 30, scale: 0.7 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 24 }}
            whileHover={playable
                ? { y: -16, scale: 1.1, zIndex: 30, transition: { type: 'spring', stiffness: 600, damping: 22 } }
                : {}
            }
            whileTap={playable ? { scale: 0.93 } : {}}
            onClick={playable ? onClick : undefined}
            title={tooltip}
            className={[
                s.wrap,
                'rounded-xl flex-shrink-0 relative overflow-hidden select-none shadow-lg border border-white/25',
                playable
                    ? 'cursor-pointer ring-2 ring-white/60 hover:ring-white hover:shadow-2xl'
                    : 'cursor-default',
            ].join(' ')}
        >
            {/* Card background */}
            {isWild ? (
                <div className="absolute inset-0" style={{
                    background: 'conic-gradient(from 135deg at 50% 50%, #dc2626 0deg 90deg, #2563eb 90deg 180deg, #16a34a 180deg 270deg, #ca8a04 270deg 360deg)'
                }} />
            ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${cs.grad}`} />
            )}

            {/* Centre oval */}
            <div
                className="absolute inset-x-[10%] inset-y-[15%] rounded-[50%] flex items-center justify-center"
                style={{
                    background: isWild ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.22)',
                    transform: 'rotate(-20deg)',
                }}
            >
                <span
                    className={`font-black leading-none ${s.sym} ${isWild ? 'text-white' : cs.text}`}
                    style={{ display: 'block', transform: 'rotate(20deg)', textAlign: 'center' }}
                >
                    {symbol}
                </span>
            </div>

            {/* Top-left corner */}
            <div className={`absolute top-0.5 left-[3px] leading-none font-black ${s.corner} ${isWild ? 'text-white' : cs.text}`}>
                <div>{symbol}</div>
                {label && size !== 'sm' && <div className="opacity-60 mt-px" style={{ fontSize: '0.62em' }}>{label}</div>}
            </div>

            {/* Bottom-right corner */}
            <div className={`absolute bottom-0.5 right-[3px] leading-none font-black ${s.corner} rotate-180 ${isWild ? 'text-white' : cs.text}`}>
                <div>{symbol}</div>
                {label && size !== 'sm' && <div className="opacity-60 mt-px" style={{ fontSize: '0.62em' }}>{label}</div>}
            </div>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────────────
   COLOUR PICKER OVERLAY
───────────────────────────────────────────────────── */

function ColorPicker({ onSelect, title = 'Choose a Colour', subtitle = '' }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)' }}
        >
            <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 24 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 24 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                className="text-center px-4"
            >
                <h2 className="text-white text-2xl sm:text-3xl font-black mb-1 tracking-wide">{title}</h2>
                {subtitle && <p className="text-gray-400 text-sm mb-5">{subtitle}</p>}
                {!subtitle && <div className="mb-5" />}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {COLORS.map((color, i) => {
                        const c = CS[color];
                        return (
                            <motion.button
                                key={color}
                                initial={{ opacity: 0, scale: 0.5, rotate: -8 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                transition={{ delay: i * 0.07, type: 'spring', stiffness: 380, damping: 22 }}
                                whileHover={{ scale: 1.1, y: -5 }}
                                whileTap={{ scale: 0.92 }}
                                onClick={() => onSelect(color)}
                                className={`w-32 h-32 sm:w-36 sm:h-36 rounded-2xl bg-gradient-to-br ${c.grad} shadow-2xl border-2 border-white/30
                                    flex flex-col items-center justify-center gap-2 relative overflow-hidden`}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${c.grad} opacity-50 blur-2xl`} />
                                <span className={`relative z-10 font-black text-xl sm:text-2xl tracking-widest ${c.text}`}>
                                    {color.toUpperCase()}
                                </span>
                                {/* Mini card samples */}
                                <div className="relative z-10 flex gap-1">
                                    {[3, 7, '⊘'].map((v, j) => (
                                        <div key={j} className="w-5 h-7 rounded border border-white/35 bg-black/20 flex items-center justify-center">
                                            <span className={`${c.text} text-[9px] font-black`}>{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.button>
                        );
                    })}
                </div>
            </motion.div>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────────────
   WILD! CALL BUTTON (with countdown ring)
───────────────────────────────────────────────────── */

function WildCallButton({ onCall }) {
    const [progress, setProgress] = useState(1);
    const startRef = useRef(0);
    const R = 36;
    const circ = 2 * Math.PI * R;

    useEffect(() => {
        startRef.current = Date.now(); // set start time in effect, not during render
        const id = setInterval(() => {
            const p = Math.max(0, 1 - (Date.now() - startRef.current) / WILD_CALL_MS);
            setProgress(p);
            if (p === 0) clearInterval(id);
        }, 40);
        return () => clearInterval(id);
    }, []);

    const ringColor = progress > 0.5 ? '#f59e0b' : progress > 0.25 ? '#f97316' : '#ef4444';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.3 }}
            transition={{ type: 'spring', stiffness: 500, damping: 26 }}
            className="flex flex-col items-center gap-2"
        >
            <div className="relative" style={{ width: 96, height: 96 }}>
                <svg width="96" height="96" className="absolute inset-0 -rotate-90" style={{ overflow: 'visible' }}>
                    <circle cx="48" cy="48" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                    <circle
                        cx="48" cy="48" r={R} fill="none"
                        stroke={ringColor}
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={circ * (1 - progress)}
                        style={{ transition: 'stroke-dashoffset 0.04s linear, stroke 0.4s' }}
                    />
                </svg>
                <button
                    onClick={onCall}
                    className="absolute inset-2.5 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex flex-col items-center justify-center shadow-xl shadow-yellow-500/60 hover:shadow-yellow-400/80 active:scale-95 transition-all"
                    style={{ animation: 'uno-pulse 0.7s ease-in-out infinite' }}
                >
                    <span className="text-black font-black text-base leading-none">⚡</span>
                    <span className="text-black font-black text-[11px] leading-none mt-0.5">WILD!</span>
                </button>
            </div>
            <p className="text-yellow-300 text-xs font-semibold animate-pulse">Call before time's up!</p>
            <style>{`
              @keyframes uno-pulse {
                0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(234,179,8,0.5); }
                50% { transform: scale(1.05); box-shadow: 0 0 0 8px rgba(234,179,8,0); }
              }
            `}</style>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────────────
   DRAW STACK BADGE
───────────────────────────────────────────────────── */

function DrawStackBadge({ amount }) {
    const isHuge = amount >= 10;
    return (
        <motion.div
            key={amount}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            className="flex flex-col items-center gap-0.5"
        >
            <span className="text-red-400 text-[9px] font-bold tracking-widest">STACK</span>
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-red-500 flex items-center justify-center
                ${isHuge ? 'bg-red-600/30 border-red-400' : 'bg-red-500/20'}
            `}
                style={isHuge ? { boxShadow: '0 0 18px rgba(239,68,68,0.6)', animation: 'urgent-pulse 0.5s ease-in-out infinite' } : { animation: 'urgent-pulse 1s ease-in-out infinite' }}>
                <span className={`font-black ${isHuge ? 'text-red-300 text-base' : 'text-red-400 text-xl'}`}>+{amount}</span>
            </div>
            <style>{`
              @keyframes urgent-pulse {
                0%, 100% { box-shadow: 0 0 8px rgba(239,68,68,0.4); }
                50% { box-shadow: 0 0 22px rgba(239,68,68,0.8); }
              }
            `}</style>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────────────
   AI PLAYER PANEL
───────────────────────────────────────────────────── */

function AiPanel({ player, isCurrentTurn, showThinking }) {
    return (
        <motion.div
            layout
            className={[
                'glass-panel rounded-xl p-2 sm:p-2.5 transition-all duration-300 relative overflow-hidden',
                player.isOut ? 'opacity-40' : '',
                isCurrentTurn && !player.isOut ? 'ring-1 ring-yellow-400/60 shadow-lg shadow-yellow-500/20' : '',
            ].join(' ')}
        >
            {/* Thinking shimmer */}
            {isCurrentTurn && !player.isOut && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/6 to-transparent"
                        style={{ animation: 'shimmer 1.5s ease-in-out infinite' }} />
                </div>
            )}

            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                    <span className={`text-xs sm:text-sm font-bold ${player.isOut ? 'text-red-400 line-through' : isCurrentTurn ? 'text-yellow-400' : 'text-gray-300'}`}>
                        {player.name}
                    </span>
                    {isCurrentTurn && !player.isOut && showThinking && (
                        <div className="flex gap-0.5 items-center">
                            {[0, 1, 2].map(i => (
                                <motion.div
                                    key={i}
                                    className="w-1 h-1 rounded-full bg-yellow-400"
                                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                                    transition={{ duration: 0.9, delay: i * 0.2, repeat: Infinity }}
                                />
                            ))}
                        </div>
                    )}
                </div>
                <span className="text-gray-500 text-[10px] font-medium">
                    {player.isOut ? '💀' : `${player.hand.length} 🃏`}
                </span>
            </div>

            {!player.isOut ? (
                <div className="flex overflow-hidden gap-px">
                    {player.hand.slice(0, 18).map(card => (
                        <GameCard key={card.id} card={card} faceDown size="sm" />
                    ))}
                    {player.hand.length > 18 && (
                        <span className="text-gray-500 text-[10px] self-center ml-1 flex-shrink-0">+{player.hand.length - 18}</span>
                    )}
                    {player.hand.length === 0 && (
                        <span className="text-yellow-400 text-[10px] font-bold animate-pulse">0 cards!</span>
                    )}
                </div>
            ) : (
                <p className="text-red-400/70 text-[10px]">Knocked out!</p>
            )}

            <style>{`
              @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(200%); }
              }
            `}</style>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────── */

export default function CardBlitz() {
    const [phase, setPhase] = useState('menu');
    // phases: menu | playing | color_pick | swap_pick | roulette_pick | game_over
    const [game, setGame]         = useState(null);
    const [messages, setMessages] = useState([]);
    const [aiThinking, setAiThinking]       = useState(false);
    const [audioEnabled, setAudioEnabled]   = useState(!gameAudio.isMuted());
    const [showLeaderboard, setShowLeaderboard]       = useState(false);
    const [viewingLeaderboard, setViewingLeaderboard] = useState(false);
    const [score, setScore]     = useState(0);
    const [wildActive, setWildActive] = useState(false);
    const [turnKey, setTurnKey] = useState(0);

    const pendingCardRef   = useRef(null);
    const pendingPlayerRef = useRef(null);
    const aiTimeoutRef     = useRef(null);
    const wildTimeoutRef   = useRef(null);
    const msgTimeoutRef    = useRef(null);

    /* ── Audio ─────────────────────────────────── */
    useEffect(() => {
        const unsub = gameAudio.subscribe(muted => setAudioEnabled(!muted));
        gameAudio.reset();
        return () => {
            unsub();
            clearTimeout(aiTimeoutRef.current);
            clearTimeout(wildTimeoutRef.current);
        };
    }, []);

    /* ── Message helper ──────────────────────── */
    const showMsg = useCallback((msg, duration = 3000) => {
        setMessages(prev => [...prev.slice(-4), msg]);
        clearTimeout(msgTimeoutRef.current);
        msgTimeoutRef.current = setTimeout(() => setMessages(prev => prev.slice(1)), duration);
    }, []);

    /* ── Game over detection ─────────────────── */
    useEffect(() => {
        if (!game || phase === 'menu' || phase === 'game_over') return;
        const empty = game.players.find(p => !p.isOut && p.hand.length === 0);
        if (empty) {
            const s = calcScore(game.players, empty.id);
            setScore(empty.isHuman ? s : 0);
            setGame(prev => prev ? { ...prev, winner: empty.id } : prev);
            setPhase('game_over');
            gameAudio.play(empty.isHuman ? 'win' : 'gameOver');
            return;
        }
        const active = game.players.filter(p => !p.isOut);
        if (active.length === 1) {
            const winner = active[0];
            const s = calcScore(game.players, winner.id);
            setScore(winner.isHuman ? s : 0);
            setGame(prev => prev ? { ...prev, winner: winner.id } : prev);
            setPhase('game_over');
            gameAudio.play(winner.isHuman ? 'win' : 'gameOver');
        }
    }, [game?.players, phase]);

    /* ── AI turn driver ──────────────────────── */
    useEffect(() => {
        if (!game || phase !== 'playing') return;
        const cur = game.players[game.currentPlayerIdx];
        if (!cur || cur.isHuman || cur.isOut) return;
        setAiThinking(true);
        const delay = 750 + Math.random() * 650;
        aiTimeoutRef.current = setTimeout(() => {
            executeAiTurn();
            setAiThinking(false);
        }, delay);
        return () => clearTimeout(aiTimeoutRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game?.currentPlayerIdx, phase, turnKey]);

    /* ── Roulette auto-trigger for human victim ─ */
    useEffect(() => {
        if (!game || phase !== 'playing') return;
        const cur = game.players[game.currentPlayerIdx];
        if (!cur || !cur.isHuman || cur.isOut) return;
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

    /* ── Helpers ─────────────────────────────── */

    function checkAndApplyMercy(g) {
        if (g.mode !== 'nomercy') return g;
        const { g: g2, msgs } = applyMercyKnockouts(g);
        msgs.forEach(m => showMsg(m));
        return g2;
    }

    function checkWildCallAi(g, aiIdx) {
        if (g.players[aiIdx].hand.length === 1) {
            if (Math.random() < 0.80) {
                setTimeout(() => showMsg(`${g.players[aiIdx].name} calls WILD! ⚡`), 400);
            } else {
                const res = drawCards(g, 2);
                g = res.g;
                g.players[aiIdx].hand = [...g.players[aiIdx].hand, ...res.drawn];
                setTimeout(() => showMsg(`${g.players[aiIdx].name} forgot WILD! +2 penalty 💸`), 400);
            }
        }
        return g;
    }

    function applyCardEffects(g, card, playerIdx, msgFn) {
        const player = g.players[playerIdx];
        const active = countActive(g.players);

        if (card.type === 'discard_all') {
            const extra = g.players[playerIdx].hand.filter(c => c.color === card.color);
            g.players[playerIdx].hand = g.players[playerIdx].hand.filter(c => c.color !== card.color);
            g.discardPile = [...g.discardPile, ...extra];
            msgFn(`${player.name} discards ${extra.length + 1} ${card.color} cards! ✕`);
            g.currentPlayerIdx = nextActive(playerIdx, g.direction, g.players);
            g = checkWildCallAi(g, playerIdx);
            return g;
        }

        switch (card.type) {
            case 'skip':
                msgFn(`${player.name} plays Skip!`);
                g.currentPlayerIdx = nextActive(
                    nextActive(playerIdx, g.direction, g.players),
                    g.direction, g.players
                );
                break;

            case 'reverse':
                g.direction *= -1;
                if (active === 2) {
                    msgFn(`${player.name} plays Reverse! (acts as Skip)`);
                    g.currentPlayerIdx = nextActive(
                        nextActive(playerIdx, g.direction, g.players),
                        g.direction, g.players
                    );
                } else {
                    msgFn(`${player.name} plays Reverse! Direction changed.`);
                    g.currentPlayerIdx = nextActive(playerIdx, g.direction, g.players);
                }
                break;

            case 'skip_all':
                msgFn(`${player.name} plays Skip Everyone! 🚫 Your turn again!`);
                g.currentPlayerIdx = playerIdx;
                break;

            case 'draw2':
            case 'draw4':
                if (g.mode === 'nomercy') {
                    g.drawStack += getDrawAmt(card);
                    msgFn(`${player.name} plays ${getSymbol(card)}! Stack: +${g.drawStack} 💥`);
                    g.currentPlayerIdx = nextActive(playerIdx, g.direction, g.players);
                } else {
                    const amt = getDrawAmt(card);
                    const victimIdx = nextActive(playerIdx, g.direction, g.players);
                    const res = drawCards(g, amt);
                    g = res.g;
                    g.players[victimIdx].hand = [...g.players[victimIdx].hand, ...res.drawn];
                    msgFn(`${g.players[victimIdx].name} draws ${res.drawn.length}! 😬`);
                    g.currentPlayerIdx = nextActive(victimIdx, g.direction, g.players);
                    g = checkAndApplyMercy(g);
                }
                break;

            case 'wild':
                msgFn(`${player.name} plays Wild → ${g.currentColor.toUpperCase()}`);
                g.currentPlayerIdx = nextActive(playerIdx, g.direction, g.players);
                break;

            case 'wild_draw4':
                if (g.mode === 'classic') {
                    const victimIdx = nextActive(playerIdx, g.direction, g.players);
                    const res = drawCards(g, 4);
                    g = res.g;
                    g.players[victimIdx].hand = [...g.players[victimIdx].hand, ...res.drawn];
                    msgFn(`${g.players[victimIdx].name} draws 4! 🃏🃏🃏🃏`);
                    g.currentPlayerIdx = nextActive(victimIdx, g.direction, g.players);
                    g = checkAndApplyMercy(g);
                }
                break;

            case 'wild_rev_draw4':
                g.direction *= -1;
                if (g.mode === 'nomercy') {
                    g.drawStack += 4;
                    msgFn(`${player.name} plays Wild Reverse +4! Direction reversed, stack: +${g.drawStack} 🔥`);
                    g.currentPlayerIdx = nextActive(playerIdx, g.direction, g.players);
                }
                break;

            case 'wild_draw6':
                if (g.mode === 'nomercy') {
                    g.drawStack += 6;
                    msgFn(`${player.name} plays Wild +6! Stack: +${g.drawStack} 😱`);
                    g.currentPlayerIdx = nextActive(playerIdx, g.direction, g.players);
                }
                break;

            case 'wild_draw10':
                if (g.mode === 'nomercy') {
                    g.drawStack += 10;
                    msgFn(`${player.name} plays Wild +10! Stack: +${g.drawStack} 💀🔥`);
                    g.currentPlayerIdx = nextActive(playerIdx, g.direction, g.players);
                }
                break;

            case 'wild_roulette': {
                const victimIdx = nextActive(playerIdx, g.direction, g.players);
                const victim = g.players[victimIdx];
                if (!victim.isHuman) {
                    const chosenColor = COLORS[Math.floor(Math.random() * 4)];
                    g.currentColor = chosenColor;
                    let revealed = [];
                    for (let i = 0; i < 50; i++) {
                        g = ensureDrawPile(g);
                        if (!g.drawPile.length) break;
                        const c = g.drawPile[0];
                        g.drawPile = g.drawPile.slice(1);
                        revealed.push(c);
                        if (c.color === chosenColor) break;
                    }
                    g.players[victimIdx].hand = [...g.players[victimIdx].hand, ...revealed];
                    msgFn(`${victim.name} picks ${chosenColor.toUpperCase()}, draws ${revealed.length} card${revealed.length !== 1 ? 's' : ''}! 🎲`);
                    g = checkAndApplyMercy(g);
                    g.currentPlayerIdx = nextActive(victimIdx, g.direction, g.players);
                } else {
                    msgFn(`${player.name} plays Colour Roulette on you! Pick a colour! 🎲`);
                    g.currentPlayerIdx = victimIdx;
                    g._rouletteVictim = true;
                }
                break;
            }

            case 'number':
                if (g.mode === 'nomercy') {
                    if (card.value === 7) {
                        if (player.isHuman) {
                            g._needSwapPick = true;
                            msgFn(`${player.name} plays 7! Choose someone to swap hands with! 🔄`);
                        } else {
                            const targetIdx = aiPickSwapTarget(playerIdx, g.players);
                            const tmp = [...g.players[playerIdx].hand];
                            g.players[playerIdx].hand = [...g.players[targetIdx].hand];
                            g.players[targetIdx].hand = tmp;
                            msgFn(`${player.name} swaps hands with ${g.players[targetIdx].name}! 🔄`);
                        }
                        g.currentPlayerIdx = nextActive(playerIdx, g.direction, g.players);
                        break;
                    }
                    if (card.value === 0) {
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
                        g.currentPlayerIdx = nextActive(playerIdx, g.direction, g.players);
                        break;
                    }
                }
                g.currentPlayerIdx = nextActive(playerIdx, g.direction, g.players);
                break;

            default:
                g.currentPlayerIdx = nextActive(playerIdx, g.direction, g.players);
                break;
        }

        g = checkWildCallAi(g, playerIdx);
        g = checkAndApplyMercy(g);
        return g;
    }

    function aiDrawUntilPlayable(g, aiIdx) {
        let drawn = [];
        let found = null;
        for (let i = 0; i < 50; i++) {
            g = ensureDrawPile(g);
            if (!g.drawPile.length) break;
            const c = g.drawPile[0];
            g.drawPile = g.drawPile.slice(1);
            const top = g.discardPile[g.discardPile.length - 1];
            if (canPlayCard(c, top, g.currentColor, 0, g.mode)) { found = c; break; }
            drawn.push(c);
            g.players[aiIdx].hand = [...g.players[aiIdx].hand, c];
            if (g.players[aiIdx].hand.length >= MERCY_LIMIT) {
                g = checkAndApplyMercy(g);
                if (g.players[aiIdx].isOut) {
                    g.currentPlayerIdx = nextActive(aiIdx, g.direction, g.players);
                    return g;
                }
            }
        }
        if (found) {
            g.discardPile = [...g.discardPile, found];
            if (found.color === 'wild') {
                g.currentColor = found.type === 'wild_roulette'
                    ? COLORS[Math.floor(Math.random() * 4)]
                    : aiPickColor(g.players[aiIdx].hand);
            } else {
                g.currentColor = found.color;
            }
            if (drawn.length > 0) {
                showMsg(`${g.players[aiIdx].name} draws ${drawn.length} card${drawn.length !== 1 ? 's' : ''}, then plays ${getSymbol(found)}`);
            }
            g = applyCardEffects(g, found, aiIdx, showMsg);
        } else {
            if (drawn.length > 0) showMsg(`${g.players[aiIdx].name} draws ${drawn.length} card${drawn.length !== 1 ? 's' : ''}, can't play`);
            else showMsg(`${g.players[aiIdx].name} can't draw — pile empty`);
            g.currentPlayerIdx = nextActive(aiIdx, g.direction, g.players);
        }
        return g;
    }

    function advanceTurn() { setTurnKey(k => k + 1); }

    /* ── Execute AI Turn ─────────────────────── */
    function executeAiTurn() {
        setGame(prev => {
            if (!prev) return prev;
            let g = deepCopy(prev);
            const aiIdx = g.currentPlayerIdx;
            const ai = g.players[aiIdx];
            if (ai.isOut || ai.isHuman) return prev;

            const top = g.discardPile[g.discardPile.length - 1];

            // Handle draw stack (No Mercy stacking)
            if (g.drawStack > 0 && g.mode === 'nomercy') {
                const choice = aiPickCard(ai.hand, top, g.currentColor, g.drawStack, g.mode);
                if (choice) {
                    const card = choice.card;
                    g.players[aiIdx].hand = ai.hand.filter((_, i) => i !== choice.index);
                    g.discardPile = [...g.discardPile, card];
                    g.drawStack += getDrawAmt(card);
                    g.currentColor = card.color === 'wild' ? aiPickColor(g.players[aiIdx].hand) : card.color;
                    if (card.type === 'wild_rev_draw4') g.direction *= -1;
                    showMsg(`${ai.name} stacks ${getSymbol(card)}! Stack: +${g.drawStack} 😱`);
                    g = checkAndApplyMercy(g);
                    g = checkWildCallAi(g, aiIdx);
                    g.currentPlayerIdx = nextActive(aiIdx, g.direction, g.players);
                    return g;
                } else {
                    const count = g.drawStack;
                    const res = drawCards(g, count);
                    g = res.g;
                    g.players[aiIdx].hand = [...g.players[aiIdx].hand, ...res.drawn];
                    g.drawStack = 0;
                    showMsg(`${ai.name} draws ${res.drawn.length} cards! 💀`);
                    g = checkAndApplyMercy(g);
                    g.currentPlayerIdx = nextActive(aiIdx, g.direction, g.players);
                    return g;
                }
            }

            // Normal play
            const choice = aiPickCard(ai.hand, top, g.currentColor, 0, g.mode);
            if (choice) {
                const card = choice.card;
                g.players[aiIdx].hand = ai.hand.filter((_, i) => i !== choice.index);
                g.discardPile = [...g.discardPile, card];
                if (card.color === 'wild') {
                    g.currentColor = card.type === 'wild_roulette'
                        ? COLORS[Math.floor(Math.random() * 4)]
                        : aiPickColor(g.players[aiIdx].hand);
                } else {
                    g.currentColor = card.color;
                }
                g = applyCardEffects(g, card, aiIdx, showMsg);
            } else {
                if (g.mode === 'nomercy') {
                    g = aiDrawUntilPlayable(g, aiIdx);
                } else {
                    const res = drawCards(g, 1);
                    g = res.g;
                    if (res.drawn.length > 0) {
                        const drawn = res.drawn[0];
                        const newTop = g.discardPile[g.discardPile.length - 1];
                        if (canPlayCard(drawn, newTop, g.currentColor, 0, g.mode) && Math.random() < 0.7) {
                            g.discardPile = [...g.discardPile, drawn];
                            g.currentColor = drawn.color === 'wild' ? aiPickColor(g.players[aiIdx].hand) : drawn.color;
                            g = applyCardEffects(g, drawn, aiIdx, showMsg);
                            showMsg(`${ai.name} draws and plays ${getSymbol(drawn)}!`);
                            return g;
                        }
                        g.players[aiIdx].hand = [...g.players[aiIdx].hand, drawn];
                    }
                    showMsg(`${ai.name} draws a card`);
                    g.currentPlayerIdx = nextActive(aiIdx, g.direction, g.players);
                }
            }
            return g;
        });
        advanceTurn();
    }

    /* ── Start / Reset ───────────────────────── */
    function startGame(mode) {
        gameAudio.init();
        gameAudio.resume();
        const g = initGame(mode);
        setGame(g);
        setPhase('playing');
        setScore(0);
        setMessages([]);
        setWildActive(false);
        setTurnKey(0);
        pendingCardRef.current = null;
        pendingPlayerRef.current = null;
        showMsg(
            mode === 'nomercy'
                ? 'No Mercy! Stack draws, 7-swap, 0-pass, Mercy KO & more!'
                : 'Classic mode — match colours & numbers!',
            4500
        );
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

    /* ── WILD! Call ──────────────────────────── */
    function triggerWildCheck() {
        setWildActive(true);
        wildTimeoutRef.current = setTimeout(() => {
            setWildActive(false);
            showMsg('Forgot to call WILD! +2 penalty! ⚡');
            gameAudio.play('wrong');
            setGame(prev => {
                if (!prev || prev.players[0].hand.length !== 1) return prev;
                let g = deepCopy(prev);
                const res = drawCards(g, 2);
                g = res.g;
                g.players[0].hand = [...g.players[0].hand, ...res.drawn];
                return g;
            });
        }, WILD_CALL_MS);
    }

    function callWild() {
        if (!wildActive) return;
        clearTimeout(wildTimeoutRef.current);
        setWildActive(false);
        showMsg('WILD! ⚡', 1500);
        gameAudio.play('score');
    }

    /* ── Player Actions ──────────────────────── */
    function handlePlayerPlay(cardIndex) {
        if (!game || game.currentPlayerIdx !== 0 || phase !== 'playing' || aiThinking || wildActive) return;
        const card = game.players[0].hand[cardIndex];
        const top  = game.discardPile[game.discardPile.length - 1];
        if (!canPlayCard(card, top, game.currentColor, game.drawStack, game.mode)) {
            showMsg("Can't play that card!", 1500);
            gameAudio.play('wrong');
            return;
        }
        gameAudio.play('click');
        pendingCardRef.current = { card, cardIndex };

        if (card.color === 'wild') {
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

        playColoredCard(card, cardIndex);
    }

    function playColoredCard(card, cardIndex) {
        setGame(prev => {
            let g = deepCopy(prev);
            g.players[0].hand = g.players[0].hand.filter((_, i) => i !== cardIndex);
            g.discardPile = [...g.discardPile, card];
            g.currentColor = card.color;
            g.hasDrawn = false;
            g = applyCardEffects(g, card, 0, showMsg);
            if (g._needSwapPick) {
                delete g._needSwapPick;
                pendingPlayerRef.current = 0;
                setTimeout(() => setPhase('swap_pick'), 50);
                return g;
            }
            return g;
        });
        setTimeout(() => {
            setGame(prev => {
                if (!prev) return prev;
                if (prev.players[0].hand.length === 1) triggerWildCheck();
                return prev;
            });
        }, 120);
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
                g = applyCardEffects(g, card, 0, showMsg);
                if (g._rouletteVictim) delete g._rouletteVictim;
                if (g._needSwapPick) {
                    delete g._needSwapPick;
                    pendingPlayerRef.current = 0;
                    setTimeout(() => setPhase('swap_pick'), 50);
                    return g;
                }
            }
            return g;
        });
        showMsg(`Colour → ${color.toUpperCase()}`);
        setTimeout(() => {
            setGame(prev => {
                if (!prev) return prev;
                if (prev.players[0].hand.length === 1) triggerWildCheck();
                return prev;
            });
        }, 120);
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
            let revealed = [];
            for (let i = 0; i < 50; i++) {
                g = ensureDrawPile(g);
                if (!g.drawPile.length) break;
                const c = g.drawPile[0];
                g.drawPile = g.drawPile.slice(1);
                revealed.push(c);
                if (c.color === color) break;
            }
            g.players[0].hand = [...g.players[0].hand, ...revealed];
            showMsg(`Roulette: picked ${color.toUpperCase()}, drew ${revealed.length} card${revealed.length !== 1 ? 's' : ''}! 🎲`);
            g = checkAndApplyMercy(g);
            g.currentPlayerIdx = nextActive(0, g.direction, g.players);
            return g;
        });
        advanceTurn();
    }

    function handlePlayerDraw() {
        if (!game || game.currentPlayerIdx !== 0 || phase !== 'playing' || aiThinking || wildActive) return;
        if (game.hasDrawn && game.mode === 'classic') return;
        gameAudio.play('click');

        // Draw stack penalty (No Mercy)
        if (game.drawStack > 0 && game.mode === 'nomercy') {
            const count = game.drawStack;
            setGame(prev => {
                let g = deepCopy(prev);
                const res = drawCards(g, count);
                g = res.g;
                g.players[0].hand = [...g.players[0].hand, ...res.drawn];
                g.drawStack = 0;
                showMsg(`Drew ${res.drawn.length} cards from the stack! 😰`);
                g = checkAndApplyMercy(g);
                g.currentPlayerIdx = nextActive(0, g.direction, g.players);
                return g;
            });
            advanceTurn();
            return;
        }

        if (game.mode === 'nomercy') {
            setGame(prev => {
                let g = deepCopy(prev);
                let drawn = [];
                let found = null;
                for (let i = 0; i < 50; i++) {
                    g = ensureDrawPile(g);
                    if (!g.drawPile.length) break;
                    const card = g.drawPile[0];
                    g.drawPile = g.drawPile.slice(1);
                    const top = g.discardPile[g.discardPile.length - 1];
                    if (canPlayCard(card, top, g.currentColor, 0, g.mode)) { found = card; break; }
                    drawn.push(card);
                    g.players[0].hand = [...g.players[0].hand, card];
                    if (g.players[0].hand.length >= MERCY_LIMIT) {
                        g = checkAndApplyMercy(g);
                        if (g.players[0].isOut) {
                            g.currentPlayerIdx = nextActive(0, g.direction, g.players);
                            return g;
                        }
                    }
                }
                if (found) {
                    if (drawn.length > 0) showMsg(`Drew ${drawn.length} card${drawn.length !== 1 ? 's' : ''}… found a playable one!`);
                    if (found.color === 'wild') {
                        g.discardPile = [...g.discardPile, found];
                        pendingCardRef.current = { card: found, cardIndex: -1 };
                        setTimeout(() => setPhase('color_pick'), 50);
                        return g;
                    }
                    g.discardPile = [...g.discardPile, found];
                    g.currentColor = found.color;
                    g = applyCardEffects(g, found, 0, showMsg);
                    if (g._needSwapPick) {
                        delete g._needSwapPick;
                        pendingPlayerRef.current = 0;
                        setTimeout(() => setPhase('swap_pick'), 50);
                        return g;
                    }
                } else {
                    if (drawn.length > 0) showMsg(`Drew ${drawn.length} card${drawn.length !== 1 ? 's' : ''}, none playable`);
                    else showMsg('Draw pile empty!');
                    g.currentPlayerIdx = nextActive(0, g.direction, g.players);
                }
                return g;
            });
            advanceTurn();
        } else {
            setGame(prev => {
                let g = deepCopy(prev);
                const res = drawCards(g, 1);
                g = res.g;
                if (res.drawn.length > 0) {
                    g.players[0].hand = [...g.players[0].hand, res.drawn[0]];
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
            g.currentPlayerIdx = nextActive(0, g.direction, g.players);
            return g;
        });
        showMsg('Turn passed');
        advanceTurn();
    }

    /* ── Derived state ───────────────────────── */
    const topCard = game?.discardPile?.[game.discardPile.length - 1];
    const isPlayerTurn = game?.currentPlayerIdx === 0 && phase === 'playing' && !game?.players[0]?.isOut;

    const playableIndices = useMemo(() => {
        if (!game || !isPlayerTurn || wildActive) return new Set();
        const top = game.discardPile[game.discardPile.length - 1];
        const s = new Set();
        game.players[0].hand.forEach((card, i) => {
            if (canPlayCard(card, top, game.currentColor, game.drawStack, game.mode)) s.add(i);
        });
        return s;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game?.players?.[0]?.hand, game?.currentColor, game?.drawStack, isPlayerTurn, wildActive]);

    const canDraw = isPlayerTurn && !wildActive && !(game?.hasDrawn && game?.mode === 'classic' && playableIndices.size > 0);
    const mustDrawStack = isPlayerTurn && (game?.drawStack ?? 0) > 0 && game?.mode === 'nomercy';
    const colorStyle = topCard?.color && topCard.color !== 'wild' ? CS[game?.currentColor] : CS[game?.currentColor];

    /* ═══════════════════════════════════════════
       RENDER: MODE SELECT (MENU)
    ═══════════════════════════════════════════ */
    if (phase === 'menu') {
        return (
            <div className="space-y-8 pb-4">
                <div className="flex items-center gap-4">
                    <Link to="/games" className="p-2 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0">
                        <ArrowLeft size={22} className="text-gray-400" />
                    </Link>
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl sm:text-4xl font-black"
                        >
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-500 via-orange-400 to-amber-500">
                                Wild Cards ⚡
                            </span>
                        </motion.h1>
                        <p className="text-gray-500 mt-1 text-sm">UNO-style card game — 1 vs 3 AI opponents</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
                    {/* Classic */}
                    <motion.button
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        onClick={() => startGame('classic')}
                        className="glass-panel rounded-2xl p-7 text-left hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 border border-transparent hover:border-blue-500/30 group"
                    >
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/30">
                            <span className="text-2xl">🃏</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Classic</h3>
                        <p className="text-gray-400 text-sm mb-4">Standard UNO rules. Match colour or number, use action cards to disrupt opponents.</p>
                        <div className="flex flex-wrap gap-1.5">
                            {['Skip', 'Reverse', '+2', 'Wild', 'Wild +4'].map(t => (
                                <span key={t} className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full">{t}</span>
                            ))}
                        </div>
                    </motion.button>

                    {/* No Mercy */}
                    <motion.button
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.18 }}
                        onClick={() => startGame('nomercy')}
                        className="glass-panel rounded-2xl p-7 text-left hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 border border-transparent hover:border-red-500/30 group"
                    >
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-red-500/30">
                            <span className="text-2xl">🔥</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No Mercy</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Brutal variant! Stack draws, 7-swap hands, 0-pass, and the Mercy Rule knocks out players at 25+ cards.
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {['Stack +2/+4/+6/+10', '7-Swap', '0-Pass', 'Draw Until Playable', 'Mercy KO', 'Skip All', 'Discard All', 'Roulette'].map(t => (
                                <span key={t} className="px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded-full">{t}</span>
                            ))}
                        </div>
                    </motion.button>
                </div>

                {/* Rules reference */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="max-w-2xl mx-auto glass-panel rounded-xl p-5 space-y-4"
                >
                    <div>
                        <h3 className="text-white font-bold mb-2">How to Play</h3>
                        <ul className="text-gray-400 text-sm space-y-1">
                            <li>• Match the top card by <span className="text-white">colour</span>, <span className="text-white">number</span>, or <span className="text-white">symbol</span></li>
                            <li>• <span className="text-white">Wild</span> cards let you choose any colour</li>
                            <li>• <span className="text-white">Skip</span> skips the next player; <span className="text-white">Reverse</span> flips direction</li>
                            <li>• Draw cards force the next player to pick up cards</li>
                            <li>• Call <span className="text-yellow-400 font-bold">WILD!</span> when you're down to 1 card, or take +2 penalty</li>
                            <li>• First to empty their hand wins!</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-red-400 font-bold mb-2">No Mercy Extras</h4>
                        <ul className="text-gray-400 text-sm space-y-1">
                            <li>• <span className="text-red-300 font-medium">Stacking</span> — counter draw cards with equal or higher value draws</li>
                            <li>• <span className="text-red-300 font-medium">7 = Swap</span> — swap your hand with any other player</li>
                            <li>• <span className="text-red-300 font-medium">0 = Rotate</span> — all hands pass in play direction</li>
                            <li>• <span className="text-red-300 font-medium">Mercy Rule</span> — reach 25+ cards and you're eliminated!</li>
                            <li>• <span className="text-red-300 font-medium">Draw Until Playable</span> — must keep drawing until you can play</li>
                            <li>• <span className="text-red-300 font-medium">Discard All</span> — dump every card of that colour from your hand</li>
                            <li>• <span className="text-red-300 font-medium">Skip Everyone</span> — all other players skip; you play again</li>
                            <li>• <span className="text-red-300 font-medium">Colour Roulette</span> — victim picks a colour, draws until they find it</li>
                        </ul>
                    </div>
                </motion.div>
            </div>
        );
    }

    /* ═══════════════════════════════════════════
       RENDER: GAME BOARD
    ═══════════════════════════════════════════ */

    const dirEmoji  = game?.direction === 1 ? '↻' : '↺';
    const dirLabel  = game?.direction === 1 ? 'CW' : 'CCW';
    const aiPlayers = game?.players?.slice(1) ?? [];

    return (
        <div className="space-y-2 sm:space-y-3 pb-4 select-none">
            {/* ── Header ─────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <button onClick={resetGame} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0">
                        <ArrowLeft size={18} className="text-gray-400" />
                    </button>
                    <h1 className="text-lg sm:text-xl font-black truncate">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-amber-500">
                            Wild Cards
                        </span>
                    </h1>
                    {game?.mode === 'nomercy' && (
                        <span className="text-red-400 text-[10px] font-black tracking-widest border border-red-500/40 px-1.5 py-0.5 rounded flex-shrink-0">
                            NO MERCY
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    <button onClick={() => gameAudio.toggle()} className={`p-1.5 rounded-lg transition-colors ${audioEnabled ? 'bg-primary/20 text-primary' : 'bg-white/10 text-gray-400'}`}>
                        {audioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                    </button>
                    <button onClick={resetGame} className="p-1.5 rounded-lg bg-white/10 text-gray-400 hover:bg-white/20 transition-colors">
                        <RotateCcw size={15} />
                    </button>
                    <button onClick={() => { setViewingLeaderboard(true); setShowLeaderboard(true); }}
                        className="p-1.5 rounded-lg bg-white/10 text-gray-400 hover:bg-white/20 transition-colors">
                        <Trophy size={15} />
                    </button>
                </div>
            </div>

            {/* ── AI Opponents ───────────────────── */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {aiPlayers.map(ai => (
                    <AiPanel
                        key={ai.id}
                        player={ai}
                        isCurrentTurn={game?.currentPlayerIdx === ai.id}
                        showThinking={aiThinking}
                    />
                ))}
            </div>

            {/* ── Centre Table ───────────────────── */}
            <div className="glass-panel rounded-xl p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">

                    {/* Direction */}
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-gray-500 text-[9px] uppercase tracking-wider">Dir</span>
                        <motion.span
                            key={game?.direction}
                            initial={{ scale: 0.5, rotate: game?.direction === 1 ? -180 : 180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="text-2xl sm:text-3xl"
                        >
                            {dirEmoji}
                        </motion.span>
                        <span className="text-gray-500 text-[9px]">{dirLabel}</span>
                    </div>

                    {/* Active colour */}
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-gray-500 text-[9px] uppercase tracking-wider">Colour</span>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={game?.currentColor}
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full shadow-xl border-2 border-white/20 ${colorStyle?.bg ?? 'bg-gray-600'}`}
                                style={{ boxShadow: `0 0 16px var(--tw-shadow-color, rgba(0,0,0,.5))` }}
                            />
                        </AnimatePresence>
                        <span className={`text-[9px] font-bold capitalize ${colorStyle?.dim ?? 'text-gray-400'}`}>
                            {game?.currentColor}
                        </span>
                    </div>

                    {/* Draw pile */}
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-gray-500 text-[9px] uppercase tracking-wider">Draw</span>
                        <button
                            onClick={(canDraw || mustDrawStack) ? handlePlayerDraw : undefined}
                            disabled={!canDraw && !mustDrawStack}
                            className={`transition-transform ${(canDraw || mustDrawStack) ? 'hover:scale-105 active:scale-95 cursor-pointer' : 'cursor-default opacity-80'}`}
                        >
                            <GameCard card={{}} faceDown size="lg" />
                        </button>
                        <span className="text-gray-500 text-[9px]">{game?.drawPile?.length} left</span>
                    </div>

                    {/* Discard pile */}
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-gray-500 text-[9px] uppercase tracking-wider">Discard</span>
                        <div style={{ width: 68, height: 100 }} className="relative">
                            <AnimatePresence>
                                {topCard && (
                                    <motion.div
                                        key={topCard.id}
                                        initial={{ scale: 1.3, opacity: 0, y: -20 }}
                                        animate={{ scale: 1, opacity: 1, y: 0 }}
                                        exit={{ scale: 0.85, opacity: 0, transition: { duration: 0.12 } }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                                        className="absolute inset-0"
                                    >
                                        <GameCard card={topCard} size="lg" mode={game?.mode} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <span className="text-gray-500 text-[9px]">{game?.discardPile?.length} cards</span>
                    </div>

                    {/* Draw stack */}
                    <AnimatePresence>
                        {(game?.drawStack ?? 0) > 0 && (
                            <DrawStackBadge key={game.drawStack} amount={game.drawStack} />
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Message Banner ─────────────────── */}
            <div className="min-h-[30px] text-center overflow-hidden">
                <AnimatePresence mode="wait">
                    {messages.length > 0 && (
                        <motion.div
                            key={messages[messages.length - 1]}
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6 }}
                            transition={{ duration: 0.2 }}
                            className="inline-block px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white text-xs sm:text-sm font-medium shadow-lg"
                        >
                            {messages[messages.length - 1]}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Turn indicator ─────────────────── */}
            <div className="text-center min-h-[18px]">
                <AnimatePresence mode="wait">
                    {isPlayerTurn && !wildActive && (
                        <motion.span
                            key="your-turn"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-primary text-xs sm:text-sm font-semibold"
                        >
                            {mustDrawStack
                                ? `Stack a draw card (≥+${getDrawAmt(topCard)}) or draw ${game.drawStack}!`
                                : game?.hasDrawn
                                    ? 'Play a card or pass your turn'
                                    : game?.mode === 'nomercy'
                                        ? playableIndices.size > 0 ? 'Your turn — play a card' : 'No playable card — draw until you find one!'
                                        : 'Your turn — play a card or draw one'}
                        </motion.span>
                    )}
                    {game?.players[0]?.isOut && (
                        <motion.span key="ko" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm font-bold">
                            You've been knocked out! 💀 Watching…
                        </motion.span>
                    )}
                    {game?.currentPlayerIdx !== 0 && phase === 'playing' && !game?.players[0]?.isOut && (
                        <motion.span key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-gray-500 text-xs">
                            {game?.players[game?.currentPlayerIdx]?.name}'s turn…
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Player Hand ────────────────────── */}
            <div className={`glass-panel rounded-xl p-2 sm:p-3 transition-all duration-200 ${game?.currentPlayerIdx === 0 && phase === 'playing' && !game?.players[0]?.isOut ? 'ring-1 ring-primary/40 shadow-lg shadow-primary/10' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 text-xs sm:text-sm font-medium">
                        Your Hand
                        <span className="text-gray-500 ml-1.5">
                            {game?.players[0].hand.length} card{game?.players[0].hand.length !== 1 ? 's' : ''}
                        </span>
                        {game?.mode === 'nomercy' && game?.players[0].hand.length >= 20 && (
                            <span className="text-red-400 ml-2 font-bold animate-pulse text-[10px]">
                                ⚠️ {MERCY_LIMIT - game.players[0].hand.length} until KO!
                            </span>
                        )}
                    </span>
                    {game?.hasDrawn && isPlayerTurn && game?.mode === 'classic' && (
                        <button
                            onClick={handlePlayerPass}
                            className="px-3 py-1 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 text-xs font-medium transition-colors flex-shrink-0"
                        >
                            Pass Turn
                        </button>
                    )}
                </div>
                <div className="flex gap-1 sm:gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/20">
                    <AnimatePresence initial={false}>
                        {game?.players[0].hand.map((card, i) => (
                            <motion.div
                                key={card.id}
                                layout
                                initial={{ opacity: 0, y: 24, scale: 0.7 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.6, transition: { duration: 0.18 } }}
                                transition={{ type: 'spring', stiffness: 350, damping: 22 }}
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
                    </AnimatePresence>
                    {game?.players[0].hand.length === 0 && (
                        <span className="text-gray-500 text-sm py-6 text-center w-full">No cards!</span>
                    )}
                </div>
            </div>

            {/* ── WILD! Call Button ──────────────── */}
            <AnimatePresence>
                {wildActive && (
                    <motion.div className="flex justify-center py-1">
                        <WildCallButton onCall={callWild} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════
                OVERLAYS
            ═══════════════════════════════════════ */}

            {/* Colour Picker */}
            <AnimatePresence>
                {phase === 'color_pick' && (
                    <ColorPicker onSelect={chooseColor} title="Choose a Colour" />
                )}
            </AnimatePresence>

            {/* Swap Target Picker */}
            <AnimatePresence>
                {phase === 'swap_pick' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)' }}
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: 24 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 24 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                            className="glass-panel rounded-2xl p-6 sm:p-8 max-w-sm w-full mx-4"
                        >
                            <h3 className="text-white text-2xl font-black text-center mb-1">🔄 Swap Hands!</h3>
                            <p className="text-gray-400 text-sm text-center mb-5">Choose a player to swap hands with</p>
                            <div className="space-y-2.5">
                                {game?.players.slice(1).filter(p => !p.isOut).map((p, i) => (
                                    <motion.button
                                        key={p.id}
                                        initial={{ opacity: 0, x: -16 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.07 }}
                                        whileHover={{ scale: 1.02, x: 4 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => chooseSwapTarget(p.id)}
                                        className="w-full glass-panel rounded-xl p-4 text-left border border-transparent hover:border-primary/30 flex items-center justify-between transition-all"
                                    >
                                        <span className="text-white font-bold">{p.name}</span>
                                        <span className="text-gray-400 text-sm">{p.hand.length} cards</span>
                                    </motion.button>
                                ))}
                                {game?.players.slice(1).filter(p => !p.isOut).length === 0 && (
                                    <p className="text-gray-400 text-sm text-center">No players to swap with!</p>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Roulette Colour Picker */}
            <AnimatePresence>
                {phase === 'roulette_pick' && (
                    <ColorPicker
                        onSelect={chooseRouletteColor}
                        title="🎲 Colour Roulette!"
                        subtitle="Pick a colour — you'll draw until you find it!"
                    />
                )}
            </AnimatePresence>

            {/* ── Game Over ──────────────────────── */}
            <AnimatePresence>
                {phase === 'game_over' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(14px)' }}
                    >
                        <motion.div
                            initial={{ scale: 0.75, y: 30 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.75, y: 30 }}
                            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                            className="glass-panel rounded-2xl p-8 max-w-sm w-full mx-4 text-center"
                        >
                            <motion.div
                                initial={{ scale: 0, rotate: -30 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 14 }}
                                className="text-7xl mb-4"
                            >
                                {game?.winner === 0 ? '🎉' : game?.winner != null ? '😤' : '🃏'}
                            </motion.div>

                            <motion.h2
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25 }}
                                className="text-2xl sm:text-3xl font-black text-white mb-1"
                            >
                                {game?.winner === 0
                                    ? 'You Win!'
                                    : game?.winner != null
                                        ? `${game?.players[game.winner]?.name} Wins!`
                                        : 'Game Over'}
                            </motion.h2>

                            {game?.winner === 0 && score > 0 && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.35 }}
                                    className="text-primary text-xl font-black mb-1"
                                >
                                    Score: {score}
                                </motion.p>
                            )}

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="text-gray-400 text-sm mb-6 space-y-1 mt-3"
                            >
                                {game?.players.filter((_, i) => i !== (game?.winner ?? -1)).map(p => (
                                    <p key={p.id}>
                                        <span className="text-gray-300 font-medium">{p.name}</span>
                                        {' '}— {p.isOut ? <span className="text-red-400">Knocked out 💀</span> : <span>{p.hand.length} cards left</span>}
                                    </p>
                                ))}
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="flex gap-3 justify-center flex-wrap"
                            >
                                {game?.winner === 0 && (
                                    <button
                                        onClick={() => setShowLeaderboard(true)}
                                        className="px-4 py-2 rounded-xl bg-primary/20 text-primary hover:bg-primary/30 font-semibold transition-colors flex items-center gap-2 text-sm"
                                    >
                                        <Trophy size={15} /> Leaderboard
                                    </button>
                                )}
                                <button
                                    onClick={resetGame}
                                    className="px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 font-semibold transition-colors flex items-center gap-2 text-sm"
                                >
                                    <RotateCcw size={15} /> Play Again
                                </button>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Leaderboard Modal */}
            <LeaderboardModal
                isOpen={showLeaderboard}
                onClose={() => { setShowLeaderboard(false); setViewingLeaderboard(false); }}
                game="wild-cards"
                currentScore={viewingLeaderboard ? undefined : (game?.winner === 0 ? score : undefined)}
            />
        </div>
    );
}
