// 1. Проверка авторизации (аналог GlobalSession check)
(function initVortex() {
    if (!localStorage.getItem('vortex_token')) window.location.href = '/';
})();

// 2. Часы (аналог StartClock)
function vortexClock() {
    const el = document.getElementById('txt-clock');
    if (!el) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU', { weekday: 'short', day: '2-digit', month: '2-digit' });
    const timeStr = now.toLocaleTimeString('ru-RU');
    el.innerText = `${dateStr}\n${timeStr}`;
}

// 3. План (аналог RefreshMonthlyPlanAsync)
async function vortexPlan() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/inventory/sales/plan/month`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await res.json();
        const month = new Date().toLocaleString('ru', { month: 'long' });
        const el = document.getElementById('txt-plan');
        if (el) el.innerText = `${month.toUpperCase()}\n${(data.total || 0).toLocaleString()} ₸`;
    } catch {
        if (document.getElementById('txt-plan')) document.getElementById('txt-plan').innerText = "ОШИБКА";
    }
}

// 4. Задачи (аналог RefreshNearestTaskOnMainButtonAsync)
async function vortexTasks() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/tasks/?limit=300`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await res.json();
        const tasks = (data.tasks || []).filter(t => t.status !== 'done' && t.start_ts_ms > 0);
        const nearest = tasks.sort((a, b) => a.start_ts_ms - b.start_ts_ms)[0];

        const el = document.getElementById('txt-task');
        if (!el) return;

        if (nearest) {
            el.innerText = nearest.title.length > 11 ? nearest.title.substring(0, 11) + '..' : nearest.title;
            el.style.color = Date.now() > nearest.start_ts_ms ? "#FF4D4D" : "white";
        } else {
            el.innerText = "НЕТ ЗАДАЧ";
            el.style.color = "white";
        }
    } catch {
        if (document.getElementById('txt-task')) document.getElementById('txt-task').innerText = "СБОЙ";
    }
}

// 5. Управление инструментами (Класс active запускает CSS-анимацию nth-child)
function vortexToggleTools() {
    const menu = document.getElementById('tools-menu');
    if (menu) menu.classList.toggle('active');
}

// 6. Подсказки (Вынесено в функцию для переинициализации)
function initVortexHints() {
    document.querySelectorAll('[data-label]').forEach(item => {
        item.onmouseenter = (e) => {
            const hint = document.getElementById('vortex-hint');
            if (!hint) return;
            hint.innerText = item.getAttribute('data-label');
            hint.style.display = "block";
            hint.style.left = e.pageX + "px";
            hint.style.top = (e.pageY - 40) + "px";
        };
        item.onmouseleave = () => {
            const hint = document.getElementById('vortex-hint');
            if (hint) hint.style.display = "none";
        };
    });
}

// 7. Выход
function vortexLogout() {
    localStorage.removeItem('vortex_token');
    window.location.href = '/';
}

// 8. Drag-and-Drop (SortableJS)
function initDraggableTools() {
    const toolsGrid = document.getElementById('tools-menu');
    if (!toolsGrid) return;

    new Sortable(toolsGrid, {
        animation: 150,
        delay: 100, // Задержка 100мс перед началом перетаскивания, чтобы dblclick успел сработать
        ghostClass: 'vortex-ghost',
        onEnd: function () {
            const order = Array.from(toolsGrid.children).map(child => child.getAttribute('data-label'));
            localStorage.setItem('vortex_tools_order', JSON.stringify(order));
        }
    });

    restoreToolsOrder();
}

function restoreToolsOrder() {
    const savedOrder = JSON.parse(localStorage.getItem('vortex_tools_order'));
    const toolsGrid = document.getElementById('tools-menu');
    if (savedOrder && toolsGrid) {
        const items = Array.from(toolsGrid.children);
        savedOrder.forEach(label => {
            const item = items.find(el => el.getAttribute('data-label') === label);
            if (item) toolsGrid.appendChild(item);
        });
    }
}

// 8.5 Проверка прав доступа к инструментам
function checkAccessControl() {
    // 1. Получаем роль
    const rawRole = localStorage.getItem('role') || "";
    const userRole = rawRole.toLowerCase().trim();

    const settingsBtn = document.getElementById('tool-settings');
    if (!settingsBtn) return;

    // 2. Список разрешенных ролей
    const allowedRoles = ['admin', 'integrator', 'director'];

    console.log("ПРОВЕРКА ДОСТУПА. Ваша роль:", userRole);

    // 3. Если роли НЕТ в списке разрешенных — УДАЛЯЕМ кнопку навсегда
    if (!allowedRoles.includes(userRole)) {
        settingsBtn.remove(); // ПОЛНОЕ УДАЛЕНИЕ ЭЛЕМЕНТА
        console.log("ДОСТУП ЗАПРЕЩЕН: Кнопка настроек удалена из системы.");
    } else {
        // Если роль подходит, принудительно ставим flex (на случай если в CSS стоит none)
        settingsBtn.style.setProperty('display', 'flex', 'important');
        console.log("ДОСТУП РАЗРЕШЕН: Кнопка настроек оставлена.");
    }
}



// ЗАПУСК ВСЕГО ПРИ ЗАГРУЗКЕ
// ОБНОВЛЕННЫЙ ЗАПУСК
document.addEventListener('DOMContentLoaded', () => {
    vortexClock();
    vortexPlan();
    vortexTasks();

    // 1. Сначала проверяем права и удаляем лишнее
    checkAccessControl();

    // 2. Затем инициализируем всё остальное
    initDraggableTools();
    initVortexHints();

    setInterval(vortexClock, 1000);
    setInterval(vortexPlan, 3600000);
    setInterval(vortexTasks, 30000);
});

// Функции перехода по страницам
function openStat() { window.location.href = '/stats'; }
function openTasks() { window.location.href = '/tasks'; }
function openWH() { window.location.href = '/warehouse'; }
function openCRM() { window.location.href = '/crm'; }
function openContact() { window.location.href = '/contact'; }
function openEmpl() { window.location.href = '/employees'; }
function openSettings() { window.location.href = '/settings'; }

// Функция для профиля (если решите вернуть или использовать для верхних кнопок)
function openProfile() { window.location.href = '/profile'; }

// Функция для получения задач на сегодня
async function updateSideTasks() {
    try {
        const token = localStorage.getItem('vortex_token');

        // 1. Добавляем ?my=1, чтобы сервер вернул все задачи, где ты создатель или исполнитель
        // Убираем статус, чтобы видеть и "open", и "in_progress"
        const res = await fetch(`${API_BASE_URL}/api/tasks/?my=1&limit=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();
        const container = document.getElementById('vortex-side-tasks');
        if (!container) return;

        // Границы сегодняшнего дня
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const endOfToday = startOfToday + 24 * 60 * 60 * 1000;

        // 2. Фильтруем задачи: Не выполнены + Сегодня
        const tasks = (data.tasks || []).filter(t => {
            let taskTime = parseInt(t.start_ts_ms || t.end_ts_ms || 0);

            // Коррекция секунд в мс, если бэкенд прислал секунды
            if (taskTime > 0 && taskTime < 10000000000) taskTime *= 1000;

            const isNotDone = t.status !== 'done';
            const isExactlyToday = taskTime >= startOfToday && taskTime < endOfToday;

            return isNotDone && isExactlyToday;
        });

        let html = '<div class="side-panel-header">ЗАДАЧИ НА СЕГОДНЯ</div>';

        if (tasks.length === 0) {
            html += '<div class="mini-task-card" style="border:none; opacity:0.5; font-size:10px; text-align:center;">На сегодня задач нет</div>';
        } else {
            // Сортируем по времени (сначала ранние)
            tasks.sort((a, b) => (a.start_ts_ms || 0) - (b.start_ts_ms || 0));

            html += tasks.map(t => {
                // Определяем тип для метки
                const typeLabel = t.client_id > 0 ? 'КЛИЕНТ' : 'ЛИЧНАЯ';
                // Если задача срочная, выделим её цветом
                const accentColor = t.priority === 'urgent' ? '#ff4444' : 'var(--vortex-accent)';

                return `
                    <div class="mini-task-card" 
                         title="${t.description || ''}" 
                         onclick="fetchAndOpenTaskModal(${t.id})" 
                         style="cursor:pointer; border-left: 2px solid ${accentColor}; margin-bottom: 8px; padding: 8px; background: rgba(255,255,255,0.03);">
                        
                        <div style="font-size: 9px; color: ${accentColor}; font-weight: bold; margin-bottom: 4px; letter-spacing: 0.5px;">
                            ${typeLabel}
                        </div>
                        
                        <div class="mini-task-title" style="color: #ffffff; font-weight: 600; font-size: 13px; line-height: 1.2;">
                            ${t.title || 'Без названия'}
                        </div>
                        
                        ${t.description ?
                        `<div class="mini-task-desc" style="color: #888; font-size: 11px; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                ${t.description}
                            </div>` : ''}
                    </div>
                `;
            }).join('');
        }

        container.innerHTML = html;

    } catch (err) {
        console.error("Ошибка обновления боковой панели:", err);
    }
}

// Функция для счетчика клиентов в работе
async function updateClientsCount() {
    try {
        const token = localStorage.getItem('vortex_token');
        const pipelineId = localStorage.getItem('vortex_last_pipeline_id') || 0;
        const el = document.getElementById('txt-kl-count');
        if (!el) return;

        // [ПРИОРИТЕТ] Считаем карточки прямо на экране (в CRM)
        // Если ты находишься в CRM, это самый точный метод
        const cardsOnBoard = document.querySelectorAll('.vortex-deal-card');
        if (cardsOnBoard.length > 0) {
            el.innerText = cardsOnBoard.length;
            console.log("Счетчик (с экрана):", cardsOnBoard.length);
            return;
        }

        if (!pipelineId || pipelineId == 0) {
            console.warn("Воронка не выбрана, общее количество может быть неточным");
        }

        // 1. Сначала получаем список всех этапов текущей воронки
        const resStages = await fetch(`${API_BASE_URL}/api/crm/pipelines/${pipelineId}/stages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const dataStages = await resStages.json();
        const stages = dataStages.stages || [];

        let totalCount = 0;

        // 2. Для каждого этапа запрашиваем карточки
        const results = await Promise.all(stages.map(async (stage) => {
            // Увеличиваем лимит, чтобы сервер вернул все карточки для подсчета
            const resCards = await fetch(`${API_BASE_URL}/api/crm/board/stage_cards?pipeline_id=${pipelineId}&stage_id=${stage.id}&limit=500`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataCards = await resCards.json();

            // Считаем количество элементов в массиве cards, который прислал сервер
            return dataCards.cards ? dataCards.cards.length : 0;
        }));

        totalCount = results.reduce((a, b) => a + b, 0);

        // Если по API нашли больше 0, а на экране было 0 (например, мы на Dashboard)
        el.innerText = totalCount;
        console.log("Итого клиентов на доске (API):", totalCount);

    } catch (err) {
        console.error("Ошибка при подсчете клиентов через воронку:", err);

        // Резервный вариант — прямой запрос к API клиентов (поле 'cards' из clients_bp.py)
        const resDirect = await fetch(`${API_BASE_URL}/api/crm/clients`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const dataDirect = await resDirect.json();
        if (el && dataDirect.ok) {
            el.innerText = dataDirect.cards ? dataDirect.cards.length : 0;
        }
    }
}

// Вызовите её при загрузке страницы
updateClientsCount();

// Добавьте вызов этой функции в автозагрузку (внизу dashboard.js)
document.addEventListener('DOMContentLoaded', () => {
    // ... другие ваши функции (vortexClock и т.д.)
    updateClientsCount();

    // Обновлять каждые 5 минут
    setInterval(updateClientsCount, 300000);
});

// Добавь запуск в основной блок
document.addEventListener('DOMContentLoaded', () => {
    // Твои текущие вызовы...
    updateSideTasks();
    updateClientsCount();

    // Обновление раз в 5 минут
    setInterval(updateSideTasks, 300000);
    setInterval(updateClientsCount, 300000);
});