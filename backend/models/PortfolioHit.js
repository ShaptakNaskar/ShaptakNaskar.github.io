const mongoose = require('mongoose');

const portfolioHitSchema = new mongoose.Schema({
    hits: {
        type: Number,
        required: true,
        default: 0
    }
}, { collection: 'portfolio_hits' });

module.exports = mongoose.model('PortfolioHit', portfolioHitSchema);
