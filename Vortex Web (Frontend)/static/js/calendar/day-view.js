// day-view.js

let liveClockInterval = null;
let currentDisplayDate = new Date();

// Переменные для drag-and-drop
let draggedCard = null;
let dragStartTime = null;
let dragStartClientY = 0;
let dragStartTop = 0;

// Функция для округления времени до 15 минут
function roundTo15Minutes(date) {
    const minutes = date.getMinutes();
    const remainder = minutes % 15;
    if (remainder === 0) return date;

    const newDate = new Date(date);
    if (remainder < 8) {
        newDate.setMinutes(minutes - remainder);
    } else {
        newDate.setMinutes(minutes + (15 - remainder));
    }
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    return newDate;
}

// Функция для проверки, можно ли переместить задачу (только в будущее)
function canMoveToTime(newDate, originalStartTsMs) {
    const now = new Date();
    const originalDate = new Date(originalStartTsMs);

    // Нельзя переместить в прошлое относительно текущего момента
    if (newDate < now) {
        return false;
    }
    return true;
}

// Функция проверки, просрочена ли задача
function isTaskOverdue(task) {
    const now = new Date();
    const taskDate = new Date(task.start_ts_ms || task.end_ts_ms);
    const isCompleted = task.status === 'done' || task.is_completed;

    // Если задача выполнена - не считается просроченной
    if (isCompleted) return false;

    // Если дата задачи меньше текущей - просрочена
    return taskDate < now;
}

function renderDayView() {
    const grid = document.getElementById("calendarDaysGrid");
    if (!grid) return;

    // Очистка и настройка
    if (typeof liveClockInterval !== 'undefined') clearInterval(liveClockInterval);
    grid.innerHTML = "";
    grid.className = "vortex-time-grid";
    grid.style.gridTemplateColumns = "80px 1fr";

    // Используем currentDisplayDate
    const now = currentDisplayDate;
    const currentHour = now.getHours();

    // Пустой угол (первая ячейка)
    grid.appendChild(document.createElement("div"));

    // Создаем контейнер для заголовка с датой (без стрелок)
    const header = document.createElement("div");
    header.className = "time-header-cell";
    header.id = "live-day-clock";
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "center";
    header.style.gap = "10px";
    header.style.padding = "5px 10px";
    header.style.position = "sticky";
    header.style.top = "0";
    header.style.zIndex = "100";
    header.style.background = "#0f0f0f";

    const dateSpan = document.createElement("span");
    dateSpan.style.fontWeight = "bold";
    dateSpan.style.fontSize = "14px";

    header.appendChild(dateSpan);
    grid.appendChild(header);

    // Обновление даты
    const updateDateDisplay = () => {
        const dateStr = currentDisplayDate.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        dateSpan.textContent = dateStr.toUpperCase();

        // Обновляем верхнюю панель (рядом с логотипом)
        const topMonthYear = document.getElementById("currentMonthYear");
        if (topMonthYear) {
            topMonthYear.textContent = dateStr.toUpperCase();
        }
    };
    updateDateDisplay();

    // Сетка времени (0-23)
    for (let h = 0; h < 24; h++) {
        const timeLabel = document.createElement("div");
        timeLabel.className = "time-label";
        timeLabel.textContent = `${h}:00`;
        grid.appendChild(timeLabel);

        const slot = document.createElement("div");
        slot.className = "time-slot";
        if (h === currentHour) slot.id = "current-time-slot";
        grid.appendChild(slot);
    }

    // Авто-скролл
    setTimeout(() => {
        const el = document.getElementById("current-time-slot");
        if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 100);

    // Запускаем отрисовку событий
    if (typeof renderDayEvents === 'function') renderDayEvents();

    if (typeof window.refreshCurrentTimeLine === 'function') window.refreshCurrentTimeLine();
}

// Функции навигации
function goToPrevDay() {
    currentDisplayDate.setDate(currentDisplayDate.getDate() - 1);
    renderDayView();
}

function goToNextDay() {
    currentDisplayDate.setDate(currentDisplayDate.getDate() + 1);
    renderDayView();
}

function goToToday() {
    currentDisplayDate = new Date();
    renderDayView();
}

window.goToPrevDay = goToPrevDay;
window.goToNextDay = goToNextDay;
window.goToToday = goToToday;


// Глобальная переменная-флаг для предотвращения одновременных запросов
let isCalendarLoading = false;

// 1. Функция получения данных (С обходом кэширования браузера!)
async function fetchAllCalendarEvents(forceRefresh = false) {
    const token = localStorage.getItem('vortex_token');
    if (!token) return [];

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

    const allTasksMap = new Map();

    try {
        let assigneeParam = '';
        if (window.currentAssigneeId) {
            assigneeParam = `&assignee_id=${window.currentAssigneeId}`;
        }
        console.log("Запрос задач с assignee_id:", assigneeParam);

        const res = await fetch(`${API_BASE_URL}/api/tasks/?limit=500&_t=${Date.now()}${assigneeParam}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache'
            }
        });

        if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.tasks)) {
                data.tasks.forEach(t => {
                    if (t && t.id) allTasksMap.set(t.id, t);
                });
            }
        }
    } catch (e) {
        console.error("Ошибка загрузки общего пула:", e);
    }

    try {
        if (Array.isArray(employeesList) && employeesList.length > 0) {
            const primaryEmployees = employeesList.slice(0, 10);
            await Promise.all(primaryEmployees.map(async (emp) => {
                if (!emp || !emp.id) return;
                try {
                    const r = await fetch(`${API_BASE_URL}/api/tasks/?limit=100&assignee_id=${emp.id}&_t=${Date.now()}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (r.ok) {
                        const d = await r.json();
                        if (d && Array.isArray(d.tasks)) {
                            d.tasks.forEach(t => {
                                if (t && t.id && !allTasksMap.has(t.id)) allTasksMap.set(t.id, t);
                            });
                        }
                    }
                } catch (err) { }
            }));
        }
    } catch (e) {
        console.error("Ошибка циклического сбора:", e);
    }

    try {
        const finalTasksArray = Array.from(allTasksMap.values());

        return finalTasksArray.map(t => {
            if (!t) return null;

            const assigneesList = Array.isArray(t.assignees) ? t.assignees : [];
            const assigneesNames = assigneesList.map(id => {
                const u = employeesList.find(user => user && user.id == id);
                return u ? (u.full_name || u.username || '') : '';
            }).filter(n => n !== '');

            const isCrmTask = !!(t.client_id || t.crm_client_id || t.pipeline_id || t.client_name);

            return {
                ...t,
                assignees_names: assigneesNames,
                calendar_type: isCrmTask ? 'crm' : 'task'
            };
        }).filter(item => item !== null);
    } catch (e) {
        return [];
    }
}

// 2. Функция отрисовки (С ИСПРАВЛЕННЫМ ВРЕМЕНЕМ!)
async function renderDayEvents() {
    const grid = document.getElementById("calendarDaysGrid");
    const currentMode = document.getElementById("selectViewMode")?.value || "";
    if (!grid || currentMode !== 'day') return;

    if (isCalendarLoading) return;
    isCalendarLoading = true;

    const selectEmployee = document.getElementById("selectEmployee");
    console.log("renderDayEvents вызван, window.currentAssigneeId =", window.currentAssigneeId);

    try {
        const allEvents = await fetchAllCalendarEvents();

        // 🔥 ИСПРАВЛЕНО: используем currentDisplayDate вместо new Date()
        const targetYear = currentDisplayDate.getFullYear();
        const targetMonth = currentDisplayDate.getMonth();
        const targetDate = currentDisplayDate.getDate();

        console.log("Текущая отображаемая дата:", currentDisplayDate);
        console.log("Фильтр по дате:", targetYear, targetMonth + 1, targetDate);

        const scope = document.getElementById("selectUserScope")?.value || "all";
        const employeeId = document.getElementById("selectEmployee")?.value || "";
        const myFullName = localStorage.getItem('vortex_user_name');

        const slots = grid.querySelectorAll(".time-slot");

        slots.forEach((slot, h) => {
            // 🔥 ДОБАВИТЬ ОБРАБОТЧИКИ DROP НА СЛОТ
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

                if (!draggedCard) return;

                const taskId = draggedCard.getAttribute('data-task-id');
                const originalStart = parseInt(draggedCard.getAttribute('data-original-start'));
                const originalHour = parseInt(draggedCard.getAttribute('data-original-hour'));
                const originalMinute = parseInt(draggedCard.getAttribute('data-original-minute'));

                const targetHour = h;
                const rect = slot.getBoundingClientRect();
                const mouseY = e.clientY - rect.top;
                const slotHeight = rect.height;
                let targetMinutes = Math.floor((mouseY / slotHeight) * 60);

                targetMinutes = 0;

                const newDate = new Date(currentDisplayDate);
                newDate.setHours(targetHour, 0, 0, 0);
                const newTimestamp = newDate.getTime();
                const now = new Date();

                if (newDate < now) {
                    alert('Нельзя переместить задачу в прошлое!');
                    return;
                }

                if (originalHour === targetHour && originalMinute === targetMinutes) return;

                try {
                    const token = localStorage.getItem('vortex_token');

                    // 1. Обновляем время в Vortex
                    const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ start_ts_ms: newTimestamp })
                    });

                    if (response.ok) {
                        // ✅ СНАЧАЛА МГНОВЕННО ОБНОВЛЯЕМ ИНТЕРФЕЙС
                        renderDayView();

                        // 🔄 ПОТОМ В ФОНЕ ОБНОВЛЯЕМ GOOGLE (НЕ БЛОКИРУЕМ)
                        try {
                            const taskRes = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            const taskData = await taskRes.json();
                            const googleEventId = taskData.task?.google_event_id;

                            if (googleEventId) {
                                console.log("🔄 Обновляем время в Google Calendar для события:", googleEventId);
                                fetch(`${API_BASE_URL}/api/v1/google/event/${googleEventId}`, {
                                    method: 'PUT',
                                    headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        start_ts_ms: newTimestamp,
                                        duration: 30
                                    })
                                }).then(response => {
                                    if (response.ok) {
                                        console.log("✅ Время в Google Calendar обновлено");
                                    } else {
                                        console.error("❌ Ошибка обновления Google:", response.status);
                                    }
                                }).catch(err => console.error("Ошибка сети Google:", err));
                            } else {
                                console.log("⚠️ Нет google_event_id, Google не обновлён");
                            }
                        } catch (googleErr) {
                            console.error("Ошибка синхронизации с Google:", googleErr);
                        }
                    } else {
                        alert('Ошибка при перемещении задачи');
                    }
                } catch (err) {
                    console.error('Ошибка:', err);
                    alert('Ошибка сети');
                }
            };


            slot.querySelectorAll('.events-wrapper').forEach(el => el.remove());

            const filtered = allEvents.filter(ev => {
                const timestamp = ev.end_ts_ms || ev.start_ts_ms;
                if (!timestamp || timestamp === 0) return false;
                const dateObj = new Date(timestamp);
                if (dateObj.getFullYear() !== targetYear ||
                    dateObj.getMonth() !== targetMonth ||
                    dateObj.getDate() !== targetDate ||
                    dateObj.getHours() !== h) {
                    return false;
                }

                // Фильтрация по выбранному сотруднику (когда область видимости = "все задачи компании")
                if (scope === 'all' && selectEmployee && selectEmployee.value !== "") {
                    const selectedEmpId = parseInt(selectEmployee.value);
                    if (!ev.assignees || !ev.assignees.includes(selectedEmpId)) {
                        return false;
                    }
                }

                // Фильтрация "Мои задачи"
                if (scope === 'my') {
                    let myId = null;
                    try {
                        const token = localStorage.getItem('vortex_token');
                        if (token) {
                            const payload = JSON.parse(atob(token.split('.')[1]));
                            myId = payload.user_id || payload.id;
                        }
                    } catch (e) { }
                    const isMyTask = ev.assignees && Array.isArray(ev.assignees) && myId && ev.assignees.includes(parseInt(myId));
                    if (!isMyTask) return false;
                }

                return true;
            });

            if (filtered.length > 0) {
                slot.style.position = 'relative';

                const wrapper = document.createElement("div");
                wrapper.className = "events-wrapper";
                wrapper.style.position = "absolute";
                wrapper.style.width = "100%";
                wrapper.style.height = "100%";
                wrapper.style.top = "0";
                wrapper.style.left = "0";

                // 1. Сначала СОРТИРУЕМ задачи по времени (от ранних к поздним)
                filtered.sort((a, b) => {
                    const timeA = a.end_ts_ms || a.start_ts_ms;
                    const timeB = b.end_ts_ms || b.start_ts_ms;
                    return timeA - timeB;
                });

                // 2. Теперь рисуем их по порядку
                filtered.forEach((ev, index) => {
                    const timestamp = ev.end_ts_ms || ev.start_ts_ms;
                    const dateObj = new Date(timestamp);
                    const minutes = dateObj.getMinutes();

                    const card = document.createElement("div");
                    card.className = `day-view-event ${ev.calendar_type}-type`;

                    // Проверка на просрочку
                    const nowTime = new Date();
                    const taskTime = new Date(ev.start_ts_ms);
                    const isTaskOverdue = (taskTime < nowTime && ev.status !== 'done' && ev.status !== 'overdue');

                    // 🔥 АВТОМАТИЧЕСКИ МЕНЯЕМ СТАТУС И ЦВЕТ, ЕСЛИ ЗАДАЧА ПРОСРОЧЕНА
                    if (isTaskOverdue) {
                        ev.status = 'overdue';
                        ev.color = '#ff4d4d';

                        // Отправляем обновление на сервер (асинхронно, не блокируя отрисовку)
                        fetch(`${API_BASE_URL}/api/tasks/${ev.id}`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ status: 'overdue' })
                        }).catch(err => console.error("Ошибка обновления статуса на просрочен:", err));
                    }

                    // Если задача уже просрочена, но цвета нет — добавляем красный
                    if ((ev.status === 'overdue' || (taskTime < nowTime && ev.status !== 'done')) && !ev.color) {
                        ev.color = '#ff4d4d';
                    }

                    // Делаем карточку перетаскиваемой
                    if (isTaskOverdue) {
                        card.draggable = false;
                        card.style.cursor = 'not-allowed';
                        card.style.opacity = '0.7';
                        card.style.borderLeft = '4px solid #ff4d4d';
                        card.classList.add('task-overdue');
                    } else {
                        card.draggable = true;
                    }

                    card.setAttribute('data-task-id', ev.id);
                    card.setAttribute('data-original-start', ev.start_ts_ms);
                    card.setAttribute('data-original-hour', dateObj.getHours());
                    card.setAttribute('data-original-minute', minutes);

                    // Начало перетаскивания
                    card.ondragstart = (e) => {
                        // Проверка на просрочку
                        const nowTime = new Date();
                        const taskTime = new Date(ev.start_ts_ms);
                        if (taskTime < nowTime && ev.status !== 'done') {
                            e.preventDefault();
                            return false;
                        }
                        draggedCard = card;
                        dragStartTime = ev.start_ts_ms;
                        e.dataTransfer.setData('text/plain', ev.id);
                        e.dataTransfer.effectAllowed = 'move';
                        card.style.opacity = '0.5';
                    };

                    card.ondragend = (e) => {
                        if (draggedCard) {
                            draggedCard.style.opacity = '1';
                            draggedCard = null;
                        }
                    };

                    // Разрешаем сброс на временные слоты
                    card.ondragover = (e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                    };

                    // Позиция: 
                    // baseTop — это "полка" часа.
                    const baseTop = Math.floor((minutes / 60) * 100);

                    card.style.position = "absolute";

                    // ДИНАМИЧЕСКИЙ РАСЧЕТ ДЛЯ ИДЕАЛЬНОГО СЖАТИЯ ЛЕСТНИЦЫ:
                    const totalTasks = filtered.length;
                    const containerWidth = slot.clientWidth || 1000; // Берем реальную ширину слота

                    // Вычисляем оптимальный шаг смещения, учитывая зазор 10px
                    let stepPx = 190; // Стандартный шаг (180px ширина + 10px зазор)
                    if ((totalTasks - 1) * 190 + 180 > containerWidth) {
                        // Если не влезает, уплотняем шаг, чтобы последняя задача встала ровно в правый край
                        stepPx = (containerWidth - 180) / (totalTasks - 1 || 1);
                    }

                    // Позиция X: строго по вычисленному шагу
                    card.style.left = `${index * stepPx}px`;

                    card.style.top = `calc(${baseTop}% + ${index * 20}px)`;

                    // ========================================================
                    // ЖЕСТКОЕ ИСПРАВЛЕНИЕ ВЫСОТЫ И ШИРИНЫ (ОБНОВЛЕНО)
                    // ========================================================
                    card.style.width = "max-content";

                    // Если задач слишком много, уменьшаем maxWidth, чтобы они не перекрывали друг друга полностью
                    const calculatedMaxWidth = Math.max(stepPx - 10, 120);
                    card.style.maxWidth = totalTasks > 3 ? `${calculatedMaxWidth}px` : "300px";

                    card.style.minWidth = totalTasks > 5 ? "120px" : "180px"; // Даем сжаться сильнее, если задач куча
                    card.style.boxSizing = "border-box";

                    // Позволяем внутреннему div с padding: 6px 8px задавать высоту
                    card.style.height = "auto";
                    card.style.paddingRight = "55px"; // Место справа под иконку 50px + отступ
                    // ========================================================

                    card.style.zIndex = 10 + index;

                    // ========================================================
                    // ДИНАМИЧЕСКИЙ ПОДБОР ЦВЕТА ИЗ COLORS.JS ПО СТАТУСУ ЗАДАЧИ
                    // ========================================================
                    // Передаем статус текущей задачи (ev.status) в наш новый модуль цветов.
                    // Если у задачи есть флаг ev.is_completed, принудительно красим в выполненную.
                    const currentStatus = ev.is_completed ? 'done' : (ev.status || 'open');
                    let statusColor = window.VortexColors.getStatusColor(currentStatus);

                    // Применяем динамический цвет к левой неоновой полоске карточки
                    card.style.borderLeft = `4px solid ${statusColor}`;

                    card.style.borderLeft = `4px solid ${statusColor}`;

                    const titleText = ev.title || 'Задача';
                    const timeString = `${String(dateObj.getHours()).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

                    // Получаем имя сотрудника, закрепленного за задачей (берем первого из списка, если их несколько)
                    const rawName = ev.assignees_names && ev.assignees_names[0] ? ev.assignees_names[0] : "";
                    let shortName = "";

                    if (rawName) {
                        const parts = rawName.trim().split(/\s+/); // Разбиваем "Иванов Иван Иванович" по пробелам
                        if (parts.length >= 3) {
                            // Если есть Фамилия, Имя, Отчество -> делаем "Имя Ф. О."
                            // parts[0] - Фамилия, parts[1] - Имя, parts[2] - Отчество
                            shortName = `${parts[1]} ${parts[0][0]}. ${parts[2][0]}.`;
                        } else if (parts.length === 2) {
                            // Если только Фамилия и Имя -> "Имя Ф."
                            shortName = `${parts[1]} ${parts[0][0]}.`;
                        } else {
                            // Если имя в базе странное или одно слово
                            shortName = rawName;
                        }
                    }

                    // Определяем цвет задачи
                    let taskColor = ev.color || '#00E5FF';

                    // Если нет поля color, парсим из description
                    if (!ev.color && ev.description) {
                        const colorMatch = ev.description.match(/\[color:\s*(#[0-9A-Fa-f]{6})\]/);
                        if (colorMatch) {
                            taskColor = colorMatch[1];
                        }
                    }

                    // Если всё равно нет цвета, берем по статусу
                    if (!taskColor || taskColor === '#00E5FF') {
                        const currentStatus = ev.is_completed ? 'done' : (ev.status || 'open');
                        taskColor = window.VortexColors.getStatusColor(currentStatus);
                    }

                    card.style.borderLeft = `4px solid ${taskColor}`;

                    // Теперь собираем красивую карточку в две строки
                    card.innerHTML = `
    <div style="font-size: 11px; padding: 6px 8px; font-weight: 600; line-height: 1.3;">
        <div style="font-size: 12px; color: #FFF; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${titleText}
        </div>
        
        <div style="color: #AAA; font-size: 11px;">
            <span style="color: ${taskColor}; font-family: monospace; font-weight: 700;">${timeString}</span>
            ${shortName ? ` • ${shortName}` : ''}
        </div>
    </div>
`;

                    // Базовый фон карточки (если он еще не задан в другом месте вашего кода)
                    // Base background for the card
                    card.style.backgroundColor = "rgba(30, 30, 30, 0.75)";
                    card.style.backdropFilter = "blur(4px)";

                    // Добавили border-left-width в transition для его собственной плавной анимации
                    card.style.transition = "all 0.25s cubic-bezier(0.4, 0, 0.2, 1), border-left-width 0.15s ease";
                    card.style.cursor = "pointer";

                    // Добавили border-left-width в transition для его собственной плавной анимации
                    card.style.transition = "all 0.25s cubic-bezier(0.4, 0, 0.2, 1), border-left-width 0.15s ease";
                    card.style.cursor = "pointer";

                    // ==========================================
                    // БЛОК С ГИФКОЙ ДЛЯ ВЫПОЛНЕННЫХ ЗАДАЧ
                    // ==========================================
                    const isCompleted = ev.is_completed || ev.status === 'completed' || ev.status === 'done';

                    if (isCompleted) {
                        const likeIcon = document.createElement("img");
                        likeIcon.className = "card-like-gif";

                        // Функция генерации статики из первого кадра гифки
                        const setStaticFrame = (imgElement) => {
                            const tempImg = new Image();
                            tempImg.src = "/static/images/like.gif";
                            tempImg.onload = () => {
                                const canvas = document.createElement("canvas");
                                canvas.width = tempImg.naturalWidth || 40;
                                canvas.height = tempImg.naturalHeight || 40;
                                const ctx = canvas.getContext("2d");
                                ctx.drawImage(tempImg, 0, 0);

                                if (!imgElement.dataset.hovered) {
                                    imgElement.src = canvas.toDataURL("image/png");
                                }
                            };
                        };

                        // Инициализируем первый кадр
                        setStaticFrame(likeIcon);

                        likeIcon.style.width = "50px";
                        likeIcon.style.height = "50px";
                        likeIcon.style.position = "absolute";
                        likeIcon.style.right = "5px"; // Чуть прижали к правому краю

                        // ИДЕАЛЬНОЕ ЦЕНТРИРОВАНИЕ ПО ВЕРТИКАЛИ:
                        likeIcon.style.top = "0";
                        likeIcon.style.bottom = "0";
                        likeIcon.style.margin = "auto 0";

                        // УБРАЛИ translateY, чтобы не ломать высоту контейнера
                        likeIcon.style.transform = "scale(1)";
                        likeIcon.style.transition = "transform 0.2s ease";
                        likeIcon.style.cursor = "pointer";
                        likeIcon.style.zIndex = "100";

                        likeIcon.onclick = (e) => {
                            e.stopPropagation();
                        };

                        card.appendChild(likeIcon);
                        // УДАЛЕНО: card.style.position = "relative"; (она ломала абсолютное позиционирование лестницы)
                    }
                    // ==========================================
                    // КОНЕЦ БЛОКА С ГИФКОЙ
                    // ==========================================

                    // Эффект при наведении мыши на КАРТОЧКУ
                    card.onmouseenter = () => {
                        card.style.transform = "translateY(-4px) scale(1.02)";
                        card.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.5)";
                        card.style.backgroundColor = "#0b0b0b";
                        card.style.filter = "brightness(1.1)";
                        card.style.zIndex = 999;

                        // Включаем анимацию GIF с обнулением кэша
                        const img = card.querySelector(".card-like-gif");
                        if (img) {
                            img.dataset.hovered = "true";
                            img.src = "/static/images/like.gif?t=" + Date.now();
                            img.style.transform = "scale(1.15)";
                        }
                    };

                    // Проверяем, где именно находится мышка
                    card.onmousemove = (e) => {
                        const rect = card.getBoundingClientRect();
                        const mouseX = e.clientX - rect.left;

                        if (mouseX <= 14) {
                            card.style.borderLeftWidth = "14px";
                        } else {
                            card.style.borderLeftWidth = "4px";
                        }
                    };

                    // Возвращаем всё назад, когда мышку убрали с карточки
                    card.onmouseleave = () => {
                        card.style.transform = "translateY(0) scale(1)";
                        card.style.boxShadow = "none";
                        card.style.backgroundColor = "rgba(30, 30, 30, 0.75)";
                        card.style.filter = "brightness(1)";
                        card.style.zIndex = 10 + index;
                        card.style.borderLeftWidth = "4px";

                        // ИСПРАВЛЕНО: Явно подтверждаем размеры, чтобы они не сбрасывались
                        card.style.width = "max-content";
                        card.style.minWidth = "180px";

                        // Возвращаем программную статику обратно
                        const img = card.querySelector(".card-like-gif");
                        if (img) {
                            img.removeAttribute("data-hovered");
                            img.style.transform = "scale(1)";

                            // Отрисовываем заново
                            const tempImg = new Image();
                            tempImg.src = "/static/images/like.gif";
                            tempImg.onload = () => {
                                const canvas = document.createElement("canvas");
                                canvas.width = tempImg.naturalWidth || 40;
                                canvas.height = tempImg.naturalHeight || 40;
                                const ctx = canvas.getContext("2d");
                                ctx.drawImage(tempImg, 0, 0);
                                img.src = canvas.toDataURL("image/png");
                            };
                        }
                    };

                    // --- КЛИК НА НЕОНОВУЮ ОБЛАСТЬ ---
                    card.onclick = (e) => {
                        e.stopPropagation(); // Чтобы клик не проваливался на сетку календаря

                        const rect = card.getBoundingClientRect();
                        const mouseX = e.clientX - rect.left; // Получаем точную позицию курсора по оси X

                        // --- 1. КЛИК НА НЕОНОВУЮ ОБЛАСТЬ (левые 14 пикселей) ---
                        if (mouseX <= 14) {
                            if (typeof window.fetchAndOpenTaskModal === 'function') {
                                const taskDataForModal = {
                                    id: ev.id || ("task_" + Date.now()),
                                    type: ev.type || "task",
                                    summary: ev.title || ev.summary || "Без названия",
                                    description: ev.description || "",
                                    date: ev.date || new Date().toISOString().split('T')[0],
                                    time: ev.time || "00:00",
                                    duration: ev.duration || 30,
                                    user_id: ev.user_id || 1
                                };
                                window.fetchAndOpenTaskModal(taskDataForModal);
                            }
                        }
                        // --- 2. КЛИК НА ТЕКСТ / КНОПКУ (Вне неона) ---
                        else {
                            // Вытаскиваем ID клиента (проверяем все возможные ключи из Vortex OS)
                            const clientId = ev.client_id || ev.customer_id || ev.lead_id;

                            if (clientId) {
                                // Перенаправляем на твой точный роут во Flask с большой буквы и расширением .html
                                window.location.href = `/Card.html?id=${clientId}`;
                            } else {
                                // Если ID клиента нет (задача назначена только на сотрудника) — ничего не происходит
                                console.log("Внутренняя задача сотрудника (не привязана к клиенту). Переход отменен.");
                            }
                        }
                    };

                    wrapper.appendChild(card);
                });

                slot.appendChild(wrapper);
            }
        });
    } catch (err) {
        console.error("Ошибка отрисовки задач:", err);
    } finally {
        isCalendarLoading = false;
    }
}

// Защита от поломки картинок при возврате назад по истории браузера (BFCache)
window.addEventListener('pageshow', (event) => {
    if (event.persisted || window.performance?.getEntriesByType("navigation")[0]?.type === "back_forward") {
        document.querySelectorAll(".card-like-gif").forEach(img => {
            img.removeAttribute("data-hovered");

            const tempImg = new Image();
            tempImg.src = "/static/images/like.gif";
            tempImg.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = tempImg.naturalWidth || 40;
                canvas.height = tempImg.naturalHeight || 40;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(tempImg, 0, 0);
                img.src = canvas.toDataURL("image/png");
            };
        });
    }
});

// 3. Инициализация через события интерфейса
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(renderDayEvents, 300);

    document.getElementById("selectViewMode")?.addEventListener("change", renderDayEvents);
    document.getElementById("selectUserScope")?.addEventListener("change", renderDayEvents);
    document.getElementById("selectEmployee")?.addEventListener("change", async () => {
        // Очищаем кэш и обновляем данные при смене сотрудника
        if (window.currentAssigneeId) {
            // Принудительно обновляем данные
            isCalendarLoading = false;
            await renderDayEvents();
        } else {
            renderDayEvents();
        }
    });
});

// Глобальная функция для принудительного обновления дневного вида с очисткой
window.forceRefreshDayView = async function () {
    isCalendarLoading = false;
    // Принудительно перезагружаем данные с сервера
    await renderDayEvents();
};
