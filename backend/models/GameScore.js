const mongoose = require('mongoose');

const gameScoreSchema = new mongoose.Schema({
    game: {
        type: String,
        required: true,
        enum: ['paddles', 'wordguess', '2048', 'breakout', 'cosmic-lander', 'space-defender'],
        index: true
    },
    playerName: {
        type: String,
        required: true,
        maxlength: 20
    },
    score: {
        type: Number,
        required: true
    },
    achievement: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { collection: 'game_scores' });

// Compound index for efficient leaderboard queries
gameScoreSchema.index({ game: 1, score: -1 });

module.exports = mongoose.model('GameScore', gameScoreSchema);
