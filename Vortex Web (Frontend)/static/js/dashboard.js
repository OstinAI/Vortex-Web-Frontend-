// 1. Проверка авторизации
(function initVortex() {
    if (!localStorage.getItem('vortex_token')) window.location.href = '/';
})();

// 2. Часы
function vortexClock() {
    const el = document.getElementById('txt-clock');
    if (!el) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU', { weekday: 'short', day: '2-digit', month: '2-digit' });
    const timeStr = now.toLocaleTimeString('ru-RU');
    el.innerText = `${dateStr}\n${timeStr}`;
}

// 3. План
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

// 4. Ближайшая задача
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

// 5. Открыть/закрыть меню инструментов
function vortexToggleTools() {
    const menu = document.getElementById('tools-menu');
    if (menu) menu.classList.toggle('active');
}

// 6. Подсказки
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

// ========== DRAG & DROP (левая кнопка: клик - открытие, зажать - перемещение) ==========

let draggedItem = null;
let dragClone = null;
let dragStartX = 0, dragStartY = 0;
let isDragging = false;
let dragTimeout = null;

function initDragAndDrop() {
    const toolCells = document.querySelectorAll('.vortex-tool-cell');

    toolCells.forEach(cell => {
        // Отключаем стандартное поведение при перетаскивании
        cell.setAttribute('draggable', 'false');

        // ЛЕВАЯ КНОПКА - определяем клик или перетаскивание
        cell.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                e.preventDefault();

                // Задержка 150мс чтобы отличить клик от перетаскивания
                dragTimeout = setTimeout(() => {
                    // Начинаем перетаскивание
                    startDrag(e, cell);
                }, 150);

                // Сохраняем начальные координаты
                dragStartX = e.clientX;
                dragStartY = e.clientY;
            }
        });

        cell.addEventListener('mouseup', (e) => {
            if (e.button === 0 && !isDragging && dragTimeout) {
                // Это был клик (не перетаскивание)
                clearTimeout(dragTimeout);
                dragTimeout = null;
                const label = cell.getAttribute('data-label');
                const openFunction = openFunctions[label];
                if (openFunction) openFunction();
            }
        });

        // Отключаем контекстное меню
        cell.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
    });

    // Глобальная отмена перетаскивания при отпускании мыши где угодно
    document.addEventListener('mouseup', () => {
        if (dragTimeout) {
            clearTimeout(dragTimeout);
            dragTimeout = null;
        }
    });
}

const openFunctions = {
    'Статистика': () => window.location.href = '/stats',
    'Задачи': () => window.location.href = '/tasks',
    'Склад': () => window.location.href = '/warehouse',
    'CRM': () => window.location.href = '/crm',
    'Контакт-центр': () => window.location.href = '/contact',
    'Сотрудники': () => window.location.href = '/employees',
    'Настройки': () => window.location.href = '/settings'
};

function startDrag(e, element) {
    if (dragTimeout) {
        clearTimeout(dragTimeout);
        dragTimeout = null;
    }

    isDragging = true;
    draggedItem = element;
    const rect = draggedItem.getBoundingClientRect();

    // Сохраняем смещение курсора внутри элемента
    dragStartX = e.clientX - rect.left;
    dragStartY = e.clientY - rect.top;

    // Создаем клон для перетаскивания
    dragClone = draggedItem.cloneNode(true);
    dragClone.style.position = 'fixed';
    dragClone.style.left = (e.clientX - dragStartX) + 'px';
    dragClone.style.top = (e.clientY - dragStartY) + 'px';
    dragClone.style.width = rect.width + 'px';
    dragClone.style.height = rect.height + 'px';
    dragClone.style.margin = '0';
    dragClone.style.opacity = '0.8';
    dragClone.style.zIndex = '9999';
    dragClone.style.cursor = 'grabbing';
    dragClone.style.pointerEvents = 'none';
    dragClone.style.transition = 'none';
    document.body.appendChild(dragClone);

    // Оригинал делаем полупрозрачным
    draggedItem.style.opacity = '0.3';

    // Добавляем обработчики
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
}

function onDragMove(e) {
    if (!dragClone || !isDragging) return;
    e.preventDefault();

    dragClone.style.left = (e.clientX - dragStartX) + 'px';
    dragClone.style.top = (e.clientY - dragStartY) + 'px';
}

function onDragEnd(e) {
    if (!dragClone || !isDragging) {
        // Очистка на всякий случай
        if (draggedItem) draggedItem.style.opacity = '1';
        draggedItem = null;
        dragClone = null;
        isDragging = false;
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
        return;
    }

    // Находим элемент под курсором
    const elemUnderCursor = document.elementsFromPoint(e.clientX, e.clientY);
    const toolsGrid = document.getElementById('tools-menu');

    let targetCell = null;
    for (let elem of elemUnderCursor) {
        if (elem.classList && elem.classList.contains('vortex-tool-cell') && elem !== draggedItem) {
            targetCell = elem;
            break;
        }
    }

    if (targetCell && toolsGrid) {
        // Меняем местами элементы
        const items = Array.from(toolsGrid.children);
        const draggedIndex = items.indexOf(draggedItem);
        const targetIndex = items.indexOf(targetCell);

        if (draggedIndex < targetIndex) {
            targetCell.parentNode.insertBefore(draggedItem, targetCell.nextSibling);
        } else {
            targetCell.parentNode.insertBefore(draggedItem, targetCell);
        }

        // Сохраняем порядок
        saveToolsOrder();

        // Визуальная обратная связь
        targetCell.style.transform = 'scale(1.1)';
        setTimeout(() => {
            if (targetCell) targetCell.style.transform = '';
        }, 200);
    }

    // Очистка
    dragClone.remove();
    draggedItem.style.opacity = '1';
    draggedItem = null;
    dragClone = null;
    isDragging = false;

    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
}

function saveToolsOrder() {
    const toolsGrid = document.getElementById('tools-menu');
    if (toolsGrid) {
        const order = Array.from(toolsGrid.children).map(child => child.getAttribute('data-label'));
        localStorage.setItem('vortex_tools_order', JSON.stringify(order));
    }
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

// 8. Проверка прав доступа
function checkAccessControl() {
    const rawRole = localStorage.getItem('role') || "";
    const userRole = rawRole.toLowerCase().trim();
    const settingsBtn = document.getElementById('tool-settings');
    if (!settingsBtn) return;

    const allowedRoles = ['admin', 'integrator', 'director'];

    if (!allowedRoles.includes(userRole)) {
        settingsBtn.remove();
    } else {
        settingsBtn.style.setProperty('display', 'flex', 'important');
    }
}

// Функции открытия страниц
function openStat() { window.location.href = '/stats'; }
function openTasks() { window.location.href = '/tasks'; }
function openWH() { window.location.href = '/warehouse'; }
function openCRM() { window.location.href = '/crm'; }
function openContact() { window.location.href = '/contact'; }
function openEmpl() { window.location.href = '/employees'; }
function openSettings() { window.location.href = '/settings'; }
function openProfile() { window.location.href = '/profile'; }

// Функция задач на сегодня (боковая панель)
async function updateSideTasks() {
    try {
        const token = localStorage.getItem('vortex_token');

        // Получаем ID текущего пользователя из токена
        let currentUserId = null;
        try {
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                currentUserId = payload.user_id || payload.id;
                console.log("Текущий пользователь ID:", currentUserId);
            }
        } catch (e) {
            console.error("Ошибка парсинга токена:", e);
        }

        const res = await fetch(`${API_BASE_URL}/api/tasks/?my=1&limit=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const container = document.getElementById('vortex-side-tasks');
        if (!container) return;

        container.classList.add('vortex-side-panel');

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const endOfToday = startOfToday + 24 * 60 * 60 * 1000;

        // Фильтруем задачи: 
        // 1. Только на сегодня
        // 2. Только задачи текущего пользователя (проверяем assignees)
        const tasks = (data.tasks || []).filter(t => {
            let taskTime = parseInt(t.start_ts_ms || t.end_ts_ms || 0);
            if (taskTime > 0 && taskTime < 10000000000) taskTime *= 1000;
            const isNotDone = t.status !== 'done';
            const isExactlyToday = taskTime >= startOfToday && taskTime < endOfToday;

            // Проверяем, назначена ли задача на текущего пользователя
            let isAssignedToMe = false;
            if (currentUserId && t.assignees && Array.isArray(t.assignees)) {
                isAssignedToMe = t.assignees.some(assigneeId => parseInt(assigneeId) === parseInt(currentUserId));
            }

            // Если нет assignees, проверяем created_by
            if (!isAssignedToMe && currentUserId && t.created_by) {
                isAssignedToMe = parseInt(t.created_by) === parseInt(currentUserId);
            }

            return isNotDone && isExactlyToday && isAssignedToMe;
        });

        // Сортируем по времени
        tasks.sort((a, b) => (a.start_ts_ms || 0) - (b.start_ts_ms || 0));

        let html = '<div class="side-panel-header">МОИ ЗАДАЧИ НА СЕГОДНЯ</div>';
        html += '<div class="side-tasks-list">';

        if (tasks.length === 0) {
            html += '<div class="mini-task-card" style="border:none; opacity:0.5; font-size:10px; text-align:center;">На сегодня задач нет</div>';
        } else {
            // Рендерим ВСЕ задачи текущего пользователя
            html += tasks.map(t => {
                const typeLabel = t.client_id > 0 ? 'КЛИЕНТ' : 'ЛИЧНАЯ';

                let statusColor = '#00E5FF';
                switch (t.status) {
                    case 'open': statusColor = '#00E5FF'; break;
                    case 'in_progress': statusColor = '#FFD700'; break;
                    case 'done': statusColor = '#00FF00'; break;
                    case 'urgent': statusColor = '#FF4500'; break;
                    case 'waiting': statusColor = '#696969'; break;
                    case 'attention': statusColor = '#FF00FF'; break;
                    case 'overdue': statusColor = '#ff4d4d'; break;
                    default: statusColor = '#00E5FF';
                }

                let isOverdue = false;
                const taskTime = t.start_ts_ms;
                if (taskTime && t.status !== 'done') {
                    const taskDate = new Date(taskTime);
                    isOverdue = taskDate < now;
                }

                if (isOverdue || t.status === 'overdue') {
                    statusColor = '#ff4d4d';
                }

                let statusText = '';
                switch (t.status) {
                    case 'open': statusText = 'НОВАЯ'; break;
                    case 'in_progress': statusText = 'В РАБОТЕ'; break;
                    case 'done': statusText = 'ВЫПОЛНЕНА'; break;
                    case 'urgent': statusText = 'СРОЧНО'; break;
                    case 'waiting': statusText = 'ОЖИДАНИЕ'; break;
                    case 'attention': statusText = 'ВНИМАНИЕ'; break;
                    case 'overdue': statusText = 'ПРОСРОЧЕНА'; break;
                    default: statusText = '';
                }

                let cleanDescription = t.description || '';
                cleanDescription = cleanDescription.replace(/\[color:\s*#[0-9A-Fa-f]{6}\]/gi, '').trim();
                cleanDescription = cleanDescription.replace(/^\s+|\s+$/g, '');

                let onClickAction = '';
                if (t.client_id && t.client_id > 0) {
                    onClickAction = `window.location.href = '/Card.html?id=${t.client_id}'`;
                } else {
                    onClickAction = `fetchAndOpenTaskModal(${t.id})`;
                }

                return `
                    <div class="mini-task-card" 
                         title="${cleanDescription || ''}" 
                         onclick="${onClickAction}"
                         style="cursor:pointer; border-left: 2px solid ${statusColor}; margin-bottom: 8px; padding: 8px; background: rgba(255,255,255,0.03);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <div style="font-size: 9px; color: ${statusColor}; font-weight: bold; letter-spacing: 0.5px;">${typeLabel}</div>
                            ${statusText ? `<div style="font-size: 8px; color: ${statusColor}; font-weight: bold; letter-spacing: 0.5px; background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 10px;">${statusText}</div>` : ''}
                        </div>
                        <div class="mini-task-title" style="color: #ffffff; font-weight: 600; font-size: 13px; line-height: 1.2; margin-bottom: 4px;">${escapeHtml(t.title || 'Без названия')}</div>
                        ${cleanDescription ? `<div class="mini-task-desc" style="color: #888; font-size: 11px; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(cleanDescription)}</div>` : ''}
                    </div>
                `;
            }).join('');
        }

        html += '</div>';
        container.innerHTML = html;

        // Динамическая подстройка высоты под 8 задач
        setTimeout(() => {
            const cards = container.querySelectorAll('.mini-task-card');
            if (cards.length > 0) {
                const cardHeight = cards[0].offsetHeight;
                const headerHeight = container.querySelector('.side-panel-header')?.offsetHeight || 40;
                const targetVisible = Math.min(8, cards.length);
                const newMaxHeight = headerHeight + (cardHeight * targetVisible) + (8 * targetVisible);
                container.style.maxHeight = newMaxHeight + 'px';
            }
        }, 50);

    } catch (err) {
        console.error("Ошибка обновления боковой панели:", err);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Функция счетчика клиентов
async function updateClientsCount() {
    try {
        const token = localStorage.getItem('vortex_token');
        const pipelineId = localStorage.getItem('vortex_last_pipeline_id') || 0;
        const el = document.getElementById('txt-kl-count');
        if (!el) return;

        const cardsOnBoard = document.querySelectorAll('.vortex-deal-card');
        if (cardsOnBoard.length > 0) {
            el.innerText = cardsOnBoard.length;
            return;
        }

        if (!pipelineId || pipelineId == 0) {
            const resDirect = await fetch(`${API_BASE_URL}/api/crm/clients`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataDirect = await resDirect.json();
            if (el && dataDirect.ok) {
                el.innerText = dataDirect.cards ? dataDirect.cards.length : 0;
            }
            return;
        }

        const resStages = await fetch(`${API_BASE_URL}/api/crm/pipelines/${pipelineId}/stages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const dataStages = await resStages.json();
        const stages = dataStages.stages || [];

        const results = await Promise.all(stages.map(async (stage) => {
            const resCards = await fetch(`${API_BASE_URL}/api/crm/board/stage_cards?pipeline_id=${pipelineId}&stage_id=${stage.id}&limit=500`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataCards = await resCards.json();
            return dataCards.cards ? dataCards.cards.length : 0;
        }));

        const totalCount = results.reduce((a, b) => a + b, 0);
        el.innerText = totalCount;
    } catch (err) {
        console.error("Ошибка при подсчете клиентов:", err);
    }
}

// Функция для замены GIF на статику
function makeGifStaticOnHover() {
    const gifElements = document.querySelectorAll('.vortex-trigger-cell img, .vortex-exit-cell img, .vortex-tool-cell img');

    gifElements.forEach(img => {
        const originalSrc = img.src;
        if (!originalSrc.toLowerCase().includes('.gif')) return;

        // Создаем временное изображение для захвата первого кадра
        const tempImg = new Image();
        tempImg.src = originalSrc;

        tempImg.onload = () => {
            // Создаем canvas для первого кадра
            const canvas = document.createElement('canvas');
            canvas.width = tempImg.naturalWidth;
            canvas.height = tempImg.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(tempImg, 0, 0);

            // Сохраняем статичное изображение
            const staticSrc = canvas.toDataURL();

            // Устанавливаем статичное изображение по умолчанию
            img.src = staticSrc;

            // При наведении - GIF
            img.parentElement.addEventListener('mouseenter', () => {
                img.src = originalSrc + '?t=' + Date.now();
            });

            // При уходе - статика
            img.parentElement.addEventListener('mouseleave', () => {
                img.src = staticSrc;
            });
        };
    });
}

// Вызов после загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(makeGifStaticOnHover, 500);
});

// ========== ЗАПУСК ПРИ ЗАГРУЗКЕ ==========
document.addEventListener('DOMContentLoaded', () => {
    vortexClock();
    vortexPlan();
    vortexTasks();

    checkAccessControl();

    restoreToolsOrder();
    initDragAndDrop();
    initVortexHints();

    updateSideTasks();
    updateClientsCount();

    setInterval(vortexClock, 1000);
    setInterval(vortexPlan, 3600000);
    setInterval(vortexTasks, 30000);
    setInterval(updateSideTasks, 300000);
    setInterval(updateClientsCount, 300000);
});