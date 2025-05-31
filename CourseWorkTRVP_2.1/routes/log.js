const express = require('express');
const { clientLogger } = require('../utils/logger');
const router = express.Router();

router.post('/', (req, res) => {
    try {
        const logs = Array.isArray(req.body) ? req.body : [req.body];
        for (const log of logs) {
            const { timestamp, message } = log;
            if (!timestamp || !message) {
                return res.status(400).json({ message: 'Missing timestamp or message' });
            }
            clientLogger.error(message);
        }
        res.status(200).json({ message: 'Logs saved' });
    } catch (error) {
        console.error('Error saving client logs:', error);
        res.status(500).json({ message: 'Failed to save logs' });
    }
});

module.exports = router;