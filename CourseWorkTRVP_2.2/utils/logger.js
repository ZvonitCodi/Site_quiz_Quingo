// utils/logger.js
const winston = require('winston');
const path = require('path');

const createLogger = (filename) => winston.createLogger({
    level: 'info', // Изменено с 'error' на 'info'
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        })
    ),
    transports: [
        new winston.transports.File({ filename: path.join(__dirname, '../logs', filename) })
    ]
});

module.exports = {
    serverLogger: createLogger('server.log'),
    clientLogger: createLogger('client.log')
};