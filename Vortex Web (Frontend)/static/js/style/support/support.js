/**
 * SUPPORT PAGE — VORTEX
 * Путь: static/js/style/support/support.js
 */

document.addEventListener("DOMContentLoaded", function () {
    // ===== БУРГЕР-МЕНЮ =====
    const burgerToggle = document.getElementById("burgerToggle");
    const sidePanel = document.getElementById("sidePanel");

    if (burgerToggle && sidePanel) {
        burgerToggle.addEventListener("click", function (event) {
            event.stopPropagation();
            burgerToggle.classList.toggle("active");
            sidePanel.classList.toggle("active");
        });

        document.addEventListener("click", function (event) {
            if (!sidePanel.contains(event.target) && !burgerToggle.contains(event.target)) {
                burgerToggle.classList.remove("active");
                sidePanel.classList.remove("active");
            }
        });
    }

    // ===== ОБРАБОТЧИК ДЛЯ КНОПКИ "ВХОД" =====
    const loginLink = document.querySelector('.nav-link');
    if (loginLink) {
        loginLink.addEventListener('click', function (e) {
            e.preventDefault();
            window.location.href = '/#auth';
        });
    }

    // ===== ПРОВЕРКА ЯКОРЯ #auth =====
    if (window.location.hash === '#auth') {
        setTimeout(() => {
            const authForm = document.getElementById('auth-form');
            if (authForm) {
                authForm.classList.add('active');
                authForm.style.display = 'block';
            }
        }, 300);
    }

    console.log('🛠️ Страница поддержки VORTEX загружена');
});

// ===== ОБРАБОТКА ФОРМЫ =====
function handleFormSubmit(event) {
    event.preventDefault();

    const form = document.getElementById('supportForm');
    const successMessage = document.getElementById('formSuccess');

    // Скрываем форму
    form.style.display = 'none';

    // Показываем сообщение об успехе
    successMessage.style.display = 'block';

    // Прокручиваем к сообщению
    successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });

    return false;
}