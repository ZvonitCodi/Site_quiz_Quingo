const API_URL = 'http://localhost:3000/api';

let currentUser = null;
let isNicknameValid = false;
const logBuffer = [];
let isSendingLogs = false;

let elements = {};

document.addEventListener('DOMContentLoaded', async () => {
    elements = {
        nicknameInput: document.getElementById('nickname-input'),
        nicknameError: document.getElementById('nickname-error'),
        emailInput: document.getElementById('email-input'),
        birthdateInput: document.getElementById('birthdate-input'),
        aboutInput: document.getElementById('about-input'),
        userNicknameDisplay: document.getElementById('user-nickname-display'),
        profileForm: document.getElementById('profile-form'),
        totalGames: document.getElementById('total-games'),
        totalWins: document.getElementById('total-wins'),
        totalLosses: document.getElementById('total-losses'),
        quizScore: document.getElementById('quiz-score'),
        recentGamesTbody: document.querySelector('#recent-games tbody'),
        userAvatar: document.getElementById('user-avatar'), // Add avatar element
        genderInputs: document.querySelectorAll('input[name="gender"]')
    };
    // Получаем язык из URL или localStorage
    const urlParams = new URLSearchParams(window.location.search);
    let currentLanguage = urlParams.get('lang') || localStorage.getItem('language') || 'ru';
    localStorage.setItem('language', currentLanguage); // Сохраняем язык
    applyLanguage(currentLanguage); // Применяем перевод
    await checkAuthAndLoadUser();
    setupEventListeners();
    setInterval(sendBufferedLogs, 5000);
});

function applyLanguage(lang) {
    if (lang === 'en') {
        switchToEnglish();
    } else {
        switchToRussian();
    }
}

function switchToEnglish() {
    document.documentElement.lang = 'en';
    document.getElementById('page-title').textContent = 'Profile';
    document.getElementById('header-title').textContent = 'Profile';
    document.getElementById('profile-tab').textContent = '🐱 Profile';
    document.getElementById('stats-tab').textContent = '📊 Statistics';
    document.getElementById('logout-btn').textContent = 'Logout';
    document.getElementById('profile-title').textContent = 'Player Profile';
    document.getElementById('nickname-label').textContent = 'Nickname';
    document.getElementById('email-label').textContent = 'Email';
    document.getElementById('birthdate-label').textContent = 'Birth Date';
    document.getElementById('gender-label').textContent = 'Gender:';
    document.getElementById('gender-female').textContent = 'Female';
    document.getElementById('gender-male').textContent = 'Male';
    document.getElementById('about-label').textContent = 'About';
    document.getElementById('save-btn').textContent = 'Save Changes';
    document.getElementById('delete-btn').textContent = 'Delete Account';
    document.getElementById('stats-title').textContent = 'Player Statistics';
    document.getElementById('total-games-label').textContent = 'Games Played: ';
    document.getElementById('total-wins-label').textContent = 'Wins: ';
    document.getElementById('total-losses-label').textContent = 'Losses: ';
    document.getElementById('quiz-score-label').textContent = 'Quiz Score: ';
    document.getElementById('recent-games-title').textContent = 'Recent Games:';
    document.getElementById('game-name-header').textContent = 'Game';
    document.getElementById('played-at-header').textContent = 'Date Played';
    document.getElementById('status-header').textContent = 'Status';
}

function switchToRussian() {
    document.documentElement.lang = 'ru';
    document.getElementById('page-title').textContent = 'Личный кабинет';
    document.getElementById('header-title').textContent = 'Личный кабинет';
    document.getElementById('profile-tab').textContent = '🐱 Профиль';
    document.getElementById('stats-tab').textContent = '📊 Статистика';
    document.getElementById('logout-btn').textContent = 'Выйти из аккаунта';
    document.getElementById('profile-title').textContent = 'Профиль игрока';
    document.getElementById('nickname-label').textContent = 'Nickname';
    document.getElementById('email-label').textContent = 'Email';
    document.getElementById('birthdate-label').textContent = 'Дата рождения';
    document.getElementById('gender-label').textContent = 'Пол:';
    document.getElementById('gender-female').textContent = 'жен.';
    document.getElementById('gender-male').textContent = 'муж.';
    document.getElementById('about-label').textContent = 'О себе';
    document.getElementById('save-btn').textContent = 'Сохранить изменения';
    document.getElementById('delete-btn').textContent = 'Удалить аккаунт';
    document.getElementById('stats-title').textContent = 'Статистика игрока';
    document.getElementById('total-games-label').textContent = 'Игр сыграно: ';
    document.getElementById('total-wins-label').textContent = 'Кол-во побед: ';
    document.getElementById('total-losses-label').textContent = 'Кол-во поражений: ';
    document.getElementById('quiz-score-label').textContent = 'Очки в викторинах: ';
    document.getElementById('recent-games-title').textContent = 'Последние игры:';
    document.getElementById('game-name-header').textContent = 'Игра';
    document.getElementById('played-at-header').textContent = 'Дата игры';
    document.getElementById('status-header').textContent = 'Статус';
}

async function logError(message, url = '') {
    const timestamp = new Date().toISOString();
    const logMessage = `${message} ${url ? `(URL: ${url})` : ''}`;
    console.error(`[${timestamp}] [ERROR] ${logMessage}`);
    logBuffer.push({ timestamp, message: logMessage });
}

async function sendBufferedLogs() {
    if (isSendingLogs || logBuffer.length === 0) return;
    isSendingLogs = true;
    try {
        const logs = [...logBuffer];
        logBuffer.length = 0;
        await fetch(`${API_URL}/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logs)
        });
    } catch (error) {
        console.error('Failed to send logs to server:', error);
    } finally {
        isSendingLogs = false;
    }
}

async function fetchWithErrorHandling(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', ...options.headers }
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            const errorMessage = error.message || `HTTP error: ${response.status}`;
            await logError(errorMessage, url);
            throw new Error(errorMessage);
        }
        return await response.json();
    } catch (error) {
        await logError(error.message, url);
        throw error;
    }
}

async function checkAuthAndLoadUser() {
    try {
        const data = await fetchWithErrorHandling(`${API_URL}/auth/check-auth`);
        if (data.authenticated) {
            currentUser = data.user;
            await Promise.all([loadUserProfile(), loadUserStats()]);
        } else {
            window.location.href = 'index.html';
        }
    } catch (error) {
        await logError('Ошибка при проверке аутентификации', '');
        window.location.href = 'index.html';
    }
}

// function setupEventListeners() {
//     elements.nicknameInput.addEventListener('blur', validateNickname);
//     elements.nicknameInput.addEventListener('keydown', (e) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             validateNickname();
//         }
//     });
//     elements.profileForm.addEventListener('submit', async (e) => {
//         e.preventDefault();
//         await updateProfile();
//     });
// }

function setupEventListeners() {
    elements.nicknameInput.addEventListener('blur', validateNickname);
    elements.nicknameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            validateNickname();
        }
    });
    elements.profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateProfile();
    });

    // Add event listener for gender radio buttons
    elements.genderInputs.forEach(input => {
        input.addEventListener('change', updateAvatar);
    });
}

function updateAvatar() {
    const selectedGender = document.querySelector('input[name="gender"]:checked')?.value;
    if (selectedGender === 'male') {
        elements.userAvatar.src = 'path-to-avatar.png';
    } else if (selectedGender === 'female') {
        elements.userAvatar.src = 'path-to-avatarfemale.png';
    } else {
        elements.userAvatar.src = 'path-to-avatar.png'; // Default avatar if no gender selected
    }
}

async function validateNickname() {
    const newNickname = elements.nicknameInput.value.trim();
    elements.nicknameInput.classList.remove('valid', 'invalid');
    elements.nicknameError.textContent = '';
    const currentLanguage = localStorage.getItem('language') || 'ru';

    if (newNickname === currentUser.username) {
        isNicknameValid = true;
        return true;
    }

    if (newNickname.length < 3) {
        elements.nicknameInput.classList.add('invalid');
        elements.nicknameError.textContent = currentLanguage === 'en'
            ? 'Nickname must be at least 3 characters long'
            : 'Nickname должен содержать минимум 3 символа';
        isNicknameValid = false;
        return false;
    }

    try {
        const result = await fetchWithErrorHandling(`${API_URL}/check-nickname?nickname=${encodeURIComponent(newNickname)}`);
        if (result.available) {
            elements.nicknameInput.classList.add('valid');
            isNicknameValid = true;
            return true;
        } else {
            elements.nicknameInput.classList.add('invalid');
            elements.nicknameError.textContent = currentLanguage === 'en'
                ? 'This nickname is already taken'
                : 'Этот nickname уже занят';
            isNicknameValid = false;
            return false;
        }
    } catch (error) {
        elements.nicknameInput.classList.add('invalid');
        elements.nicknameError.textContent = currentLanguage === 'en'
            ? 'Error checking nickname'
            : 'Ошибка проверки nickname';
        isNicknameValid = false;
        return false;
    }
}

function validateBirthDate(birthDate) {
    const currentLanguage = localStorage.getItem('language') || 'ru';
    if (!birthDate) return { valid: true };

    const today = new Date();
    const birth = new Date(birthDate);
    const age = (today - birth) / (1000 * 60 * 60 * 24 * 365.25);

    if (birth > today) {
        return {
            valid: false,
            message: currentLanguage === 'en'
                ? 'Birth date cannot be in the future'
                : 'Дата рождения не может быть в будущем'
        };
    }
    if (age < 13) {
        return {
            valid: false,
            message: currentLanguage === 'en'
                ? 'You must be at least 13 years old'
                : 'Вы должны быть старше 13 лет'
        };
    }
    if (age > 120) {
        return {
            valid: false,
            message: currentLanguage === 'en'
                ? 'Please enter a valid birth date'
                : 'Введите корректную дату рождения'
        };
    }
    return { valid: true };
}

// async function updateProfile() {
//     const newNickname = elements.nicknameInput.value.trim();
//     const newEmail = elements.emailInput.value.trim();
//     const newBirthDate = elements.birthdateInput.value || null;
//     const currentLanguage = localStorage.getItem('language') || 'ru';

//     const prevEmail = currentUser.email;
//     const prevBirthDate = currentUser.birth_date ? currentUser.birth_date.split('T')[0] : '';

//     if (newNickname !== currentUser.username && !isNicknameValid) {
//         const isValid = await validateNickname();
//         if (!isValid) return;
//     }

//     if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
//         elements.emailInput.value = prevEmail;
//         alert(currentLanguage === 'en' ? 'Please enter a valid email' : 'Введите корректный email');
//         return;
//     }

//     const birthDateValidation = validateBirthDate(newBirthDate);
//     if (!birthDateValidation.valid) {
//         elements.birthdateInput.value = prevBirthDate;
//         alert(birthDateValidation.message);
//         return;
//     }

//     const formData = {
//         username: newNickname,
//         email: newEmail,
//         birth_date: newBirthDate,
//         gender: document.querySelector('input[name="gender"]:checked')?.value || null,
//         about: elements.aboutInput.value.trim()
//     };

//     try {
//         await fetchWithErrorHandling(`${API_URL}/user/${currentUser.id}`, {
//             method: 'PUT',
//             body: JSON.stringify(formData)
//         });
//         currentUser.username = newNickname;
//         currentUser.email = newEmail;
//         currentUser.birth_date = newBirthDate;
//         localStorage.setItem('nickname', newNickname);
//         elements.userNicknameDisplay.textContent = newNickname;
//         alert(currentLanguage === 'en' ? 'Profile updated successfully!' : 'Профиль успешно обновлен!');
//     } catch (error) {
//         if (error.message.includes('Email уже занят')) {
//             elements.emailInput.value = prevEmail;
//             alert(currentLanguage === 'en' ? 'This email is already taken' : 'Этот email уже занят');
//         } else {
//             elements.emailInput.value = prevEmail;
//             elements.birthdateInput.value = prevBirthDate;
//             alert(error.message || (currentLanguage === 'en' ? 'Failed to update profile' : 'Не удалось обновить профиль'));
//         }
//     }
// }






async function updateProfile() {
    const newNickname = elements.nicknameInput.value.trim();
    const newEmail = elements.emailInput.value.trim();
    const newBirthDate = elements.birthdateInput.value || null;
    const currentLanguage = localStorage.getItem('language') || 'ru';

    const prevEmail = currentUser.email;
    const prevBirthDate = currentUser.birth_date ? currentUser.birth_date.split('T')[0] : '';

    if (newNickname !== currentUser.username && !isNicknameValid) {
        const isValid = await validateNickname();
        if (!isValid) return;
    }

    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        elements.emailInput.value = prevEmail;
        alert(currentLanguage === 'en' ? 'Please enter a valid email' : 'Введите корректный email');
        return;
    }

    const birthDateValidation = validateBirthDate(newBirthDate);
    if (!birthDateValidation.valid) {
        elements.birthdateInput.value = prevBirthDate;
        alert(birthDateValidation.message);
        return;
    }

    const formData = {
        username: newNickname,
        email: newEmail,
        birth_date: newBirthDate,
        gender: document.querySelector('input[name="gender"]:checked')?.value || null,
        about: elements.aboutInput.value.trim()
    };

    try {
        await fetchWithErrorHandling(`${API_URL}/user/${currentUser.id}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
        });
        currentUser.username = newNickname;
        currentUser.email = newEmail;
        currentUser.birth_date = newBirthDate;
        currentUser.gender = formData.gender;
        localStorage.setItem('nickname', newNickname);
        elements.userNicknameDisplay.textContent = newNickname;
        updateAvatar(); // Update avatar after saving profile
        alert(currentLanguage === 'en' ? 'Profile updated successfully!' : 'Профиль успешно обновлен!');
    } catch (error) {
        if (error.message.includes('Email уже занят')) {
            elements.emailInput.value = prevEmail;
            alert(currentLanguage === 'en' ? 'This email is already taken' : 'Этот email уже занят');
        } else {
            elements.emailInput.value = prevEmail;
            elements.birthdateInput.value = prevBirthDate;
            alert(error.message || (currentLanguage === 'en' ? 'Failed to update profile' : 'Не удалось обновить профиль'));
        }
    }
}

// async function loadUserProfile() {
//     try {
//         const user = await fetchWithErrorHandling(`${API_URL}/user/${currentUser.id}`);
//         currentUser = { ...currentUser, ...user };

//         elements.nicknameInput.value = user.username;
//         elements.emailInput.value = user.email;
//         elements.userNicknameDisplay.textContent = user.username;

//         if (user.birth_date) {
//             elements.birthdateInput.value = user.birth_date.split('T')[0];
//         }
//         if (user.gender) {
//             const genderInput = document.querySelector(`input[name="gender"][value="${user.gender}"]`);
//             if (genderInput) genderInput.checked = true;
//         }
//         if (user.about) {
//             elements.aboutInput.value = user.about;
//         }
//     } catch (error) {
//         await logError('Не удалось загрузить данные профиля', '');
//         alert(localStorage.getItem('language') === 'en' ? 'Failed to load profile data' : 'Не удалось загрузить данные профиля');
//     }
// }

async function loadUserProfile() {
    try {
        const user = await fetchWithErrorHandling(`${API_URL}/user/${currentUser.id}`);
        currentUser = { ...currentUser, ...user };

        elements.nicknameInput.value = user.username;
        elements.emailInput.value = user.email;
        elements.userNicknameDisplay.textContent = user.username;

        if (user.birth_date) {
            elements.birthdateInput.value = user.birth_date.split('T')[0];
        }
        if (user.gender) {
            const genderInput = document.querySelector(`input[name="gender"][value="${user.gender}"]`);
            if (genderInput) genderInput.checked = true;
            updateAvatar(); // Set avatar based on loaded gender
        }
        if (user.about) {
            elements.aboutInput.value = user.about;
        }
    } catch (error) {
        await logError('Не удалось загрузить данные профиля', '');
        alert(localStorage.getItem('language') === 'en' ? 'Failed to load profile data' : 'Не удалось загрузить данные профиля');
    }
}

async function loadUserStats() {
    const currentLanguage = localStorage.getItem('language') || 'ru';
    try {
        console.log(`Fetching stats for user ID: ${currentUser.id}`);
        const stats = await fetchWithErrorHandling(`${API_URL}/user-stats/${currentUser.id}`);
        console.log('Stats received:', stats);

        // Проверяем наличие DOM-элементов
        if (!elements.totalGames || !elements.totalWins || !elements.totalLosses || !elements.quizScore) {
            throw new Error('One or more DOM elements for stats are missing');
        }

        // Обновляем текст элементов
        elements.totalGames.textContent = stats.total_games ?? 0;
        elements.totalWins.textContent = stats.wins ?? 0;
        elements.totalLosses.textContent = stats.losses ?? 0;
        elements.quizScore.textContent = stats.quiz_score ?? 0;

        // Проверяем, применились ли значения
        console.log('Updated DOM values:', {
            totalGames: elements.totalGames.textContent,
            totalWins: elements.totalWins.textContent,
            totalLosses: elements.totalLosses.textContent,
            quizScore: elements.quizScore.textContent
        });

        await loadRecentGames();
    } catch (error) {
        console.error('Error in loadUserStats:', error);
        await logError('Ошибка загрузки статистики', `${API_URL}/user-stats/${currentUser.id}`);
        alert(currentLanguage === 'en'
            ? 'Failed to load statistics. Please try again later.'
            : 'Не удалось загрузить статистику. Попробуйте позже.');
        // Устанавливаем значения по умолчанию
        if (elements.totalGames) elements.totalGames.textContent = '0';
        if (elements.totalWins) elements.totalWins.textContent = '0';
        if (elements.totalLosses) elements.totalLosses.textContent = '0';
        if (elements.quizScore) elements.quizScore.textContent = '0';
    }
}

async function loadRecentGames() {
    const currentLanguage = localStorage.getItem('language') || 'ru';
    try {
        console.log(`Fetching recent games for user ID: ${currentUser.id}`); // Отладка
        const games = await fetchWithErrorHandling(`${API_URL}/recent-games/${currentUser.id}`);
        console.log('Recent games received:', games); // Отладка

        elements.recentGamesTbody.innerHTML = games.length > 0
            ? games.map(game => `
                <tr>
                    <td>${game.game_name || 'Unknown'}</td>
                    <td>${game.played_at ? new Date(game.played_at).toLocaleDateString() : 'N/A'}</td>
                    <td class="${game.is_winner ? 'win' : 'loss'}">
                        ${game.is_winner
                            ? (currentLanguage === 'en' ? 'Win' : 'Победа')
                            : (currentLanguage === 'en' ? 'Loss' : 'Поражение')}
                    </td>
                </tr>
            `).join('')
            : `<tr><td colspan="3">${currentLanguage === 'en' ? 'No recent games' : 'Нет недавних игр'}</td></tr>`;
    } catch (error) {
        await logError('Ошибка загрузки последних игр', `${API_URL}/recent-games/${currentUser.id}`);
        elements.recentGamesTbody.innerHTML = `<tr><td colspan="3">${currentLanguage === 'en' ? 'Failed to load recent games' : 'Не удалось загрузить последние игры'}</td></tr>`;
    }
}

function deleteAccount() {
    const currentLanguage = localStorage.getItem('language') || 'ru';
    if (!confirm(currentLanguage === 'en'
        ? 'Are you sure you want to delete your account? This action cannot be undone.'
        : 'Вы уверены, что хотите удалить аккаунт? Это действие нельзя отменить.')) return;

    fetchWithErrorHandling(`${API_URL}/user/${currentUser.id}`, { method: 'DELETE' })
        .then(() => logoutUser())
        .catch(async error => {
            await logError('Не удалось удалить аккаунт', '');
            alert(error.message || (currentLanguage === 'en' ? 'Failed to delete account' : 'Не удалось удалить аккаунт'));
        });
}

async function logoutUser() {
    try {
        await fetchWithErrorHandling(`${API_URL}/auth/logout`, { method: 'POST' });
        localStorage.removeItem('nickname');
        window.location.href = 'index.html';
    } catch (error) {
        await logError('Ошибка при выходе', '');
        alert((localStorage.getItem('language') === 'en' ? 'Error logging out: ' : 'Ошибка при выходе: ') + error.message);
    }
}

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}