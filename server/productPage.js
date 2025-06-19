const path = require('path');
const db = require('./database.js');

function setupProductRoutes(app) {
    // Страница продукта
    app.get('/product/:id', (req, res) => {
        const productId = req.params.id;
        console.log('Запрос страницы продукта:', { productId }); // Логирование
        db.get(`SELECT * FROM products WHERE id = ?`, [productId], (err, product) => {
            if (err || !product) {
                console.error('Ошибка при получении продукта:', err?.message);
                return res.status(404).send('Товар не найден');
            }
            db.all(`SELECT image FROM photos WHERE productId = ?`, [productId], (errPhotos, photos) => {
                db.all(`SELECT reviews.comment, users.username FROM reviews JOIN users ON reviews.userId = users.id WHERE productId = ?`, [productId], (errReviews, reviews) => {
                    const mainImage = product.imageLogo ? Buffer.from(product.imageLogo).toString('base64') : '';
                    const photoImages = photos.map(photo => ({
                        image: Buffer.from(photo.image).toString('base64')
                    }));
                    let html = `
                        <!DOCTYPE html>
                        <html lang="ru">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>${product.name}</title>
                            <link rel="stylesheet" href="../css/header.css">
                            <link rel="stylesheet" href="../css/main.css">
                            <link rel="stylesheet" href="../css/footer.css">
                            <link rel="stylesheet" href="../css/login.css">
                            <style>
                                :root {
                                    /* HEADER */
                                    --header-bg: #333;
                                    --menu-bg-color-1: #1d2029;
                                    --menu-bg-color-2: #2f343f;
                                    --dropdown-bg: #666;
                                    --button-bg: #555;
                                    --divider-bg: #666;
                                    --header-wave-bg-gradient-color-1: #1d2029;
                                    --header-wave-bg-gradient-color-2: #2f343f;
                                    --input-bg: #666;
                                    --text-primary: #fff;
                                    --text-hover: #ddd;
                                    --accent-primary: #ffa700;
                                    --accent-secondary: #ffca2c;
                                    --shadow-accent: rgba(255, 107, 107, 0.2);
                                    --scrollbar-track: rgba(68, 68, 68, 0.3);
                                    --shadow-dark: rgba(0, 0, 0, 0.2);
                                    /* FOOTER */
                                    --input-bg: #666;
                                    --input-button-bg: #ffca2c;
                                    --input-button-hover-bg: #ffa700;
                                    --footer-color-h2: #ffca2c;
                                    --footer-divider-gradient-color-1: #ffca2c;
                                    --footer-divider-gradient-color-2: #ffa700;
                                    --footer-social-button-color: #ffca2c;
                                    --footer-social-button-hover-color: #ffa700;
                                    --footer-bg-gradient-color-1: #1e2128;
                                    --footer-bg-gradient-color-2: #343a46;
                                    --footer-wave-bg-gradient-color-1: #1d2029;
                                    --footer-wave-bg-gradient-color-2: #2f343f;
                                    --footer-bg-copyright-color: rgba(0, 0, 0, 0.4);
                                    --footer-separator-text-color: #ffca2c;
                                    /* Text colors */
                                    --main-h1-color: #1e2128;
                                    --main-p-color: #343a46;
                                    --footer-text-about-color: #ced4da;
                                    --footer-contact-color: #ced4da;
                                    --footer-hours-color: #ced4da;
                                    --footer-copyright-color: #adb5bd;
                                    --copyright-link-color: #ffca2c;
                                    --copyright-link-hover-color: #ffa700;
                                }

                                * {
                                    box-sizing: border-box;
                                    margin: 0;
                                    padding: 0;
                                    font-family: 'Arial', sans-serif;
                                }

                                body {
                                    background-color: #f8f9fa;
                                    color: var(--main-p-color);
                                    line-height: 1.6;
                                }

                                .container {
                                    max-width: 1200px;
                                    margin: 0 auto;
                                    padding: 20px;
                                }

                                .product-header {
                                    display: flex;
                                    flex-direction: row;
                                    align-items: center;
																		justify-content: start;
                                    text-align: left;
                                    margin-bottom: 20px;
                                    padding: 20px;
                                    background: linear-gradient(135deg, var(--header-wave-bg-gradient-color-1), var(--header-wave-bg-gradient-color-2));
                                    color: var(--text-primary);
                                    border-radius: 8px;
                                    box-shadow: 0 4px 8px var(--shadow-dark);
																		gap: 30px;
                                }

                                .product-title {
                                    font-size: 2.5rem;
                                    margin-bottom: 10px;
                                    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
                                }

                                .product-main-image {
                                    max-width: 100%;
                                    height: auto;
                                    border-radius: 8px;
                                    box-shadow: 0 4px 8px var(--shadow-dark);
                                    transition: transform 0.3s ease;
                                    border: 3px solid var(--text-primary);
                                }

                                .product-main-image:hover {
                                    transform: scale(1.02);
                                    border-color: var(--accent-primary);
                                }

                                .product-details {
                                    background: var(--text-primary);
                                    padding: 20px;
                                    border-radius: 8px;
                                    box-shadow: 0 4px 8px var(--shadow-dark);
                                    margin-bottom: 20px;
                                    transition: all 0.3s ease;
                                }

                                .product-details:hover {
                                    box-shadow: 0 8px 16px var(--shadow-dark);
                                }

                                .product-details h2 {
                                    font-size: 1.5rem;
                                    margin-bottom: 10px;
                                    color: var(--main-h1-color);
                                    border-bottom: 2px solid var(--accent-primary);
                                    padding-bottom: 10px;
                                }

                                .product-details p {
                                    margin-bottom: 10px;
                                    font-size: 1rem;
                                }

                                .product-details p strong {
                                    color: var(--main-h1-color);
                                }

                                .product-details blockquote {
                                    border-left: 4px solid var(--accent-primary);
                                    padding-left: 15px;
                                    margin: 10px 0;
                                    font-style: italic;
                                    color: var(--main-p-color);
                                }

                                .product-gallery {
                                    display: flex;
                                    flex-direction: column;
                                    margin-bottom: 20px;
                                }

                                .product-gallery h2 {
                                    font-size: 1.5rem;
                                    margin-bottom: 10px;
                                    color: var(--main-h1-color);
                                    border-bottom: 2px solid var(--accent-secondary);
                                    padding-bottom: 10px;
                                }

                                .gallery-images {
                                    display: grid;
                                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                                    gap: 15px;
                                }

                                .gallery-images img {
                                    width: 200px;
                                    height: 200px;
                                    object-fit: cover;
                                    border-radius: 8px;
                                    box-shadow: 0 4px 8px var(--shadow-dark);
                                    transition: all 0.3s ease;
                                    border: 2px solid transparent;
                                    cursor: pointer;
                                }

                                .gallery-images img:hover {
                                    transform: scale(1.05);
                                    box-shadow: 0 8px 16px var(--shadow-dark);
                                    border-color: var(--accent-primary);
                                }

                                .reviews-section {
                                    background: var(--text-primary);
                                    padding: 20px;
                                    border-radius: 8px;
                                    box-shadow: 0 4px 8px var(--shadow-dark);
                                    margin-bottom: 20px;
                                    transition: all 0.3s ease;
                                }

                                .reviews-section:hover {
                                    box-shadow: 0 8px 16px var(--shadow-dark);
                                }

                                .reviews-section h2 {
                                    font-size: 1.5rem;
                                    margin-bottom: 10px;
                                    color: var(--main-h1-color);
                                    border-bottom: 2px solid var(--accent-secondary);
                                    padding-bottom: 10px;
                                }

                                .review {
                                    border-bottom: 1px solid #eee;
                                    padding: 10px 0;
                                    transition: all 0.3s ease;
                                }

                                .review:hover {
                                    background-color: rgba(231, 76, 60, 0.05);
                                }

                                .review:last-child {
                                    border-bottom: none;
                                }

                                .review strong {
                                    color: var(--accent-secondary);
                                }

                                .add-review-form {
                                    background: var(--text-primary);
                                    padding: 20px;
                                    border-radius: 8px;
                                    box-shadow: 0 4px 8px var(--shadow-dark);
                                    transition: all 0.3s ease;
                                }

                                .add-review-form:hover {
                                    box-shadow: 0 8px 16px var(--shadow-dark);
                                }

                                .add-review-form h3 {
                                    font-size: 1.2rem;
                                    margin-bottom: 10px;
                                    color: var(--main-h1-color);
                                    border-bottom: 2px solid var(--accent-primary);
                                    padding-bottom: 10px;
                                }

                                .add-review-form textarea {
                                    width: 100%;
                                    padding: 10px;
                                    border: 1px solid #ddd;
                                    border-radius: 8px;
                                    margin-bottom: 10px;
                                    resize: vertical;
                                    transition: all 0.3s ease;
                                    font-size: 1rem;
                                }

                                .add-review-form textarea:focus {
                                    border-color: var(--accent-primary);
                                    outline: none;
                                    box-shadow: 0 0 0 2px rgba(255, 167, 0, 0.2);
                                }

                                .add-review-form button {
                                    background: var(--accent-primary);
                                    color: var(--text-primary);
                                    border: none;
                                    padding: 10px 20px;
                                    border-radius: 8px;
                                    cursor: pointer;
                                    font-size: 1rem;
                                    transition: all 0.3s ease;
                                    font-weight: bold;
                                }

                                .add-review-form button:hover {
                                    background: var(--accent-secondary);
                                }

                                .add-review-form button:active {
                                    transform: scale(0.98);
                                }

                                .manufacturer-logo {
                                    width: 50px;
                                    height: 50px;
                                    border-radius: 50%;
                                    object-fit: cover;
                                    margin-left: 10px;
                                    vertical-align: middle;
                                }

                                .reviews-count {
                                    color: var(--accent-primary);
                                    cursor: pointer;
                                    font-weight: bold;
                                }

                                .back-button {
                                    background: var(--button-bg);
                                    color: var(--text-primary);
                                    border: none;
                                    padding: 10px 20px;
                                    border-radius: 8px;
                                    cursor: pointer;
                                    font-size: 1rem;
                                    transition: all 0.3s ease;
                                    margin-bottom: 10px;
                                }

                                .back-button:hover {
                                    background: var(--accent-primary);
                                }
                            </style>
                        </head>
                        <body>
                            <header class="header">
        <div class="left-blocks">
            <div class="header-block menu-block">
                <button class="menu-button" onclick="toggleMenu()">
                    <span class="hamburger"></span>
                    <span class="hamburger"></span>
                    <span class="hamburger"></span>
                </button>
                <nav class="menu-dropdown">
                    <div class="menu-header">
                        <span>Навигация</span>
                        <button class="close-menu" onclick="closeMenu()">✕</button>
                    </div>
                    <div class="menu-divider"></div>
                    <div class="header-block location-block">
                        <div class="select">
                            <div class="select-button" onclick="toggleSelect(this)">Moscow</div>
                            <ul class="select-dropdown"></ul>
                        </div>
                    </div>
                    <div class="menu-divider"></div>
                    <ul></ul>
                    <div id="dynamic-menu-account-block" class="menu-account-block"></div>
                </nav>
            </div>
            <div class="header-block logo-block">
                <a href="/" class="logo-link">
                    <img src="../img/icons/logo.png" alt="Site Logo" class="logo" style="border-radius: 50%; background: #fff;">
                </a>
                <div class="title-gradient-container">
                    <h1 class="site-title">Инвест</h1>
                    <div class="gradient-block"></div>
                </div>
            </div>
            <div class="header-block location-block">
                <div class="select">
                    <div class="select-button" onclick="toggleSelect(this)">Moscow</div>
                    <ul class="select-dropdown"></ul>
                </div>
            </div>
        </div>
        <div class="header-block page-title-block" onclick="togglePageMenu(this)">Главная
            <nav class="page-title-dropdown">
                <div class="menu-header">
                    <span>Навигация</span>
                    <button class="close-page-menu" onclick="closePageMenu(this, event)">✕</button>
                </div>
                <div class="menu-divider"></div>
                <ul></ul>
            </nav>
        </div>
        <div class="header-block logo-title-block">
            <div class="header-block logo-block">
                <a href="/" class="logo-link">
                    <img src="../img/icons/logo.png" alt="Site Logo" class="logo">
                </a>
                <div class="title-gradient-container">
                    <h1 class="site-title">Инвест</h1>
                    <div class="gradient-block"></div>
                </div>
            </div>
            <span class="separator">></span>
            <div class="header-block page-title-block" onclick="togglePageMenu(this)">Главная
                <nav class="page-title-dropdown">
                    <div class="menu-header">
                        <span>Навигация</span>
                        <button class="close-page-menu" onclick="closePageMenu(this, event)">✕</button>
                    </div>
                    <div class="menu-divider"></div>
                    <ul></ul>
                </nav>
            </div>
        </div>
        <div class="right-blocks">
            <div class="header-block contact-block">
                <div class="contact-item">
                    <img src="../img/icons/envelope.png" alt="Email Icon" class="contact-icon">
                    <span>info@example.com</span>
                </div>
                <div class="contact-item">
                    <img src="../img/icons/phone.png" alt="Phone Icon" class="contact-icon">
                    <span>+7 (123) 456-78-90</span>
                </div>
            </div>
            <div class="header-block contact-button-block">
                <button class="contact-button"></button>
            </div>
            <nav class="contact-menu">
                <div class="menu-header">
                    <span>Контакты</span>
                    <button class="close-contact" onclick="closeContactMenu()">✕</button>
                </div>
                <div class="menu-divider"></div>
                <div class="contact-block">
                    <div class="contact-item">
                        <img src="../img/icons/envelope.png" alt="Email Icon" class="contact-icon">
                        <span>info@example.com</span>
                    </div>
                    <div class="contact-item">
                        <img src="../img/icons/phone.png" alt="Phone Icon" class="contact-icon">
                        <span>+7 (123) 456-78-90</span>
                    </div>
                </div>
            </nav>
            <div class="header-block" id="dynamic-account-block">
                <button class="guest-button">Гость</button>
            </div>
        </div>
        <nav class="profile-settings-dropdown">
            <div class="menu-header">
                <span>Профиль</span>
                <button class="profile-settings-close" onclick="closeSettingsMenu()">✕</button>
            </div>
            <div class="menu-divider"></div>
            <div class="profile-settings-actions">
                <button class="profile-settings-action" onclick="openProfile()">
                    <img src="../img/icons/user.png" alt="Settings Icon" class="action-icon"> Профиль
                </button>
                <div class="menu-divider"></div>
                <button class="profile-settings-action" onclick="logout()">
                    <img src="../img/icons/exit.png" alt="Logout Icon" class="action-icon"> Выйти
                </button>
            </div>
        </nav>
        <div class="bottom-right-navigation-buttons-div">
            <button id="scroll-top-button">
                <img src="../img/icons/playUp.png" alt="flag">
            </button>
            <div class="wrapper mobile-adaptive">
                <input type="checkbox" class="toggle-checkbox" />
                <div class="fab"></div>
                <div class="fac">
                    <a href="#" onclick="openProfile()"><img src="../img/icons/envelope.png"></a>
                    <a href="#" onclick="openProfile()"><img src="../img/icons/user.png"></a>
                    <a href="#" onclick="logout()"><img src="../img/icons/exit.png"></a>
                </div>
            </div>
        </div>
    </header>

                            <main class="main-cabinet" style="padding-top: 100px; padding-bottom: 100px;">
                                <div class="container">
                                    <div class="product-header">
                                        <button onclick="goBack()" class="back-button">Назад</button>
                                        <h1 class="product-title">${product.name}</h1>
                                    </div>

                                    <div class="product-details">
                                        <h2>Описание</h2>
                                        <blockquote>${product.miscellaneous || 'Нет описания'}</blockquote>
                                        <h2>Характеристики</h2>
                                        <p><strong>Цена:</strong> ${product.price.toFixed(2)} ₽</p>
                                        <p><strong>Прошлая цена:</strong> ${product.lastPrice ? product.lastPrice.toFixed(2) : 'Не указана'} ₽</p>
                                        <p><strong>Производитель:</strong>
                                        ${mainImage ? `<img src="data:image/jpeg;base64,${mainImage}" alt="${product.firmName}" class="manufacturer-logo">` : ''}
                                        ${product.firmName || 'Не указан'}
                                        </p>
                                        <p><strong>Продано:</strong> ${product.soldQuantity}</p>
                                        <p><strong>Год выпуска:</strong> ${product.manufacturingYear || 'Не указан'}</p>
                                    </div>

                                    <div class="product-gallery">
                                        <h2>Фотографии (${photoImages.length})</h2>
                                        <div class="gallery-images">
                                            ${photoImages.map(p => `<img src="data:image/jpeg;base64,${p.image}" alt="Дополнительное фото" onclick="openImage(this)">`).join('')}
                                        </div>
                                    </div>

                                    <div class="reviews-section">
                                        <h2>Отзывы <span class="reviews-count" onclick="scrollToReviews()">(${reviews.length})</span></h2>
                                        <div id="reviews">
                                            ${reviews.length > 0
                                                ? reviews.map(review => `<div class="review"><strong>${review.username}:</strong> ${review.comment}</div>`).join('')
                                                : '<p>Нет отзывов.</p>'}
                                        </div>
                                    </div>

                                    <div class="add-review-form">
                                        <h3>Оставить отзыв</h3>
                                        <form id="add-review-form">
                                            <textarea id="comment" rows="4" placeholder="Ваш отзыв" required></textarea><br>
                                            <button type="submit">Отправить</button>
                                        </form>
                                    </div>
                                </div>
																<article class="auth-modal__container">
                <div class="auth-modal__block">
                    <section class="auth-modal__block-item">
                        <h2 class="auth-modal__block-item-title">У вас уже есть аккаунт?</h2>
                        <button class="auth-modal__block-item-btn auth-modal__signin-btn">Войти</button>
                    </section>
                    <section class="auth-modal__block-item">
                        <h2 class="auth-modal__block-item-title">У вас нет аккаунта?</h2>
                        <button class="auth-modal__block-item-btn auth-modal__signup-btn">Зарегистрироваться</button>
                    </section>
                </div>
                <div class="auth-modal__form-box">
                    <form id="loginForm" class="auth-modal__form auth-modal__form-signin">
                        <h3 class="auth-modal__form-title">Вход</h3>
                        <div class="auth-modal__div-input">
                            <p>
                                <input type="email" id="loginEmail" class="auth-modal__form-input" placeholder="Логин" required>
                            </p>
                            <p>
                                <input type="password" id="loginPassword" class="auth-modal__form-input" placeholder="Пароль" required>
                            </p>
                        </div>
                        <div class="auth-modal__div-btn">
                            <p>
                                <button type="submit" class="auth-modal__form-btn">Войти</button>
                            </p>
                            <p>
                                <a href="#" class="auth-modal__form-forgot" onclick="alert('Функция восстановления пароля пока не реализована'); return false;">Восстановить пароль</a>
                            </p>
                        </div>
                    </form>
                    <form id="registerForm" class="auth-modal__form auth-modal__form-signup">
                        <h3 class="auth-modal__form-title">Регистрация</h3>
                        <div class="auth-modal__div-input">
                            <p>
                                <input type="text" id="registerUsername" class="auth-modal__form-input" placeholder="Имя" required>
                            </p>
                            <p>
                                <input type="email" id="registerEmail" class="auth-modal__form-input" placeholder="Email" required>
                            </p>
                            <p>
                                <input type="password" id="registerPassword" class="auth-modal__form-input" placeholder="Пароль" required>
                            </p>
                            <p>
                                <input type="password" id="confirmPassword" class="auth-modal__form-input" placeholder="Подтвердите пароль" required>
                            </p>
                            <p>
                                <select id="role" class="auth-modal__form-input">
                                    <option value="user">Пользователь</option>
                                    <option value="admin">Администратор</option>
                                </select>
                            </p>
                        </div>
                        <div class="auth-modal__div-btn">
                            <p>
                                <button type="submit" class="auth-modal__form-btn auth-modal__form-btn-signup">Зарегистрироваться</button>
                            </p>
                        </div>
                    </form>
                </div>
            </article>
                            </main>

                            <footer class="footer">
        <div class="footer-separator">
            <hr>
            <h3 id="footer-start-h3">Информация</h3>
        </div>
        <div class="waves">
            <div class="wave" id="wave1"></div>
            <div class="wave" id="wave2"></div>
            <div class="wave" id="wave3"></div>
            <div class="wave" id="wave4"></div>
        </div>
        <div class="footer-wrapper" id="separator-start">
            <div class="footer-content">
                <section class="footer-section about">
                    <h2 class="section-title">О компании</h2>
                    <div class="footer-divider"></div>
                    <p class="text-about">
                        Мы создаем инновационные решения для вашего бизнеса, обеспечивая высокое качество и надежность.
                    </p>
                    <p class="text-about">
                        Наша команда стремится к совершенству, предлагая индивидуальный подход к каждому клиенту.
                    </p>
                    <div class="social-links">
                        <a href="#" class="social-btn" aria-label="Facebook">
                            <img src="../img/icons/facebook.png" alt="" class="icon">
                        </a>
                        <a href="#" class="social-btn" aria-label="Dribbble">
                            <img src="../img/icons/dribbble.png" alt="" class="icon">
                        </a>
                        <a href="#" class="social-btn" aria-label="Twitter">
                            <img src="../img/icons/twitter.png" alt="" class="icon">
                        </a>
                        <a href="#" class="social-btn" aria-label="Google Plus">
                            <img src="../img/icons/google-plus.png" alt="" class="icon">
                        </a>
                    </div>
                </section>
                <section class="footer-section search">
                    <h2 class="section-title">Поиск</h2>
                    <div class="footer-divider"></div>
                    <form class="search-form" role="search">
                        <input type="search" id="searchInput" class="search-input" placeholder="Поиск..." aria-label="Поиск по сайту">
                        <button class="search-btn"><img src="../img/icons/search.png" alt="Поиск" class="search-icon"><p>Поиск</p></button>
                    </form>
                    <ul class="contact-list">
                        <li class="contact-item">
                            <img src="../img/icons/home.png" alt="" class="contact-icon">
                            <span>г. Ижевск, ул. Молодёжная, 109</span>
                            <div class="contact-divider"></div>
                        </li>
                        <li class="contact-item">
                            <img src="../img/icons/envelope.png" alt="" class="contact-icon">
                            <span><a href="mailto:info@example.com">info@example.com</a></span>
                            <div class="contact-divider"></div>
                        </li>
                        <li class="contact-item">
                            <img src="../img/icons/phone.png" alt="" class="contact-icon">
                            <span><a href="tel:+79511957833">+7 951 195 78 33</a></span>
                            <div class="contact-divider"></div>
                        </li>
                        <li class="contact-item">
                            <img src="../img/icons/phone.png" alt="" class="contact-icon">
                            <span><a href="tel:+79505205501">+7 950 520 55 01</a></span>
                            <div class="contact-divider"></div>
                        </li>
                    </ul>
                </section>
                <section class="footer-section hours">
                    <h2 class="section-title">Часы работы</h2>
                    <div class="footer-divider"></div>
                    <table class="hours-table">
                        <tbody>
                            <tr>
                                <td>Понедельник</td>
                                <td>8:00 - 21:00</td>
                            </tr>
                            <tr>
                                <td>Вторник</td>
                                <td>8:00 - 21:00</td>
                            </tr>
                            <tr>
                                <td>Среда</td>
                                <td>8:00 - 21:00</td>
                            </tr>
                            <tr>
                                <td>Четверг</td>
                                <td>8:00 - 21:00</td>
                            </tr>
                            <tr>
                                <td>Пятница</td>
                                <td>8:00 - 01:00</td>
                            </tr>
                            <tr class="weekend">
                                <td>Суббота - Воскресенье</td>
                                <td>Выходной</td>
                            </tr>
                        </tbody>
                    </table>
                    <ul class="hours-list">
                        <li>Понедельник: <span>8:00 - 21:00</span></li>
                        <li>Вторник: <span>8:00 - 21:00</span></li>
                        <li>Среда: <span>8:00 - 21:00</span></li>
                        <li>Четверг: <span>8:00 - 21:00</span></li>
                        <li>Пятница: <span>8:00 - 01:00</span></li>
                        <li class="weekend">Суббота - Воскресенье: <span>Выходной</span></li>
                    </ul>
                </section>
            </div>
        </div>
        <div class="copyright">
            © 2025 Все права защищены: <a href="mailto:invest@gmail.com" class="copyright-link">invest@gmail.com</a>
        </div>
    </footer>

                            <script src="https://cdnjs.cloudflare.com/ajax/libs/noUiSlider/14.6.3/nouislider.min.js"></script>
                            <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
                            <script src="../js/header.js"></script>
                            <script src="../js/footer.js"></script>
                            <script src="../js/auth.js"></script>

                            <script>
                                function goBack() {
                                    window.history.back();
                                }

                                function openImage(img) {
                                    window.open(img.src, '_blank');
                                }

                                function scrollToReviews() {
                                    document.getElementById('reviews').scrollIntoView({ behavior: 'smooth' });
                                }

                                document.getElementById('add-review-form').addEventListener('submit', async function(e) {
                                    e.preventDefault();

                                    // Проверка авторизации
                                    const authResponse = await fetch('/auth/status', {
                                        method: 'GET',
                                        credentials: 'include'
                                    });
                                    const authResult = await authResponse.json();

                                    if (!authResult.isAuthenticated) {
                                        alert('Требуется авторизация для отправки отзыва');
                                        window.location.href = '/login';
                                        return;
                                    }

                                    const comment = document.getElementById('comment').value.trim();
                                    if (!comment) return alert('Введите текст отзыва');

                                    const response = await fetch('/api/reviews', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        credentials: 'include',
                                        body: JSON.stringify({
                                            productId: ${productId},
                                            comment: comment
                                        })
                                    });
                                    const result = await response.json();
                                    if (result.error) {
                                        alert(result.error);
                                    } else {
                                        location.reload();
                                    }
                                });
                            </script>
                        </body>
                        </html>
                    `;
                    res.send(html);
                });
            });
        });
    });
}

module.exports = { setupProductRoutes };
