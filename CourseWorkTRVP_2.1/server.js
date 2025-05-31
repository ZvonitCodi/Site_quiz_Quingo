const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const config = require('./config');
const { sessionStore } = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const logRoutes = require('./routes/log');
const setupQuiz = require('./websocket/quiz');
const logger = require('./utils/logger'); // Импортируем { serverLogger, clientLogger }

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(cors({
    origin: config.session.clientUrl,
    credentials: true
}));
app.use(bodyParser.json());
app.use(session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
        secure: config.session.secure,
        maxAge: 30 * 60 * 1000
    }
}));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api/log', logRoutes);

// WebSocket
setupQuiz(io);

server.listen(config.port, () => {
    logger.serverLogger.info(`Сервер запущен на http://localhost:${config.port}`); // Используем serverLogger
    console.log(`Сервер запущен на http://localhost:${config.port}`)
});