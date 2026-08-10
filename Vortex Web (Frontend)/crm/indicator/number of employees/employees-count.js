/* ============================================
   ИНДИКАТОР: КОЛИЧЕСТВО СОТРУДНИКОВ - JavaScript
   Папка: /crm/indicator/employees_count/
   ============================================ */

(function () {
    'use strict';

    // ============================================
    // ПРОВЕРКА API_BASE_URL (запасной вариант)
    // ============================================
    if (typeof API_BASE_URL === 'undefined') {
        window.API_BASE_URL = 'http://127.0.0.1:5000';
        console.warn('[EmployeesCount] ⚠️ API_BASE_URL не найден, установлен вручную:', API_BASE_URL);
    }

    const CONFIG = {
        API_URL: '/api/employees/list',
        REFRESH_INTERVAL: 30000,
        STORAGE_KEYS: ['employees_count', 'users_count', 'staff_count'],
        DEFAULT_COUNT: 0
    };

    // ---- Запрос к серверу ----
    async function fetchEmployeesCount() {
        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                console.warn('[EmployeesCount] ❌ Токен не найден');
                return getFallbackCount();
            }

            const url = API_BASE_URL + CONFIG.API_URL;
            console.log('[EmployeesCount] 📡 Запрос к:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('[EmployeesCount] ❌ Ошибка HTTP:', response.status);
                return getFallbackCount();
            }

            const data = await response.json();
            console.log('[EmployeesCount] 📦 Ответ:', data);

            if (data.status === 'ok' && Array.isArray(data.employees)) {
                // ✅ ВОТ ЗДЕСЬ ВСТАВЛЯЕМ МИНУС 1
                let count = data.employees.length;
                count = Math.max(0, count - 1); // Минус 1, но не меньше 0
                console.log('[EmployeesCount] 👥 Количество (минус 1):', count);
                return count;
            } else {
                console.warn('[EmployeesCount] ⚠️ Неожиданный ответ:', data);
                return getFallbackCount();
            }
        } catch (error) {
            console.error('[EmployeesCount] ❌ Ошибка:', error);
            return getFallbackCount();
        }
    }

    // ---- Запасное значение ----
    function getFallbackCount() {
        for (const key of CONFIG.STORAGE_KEYS) {
            const value = localStorage.getItem(key);
            if (value !== null) {
                const num = parseInt(value, 10);
                if (!isNaN(num) && num >= 0) return num;
            }
        }
        return CONFIG.DEFAULT_COUNT;
    }

    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    // ---- Обработчик клика ----
    function handleEmployeesClick(event) {
        const button = event.currentTarget;
        const targetHref = button.getAttribute('data-href') || '/employees';
        button.classList.add('clicked');
        setTimeout(() => { window.location.href = targetHref; }, 150);
    }

    // ---- Управление GIF ----
    function setupGifControl() {
        const buttons = document.querySelectorAll('.crm-indicator.employees-count-button');

        buttons.forEach(button => {
            const img = button.querySelector('.employees-icon img');
            if (!img || img.dataset.gifControlReady) return;

            img.dataset.gifControlReady = 'true';

            const originalSrc = img.src;
            if (!originalSrc.toLowerCase().includes('.gif')) return;

            const tempImg = new Image();
            tempImg.src = originalSrc;

            tempImg.onload = function () {
                const canvas = document.createElement('canvas');
                canvas.width = tempImg.naturalWidth;
                canvas.height = tempImg.naturalHeight;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(tempImg, 0, 0);

                const staticSrc = canvas.toDataURL();
                img.src = staticSrc;

                button.addEventListener('mouseenter', function () {
                    img.src = originalSrc + '?t=' + Date.now();
                });

                button.addEventListener('mouseleave', function () {
                    img.src = staticSrc;
                });
            };
        });
    }

    // ---- Обновление индикатора ----
    function updateIndicator(count) {
        const buttons = document.querySelectorAll('.crm-indicator.employees-count-button');
        buttons.forEach(button => {
            const countNum = button.querySelector('.count-number');
            if (countNum) {
                countNum.textContent = formatNumber(count);
                console.log('[EmployeesCount] Обновлено значение:', count);
            }
            button.setAttribute('data-count', count);

            button.removeEventListener('click', handleEmployeesClick);
            button.addEventListener('click', handleEmployeesClick);
        });
        setupGifControl();
    }

    // ---- Обновление с сервера ----
    async function updateFromServer() {
        const count = await fetchEmployeesCount();
        updateIndicator(count);
        localStorage.setItem('employees_count', count.toString());
    }

    // ---- Инициализация ----
    function init() {
        const buttons = document.querySelectorAll('.crm-indicator.employees-count-button');
        if (buttons.length === 0) {
            console.warn('[EmployeesCount] Кнопки не найдены');
            return;
        }

        console.log('[EmployeesCount] Инициализация...');

        const fallback = getFallbackCount();
        updateIndicator(fallback);

        updateFromServer();

        if (CONFIG.REFRESH_INTERVAL > 0) {
            setInterval(updateFromServer, CONFIG.REFRESH_INTERVAL);
        }
    }

    // ---- Глобальный API ----
    window.EmployeesCountIndicator = {
        init: init,
        refresh: updateFromServer,
        getCount: fetchEmployeesCount,
        formatNumber: formatNumber,
        setConfig: (cfg) => Object.assign(CONFIG, cfg)
    };

    // ---- Запуск ----
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();