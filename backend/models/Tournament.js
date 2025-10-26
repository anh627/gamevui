// Tournament model schema
const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: String,
    gameType: {
        type: String,
        required: true,
        enum: ['tictactoe', 'ludo', 'uno', 'battleship', 'bingo', 'mixed']
    },
    format: {
        type: String,
        enum: ['single_elimination', 'double_elimination', 'round_robin', 'swiss'],
        default: 'single_elimination'
    },
    status: {
        type: String,
        enum: ['upcoming', 'registration', 'in_progress', 'completed', 'cancelled'],
        default: 'upcoming'
    },
    maxParticipants: {
        type: Number,
        required: true,
        min: 2,
        max: 128
    },
    minParticipants: {
        type: Number,
        default: 2
    },
    participants: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        username: String,
        seed: Number,
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        draws: { type: Number, default: 0 },
        points: { type: Number, default: 0 },
        isEliminated: { type: Boolean, default: false },
        registeredAt: { type: Date, default: Date.now }
    }],
    brackets: [{
        round: Number,
        matches: [{
            matchId: String,
            player1: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            player2: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            winner: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            gameId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Game'
            },
            status: {
                type: String,
                enum: ['pending', 'in_progress', 'completed'],
                default: 'pending'
            }
        }]
    }],
    prizes: {
        first: {
            coins: { type: Number, default: 0 },
            points: { type: Number, default: 0 },
            badge: String
        },
        second: {
            coins: { type: Number, default: 0 },
            points: { type: Number, default: 0 },
            badge: String
        },
        third: {
            coins: { type: Number, default: 0 },
            points: { type: Number, default: 0 },
            badge: String
        }
    },
    entryFee: {
        type: Number,
        default: 0
    },
    rules: [String],
    startDate: {
        type: Date,
        required: true
    },
    endDate: Date,
    registrationStartDate: Date,
    registrationEndDate: Date,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes
tournamentSchema.index({ status: 1 });
tournamentSchema.index({ gameType: 1 });
tournamentSchema.index({ startDate: 1 });
tournamentSchema.index({ 'participants.user': 1 });

// Methods
tournamentSchema.methods.registerParticipant = function(userId, username) {
    if (this.participants.length >= this.maxParticipants) {
        throw new Error('Tournament is full');
    }
    
    const alreadyRegistered = this.participants.some(p => 
        p.user.toString() === userId.toString()
    );
    
    if (alreadyRegistered) {
        throw new Error('Already registered');
    }
    
    this.participants.push({
        user: userId,
        username: username,
        seed: this.participants.length + 1
    });
    
    return true;
};

tournamentSchema.methods.generateBrackets = function() {
    if (this.format !== 'single_elimination') {
        throw new Error('Bracket generation only for single elimination');
    }
    
    const participantCount = this.participants.length;
    const rounds = Math.ceil(Math.log2(participantCount));
    
    this.brackets = [];
    
    // First round
    const firstRoundMatches = [];
    for (let i = 0; i < participantCount; i += 2) {
        firstRoundMatches.push({
            matchId: `R1M${Math.floor(i/2) + 1}`,
            player1: this.participants[i]?.user,
            player2: this.participants[i + 1]?.user,
            status: 'pending'
        });
    }
    
    this.brackets.push({
        round: 1,
        matches: firstRoundMatches
    });
    
    // Generate subsequent rounds
    for (let round = 2; round <= rounds; round++) {
        const matchCount = Math.pow(2, rounds - round);
        const roundMatches = [];
        
        for (let i = 0; i < matchCount; i++) {
            roundMatches.push({
                matchId: `R${round}M${i + 1}`,
                status: 'pending'
            });
        }
        
        this.brackets.push({
            round: round,
            matches: roundMatches
        });
    }
};

module.exports = mongoose.model('Tournament', tournamentSchema);