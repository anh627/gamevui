// Game controller
const Game = require('../models/Game');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const { v4: uuidv4 } = require('uuid');

// @desc    Create new game room
// @route   POST /api/game/create
// @access  Private
exports.createGame = asyncHandler(async (req, res) => {
    const { gameType, betAmount } = req.body;
    
    const roomId = uuidv4();
    
    const game = await Game.create({
        gameType,
        roomId,
        betAmount: betAmount || 0,
        players: [{
            user: req.user.id,
            username: req.user.username,
            isHost: true,
            isReady: false
        }],
        status: 'waiting'
    });
    
    res.status(201).json({
        success: true,
        game
    });
});

// @desc    Join game room
// @route   POST /api/game/join/:roomId
// @access  Private
exports.joinGame = asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    
    const game = await Game.findOne({ roomId });
    
    if (!game) {
        res.status(404);
        throw new Error('Game not found');
    }
    
    if (game.status !== 'waiting') {
        res.status(400);
        throw new Error('Game already started');
    }
    
    // Check if player already in game
    const alreadyJoined = game.players.some(p => 
        p.user.toString() === req.user.id
    );
    
    if (alreadyJoined) {
        res.status(400);
        throw new Error('Already in this game');
    }
    
    // Check game capacity
    const maxPlayers = getMaxPlayers(game.gameType);
    if (game.players.length >= maxPlayers) {
        res.status(400);
        throw new Error('Game is full');
    }
    
    game.players.push({
        user: req.user.id,
        username: req.user.username,
        isHost: false,
        isReady: false
    });
    
    await game.save();
    
    res.json({
        success: true,
        game
    });
});

// @desc    Leave game room
// @route   POST /api/game/leave/:roomId
// @access  Private
exports.leaveGame = asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    
    const game = await Game.findOne({ roomId });
    
    if (!game) {
        res.status(404);
        throw new Error('Game not found');
    }
    
    game.players = game.players.filter(p => 
        p.user.toString() !== req.user.id
    );
    
    // If host leaves, make next player host
    if (game.players.length > 0 && !game.players.some(p => p.isHost)) {
        game.players[0].isHost = true;
    }
    
    // Cancel game if no players left
    if (game.players.length === 0) {
        game.status = 'cancelled';
    }
    
    await game.save();
    
    res.json({
        success: true,
        message: 'Left game successfully'
    });
});

// @desc    Save game result
// @route   POST /api/game/result
// @access  Private
exports.saveGameResult = asyncHandler(async (req, res) => {
    const { roomId, winnerId, result, gameData } = req.body;
    
    const game = await Game.findOne({ roomId });
    
    if (!game) {
        res.status(404);
        throw new Error('Game not found');
    }
    
    game.endGame(winnerId, result);
    game.gameData = gameData;
    await game.save();
    
    // Update player stats
    for (const player of game.players) {
        const user = await User.findById(player.user);
        
        if (user) {
            let playerResult;
            if (result === 'draw') {
                playerResult = 'draw';
            } else if (player.user.toString() === winnerId.toString()) {
                playerResult = 'win';
                user.score += 100;
                user.coins += game.betAmount * 2;
            } else {
                playerResult = 'lose';
                user.score += 10;
            }
            
            user.updateGameStats(game.gameType, playerResult);
            await user.save();
        }
    }
    
    res.json({
        success: true,
        game
    });
});

// @desc    Get game by room ID
// @route   GET /api/game/:roomId
// @access  Private
exports.getGame = asyncHandler(async (req, res) => {
    const game = await Game.findOne({ roomId: req.params.roomId })
        .populate('players.user', 'username avatar level');
    
    if (!game) {
        res.status(404);
        throw new Error('Game not found');
    }
    
    res.json({
        success: true,
        game
    });
});

// @desc    Get leaderboard
// @route   GET /api/game/leaderboard/:gameType?
// @access  Public
exports.getLeaderboard = asyncHandler(async (req, res) => {
    const { gameType } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    
    let sortField = 'score';
    
    if (gameType && gameType !== 'all') {
        sortField = `gameStats.${gameType}.won`;
    }
    
    const users = await User.find({ isBanned: false })
        .select('username avatar score level gamesWon gamesPlayed gameStats')
        .sort({ [sortField]: -1 })
        .limit(limit);
    
    res.json({
        success: true,
        leaderboard: users
    });
});

// @desc    Get user's game history
// @route   GET /api/game/history
// @access  Private
exports.getGameHistory = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const games = await Game.find({
        'players.user': req.user.id,
        status: 'completed'
    })
    .populate('players.user', 'username avatar')
    .populate('winner', 'username avatar')
    .sort({ endedAt: -1 })
    .skip(skip)
    .limit(limit);
    
    const total = await Game.countDocuments({
        'players.user': req.user.id,
        status: 'completed'
    });
    
    res.json({
        success: true,
        games,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

// @desc    Get active games
// @route   GET /api/game/active
// @access  Public
exports.getActiveGames = asyncHandler(async (req, res) => {
    const { gameType } = req.query;
    
    const filter = { status: 'waiting' };
    if (gameType && gameType !== 'all') {
        filter.gameType = gameType;
    }
    
    const games = await Game.find(filter)
        .populate('players.user', 'username avatar level')
        .sort({ createdAt: -1 })
        .limit(50);
    
    res.json({
        success: true,
        games
    });
});

// Helper function
function getMaxPlayers(gameType) {
    const maxPlayers = {
        tictactoe: 2,
        ludo: 4,
        uno: 4,
        battleship: 2,
        bingo: 10
    };
    return maxPlayers[gameType] || 2;
}