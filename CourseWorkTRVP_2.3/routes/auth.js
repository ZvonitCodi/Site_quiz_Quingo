const express = require('express');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const router = express.Router();
const { pool } = require('../db');
const config = require('../config');
const { serverLogger } = require('../utils/logger');

const transporter = nodemailer.createTransport(config.smtp);

const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const recoveryCodes = {};

setInterval(() => {
    const now = Date.now();
    for (const email in recoveryCodes) {
        if (recoveryCodes[email].expires < now) {
            delete recoveryCodes[email];
        }
    }
}, 60 * 1000);

router.post('/request-password-reset', async (req, res) => {
    const { nickname } = req.body;
    if (!nickname) {
        return res.status(400).json({ message: 'Укажите ник' });
    }
    try {
        const [rows] = await pool.query('SELECT email FROM users WHERE username = ?', [nickname]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        const email = rows[0].email;
        if (!isValidEmail(email)) {
            return res.status(400).json({ message: 'Некорректный email' });
        }
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        recoveryCodes[email] = {
            code,
            expires: Date.now() + 10 * 60 * 1000
        };
        await transporter.sendMail({
            from: `"Quingo" <${config.smtp.auth.user}>`,
            to: email,
            subject: 'Код для восстановления пароля',
            text: `Ваш код для восстановления: ${code}`
        });
        serverLogger.info('Код восстановления отправлен', { email });
        res.json({ message: 'Код отправлен на почту', email });
    } catch (err) {
        serverLogger.error('Ошибка отправки кода восстановления', { error: err.message });
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.post('/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body;
    const record = recoveryCodes[email];
    if (!record || record.code !== code || Date.now() > record.expires) {
        return res.status(400).json({ message: 'Неверный или просроченный код' });
    }
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
        delete recoveryCodes[email];
        serverLogger.info('Пароль успешно сброшен', { email });
        res.json({ message: 'Пароль обновлён' });
    } catch (err) {
        serverLogger.error('Ошибка сброса пароля', { error: err.message });
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.post('/register', async (req, res) => {
    const { nickname, email, password, gender } = req.body;
    if (!nickname || !email || !password || !gender) {
        return res.status(400).json({ message: 'Заполните все поля!' });
    }
    if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Некорректный email' });
    }
    if (nickname.length > 50 || email.length > 100) {
        return res.status(400).json({ message: 'Слишком длинный ник или email' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO users (username, email, password, gender) VALUES (?, ?, ?, ?)', 
            [nickname, email, hashedPassword, gender]
        );
        
        req.session.user = { id: result.insertId, nickname, gender };
        req.session.save((err) => {
            if (err) {
                serverLogger.error(`Ошибка сохранения сессии при регистрации: ${err.message}`);
                return res.status(500).json({ message: 'Ошибка сервера.' });
            }
            serverLogger.info('Пользователь зарегистрирован и вошёл', { nickname, email });
            res.status(201).json({ 
                message: 'Пользователь успешно зарегистрирован!',
                user: { id: result.insertId, nickname, gender } 
            });
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Такой email или ник уже зарегистрирован.' });
        }
        serverLogger.error('Ошибка регистрации', { error: err.message });
        res.status(500).json({ message: 'Ошибка сервера.' });
    }
});

router.post('/login', async (req, res) => {
    const { nickname, password } = req.body;
    if (!nickname || !password) {
        return res.status(400).json({ message: 'Введите ник и пароль' });
    }
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [nickname]);
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Пользователь не найден' });
        }
        const user = rows[0];
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: 'Неверный пароль' });
        }
        
        req.session.user = { id: user.id, nickname: user.username, gender: user.gender };
        req.session.save((err) => {
            if (err) {
                serverLogger.error(`Ошибка сохранения сессии при входе: ${err.message}`);
                return res.status(500).json({ message: 'Ошибка сервера.' });
            }
            serverLogger.info('Пользователь вошёл', { nickname });
            res.status(200).json({ 
                message: 'Вход выполнен успешно', 
                user: { id: user.id, nickname: user.username, gender: user.gender } 
            });
        });
    } catch (err) {
        serverLogger.error('Ошибка входа', { error: err.message });
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.get('/check-auth', async (req, res) => {
    if (req.session.user) {
        try {
            // Запрашиваем gender из базы данных, если его нет в сессии
            const [rows] = await pool.query('SELECT gender FROM users WHERE id = ?', [req.session.user.id]);
            const gender = rows[0]?.gender || req.session.user.gender;
            serverLogger.info(`Проверка аутентификации: userId=${req.session.user.id}, nickname=${req.session.user.nickname}, gender=${gender}`);
            res.json({ 
                authenticated: true, 
                user: { 
                    id: req.session.user.id, 
                    nickname: req.session.user.nickname, 
                    gender 
                } 
            });
        } catch (err) {
            serverLogger.error('Ошибка проверки аутентификации', { error: err.message });
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    } else {
        serverLogger.info('Проверка аутентификации: пользователь не аутентифицирован');
        res.json({ authenticated: false });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            serverLogger.error('Ошибка выхода', { error: err.message });
            return res.status(500).json({ message: 'Ошибка выхода' });
        }
        res.clearCookie('connect.sid');
        serverLogger.info('Пользователь вышел');
        res.json({ message: 'Вы успешно вышли' });
    });
});

module.exports = router;