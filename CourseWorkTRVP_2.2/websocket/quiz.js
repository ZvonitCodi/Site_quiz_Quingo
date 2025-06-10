const { pool } = require('../db');
const { serverLogger } = require('../utils/logger');

const rooms = {};
const chatHistory = {};

const { v4: uuidv4 } = require('uuid');

async function generateRoomCode(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    do {
        code = Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (rooms[code]);
    return code;
}

async function getRandomQuestions(limit = 15) {
    try {
        const questionLimit = Math.max(1, Math.min(parseInt(limit) || 15, 50));
        const [rows] = await pool.query(
            `SELECT id, question, correct_answer, wrong_answer1, wrong_answer2, wrong_answer3
             FROM quiz_questions
             ORDER BY RAND()
             LIMIT ?`, [questionLimit]
        );
        if (rows.length < questionLimit) {
            serverLogger.warn(`Запрошено ${questionLimit} вопросов, но доступно только ${rows.length}`);
        }
        return rows.map(row => {
            const options = [row.correct_answer, row.wrong_answer1, row.wrong_answer2, row.wrong_answer3];
            const shuffled = options
                .map(value => ({ value, sort: Math.random() }))
                .sort((a, b) => a.sort - b.sort)
                .map(obj => obj.value);
            return {
                question: row.question,
                options: shuffled,
                answer: shuffled.indexOf(row.correct_answer)
            };
        });
    } catch (err) {
        serverLogger.error(`Ошибка загрузки вопросов: ${err.message}`);
        throw err;
    }
}

async function handleGameOver(io, roomCode) {
    const room = rooms[roomCode];
    if (!room || !room.players || Object.keys(room.players).length === 0) {
        serverLogger.warn(`Попытка завершения игры для пустой комнаты: ${roomCode}`);
        return;
    }
    const players = Object.values(room.players).filter(p => !p.leftDuringGame);
    const winnerScore = Math.max(...players.map(p => p.score || 0));
    const winners = players.filter(p => p.score === winnerScore);
    const usernames = players.map(p => p.name);
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [[quizGameType]] = await conn.query('SELECT id FROM game_types WHERE name = ?', ['quiz']);
        if (!quizGameType) throw new Error("Тип игры 'quiz' не найден");
        const gameTypeId = quizGameType.id;
        const [sessionResult] = await conn.query(
            'INSERT INTO game_sessions (game_type_id, status, started_at, ended_at) VALUES (?, "ended", NOW(), NOW())',
            [gameTypeId]
        );
        const sessionId = sessionResult.insertId;
        const [usersInDb] = await conn.query(
            'SELECT id, username FROM users WHERE username IN (?)',
            [usernames]
        );
        const userMap = {};
        usersInDb.forEach(user => {
            userMap[user.username] = user.id;
        });
        for (const player of players) {
            const userId = userMap[player.name];
            if (!userId) continue;
            const isWinner = winners.some(w => w.name === player.name);
            await conn.query(
                'INSERT INTO session_players (session_id, user_id, score, is_winner) VALUES (?, ?, ?, ?)',
                [sessionId, userId, player.score, isWinner]
            );
            await conn.query(`
                INSERT INTO user_stats (user_id, total_games, wins, losses, quiz_score)
                VALUES (?, 1, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    total_games = total_games + 1,
                    wins = wins + VALUES(wins),
                    losses = losses + VALUES(losses),
                    quiz_score = quiz_score + VALUES(quiz_score)
            `, [userId, isWinner ? 1 : 0, isWinner ? 0 : 1, player.score]);
        }
        await conn.commit();
        serverLogger.info(`Игра завершена, статистика обновлена: roomCode=${roomCode}, sessionId=${sessionId}`);
    } catch (err) {
        await conn.rollback();
        serverLogger.error(`Ошибка обновления статистики игры: ${err.message}, roomCode=${roomCode}`);
    } finally {
        conn.release();
    }

    room.gameCount = (room.gameCount || 0) + 1;
    winners.forEach(winner => {
        room.roomWins[winner.name] = (room.roomWins[winner.name] || 0) + 1;
    });

    io.to(roomCode).emit('gameOver', {
        players,
        gameCount: room.gameCount,
        roomWins: room.roomWins
    });

    room.started = false;
    room.currentQuestionIndex = 0;
    room.questions = [];
    room.hasAnswered = false;
    for (const playerId in room.players) {
        room.players[playerId].score = 0;
        room.players[playerId].leftDuringGame = false;
    }
    io.to(roomCode).emit('playersUpdate', Object.values(room.players));
    serverLogger.info(`Комната готова к новой игре: roomCode=${roomCode}`);
}

function sendQuestion(io, roomCode) {
    const room = rooms[roomCode];
    if (!room) {
        serverLogger.error(`Комната не найдена при отправке вопроса: roomCode=${roomCode}`);
        return;
    }
    if (!room.questions || room.currentQuestionIndex >= room.questions.length) {
        serverLogger.error(`Вопросы недоступны или индекс вне диапазона: roomCode=${roomCode}, index=${room.currentQuestionIndex}`);
        io.to(roomCode).emit('error', 'Ошибка загрузки вопроса');
        return;
    }
    room.hasAnswered = false;
    const q = room.questions[room.currentQuestionIndex];
    const currentQuestionNumber = room.currentQuestionIndex + 1;
    io.to(roomCode).emit('question', { 
        question: q.question, 
        options: q.options,
        currentQuestionNumber,
        totalQuestions: room.questions.length 
    });
    serverLogger.info(`Вопрос отправлен: roomCode=${roomCode}, questionIndex=${room.currentQuestionIndex}`);
}

function checkExpiredRooms(io) {
    const now = Date.now();
    const timeout = 5 * 60 * 1000;
    for (const roomCode in rooms) {
        const room = rooms[roomCode];
        if (room.createdAt && (now - room.createdAt) > timeout && Object.keys(room.players).length === 0) {
            if (room.creatorSocketId) {
                io.to(room.creatorSocketId).emit('roomExpired', { message: 'Комната закрыта из-за истечения времени ожидания' });
            }
            delete rooms[roomCode];
            delete chatHistory[roomCode];
            serverLogger.info(`Комната удалена (просрочена): roomCode=${roomCode}`);
        }
    }
}

async function getPublicRooms() {
    try {
        const [rows] = await pool.query(
            `SELECT r.room_code
             FROM rooms r
             JOIN game_sessions gs ON r.session_id = gs.id
             WHERE r.is_private = FALSE AND gs.status = 'waiting'`
        );
        return rows;
    } catch (err) {
        serverLogger.error(`Ошибка получения списка публичных комнат: ${err.message}`);
        return [];
    }
}

async function broadcastPublicRooms(io) {
    const publicRooms = await getPublicRooms();
    io.emit('publicRoomsUpdate', publicRooms);
}

async function closeRoom(io, roomCode) {
    const room = rooms[roomCode];
    if (!room) return;

    io.to(roomCode).emit('hostLeft', { message: 'Хост покинул игру. Комната закрыта.' });
    serverLogger.info(`Отправлено событие hostLeft: roomCode=${roomCode}, players=${Object.keys(room.players).length}`);

    try {
        const conn = await pool.getConnection();
        await conn.beginTransaction();
        await conn.query(
            'UPDATE game_sessions SET status = "ended", ended_at = NOW() WHERE id = ?',
            [room.sessionId]
        );
        await conn.query('DELETE FROM rooms WHERE room_code = ?', [roomCode]);
        await conn.commit();
        conn.release();
        serverLogger.info(`Комната удалена из базы данных: roomCode=${roomCode}, sessionId=${room.sessionId}`);
    } catch (err) {
        if (conn) {
            await conn.rollback();
            conn.release();
        }
        serverLogger.error(`Ошибка удаления комнаты из базы данных: ${err.message}, roomCode=${roomCode}`);
    }

    delete rooms[roomCode];
    delete chatHistory[roomCode];
    serverLogger.info(`Комната закрыта: roomCode=${roomCode}`);
    await broadcastPublicRooms(io);
}

function handlePlayerLeave(io, socket, roomCode, isExplicitLeave = false) {
    const room = rooms[roomCode];
    if (!room || !room.players[socket.id]) return;

    const name = room.players[socket.id].name;
    const isHost = room.creatorName === name;

    if (room.started && !room.hasAnswered) {
        room.players[socket.id].leftDuringGame = true;
    }

    delete room.players[socket.id];
    socket.leave(roomCode);

    if (isHost) {
        if (isExplicitLeave) {
            // Если хост явно покидает комнату через leaveRoom, закрываем её немедленно
            closeRoom(io, roomCode);
        } else {
            // Если это disconnect (например, потеря соединения), даём 5 секунд на переподключение
            room.isHostDisconnecting = true;
            setTimeout(() => {
                if (room.isHostDisconnecting && rooms[roomCode]) {
                    closeRoom(io, roomCode);
                }
            }, 5000);
        }
    } else {
        io.to(roomCode).emit('playersUpdate', Object.values(room.players));
        serverLogger.info(`Игрок покинул комнату: roomCode=${roomCode}, name=${name}, socketId=${socket.id}`);
    }
}

module.exports = (io) => {
    setInterval(() => checkExpiredRooms(io), 30000);

    io.on('connection', socket => {
        serverLogger.info(`Клиент подключился (socketId: ${socket.id})`);

        socket.on('requestPublicRooms', async () => {
            const publicRooms = await getPublicRooms();
            socket.emit('publicRoomsUpdate', publicRooms);
            serverLogger.info(`Отправлен список публичных комнат: socketId=${socket.id}, rooms=${publicRooms.length}`);
        });

        socket.on('createRoom', async ({ name }) => {
            if (!name) {
                socket.emit('error', 'Укажите имя');
                return;
            }
            try {
                const roomCode = await generateRoomCode();
                const conn = await pool.getConnection();
                await conn.beginTransaction();

                const [[quizGameType]] = await conn.query('SELECT id FROM game_types WHERE name = ?', ['quiz']);
                if (!quizGameType) throw new Error("Тип игры 'quiz' не найден");
                const gameTypeId = quizGameType.id;

                const [sessionResult] = await conn.query(
                    'INSERT INTO game_sessions (game_type_id, status) VALUES (?, "waiting")',
                    [gameTypeId]
                );
                const sessionId = sessionResult.insertId;

                await conn.query(
                    'INSERT INTO rooms (room_code, is_private, session_id) VALUES (?, TRUE, ?)',
                    [roomCode, sessionId]
                );

                await conn.commit();
                conn.release();

                rooms[roomCode] = {
                    players: { [socket.id]: { id: socket.id, name, score: 0, leftDuringGame: false } },
                    currentQuestionIndex: 0,
                    started: false,
                    createdAt: Date.now(),
                    creatorSocketId: socket.id,
                    creatorName: name,
                    hasAnswered: false,
                    sessionId: sessionId,
                    gameCount: 0,
                    roomWins: {},
                    isPrivate: true,
                    isHostDisconnecting: false
                };
                chatHistory[roomCode] = [];
                socket.join(roomCode);
                socket.emit('roomCreated', { roomCode, isPrivate: true });
                socket.emit('roomJoined', { roomCode, isPrivate: true, isHost: true });
                io.to(roomCode).emit('playersUpdate', Object.values(rooms[roomCode].players));
                serverLogger.info(`Комната создана: roomCode=${roomCode}, creator=${name}, sessionId=${sessionId}, socketId=${socket.id}`);
            } catch (err) {
                if (conn) {
                    await conn.rollback();
                    conn.release();
                }
                serverLogger.error(`Ошибка создания комнаты: ${err.message}, name=${name}`);
                socket.emit('error', 'Не удалось создать комнату');
            }
        });

        socket.on('joinRoom', async ({ roomCode, name }) => {
            const room = rooms[roomCode];
            if (!room) {
                serverLogger.warn(`Попытка подключения к несуществующей комнате: roomCode=${roomCode}, name=${name}`);
                socket.emit('error', 'Комната не найдена');
                return;
            }
            if (room.started) {
                socket.emit('error', 'Игра уже началась');
                return;
            }
            if (Object.values(room.players).some(p => p.name === name && p.id !== socket.id)) {
                socket.emit('error', 'Имя уже занято в этой комнате');
                return;
            }
            try {
                const [roomData] = await pool.query('SELECT is_private FROM rooms WHERE room_code = ?', [roomCode]);
                const isPrivate = roomData.length > 0 ? roomData[0].is_private : true;

                const isHost = room.creatorName === name;
                if (isHost) {
                    const oldSocketId = Object.keys(room.players).find(id => room.players[id].name === name);
                    if (oldSocketId) {
                        delete room.players[oldSocketId];
                    }
                    room.creatorSocketId = socket.id;
                    room.isHostDisconnecting = false; // Сбрасываем флаг, если хост переподключается
                }

                room.players[socket.id] = { id: socket.id, name, score: 0, leftDuringGame: false };
                socket.join(roomCode);
                socket.emit('roomJoined', { roomCode, isPrivate, isHost });
                io.to(roomCode).emit('playersUpdate', Object.values(room.players));
                serverLogger.info(`Игрок присоединился: roomCode=${roomCode}, name=${name}, socketId=${socket.id}, creatorName=${room.creatorName}, isHost=${isHost}`);
            } catch (err) {
                serverLogger.error(`Ошибка подключения к комнате: ${err.message}, roomCode=${roomCode}, name=${name}`);
                socket.emit('error', 'Не удалось присоединиться к комнате');
            }
        });

        socket.on('requestPlayers', (roomCode) => {
            const room = rooms[roomCode];
            if (room) {
                socket.emit('playersUpdate', Object.values(room.players));
            } else {
                serverLogger.warn(`Запрос игроков для несуществующей комнаты: roomCode=${roomCode}`);
            }
        });

        socket.on('requestGameState', (roomCode) => {
            const room = rooms[roomCode];
            if (!room) {
                socket.emit('error', 'Комната не найдена');
                return;
            }
            if (!room.started) {
                socket.emit('gameState', { state: 'waiting' });
                return;
            }
            if (room.currentQuestionIndex >= room.questions.length) {
                socket.emit('gameState', { state: 'gameOver' });
                return;
            }
            const q = room.questions[room.currentQuestionIndex];
            socket.emit('gameState', {
                state: 'playing',
                question: q.question,
                options: q.options,
                hasAnswered: room.hasAnswered
            });
            serverLogger.info(`Состояние игры отправлено: roomCode=${roomCode}, socketId=${socket.id}`);
        });

        socket.on('togglePrivacy', async ({ roomCode, isPrivate }) => {
            const room = rooms[roomCode];
            if (!room) {
                serverLogger.warn(`Комната не найдена при попытке изменить статус приватности: roomCode=${roomCode}`);
                socket.emit('error', 'Комната не найдена');
                return;
            }
            if (room.creatorName !== room.players[socket.id]?.name) {
                serverLogger.warn(`Неавторизованная попытка изменения статуса приватности: socketId=${socket.id}, roomCode=${roomCode}`);
                socket.emit('error', 'Только хост может изменять статус приватности');
                return;
            }
            try {
                const conn = await pool.getConnection();
                const [roomData] = await conn.query('SELECT room_code FROM rooms WHERE room_code = ?', [roomCode]);
                if (roomData.length === 0) {
                    conn.release();
                    serverLogger.warn(`Комната не найдена в базе данных при попытке изменения статуса приватности: roomCode=${roomCode}`);
                    socket.emit('error', 'Комната не найдена');
                    return;
                }
                await conn.query(
                    'UPDATE rooms SET is_private = ? WHERE room_code = ?',
                    [isPrivate, roomCode]
                );
                conn.release();
                room.isPrivate = isPrivate;
                io.to(roomCode).emit('privacyUpdated', { isPrivate });
                serverLogger.info(`Статус приватности изменён: roomCode=${roomCode}, isPrivate=${isPrivate}`);
            } catch (err) {
                if (conn) conn.release();
                serverLogger.error(`Ошибка изменения статуса приватности: ${err.message}, roomCode=${roomCode}`);
                socket.emit('error', `Не удалось изменить статус приватности: ${err.message}`);
            }
        });

        socket.on('startGame', async ({ roomCode, questionCount }) => {
            const room = rooms[roomCode];
            if (!room) {
                serverLogger.warn(`Попытка старта игры в несуществующей комнате: roomCode=${roomCode}`);
                socket.emit('error', 'Комната не найдена');
                return;
            }
            if (room.started) {
                socket.emit('error', 'Игра уже началась');
                return;
            }
            if (room.creatorName !== room.players[socket.id]?.name) {
                socket.emit('error', 'Только хост может начать игру');
                return;
            }
            try {
                room.questions = await getRandomQuestions(questionCount);
                room.currentQuestionIndex = 0;
                room.started = true;
                sendQuestion(io, roomCode);
                io.to(roomCode).emit('gameStarted', { questionCount });
                serverLogger.info(`Игра началась: roomCode=${roomCode}, questionCount=${questionCount || 15}`);
            } catch (err) {
                serverLogger.error(`Ошибка старта игры: ${err.message}, roomCode=${roomCode}`);
                io.to(roomCode).emit('error', 'Не удалось загрузить вопросы');
            }
        });

        socket.on('answer', ({ roomCode, answerIndex }) => {
            const room = rooms[roomCode];
            if (!room || !room.started) {
                socket.emit('error', 'Игра не началась');
                return;
            }
            if (room.hasAnswered) return;
            room.hasAnswered = true;
            const player = room.players[socket.id];
            const currentQ = room.questions?.[room.currentQuestionIndex];
            if (player && currentQ && answerIndex === currentQ.answer) {
                player.score += 1;
                serverLogger.info(`Игрок ${player.name} ответил правильно: score=${player.score}, roomCode=${roomCode}`);
            }
            io.to(roomCode).emit('disableAnswers');
            io.to(roomCode).emit('highlightAnswer', { correctIndex: currentQ.answer });
            io.to(roomCode).emit('playersUpdate', Object.values(room.players));
            setTimeout(() => {
                room.currentQuestionIndex++;
                if (room.currentQuestionIndex < room.questions.length) {
                    sendQuestion(io, roomCode);
                } else {
                    handleGameOver(io, roomCode);
                }
            }, 1000);
        });

        socket.on('chatMessage', ({ roomCode, name, message }) => {
            if (!roomCode || !name || !message) return;
            if (!chatHistory[roomCode]) chatHistory[roomCode] = [];
            const chatMessage = { id: uuidv4(), name, message };
            chatHistory[roomCode].push(chatMessage);
            io.to(roomCode).emit('chatHistoryUpdate', chatHistory[roomCode]);
            serverLogger.info(`Сообщение в чате: roomCode=${roomCode}, name=${name}, message=${message}`);
        });

        socket.on('deleteMessage', ({ roomCode, messageId }) => {
            const room = rooms[roomCode];
            if (!room) {
                socket.emit('error', 'Комната не найдена');
                return;
            }
            if (room.creatorName !== room.players[socket.id]?.name) {
                socket.emit('error', 'Только хост может удалять сообщения');
                return;
            }
            if (!chatHistory[roomCode]) {
                socket.emit('error', 'История чата не найдена');
                return;
            }
            chatHistory[roomCode] = chatHistory[roomCode].filter(msg => msg.id !== messageId);
            io.to(roomCode).emit('chatHistoryUpdate', chatHistory[roomCode]);
            serverLogger.info(`Сообщение удалено: roomCode=${roomCode}, messageId=${messageId}`);
        });

        socket.on('requestChatHistory', (roomCode) => {
            if (chatHistory[roomCode]) {
                socket.emit('chatHistoryUpdate', chatHistory[roomCode]);
                serverLogger.info(`История чата отправлена: roomCode=${roomCode}, socketId=${socket.id}`);
            } else {
                socket.emit('chatHistoryUpdate', []);
                serverLogger.info(`История чата пуста: roomCode=${roomCode}, socketId=${socket.id}`);
            }
        });

        socket.on('kickPlayer', ({ roomCode, playerId }) => {
            const room = rooms[roomCode];
            if (!room) {
                socket.emit('error', 'Комната не найдена');
                return;
            }
            if (room.started) {
                socket.emit('error', 'Нельзя кикать игроков во время игры');
                return;
            }
            if (room.creatorName !== room.players[socket.id]?.name) {
                socket.emit('error', 'Только хост может кикать игроков');
                return;
            }
            if (!room.players[playerId]) {
                socket.emit('error', 'Игрок не найден');
                return;
            }
            const kickedPlayer = room.players[playerId];
            delete room.players[playerId];
            io.to(playerId).emit('kicked');
            io.to(roomCode).emit('playersUpdate', Object.values(room.players));
            serverLogger.info(`Игрок исключён из комнаты: roomCode=${roomCode}, player=${kickedPlayer.name}, playerId=${playerId}`);
        });

        socket.on('leaveRoom', (roomCode) => {
            handlePlayerLeave(io, socket, roomCode, true);
        });

        socket.on('rejoinRoom', ({ roomCode, name }) => {
            const room = rooms[roomCode];
            if (!room) {
                serverLogger.warn(`Попытка переподключения к несуществующей комнате: roomCode=${roomCode}, name=${name}`);
                socket.emit('error', 'Комната не найдена');
                return;
            }
            if (room.creatorName === name) {
                const oldSocketId = Object.keys(room.players).find(id => room.players[id].name === name);
                if (oldSocketId) {
                    delete room.players[oldSocketId];
                }
                room.creatorSocketId = socket.id;
                room.players[socket.id] = { id: socket.id, name, score: 0, leftDuringGame: false };
                room.isHostDisconnecting = false; // Сбрасываем флаг при переподключении
                socket.join(roomCode);
                socket.emit('roomJoined', { roomCode, isPrivate: room.isPrivate, isHost: true });
                io.to(roomCode).emit('playersUpdate', Object.values(room.players));
                serverLogger.info(`Хост переподключился: roomCode=${roomCode}, name=${name}, newSocketId=${socket.id}`);
            } else {
                serverLogger.warn(`Попытка переподключения к комнате не удалась: roomCode=${roomCode}, name=${name}, socketId=${socket.id}`);
                socket.emit('error', 'Не удалось переподключиться к комнате');
            }
        });

        socket.on('disconnect', () => {
            for (const roomCode in rooms) {
                if (rooms[roomCode].players[socket.id]) {
                    handlePlayerLeave(io, socket, roomCode);
                    break;
                }
            }
            serverLogger.info(`Клиент отключился (socketId: ${socket.id})`);
        });
    });
};