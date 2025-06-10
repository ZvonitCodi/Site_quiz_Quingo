const dotenv = require('dotenv');

// Загружаем нужный файл окружения
const envFile = process.env.NODE_ENV === '.env';
dotenv.config({ path: envFile });

const config = {
    db: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    },
    smtp: {
        host: 'smtp.yandex.ru',
        port: 465,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    },
    session: {
        secret: process.env.SESSION_SECRET,
        clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
        secure: process.env.NODE_ENV === 'production'
    },
    port: process.env.PORT || 3000
};

// Проверка обязательных переменных
const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'SESSION_SECRET', 'SMTP_USER', 'SMTP_PASS'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
    console.error('Отсутствуют обязательные переменные окружения:', missingEnv);
    process.exit(1);
}

module.exports = config;