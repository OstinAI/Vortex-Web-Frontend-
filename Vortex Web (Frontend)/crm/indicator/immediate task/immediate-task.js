/* ============================================
   ИНДИКАТОР: БЛИЖАЙШАЯ ЗАДАЧА (IMMEDIATE TASK)
   Папка: /crm/indicator/immediate task/
   ============================================ */

(function () {
    'use strict';

    if (typeof API_BASE_URL === 'undefined') {
        window.API_BASE_URL = 'http://127.0.0.1:5000';
        console.warn('[ImmediateTask] ⚠️ API_BASE_URL не найден, установлен вручную:', API_BASE_URL);
    }

    const CONFIG = {
        API_URL: '/api/tasks/',
        REFRESH_INTERVAL: 30000, // 30 секунд
        DEFAULT_TEXT: 'НЕТ ЗАДАЧ'
    };

    // ---- Получение ближайшей задачи ----
    async function fetchImmediateTask() {
        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                console.warn('[ImmediateTask] ❌ Токен не найден');
                return null;
            }

            const url = API_BASE_URL + CONFIG.API_URL + '?limit=300';
            console.log('[ImmediateTask] 📡 Запрос к:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('[ImmediateTask] ❌ Ошибка HTTP:', response.status);
                return null;
            }

            const data = await response.json();
            console.log('[ImmediateTask] 📦 Ответ:', data);

            if (data.ok && Array.isArray(data.tasks)) {
                const now = Date.now();

                // ✅ Фильтруем: только НЕвыполненные, с датой И БУДУЩИЕ (start_ts_ms > now)
                const tasks = data.tasks.filter(t =>
                    t.status !== 'done' &&
                    t.start_ts_ms &&
                    t.start_ts_ms > 0 &&
                    t.start_ts_ms > now  // ⭐ ТОЛЬКО БУДУЩИЕ ЗАДАЧИ
                );

                if (tasks.length === 0) {
                    console.log('[ImmediateTask] 📭 Нет будущих задач');
                    return null;
                }

                // Сортируем по дате (самая ближайшая первая)
                const sorted = tasks.sort((a, b) => a.start_ts_ms - b.start_ts_ms);
                const nearest = sorted[0];

                console.log('[ImmediateTask] 📌 Ближайшая задача:', nearest.title, new Date(nearest.start_ts_ms).toLocaleString());
                return nearest;
            }

            return null;

        } catch (error) {
            console.error('[ImmediateTask] ❌ Ошибка:', error);
            return null;
        }
    }

    // ---- Форматирование текста задачи ----
    function formatTaskText(title, maxLength = 22) {
        if (!title) return CONFIG.DEFAULT_TEXT;
        if (title.length <= maxLength) return title;
        return title.substring(0, maxLength) + '...';
    }

    // ---- Обновление индикатора ----
    function updateIndicator(task) {
        const buttons = document.querySelectorAll('.crm-indicator.immediate-task-button');

        buttons.forEach(button => {
            const taskText = button.querySelector('.task-text');

            if (!taskText) return;

            if (task) {
                // Есть задача (только будущая)
                button.classList.remove('no-task');
                taskText.textContent = formatTaskText(task.title);
                taskText.classList.remove('overdue');
                taskText.style.color = '#ffffff';

                // Сохраняем ID задачи для клика
                button.setAttribute('data-task-id', task.id);
                button.setAttribute('data-client-id', task.client_id || '');

                // При клике - открываем задачу или карточку клиента
                button.removeEventListener('click', handleTaskClick);
                button.addEventListener('click', handleTaskClick);

            } else {
                // Нет будущих задач
                button.classList.add('no-task');
                taskText.textContent = CONFIG.DEFAULT_TEXT;
                taskText.classList.remove('overdue');
                taskText.style.color = 'rgba(255,255,255,0.3)';

                button.removeAttribute('data-task-id');
                button.removeAttribute('data-client-id');
                button.removeEventListener('click', handleTaskClick);
            }
        });
    }

    // ---- Обработчик клика по задаче ----
    function handleTaskClick(event) {
        const button = event.currentTarget;
        const taskId = button.getAttribute('data-task-id');
        const clientId = button.getAttribute('data-client-id');

        if (taskId && clientId && parseInt(clientId) > 0) {
            // Если есть клиент - открываем карточку клиента
            window.location.href = `/Card.html?id=${clientId}`;
        } else if (taskId) {
            // Иначе открываем страницу задач
            window.location.href = '/tasks';
        }
    }

    // ---- Обновление с сервера ----
    async function updateFromServer() {
        const task = await fetchImmediateTask();
        updateIndicator(task);
    }

    // ---- Инициализация ----
    function init() {
        const buttons = document.querySelectorAll('.crm-indicator.immediate-task-button');
        if (buttons.length === 0) {
            console.warn('[ImmediateTask] Кнопки не найдены');
            return;
        }

        console.log('[ImmediateTask] Инициализация...');

        // Первое обновление
        updateFromServer();

        // Периодическое обновление
        if (CONFIG.REFRESH_INTERVAL > 0) {
            setInterval(updateFromServer, CONFIG.REFRESH_INTERVAL);
        }
    }

    // ---- Глобальный API ----
    window.ImmediateTaskIndicator = {
        init: init,
        refresh: updateFromServer,
        getTask: fetchImmediateTask,
        setConfig: (cfg) => Object.assign(CONFIG, cfg)
    };

    // ---- Запуск ----
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();