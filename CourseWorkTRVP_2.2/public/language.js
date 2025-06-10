document.addEventListener('DOMContentLoaded', () => {
    const languageSwitcher = document.getElementById('language-switcher');
    let currentLanguage = localStorage.getItem('language') || 'ru';
    document.querySelector('#language-switcher span').textContent = currentLanguage;

    // Устанавливаем язык при загрузке страницы
    updateLanguage(currentLanguage);

    if (languageSwitcher) {
        languageSwitcher.addEventListener('click', () => {
            currentLanguage = currentLanguage === 'ru' ? 'en' : 'ru';
            localStorage.setItem('language', currentLanguage);
            updateLanguage(currentLanguage);
        });
    }
});

function updateLanguage(language) {
    const isMainPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
    const isTermsPage = window.location.pathname.endsWith('terms.html');
    const isPrivacyPage = window.location.pathname.endsWith('privacy.html');
    const isFaqPage = window.location.pathname.endsWith('faq.html');

    document.querySelector('#language-switcher span').textContent = language;

    if (language === 'en') {
        // Шапка
        document.querySelector('#user-section button').innerHTML = `
            <img src="path-to-login-icon.png" alt="Login Icon">
            ${isMainPage ? 'Login' : 'Back to Home'}
        `;

        // Футер
        document.querySelector('#legal-info').innerHTML = `
            <p>© 2025 Quingo Games LLC. All rights reserved.</p>
            <p>OGRN: 1234567890123 | TIN: 9876543210</p>
        `;
        document.querySelector('#footer-links').innerHTML = `
            <a href="terms.html">Terms of Use</a>
            <a href="privacy.html">Privacy Policy</a>
            <a href="faq.html">FAQ</a>
        `;
        document.querySelector('#footer-contact').innerHTML = `
            <p>Support: <a href="mailto:Quingogame@yandex.ru">Quingogame@yandex.ru</a></p>
        `;

        // Контент страниц
        if (isTermsPage) {
            document.querySelector('main h1').textContent = 'Terms of Use';
            document.querySelector('main p:nth-of-type(1)').textContent = 'Welcome to Quingo! By using our site, you agree to these Terms of Use.';
            document.querySelector('main h3:nth-of-type(1)').textContent = '1. General Provisions';
            document.querySelector('main p:nth-of-type(2)').textContent = 'These Terms govern the use of the site and services provided. If you do not agree with the terms, please stop using the site.';
            document.querySelector('main h3:nth-of-type(2)').textContent = '2. Rights and Obligations';
            document.querySelector('main p:nth-of-type(3)').textContent = 'Users must provide accurate information during registration and not violate the rights of other users.';
            document.querySelector('main h3:nth-of-type(3)').textContent = '3. Limitation of Liability';
            document.querySelector('main p:nth-of-type(4)').textContent = 'Quingo Games LLC is not responsible for any losses arising from the use of the site.';
            document.querySelector('main p:nth-of-type(5) a').textContent = 'Back to Home';
        } else if (isPrivacyPage) {
            document.querySelector('main h1').textContent = 'Privacy Policy';
            document.querySelector('main p:nth-of-type(1)').textContent = 'We at Quingo Games LLC respect your privacy and strive to protect your personal data.';
            document.querySelector('main h3:nth-of-type(1)').textContent = '1. Data Collection';
            document.querySelector('main p:nth-of-type(2)').textContent = 'We collect data such as nickname, email, and gender during registration on the site.';
            document.querySelector('main h3:nth-of-type(2)').textContent = '2. Data Usage';
            document.querySelector('main p:nth-of-type(3)').textContent = 'Your data is used to provide services, improve the site, and communicate with you.';
            document.querySelector('main h3:nth-of-type(3)').textContent = '3. Data Protection';
            document.querySelector('main p:nth-of-type(4)').textContent = 'We implement security measures to protect your data from unauthorized access.';
            document.querySelector('main p:nth-of-type(5) a').textContent = 'Back to Home';
        } else if (isFaqPage) {
            document.querySelector('main h1').textContent = 'Frequently Asked Questions (FAQ)';
            document.querySelector('main h3:nth-of-type(1)').textContent = '1. How do I register on the site?';
            document.querySelector('main p:nth-of-type(1)').textContent = 'Click the "Login" button on the main page, then select "Register" and fill out the form.';
            document.querySelector('main h3:nth-of-type(2)').textContent = '2. What should I do if I forgot my password?';
            document.querySelector('main p:nth-of-type(2)').textContent = 'Use the "Forgot Password?" function in the login window to reset your password via email.';
            document.querySelector('main h3:nth-of-type(3)').textContent = '3. How do I join a room?';
            document.querySelector('main p:nth-of-type(3)').textContent = 'Click "PLAY", select "Join Room", and enter the room code.';
            document.querySelector('main p:nth-of-type(4) a').textContent = 'Back to Home';
        }
    } else {
        // Русский язык (по умолчанию)
        document.querySelector('#user-section button').innerHTML = `
            <img src="path-to-login-icon.png" alt="Login Icon">
            ${isMainPage ? 'Войти' : 'На главную'}
        `;

        // Футер
        document.querySelector('#legal-info').innerHTML = `
            <p>© 2025 ООО "Quingo Games". Все права защищены.</p>
            <p>ОГРН: 1234567890123 | ИНН: 9876543210</p>
        `;
        document.querySelector('#footer-links').innerHTML = `
            <a href="terms.html">Условия использования</a>
            <a href="privacy.html">Политика конфиденциальности</a>
            <a href="faq.html">FAQ</a>
        `;
        document.querySelector('#footer-contact').innerHTML = `
            <p>Поддержка: <a href="mailto:Quingogame@yandex.ru">Quingogame@yandex.ru</a></p>
        `;

        // Контент страниц
        if (isTermsPage) {
            document.querySelector('main h1').textContent = 'Условия использования';
            document.querySelector('main p:nth-of-type(1)').textContent = 'Добро пожаловать на сайт Quingo! Используя наш сайт, вы соглашаетесь с настоящими Условиями использования.';
            document.querySelector('main h3:nth-of-type(1)').textContent = '1. Общие положения';
            document.querySelector('main p:nth-of-type(2)').textContent = 'Настоящие Условия регулируют использование сайта и предоставляемых услуг. Если вы не согласны с условиями, пожалуйста, прекратите использование сайта.';
            document.querySelector('main h3:nth-of-type(2)').textContent = '2. Права и обязанности';
            document.querySelector('main p:nth-of-type(3)').textContent = 'Пользователи обязаны предоставлять достоверную информацию при регистрации и не нарушать права других пользователей.';
            document.querySelector('main h3:nth-of-type(3)').textContent = '3. Ограничение ответственности';
            document.querySelector('main p:nth-of-type(4)').textContent = 'ООО "Quingo Games" не несет ответственности за любые убытки, возникшие в результате использования сайта.';
            document.querySelector('main p:nth-of-type(5) a').textContent = 'Вернуться на главную';
        } else if (isPrivacyPage) {
            document.querySelector('main h1').textContent = 'Политика конфиденциальности';
            document.querySelector('main p:nth-of-type(1)').textContent = 'Мы в ООО "Quingo Games" уважаем вашу конфиденциальность и стремимся защитить ваши персональные данные.';
            document.querySelector('main h3:nth-of-type(1)').textContent = '1. Сбор информации';
            document.querySelector('main p:nth-of-type(2)').textContent = 'Мы собираем данные, такие как никнейм, email и пол, при регистрации на сайте.';
            document.querySelector('main h3:nth-of-type(2)').textContent = '2. Использование данных';
            document.querySelector('main p:nth-of-type(3)').textContent = 'Ваши данные используются для предоставления услуг, улучшения работы сайта и связи с вами.';
            document.querySelector('main h3:nth-of-type(3)').textContent = '3. Защита данных';
            document.querySelector('main p:nth-of-type(4)').textContent = 'Мы применяем меры безопасности для защиты ваших данных от несанкционированного доступа.';
            document.querySelector('main p:nth-of-type(5) a').textContent = 'Вернуться на главную';
        } else if (isFaqPage) {
            document.querySelector('main h1').textContent = 'Часто задаваемые вопросы (FAQ)';
            document.querySelector('main h3:nth-of-type(1)').textContent = '1. Как зарегистрироваться на сайте?';
            document.querySelector('main p:nth-of-type(1)').textContent = 'Нажмите кнопку "Войти" на главной странице, затем выберите "Регистрация" и заполните форму.';
            document.querySelector('main h3:nth-of-type(2)').textContent = '2. Что делать, если я забыл пароль?';
            document.querySelector('main p:nth-of-type(2)').textContent = 'Воспользуйтесь функцией "Забыли пароль?" в окне входа, чтобы сбросить пароль через email.';
            document.querySelector('main h3:nth-of-type(3)').textContent = '3. Как присоединиться к комнате?';
            document.querySelector('main p:nth-of-type(3)').textContent = 'Нажмите "ИГРАТЬ", выберите "Присоединиться к комнате" и введите код комнаты.';
            document.querySelector('main p:nth-of-type(4) a').textContent = 'Вернуться на главную';
        }
    }
}