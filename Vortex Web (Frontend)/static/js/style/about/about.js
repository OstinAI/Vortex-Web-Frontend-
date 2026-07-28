/**
 * ABOUT PAGE — VORTEX
 * Путь: static/js/style/about/about.js
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

    // ===== АНИМАЦИЯ ПОЯВЛЕНИЯ КАРТОЧЕК =====
    const moduleCards = document.querySelectorAll('.module-card');
    moduleCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.5s ease-out';

        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 150 + (index * 100));
    });

    const featureItems = document.querySelectorAll('.feature-item');
    featureItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-20px)';
        item.style.transition = 'all 0.5s ease-out';

        setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'translateX(0)';
        }, 200 + (index * 80));
    });

    const statItems = document.querySelectorAll('.stat-item');
    statItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'scale(0.9)';
        item.style.transition = 'all 0.5s ease-out';

        setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'scale(1)';
        }, 300 + (index * 100));
    });

    console.log('ℹ️ Страница "О системе" VORTEX загружена');
});