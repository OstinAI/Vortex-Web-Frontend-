/**
 * ============================================
 * УПРАВЛЕНИЕ ШАПКОЙ
 * ============================================
 */

(function () {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHeader);
    } else {
        initHeader();
    }

    function initHeader() {
        console.log('Шапка загружена и полностью прозрачна');

        // Здесь можно добавить любую другую логику для шапки
        // Например, изменение стилей при скролле
        const header = document.querySelector('.glass-header');

        if (header) {
            // Добавляем класс при скролле (опционально)
            window.addEventListener('scroll', function () {
                if (window.scrollY > 50) {
                    header.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                }
            });
        }
    }

})();