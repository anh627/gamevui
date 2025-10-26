// Main server file - Entry point
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
require('dotenv').config();

// Import configurations
const connectDB = require('./config/db');
const socketHandler = require('./config/socket');

// Import routes
const authRoutes = require('./routes/authRoutes');
const gameRoutes = require('./routes/gameRoutes');
const tournamentRoutes = require('./routes/tournamentRoutes');
const userRoutes = require('./routes/userRoutes');

// Import middleware
const { errorHandler } = require('./middleware/errorMiddleware');
const { notFound } = require('./middleware/notFoundMiddleware');

// Initialize express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIO(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        credentials: true
    }
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // Logging

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Passport middleware
app.use(passport.initialize());
require('./config/passport')(passport);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/tournament', tournamentRoutes);
app.use('/api/user', userRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
    });
});

// Socket.io handling
socketHandler(io);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 Client URL: ${process.env.CLIENT_URL}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.error(`Error: ${err.message}`);
    server.close(() => process.exit(1));
});