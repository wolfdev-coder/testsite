document.addEventListener('DOMContentLoaded', () => {
	const footerSections = document.querySelectorAll('.footer-section');
	const footerContent = document.querySelector('.footer-content');
	const appearDelays = [0, 200, 400]; // Задержки для появления: about → search → hours

	const observerOptions = {
			root: null, // Viewport как root
			rootMargin: '0px',
			threshold: 0.1 // Срабатывает, когда 10% секции видно
	};

	// Функция для проверки видимости элемента
	const isElementInViewport = (el) => {
			if (!el) return false;
			const rect = el.getBoundingClientRect();
			return (
					rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
					rect.bottom > 0 &&
					rect.left < (window.innerWidth || document.documentElement.clientWidth) &&
					rect.right > 0
			);
	};

	// Проверяем начальную видимость футера
	const isInitiallyVisible = footerContent && isElementInViewport(footerContent);
	let hasAnimated = isInitiallyVisible; // Флаг для отслеживания анимации

	// Устанавливаем начальное состояние
	if (isInitiallyVisible) {
			// Если футер виден при загрузке, запускаем анимацию появления
			footerSections.forEach((section, index) => {
					setTimeout(() => {
							section.classList.add('visible');
							section.classList.remove('exiting');
							section.style.animation = ''; // Восстанавливаем анимацию
							section.style.opacity = '';
							section.style.transform = '';
					}, appearDelays[index]);
			});
	} else {
			// Если футер не виден, устанавливаем исходное состояние без анимации
			footerSections.forEach((section) => {
					section.classList.add('exiting');
					section.classList.remove('visible');
					section.style.animation = 'none';
					section.style.opacity = '0';
					section.style.transform = 'translateY(30px) scale(0.95)';
			});
	}

	const observer = new IntersectionObserver((entries) => {
			entries.forEach(entry => {
					if (entry.target.classList.contains('footer-content')) {
							if (entry.isIntersecting && !hasAnimated) {
									// Появление секций поочередно (about → search → hours)
									footerSections.forEach((section, index) => {
											setTimeout(() => {
													section.classList.add('visible');
													section.classList.remove('exiting');
													section.style.animation = ''; // Восстанавливаем анимацию
													section.style.opacity = '';
													section.style.transform = '';
											}, appearDelays[index]);
									});
									hasAnimated = true; // Отмечаем, что анимация проиграна
							} else if (!entry.isIntersecting) {
									// Мгновенный возврат в исходное состояние без анимации
									footerSections.forEach((section) => {
											section.classList.add('exiting');
											section.classList.remove('visible');
											section.style.animation = 'none'; // Отключаем анимацию
											section.style.opacity = '0';
											section.style.transform = 'translateY(30px) scale(0.95)';
									});
									hasAnimated = false; // Сбрасываем флаг для повторной анимации
							}
					}
			});
	}, observerOptions);

	// Наблюдаем за контейнером .footer-content
	if (footerContent) {
			observer.observe(footerContent);
	}
});