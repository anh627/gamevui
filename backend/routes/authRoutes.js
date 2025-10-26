const express = require('express');
const router = express.Router();
const {
    register,
    login,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    getMe,
    logout,
    updateProfile,
    changePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validateRegister, validateLogin } = require('../middleware/validationMiddleware');

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:resetToken', resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/update-profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

// OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', 
    passport.authenticate('google', { session: false }),
    (req, res) => {
        const token = req.user.getSignedJwtToken();
        res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
    }
);

module.exports = router;