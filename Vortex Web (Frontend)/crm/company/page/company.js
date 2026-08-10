/**
 * Страница компании
 * Скрипт для управления видеофоном и дополнительной логикой
 */

// ============================================
// ГЛОБАЛЬНАЯ ФУНКЦИЯ ОБНОВЛЕНИЯ КОЛИЧЕСТВА СОТРУДНИКОВ
// ============================================
window.updateEmployeeCount = async function () {
    console.log('[Company] 🔄 updateEmployeeCount() вызвана');

    try {
        const token = localStorage.getItem('vortex_token');
        if (!token) {
            console.warn('[Company] ❌ Токен не найден');
            return;
        }

        if (typeof API_BASE_URL === 'undefined') {
            console.error('[Company] ❌ API_BASE_URL не определён! Подключите config.js');
            return;
        }

        const url = API_BASE_URL + '/api/employees/list';
        console.log('[Company] 📡 URL:', url);

        const response = await fetch(url, {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('[Company] ❌ Ошибка HTTP:', response.status);
            return;
        }

        const data = await response.json();
        console.log('[Company] 📦 Ответ:', data);

        if (data.status === 'ok' && Array.isArray(data.employees)) {
            const count = data.employees.length;
            console.log('[Company] 👥 Количество:', count);

            const countElements = document.querySelectorAll('.employees-count-button .count-number');
            countElements.forEach(el => {
                const formatted = count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
                el.textContent = formatted;
            });

            localStorage.setItem('employees_count', count.toString());

            if (window.EmployeesCountIndicator && typeof window.EmployeesCountIndicator.refresh === 'function') {
                window.EmployeesCountIndicator.refresh(count);
            }
        }
    } catch (error) {
        console.error('[Company] ❌ Ошибка:', error);
    }
};

// ============================================
// ОБРАБОТЧИК КНОПКИ "СТАТЬ ДИСТРИБЬЮТОРОМ"
// ============================================
window.onDistributor = function () {
    console.log('[Company] 📋 Стать дистрибьютором...');

    // Открываем модальное окно дистрибьютора
    if (typeof window.openDistributorModal === 'function') {
        window.openDistributorModal();
    } else {
        console.warn('[Company] ⚠️ Модуль дистрибьютора не загружен, подгружаем...');

        // ПРАВИЛЬНЫЙ ПУТЬ К CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = '/crm/company/window/modal/distributor/distributor.css';
        document.head.appendChild(cssLink);

        // ПРАВИЛЬНЫЙ ПУТЬ К JS
        const script = document.createElement('script');
        script.src = '/crm/company/window/modal/distributor/distributor.js';
        script.onload = function () {
            setTimeout(() => {
                if (typeof window.openDistributorModal === 'function') {
                    window.openDistributorModal();
                } else {
                    alert('Ошибка загрузки модуля дистрибьютора');
                }
            }, 200);
        };
        script.onerror = function () {
            alert('Не удалось загрузить модуль дистрибьютора');
        };
        document.body.appendChild(script);
    }
};

document.addEventListener('DOMContentLoaded', function () {
    console.log('✅ Страница компании загружена');

    // Проверка API_BASE_URL
    if (typeof API_BASE_URL === 'undefined') {
        console.error('❌ API_BASE_URL не определён! Подключите config.js');
    } else {
        console.log('✅ API_BASE_URL =', API_BASE_URL);
    }

    // Видео
    const video = document.querySelector('.background-video');
    if (video) {
        video.addEventListener('loadeddata', function () {
            this.play().catch(() => { });
        });
        setTimeout(() => { if (video.paused) video.play().catch(() => { }); }, 1000);
    }

    // Индикаторы - переопределяем клик для дистрибьютора
    document.querySelectorAll('.crm-indicator').forEach(indicator => {
        indicator.addEventListener('click', function (e) {
            const action = this.dataset.action;
            const href = this.dataset.href;

            // Если это кнопка дистрибьютора - открываем модальное окно
            if (action === 'distributor') {
                e.preventDefault();
                e.stopPropagation();
                window.onDistributor();
                return;
            }

            // Остальные кнопки работают как обычно
            if (action === 'back') {
                window.history.back();
            } else if (href) {
                window.location.href = href;
            }
        });
    });

    // Анимация появления
    const overlay = document.querySelector('.content-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 1s ease';
        setTimeout(() => { overlay.style.opacity = '1'; }, 300);
    }

    // Обновление индикатора
    setTimeout(window.updateEmployeeCount, 1000);
    setInterval(window.updateEmployeeCount, 30000);

    console.log('🚀 Страница компании готова');
});