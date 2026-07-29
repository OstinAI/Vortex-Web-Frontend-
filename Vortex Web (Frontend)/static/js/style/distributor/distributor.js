/**
 * DISTRIBUTOR PAGE — VORTEX
 * Путь: static/js/style/distributor/distributor.js
 */

document.addEventListener("DOMContentLoaded", function () {
    // ===== ОБРАБОТЧИК ДЛЯ КНОПКИ "ВХОД" =====
    const loginLink = document.querySelector('.nav-link');
    if (loginLink) {
        loginLink.addEventListener('click', function (e) {
            e.preventDefault();
            window.location.href = '/#auth';
        });
    }

    // ===== КНОПКИ "СТАТЬ ПАРТНЁРОМ" =====
    const partnerButtons = document.querySelectorAll('.open-auth-btn, .cta-btn');
    partnerButtons.forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            window.location.href = '/registration';
        });
    });

    // ===== АНИМАЦИЯ ПОЯВЛЕНИЯ КАРТОЧЕК =====
    const benefitCards = document.querySelectorAll('.benefit-card');
    benefitCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.5s ease-out';

        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 150 + (index * 100));
    });

    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.5s ease-out';

        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 200 + (index * 80));
    });

    const stepItems = document.querySelectorAll('.step-item');
    stepItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-20px)';
        item.style.transition = 'all 0.5s ease-out';

        setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'translateX(0)';
        }, 250 + (index * 100));
    });

    console.log('🤝 Страница дистрибьютора VORTEX загружена');
});