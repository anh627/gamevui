const express = require('express');
const router = express.Router();
const {
    createTournament,
    getTournaments,
    getTournament,
    joinTournament,
    leaveTournament,
    getTournamentLeaderboard,
    startTournament,
    updateMatchResult,
    getCurrentTournament
} = require('../controllers/tournamentController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getTournaments);
router.get('/current/leaderboard', getCurrentTournament);
router.get('/:id', getTournament);
router.get('/:id/leaderboard', getTournamentLeaderboard);

// Protected routes
router.post('/:id/join', protect, joinTournament);
router.post('/:id/leave', protect, leaveTournament);
router.post('/:id/match/:matchId', protect, updateMatchResult);

// Admin routes
router.post('/create', protect, admin, createTournament);
router.post('/:id/start', protect, admin, startTournament);

module.exports = router;