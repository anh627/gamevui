const express = require('express');
const router = express.Router();
const {
    createGame,
    joinGame,
    leaveGame,
    startGame,
    endGame,
    getGameHistory,
    getGlobalLeaderboard,
    getGameLeaderboard,
    searchPlayer,
    getFriendsLeaderboard,
    saveMove
} = require('../controllers/gameController');
const { protect } = require('../middleware/authMiddleware');

// Protected routes
router.post('/create', protect, createGame);
router.post('/join', protect, joinGame);
router.post('/leave', protect, leaveGame);
router.post('/start', protect, startGame);
router.post('/end', protect, endGame);
router.post('/move', protect, saveMove);
router.get('/history', protect, getGameHistory);
router.get('/search-player', protect, searchPlayer);
router.get('/leaderboard/friends', protect, getFriendsLeaderboard);

// Public routes
router.get('/leaderboard/global', getGlobalLeaderboard);
router.get('/leaderboard/:gameType', getGameLeaderboard);

module.exports = router;