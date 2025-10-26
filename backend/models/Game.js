// Game model schema
const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    gameType: {
        type: String,
        required: true,
        enum: ['tictactoe', 'ludo', 'uno', 'battleship', 'bingo']
    },
    roomId: {
        type: String,
        required: true,
        unique: true
    },
    players: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        username: String,
        score: {
            type: Number,
            default: 0
        },
        isReady: {
            type: Boolean,
            default: false
        },
        isHost: {
            type: Boolean,
            default: false
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    status: {
        type: String,
        enum: ['waiting', 'in_progress', 'completed', 'cancelled'],
        default: 'waiting'
    },
    winner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    result: {
        type: String,
        enum: ['win', 'draw', 'cancelled']
    },
    betAmount: {
        type: Number,
        default: 0
    },
    gameData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    moves: [{
        player: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        move: mongoose.Schema.Types.Mixed,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    chat: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        message: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    tournamentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tournament'
    },
    duration: {
        type: Number, // in seconds
        default: 0
    },
    startedAt: Date,
    endedAt: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes
gameSchema.index({ roomId: 1 });
gameSchema.index({ status: 1 });
gameSchema.index({ gameType: 1 });
gameSchema.index({ 'players.user': 1 });
gameSchema.index({ createdAt: -1 });

// Methods
gameSchema.methods.startGame = function() {
    this.status = 'in_progress';
    this.startedAt = Date.now();
};

gameSchema.methods.endGame = function(winner, result) {
    this.status = 'completed';
    this.winner = winner;
    this.result = result;
    this.endedAt = Date.now();
    this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
};

gameSchema.methods.addMove = function(playerId, move) {
    this.moves.push({
        player: playerId,
        move: move,
        timestamp: Date.now()
    });
};

gameSchema.methods.addChatMessage = function(userId, message) {
    this.chat.push({
        user: userId,
        message: message,
        timestamp: Date.now()
    });
};

module.exports = mongoose.model('Game', gameSchema);