import test from 'node:test';
import assert from 'node:assert/strict';
import {
    applyMercyKnockouts,
    canDrawNormally,
    createDeck,
    deepCopy,
    discardAllMatching,
    drawCards,
    getReverseDrawFourVictim,
    isWildDrawFourLegal,
    resolveWildDrawFour,
} from './cardBlitzRules.js';

function countByType(deck, type) {
    return deck.filter(card => card.type === type).length;
}

function makePlayers(handSizes = [0, 0, 0, 0]) {
    let id = 1000;
    return handSizes.map((size, index) => ({
        id: index,
        name: `Player ${index + 1}`,
        isHuman: index === 0,
        isOut: false,
        hand: Array.from({ length: size }, () => ({
            id: id++, color: 'red', type: 'number', value: 1,
        })),
    }));
}

test('classic and ruthless decks use their official card totals', () => {
    const classic = createDeck('classic');
    const ruthless = createDeck('nomercy');

    assert.equal(classic.length, 108);
    assert.equal(ruthless.length, 168);
    assert.equal(countByType(ruthless, 'number'), 80);
    assert.equal(countByType(ruthless, 'skip'), 12);
    assert.equal(countByType(ruthless, 'reverse'), 12);
    assert.equal(countByType(ruthless, 'draw2'), 12);
    assert.equal(countByType(ruthless, 'discard_all'), 12);
    assert.equal(countByType(ruthless, 'draw4'), 8);
    assert.equal(countByType(ruthless, 'skip_all'), 8);
    assert.equal(countByType(ruthless, 'wild_rev_draw4'), 8);
    assert.equal(countByType(ruthless, 'wild_roulette'), 8);
    assert.equal(countByType(ruthless, 'wild_draw6'), 4);
    assert.equal(countByType(ruthless, 'wild_draw10'), 4);
});

test('classic allows one optional draw while ruthless mode only draws with no legal play', () => {
    assert.equal(canDrawNormally('classic', false, 3), true);
    assert.equal(canDrawNormally('classic', true, 0), false);
    assert.equal(canDrawNormally('nomercy', false, 1), false);
    assert.equal(canDrawNormally('nomercy', false, 0), true);
});

test('bulk draws recycle both the discard pile and knocked-out hands', () => {
    const top = { id: 1, color: 'blue', type: 'number', value: 5 };
    const game = {
        drawPile: [{ id: 2 }],
        discardPile: [{ id: 3 }, { id: 4 }, top],
        knockedOutPile: [{ id: 5 }, { id: 6 }],
    };

    const result = drawCards(game, 5);

    assert.equal(result.drawn.length, 5);
    assert.deepEqual(result.g.discardPile, [top]);
    assert.deepEqual(result.g.knockedOutPile, []);
});

test('the mercy rule sets eliminated hands aside for the next reshuffle', () => {
    const game = {
        players: makePlayers([25, 3]),
        knockedOutPile: [{ id: 99 }],
    };

    const result = applyMercyKnockouts(game);

    assert.equal(result.g.players[0].isOut, true);
    assert.equal(result.g.players[0].hand.length, 0);
    assert.equal(result.g.knockedOutPile.length, 26);
    assert.equal(result.msgs.length, 1);
});

test('wild draw four legality considers matching colours and other wilds', () => {
    const played = { id: 1, color: 'wild', type: 'wild_draw4' };
    assert.equal(isWildDrawFourLegal([played, { id: 2, color: 'red' }], played.id, 'red'), false);
    assert.equal(isWildDrawFourLegal([played, { id: 3, color: 'wild' }], played.id, 'red'), false);
    assert.equal(isWildDrawFourLegal([played, { id: 4, color: 'blue' }], played.id, 'red'), true);
});

test('successful and failed draw-four challenges apply the correct penalty and turn', () => {
    const base = {
        players: makePlayers([0, 0, 0]),
        drawPile: Array.from({ length: 12 }, (_, id) => ({ id: id + 20 })),
        discardPile: [{ id: 10 }],
        knockedOutPile: [],
        direction: 1,
        pendingChallenge: { offenderIdx: 0, victimIdx: 1, wasLegal: false },
    };

    const successful = resolveWildDrawFour(base, true);
    assert.equal(successful.outcome, 'challenge_succeeded');
    assert.equal(successful.g.players[0].hand.length, 4);
    assert.equal(successful.g.players[1].hand.length, 0);
    assert.equal(successful.g.currentPlayerIdx, 1);

    const failed = resolveWildDrawFour({
        ...base,
        players: makePlayers([0, 0, 0]),
        pendingChallenge: { offenderIdx: 0, victimIdx: 1, wasLegal: true },
    }, true);
    assert.equal(failed.outcome, 'challenge_failed');
    assert.equal(failed.g.players[1].hand.length, 6);
    assert.equal(failed.g.currentPlayerIdx, 2);
});

test('discard all leaves the action card on top of the discard pile', () => {
    const played = { id: 3, color: 'red', type: 'discard_all' };
    const game = {
        players: makePlayers([0, 0]),
        discardPile: [{ id: 1, color: 'blue' }, played],
    };
    game.players[0].hand = [
        { id: 4, color: 'red', type: 'number', value: 2 },
        { id: 5, color: 'blue', type: 'number', value: 3 },
    ];

    const result = discardAllMatching(deepCopy({
        ...game,
        drawPile: [],
        knockedOutPile: [],
        pendingChallenge: null,
    }), 0, played);

    assert.equal(result.discarded, 2);
    assert.deepEqual(result.g.players[0].hand.map(card => card.id), [5]);
    assert.equal(result.g.discardPile.at(-1), played);
});

test('reverse draw four returns to its player when only two players remain', () => {
    const twoActive = makePlayers([1, 1, 1]);
    twoActive[2].isOut = true;

    assert.equal(getReverseDrawFourVictim(0, -1, twoActive), 0);
    twoActive[2].isOut = false;
    assert.equal(getReverseDrawFourVictim(0, -1, twoActive), 2);
});
