// User model schema
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [20, 'Username cannot exceed 20 characters'],
        match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscore']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: function() { return !this.googleId && !this.facebookId; },
        minlength: 6,
        select: false
    },
    avatar: {
        type: String,
        default: '/images/avatar-default.png'
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationCode: String,
    emailVerificationExpire: Date,
    passwordResetToken: String,
    passwordResetExpire: Date,
    
    // OAuth
    googleId: String,
    facebookId: String,
    
    // Gaming stats
    score: {
        type: Number,
        default: 0
    },
    level: {
        type: Number,
        default: 1
    },
    experience: {
        type: Number,
        default: 0
    },
    coins: {
        type: Number,
        default: 100
    },
    
    // Game statistics
    gamesPlayed: {
        type: Number,
        default: 0
    },
    gamesWon: {
        type: Number,
        default: 0
    },
    gamesLost: {
        type: Number,
        default: 0
    },
    gamesDraw: {
        type: Number,
        default: 0
    },
    winStreak: {
        type: Number,
        default: 0
    },
    bestWinStreak: {
        type: Number,
        default: 0
    },
    
    // Per game stats
    gameStats: {
        tictactoe: {
            played: { type: Number, default: 0 },
            won: { type: Number, default: 0 },
            lost: { type: Number, default: 0 },
            draw: { type: Number, default: 0 }
        },
        ludo: {
            played: { type: Number, default: 0 },
            won: { type: Number, default: 0 },
            lost: { type: Number, default: 0 },
            draw: { type: Number, default: 0 }
        },
        uno: {
            played: { type: Number, default: 0 },
            won: { type: Number, default: 0 },
            lost: { type: Number, default: 0 },
            draw: { type: Number, default: 0 }
        },
        battleship: {
            played: { type: Number, default: 0 },
            won: { type: Number, default: 0 },
            lost: { type: Number, default: 0 },
            draw: { type: Number, default: 0 }
        },
        bingo: {
            played: { type: Number, default: 0 },
            won: { type: Number, default: 0 },
            lost: { type: Number, default: 0 },
            draw: { type: Number, default: 0 }
        }
    },
    
    // Achievements
    achievements: [{
        id: String,
        name: String,
        description: String,
        icon: String,
        unlockedAt: Date
    }],
    
    // Social
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    friendRequests: [{
        from: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Settings
    settings: {
        soundEnabled: { type: Boolean, default: true },
        notificationsEnabled: { type: Boolean, default: true },
        privateProfile: { type: Boolean, default: false }
    },
    
    // Status
    isOnline: {
        type: Boolean,
        default: false
    },
    lastSeen: Date,
    isBanned: {
        type: Boolean,
        default: false
    },
    banReason: String,
    banExpire: Date,
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ score: -1 });
userSchema.index({ 'gameStats.tictactoe.won': -1 });

// Virtual for win rate
userSchema.virtual('winRate').get(function() {
    if (this.gamesPlayed === 0) return 0;
    return Math.round((this.gamesWon / this.gamesPlayed) * 100);
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        next();
    }
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.updatedAt = Date.now();
});

// Match password
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
userSchema.methods.getSignedJwtToken = function() {
    return jwt.sign(
        { 
            id: this._id,
            username: this.username,
            email: this.email
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
    );
};

// Generate email verification code
userSchema.methods.generateEmailVerificationCode = function() {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.emailVerificationCode = code;
    this.emailVerificationExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    return code;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
    const resetToken = require('crypto').randomBytes(20).toString('hex');
    this.passwordResetToken = require('crypto')
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    this.passwordResetExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    return resetToken;
};

// Update game stats
userSchema.methods.updateGameStats = function(gameType, result) {
    this.gamesPlayed++;
    this.gameStats[gameType].played++;
    
    if (result === 'win') {
        this.gamesWon++;
        this.gameStats[gameType].won++;
        this.winStreak++;
        if (this.winStreak > this.bestWinStreak) {
            this.bestWinStreak = this.winStreak;
        }
    } else if (result === 'lose') {
        this.gamesLost++;
        this.gameStats[gameType].lost++;
        this.winStreak = 0;
    } else if (result === 'draw') {
        this.gamesDraw++;
        this.gameStats[gameType].draw++;
    }
    
    // Update level based on experience
    this.experience += result === 'win' ? 100 : result === 'draw' ? 50 : 25;
    this.level = Math.floor(this.experience / 1000) + 1;
};

module.exports = mongoose.model('User', userSchema);