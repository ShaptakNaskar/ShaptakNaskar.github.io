export const COLORS = ['red', 'blue', 'green', 'yellow'];
export const CARDS_PER_PLAYER = 7;
export const MERCY_LIMIT = 25;

export function shuffle(cards) {
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export function createDeck(mode) {
    const deck = [];
    let id = 0;

    for (const color of COLORS) {
        const zeroCopies = mode === 'classic' ? 1 : 2;
        for (let i = 0; i < zeroCopies; i++) {
            deck.push({ id: id++, color, type: 'number', value: 0 });
        }
        for (let value = 1; value <= 9; value++) {
            deck.push({ id: id++, color, type: 'number', value });
            deck.push({ id: id++, color, type: 'number', value });
        }

        if (mode === 'classic') {
            for (let i = 0; i < 2; i++) {
                deck.push({ id: id++, color, type: 'skip', value: null });
                deck.push({ id: id++, color, type: 'reverse', value: null });
                deck.push({ id: id++, color, type: 'draw2', value: null });
            }
            continue;
        }

        for (let i = 0; i < 3; i++) {
            deck.push({ id: id++, color, type: 'skip', value: null });
            deck.push({ id: id++, color, type: 'reverse', value: null });
            deck.push({ id: id++, color, type: 'draw2', value: null });
            deck.push({ id: id++, color, type: 'discard_all', value: null });
        }
        for (let i = 0; i < 2; i++) {
            deck.push({ id: id++, color, type: 'draw4', value: null });
            deck.push({ id: id++, color, type: 'skip_all', value: null });
        }
    }

    if (mode === 'classic') {
        for (let i = 0; i < 4; i++) {
            deck.push({ id: id++, color: 'wild', type: 'wild', value: null });
            deck.push({ id: id++, color: 'wild', type: 'wild_draw4', value: null });
        }
        return deck;
    }

    for (let i = 0; i < 8; i++) {
        deck.push({ id: id++, color: 'wild', type: 'wild_rev_draw4', value: null });
        deck.push({ id: id++, color: 'wild', type: 'wild_roulette', value: null });
    }
    for (let i = 0; i < 4; i++) {
        deck.push({ id: id++, color: 'wild', type: 'wild_draw6', value: null });
        deck.push({ id: id++, color: 'wild', type: 'wild_draw10', value: null });
    }
    return deck;
}

export function isDrawCard(card) {
    return ['draw2', 'draw4', 'wild_draw4', 'wild_rev_draw4', 'wild_draw6', 'wild_draw10'].includes(card.type);
}

export function getDrawAmt(card) {
    const amounts = { draw2: 2, draw4: 4, wild_draw4: 4, wild_rev_draw4: 4, wild_draw6: 6, wild_draw10: 10 };
    return amounts[card.type] ?? 0;
}

export function canPlayCard(card, top, color, stack, mode) {
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

export function canDrawNormally(mode, hasDrawn, playableCount) {
    return mode === 'classic' ? !hasDrawn : playableCount === 0;
}

export function isWildDrawFourLegal(hand, playedCardId, currentColor) {
    return !hand.some(card => (
        card.id !== playedCardId
        && (card.color === currentColor || card.color === 'wild')
    ));
}

export function ensureDrawPile(game) {
    if (game.drawPile.length > 0) return game;

    const top = game.discardPile[game.discardPile.length - 1];
    const recyclableDiscards = game.discardPile.slice(0, -1);
    const knockedOutCards = game.knockedOutPile ?? [];
    const recyclable = [...recyclableDiscards, ...knockedOutCards];
    if (!recyclable.length) return game;

    return {
        ...game,
        drawPile: shuffle(recyclable),
        discardPile: top ? [top] : [],
        knockedOutPile: [],
    };
}

export function drawCards(game, count) {
    let next = game;
    const drawn = [];

    while (drawn.length < count) {
        next = ensureDrawPile(next);
        if (!next.drawPile.length) break;
        const remaining = count - drawn.length;
        const batch = next.drawPile.slice(0, remaining);
        drawn.push(...batch);
        next = { ...next, drawPile: next.drawPile.slice(batch.length) };
    }

    return { g: next, drawn };
}

export function drawTopCard(game) {
    const ready = ensureDrawPile(game);
    if (!ready.drawPile.length) return { g: ready, card: null };
    return {
        g: { ...ready, drawPile: ready.drawPile.slice(1) },
        card: ready.drawPile[0],
    };
}

export function nextActive(index, direction, players) {
    const count = players.length;
    for (let i = 0; i < count; i++) {
        index = ((index + direction) % count + count) % count;
        if (!players[index].isOut) return index;
    }
    return index;
}

export function countActive(players) {
    return players.filter(player => !player.isOut).length;
}

export function getReverseDrawFourVictim(playerIdx, direction, players) {
    return countActive(players) === 2
        ? playerIdx
        : nextActive(playerIdx, direction, players);
}

export function discardAllMatching(game, playerIdx, playedCard) {
    const matching = game.players[playerIdx].hand.filter(card => card.color === playedCard.color);
    const players = [...game.players];
    players[playerIdx] = {
        ...players[playerIdx],
        hand: players[playerIdx].hand.filter(card => card.color !== playedCard.color),
    };
    return {
        g: {
            ...game,
            players,
            discardPile: [...game.discardPile.slice(0, -1), ...matching, playedCard],
        },
        discarded: matching.length + 1,
    };
}

export function applyMercyKnockouts(game) {
    const messages = [];
    const knockedOutCards = [];
    const players = game.players.map(player => {
        if (!player.isOut && player.hand.length >= MERCY_LIMIT) {
            messages.push(`${player.name} has ${player.hand.length} cards — KNOCKED OUT! 💀`);
            knockedOutCards.push(...player.hand);
            return { ...player, isOut: true, hand: [] };
        }
        return player;
    });

    return {
        g: {
            ...game,
            players,
            knockedOutPile: [...(game.knockedOutPile ?? []), ...knockedOutCards],
        },
        msgs: messages,
    };
}

function takeStartingDiscard(deck, mode) {
    const discardPile = [];
    let drawPile = [...deck];

    if (mode === 'nomercy') {
        while (drawPile.length) {
            const [card, ...rest] = drawPile;
            drawPile = rest;
            discardPile.push(card);
            if (card.type === 'number') return { drawPile, discardPile, first: card };
        }
    }

    while (drawPile.length) {
        const [card, ...rest] = drawPile;
        drawPile = rest;
        if (card.type === 'wild_draw4') {
            drawPile.push(card);
            continue;
        }
        discardPile.push(card);
        return { drawPile, discardPile, first: card };
    }

    return { drawPile, discardPile, first: null };
}

export function initGame(mode, playerNames) {
    let deck = shuffle(createDeck(mode));
    const players = playerNames.map((name, index) => ({
        id: index,
        name,
        hand: deck.slice(index * CARDS_PER_PLAYER, (index + 1) * CARDS_PER_PLAYER),
        isHuman: index === 0,
        isOut: false,
    }));
    deck = deck.slice(CARDS_PER_PLAYER * players.length);

    const start = takeStartingDiscard(deck, mode);
    const first = start.first;
    let game = {
        players,
        drawPile: start.drawPile,
        discardPile: start.discardPile,
        knockedOutPile: [],
        currentColor: first?.color === 'wild' ? COLORS[0] : first?.color,
        currentPlayerIdx: 0,
        direction: 1,
        drawStack: 0,
        mode,
        winner: null,
        hasDrawn: false,
        drawnCardId: null,
        needsInitialColor: mode === 'classic' && first?.type === 'wild',
        pendingChallenge: null,
    };

    if (mode !== 'classic' || !first) return game;

    if (first.type === 'skip') {
        game.currentPlayerIdx = nextActive(0, game.direction, players);
    } else if (first.type === 'reverse') {
        game.direction = -1;
        game.currentPlayerIdx = nextActive(0, game.direction, players);
    } else if (first.type === 'draw2') {
        const result = drawCards(game, 2);
        game = result.g;
        game.players[0].hand = [...game.players[0].hand, ...result.drawn];
        game.currentPlayerIdx = nextActive(0, game.direction, players);
    }

    return game;
}

export function deepCopy(game) {
    return {
        ...game,
        players: game.players.map(player => ({ ...player, hand: [...player.hand] })),
        drawPile: [...game.drawPile],
        discardPile: [...game.discardPile],
        knockedOutPile: [...(game.knockedOutPile ?? [])],
        pendingChallenge: game.pendingChallenge ? { ...game.pendingChallenge } : null,
    };
}

export function resolveWildDrawFour(game, challenge) {
    const pending = game.pendingChallenge;
    if (!pending) return { g: game, outcome: 'none', drawn: 0 };

    let next = deepCopy(game);
    next.pendingChallenge = null;
    let targetIdx = pending.victimIdx;
    let drawCount = 4;
    let outcome = 'accepted';

    if (challenge && pending.wasLegal) {
        drawCount = 6;
        outcome = 'challenge_failed';
    } else if (challenge) {
        targetIdx = pending.offenderIdx;
        outcome = 'challenge_succeeded';
    }

    const result = drawCards(next, drawCount);
    next = result.g;
    next.players[targetIdx].hand = [...next.players[targetIdx].hand, ...result.drawn];
    next.currentPlayerIdx = outcome === 'challenge_succeeded'
        ? pending.victimIdx
        : nextActive(pending.victimIdx, next.direction, next.players);

    return { g: next, outcome, drawn: result.drawn.length };
}
