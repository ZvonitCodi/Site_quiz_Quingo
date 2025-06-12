// Определяем функции alert в глобальной области видимости
let alertResolve = null;
let confirmCallback = null;

function showCustomAlert(message, type = 'info', callback = null) {
    const currentLanguage = localStorage.getItem('language') || 'ru';
    const modal = document.getElementById('custom-alert-modal');
    const title = document.getElementById('custom-alert-title');
    const messageElement = document.getElementById('custom-alert-message');
    const okButton = document.querySelector('#custom-alert-modal .btn');

    if (!modal || !title || !messageElement || !okButton) {
        console.error('Custom alert elements not found:', {
            modal: !!modal,
            title: !!title,
            messageElement: !!messageElement,
            okButton: !!okButton
        });
        if (callback) callback();
        return;
    }

    title.textContent = currentLanguage === 'en' ? 'Notification' : 'Уведомление';
    messageElement.textContent = message;
    okButton.textContent = currentLanguage === 'en' ? 'OK' : 'ОК';

    modal.classList.remove('alert-error', 'alert-success', 'alert-info');
    modal.classList.add(`alert-${type}`);

    alertResolve = callback;
    modal.style.display = 'block';
}

function closeCustomAlert() {
    const modal = document.getElementById('custom-alert-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    if (alertResolve) {
        alertResolve();
        alertResolve = null;
    }
}

function showCustomConfirm(message, callback) {
    const currentLanguage = localStorage.getItem('language') || 'ru';
    const modal = document.getElementById('custom-confirm-modal');
    const title = document.getElementById('custom-confirm-title');
    const messageElement = document.getElementById('custom-confirm-message');
    const yesButton = document.querySelector('#custom-confirm-modal .confirm-yes');
    const noButton = document.querySelector('#custom-confirm-modal .confirm-no');

    if (!modal || !title || !messageElement || !yesButton || !noButton) {
        console.error('Custom confirm elements not found:', {
            modal: !!modal,
            title: !!title,
            messageElement: !!messageElement,
            yesButton: !!yesButton,
            noButton: !!noButton
        });
        return;
    }

    title.textContent = currentLanguage === 'en' ? 'Confirmation' : 'Подтверждение';
    messageElement.textContent = message;
    yesButton.textContent = currentLanguage === 'en' ? 'Yes' : 'Да';
    noButton.textContent = currentLanguage === 'en' ? 'No' : 'Нет';

    confirmCallback = callback;
    modal.classList.remove('alert-error', 'alert-success', 'alert-info');
    modal.classList.add('alert-info');
    modal.style.display = 'block';
}

function closeCustomConfirm() {
    const modal = document.getElementById('custom-confirm-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    confirmCallback = null;
}

function confirmCustomAction() {
    const modal = document.getElementById('custom-confirm-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    if (confirmCallback) {
        confirmCallback();
        confirmCallback = null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    // Получаем параметры из URL
    const params = new URLSearchParams(window.location.search);
    const nickname = params.get('nickname');
    const roomCode = params.get('room');
    const currentLanguage = params.get('lang') || localStorage.getItem('language') || 'ru';

    // Сохраняем язык в localStorage
    localStorage.setItem('language', currentLanguage);

    // Отладка: проверяем параметры
    console.log('URL Parameters:', { nickname, roomCode, currentLanguage });

    // Устанавливаем начальный язык
    if (currentLanguage === 'en') {
        switchToEnglish();
    } else {
        switchToRussian();
    }

    // Проверяем наличие элементов и устанавливаем начальные значения
    const playerNameEl = document.getElementById('player-name');
    const roomCodeEl = document.getElementById('room-code');
    if (playerNameEl) {
        playerNameEl.textContent = nickname || 'Unknown';
    } else {
        console.error('Element #player-name not found');
    }
    if (roomCodeEl) {
        roomCodeEl.textContent = roomCode || 'N/A';
    } else {
        console.error('Element #room-code not found');
    }

    let isProcessingQuestion = false;
    let isHighlighting = false;
    let questionQueue = [];
    let currentQuestionIndex = 0;
    let totalQuestions = 0;
    let isHost = false;

    function processNextQuestion() {
        if (isProcessingQuestion || isHighlighting || questionQueue.length === 0) {
            console.log(`Queue paused: isProcessing=${isProcessingQuestion}, isHighlighting=${isHighlighting}, queueLength=${questionQueue.length}`);
            return;
        }
        const { question, options, hasAnswered, currentQuestionNumber, totalQuestions: total } = questionQueue.shift();
        isProcessingQuestion = true;
        const section = document.getElementById('question-section');
        const q = document.getElementById('question');
        const answersDiv = document.getElementById('answers');
        const questionNumberDiv = document.getElementById('question-number');

        if (questionNumberDiv) {
            questionNumberDiv.textContent = currentLanguage === 'en' 
                ? `Question ${currentQuestionNumber}/${total}`
                : `Вопрос ${currentQuestionNumber}/${total}`;
        } else {
            console.error('Element #question-number not found');
        }

        if (section) {
            section.style.display = 'block';
            setTimeout(() => {
                if (section.style.display !== 'block') {
                    console.warn('Section hidden after setting, forcing display');
                    section.style.display = 'block';
                }
            }, 0);
        }
        if (q) q.textContent = question;
        if (answersDiv) {
            answersDiv.innerHTML = '';
            options.forEach((text, i) => {
                const btn = document.createElement('button');
                btn.textContent = text;
                btn.dataset.index = i;
                btn.disabled = hasAnswered || false;
                btn.onclick = () => {
                    socket.emit('answer', { roomCode, answerIndex: i });
                    Array.from(answersDiv.getElementsByTagName('button')).forEach(b => b.disabled = true);
                };
                answersDiv.appendChild(btn);
            });
        }
        isProcessingQuestion = false;
        processNextQuestion();
    }

    function switchToEnglish() {
        document.documentElement.lang = 'en';
        const pageTitle = document.getElementById('page-title');
        const welcomeText = document.getElementById('welcome-text');
        const playersTitle = document.getElementById('players-title');
        const roomCodeLabel = document.getElementById('room-code-label');
        const questionCountLabel = document.getElementById('question-count-label');
        const privacyToggleLabel = document.getElementById('privacy-toggle-label');
        const startBtn = document.getElementById('start-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const gameOverText = document.getElementById('game-over-text');
        const chatInput = document.getElementById('chat-input');

        if (pageTitle) pageTitle.textContent = 'Quiz';
        if (welcomeText) welcomeText.childNodes[0].textContent = 'Welcome, ';
        if (playersTitle) playersTitle.textContent = 'Players in Room:';
        if (roomCodeLabel) roomCodeLabel.childNodes[0].textContent = 'Room Code: ';
        if (questionCountLabel) questionCountLabel.textContent = 'Number of Questions (1-50):';
        if (privacyToggleLabel) privacyToggleLabel.textContent = 'Private Room:';
        if (startBtn) startBtn.textContent = 'Start Game';
        if (logoutBtn) logoutBtn.textContent = 'Leave Game';
        if (gameOverText) gameOverText.textContent = 'Game Over!';
        if (chatInput) chatInput.placeholder = 'Enter message';
    }

    function switchToRussian() {
        document.documentElement.lang = 'ru';
        const pageTitle = document.getElementById('page-title');
        const welcomeText = document.getElementById('welcome-text');
        const playersTitle = document.getElementById('players-title');
        const roomCodeLabel = document.getElementById('room-code-label');
        const questionCountLabel = document.getElementById('question-count-label');
        const privacyToggleLabel = document.getElementById('privacy-toggle-label');
        const startBtn = document.getElementById('start-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const gameOverText = document.getElementById('game-over-text');
        const chatInput = document.getElementById('chat-input');

        if (pageTitle) pageTitle.textContent = 'Викторина';
        if (welcomeText) welcomeText.childNodes[0].textContent = 'Добро пожаловать, ';
        if (playersTitle) playersTitle.textContent = 'Игроки в комнате:';
        if (roomCodeLabel) roomCodeLabel.childNodes[0].textContent = 'Код комнаты: ';
        if (questionCountLabel) questionCountLabel.textContent = 'Количество вопросов (1-50):';
        if (privacyToggleLabel) privacyToggleLabel.textContent = 'Приватная комната:';
        if (startBtn) startBtn.textContent = 'Начать игру';
        if (logoutBtn) logoutBtn.textContent = 'Покинуть игру';
        if (gameOverText) gameOverText.textContent = 'Игра окончена!';
        if (chatInput) chatInput.placeholder = 'Введите сообщение';
    }

    socket.on('connect', () => {
        console.log(`Connected to socket: socketId=${socket.id}`);
        socket.emit('requestPlayers', roomCode);
        socket.emit('requestChatHistory', roomCode);
        socket.emit('requestGameState', roomCode);
        if (!sessionStorage.getItem('alreadyJoined')) {
            console.log('Joining room:', { roomCode, name: nickname });
            socket.emit('joinRoom', { roomCode, name: nickname });
            sessionStorage.setItem('alreadyJoined', 'true');
        } else {
            console.log('Rejoining room:', { roomCode, name: nickname });
            socket.emit('rejoinRoom', { roomCode, name: nickname });
        }
    });

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        showCustomAlert(
            currentLanguage === 'en' 
            ? 'Failed to connect to server. Please try again.'
            : 'Не удалось подключиться к серверу. Попробуйте снова.'
        );
    });

    function updateHostControls() {
        console.log(`Updating host controls: isHost=${isHost}`);
        const hostControls = document.getElementById('host-controls');
        const privacyToggle = document.getElementById('privacy-toggle');
        const startBtn = document.getElementById('start-btn');

        if (hostControls && isHost) {
            hostControls.style.display = 'block';
            if (privacyToggle) {
                privacyToggle.addEventListener('change', () => {
                    const isPrivate = privacyToggle.checked;
                    console.log(`Toggling privacy: roomCode=${roomCode}, isPrivate=${isPrivate}`);
                    socket.emit('togglePrivacy', { roomCode, isPrivate });
                });
            }
        } else {
            if (hostControls) hostControls.style.display = 'none';
        }

        if (startBtn && isHost) {
            startBtn.addEventListener('click', () => {
                const questionCountInput = document.getElementById('question-count').value;
                const questionCount = parseInt(questionCountInput) || 15;
                if (questionCount < 1 || questionCount > 50) {
                    showCustomAlert(
                        currentLanguage === 'en' 
                        ? 'Number of questions must be between 1 and 50'
                        : 'Количество вопросов должно быть от 1 до 50'
                    );
                    return;
                }
                socket.emit('startGame', { roomCode, questionCount });
            });
        }
    }

    socket.on('roomJoined', ({ roomCode, isPrivate, isHost: hostStatus }) => {
        isHost = hostStatus;
        updateHostControls();
        if (isHost && document.getElementById('privacy-toggle')) {
            document.getElementById('privacy-toggle').checked = isPrivate;
        }
        console.log(`Joined room: roomCode=${roomCode}, isPrivate=${isPrivate}, isHost=${isHost}`);
    });

    socket.on('playersUpdate', players => {
        console.log('Received playersUpdate:', players);
        const list = document.getElementById('players');
        if (!list) {
            console.error('Element #players not found');
            return;
        }
        list.innerHTML = '';

        players.forEach(player => {
            const li = document.createElement('li');
            const playerInfo = document.createElement('span');
            playerInfo.textContent = currentLanguage === 'en'
                ? `${player.name} (${player.score || 0} points)`
                : `${player.name} (${player.score || 0} очков)`;
            playerInfo.style.cursor = 'pointer';
            li.appendChild(playerInfo);

            if (isHost && player.name !== nickname) {
                const kickBtn = document.createElement('button');
                kickBtn.textContent = currentLanguage === 'en' ? 'Kick' : 'Кикнуть';
                kickBtn.className = 'kick-btn';
                kickBtn.style.marginLeft = '10px';
                kickBtn.onclick = () => {
                    showCustomConfirm(
                        currentLanguage === 'en'
                            ? `Are you sure you want to kick ${player.name}?`
                            : `Вы уверены, что хотите кикнуть ${player.name}?`,
                        () => socket.emit('kickPlayer', { roomCode, playerId: player.id })
                    );
                };
                li.appendChild(kickBtn);
            }

            const tooltip = document.getElementById('tooltip');
            li.addEventListener('mouseover', async (e) => {
                try {
                    const res = await fetch(`/api/stats/${encodeURIComponent(player.name)}`, { credentials: 'include' });
                    if (!res.ok) throw new Error('Request failed');
                    const stats = await res.json();

                    tooltip.innerHTML = currentLanguage === 'en'
                        ? `
                            <strong>${player.name}</strong><br>
                            Games: ${stats.total_games || 0}<br>
                            Wins: ${stats.wins || 0}<br>
                            Losses: ${stats.losses || 0}<br>
                            Quiz Points: ${stats.quiz_score || 0}
                        `
                        : `
                            <strong>${player.name}</strong><br>
                            Игр: ${stats.total_games || 0}<br>
                            Побед: ${stats.wins || 0}<br>
                            Поражений: ${stats.losses || 0}<br>
                            Баллы викторины: ${stats.quiz_score || 0}
                        `;
                    tooltip.style.display = 'block';
                    tooltip.style.left = e.pageX + 10 + 'px';
                    tooltip.style.top = e.pageY + 10 + 'px';
                } catch (err) {
                    console.error('Error fetching stats:', err);
                    tooltip.innerHTML = currentLanguage === 'en'
                        ? `<strong>${player.name}</strong><br>Statistics not found`
                        : `<strong>${player.name}</strong><br>Статистика не найдена`;
                    tooltip.style.display = 'block';
                    tooltip.style.left = e.pageX + 10 + 'px';
                    tooltip.style.top = e.pageY + 10 + 'px';
                }
            });

            li.addEventListener('mousemove', (e) => {
                tooltip.style.left = e.pageX + 10 + 'px';
                tooltip.style.top = e.pageY + 10 + 'px';
            });

            li.addEventListener('mouseout', () => {
                tooltip.style.display = 'none';
            });

            list.appendChild(li);
        });
    });

    socket.on('error', (message) => {
        console.error(`Socket error: ${message}`);
        showCustomAlert(
            message,
            'error',
            () => {
                if (message === (currentLanguage === 'en' ? 'Room not found' : 'Комната не найдена')) {
                    localStorage.removeItem('roomCode');
                    sessionStorage.removeItem('alreadyJoined');
                    window.location.href = `index.html?lang=${currentLanguage}`;
                }
            }
        );
    });

    socket.on('roomExpired', ({ message }) => {
        showCustomAlert(
            message,
            'error',
            () => {
                localStorage.removeItem('roomCode');
                sessionStorage.removeItem('alreadyJoined');
                window.location.href = `index.html?lang=${currentLanguage}`;
            }
        );
    });

    socket.on('hostLeft', ({ message }) => {
       showCustomAlert(
            message,
            'error',
            () => {
                localStorage.removeItem('roomCode');
                sessionStorage.removeItem('alreadyJoined');
                window.location.href = `index.html?lang=${currentLanguage}`;
            }
        );
    });

    socket.on('kicked', () => {
        showCustomAlert(
            currentLanguage === 'en'
                ? 'You have been kicked from the room by the host.'
                : 'Вы были исключены из комнаты хостом.',
            'error',
            () => {
                localStorage.removeItem('roomCode');
                sessionStorage.removeItem('alreadyJoined');
                window.location.href = `index.html?lang=${currentLanguage}`;
            }
        );
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            showCustomConfirm(
                currentLanguage === 'en'
                    ? 'Are you sure you want to leave?'
                    : 'Вы уверены, что хотите выйти?',
                () => {
                    socket.emit('leaveRoom', roomCode);
                    localStorage.removeItem('nickname');
                    localStorage.removeItem('roomCode');
                    sessionStorage.removeItem('alreadyJoined');
                    showCustomAlert(
                        currentLanguage === 'en'
                            ? 'You have left the game!'
                            : 'Вы покинули игру!',
                        'success',
                        () => window.location.href = `index.html?lang=${currentLanguage}`
                    );
                }
            );
        });
    }

    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('chat-input');
            const message = input.value.trim();
            if (message !== '') {
                socket.emit('chatMessage', { roomCode, name: nickname, message });
                input.value = '';
            }
        });
    }

    socket.on('chatHistoryUpdate', (messages) => {
        const msgContainer = document.getElementById('chat-messages');
        if (!msgContainer) {
            console.error('Element #chat-messages not found');
            return;
        }
        console.log('Received chat history:', messages);
        msgContainer.innerHTML = '';
        messages.forEach(({ id, name, message }) => {
            const div = document.createElement('div');
            div.classList.add('chat-message');
            div.dataset.messageId = id;
            div.innerHTML = `<strong>${name}:</strong> ${message}`;

            if (isHost && name) {
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = currentLanguage === 'en' ? 'Delete' : 'Удалить';
                deleteBtn.className = 'delete-btn';
                deleteBtn.style.marginLeft = '10px';
                deleteBtn.onclick = () => {
                    showCustomConfirm(
                        currentLanguage === 'en'
                            ? `Are you sure you want to delete the message from ${name}?`
                            : `Вы уверены, что хотите удалить сообщение от ${name}?`,
                        () => socket.emit('deleteMessage', { roomCode, messageId: id })
                    );
                };
                div.appendChild(deleteBtn);
            }

            msgContainer.appendChild(div);
        });
        msgContainer.scrollTop = msgContainer.scrollHeight;
    });

    socket.on('privacyUpdated', ({ isPrivate }) => {
        if (isHost && document.getElementById('privacy-toggle')) {
            document.getElementById('privacy-toggle').checked = isPrivate;
        }
        console.log(`Privacy status updated: isPrivate=${isPrivate}`);
    });

    socket.on('gameStarted', (data) => {
        if (document.getElementById('start-btn') && isHost) document.getElementById('start-btn').disabled = true;
        totalQuestions = data.questionCount || 15;
        currentQuestionIndex = 0;
        console.log(`Game started, total questions: ${totalQuestions}`);
    });

    socket.on('gameState', ({ state, question, options, hasAnswered }) => {
        console.log(`Received game state: state=${state}`);
        const section = document.getElementById('question-section');
        const answersDiv = document.getElementById('answers');
        if (state === 'waiting') {
            section.style.display = 'none';
            answersDiv.innerHTML = '';
        } else if (state === 'gameOver') {
            section.style.display = 'none';
            answersDiv.innerHTML = '';
        } else if (state === 'playing' && question && options) {
            questionQueue.push({ question, options, hasAnswered });
            processNextQuestion();
        }
    });

    socket.on('question', ({ question, options, currentQuestionNumber, totalQuestions: total }) => {
        console.log(`Received question: ${question}, number: ${currentQuestionNumber}/${total}`);
        questionQueue.push({ question, options, hasAnswered: false, currentQuestionNumber, totalQuestions: total });
        processNextQuestion();
    });

    socket.on('disableAnswers', () => {
        console.log('Answer buttons disabled');
        const answersDiv = document.getElementById('answers');
        Array.from(answersDiv.getElementsByTagName('button')).forEach(b => b.disabled = true);
    });

    socket.on('highlightAnswer', ({ correctIndex }) => {
        console.log(`Highlighting answer: correctIndex=${correctIndex}`);
        isHighlighting = true;
        const answersDiv = document.getElementById('answers');
        const buttons = answersDiv.getElementsByTagName('button');
        for (let i = 0; i < buttons.length; i++) {
            if (parseInt(buttons[i].dataset.index) === correctIndex) {
                buttons[i].classList.add('correct-answer');
            }
        }
        setTimeout(() => {
            for (let i = 0; i < buttons.length; i++) {
                buttons[i].classList.remove('correct-answer');
            }
            document.getElementById('question-section').style.display = 'none';
            isHighlighting = false;
            isProcessingQuestion = false;
            processNextQuestion();
        }, 1200);
    });

    socket.on('gameOver', ({ players, gameCount, roomWins }) => {
        console.log('Game over', { players, gameCount, roomWins });
        const resultSection = document.getElementById('result-section');
        const resultList = document.getElementById('results');
        resultSection.style.display = 'block';
        resultList.innerHTML = '';

        const gameCountDiv = document.createElement('div');
        gameCountDiv.textContent = currentLanguage === 'en'
            ? `Total games played in room: ${gameCount}`
            : `Всего игр сыграно в комнате: ${gameCount}`;
        resultList.appendChild(gameCountDiv);

        players.forEach(player => {
            const li = document.createElement('li');
            const wins = roomWins[player.name] || 0;
            li.textContent = currentLanguage === 'en'
                ? `${player.name}: ${player.score} points (Wins in room: ${wins})`
                : `${player.name}: ${player.score} очков (Побед в комнате: ${wins})`;
            resultList.appendChild(li);
        });

        if (document.getElementById('start-btn') && isHost) {
            document.getElementById('start-btn').textContent = currentLanguage === 'en'
                ? 'Start New Game'
                : 'Начать новую игру';
            document.getElementById('start-btn').disabled = false;
        }
    });
});