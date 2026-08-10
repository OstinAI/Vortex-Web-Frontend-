/* ============================================
   УНИВЕРСАЛЬНЫЕ КНОПКИ VORTEX - JavaScript
   Папка: /styles/button/buttons/
   ============================================ */

(function () {
    'use strict';

    // ---- Инициализация кнопок ----
    function initButtons() {
        const buttons = document.querySelectorAll('.vortex-btn');
        console.log(`🟢 Инициализация кнопок: найдено ${buttons.length} шт.`);

        buttons.forEach((btn, index) => {
            // Добавляем элементы если их нет
            if (!btn.querySelector('.btn-shine')) {
                const shine = document.createElement('span');
                shine.className = 'btn-shine';
                btn.appendChild(shine);
            }
            if (!btn.querySelector('.btn-wave')) {
                const wave = document.createElement('span');
                wave.className = 'btn-wave';
                btn.appendChild(wave);
            }
            if (!btn.querySelector('.btn-ripple')) {
                const ripple = document.createElement('span');
                ripple.className = 'btn-ripple';
                btn.appendChild(ripple);
            }

            // Удаляем старый обработчик и добавляем новый
            btn.removeEventListener('click', handleBtnClick);
            btn.addEventListener('click', handleBtnClick);

            // Добавляем класс для анимации если его нет
            if (!btn.classList.contains('animated')) {
                btn.classList.add('animated');
            }

            // Принудительно запускаем анимацию появления
            btn.style.animation = 'none';
            btn.offsetHeight; // триггер reflow
            btn.style.animation = `btnAppear 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`;
            btn.style.animationDelay = `${index * 0.1}s`;
        });

        console.log(`✅ Кнопки инициализированы: ${buttons.length} шт.`);
    }

    // ---- Обработчик клика ----
    function handleBtnClick(e) {
        e.preventDefault();
        e.stopPropagation();

        const btn = e.currentTarget;
        const href = btn.getAttribute('data-href');
        const action = btn.getAttribute('data-action');
        const text = btn.querySelector('.btn-text')?.textContent || 'кнопка';

        console.log(`🔘 Клик: ${text} → ${href || action}`);

        // Эффект клика
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            btn.style.transform = 'scale(1)';
        }, 150);

        // Эффект рипл
        const ripple = btn.querySelector('.btn-ripple');
        if (ripple) {
            ripple.style.animation = 'none';
            ripple.offsetHeight;
            ripple.style.animation = 'rippleExpand 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards';
            setTimeout(() => {
                ripple.style.animation = '';
            }, 900);
        }

        // Переход или действие
        if (href) {
            setTimeout(() => {
                window.location.href = href;
            }, 200);
        } else if (action) {
            if (typeof window[action] === 'function') {
                setTimeout(() => {
                    window[action]();
                }, 200);
            } else {
                console.log(`[Button] Action: ${action}`);
            }
        }
    }

    // ---- Создание кнопки через JS ----
    function createButton(options = {}) {
        const {
            text = 'Кнопка',
            icon = null,
            iconPosition = 'left',
            shape = 'rounded',
            href = null,
            action = null,
            className = '',
            glass = true,
            withWave = true,
            withRipple = true
        } = options;

        const btn = document.createElement('button');
        btn.className = `vortex-btn animated shape-${shape}`;

        if (glass) btn.classList.add('glass');
        if (className) btn.className += ` ${className}`;

        if (href) btn.setAttribute('data-href', href);
        if (action) btn.setAttribute('data-action', action);

        // Содержимое
        const content = document.createElement('span');
        content.className = 'indicator-content';

        // Текст
        if (text) {
            const textEl = document.createElement('span');
            textEl.className = 'btn-text';
            textEl.textContent = text;
            content.appendChild(textEl);
        }

        btn.appendChild(content);

        // Блик
        const shine = document.createElement('span');
        shine.className = 'btn-shine';
        btn.appendChild(shine);

        // Волна
        if (withWave) {
            const wave = document.createElement('span');
            wave.className = 'btn-wave';
            btn.appendChild(wave);
        }

        // Рилп
        if (withRipple) {
            const ripple = document.createElement('span');
            ripple.className = 'btn-ripple';
            btn.appendChild(ripple);
        }

        return btn;
    }

    // ---- Глобальный API ----
    window.VortexButton = {
        init: initButtons,
        create: createButton,
    };

    // ---- Автозапуск при загрузке ----
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            // Даем время на создание динамических кнопок
            setTimeout(initButtons, 100);
        });
    } else {
        setTimeout(initButtons, 100);
    }

    // ---- Дополнительно: MutationObserver для отслеживания новых кнопок ----
    if (window.MutationObserver) {
        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.type === 'childList') {
                    const addedNodes = mutation.addedNodes;
                    let hasNewButtons = false;

                    addedNodes.forEach(function (node) {
                        if (node.nodeType === 1) { // Element
                            if (node.classList && node.classList.contains('vortex-btn')) {
                                hasNewButtons = true;
                            }
                            // Проверяем вложенные элементы
                            if (node.querySelectorAll) {
                                const nestedBtns = node.querySelectorAll('.vortex-btn');
                                if (nestedBtns.length > 0) hasNewButtons = true;
                            }
                        }
                    });

                    if (hasNewButtons) {
                        console.log('🔄 Обнаружены новые кнопки, переинициализация...');
                        setTimeout(initButtons, 50);
                    }
                }
            });
        });

        // Начинаем наблюдение за всем документом
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

})();