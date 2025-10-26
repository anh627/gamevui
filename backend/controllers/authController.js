// Authentication controller
const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    
    // Check if user exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    
    if (userExists) {
        res.status(400);
        throw new Error('User already exists with this email or username');
    }
    
    // Create user
    const user = await User.create({
        username,
        email,
        password
    });
    
    // Generate verification code
    const verificationCode = user.generateEmailVerificationCode();
    await user.save();
    
    // Send verification email
    try {
        await sendEmail({
            to: user.email,
            subject: 'Xác thực tài khoản Game Vui',
            html: `
                <h2>Chào mừng đến với Game Vui!</h2>
                <p>Mã xác thực của bạn là: <strong>${verificationCode}</strong></p>
                <p>Mã này sẽ hết hạn sau 10 phút.</p>
            `
        });
    } catch (error) {
        user.emailVerificationCode = undefined;
        user.emailVerificationExpire = undefined;
        await user.save();
        
        res.status(500);
        throw new Error('Email could not be sent');
    }
    
    res.status(201).json({
        success: true,
        message: 'User registered successfully. Please check your email for verification code.'
    });
});

// @desc    Verify email
// @route   POST /api/auth/verify-email
// @access  Public
exports.verifyEmail = asyncHandler(async (req, res) => {
    const { email, code } = req.body;
    
    const user = await User.findOne({
        email,
        emailVerificationCode: code,
        emailVerificationExpire: { $gt: Date.now() }
    });
    
    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired verification code');
    }
    
    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();
    
    res.json({
        success: true,
        message: 'Email verified successfully'
    });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    // Check for user
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
        res.status(401);
        throw new Error('Invalid credentials');
    }
    
    // Check if email is verified
    if (!user.isEmailVerified) {
        res.status(401);
        throw new Error('Please verify your email first');
    }
    
    // Check if user is banned
    if (user.isBanned && user.banExpire > Date.now()) {
        res.status(403);
        throw new Error(`Account banned. Reason: ${user.banReason}`);
    }
    
    // Check password
    const isPasswordMatch = await user.matchPassword(password);
    
    if (!isPasswordMatch) {
        res.status(401);
        throw new Error('Invalid credentials');
    }
    
    // Update last seen
    user.lastSeen = Date.now();
    user.isOnline = true;
    await user.save();
    
    // Create token
    const token = user.getSignedJwtToken();
    
    res.json({
        success: true,
        token,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            score: user.score,
            level: user.level,
            coins: user.coins
        }
    });
});

// @desc    Resend verification code
// @route   POST /api/auth/resend-verification
// @access  Public
exports.resendVerification = asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    
    if (user.isEmailVerified) {
        res.status(400);
        throw new Error('Email already verified');
    }
    
    // Generate new verification code
    const verificationCode = user.generateEmailVerificationCode();
    await user.save();
    
    // Send email
    try {
        await sendEmail({
            to: user.email,
            subject: 'Mã xác thực mới - Game Vui',
            html: `
                <h2>Mã xác thực mới</h2>
                <p>Mã xác thực của bạn là: <strong>${verificationCode}</strong></p>
                <p>Mã này sẽ hết hạn sau 10 phút.</p>
            `
        });
        
        res.json({
            success: true,
            message: 'Verification code sent'
        });
    } catch (error) {
        user.emailVerificationCode = undefined;
        user.emailVerificationExpire = undefined;
        await user.save();
        
        res.status(500);
        throw new Error('Email could not be sent');
    }
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    
    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();
    
    // Create reset URL
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    
    // Send email
    try {
        await sendEmail({
            to: user.email,
            subject: 'Reset mật khẩu - Game Vui',
            html: `
                <h2>Reset mật khẩu</h2>
                <p>Bạn đã yêu cầu reset mật khẩu.</p>
                <p>Click vào link sau để reset: <a href="${resetUrl}">${resetUrl}</a></p>
                <p>Link này sẽ hết hạn sau 10 phút.</p>
            `
        });
        
        res.json({
            success: true,
            message: 'Reset password link sent'
        });
    } catch (error) {
        user.passwordResetToken = undefined;
        user.passwordResetExpire = undefined;
        await user.save();
        
        res.status(500);
        throw new Error('Email could not be sent');
    }
});

// @desc    Reset password
// @route   POST /api/auth/reset-password/:resetToken
// @access  Public
exports.resetPassword = asyncHandler(async (req, res) => {
    const { password } = req.body;
    
    // Get hashed token
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.resetToken)
        .digest('hex');
    
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpire: { $gt: Date.now() }
    });
    
    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired reset token');
    }
    
    // Set new password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    await user.save();
    
    res.json({
        success: true,
        message: 'Password reset successful'
    });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id)
        .populate('friends', 'username avatar isOnline')
        .populate('friendRequests.from', 'username avatar');
    
    res.json({
        success: true,
        user
    });
});

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    
    user.isOnline = false;
    user.lastSeen = Date.now();
    await user.save();
    
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// @desc    Update profile
// @route   PUT /api/auth/update-profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res) => {
    const { username, avatar, settings } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (username && username !== user.username) {
        // Check if username is taken
        const usernameExists = await User.findOne({ username });
        if (usernameExists) {
            res.status(400);
            throw new Error('Username already taken');
        }
        user.username = username;
    }
    
    if (avatar) user.avatar = avatar;
    if (settings) user.settings = { ...user.settings, ...settings };
    
    await user.save();
    
    res.json({
        success: true,
        user
    });
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.id).select('+password');
    
    // Check current password
    const isPasswordMatch = await user.matchPassword(currentPassword);
    
    if (!isPasswordMatch) {
        res.status(401);
        throw new Error('Current password is incorrect');
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({
        success: true,
        message: 'Password changed successfully'
    });
});