let currentViewMode = 'my'; // 'my' или 'all'

// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ДЛЯ КЛИЕНТОВ И ЦВЕТОВ ---
let allClientsList = [];
let selectedClientId = null;

// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ДЛЯ ПИКЕРА ЦВЕТА ---
let selectedTaskColor = '#00E5FF';
const colorPalette = ['#00E5FF', '#FF5252', '#FF9100', '#FFD700', '#00E676', '#2979FF', '#AA00FF', '#FF00FF'];

// Глобальная переменная для управления календарем
let vortexDatePicker = null;

document.addEventListener('DOMContentLoaded', async () => {
    initResizer();
    checkPermissions();

    vortexDatePicker = flatpickr("#task-deadline", {
        enableTime: true,
        dateFormat: "Y-m-d\\TH:i",
        time_24hr: true,
        locale: "ru",
        theme: "dark",
        onReady: function (selectedDates, dateStr, instance) {
            instance.calendarContainer.addEventListener('dblclick', function (e) {
                if (e.target.classList.contains('flatpickr-day') || e.target.tagName === 'INPUT') {
                    instance.close();
                }
            });
        }
    });

    await loadUsersToTaskSelect();
    await loadClientsToTaskSelect();
    renderColorPalette();
    loadTasks();

    // --- ИНДИКАТОРЫ ---
    updateIndicators();
    startCalendarIndicator(); // Запускаем обновление времени каждую секунду
});

// --- ЗАГРУЗКА КЛИЕНТОВ ---
async function loadClientsToTaskSelect() {
    const token = localStorage.getItem('vortex_token');
    try {
        const res = await fetch(`${API_BASE_URL}/api/crm/clients?limit=200`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.ok && Array.isArray(data.clients)) {
            allClientsList = data.clients.filter(client =>
                client.name !== '__SYSTEM_TASK_CLIENT__' &&
                !client.name?.startsWith('__SYSTEM')
            );
            renderClientDropdown();
        }
    } catch (e) {
        console.error("Ошибка загрузки клиентов:", e);
    }
}


// --- ЛОГИКА ВЫБОРА КЛИЕНТА ---
function toggleClientDropdown() {
    const dropdown = document.getElementById('client-dropdown');
    if (dropdown) dropdown.classList.toggle('show');
}

function renderClientDropdown() {
    const dropdown = document.getElementById('client-dropdown');
    if (!dropdown) return;

    dropdown.innerHTML = '';

    // Пункт "Без клиента"
    const noneItem = document.createElement('div');
    noneItem.className = `vortex-dropdown-item ${selectedClientId === null ? 'selected' : ''}`;
    noneItem.innerText = 'Без клиента';
    noneItem.onclick = (e) => {
        e.stopPropagation();
        selectedClientId = null;
        document.getElementById('selected-client-name').innerText = 'Без клиента';
        document.getElementById('selected-client-id').value = '';
        renderClientDropdown();
        toggleClientDropdown();
    };
    dropdown.appendChild(noneItem);

    allClientsList.forEach(client => {
        const isSelected = selectedClientId === client.id;
        const item = document.createElement('div');
        item.className = `vortex-dropdown-item ${isSelected ? 'selected' : ''}`;
        item.innerText = client.name || `Клиент #${client.id}`;
        item.onclick = (e) => {
            e.stopPropagation();
            selectedClientId = client.id;
            document.getElementById('selected-client-name').innerText = client.name || `Клиент #${client.id}`;
            document.getElementById('selected-client-id').value = client.id;
            renderClientDropdown();
            toggleClientDropdown();
        };
        dropdown.appendChild(item);
    });
}

// Закрытие списка клиентов при клике вне
document.addEventListener('click', function (event) {
    const clientSelect = document.getElementById('vortex-client-select');
    if (clientSelect && !clientSelect.contains(event.target)) {
        const dropdown = document.getElementById('client-dropdown');
        if (dropdown) dropdown.classList.remove('show');
    }
});

// --- ЛОГИКА ВЫБОРА ЦВЕТА ---
function renderColorPalette() {
    const container = document.getElementById('color-palette-container');
    if (!container) return;

    container.innerHTML = '';
    colorPalette.forEach(color => {
        const circle = document.createElement('div');
        circle.className = `vortex-color-circle ${selectedTaskColor === color ? 'active' : ''}`;
        circle.style.backgroundColor = color;
        circle.onclick = () => {
            selectedTaskColor = color;
            renderColorPalette();
        };
        container.appendChild(circle);
    });
}

// Открытие кастомного пикера
function openCustomColorPicker() {
    const existing = document.getElementById('custom-color-picker-popup');
    if (existing) {
        existing.remove();
        return;
    }

    const popup = document.createElement('div');
    popup.id = 'custom-color-picker-popup';
    popup.style.cssText = `
        position: fixed; 
        background: #0f172a; 
        padding: 15px; 
        border-radius: 12px; 
        border: 1px solid #334155; 
        z-index: 9999; 
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    `;

    const btn = document.querySelector('.vortex-color-circle.custom-palette-btn');
    if (btn) {
        const rect = btn.getBoundingClientRect();
        popup.style.top = (rect.bottom + window.scrollY + 8) + 'px';
        popup.style.left = (rect.left + window.scrollX) + 'px';
    }

    const input = document.createElement('input');
    input.type = 'color';
    input.value = selectedTaskColor;
    input.style.cssText = 'width: 150px; height: 50px; border: none; background: transparent; cursor: pointer;';
    input.oninput = (e) => {
        selectedTaskColor = e.target.value;
        renderColorPalette();
    };
    popup.appendChild(input);

    const closeBtn = document.createElement('button');
    closeBtn.innerText = '✕';
    closeBtn.style.cssText = 'position: absolute; top: 5px; right: 10px; background: none; border: none; color: #666; font-size: 16px; cursor: pointer;';
    closeBtn.onclick = () => popup.remove();
    popup.appendChild(closeBtn);

    document.body.appendChild(popup);
    setTimeout(() => {
        document.addEventListener('click', function closePicker(e) {
            if (!popup.contains(e.target) && e.target !== btn) {
                popup.remove();
                document.removeEventListener('click', closePicker);
            }
        });
    }, 100);
}

// --- ЛОГИКА РЕСАЙЗЕРА ---
function initResizer() {
    const resizer = document.getElementById('resizer');
    const leftSide = document.getElementById('left-side');
    let isResizing = false;

    const savedWidth = localStorage.getItem('vortex-tasks-split');
    if (savedWidth) leftSide.style.width = savedWidth + '%';

    resizer.addEventListener('mousedown', () => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        resizer.classList.add('active');
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        let percentage = (e.clientX / window.innerWidth) * 100;
        if (percentage > 20 && percentage < 80) {
            const widthStr = percentage.toFixed(2);
            leftSide.style.width = widthStr + '%';
            localStorage.setItem('vortex-tasks-split', widthStr);
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
            resizer.classList.remove('active');
        }
    });
}

// --- ПРАВА ДОСТУПА ---
function checkPermissions() {
    const role = (localStorage.getItem('vortex_user_role') || '').toLowerCase();

    // Согласно твоему tasks_bp.py, полные права у этих ролей:
    if (['admin', 'integrator', 'director', 'president'].includes(role)) {
        const globalBtn = document.getElementById('btn-global-tasks');
        if (globalBtn) globalBtn.style.display = 'inline-block';
    }
}

// --- Инициализация загрузки сотрудников ---
async function loadUsersToTaskSelect() {
    const token = localStorage.getItem('vortex_token');
    const dropdown = document.getElementById('assignee-dropdown');

    // Получаем текущую роль того, кто сейчас сидит в CRM
    const currentUserRole = (localStorage.getItem('vortex_user_role') || '').toLowerCase();

    try {
        // ТОЧНЫЙ АДРЕС: добавляем /list в конце, как написано в твоем бэкенде!
        // Если вдруг префикс в main.py другой (например /api/crm/employees/list), поменяй тут.
        const res = await fetch(`${API_BASE_URL}/api/employees/list`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            console.error("Ошибка HTTP:", res.status);
            if (dropdown) dropdown.innerHTML = `<div style="padding:10px; color:#ff4444; font-size:11px; text-align:center;">Ошибка сервера: ${res.status}</div>`;
            return;
        }

        const data = await res.json();

        // ВАЖНО: В твоем employees.py успешный ответ выглядит так: {"status": "ok", "employees": [...]}
        if (data.status === 'ok' && Array.isArray(data.employees)) {

            // Фильтруем список сотрудников (data.employees)
            allUsersList = data.employees.filter(user => {
                const userRole = (user.role || '').toLowerCase();

                // ЛОГИКА ИНТЕГРАТОРА:
                // Если сотрудник в списке — интегратор, оставляем его ТОЛЬКО если мы сами интеграторы
                if (userRole === 'integrator' || userRole === 'интегратор') {
                    return currentUserRole === 'integrator';
                }

                // Всех остальных сотрудников показываем
                return true;
            });

            console.log(`Успешно загружено сотрудников: ${allUsersList.length}`);
            renderAssigneeDropdown(); // Отрисовываем выпадающий список (чипсы)

        } else {
            if (dropdown) dropdown.innerHTML = '<div style="padding:10px; color:#666; font-size:11px; text-align:center;">Список пуст или нет доступа</div>';
        }
    } catch (e) {
        console.error("Ошибка загрузки пользователей:", e);
        if (dropdown) dropdown.innerHTML = '<div style="padding:10px; color:#ff4444; font-size:11px; text-align:center;">Ошибка сети</div>';
    }
}

// --- ЛОГИКА КАСТОМНОГО MULTI-SELECT (CHIPS) ---

// 1. Открытие/закрытие списка
function toggleAssigneeDropdown() {
    const dropdown = document.getElementById('assignee-dropdown');
    const container = document.getElementById('assignee-chips');

    if (!dropdown || !container) return;

    dropdown.classList.toggle('show');
    container.classList.toggle('active');

    renderAssigneeDropdown(); // Обновляем список (чтобы зачеркнуть выбранных)
}

// Закрытие списка при клике вне его области
document.addEventListener('click', function (event) {
    const customSelect = document.getElementById('vortex-assignee-select');
    if (customSelect && !customSelect.contains(event.target)) {
        const dropdown = document.getElementById('assignee-dropdown');
        const chips = document.getElementById('assignee-chips');
        if (dropdown) dropdown.classList.remove('show');
        if (chips) chips.classList.remove('active');
    }
});

// 2. Отрисовка списка внутри выпадающего меню
function renderAssigneeDropdown() {
    const dropdown = document.getElementById('assignee-dropdown');
    if (!dropdown) return;

    dropdown.innerHTML = '';

    if (allUsersList.length === 0) {
        dropdown.innerHTML = '<div style="padding:10px; color:#666; font-size:11px; text-align:center;">Нет данных</div>';
        return;
    }

    allUsersList.forEach(user => {
        const isSelected = selectedAssignees.includes(user.id);
        const name = user.full_name || user.name || user.username || `User #${user.id}`;

        const item = document.createElement('div');
        item.className = `vortex-dropdown-item ${isSelected ? 'selected' : ''}`;
        item.innerText = name;

        if (!isSelected) {
            item.onclick = (e) => {
                e.stopPropagation(); // Не закрываем меню сразу, вдруг нужно выбрать еще
                addAssignee(user.id);
            };
        }
        dropdown.appendChild(item);
    });
}

// 3. Добавление сотрудника (создание чипа)
function addAssignee(userId) {
    if (!selectedAssignees.includes(userId)) {
        selectedAssignees.push(userId);
        renderAssigneeChips();
        renderAssigneeDropdown();
    }
}

// 4. Удаление сотрудника (удаление чипа)
function removeAssignee(userId, event) {
    if (event) event.stopPropagation(); // Чтобы клик по крестику не открывал меню
    selectedAssignees = selectedAssignees.filter(id => id !== userId);
    renderAssigneeChips();
    renderAssigneeDropdown();
}

// 5. Отрисовка самих чипов в поле
function renderAssigneeChips() {
    const container = document.getElementById('assignee-chips');
    const placeholder = document.getElementById('assignee-placeholder');
    if (!container || !placeholder) return;

    // Удаляем все старые чипы (всё, кроме плейсхолдера)
    const existingChips = container.querySelectorAll('.vortex-chip');
    existingChips.forEach(chip => chip.remove());

    if (selectedAssignees.length === 0) {
        placeholder.style.display = 'block';
    } else {
        placeholder.style.display = 'none';

        // Создаем чипы для каждого выбранного ID
        selectedAssignees.forEach(id => {
            const user = allUsersList.find(u => u.id === id);
            const name = user ? (user.full_name || user.name || user.username) : `ID: ${id}`;

            const chip = document.createElement('div');
            chip.className = 'vortex-chip';
            chip.innerHTML = `
                ${name}
                <button class="vortex-chip-remove" onclick="removeAssignee(${id}, event)">&times;</button>
            `;
            // Вставляем чип перед плейсхолдером
            container.insertBefore(chip, placeholder);
        });
    }
}

// --- ПЕРЕКЛЮЧЕНИЕ ГЛОБАЛЬНЫЕ/МОИ ---
function toggleGlobalTasks() {
    const btn = document.getElementById('btn-global-tasks');
    const listTitle = document.querySelector('.tasks-list-header h3');

    if (currentViewMode === 'my') {
        currentViewMode = 'all';
        btn.innerText = "МОИ ЗАДАЧИ";
        btn.classList.remove('secondary');
        listTitle.innerText = "ГЛОБАЛЬНЫЕ ЗАДАЧИ";
    } else {
        currentViewMode = 'my';
        btn.innerText = "ВСЕ ЗАДАЧИ";
        btn.classList.add('secondary');
        listTitle.innerText = "МОИ ЗАДАЧИ";
    }

    loadTasks();
}

// --- ЗАГРУЗКА ЗАДАЧ (СЕРВЕР) ---
async function loadTasks() {
    const token = localStorage.getItem('vortex_token');
    const myFullName = localStorage.getItem('vortex_user_name');

    const viewMode = document.getElementById('task-view-mode').value;
    const statusFilter = document.getElementById('filter-status').value;

    let url = `${API_BASE_URL}/api/tasks/?limit=100`;
    // Отправляем статус на сервер для всех статусов, кроме 'overdue'
    if (statusFilter && statusFilter !== 'overdue') {
        url += `&status=${statusFilter}`;
    }

    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.ok) {
            let tasks = data.tasks;

            // Фильтрация "Мои задачи"
            if (viewMode === 'my') {
                tasks = tasks.filter(t => {
                    const assigneesForThisTask = (t.assignees || []).map(id => {
                        const user = allUsersList.find(u => u.id == id);
                        return user ? user.full_name : '';
                    });
                    return assigneesForThisTask.includes(myFullName);
                });
            }

            // Фильтрация по просрочке (на клиенте)
            if (statusFilter === 'overdue') {
                const now = Date.now();
                tasks = tasks.filter(t => t.status !== 'done' && t.end_ts_ms && t.end_ts_ms < now);
            }

            renderTasksList(tasks);

            if (typeof updateDashboard === 'function') {
                updateDashboard(tasks);
            }
        }
    } catch (e) {
        console.error("Ошибка загрузки задач:", e);
    }
}

// Отрисовка списка задач
function renderTasksList(tasks) {
    const container = document.getElementById('tasks-list-container');
    container.innerHTML = '';

    const myId = localStorage.getItem('vortex_user_id');

    if (tasks.length === 0) {
        container.innerHTML = '<div style="color:#666; padding:15px; text-align:center;">Задач не найдено</div>';
        return;
    }

    // Функция получения цвета по статусу
    function getColorByStatus(status) {
        const colorMap = {
            'open': '#00E5FF',        // голубой
            'in_progress': '#FFD700', // жёлтый
            'done': '#00FF00',        // зелёный
            'urgent': '#FF4500',      // оранжевый
            'waiting': '#696969',     // серый
            'attention': '#FF00FF',   // розовый
            'overdue': '#ff4d4d'      // красный
        };
        return colorMap[status] || '#ffffff';
    }

    tasks.forEach(t => {
        const div = document.createElement('div');
        div.className = 'task-item';

        const now = Date.now();
        const isOverdue = t.status !== 'done' && t.end_ts_ms && t.end_ts_ms < now;

        // --- ОПРЕДЕЛЕНИЕ ЦВЕТА (ПО СТАТУСУ) ---
        let statusColor;
        if (isOverdue && t.status !== 'done') {
            statusColor = '#ff4d4d'; // просрочена - красный
        } else {
            statusColor = getColorByStatus(t.status);
        }

        // Форматирование даты
        const dateStr = t.end_ts_ms
            ? new Date(t.end_ts_ms).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
            : '';

        function cleanDescription(text) {
            if (!text) return '';
            return text.replace(/\[color:#[0-9a-fA-F]{6}\]/g, '').replace(/\[\/color\]/g, '');
        }

        let assigneeName = 'Не назначен';
        const idsToFind = t.assignees || [];
        if (idsToFind.length > 0) {
            assigneeName = idsToFind.map(id => {
                const u = allUsersList.find(user => user.id == id);
                return u ? (u.full_name || u.username) : `ID: ${id}`;
            }).join(', ');
        }

        div.innerHTML = `
            <div class="task-item-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
                <span class="task-title" style="color: #ffffff; font-size: 18px; font-weight: bold; text-transform: uppercase; word-break: break-word; max-width: 70%;">
                    ${t.title}
                </span>
                <span class="task-date" style="color: ${statusColor}; font-size: 12px; font-weight: bold; white-space: nowrap; margin-left: 10px;">
                    ${dateStr}
                </span>
            </div>
            <div class="task-item-body" style="color: #888; margin-top: 5px; font-size: 13px; font-weight: 500;">
                ${assigneeName}
            </div>
        `;

        div.style.borderLeft = `4px solid ${statusColor}`;

        if (t.status === 'in_progress' || isOverdue) {
            div.style.boxShadow = `inset 5px 0 15px -5px ${statusColor}44`;
        }

        div.onclick = () => fetchAndOpenTaskModal(t.id);
        container.appendChild(div);
    });
}

// --- СКАЧИВАНИЕ И СРАЗУ ОТКРЫТИЕ МОДАЛКИ ---
async function fetchAndOpenTaskModal(taskId) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await res.json();

        if (data.ok && data.task) {
            const task = data.task;

            // Очищаем описание от цветовых тегов
            if (task.description) {
                task.description = task.description
                    .replace(/\[color:#[0-9a-fA-F]{6}\]/g, '')
                    .replace(/\[\/color\]/g, '');
            }

            // --- ЗАГРУЗКА ИМЕНИ КЛИЕНТА ---
            if (task.client_id) {
                try {
                    const token = localStorage.getItem('vortex_token');
                    const clientRes = await fetch(`${API_BASE_URL}/api/crm/clients/${task.client_id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const clientData = await clientRes.json();
                    if (clientData.ok && clientData.client) {
                        task.client_name = clientData.client.name;
                    }
                } catch (e) {
                    console.error("Ошибка загрузки имени клиента:", e);
                }
            }

            window.currentViewedTask = task;
            openTaskModalForEdit(task.id);
        }
    } catch (e) {
        console.error('Сбой сети при загрузке задачи:', e);
    }
}

// --- УПРАВЛЕНИЕ МОДАЛКОЙ ---
function openTaskModal() {
    document.getElementById('edit-task-id').value = '';
    document.getElementById('task-modal-title').innerText = 'НОВАЯ ЗАДАЧА';

    document.getElementById('task-title').value = '';
    document.getElementById('task-desc').value = '';
    document.getElementById('task-deadline').value = '';
    document.getElementById('task-duration').value = 30;

    // Устанавливаем статус по умолчанию
    document.getElementById('task-status-select').value = 'open';

    // Сброс клиента
    selectedClientId = null;
    document.getElementById('selected-client-name').innerText = 'Без клиента';
    document.getElementById('selected-client-id').value = '';
    renderClientDropdown();

    // Сброс цвета
    selectedTaskColor = '#00E5FF';
    renderColorPalette();

    // Очищаем чипы
    selectedAssignees = [];
    renderAssigneeChips();

    if (vortexDatePicker) vortexDatePicker.clear();

    // Скрываем старую группу статуса (если есть)
    const oldStatusGroup = document.getElementById('status-group');
    if (oldStatusGroup) oldStatusGroup.style.display = 'none';

    document.getElementById('modal-task-create').style.display = 'block';
}

function openTaskModalForEdit(taskId) {
    console.log("🔵 openTaskModalForEdit вызвана с ID:", taskId);
    const t = window.currentViewedTask;
    console.log("🔵 Данные задачи:", t);
    if (!t || t.id !== taskId) {
        console.error("❌ Задача не найдена или ID не совпадает");
        return;
    }

    document.getElementById('edit-task-id').value = t.id;
    document.getElementById('task-modal-title').innerText = 'РЕДАКТИРОВАНИЕ ЗАДАЧИ';

    const cleanText = (text) => {
        if (!text) return '';
        return text.replace(/\[color:#[0-9a-fA-F]{6}\]/g, '').replace(/\[\/color\]/g, '');
    };

    document.getElementById('task-title').value = cleanText(t.title) || '';
    document.getElementById('task-desc').value = cleanText(t.description) || '';
    document.getElementById('task-duration').value = t.duration || 30;

    // --- УСТАНОВКА СТАТУСА ---
    const statusMap = {
        'open': 'open',
        'in_progress': 'in_progress',
        'done': 'done',
        'urgent': 'urgent',
        'waiting': 'waiting',
        'attention': 'attention',
        'overdue': 'overdue'
    };
    const taskStatus = statusMap[t.status] || 'open';
    document.getElementById('task-status-select').value = taskStatus;

    // --- УСТАНОВКА КЛИЕНТА ---
    if (t.client_id) {
        selectedClientId = t.client_id;
        const clientName = t.client_name || `Клиент #${t.client_id}`;
        document.getElementById('selected-client-name').innerText = clientName;
        document.getElementById('selected-client-id').value = t.client_id;
    } else {
        selectedClientId = null;
        document.getElementById('selected-client-name').innerText = 'Без клиента';
        document.getElementById('selected-client-id').value = '';
    }
    renderClientDropdown();

    // --- УСТАНОВКА ЦВЕТА ---
    // Функция получения цвета по статусу
    function getColorByStatus(status) {
        const colorMap = {
            'open': '#00E5FF',        // голубой
            'in_progress': '#FFD700', // жёлтый
            'done': '#00FF00',        // зелёный
            'urgent': '#FF4500',      // оранжевый
            'waiting': '#696969',     // серый
            'attention': '#FF00FF',   // розовый
            'overdue': '#ff4d4d'      // красный
        };
        return colorMap[status] || '#00E5FF';
    }

    let taskColor = null;

    // 1. Сначала проверяем, есть ли цвет в описании (ручной выбор пользователя)
    if (t.description) {
        const match = t.description.match(/\[color:\s*(#[0-9A-Fa-f]{6})\]/);
        if (match) {
            taskColor = match[1];
            console.log("🔵 Цвет из описания (ручной):", taskColor);
        }
    }

    // 2. Если цвета в описании нет, проверяем поле color
    if (!taskColor && t.color) {
        taskColor = t.color;
        console.log("🔵 Цвет из поля color:", taskColor);
    }

    // 3. Если всё еще нет цвета - берем по статусу
    if (!taskColor) {
        taskColor = getColorByStatus(t.status);
        console.log("🔵 Цвет по статусу:", taskColor, "статус:", t.status);
    }

    selectedTaskColor = taskColor;
    renderColorPalette();

    // --- УСТАНОВКА ДАТЫ (ДЕДЛАЙН) ---
    // В календаре используется start_ts_ms, но в задачах tasks - end_ts_ms
    let taskTimestamp = t.end_ts_ms || t.start_ts_ms;

    if (taskTimestamp) {
        console.log("🔵 Установка даты из timestamp:", taskTimestamp);
        const date = new Date(taskTimestamp);

        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const localISOTime = `${year}-${month}-${day}T${hours}:${minutes}`;
            console.log("🔵 Форматированная дата:", localISOTime);

            const deadlineInput = document.getElementById('task-deadline');
            if (deadlineInput) {
                deadlineInput.value = localISOTime;
            }

            if (vortexDatePicker && typeof vortexDatePicker.setDate === 'function') {
                try {
                    vortexDatePicker.setDate(localISOTime, false);
                    console.log("✅ Flatpickr дата установлена");
                } catch (e) {
                    console.error("❌ Ошибка установки Flatpickr:", e);
                }
            }
        } else {
            console.warn("⚠️ Невалидная дата из timestamp:", taskTimestamp);
            document.getElementById('task-deadline').value = '';
            if (vortexDatePicker) vortexDatePicker.clear();
        }
    } else {
        console.log("🔵 Нет даты, очищаем поле");
        document.getElementById('task-deadline').value = '';
        if (vortexDatePicker) vortexDatePicker.clear();
    }

    // --- УСТАНОВКА ОТВЕТСТВЕННЫХ ---
    if (Array.isArray(t.assignees)) {
        if (t.assignees.length > 0 && typeof t.assignees[0] === 'object') {
            selectedAssignees = t.assignees.map(a => a.user_id || a.id);
        } else {
            selectedAssignees = t.assignees;
        }
    } else if (Array.isArray(t.assignee_user_ids)) {
        selectedAssignees = t.assignee_user_ids;
    } else {
        selectedAssignees = [];
    }

    renderAssigneeChips();

    // Скрываем старую группу статуса
    const oldStatusGroup = document.getElementById('status-group');
    if (oldStatusGroup) oldStatusGroup.style.display = 'none';

    document.getElementById('modal-task-create').style.display = 'block';
}

function closeTaskModal() {
    document.getElementById('modal-task-create').style.display = 'none';
}

// --- СОХРАНЕНИЕ / СОЗДАНИЕ ---
async function saveTask() {
    console.log("🔵 saveTask() вызвана");

    const editId = document.getElementById('edit-task-id').value;
    console.log("🔵 editId:", editId);

    const title = document.getElementById('task-title').value.trim();
    let desc = document.getElementById('task-desc').value.trim();
    let deadlineStr = document.getElementById('task-deadline').value;
    const status = document.getElementById('task-status-select').value;
    const duration = parseInt(document.getElementById('task-duration').value) || 30;
    const clientId = document.getElementById('selected-client-id').value || null;

    const selectedUsers = selectedAssignees;
    console.log("🔵 selectedUsers:", selectedUsers);
    console.log("🔵 status:", status);

    if (!title) {
        console.warn("Укажите название задачи");
        document.getElementById('task-title').focus();
        return;
    }

    if (selectedUsers.length === 0) {
        console.warn("Выберите исполнителя");
        return;
    }

    // Добавляем цвет в описание
    const colorTag = `[color:${selectedTaskColor}]`;
    // Очищаем старые цветовые теги
    desc = desc.replace(/\[color:#[0-9a-fA-F]{6}\]/g, '').replace(/\[\/color\]/g, '').trim();
    desc = desc ? `${desc} ${colorTag}` : colorTag;

    const token = localStorage.getItem('vortex_token');
    const deadlineMs = deadlineStr ? new Date(deadlineStr).getTime() : null;

    const payload = {
        title: title,
        description: desc,
        end_ts_ms: deadlineMs,
        status: status,
        duration: duration,
        client_id: clientId,
        assignees: selectedUsers,
        color: selectedTaskColor
    };

    console.log("🔵 payload:", payload);

    let url = `${API_BASE_URL}/api/tasks/`;
    let method = 'POST';

    if (editId) {
        url = `${API_BASE_URL}/api/tasks/${editId}`;
        method = 'POST'; // POST для обновления
        // Для редактирования убираем assignees из основного payload, 
        // чтобы отправить их отдельно (как в твоем коде)
        delete payload.assignees;
    }

    try {
        console.log("🔵 Отправка запроса на:", url, "метод:", method);

        // 1. Сохраняем основную задачу
        const res = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log("🔵 Ответ сервера:", data);

        if (data.ok) {
            // 2. Если это редактирование - обновляем ответственных отдельно
            if (editId) {
                console.log("🔵 Обновление ответственных для задачи:", editId);
                const assignRes = await fetch(`${API_BASE_URL}/api/tasks/${editId}/assignees`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ assignees: selectedUsers })
                });
                const assignData = await assignRes.json();
                console.log("🔵 Ответ обновления ответственных:", assignData);
            }

            console.log("✅ Задача успешно сохранена!");
            closeTaskModal();
            loadTasks(); // Обновляем список
        } else {
            console.error("❌ Ошибка от сервера:", data.message);
            alert(`Ошибка: ${data.message || 'Неизвестная ошибка'}`);
        }
    } catch (e) {
        console.error("❌ Сбой сети при сохранении задачи:", e);
        alert(`Ошибка сети: ${e.message}`);
    }
}

// Глобальные переменные для графиков, чтобы обновлять их, а не плодить новые
let statusChart = null;
let priorityChart = null;
let radarChart = null; // Проверь, есть ли эта строка!

async function updateDashboard(tasks) {
    const now = Date.now();
    const stats = {
        done: 0,
        in_progress: 0,
        overdue: 0,
        urgent: 0,
        normal: 0,
        total: tasks.length || 1
    };

    tasks.forEach(t => {
        // Считаем статусы
        const isOverdue = t.status !== 'done' && t.end_ts_ms && t.end_ts_ms < now;
        if (t.status === 'done') stats.done++;
        else if (isOverdue) stats.overdue++;
        else if (t.status === 'in_progress') stats.in_progress++;

        // Считаем приоритеты
        if (t.priority === 'urgent') stats.urgent++;
        else stats.normal++;
    });

    // 1. ДИАГРАММА СТАТУСОВ (Перекрашена в стиль Vortex)
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    if (statusChart) statusChart.destroy();
    statusChart = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: ['Выполнено', 'В работе', 'Просрочено'],
            datasets: [{
                data: [stats.done, stats.in_progress, stats.overdue],
                // ОБНОВЛЕННЫЕ ЦВЕТА:
                backgroundColor: ['#1DB954', '#FFB000', '#941B1B'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#888', font: { size: 10 } }
                }
            },
            cutout: '70%'
        }
    });

    // 2. ИНДЕКС СКОРОСТИ
    const total = tasks.length || 1;
    let index = ((stats.done - stats.overdue) / total) * 10;
    index = Math.max(-10, Math.min(10, index));

    const indexValueEl = document.getElementById('speed-index-value');
    const indexBarEl = document.getElementById('speed-index-bar');

    indexValueEl.innerText = index.toFixed(1);

    const percent = ((index + 10) / 20) * 100;
    indexBarEl.style.width = percent + '%';

    // ЦВЕТА ИНДЕКСА (В стиле Vortex)
    let indexColor = '';
    if (index < 0) {
        indexColor = '#941B1B'; // Красный
    } else if (index < 5) {
        indexColor = '#FFB000'; // Желтый
    } else {
        indexColor = '#1DB954'; // Зеленый
    }

    indexValueEl.style.color = indexColor;
    indexValueEl.style.textShadow = `0 0 15px ${indexColor}66`;
    indexBarEl.style.background = indexColor;
    indexBarEl.style.boxShadow = `0 0 10px ${indexColor}aa`;

    // 3. ДИАГРАММА ПРИОРИТЕТОВ (Срочные - красные, Обычные - циановые)
    const priorityCtx = document.getElementById('priorityChart').getContext('2d');
    if (priorityChart) priorityChart.destroy();
    priorityChart = new Chart(priorityCtx, {
        type: 'bar',
        data: {
            labels: ['Срочные', 'Обычные'],
            datasets: [{
                label: 'Задач',
                data: [stats.urgent, stats.normal],
                backgroundColor: ['#941B1B', '#00E5FF'],
                borderRadius: 5
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false }, ticks: { color: '#555' } },
                y: { grid: { display: false }, ticks: { color: '#888' } }
            },
            plugins: { legend: { display: false } }
        }
    });

    // 4. БАЛАНС (Radar)
    const radarCtx = document.getElementById('radarChart');
    if (radarCtx) {
        if (radarChart) {
            radarChart.destroy();
        }

        const totalTasks = tasks.length || 1;
        const speedVal = index + 10;
        const accuracyVal = (stats.done / totalTasks) * 20;
        const loadVal = (stats.urgent / totalTasks) * 20;
        const focusVal = (stats.in_progress / totalTasks) * 20;
        const disciplineVal = Math.max(0, 10 - stats.overdue) * 2;

        radarChart = new Chart(radarCtx.getContext('2d'), {
            type: 'radar',
            data: {
                labels: ['КПД', 'Точность', 'Нагрузка', 'Фокус', 'Срок'],
                datasets: [{
                    data: [speedVal, accuracyVal, loadVal, focusVal, disciplineVal],
                    backgroundColor: 'rgba(0, 229, 255, 0.1)', // Твой циан с прозрачностью
                    borderColor: '#00E5FF',
                    pointBackgroundColor: '#00E5FF',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255, 255, 255, 0.05)' },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        pointLabels: { color: '#00E5FF', font: { size: 10 } },
                        ticks: { display: false, max: 20 },
                        suggestedMin: 0,
                        suggestedMax: 20
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
}

// В функции loadTasks, после renderTasksList(data.tasks), добавь:
// updateDashboard(data.tasks);

// --- ИНДИКАТОРЫ В ШАПКЕ ---

// 1. Загрузка имени пользователя (Фамилия + Инициалы)
function loadUserName() {
    const nameSpan = document.getElementById('header-user-name');
    const avatarEl = document.getElementById('header-avatar');
    if (!nameSpan) return;

    let fullName = localStorage.getItem('vortex_user_name');

    if (!fullName) {
        try {
            const token = localStorage.getItem('vortex_token');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                fullName = payload.full_name || payload.name || payload.username || 'Пользователь';
            }
        } catch (e) {
            console.error("Ошибка получения имени из токена:", e);
        }
    }

    fullName = fullName || 'Пользователь';

    // --- ФОРМАТИРОВАНИЕ: Имя Фамилия Отчество -> Фамилия И.О. ---
    const parts = fullName.trim().split(/\s+/);
    let displayName;
    let avatarLetter;

    if (parts.length >= 3) {
        // Нурсултан Султанов Даулетович -> Султанов Н.Д.
        const firstName = parts[0];      // Нурсултан
        const surname = parts[1];        // Султанов
        const patronymic = parts[2];     // Даулетович
        displayName = `${surname} ${firstName.charAt(0)}.${patronymic.charAt(0)}.`;
        avatarLetter = surname.charAt(0).toUpperCase();
    } else if (parts.length === 2) {
        // Нурсултан Султанов -> Султанов Н.
        const firstName = parts[0];
        const surname = parts[1];
        displayName = `${surname} ${firstName.charAt(0)}.`;
        avatarLetter = surname.charAt(0).toUpperCase();
    } else {
        // Только одно слово
        displayName = parts[0];
        avatarLetter = parts[0].charAt(0).toUpperCase();
    }

    nameSpan.textContent = displayName;

    if (avatarEl) {
        avatarEl.textContent = avatarLetter;
    }
}

// 2. Обновление даты и времени в индикаторе календаря
function updateCalendarIndicator() {
    const dateEl = document.getElementById('header-date');
    const timeEl = document.getElementById('header-time');
    if (!dateEl || !timeEl) return;

    const now = new Date();

    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const dayName = days[now.getDay()];
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    dateEl.textContent = `${dayName}, ${day}.${month}`;

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    timeEl.textContent = `${hours}:${minutes}:${seconds}`;
}

// 3. Открытие календаря (с сохранением истории)
function openCalendar() {
    // Сохраняем текущий URL для возврата
    sessionStorage.setItem('vortex_previous_page', window.location.href);
    window.location.href = '/calendar';
}

// 4. Обновление всех индикаторов
function updateIndicators() {
    loadUserName();
    updateCalendarIndicator();
}

// Запуск обновления времени каждую секунду
let calendarInterval = null;

function startCalendarIndicator() {
    updateCalendarIndicator();
    if (calendarInterval) clearInterval(calendarInterval);
    calendarInterval = setInterval(updateCalendarIndicator, 1000);
}