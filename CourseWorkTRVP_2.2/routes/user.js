const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { serverLogger } = require('../utils/logger');

const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Вспомогательная функция для получения статистики
async function getUserStats(userId) {
    try {
        const [stats] = await pool.query('SELECT * FROM user_stats WHERE user_id = ?', [userId]);
        if (stats.length === 0) {
            await pool.query('INSERT INTO user_stats (user_id) VALUES (?)', [userId]);
            return {
                total_games: 0,
                wins: 0,
                losses: 0,
                quiz_score: 0,
                hangman_wins: 0
            };
        }
        return stats[0];
    } catch (err) {
        serverLogger.error('Ошибка получения статистики', { error: err.message, userId });
        throw err;
    }
}

router.get('/user/:id', async (req, res) => {
    if (!req.session.user || req.session.user.id !== parseInt(req.params.id)) {
        return res.status(403).json({ message: 'Доступ запрещен' });
    }
    try {
        const [rows] = await pool.query(
            'SELECT username, email, gender, birth_date, about FROM users WHERE id = ?',
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        res.json(rows[0]);
    } catch (err) {
        serverLogger.error('Ошибка получения данных пользователя', { error: err.message, userId: req.params.id });
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.put('/user/:id', async (req, res) => {
    if (!req.session.user || req.session.user.id !== parseInt(req.params.id)) {
        return res.status(403).json({ message: 'Доступ запрещен' });
    }
    const { username, email, gender, birth_date, about } = req.body;
    if (!username || !email || !gender) {
        return res.status(400).json({ message: 'Заполните обязательные поля' });
    }
    if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Некорректный email' });
    }
    if (username.length > 50 || email.length > 100 || about?.length > 500) {
        return res.status(400).json({ message: 'Слишком длинные поля' });
    }
    try {
        if (username !== req.session.user.nickname) {
            const [existing] = await pool.query(
                'SELECT id FROM users WHERE username = ? AND id != ?',
                [username, req.params.id]
            );
            if (existing.length > 0) {
                return res.status(409).json({ message: 'Этот nickname уже занят' });
            }
        }
        await pool.query(
            `UPDATE users 
             SET username = ?, email = ?, gender = ?, birth_date = ?, about = ?
             WHERE id = ?`,
            [username, email, gender, birth_date || null, about || null, req.params.id]
        );
        if (username !== req.session.user.nickname) {
            req.session.user.nickname = username;
        }
        serverLogger.info('Профиль обновлен', { userId: req.params.id });
        res.json({ message: 'Профиль успешно обновлен' });
    } catch (err) {
        serverLogger.error('Ошибка обновления профиля', { error: err.message, userId: req.params.id });
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.get('/check-nickname', async (req, res) => {
    const { nickname } = req.query;
    if (!nickname) {
        return res.status(400).json({ message: 'Не указан nickname' });
    }
    try {
        const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [nickname]);
        res.json({ available: rows.length === 0 });
    } catch (err) {
        serverLogger.error('Ошибка проверки nickname', { error: err.message, nickname });
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.get('/user-stats/:id', async (req, res) => {
    try {
        const stats = await getUserStats(req.params.id);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.get('/stats/:nickname', async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id FROM users WHERE username = ?', [req.params.nickname]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        const userId = users[0].id;
        const stats = await getUserStats(userId);
        res.json(stats);
    } catch (err) {
        serverLogger.error('Ошибка получения статистики по никнейму', { error: err.message, nickname: req.params.nickname });
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.get('/recent-games/:id', async (req, res) => {
    try {
        const [games] = await pool.query(
            `SELECT gs.id, gt.name AS game_name, sp.is_winner, gs.created_at AS played_at
             FROM session_players sp
             JOIN game_sessions gs ON sp.session_id = gs.id
             JOIN game_types gt ON gs.game_type_id = gt.id
             WHERE sp.user_id = ?
             ORDER BY gs.created_at DESC
             LIMIT 10`,
            [req.params.id]
        );
        res.json(games);
    } catch (err) {
        serverLogger.error('Ошибка получения последних игр', { error: err.message, userId: req.params.id });
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.get('/leaderboard/:nickname', async (req, res) => {
    const nickname = req.params.nickname;

    try {
        const [topPlayers] = await pool.query(`
            SELECT u.username AS nickname, COALESCE(s.quiz_score, 0) AS quiz_score,
                   ROW_NUMBER() OVER (ORDER BY COALESCE(s.quiz_score, 0) DESC) AS rankb
            FROM users u
            LEFT JOIN user_stats s ON u.id = s.user_id
            ORDER BY COALESCE(s.quiz_score, 0) DESC
            LIMIT 10
        `);

        const [userRow] = await pool.query(`
            SELECT u.username AS nickname, COALESCE(s.quiz_score, 0) AS quiz_score,
                   (SELECT COUNT(*) + 1
                    FROM user_stats s2
                    WHERE COALESCE(s2.quiz_score, 0) > COALESCE(s.quiz_score, 0)) AS rankb
            FROM users u
            LEFT JOIN user_stats s ON u.id = s.user_id
            WHERE u.username = ?
        `, [nickname]);

        res.json({ topPlayers, currentUser: userRow[0] });
    } catch (err) {
        console.error('Ошибка получения лидерборда:', err);
        res.status(500).json({ error: 'Ошибка при получении лидерборда' });
    }
});

router.delete('/user/:id', async (req, res) => {
    if (!req.session.user || req.session.user.id !== parseInt(req.params.id)) {
        return res.status(403).json({ message: 'Доступ запрещен' });
    }
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        req.session.destroy();
        serverLogger.info('Аккаунт удален', { userId: req.params.id });
        res.json({ message: 'Аккаунт успешно удален' });
    } catch (err) {
        serverLogger.error('Ошибка удаления аккаунта', { error: err.message, userId: req.params.id });
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

module.exports = router;