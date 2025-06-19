document.addEventListener('DOMContentLoaded', () => {
    // Select DOM elements
    const authContainer = document.querySelector('.auth-modal__container');
    const guestButton = document.querySelector('.guest-button');
    const signInBtn = document.querySelector('.auth-modal__signin-btn');
    const signUpBtn = document.querySelector('.auth-modal__signup-btn');
    const formBox = document.querySelector('.auth-modal__form-box');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginAgreement = document.getElementById('loginAgreement');
    const registerAgreement = document.getElementById('registerAgreement');
    const loginSubmitBtn = loginForm?.querySelector('button[type="submit"]');
    const registerSubmitBtn = registerForm?.querySelector('button[type="submit"]');

    // Variable to store current user state
    let currentUser = null;

    // Enable/disable submit buttons based on checkbox state
    if (loginAgreement && loginSubmitBtn) {
        loginAgreement.addEventListener('change', () => {
            loginSubmitBtn.disabled = !loginAgreement.checked;
        });
    }

    if (registerAgreement && registerSubmitBtn) {
        registerAgreement.addEventListener('change', () => {
            registerSubmitBtn.disabled = !registerAgreement.checked;
        });
    }

    // Open modal on guest button click
    if (guestButton) {
        guestButton.addEventListener('click', () => {
            openAuthModal('signin');
        });
    }

    // Switch to sign-in form
    if (signInBtn) {
        signInBtn.addEventListener('click', () => {
            if (formBox) formBox.classList.remove('auth-modal__active');
            if (loginForm) loginForm.classList.add('auth-modal__active');
            if (registerForm) registerForm.classList.remove('auth-modal__active');
        });
    }

    // Switch to sign-up form
    if (signUpBtn) {
        signUpBtn.addEventListener('click', () => {
            if (formBox) formBox.classList.add('auth-modal__active');
            if (loginForm) loginForm.classList.remove('auth-modal__active');
            if (registerForm) registerForm.classList.add('auth-modal__active');
        });
    }

    // Close modal on outside click
    document.addEventListener('click', (e) => {
        if (
            authContainer &&
            authContainer.classList.contains('auth-modal__visible') &&
            !e.target.closest('.auth-modal__block') &&
            !e.target.closest('.auth-modal__form-box') &&
            !e.target.closest('.guest-button') &&
            !e.target.matches('.guest-button[onclick*="openAuthModal"]')
        ) {
            closeAuthModal();
        }
    });

    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!loginAgreement.checked) {
                alert('Пожалуйста, согласитесь с Политикой конфиденциальности и Пользовательским соглашением');
                return;
            }
            const emailInput = document.getElementById('loginEmail');
            const passwordInput = document.getElementById('loginPassword');
            if (!emailInput || !passwordInput) return;

            const email = emailInput.value;
            const password = passwordInput.value;

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                    credentials: 'include'
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error);

                alert('Авторизация успешна');
                closeAuthModal();
                updateUIForLoggedInUser(data.user);
                refreshPageContent();

                // Redirect for admin
                if (data.user.role === 'admin') {
                    window.location.href = '/admin.html';
                }
            } catch (error) {
                console.error('Ошибка авторизации:', error);
                alert('Ошибка авторизации: ' + error.message);
            }
        });
    }

    // Handle register form submission
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!registerAgreement.checked) {
                alert('Пожалуйста, согласитесь с Политикой конфиденциальности и Пользовательским соглашением');
                return;
            }
            const usernameInput = document.getElementById('registerUsername');
            const emailInput = document.getElementById('registerEmail');
            const passwordInput = document.getElementById('registerPassword');
            const confirmPasswordInput = document.getElementById('confirmPassword');
            const roleInput = document.getElementById('role');
            if (!usernameInput || !emailInput || !passwordInput || !confirmPasswordInput || !roleInput) return;

            const username = usernameInput.value;
            const email = emailInput.value;
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            const role = roleInput.value;

            if (password !== confirmPassword) {
                alert('Пароли не совпадают');
                return;
            }

            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password, confirmPassword, role }),
                    credentials: 'include'
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error);

                alert('Регистрация успешна');
                closeAuthModal();
                updateUIForLoggedInUser(data.user);
                refreshPageContent();

                // Redirect for admin
                if (data.user.role === 'admin') {
                    window.location.href = '/admin.html';
                }
            } catch (error) {
                console.error('Ошибка регистрации:', error);
                alert('Ошибка регистрации: ' + error.message);
            }
        });
    }

    // Update UI for logged-in user
    function updateUIForLoggedInUser(user) {
        if (
            currentUser &&
            currentUser.username === user.username &&
            currentUser.email === user.email &&
            currentUser.role === user.role
        ) {
            return;
        }

        currentUser = user;
        const accountBlock = document.getElementById('dynamic-account-block');
        if (accountBlock) {
            sessionStorage.setItem('username', user.username);
            sessionStorage.setItem('userEmail', user.email);
            sessionStorage.setItem('userRole', user.role);
            accountBlock.innerHTML = `<span>Привет, ${user.username}</span> <button onclick="logout()">Выйти</button>`;
            accountBlock.classList.remove('fade-in');
            void accountBlock.offsetWidth;
            accountBlock.classList.add('fade-in');
        }

        window.isAuthenticated = true;
        if (typeof window.renderDynamicBlock === 'function') {
            window.renderDynamicBlock();
        }

        if (user.role === 'admin' && window.location.pathname !== '/admin.html') {
            window.location.href = '/admin.html';
        }
    }

    // Update UI for logged-out user
    function updateUIForLoggedOutUser() {
        if (!currentUser) return;

        currentUser = null;
        const accountBlock = document.getElementById('dynamic-account-block');
        if (accountBlock) {
            accountBlock.innerHTML = '<button class="guest-button" onclick="openAuthModal(\'signin\')">Войти</button>';
            accountBlock.classList.remove('fade-in');
            void accountBlock.offsetWidth;
            accountBlock.classList.add('fade-in');
        }

        sessionStorage.removeItem('username');
        sessionStorage.removeItem('userEmail');
        sessionStorage.removeItem('userRole');
        window.isAuthenticated = false;
        if (typeof window.renderDynamicBlock === 'function') {
            window.renderDynamicBlock();
        }
    }

    // Refresh page content
    function refreshPageContent() {
        if (typeof loadProducts === 'function') {
            loadProducts();
        } else {
            console.log('Функция loadProducts не определена');
        }
    }

    // Check auth status on load
    fetch('/auth/status', { credentials: 'include' })
        .then(response => response.json())
        .then(data => {
            if (data.isAuthenticated) {
                updateUIForLoggedInUser(data.user);
                refreshPageContent();
            } else {
                updateUIForLoggedOutUser();
            }
        })
        .catch(error => console.error('Ошибка проверки статуса:', error));

    // Periodic auth status check
    let authCheckActive = false;

    function checkAuthStatus() {
        if (authCheckActive) return;
        authCheckActive = true;
        fetch('/auth/status', { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                if (data.isAuthenticated) {
                    updateUIForLoggedInUser(data.user);
                } else {
                    updateUIForLoggedOutUser();
                }
                refreshPageContent();
            })
            .catch(err => console.error('Ошибка при проверке статуса:', err))
            .finally(() => authCheckActive = false);
    }

    setInterval(checkAuthStatus, 30000);

    // Initial auth status check
    checkAuthStatus();

    // Handle logout
    window.logout = function () {
        fetch('/logout', { method: 'POST', credentials: 'include' })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                updateUIForLoggedOutUser();
                refreshPageContent();
                window.location.href = '/';
            })
            .catch(error => alert('Ошибка: ' + error.message));
    };

    // Open authentication modal
    window.openAuthModal = function (type) {
        if (authContainer) {
            authContainer.classList.add('auth-modal__visible');
        }
        if (formBox) {
            formBox.classList.toggle('auth-modal__active', type === 'signup');
        }
        if (loginForm) {
            loginForm.classList.toggle('auth-modal__active', type === 'signin');
        }
        if (registerForm) {
            registerForm.classList.toggle('auth-modal__active', type === 'signup');
        }
    };

    // Close authentication modal
    function closeAuthModal() {
        if (authContainer) {
            authContainer.classList.remove('auth-modal__visible');
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Контент для страниц
    const privacyPolicyContent = `
        <html>
        <head>
            <title>Политика конфиденциальности</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
                h1, h2, h3 { color: #333; }
                p, li { max-width: 800px; margin-bottom: 15px; }
                ul { margin-left: 20px; }
                .container { max-width: 900px; margin: 0 auto; }
                button { padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer; }
                button:hover { background: #0056b3; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Политика конфиденциальности</h1>
                <p>Дата вступления в силу: 19 июня 2025 года</p>
                <p>Настоящая Политика конфиденциальности (далее — «Политика») разработана в соответствии с действующим законодательством Российской Федерации, включая Федеральный закон № 152-ФЗ «О персональных данных» от 27 июля 2006 года, и регулирует порядок сбора, обработки, хранения, использования и защиты персональных данных пользователей (далее — «Пользователи»), взаимодействующих с сервисом (далее — «Сервис»), расположенным по адресу https://oooinvest.com.</p>

                <h2>1. Общие положения</h2>
                <p>1.1. Сервис уважает право Пользователей на конфиденциальность и обязуется защищать их персональные данные в соответствии с применимым законодательством.</p>
                <p>1.2. Политика распространяется на все данные, которые Сервис собирает в процессе использования Пользователями сайта, мобильных приложений, форм регистрации, авторизации и иных функций Сервиса.</p>
                <p>1.3. Использование Сервиса означает безоговорочное согласие Пользователя с настоящей Политикой и указанными в ней условиями обработки персональных данных.</p>
                <p>1.4. В случае несогласия с условиями Политики Пользователь обязан немедленно прекратить использование Сервиса.</p>

                <h2>2. Сбор персональных данных</h2>
                <p>2.1. Сервис собирает следующие категории персональных данных:</p>
                <ul>
                    <li>Имя, фамилия, отчество (при наличии);</li>
                    <li>Адрес электронной почты;</li>
                    <li>Пароль (в зашифрованном виде);</li>
                    <li>Роль пользователя (например, «Пользователь» или «Администратор»);</li>
                    <li>IP-адрес, данные браузера, геолокация (при наличии согласия);</li>
                    <li>Данные cookies и аналогичных технологий;</li>
                    <li>Иные данные, предоставленные Пользователем добровольно через формы на сайте.</li>
                </ul>
                <p>2.2. Персональные данные собираются в следующих случаях:</p>
                <ul>
                    <li>При регистрации Пользователя на Сервисе;</li>
                    <li>При заполнении форм авторизации;</li>
                    <li>При взаимодействии с функционалом Сервиса (например, отправка запросов, комментариев);</li>
                    <li>Автоматически при использовании сайта (например, через cookies).</li>
                </ul>
                <p>2.3. Сервис не собирает персональные данные несовершеннолетних без согласия их законных представителей.</p>

                <h2>3. Цели обработки персональных данных</h2>
                <p>3.1. Персональные данные обрабатываются в следующих целях:</p>
                <ul>
                    <li>Идентификация Пользователя при регистрации и авторизации;</li>
                    <li>Предоставление доступа к функционалу Сервиса;</li>
                    <li>Обеспечение безопасности учетных записей;</li>
                    <li>Улучшение качества работы Сервиса;</li>
                    <li>Анализ пользовательского поведения для персонализации контента;</li>
                    <li>Отправка информационных и рекламных сообщений (при наличии согласия);</li>
                    <li>Выполнение обязательств перед Пользователями в соответствии с законодательством.</li>
                </ul>
                <p>3.2. Сервис не передает персональные данные третьим лицам, за исключением случаев, предусмотренных законодательством или настоящей Политикой.</p>

                <h2>4. Передача данных третьим лицам</h2>
                <p>4.1. Сервис может передавать персональные данные следующим категориям получателей:</p>
                <ul>
                    <li>Партнерам, предоставляющим услуги хостинга, аналитики или технической поддержки;</li>
                    <li>Правоохранительным органам в случае официального запроса;</li>
                    <li>Иным лицам при наличии явного согласия Пользователя.</li>
                </ul>
                <p>4.2. Все третьи лица, получающие доступ к данным, обязаны соблюдать конфиденциальность и использовать данные исключительно в рамках договорных обязательств.</p>

                <h2>5. Хранение и защита данных</h2>
                <p>5.1. Персональные данные хранятся на защищенных серверах, расположенных на территории Российской Федерации, в соответствии с требованиями законодательства.</p>
                <p>5.2. Сервис использует следующие меры защиты данных:</p>
                <ul>
                    <li>Шифрование данных при передаче (SSL/TLS);</li>
                    <li>Ограничение доступа к данным только для уполномоченных сотрудников;</li>
                    <li>Регулярное обновление систем безопасности;</li>
                    <li>Мониторинг и аудит доступа к данным.</li>
                </ul>
                <p>5.3. Срок хранения данных определяется в соответствии с законодательством и целями обработки, но не превышает 5 лет с момента последнего взаимодействия Пользователя с Сервисом.</p>

                <h2>6. Права Пользователей</h2>
                <p>6.1. Пользователь имеет право:</p>
                <ul>
                    <li>Запрашивать информацию о собранных данных;</li>
                    <li>Требовать исправления или удаления данных;</li>
                    <li>Ограничивать обработку данных;</li>
                    <li>Отозвать согласие на обработку данных;</li>
                    <li>Подавать жалобы в надзорные органы.</li>
                </ul>
                <p>6.2. Для реализации прав Пользователь может обратиться в службу поддержки Сервиса по адресу oooinvest.com.</p>

                <h2>7. Изменения в Политике</h2>
                <p>7.1. Сервис оставляет за собой право вносить изменения в настоящую Политику в любое время. Новая версия Политики вступает в силу с момента ее публикации на сайте.</p>
                <p>7.2. Пользователь обязан самостоятельно отслеживать изменения в Политике.</p>

                <h2>8. Контактная информация</h2>
                <p>8.1. По всем вопросам, связанным с настоящей Политикой, Пользователь может обратиться по адресу: oooinvest.com.</p>
                <p>8.2. Сервис обязуется рассмотреть запросы Пользователей в течение 30 календарных дней.</p>

                <p>Мы благодарим вас за доверие к нашему Сервису и стремимся обеспечить максимальную защиту ваших данных!</p>
                <button onclick="window.close()">Закрыть</button>
            </div>
        </body>
        </html>
    `;

    const userAgreementContent = `
        <html>
        <head>
            <title>Пользовательское соглашение</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
                h1, h2, h3 { color: #333; }
                p, li { max-width: 800px; margin-bottom: 15px; }
                ul { margin-left: 20px; }
                .container { max-width: 900px; margin: 0 auto; }
                button { padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer; }
                button:hover { background: #0056b3; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Пользовательское соглашение</h1>
                <p>Дата вступления в силу: 19 июня 2025 года</p>
                <p>Настоящее Пользовательское соглашение (далее — «Соглашение») регулирует отношения между оператором Сервиса (далее — «Оператор»), расположенного на сайте https://oooinvest.com, и физическим или юридическим лицом (далее — «Пользователь»), использующим функционал Сервиса.</p>

                <h2>1. Общие положения</h2>
                <p>1.1. Настоящее Соглашение является публичной офертой в соответствии со статьей 437 Гражданского кодекса Российской Федерации.</p>
                <p>1.2. Использование Сервиса, включая регистрацию, авторизацию и взаимодействие с любыми функциями, означает полное и безоговорочное принятие Пользователем условий настоящего Соглашения.</p>
                <p>1.3. Оператор оставляет за собой право вносить изменения в Соглашение без предварительного уведомления Пользователя.</p>
                <p>1.4. Продолжение использования Сервиса после внесения изменений в Соглашение означает согласие Пользователя с такими изменениями.</p>

                <h2>2. Условия использования Сервиса</h2>
                <p>2.1. Пользователь обязуется:</p>
                <ul>
                    <li>Предоставлять достоверные данные при регистрации;</li>
                    <li>Не использовать Сервис в целях, противоречащих законодательству;</li>
                    <li>Не передавать учетные данные третьим лицам;</li>
                    <li>Не осуществлять действия, которые могут нарушить работу Сервиса;</li>
                    <li>Соблюдать авторские права и права интеллектуальной собственности Оператора.</li>
                </ul>
                <p>2.2. Сервис предоставляет Пользователю доступ к следующим функциям:</p>
                <ul>
                    <li>Создание и управление учетной записью;</li>
                    <li>Доступ к контенту и сервисам;</li>
                    <li>Возможность взаимодействия с другими Пользователями (при наличии такой функции);</li>
                    <li>Получение информационных материалов;</li>
                </ul>

                <h2>3. Права и обязанности Оператора</h2>
                <p>3.1. Оператор обязуется:</p>
                <ul>
                    <li>Обеспечивать доступность Сервиса в пределах технических возможностей;</li>
                    <li>Защищать персональные данные Пользователя в соответствии с Политикой конфиденциальности;</li>
                    <li>Предоставлять техническую поддержку по запросу Пользователя.</li>
                </ul>
                <p>3.2. Оператор имеет право:</p>
                <ul>
                    <li>Приостанавливать доступ к Сервису в случае нарушения Пользователем условий Соглашения;</li>
                    <li>Вносить изменения в функционал Сервиса;</li>
                    <li>Вводить ограничения на использование отдельных функций;</li>
                    <li>Удалять учетные записи Пользователей, нарушающих Соглашение.</li>
                </ul>

                <h2>4. Ответственность сторон</h2>
                <p>4.1. Пользователь несет ответственность за:</p>
                <ul>
                    <li>Достоверность предоставленных данных;</li>
                    <li>Соблюдение законодательства при использовании Сервиса;</li>
                    <li>Любые действия, совершенные с использованием его учетной записи.</li>
                </ul>
                <p>4.2. Оператор не несет ответственности за:</p>
                <ul>
                    <li>Временную недоступность Сервиса по техническим причинам;</li>
                    <li>Убытки, понесенные Пользователем в результате использования Сервиса;</li>
                    <li>Действия третьих лиц, получивших доступ к учетной записи Пользователя.</li>
                </ul>

                <h2>5. Интеллектуальная собственность</h2>
                <p>5.1. Весь контент Сервиса, включая текст, изображения, логотипы, программное обеспечение, является собственностью Оператора или его партнеров и защищен авторским правом.</p>
                <p>5.2. Пользователь не имеет права копировать, распространять или модифицировать контент без письменного согласия Оператора.</p>

                <h2>6. Прекращение действия Соглашения</h2>
                <p>6.1. Соглашение действует до момента удаления Пользователем своей учетной записи или прекращения работы Сервиса.</p>
                <p>6.2. Пользователь может удалить учетную запись, обратившись в службу поддержки по адресу oooinvest.com.</p>
                <p>6.3. Оператор имеет право прекратить действие Соглашения в случае нарушения Пользователем его условий.</p>

                <h2>7. Заключительные положения</h2>
                <p>7.1. Настоящее Соглашение регулируется законодательством Российской Федерации.</p>
                <p>7.2. Все споры, связанные с Соглашением, разрешаются в судебном порядке по месту нахождения Оператора.</p>
                <p>7.3. По всем вопросам, связанным с настоящим Соглашением, Пользователь может обратиться по адресу: oooinvest.com.</p>

                <p>Мы ценим ваш выбор нашего Сервиса и стремимся предоставить вам наилучший опыт!</p>
                <button onclick="window.close()">Закрыть</button>
            </div>
        </body>
        </html>
    `;

    // Функция для открытия новой вкладки с контентом
    const openDynamicPage = (content) => {
        const newWindow = window.open('');
        newWindow.document.write(content);
        newWindow.document.close();
    };

    // Обработчики для ссылок
    const privacyLinks = document.querySelectorAll('a[href="#"][target="_blank"]:first-of-type');
    const agreementLinks = document.querySelectorAll('a[href="#"][target="_blank"]:nth-of-type(2)');

    privacyLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            openDynamicPage(privacyPolicyContent);
        });
    });

    agreementLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            openDynamicPage(userAgreementContent);
        });
    });
});