// js/header.js
var isAuthenticated = false;

// Массив городов
const cities = [
		'Ижевск',
    'Москва',
    'Санкт-Петербург',
    'Казань',
    'Екатеринбург',
    'Новосибирск',
    'Красноярск',
    'Нижний Новгород'
];

// Массив пунктов навигации
const navItems = [
    { iconSrc: "img/icons/home.png", altText: "Home Icon", text: "Главная", href: "/index.html" },
		{ iconSrc: "img/icons/user.png", altText: "Home Icon", text: "Профиль", href: "/cabinet.html" }
];

// Функция для генерации списка городов
function populateCityLists() {
    const dropdowns = document.querySelectorAll('.select-dropdown');
    dropdowns.forEach(dropdown => {
        dropdown.innerHTML = ''; // Очищаем существующий список
        cities.forEach(city => {
            const li = document.createElement('li');
            li.textContent = city;
            li.setAttribute('onclick', `selectCity(this, '${city}')`);
            dropdown.appendChild(li);
        });
    });
}

// Функция для генерации списков навигации
function populateNavLists() {
    const navLists = document.querySelectorAll('.menu-dropdown ul:not(.select-dropdown), .page-title-dropdown ul:not(.select-dropdown)');
    navLists.forEach(ul => {
        ul.innerHTML = ''; // Очищаем существующий список
        navItems.forEach(item => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = item.href;
            a.className = 'nav-link';
            const img = document.createElement('img');
            img.src = item.iconSrc;
            img.alt = item.altText;
            img.className = 'nav-icon';
            const span = document.createElement('span');
            span.textContent = item.text;
            a.appendChild(img);
            a.appendChild(span);
            li.appendChild(a);
            ul.appendChild(li);
        });
    });
}

// Функция для рендеринга блока аккаунта
function renderDynamicBlock() {
    const headerBlock = document.getElementById('dynamic-account-block');
    const menuBlock = document.getElementById('dynamic-menu-account-block');
    if (isAuthenticated) {
        const accountContent = `
            <div class="account-block">
                <button class="profile-photo-block" onclick="toggleProfilePhotoBlock(event)">
                    <img src="img/icons/user.png" alt="Profile Photo">
                </button>
                <div class="account-info">
                    <span class="username">${sessionStorage.getItem('username') || 'User'}</span>
                    <span class="user-email">${sessionStorage.getItem('userEmail') || ''}</span>
                    <span class="user-region">ru</span>
                </div>
            </div>
        `;
        headerBlock.innerHTML = accountContent;
        menuBlock.innerHTML = accountContent.replace('account-block', 'menu-account-block');
    } else {
        const guestContent = `
            <div class="guest-block">
                <div class="account-info">
                    <span class="username">Гость</span>
                </div>
                <div class="menu-divider" id="guest-menu-divider"></div>
                <div class="guest-buttons">
                    <button class="guest-button" onclick="openAuthModal('signin')">Sign In</button>
                    <button class="guest-button" onclick="openAuthModal('signup')">Sign Up</button>
                </div>
            </div>
        `;
        headerBlock.innerHTML = guestContent;
        menuBlock.innerHTML = guestContent.replace('guest-block', '').replace('align-items: flex-end', 'align-items: center');
    }
}

// Открытие модального окна авторизации
function openAuthModal(type) {
    const authContainer = document.querySelector('.auth-modal__container');
    const formBox = document.querySelector('.auth-modal__form-box');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (!authContainer) {
        console.error('auth-modal__container not found');
        return;
    }
    authContainer.classList.add('auth-modal__visible');
    formBox.classList.toggle('auth-modal__active', type === 'signup');
    loginForm.classList.toggle('auth-modal__active', type === 'signin');
    registerForm.classList.toggle('auth-modal__active', type === 'signup');
}

function selectCity(element, city) {
    const buttons = document.querySelectorAll('.select-button');
    buttons.forEach(button => {
        button.textContent = city;
    });
    
    // Закрыть все выпадающие списки после выбора
    const dropdowns = document.querySelectorAll('.select-dropdown');
    dropdowns.forEach(dropdown => {
        dropdown.classList.remove('active');
    });
}

function toggleCityDropdown(button) {
    const dropdown = button.nextElementSibling;
    dropdown.classList.toggle('active');
}

function logout() {
    fetch('/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(response => response.json())
        .then(data => {
            sessionStorage.removeItem('userEmail');
            sessionStorage.removeItem('userRole');
            sessionStorage.removeItem('username');
            isAuthenticated = false;
            renderDynamicBlock();
            closeSettingsMenu();
            alert(data.message);

            // Перенаправляем на главную страницу
            window.location.href = '/';
        })
        .catch(error => {
            console.error('Ошибка при выходе:', error);
            alert('Ошибка при выходе: ' + error.message);
        });
}

function toggleHeaderBlock() {
    const headerBlock = document.querySelector('.header-block');
    headerBlock.classList.toggle('active');
    
    // Закрыть другие меню при переключении блока заголовка
    document.querySelector('.page-title-dropdown')?.classList.remove('active');
    document.querySelector('.profile-settings-dropdown')?.classList.remove('active');
}

function toggleProfilePhotoBlock(event) {
    event.stopPropagation();
    const settingsMenu = document.querySelector('.profile-settings-dropdown');
    const headerBlock = document.querySelector('.header-block');
    const pageTitleDropdown = document.querySelector('.page-title-dropdown');
    
    settingsMenu.classList.toggle('active');
    headerBlock?.classList.remove('active');
    pageTitleDropdown?.classList.remove('active');
}

function togglePageTitleBlock(element, event) {
    event.stopPropagation();
    const dropdown = element.querySelector('.page-title-dropdown');
    const headerBlock = document.querySelector('.header-block');
    const settingsMenu = document.querySelector('.profile-settings-dropdown');
    
    dropdown.classList.toggle('active');
    headerBlock?.classList.remove('active');
    settingsMenu?.classList.remove('active');
}

// Открытие/закрытие меню контактов
function toggleContactMenu() {
  const contactMenu = document.querySelector('.contact-menu');
  if (!contactMenu) {
    console.error('contact-menu not found');
    return;
  }

  // Если меню открыто — начинаем анимацию закрытия
  if (contactMenu.classList.contains('active')) {
    contactMenu.classList.remove('active'); // Убираем active, запуская анимацию

    // Ждём завершения анимации перед любыми действиями
    function onTransitionEnd(e) {
      if (e.propertyName === 'transform' || e.propertyName === 'opacity') {
        contactMenu.removeEventListener('transitionend', onTransitionEnd);
        console.log("Меню полностью скрыто");
      }
    }

    contactMenu.addEventListener('transitionend', onTransitionEnd, { once: true });

  } else {
    // Закрываем другие меню
    document.querySelector('.menu-dropdown')?.classList.remove('active');
    document.querySelector('.profile-settings-dropdown')?.classList.remove('active');
    document.querySelector('.page-title-dropdown')?.classList.remove('active');

    // Открываем меню контактов
    contactMenu.classList.add('active');
  }
}

function closeContactMenu() {
    const contactMenu = document.querySelector('.contact-menu');
    if (!contactMenu) {
        console.error('contact-menu not found');
        return;
    }
    console.log('closeContactMenu called');
    contactMenu.classList.remove('active');
}

// Инициализация при загрузке страницы
window.onload = function() {
    // Проверка статуса авторизации через сервер
    fetch('/auth/status')
        .then(response => response.json())
        .then(data => {
            isAuthenticated = data.isAuthenticated;
            if (isAuthenticated) {
                sessionStorage.setItem('userEmail', data.user.email);
                sessionStorage.setItem('username', data.user.username);
                sessionStorage.setItem('userRole', data.user.role);
            }
            renderDynamicBlock();
        })
        .catch(error => {
            console.error('Ошибка проверки статуса авторизации:', error);
        });

    populateCityLists();
    populateNavLists();
    
    // Добавить обработчики кликов для кнопок выбора города
    document.querySelectorAll('.select-button').forEach(button => {
        button.textContent = 'Ижевск';
        button.onclick = function() {
            toggleCityDropdown(this);
        };
    });
    
    // Закрыть выпадающие списки при клике вне
    document.addEventListener('click', function(event) {
        if (!event.target.matches('.select-button') && 
            !event.target.matches('.profile-photo-block') && 
            !event.target.matches('.menu-button') && 
            !event.target.matches('.contact-button') && 
            !event.target.closest('.contact-menu')) {
            document.querySelectorAll('.select-dropdown, .profile-settings-dropdown, .menu-dropdown, .page-title-dropdown, .contact-menu').forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        }
    });

    // Повторно привязать обработчики для блоков заголовков страниц
    document.querySelectorAll('.page-title-block').forEach(block => {
        block.onclick = function(event) {
            togglePageMenu(this);
        };
    });
    
    // Инициализация и обработчик для contact-button
    const contactButton = document.querySelector('.contact-button');
			if (contactButton) {
				contactButton.addEventListener('click', (e) => {
					e.preventDefault();
					toggleContactMenu(); // Открытие/закрытие меню
				});
			} else {
				console.error('Кнопка .contact-button не найдена!');
			}
};

window.addEventListener('scroll', function() {
    const header = document.querySelector('header.header');
    const scrollPosition = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    const scrollPercent = Math.min(scrollPosition / (documentHeight - windowHeight), 1);
    header.style.setProperty('--yellow-width', `${scrollPercent * 100}%`);
});

document.querySelector('.wrapper input[type="checkbox"]').addEventListener('change', function () {
    const button = document.querySelector('.fab-button');
    if (this.checked) {
        button.style.display = 'none';
    } else {
        button.style.display = '';
    }
});

// Scroll-to-top button functionality
const scrollTopButton = document.getElementById('scroll-top-button');
let lastScrollY = window.scrollY;

scrollTopButton?.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const isAtBottom = currentScrollY + windowHeight >= documentHeight - 50;

    if (isAtBottom || (currentScrollY < lastScrollY && currentScrollY > 100)) {
        scrollTopButton?.classList.add('visible');
    } else {
        scrollTopButton?.classList.remove('visible');
    }

    lastScrollY = currentScrollY;
});

function toggleSettingsMenu() {
    const settingsMenu = document.querySelector('.profile-settings-dropdown');
    settingsMenu.classList.toggle('active');
    
    if (isMobile()) {
        closeMenu();
    }
}

function closeSettingsMenu() {
    const settingsMenu = document.querySelector('.profile-settings-dropdown');
    settingsMenu.classList.remove('active');
}

function toggleMenu() {
    const menu = document.querySelector('.menu-dropdown');
    menu.classList.toggle('active');
}

function closeMenu() {
    const menu = document.querySelector('.menu-dropdown');
    menu.classList.remove('active');
}

function togglePageMenu(element) {
    if (!element) return;
    event.stopPropagation();
    const dropdown = element.querySelector('.page-title-dropdown');
    if (!dropdown) return;
    
    document.querySelectorAll('.menu-dropdown, .profile-settings-dropdown').forEach(menu => {
        menu.classList.remove('active');
    });
    
    dropdown.classList.toggle('active');
}

function closePageMenu(button, event) {
    if (event) {
        event.stopPropagation();
    }
    const block = button?.closest('.page-title-block');
    if (!block) return;
    const dropdown = block.querySelector('.page-title-dropdown');
    if (dropdown?.classList.contains('active')) {
        dropdown.classList.remove('active');
    }
}

// Проверка мобильного устройства
function isMobile() {
    return window.matchMedia("(max-width: 600px)").matches;
}