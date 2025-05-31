-- Создаем базу данных (если не существует)
CREATE DATABASE IF NOT EXISTS game_sessions_db;
USE game_sessions_db;
SET default_storage_engine=InnoDB;

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    gender ENUM('male', 'female') NOT NULL,
    birth_date DATE NULL,
    about TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица типов игр
CREATE TABLE IF NOT EXISTS game_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    short_description VARCHAR(255) NOT NULL,
    rules TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ;

-- Таблица игровых сессий
CREATE TABLE IF NOT EXISTS game_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_type_id INT NOT NULL,
    status ENUM('waiting', 'started', 'ended', 'paused') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    ended_at TIMESTAMP NULL,
    FOREIGN KEY (game_type_id) REFERENCES game_types(id)
) ;

-- Таблица игроков в сессии
CREATE TABLE IF NOT EXISTS session_players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    user_id INT NOT NULL,
    score INT DEFAULT 0,
    is_winner BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ;

-- Таблица статистики игроков
CREATE TABLE IF NOT EXISTS user_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    total_games INT DEFAULT 0,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    quiz_score INT DEFAULT 0,
    hangman_wins INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ;

-- Таблица вопросов для викторины
CREATE TABLE IF NOT EXISTS quiz_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question TEXT NOT NULL,
    correct_answer VARCHAR(255) NOT NULL,
    wrong_answer1 VARCHAR(255) NOT NULL,
    wrong_answer2 VARCHAR(255) NOT NULL,
    wrong_answer3 VARCHAR(255) NOT NULL,
    difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
    category VARCHAR(50) NULL
) ;

CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_code VARCHAR(6) UNIQUE NOT NULL,
    is_private BOOLEAN DEFAULT FALSE,
    session_id INT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);


-- Триггер для автоматического создания статистики при регистрации
DELIMITER //
CREATE TRIGGER after_user_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO user_stats (user_id) VALUES (NEW.id);
END //
DELIMITER ;

-- Заполняем начальные данные (опционально)
INSERT INTO game_types (name, short_description, rules)
VALUES 
    ('quiz', 'Викторина на общие знания', 'Игроки отвечают на вопросы. Побеждает тот, кто наберёт больше очков.');

INSERT INTO quiz_questions (question, correct_answer, wrong_answer1, wrong_answer2, wrong_answer3, difficulty, category) VALUES
('Столица России?', 'Москва', 'Санкт-Петербург', 'Казань', 'Новосибирск', 'easy', 'География'),
('Сколько дней в неделе?', '7', '5', '6', '8', 'easy', 'Общие знания'),
('Какой цвет получается при смешивании синего и жёлтого?', 'Зелёный', 'Оранжевый', 'Фиолетовый', 'Красный', 'easy', 'Искусство'),
('Сколько будет 2 + 2?', '4', '3', '5', '6', 'easy', 'Математика'),
('Как зовут героя, спасающего принцессу в играх Nintendo?', 'Марио', 'Соник', 'Кратос', 'Линк', 'easy', 'Игры'),
('Сколько ног у паука?', '8', '6', '10', '12', 'easy', 'Биология'),
('Какая планета ближе всех к Солнцу?', 'Меркурий', 'Земля', 'Марс', 'Юпитер', 'easy', 'Астрономия'),
('Какой напиток делают из винограда?', 'Вино', 'Пиво', 'Кофе', 'Чай', 'easy', 'Кулинария'),
('Какая буква идёт после "А" в русском алфавите?', 'Б', 'В', 'Г', 'Д', 'easy', 'Язык'),
('Как называется жёлтый фрукт, растущий в связке?', 'Банан', 'Лимон', 'Яблоко', 'Ананас', 'easy', 'Ботаника');

INSERT INTO quiz_questions (question, correct_answer, wrong_answer1, wrong_answer2, wrong_answer3, difficulty, category) VALUES
('Кто написал роман "Война и мир"?', 'Лев Толстой', 'Фёдор Достоевский', 'Александр Пушкин', 'Антон Чехов', 'medium', 'Литература'),
('Какая страна первой запустила спутник в космос?', 'СССР', 'США', 'Германия', 'Франция', 'medium', 'История'),
('Сколько костей в теле взрослого человека?', '206', '201', '210', '199', 'medium', 'Биология'),
('Какой океан самый большой?', 'Тихий', 'Атлантический', 'Индийский', 'Северный Ледовитый', 'medium', 'География'),
('Что изучает орнитология?', 'Птиц', 'Рыб', 'Насекомых', 'Деревья', 'medium', 'Наука'),
('Кто написал симфонию "Лунная соната"?', 'Бетховен', 'Моцарт', 'Бах', 'Чайковский', 'medium', 'Музыка'),
('В каком году произошла Октябрьская революция?', '1917', '1905', '1920', '1939', 'medium', 'История'),
('Какой элемент обозначается символом "Na"?', 'Натрий', 'Азот', 'Неон', 'Кальций', 'medium', 'Химия'),
('Какая страна изобрела бумагу?', 'Китай', 'Индия', 'Египет', 'Япония', 'medium', 'История'),
('Сколько градусов в прямом угле?', '90', '45', '180', '60', 'medium', 'Математика');

INSERT INTO quiz_questions (question, correct_answer, wrong_answer1, wrong_answer2, wrong_answer3, difficulty, category) VALUES
('Кто написал роман "Сто лет одиночества"?', 'Габриэль Гарсиа Маркес', 'Пауло Коэльо', 'Хорхе Луис Борхес', 'Марио Варгас Льоса', 'hard', 'Литература'),
('Сколько хромосом у человека?', '46', '44', '48', '42', 'hard', 'Биология'),
('Как называется устройство для измерения атмосферного давления?', 'Барометр', 'Термометр', 'Гигрометр', 'Анемометр', 'hard', 'Физика'),
('Кто разработал теорию относительности?', 'Альберт Эйнштейн', 'Исаак Ньютон', 'Стивен Хокинг', 'Галилео Галилей', 'hard', 'Физика'),
('В каком году была подписана Великая хартия вольностей?', '1215', '1066', '1492', '1314', 'hard', 'История'),
('Какая из частиц не имеет электрического заряда?', 'Нейтрон', 'Протон', 'Электрон', 'Позитрон', 'hard', 'Физика'),
('Какой город был столицей Византийской империи?', 'Константинополь', 'Афины', 'Рим', 'Анкара', 'hard', 'История'),
('Какая формула описывает закон всемирного тяготения?', 'F = G * (m1*m2)/r²', 'E = mc²', 'V = IR', 'a² + b² = c²', 'hard', 'Физика'),
('Кто изобрёл логарифмы?', 'Джон Непер', 'Рене Декарт', 'Готфрид Лейбниц', 'Исаак Ньютон', 'hard', 'Математика'),
('В каком году началась Тридцатилетняя война?', '1618', '1648', '1600', '1701', 'hard', 'История');
