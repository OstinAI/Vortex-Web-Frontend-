/**
 * CONTACTS PAGE — VORTEX
 * Путь: static/js/style/contacts/contacts.js
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

    // ===== АНИМАЦИЯ ПОЯВЛЕНИЯ КАРТОЧЕК =====
    const contactItems = document.querySelectorAll('.contact-item');
    contactItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        item.style.transition = 'all 0.4s ease-out';

        setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
        }, 100 + (index * 80));
    });

    // ===== ПЛАВНОЕ ПОЯВЛЕНИЕ КАРТЫ =====
    const mapContainer = document.querySelector('.map-container');
    if (mapContainer) {
        mapContainer.style.opacity = '0';
        mapContainer.style.transition = 'opacity 0.8s ease-out';

        setTimeout(() => {
            mapContainer.style.opacity = '1';
        }, 500);
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

    console.log('📞 Страница контактов VORTEX загружена');
});