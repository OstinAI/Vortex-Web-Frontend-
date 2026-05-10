let currentViewMode = 'my'; // 'my' или 'all'

// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ДЛЯ ЧИПСЕТА ---
let allUsersList = []; // Все загруженные пользователи
let selectedAssignees = []; // Массив ID выбранных сотрудников

// Глобальная переменная для управления календарем
let vortexDatePicker = null;

document.addEventListener('DOMContentLoaded', async () => {
    initResizer();
    checkPermissions();

    // --- ИНИЦИАЛИЗАЦИЯ КРУТОГО КАЛЕНДАРЯ ---
    vortexDatePicker = flatpickr("#task-deadline", {
        enableTime: true,
        dateFormat: "Y-m-d\\TH:i", // Формат, понятный бэкенду
        time_24hr: true,
        locale: "ru",
        theme: "dark",
        onReady: function (selectedDates, dateStr, instance) {
            // ТА САМАЯ МАГИЯ ДВОЙНОГО КЛИКА!
            instance.calendarContainer.addEventListener('dblclick', function (e) {
                // Если кликнули дважды по дню или времени — закрываем календарь
                if (e.target.classList.contains('flatpickr-day') || e.target.tagName === 'INPUT') {
                    instance.close();
                }
            });
        }
    });

    await loadUsersToTaskSelect();
    loadTasks();
});

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
    const myFullName = localStorage.getItem('vortex_user_name'); // Твоё ФИО

    const viewMode = document.getElementById('task-view-mode').value; // 'my' или 'all'
    const statusFilter = document.getElementById('filter-status').value;

    let url = `${API_BASE_URL}/api/tasks/?limit=100`;
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

            // --- КЛЮЧЕВАЯ ФИЛЬТРАЦИЯ НА ФРОНТЕНДЕ ---
            if (viewMode === 'my') {
                tasks = tasks.filter(t => {
                    // Ищем исполнителей в списке всех пользователей по ID из t.assignees
                    // и проверяем, совпадает ли их full_name с твоим
                    const assigneesForThisTask = (t.assignees || []).map(id => {
                        const user = allUsersList.find(u => u.id == id);
                        return user ? user.full_name : '';
                    });

                    // Задача подходит, если твоё ФИО есть в списке исполнителей
                    return assigneesForThisTask.includes(myFullName);
                });
            }

            // Дополнительная фильтрация по просрочке
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

    // Получаем ID текущего пользователя для проверки "своя/чужая" задача
    const myId = localStorage.getItem('vortex_user_id');

    if (tasks.length === 0) {
        container.innerHTML = '<div style="color:#666; padding:15px; text-align:center;">Задач не найдено</div>';
        return;
    }

    tasks.forEach(t => {
        const div = document.createElement('div');
        div.className = 'task-item';

        // --- ЛОГИКА ОПРЕДЕЛЕНИЯ ПРОСРОЧКИ ---
        const now = Date.now();
        const isOverdue = t.status !== 'done' && t.end_ts_ms && t.end_ts_ms < now;

        // --- ЛОГИКА ЦВЕТОВ (ПО ТВОЕМУ ЗАПРОСУ) ---
        let statusColor = '#ffffff'; // По умолчанию белый

        if (isOverdue) {
            statusColor = '#ff4444'; // Просроченные — КРАСНЫЙ
        } else if (t.status === 'done') {
            statusColor = '#00ff44'; // Выполненные — ЗЕЛЕНЫЙ
        } else if (t.status === 'in_progress') {
            statusColor = '#ffcc00'; // В работе — ЖЕЛТЫЙ
        } else if (t.assignees && !t.assignees.includes(parseInt(myId))) {
            statusColor = '#ffffff'; // Чужие (не мои) — БЕЛЫЙ
        }

        // Форматирование даты
        const dateStr = t.end_ts_ms
            ? new Date(t.end_ts_ms).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
            : '';

        // --- ПОИСК ИМЕНИ ИСПОЛНИТЕЛЯ ---
        let assigneeName = 'Не назначен';
        const idsToFind = t.assignees || [];
        if (idsToFind.length > 0) {
            assigneeName = idsToFind.map(id => {
                const u = allUsersList.find(user => user.id == id);
                // Если нет ФИО (full_name), берем логин (username)
                return u ? (u.full_name || u.username) : `ID: ${id}`;
            }).join(', ');
        }

        // --- ГЕНЕРАЦИЯ HTML КАРТОЧКИ ---
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

        // Добавляем полоску статуса слева
        div.style.borderLeft = `4px solid ${statusColor}`;

        // Плавное свечение для активных и просроченных задач
        if (t.status === 'in_progress' || isOverdue) {
            div.style.boxShadow = `inset 5px 0 15px -5px ${statusColor}44`;
        }

        div.onclick = () => fetchAndOpenTaskModal(t.id);
        container.appendChild(div);
    });
}

// --- СКАЧИВАНИЕ И СРАЗУ ОТКРЫТИЕ МОДАЛКИ (Без левой панели) ---
async function fetchAndOpenTaskModal(taskId) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await res.json();

        if (data.ok && data.task) {
            window.currentViewedTask = data.task;
            openTaskModalForEdit(data.task.id);
        }
    } catch (e) {
        // УДАЛИЛИ ALERT! Если интернет моргнул, окно просто не вылезет,
        // но бесящего сообщения на весь экран больше не будет.
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
    document.getElementById('task-priority').value = 'normal';

    // Очищаем чипы при создании новой задачи
    selectedAssignees = [];
    renderAssigneeChips();

    // Очищаем наш новый календарь
    if (vortexDatePicker) vortexDatePicker.clear();

    // Скрываем выбор статуса при создании
    document.getElementById('status-group').style.display = 'none';

    document.getElementById('modal-task-create').style.display = 'block';
}

function openTaskModalForEdit(taskId) {
    const t = window.currentViewedTask;
    if (!t || t.id !== taskId) return;

    document.getElementById('edit-task-id').value = t.id;
    document.getElementById('task-modal-title').innerText = 'РЕДАКТИРОВАНИЕ ЗАДАЧИ';

    document.getElementById('task-title').value = t.title || '';
    document.getElementById('task-desc').value = t.description || '';
    document.getElementById('task-priority').value = t.priority || 'normal';

    const statusGroup = document.getElementById('status-group');
    if (statusGroup) statusGroup.style.display = 'block';
    document.getElementById('task-status').value = t.status || 'open';

    if (t.end_ts_ms) {
        // Конвертация timestamp -> datetime-local format
        const tzoffset = (new Date()).getTimezoneOffset() * 60000;
        const localISOTime = (new Date(t.end_ts_ms - tzoffset)).toISOString().slice(0, 16);

        // Устанавливаем дату в наш новый календарь
        if (vortexDatePicker) vortexDatePicker.setDate(localISOTime);
    } else {
        if (vortexDatePicker) vortexDatePicker.clear();
    }

    // --- ИСПРАВЛЕНИЕ БАГА "ID: undefined" ---
    // Сервер присылает t.assignees как массив чисел: [21, 22]
    if (Array.isArray(t.assignees)) {
        // Проверяем, прислал ли сервер объекты или просто числа
        if (t.assignees.length > 0 && typeof t.assignees[0] === 'object') {
            selectedAssignees = t.assignees.map(a => a.user_id || a.id);
        } else {
            selectedAssignees = t.assignees; // Берем просто числа [21]
        }
    } else if (Array.isArray(t.assignee_user_ids)) {
        selectedAssignees = t.assignee_user_ids;
    } else {
        selectedAssignees = [];
    }

    // Рендерим чипсы с правильными ID
    renderAssigneeChips();

    document.getElementById('modal-task-create').style.display = 'block';
}

function closeTaskModal() {
    document.getElementById('modal-task-create').style.display = 'none';
}

// --- СОХРАНЕНИЕ / СОЗДАНИЕ ---
async function saveTask() {
    const editId = document.getElementById('edit-task-id').value;
    const title = document.getElementById('task-title').value.trim();
    const desc = document.getElementById('task-desc').value.trim();
    let deadlineStr = document.getElementById('task-deadline').value;
    const priority = document.getElementById('task-priority').value;

    const selectedUsers = selectedAssignees;

    if (!title) {
        console.warn("Укажите название задачи");
        document.getElementById('task-title').focus();
        return;
    }

    if (selectedUsers.length === 0) {
        console.warn("Выберите исполнителя");
        return;
    }

    const token = localStorage.getItem('vortex_token');

    // Переводим дату из Flatpickr в миллисекунды для бэкенда
    const deadlineMs = deadlineStr ? new Date(deadlineStr).getTime() : null;

    const payload = {
        title: title,
        description: desc,
        end_ts_ms: deadlineMs,
        priority: priority,
        // ИСПРАВЛЕНИЕ 1: Бэкенд ждет именно "assignees"
        assignees: selectedUsers
    };

    let url = `${API_BASE_URL}/api/tasks/`;
    let method = 'POST';

    if (editId) {
        url = `${API_BASE_URL}/api/tasks/${editId}`;
        payload.status = document.getElementById('task-status').value;
    }

    try {
        // 1. Сохраняем саму задачу (текст, дедлайн, статус)
        const res = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (data.ok) {

            // ИСПРАВЛЕНИЕ 2: Если это РЕДАКТИРОВАНИЕ, нужно отправить отдельный запрос 
            // на специальный роут твоего бэкенда для обновления ответственных
            if (editId) {
                await fetch(`${API_BASE_URL}/api/tasks/${editId}/assignees`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ assignees: selectedUsers })
                });
            }

            closeTaskModal();
            loadTasks(); // Обновляем список, теперь имена точно появятся
        } else {
            console.error("Ошибка от сервера:", data.message);
        }
    } catch (e) {
        console.error("Сбой сети при сохранении задачи:", e);
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