const mysql = require('mysql2/promise');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const config = require('../config');
const { serverLogger } = require('../utils/logger');

const pool = mysql.createPool(config.db);

(async () => {
    try {
        const conn = await pool.getConnection();
        serverLogger.info('✅ Успешное подключение к базе данных'); // Исправлено: logger → serverLogger
        conn.release();
    } catch (err) {
        serverLogger.error(`❌ Ошибка подключения к базе данных: ${err.message}`);
        process.exit(1);
    }
})();

const sessionStore = new MySQLStore({}, pool);

module.exports = { pool, sessionStore };