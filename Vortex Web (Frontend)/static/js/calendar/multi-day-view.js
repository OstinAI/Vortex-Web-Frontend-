// static/js/calendar/multi-day-view.js
// Многодневные режимы: 3 дня и Неделя

let currentMultiStartDate = new Date();
let isMultiCalendarLoading = false;
let currentAssigneeId = null;

// Добавь после глобальных переменных
let cachedTasks = null;
let lastFetchTime = 0;
const CACHE_TTL = 5000; // 5 секунд

// Синхронизируем currentAssigneeId с calendar.js
if (typeof window.currentAssigneeId === 'undefined') {
    window.currentAssigneeId = null;
}

// Функция для обновления переменной из calendar.js
window.updateAssigneeId = function (id) {
    currentAssigneeId = id;
    window.currentAssigneeId = id;
    // Очищаем кэш и перерисовываем
    cachedTasks = null;
    lastFetchTime = 0;
    if (document.getElementById("selectViewMode")?.value === '3days' ||
        document.getElementById("selectViewMode")?.value === 'week') {
        renderMultiDayView();
    }
};

// Функция для принудительного обновления кэша задач
async function refreshMultiCalendarData() {
    const mode = document.getElementById("selectViewMode")?.value;
    if (mode === '3days' || mode === 'week') {
        // Принудительно очищаем кэш
        cachedTasks = null;
        lastFetchTime = 0;
        await renderMultiDayView();
    }
}

// Функция загрузки задач с сервера (копия из day-view.js)
async function fetchAllTasksForMulti(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && cachedTasks && (now - lastFetchTime) < CACHE_TTL) {
        return cachedTasks;
    }

    const token = localStorage.getItem('vortex_token');
    if (!token) return [];

    try {
        let employeesList = [];
        try {
            const empRes = await fetch(`${API_BASE_URL}/api/employees/list`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (empRes.ok) {
                const empData = await empRes.json();
                if (empData && empData.status === 'ok' && Array.isArray(empData.employees)) {
                    employeesList = empData.employees;
                }
            }
        } catch (e) {
            console.error("Ошибка загрузки сотрудников:", e);
        }

        // ✅ ДОБАВЛЯЕМ ПАРАМЕТР assignee_id
        let assigneeParam = '';
        if (window.currentAssigneeId) {
            assigneeParam = `&assignee_id=${window.currentAssigneeId}`;
        }

        const res = await fetch(`${API_BASE_URL}/api/tasks/?limit=500&_t=${Date.now()}${assigneeParam}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache'
            }
        });

        if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.tasks)) {
                cachedTasks = data.tasks.map(t => {
                    const assigneesList = Array.isArray(t.assignees) ? t.assignees : [];
                    const assigneesNames = assigneesList.map(id => {
                        const u = employeesList.find(user => user && user.id == id);
                        return u ? (u.full_name || u.username || '') : '';
                    }).filter(n => n !== '');

                    return {
                        ...t,
                        assignees_names: assigneesNames,
                        calendar_type: t.client_id ? 'crm' : 'task'
                    };
                });
                lastFetchTime = now;
                return cachedTasks;
            }
        }
    } catch (e) {
        console.error("Ошибка загрузки задач:", e);
    }
    return cachedTasks || [];
}

// Получить ID текущего пользователя
function getCurrentUserId() {
    try {
        const token = localStorage.getItem('vortex_token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.user_id || payload.id;
        }
    } catch (e) {
        console.error("Ошибка парсинга токена:", e);
    }
    return null;
}

// Проверка, сегодня ли дата
function isDateToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
}

// Название месяца
function getMonthName(date) {
    const months = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
    return months[date.getMonth()];
}

// Форматирование часа
function formatHour(hour) {
    return `${hour.toString().padStart(2, '0')}:00`;
}

// Получить массив дат для отображения (локальная полночь)
function getDatesForMultiView(mode, startDate) {
    const dates = [];
    let base = new Date(startDate);
    base.setHours(0, 0, 0, 0); // обнуляем время

    if (mode === '3days') {
        for (let i = 0; i < 3; i++) {
            const date = new Date(base);
            date.setDate(base.getDate() + i);
            dates.push(date);
        }
    } else if (mode === 'week') {
        // Вычисляем понедельник недели, содержащей base
        const dayOfWeek = base.getDay(); // 0 = воскресенье
        const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
        const monday = new Date(base);
        monday.setDate(base.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            dates.push(date);
        }
    }
    return dates;
}

// Обновить заголовок
function updateMultiHeader(mode, dates) {
    const monthYearText = document.getElementById("currentMonthYear");
    if (!monthYearText) return;

    if (mode === '3days' && dates.length === 3) {
        const start = dates[0];
        const end = dates[2];
        const startDay = String(start.getDate()).padStart(2, '0');
        const endDay = String(end.getDate()).padStart(2, '0');
        monthYearText.textContent = `${startDay} ${getMonthName(start)} — ${endDay} ${getMonthName(end)} ${start.getFullYear()}`;
    } else if (mode === 'week' && dates.length === 7) {
        const start = dates[0];
        const end = dates[6];
        const startDay = String(start.getDate()).padStart(2, '0');
        const endDay = String(end.getDate()).padStart(2, '0');
        monthYearText.textContent = `${startDay} ${getMonthName(start)} — ${endDay} ${getMonthName(end)} ${start.getFullYear()}`;
    }
}

// Формат заголовка колонки
function formatDateHeader(date) {
    const days = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];
    const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1];
    const isToday = isDateToday(date);
    const todayClass = isToday ? 'style="color: #00E5FF; text-shadow: 0 0 5px rgba(0,229,255,0.5);"' : '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `<span ${todayClass}>${dayName}</span><br><span style="font-size: 11px; color: #708599;">${day}.${month}</span>`;
}

// Основная функция рендера
async function renderMultiDayView() {
    const grid = document.getElementById("calendarDaysGrid");
    const mode = document.getElementById("selectViewMode")?.value;

    if (!grid || (mode !== '3days' && mode !== 'week')) return;

    // Очистка
    grid.innerHTML = "";
    grid.className = "vortex-time-grid";
    grid.style.overflowY = "auto";
    grid.style.height = "100%";

    // Скрываем стандартный баннер
    const weekdaysBanner = document.querySelector(".weekdays-banner");
    if (weekdaysBanner) weekdaysBanner.style.display = "none";

    // Получаем даты
    const dates = getDatesForMultiView(mode, currentMultiStartDate);
    const daysCount = dates.length;

    // Обновляем заголовок
    updateMultiHeader(mode, dates);

    // Настройка сетки - убираем gap для сплошной полосы
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = `60px repeat(${daysCount}, 1fr)`;
    grid.style.gap = "0";  // убираем промежутки

    // Угловая ячейка
    const cornerCell = document.createElement("div");
    cornerCell.className = "time-header-cell";
    cornerCell.style.cssText = "background: #0f0f0f; border-bottom: 2px solid #333; padding: 10px; font-size: 12px; color: #666; text-align: center; position: sticky; top: 0; z-index: 100;";
    cornerCell.innerHTML = '<i class="fa-regular fa-clock"></i>';
    grid.appendChild(cornerCell);

    // Заголовки дней - сплошная полоса БЕЗ разделителей
    for (let i = 0; i < daysCount; i++) {
        const date = dates[i];
        const headerCell = document.createElement("div");
        headerCell.className = "time-header-cell";
        headerCell.style.cssText = "background: #0f0f0f; border-bottom: 2px solid #333; padding: 8px 5px; text-align: center; font-weight: bold; font-size: 13px; position: sticky; top: 0; z-index: 100;";
        // ❌ НЕТ borderRight - убираем разделители
        headerCell.innerHTML = formatDateHeader(date);
        grid.appendChild(headerCell);
    }

    // === ВРЕМЕННЫЕ СЛОТЫ ===
    for (let hour = 0; hour < 24; hour++) {
        // Ячейка времени
        const timeLabel = document.createElement("div");
        timeLabel.className = "time-label-cell";
        timeLabel.style.cssText = "height: 60px; border-bottom: 1px solid #222; display: flex; align-items: center; justify-content: center; color: #666; font-size: 11px; border-right: 1px solid var(--vortex-border); background: #050505;";
        timeLabel.textContent = formatHour(hour);
        grid.appendChild(timeLabel);

        // Слоты для каждого дня
        for (let dayIdx = 0; dayIdx < daysCount; dayIdx++) {
            const slot = document.createElement("div");
            slot.className = "time-slot-cell";
            slot.style.cssText = "height: 60px; border-bottom: 1px solid #222; border-left: 1px solid #222; position: relative; background: transparent;";

            // Сохраняем данные
            slot.setAttribute("data-day-index", dayIdx);
            slot.setAttribute("data-hour", hour);
            const year = dates[dayIdx].getFullYear();
            const month = String(dates[dayIdx].getMonth() + 1).padStart(2, '0');
            const day = String(dates[dayIdx].getDate()).padStart(2, '0');
            slot.setAttribute("data-date", `${year}-${month}-${day}`);
            slot.setAttribute("data-target-date", dates[dayIdx].getTime());

            // Drag-drop обработчики
            slot.ondragover = (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                slot.style.background = 'rgba(0, 229, 255, 0.1)';
            };

            slot.ondragleave = (e) => {
                slot.style.background = '';
            };

            slot.ondrop = async (e) => {
                e.preventDefault();
                slot.style.background = '';

                // Получаем ID задачи из dataTransfer
                const taskId = e.dataTransfer.getData('text/plain');
                if (!taskId) return;

                const targetDate = dates[dayIdx];
                const targetHour = hour;

                const newDate = new Date(targetDate);
                newDate.setHours(targetHour, 0, 0, 0);
                const newTimestamp = newDate.getTime();
                const now = new Date();

                if (newDate < now) {
                    alert('Нельзя переместить задачу в прошлое!');
                    return;
                }

                try {
                    const token = localStorage.getItem('vortex_token');
                    const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ start_ts_ms: newTimestamp })
                    });

                    if (response.ok) {
                        // После успешного перемещения обновляем вид
                        await refreshMultiDayView();  // используем вашу функцию обновления
                    } else {
                        alert('Ошибка при перемещении задачи');
                    }
                } catch (err) {
                    console.error('Ошибка:', err);
                    alert('Ошибка сети');
                }
            };

            // Закрываем меню сотрудников при клике на слот
            slot.onclick = (e) => {
                const assigneesMenu = document.getElementById('assigneesMenu');
                if (assigneesMenu) assigneesMenu.classList.remove('show');
            };

            grid.appendChild(slot);
        }
    }

    // Авто-скролл
    setTimeout(() => {
        const currentHour = new Date().getHours();
        const timeLabels = grid.querySelectorAll('.time-label-cell');
        if (timeLabels[currentHour]) {
            timeLabels[currentHour].scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
    }, 100);

    // Отрисовываем события
    await renderMultiDayEvents(dates);

    if (typeof window.refreshCurrentTimeLine === 'function') window.refreshCurrentTimeLine();
}

// Отрисовка событий — исправленная версия с поиском по атрибутам
async function renderMultiDayEvents(dates) {
    
    const grid = document.getElementById("calendarDaysGrid");
    const mode = document.getElementById("selectViewMode")?.value;

    if (!grid || (mode !== '3days' && mode !== 'week')) return;

    if (isMultiCalendarLoading) {
        console.log("Пропускаем рендер, уже загружается");
        return;
    }

    isMultiCalendarLoading = true;

    try {
        const allEvents = await fetchAllTasksForMulti();
        const scope = document.getElementById("selectUserScope")?.value || "all";
        const myId = getCurrentUserId();
        const daysCount = dates.length;

        // Создаём массив локальных строк дат (YYYY-MM-DD) для каждого дня
        const targetDateStrs = dates.map(d => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        });

        for (let dayIdx = 0; dayIdx < daysCount; dayIdx++) {
            const targetDateStr = targetDateStrs[dayIdx];

            for (let hour = 0; hour < 24; hour++) {
                // Находим слот по атрибутам (надёжно, без индексов)
                const slot = grid.querySelector(`.time-slot-cell[data-day-index='${dayIdx}'][data-hour='${hour}']`);
                if (!slot) continue;

                // Очищаем старые события
                slot.querySelectorAll('.events-wrapper').forEach(el => el.remove());

                const hourEvents = allEvents.filter(ev => {
                    let taskDateStr, taskHour, taskMinutes;

                    if (ev.start_ts_ms) {
                        const d = new Date(ev.start_ts_ms);
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        taskDateStr = `${year}-${month}-${day}`;
                        taskHour = d.getHours();
                        taskMinutes = d.getMinutes();
                    } else if (ev.date && ev.time) {
                        taskDateStr = ev.date;
                        taskHour = parseInt(ev.time.split(':')[0]);
                        taskMinutes = parseInt(ev.time.split(':')[1]) || 0;
                    } else {
                        return false;
                    }

                    if (taskDateStr !== targetDateStr || taskHour !== hour) return false;

                    if (scope === 'my') {
                        const isMyTask = ev.assignees && Array.isArray(ev.assignees) && myId && ev.assignees.includes(parseInt(myId));
                        if (!isMyTask) return false;
                    }

                    ev._taskMinutes = taskMinutes;
                    return true;
                });

                if (hourEvents.length === 0) continue;

                slot.style.position = 'relative';
                const wrapper = document.createElement("div");
                wrapper.className = "events-wrapper";
                wrapper.style.cssText = "position: absolute; width: 100%; height: 100%; top: 0; left: 0;";

                hourEvents.sort((a, b) => (a.start_ts_ms || 0) - (b.start_ts_ms || 0));

                hourEvents.forEach((ev, index) => {
                    const minutes = ev._taskMinutes || 0;
                    const topPercent = (minutes / 60) * 100;

                    const card = document.createElement("div");
                    card.className = `day-view-event ${ev.calendar_type || 'task'}-type`;

                    let taskTime;
                    if (ev.start_ts_ms) {
                        taskTime = new Date(ev.start_ts_ms);
                    } else if (ev.date && ev.time) {
                        const [year, month, day] = ev.date.split('-').map(Number);
                        const [hours, mins] = ev.time.split(':').map(Number);
                        taskTime = new Date(year, month - 1, day, hours, mins);
                    } else {
                        return;
                    }

                    const nowTime = new Date();
                    // Проверяем просрочку: если дата задачи меньше текущей И статус не done
                    const isTaskOverdue = (taskTime < nowTime && ev.status !== 'done');

                    // ОПРЕДЕЛЯЕМ ЦВЕТ: если просрочена ИЛИ статус overdue ИЛИ цвет уже красный
                    let taskColor;
                    if (isTaskOverdue || ev.status === 'overdue') {
                        taskColor = '#ff4d4d';
                    } else {
                        taskColor = ev.color || '#00E5FF';
                        if (!ev.color && ev.description) {
                            const match = ev.description.match(/\[color:\s*(#[0-9A-Fa-f]{6})\]/);
                            if (match) taskColor = match[1];
                        }
                    }

                    // Устанавливаем стили в зависимости от просрочки
                    if (isTaskOverdue || ev.status === 'overdue') {
                        // Для просроченных используем отдельные свойства, чтобы borderLeftWidth работала
                        card.style.borderLeftColor = '#ff4d4d';
                        card.style.borderLeftStyle = 'solid';
                        card.style.borderLeftWidth = '4px';
                        card.style.opacity = '0.9';
                        card.draggable = false;
                        card.classList.add('task-overdue');
                    } else {
                        card.draggable = true;
                        card.style.borderLeft = `4px solid ${taskColor}`;
                    }

                    card.setAttribute('data-task-id', ev.id);
                    card.setAttribute('data-original-start', ev.start_ts_ms || taskTime.getTime());

                    // Drag & drop
                    card.ondragstart = (e) => {
                        if (isTaskOverdue) {
                            e.preventDefault();
                            return false;
                        }
                        e.dataTransfer.setData('text/plain', ev.id);
                        e.dataTransfer.effectAllowed = 'move';
                        card.style.opacity = '0.5';
                    };
                    card.ondragend = () => {
                        card.style.opacity = '1';
                    };

                    const totalTasks = hourEvents.length;
                    const containerWidth = slot.clientWidth || 200;

                    let leftPos = 0;
                    let cardWidth = 'max-content';
                    let maxWidth = '300px';

                    if (totalTasks === 1) {
                        leftPos = 0;
                        cardWidth = 'max-content';
                        maxWidth = '300px';
                    } else {
                        const minCardWidth = 70;
                        const padding = 4;
                        const totalPadding = (totalTasks - 1) * padding;
                        const availableWidth = containerWidth - totalPadding;
                        let calculatedWidth = Math.floor(availableWidth / totalTasks);
                        calculatedWidth = Math.max(minCardWidth, Math.min(calculatedWidth, 180));
                        cardWidth = `${calculatedWidth}px`;
                        maxWidth = `${calculatedWidth}px`;
                        leftPos = index * (calculatedWidth + padding);
                    }

                    card.style.position = "absolute";
                    card.style.left = `${leftPos}px`;
                    card.style.top = `${topPercent}%`;
                    card.style.width = cardWidth;
                    card.style.maxWidth = maxWidth;
                    card.style.minWidth = totalTasks === 1 ? '120px' : '70px';
                    card.style.boxSizing = "border-box";
                    card.style.height = "auto";
                    card.style.paddingRight = "5px";
                    card.style.zIndex = 10 + index;
                    card.style.backgroundColor = "rgba(30, 30, 30, 0.75)";
                    card.style.backdropFilter = "blur(4px)";
                    card.style.transition = "all 0.2s ease";
                    card.style.cursor = "pointer";
                    card.style.borderRadius = "4px";
                    card.style.overflow = "hidden";
                    card.style.textOverflow = "ellipsis";
                    card.style.whiteSpace = "nowrap";
                    card.style.borderLeftWidth = "4px"; // Фиксируем начальную ширину

                    // Сохраняем исходные значения
                    const originalStyles = {
                        width: cardWidth,
                        maxWidth: maxWidth,
                        whiteSpace: 'nowrap',
                        zIndex: 10 + index,
                        backgroundColor: "rgba(30, 30, 30, 0.75)",
                        boxShadow: 'none',
                        overflow: 'hidden'
                    };

                    // Функция восстановления (только для нескольких задач)
                    function resetCard() {
                        if (totalTasks > 1 && card) {
                            card.style.width = originalStyles.width;
                            card.style.maxWidth = originalStyles.maxWidth;
                            card.style.whiteSpace = originalStyles.whiteSpace;
                            card.style.zIndex = originalStyles.zIndex;
                            card.style.backgroundColor = originalStyles.backgroundColor;
                            card.style.boxShadow = originalStyles.boxShadow;
                            card.style.overflow = originalStyles.overflow;
                        }
                        // Всегда возвращаем borderLeftWidth
                        card.style.borderLeftWidth = "4px";
                    }

                    // Функция расширения
                    function expandCard() {
                        if (totalTasks > 1 && card) {
                            card.style.width = 'auto';
                            card.style.maxWidth = '350px';
                            card.style.whiteSpace = 'normal';
                            card.style.zIndex = '9999';
                            card.style.backgroundColor = "#1a1a2e";
                            card.style.boxShadow = "0 4px 15px rgba(0,0,0,0.5)";
                            card.style.overflow = "visible";
                        }
                    }

                    // Обработчик движения мыши для неоновой области
                    card.onmousemove = (e) => {
                        const rect = card.getBoundingClientRect();
                        const mouseX = e.clientX - rect.left;
                        if (mouseX <= 14) {
                            card.style.borderLeftWidth = "14px";
                        } else {
                            card.style.borderLeftWidth = "4px";
                        }
                    };

                    // Обработчик наведения
                    card.onmouseenter = (e) => {
                        e.stopPropagation();
                        if (totalTasks > 1) {
                            expandCard();
                        }
                    };

                    // Обработчик ухода
                    card.onmouseleave = (e) => {
                        e.stopPropagation();
                        setTimeout(() => {
                            if (card && !card.matches(':hover')) {
                                resetCard();
                            }
                        }, 100);
                    };

                    // Обработчик клика (один, без дублей!)
                    card.onclick = (e) => {
                        e.stopPropagation();
                        const rect = card.getBoundingClientRect();
                        const mouseX = e.clientX - rect.left;
                        if (mouseX <= 14) {
                            if (typeof window.fetchAndOpenTaskModal === 'function') {
                                window.fetchAndOpenTaskModal(ev.id);
                            }
                        } else {
                            const clientId = ev.client_id || ev.customer_id || ev.lead_id;
                            if (clientId) window.location.href = `/Card.html?id=${clientId}`;
                        }
                    };

                    let shortName = "";
                    if (ev.assignees_names && ev.assignees_names[0]) {
                        const parts = ev.assignees_names[0].trim().split(/\s+/);
                        if (parts.length >= 3) shortName = `${parts[1]} ${parts[0][0]}. ${parts[2][0]}.`;
                        else if (parts.length === 2) shortName = `${parts[1]} ${parts[0][0]}.`;
                        else shortName = ev.assignees_names[0];
                    }

                    const timeString = `${String(taskTime.getHours()).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                    const titleText = ev.title || 'Задача';

                    card.innerHTML = `
    <div style="font-size: 11px; padding: 6px 8px; font-weight: 600; line-height: 1.3;">
        <div style="font-size: 12px; color: #FFF; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${escapeHtml(titleText)}
        </div>
        <div style="color: #AAA; font-size: 11px;">
            <span style="color: ${(isTaskOverdue || ev.status === 'overdue') ? '#ff4d4d' : taskColor};">${timeString}</span>
            ${shortName ? ` • ${escapeHtml(shortName)}` : ''}
        </div>
    </div>
`;

                    const isCompleted = ev.is_completed || ev.status === 'completed' || ev.status === 'done';
                    if (isCompleted) {
                        const likeIcon = document.createElement("img");
                        likeIcon.className = "card-like-gif";
                        likeIcon.style.cssText = "width: 40px; height: 40px; position: absolute; right: 5px; top: 50%; transform: translateY(-50%); cursor: pointer; z-index: 100;";
                        likeIcon.onclick = (e) => e.stopPropagation();
                        const tempImg = new Image();
                        tempImg.src = "/static/images/like.gif";
                        tempImg.onload = () => {
                            const canvas = document.createElement("canvas");
                            canvas.width = tempImg.naturalWidth || 40;
                            canvas.height = tempImg.naturalHeight || 40;
                            const ctx = canvas.getContext("2d");
                            ctx.drawImage(tempImg, 0, 0);
                            likeIcon.src = canvas.toDataURL("image/png");
                        };
                        card.appendChild(likeIcon);
                    }

                   

                    wrapper.appendChild(card);
                });

                slot.appendChild(wrapper);
            }
        }
    } catch (err) {
        console.error("Ошибка отрисовки событий:", err);
    } finally {
        isMultiCalendarLoading = false;
    }
}

// Экранирование HTML
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Навигация
function goToPrevMulti() {
    const mode = document.getElementById("selectViewMode")?.value;
    const shift = (mode === '3days') ? 3 : 7;
    currentMultiStartDate.setDate(currentMultiStartDate.getDate() - shift);
    renderMultiDayView();
}

function goToNextMulti() {
    const mode = document.getElementById("selectViewMode")?.value;
    const shift = (mode === '3days') ? 3 : 7;
    currentMultiStartDate.setDate(currentMultiStartDate.getDate() + shift);
    renderMultiDayView();
}

// Принудительное обновление многодневного календаря (3 дня или неделя)
async function refreshMultiDayView() {
    const mode = document.getElementById("selectViewMode")?.value;
    if (mode !== '3days' && mode !== 'week') return;

    // Сбрасываем кэш задач
    cachedTasks = null;
    lastFetchTime = 0;

    // Сбрасываем флаг загрузки
    isMultiCalendarLoading = false;

    // Перерисовываем
    await renderMultiDayView();
}

// Экспортируем глобально
window.refreshMultiDayView = refreshMultiDayView;

// Экспорт глобальных функций
window.renderMultiDayView = renderMultiDayView;
window.goToPrevMulti = goToPrevMulti;
window.goToNextMulti = goToNextMulti;

// Принудительное обновление многодневных режимов
window.forceRefreshMultiView = async function () {
    const mode = document.getElementById("selectViewMode")?.value;
    if (mode === '3days' || mode === 'week') {
        // Сбрасываем флаг и кэш
        isMultiCalendarLoading = false;
        if (typeof cachedTasks !== 'undefined') {
            window.cachedTasks = null;
        }
        // Перерисовываем
        await renderMultiDayView();
    }
};

// Инициализация
document.addEventListener("DOMContentLoaded", () => {
    const selectViewMode = document.getElementById("selectViewMode");
    if (selectViewMode) {
        selectViewMode.addEventListener("change", () => {
            const mode = selectViewMode.value;
            if (mode === '3days' || mode === 'week') {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                if (mode === 'week') {
                    const dayOfWeek = now.getDay();
                    const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
                    currentMultiStartDate = new Date(now);
                    currentMultiStartDate.setDate(now.getDate() + diffToMonday);
                } else {
                    currentMultiStartDate = now;
                }
                renderMultiDayView();
            }
        });
    }

    // Обновляем при смене области видимости
    const selectUserScope = document.getElementById("selectUserScope");
    if (selectUserScope) {
        selectUserScope.addEventListener("change", () => {
            const mode = selectViewMode?.value;
            if (mode === '3days' || mode === 'week') renderMultiDayView();
        });
    }

    const selectEmployee = document.getElementById("selectEmployee");
    if (selectEmployee) {
        selectEmployee.addEventListener("change", () => {
            const mode = selectViewMode?.value;
            if (mode === '3days' || mode === 'week') renderMultiDayView();
        });
    }
});

