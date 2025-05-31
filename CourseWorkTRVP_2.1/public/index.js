const API_URL = 'http://localhost:3000/api/auth';

function openLoginModal() {
    closeRegisterModal();
    closeRecoveryModal();
    document.getElementById('login-modal').style.display = 'block';
}

function closeLoginModal() {
    document.getElementById('login-modal').style.display = 'none';
}

function openRegisterModal() {
    closeLoginModal();
    closeRecoveryModal();
    document.getElementById('register-modal').style.display = 'block';
}

function closeRegisterModal() {
    document.getElementById('register-modal').style.display = 'none';
}

let recoveryEmail = '';

function openRecoveryModal() {
    closeLoginModal();
    closeRegisterModal();
    document.getElementById('recovery-modal').style.display = 'block';
}

function closeRecoveryModal() {
    document.getElementById('recovery-modal').style.display = 'none';
    recoveryEmail = '';
    document.getElementById('recovery-nickname').value = '';
    document.getElementById('recovery-code').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('code-section').style.display = 'none';
}

async function sendRecoveryCode() {
    const nickname = document.getElementById('recovery-nickname').value;

    try {
        const res = await fetch(`${API_URL}/request-password-reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname })
        });

        const result = await res.json();
        alert(result.message);

        if (res.ok && result.email) {
            recoveryEmail = result.email;
            document.getElementById('code-section').style.display = 'block';
        }
    } catch (error) {
        console.error('Recovery code error:', error);
        alert('Ошибка при отправке кода: ' + error.message);
    }
}

async function verifyRecoveryCode() {
    const code = document.getElementById('recovery-code').value;
    const newPassword = document.getElementById('new-password').value;

    if (!recoveryEmail) {
        alert("Email не найден. Пожалуйста, сначала отправьте код.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: recoveryEmail, code, newPassword })
        });

        const result = await res.json();
        alert(result.message);
        if (res.ok) {
            closeRecoveryModal();
        }
    } catch (error) {
        console.error('Verify recovery code error:', error);
        alert('Ошибка при сбросе пароля: ' + error.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const languageSwitcher = document.getElementById('language-switcher');

    // Загружаем язык из localStorage или устанавливаем 'ru' по умолчанию
    let currentLanguage = localStorage.getItem('language') || 'ru';
    document.querySelector('#language-switcher span').textContent = currentLanguage;

    // Устанавливаем язык при загрузке страницы
    if (currentLanguage === 'en') {
        switchToEnglish();
    } else {
        switchToRussian();
    }

    languageSwitcher.addEventListener('click', () => {
        if (currentLanguage === 'ru') {
            localStorage.setItem('language', 'en');
            currentLanguage = 'en';
        } else {
            localStorage.setItem('language', 'ru');
            currentLanguage = 'ru';
        }
        location.reload(); // Перезагружаем страницу
    });

    // Обработчики для кнопок создания/присоединения к комнатам
    const createRoomBtn = document.getElementById('createRoomBtn');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const joinWithCodeBtn = document.getElementById('joinWithCodeBtn');

    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', () => {
            const nickname = localStorage.getItem('nickname');
            if (!nickname) {
                alert(
                    currentLanguage === 'en'
                        ? 'Please log in!'
                        : 'Пожалуйста, войдите в аккаунт!'
                );
                openLoginModal();
                return;
            }
            localStorage.removeItem('roomCode');
            socket.emit('createRoom', { name: nickname });
        });
    }

    if (joinRoomBtn) {
        joinRoomBtn.addEventListener('click', () => {
            document.getElementById('joinRoomBtn').style.display = 'none';
            document.getElementById('joinInput').style.display = 'block';
        });
    }

    if (joinWithCodeBtn) {
        joinWithCodeBtn.addEventListener('click', () => {
            const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
            const nickname = localStorage.getItem('nickname');
            if (!nickname) {
                alert(
                    currentLanguage === 'en'
                        ? 'Please log in!'
                        : 'Пожалуйста, войдите в аккаунт!'
                );
                openLoginModal();
                return;
            }
            if (!roomCode) {
                alert(
                    currentLanguage === 'en'
                        ? 'Please enter the room code!'
                        : 'Введите код комнаты!'
                );
                return;
            }
            socket.emit('joinRoom', { roomCode, name: nickname });
        });
    }
    socket.emit('requestPublicRooms');
});

function switchToEnglish() {
    document.documentElement.lang = 'en';

    // Header
    document.querySelector('#user-section button').innerHTML = `
        <img src="path-to-login-icon.png" alt="Login Icon">
        Login
    `;
    document.querySelector('#language-switcher span').textContent = 'en';
    document.querySelector('#play-button button').innerHTML = `
        <img src="path-to-controller-icon.png" alt="Controller Icon">
        PLAY
    `;
    document.querySelector('#public-rooms-container h3').textContent = 'Available Rooms';
    document.querySelector('#leaderboard-container h3').textContent = '🏆 Leaderboard';

    // Footer
    document.querySelector('#legal-info').innerHTML = `
        <p>© 2025 Quingo Games LLC. All rights reserved.</p>
        <p>OGRN: 1234567890123 | TIN: 9876543210</p>
    `;
    document.querySelector('#footer-links').innerHTML = `
        <a href="/terms">Terms of Use</a>
        <a href="/privacy">Privacy Policy</a>
        <a href="/faq">FAQ</a>
    `;
    document.querySelector('#footer-contact').innerHTML = `
        <p>Support: <a href="mailto:Quingogame@yandex.ru">Quingogame@yandex.ru</a></p>
    `;

    // Login Modal
    document.querySelector('#login-modal .modal-header h2').textContent = 'LOGIN';
    document.querySelector('#login-modal #nickname').placeholder = 'Nickname';
    document.querySelector('#login-modal #login-password').placeholder = 'Password';
    document.querySelector('#login-modal .login-btn').textContent = 'Login';
    document.querySelector('#login-modal .modal-body p:nth-of-type(1)').innerHTML = `
        <button onclick="openRecoveryModal()" class="register-link recovery-link">Forgot Password?</button>
    `;
    document.querySelector('#login-modal .modal-body p:nth-of-type(2)').textContent = `Don't have an account?`;
    document.querySelector('#login-modal .modal-body p:nth-of-type(3)').innerHTML = `
        <button class="register-link" onclick="openRegisterModal()">Register</button>
    `;

    // Recovery Modal
    document.querySelector('#recovery-modal .modal-header h2').textContent = 'PASSWORD RECOVERY';
    document.querySelector('#recovery-modal #recovery-nickname').placeholder = 'Enter your nickname';
    document.querySelector('#recovery-modal button[onclick="sendRecoveryCode()"]').textContent = 'Send Code';
    document.querySelector('#recovery-modal #recovery-code').placeholder = 'Code from email';
    document.querySelector('#recovery-modal #new-password').placeholder = 'New Password';
    document.querySelector('#recovery-modal button[onclick="verifyRecoveryCode()"]').textContent = 'Reset Password';

    // Register Modal
    document.querySelector('#register-modal .modal-header h2').textContent = 'REGISTER';
    document.querySelector('#register-modal #register-nickname').placeholder = 'Nickname';
    document.querySelector('#register-modal #register-email').placeholder = 'E-MAIL';
    document.querySelector('#register-modal .label-text').textContent = 'Gender:';
    const radioOptions = document.querySelectorAll('#register-modal .radio-option');
    if (radioOptions.length >= 2) {
        radioOptions[0].innerHTML = `<input type="radio" name="gender" value="female"> Female`;
        radioOptions[1].innerHTML = `<input type="radio" name="gender" value="male"> Male`;
    }
    document.querySelector('#register-modal #register-password').placeholder = 'Password';
    document.querySelector('#register-modal #register-password-repeat').placeholder = 'Repeat Password';
    document.querySelector('#register-modal .modal-body button').textContent = 'Register';

    // Room Choice Modal
    document.querySelector('#roomChoice .modal-header h2').textContent = 'MENU';
    document.querySelector('#createRoomBtn').textContent = 'Create Room';
    document.querySelector('#joinRoomBtn').textContent = 'Join Room';
    document.querySelector('#roomCodeInput').placeholder = 'Enter room code';
    document.querySelector('#joinWithCodeBtn').textContent = 'Join';
}

function switchToRussian() {
    document.documentElement.lang = 'ru';

    // Header
    document.querySelector('#user-section button').innerHTML = `
        <img src="path-to-login-icon.png" alt="Login Icon">
        Войти
    `;
    document.querySelector('#language-switcher span').textContent = 'ru';
    document.querySelector('#play-button button').innerHTML = `
        <img src="path-to-controller-icon.png" alt="Controller Icon">
        ИГРАТЬ
    `;
    document.querySelector('#public-rooms-container h3').textContent = 'Доступные комнаты';
    document.querySelector('#leaderboard-container h3').textContent = '🏆 Лидерборд';

    // Footer
    document.querySelector('#legal-info').innerHTML = `
        <p>© 2025 ООО "Quingo Games". Все права защищены.</p>
        <p>ОГРН: 1234567890123 | ИНН: 9876543210</p>
    `;
    document.querySelector('#footer-links').innerHTML = `
        <a href="/terms">Условия использования</a>
        <a href="/privacy">Политика конфиденциальности</a>
        <a href="/faq">FAQ</a>
    `;
    document.querySelector('#footer-contact').innerHTML = `
        <p>Поддержка: <a href="mailto:Quingogame@yandex.ru">Quingogame@yandex.ru</a></p>
    `;

    // Login Modal
    document.querySelector('#login-modal .modal-header h2').textContent = 'ВХОД';
    document.querySelector('#login-modal #nickname').placeholder = 'Nickname';
    document.querySelector('#login-modal #login-password').placeholder = 'Пароль';
    document.querySelector('#login-modal .login-btn').textContent = 'Войти';
    document.querySelector('#login-modal .modal-body p:nth-of-type(1)').innerHTML = `
        <button onclick="openRecoveryModal()" class="register-link recovery-link">Забыли пароль?</button>
    `;
    document.querySelector('#login-modal .modal-body p:nth-of-type(2)').textContent = `Нет аккаунта?`;
    document.querySelector('#login-modal .modal-body p:nth-of-type(3)').innerHTML = `
        <button class="register-link" onclick="openRegisterModal()">Регистрация</button>
    `;

    // Recovery Modal
    document.querySelector('#recovery-modal .modal-header h2').textContent = 'Восстановление пароля';
    document.querySelector('#recovery-modal #recovery-nickname').placeholder = 'Введите ваш никнейм';
    document.querySelector('#recovery-modal button[onclick="sendRecoveryCode()"]').textContent = 'Отправить код';
    document.querySelector('#recovery-modal #recovery-code').placeholder = 'Код из письма';
    document.querySelector('#recovery-modal #new-password').placeholder = 'Новый пароль';
    document.querySelector('#recovery-modal button[onclick="verifyRecoveryCode()"]').textContent = 'Сбросить пароль';

    // Register Modal
    document.querySelector('#register-modal .modal-header h2').textContent = 'РЕГИСТРАЦИЯ';
    document.querySelector('#register-modal #register-nickname').placeholder = 'Nickname';
    document.querySelector('#register-modal #register-email').placeholder = 'E-MAIL';
    document.querySelector('#register-modal .label-text').textContent = 'Пол:';
    const radioOptions = document.querySelectorAll('#register-modal .radio-option');
    if (radioOptions.length >= 2) {
        radioOptions[0].innerHTML = `<input type="radio" name="gender" value="female"> Жен.`;
        radioOptions[1].innerHTML = `<input type="radio" name="gender" value="male"> Муж.`;
    }
    document.querySelector('#register-modal #register-password').placeholder = 'Пароль';
    document.querySelector('#register-modal #register-password-repeat').placeholder = 'Повтор пароля';
    document.querySelector('#register-modal .modal-body button').textContent = 'Зарегистрироваться';

    // Room Choice Modal
    document.querySelector('#roomChoice .modal-header h2').textContent = 'Меню';
    document.querySelector('#createRoomBtn').textContent = 'Создать комнату';
    document.querySelector('#joinRoomBtn').textContent = 'Присоединиться к комнате';
    document.querySelector('#roomCodeInput').placeholder = 'Введите код комнаты';
    document.querySelector('#joinWithCodeBtn').textContent = 'Присоединиться';
}

function updateUI(nickname, gender) {
    const currentLanguage = localStorage.getItem('language') || 'ru';
    const avatarSrc = gender === 'female' ? 'path-to-avatarfemale.png' : 'path-to-avatar.png';
    document.getElementById('user-section').innerHTML = `
        <img src="${avatarSrc}" width="50px" alt="User Avatar">
        <a href="profile.html?lang=${currentLanguage}" style="text-decoration: none; color: inherit;">${nickname}</a>
        <button onclick="logoutUser()">${currentLanguage === 'en' ? 'Logout' : 'Выйти'}</button>`;
}

window.onload = async function() {
    try {
        const response = await fetch(`${API_URL}/check-auth`, {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.authenticated) {
            localStorage.setItem('nickname', result.user.nickname);
            updateUI(result.user.nickname, result.user.gender);
            await loadLeaderboard(result.user.nickname);
        }
    } catch (error) {
        console.error('Check-auth error:', error);
    }
};

async function loginUser() {
    const nickname = document.getElementById('nickname').value;
    const password = document.getElementById('login-password').value;
    const currentLanguage = localStorage.getItem('language') || 'ru';

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ nickname, password }),
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.setItem('nickname', result.user.nickname);
            updateUI(result.user.nickname, result.user.gender);
            closeLoginModal();
            await loadLeaderboard(nickname);
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert(
            currentLanguage === 'en'
                ? 'Login error: ' + error.message
                : 'Ошибка при входе: ' + error.message
        );
    }
}

async function registerUser() {
    const nickname = document.getElementById('register-nickname').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const passwordRepeat = document.getElementById('register-password-repeat').value;
    const gender = document.querySelector('input[name="gender"]:checked')?.value;
    const currentLanguage = localStorage.getItem('language') || 'ru';

    if (password !== passwordRepeat) {
        alert(
            currentLanguage === 'en'
                ? 'Passwords do not match!'
                : 'Пароли не совпадают!'
        );
        return;
    }

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nickname, email, password, gender })
        });

        const result = await response.json();
        alert(result.message);
        if (response.ok) {
            localStorage.setItem('nickname', nickname);
            updateUI(nickname, gender);
            closeRegisterModal();
            await loadLeaderboard(nickname);
        }
    } catch (error) {
        console.error('Register error:', error);
        alert(
            currentLanguage === 'en'
                ? 'Registration error: ' + error.message
                : 'Ошибка при регистрации: ' + error.message
        );
    }
}

async function loadLeaderboard(nickname) {
    try {
        const res = await fetch(`/api/leaderboard/${nickname}`, {
            credentials: 'include'
        });
        if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`);
        }
        const data = await res.json();
        const currentLanguage = localStorage.getItem('language') || 'ru';

        const list = document.getElementById('leaderboard-list');
        if (!list) {
            console.error('Элемент #leaderboard-list не найден в DOM');
            return;
        }
        list.innerHTML = '';
        if (data.topPlayers && data.topPlayers.length > 0) {
            data.topPlayers.forEach(player => {
                const li = document.createElement('li');
                li.textContent = `${
                    player.nickname
                } — ${player.quiz_score} ${
                    currentLanguage === 'en' ? 'points' : 'очков'
                }`;
                list.appendChild(li);
            });
        } else {
            list.innerHTML = `<li>${
                currentLanguage === 'en' ? 'Leaderboard is empty' : 'Лидерборд пуст'
            }</li>`;
        }

        const userInfo = document.getElementById('current-user-rank');
        if (!userInfo) {
            console.error('Элемент #current-user-rank не найден в DOM');
            return;
        }
        if (data.currentUser) {
            userInfo.textContent = `${
                currentLanguage === 'en' ? 'You' : 'Вы'
            } ${nickname} ${
                currentLanguage === 'en' ? 'are ranked' : 'на'
            } ${data.currentUser.rankb} ${
                currentLanguage === 'en' ? 'place' : 'месте'
            } (${data.currentUser.quiz_score} ${
                currentLanguage === 'en' ? 'points' : 'очков'
            })`;
        } else {
            userInfo.textContent = `${
                currentLanguage === 'en'
                    ? 'Your statistics not found'
                    : 'Ваша статистика не найдена'
            }`;
        }
    } catch (error) {
        console.error('Ошибка загрузки лидерборда:', error);
    }
}

async function logoutUser() {
    try {
        await fetch(`${API_URL}/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        localStorage.removeItem('nickname');
        localStorage.removeItem('roomCode');
        sessionStorage.removeItem('alreadyJoined');
        location.reload();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function startGame() {
    const nickname = localStorage.getItem('nickname');
    const currentLanguage = localStorage.getItem('language') || 'ru';
    if (!nickname) {
        alert(
            currentLanguage === 'en'
                ? 'Please log in!'
                : 'Пожалуйста, войдите в аккаунт!'
        );
        openLoginModal();
        return;
    }

    document.getElementById('roomChoice').style.display = 'block';
}

function closeRoomModal() {
    document.getElementById('roomChoice').style.display = 'none';
    document.getElementById('joinRoomBtn').style.display = 'block';
    document.getElementById('joinInput').style.display = 'none';
}

const socket = io();

socket.on('roomCreated', ({ roomCode, isPrivate }) => {
    const nickname = localStorage.getItem('nickname');
    const currentLanguage = localStorage.getItem('language') || 'ru';
    localStorage.setItem('roomCode', roomCode);
    localStorage.setItem('isPrivate', isPrivate);
    window.location.href = `/quiz.html?nickname=${encodeURIComponent(nickname)}&room=${encodeURIComponent(roomCode)}&lang=${encodeURIComponent(currentLanguage)}`;
});

socket.on('roomJoined', ({ roomCode, isPrivate }) => {
    const nickname = localStorage.getItem('nickname');
    const currentLanguage = localStorage.getItem('language') || 'ru';
    localStorage.setItem('roomCode', roomCode);
    localStorage.setItem('isPrivate', isPrivate);
    window.location.href = `/quiz.html?nickname=${encodeURIComponent(nickname)}&room=${encodeURIComponent(roomCode)}&lang=${encodeURIComponent(currentLanguage)}`;
});

socket.on('error', (message) => {
    console.error(`Socket error: ${message}`);
    const currentLanguage = localStorage.getItem('language') || 'ru';
    alert(message);
    if (message === (currentLanguage === 'en' ? 'Room not found' : 'Комната не найдена')) {
        localStorage.removeItem('roomCode');
        sessionStorage.removeItem('alreadyJoined');
        closeRoomModal();
    }
});

function updatePublicRooms(rooms) {
    const list = document.getElementById('public-rooms-list');
    if (!list) {
        console.error('Элемент #public-rooms-list не найден в DOM');
        return;
    }
    list.innerHTML = '';
    const currentLanguage = localStorage.getItem('language') || 'ru';
    if (rooms && rooms.length > 0) {
        rooms.forEach(room => {
            const li = document.createElement('li');
            li.innerHTML = `${
                currentLanguage === 'en' ? 'Room code' : 'Код комнаты'
            }: ${room.room_code} <button class="join-room-btn" data-room-code="${
                room.room_code
            }">${currentLanguage === 'en' ? 'Join' : 'Зайти'}</button>`;
            list.appendChild(li);
        });

        document.querySelectorAll('.join-room-btn').forEach(button => {
            button.addEventListener('click', () => {
                const roomCode = button.dataset.roomCode;
                const nickname = localStorage.getItem('nickname');
                if (!nickname) {
                    alert(
                        currentLanguage === 'en'
                            ? 'Please log in!'
                            : 'Пожалуйста, войдите в аккаунт!'
                    );
                    openLoginModal();
                    return;
                }
                socket.emit('joinRoom', { roomCode, name: nickname });
            });
        });
    } else {
        list.innerHTML = `<li>${
            currentLanguage === 'en' ? 'No rooms available' : 'Нет доступных комнат'
        }</li>`;
    }
}

socket.on('publicRoomsUpdate', (rooms) => {
    console.log('Получен список публичных комнат:', rooms);
    updatePublicRooms(rooms);
});