/* ============================================
   КНОПКА НАЗАД (BACK) - JavaScript
   Папка: /crm/indicator/back/
   ============================================ */

(function () {
    'use strict';

    // Функция для перехода назад
    function goBack(event) {
        const button = event.currentTarget;

        // Добавляем эффект нажатия
        button.classList.add('clicked');

        // Небольшая задержка для визуального эффекта
        setTimeout(function () {
            // Возвращаемся на предыдущую страницу
            if (document.referrer && document.referrer !== window.location.href) {
                window.history.back();
            } else {
                // Если нет истории - переходим на главную
                window.location.href = '/';
            }
        }, 150);
    }

    // Инициализация всех кнопок "Назад"
    function initBackButtons() {
        const backButtons = document.querySelectorAll('.crm-indicator.back-button');

        backButtons.forEach(function (button) {
            // Удаляем старые обработчики, чтобы избежать дублирования
            button.removeEventListener('click', goBack);
            button.addEventListener('click', goBack);
        });

        if (backButtons.length > 0) {
            console.log('🔙 Кнопки "Назад" инициализированы:', backButtons.length, 'шт.');
        }
    }

    // Ждём загрузку DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBackButtons);
    } else {
        initBackButtons();
    }

    // Дополнительно: обновляем при динамической загрузке
    if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(function (mutations) {
            let needInit = false;
            mutations.forEach(function (mutation) {
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(function (node) {
                        if (node.nodeType === 1) {
                            if (node.matches && node.matches('.crm-indicator.back-button')) {
                                needInit = true;
                            }
                            if (node.querySelectorAll) {
                                const nested = node.querySelectorAll('.crm-indicator.back-button');
                                if (nested.length > 0) needInit = true;
                            }
                        }
                    });
                }
            });
            if (needInit) {
                setTimeout(initBackButtons, 100);
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Экспортируем функцию для ручного вызова
    window.BackButton = {
        init: initBackButtons,
        goBack: goBack
    };

})();