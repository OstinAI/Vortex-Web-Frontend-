// static/js/calendar/month-view.js

const monthsNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
console.log("month-view.js загружен");

function getAuthHeaders() {
    return {
        'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
        'Content-Type': 'application/json'
    };
}

async function renderMonthView() {
    const grid = document.getElementById("calendarDaysGrid");
    if (!grid) {
        console.error("grid not found");
        return;
    }

    let currentDate = window.currentDate || new Date();
    window.currentDate = currentDate;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    console.log("renderMonthView: год", year, "месяц", month);

    // Стили сетки
    grid.className = "vortex-month-grid";
    grid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
        background: transparent;
        padding: 8px;
        height: calc(100vh - 200px);
        min-height: 500px;
    `;

    // Заголовок
    const monthYearText = document.getElementById("currentMonthYear");
    if (monthYearText) monthYearText.textContent = `${monthsNames[month]} ${year}`;

    // Расчёт дней
    const firstDayIndex = new Date(year, month, 1).getDay();
    const webShift = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const totalDaysPrevMonth = new Date(year, month, 0).getDate();
    const today = new Date();

    // Задачи (если не загрузятся – пустой массив)
    let allTasks = [];
    try {
        let url = `${API_BASE_URL}/api/tasks/?limit=500`;
        if (window.currentAssigneeId) url += `&assignee_id=${window.currentAssigneeId}`;
        const response = await fetch(url, { headers: getAuthHeaders() });
        const data = await response.json();
        if (data.ok && data.tasks) allTasks = data.tasks;
    } catch (e) {
        console.error("Ошибка загрузки задач:", e);
    }

    // Очистка
    grid.innerHTML = "";

    

    // Функция добавления ячейки (локальная, чтобы иметь доступ к grid)
    const addCell = (day, isAlien, year, month, isToday = false) => {
        const cell = document.createElement("div");
        cell.className = "month-day-cell";
        cell.style.cssText = `
    display: flex;
    flex-direction: column;
    background: ${isAlien ? 'linear-gradient(135deg, #0d1425 0%, #0a0f1a 100%)' : 'linear-gradient(135deg, #0f1a2e 0%, #0a1020 100%)'};
    border-radius: 14px;
    padding: 10px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1);
    min-height: 110px;
    border: 1px solid rgba(255, 215, 0, 0.3);
    box-shadow: 0 4px 10px rgba(0,0,0,0.5), 0 0 5px rgba(255, 215, 0, 0.1);
    ${isAlien ? 'opacity: 0.7; border-color: rgba(255, 215, 0, 0.15);' : ''}
    ${isToday ? 'border: 2px solid #00FFFF; box-shadow: 0 0 25px rgba(0,255,255,0.5), inset 0 0 8px rgba(0,255,255,0.1), 0 0 10px rgba(255,215,0,0.2); animation: pulse-glow 2s ease-in-out infinite;' : ''}
`;

        // Эффекты
        cell.onmouseenter = () => {
            cell.style.transform = "scale(1.02) translateY(-2px)";
            cell.style.zIndex = "10";
            cell.style.boxShadow = "0 12px 30px rgba(0,0,0,0.6), 0 0 15px rgba(255, 215, 0, 0.3)";
            if (!isAlien) {
                cell.style.borderColor = "rgba(255, 215, 0, 0.6)";
            }
            if (isToday) {
                cell.style.boxShadow = "0 12px 30px rgba(0,0,0,0.6), 0 0 30px rgba(0,255,255,0.5), 0 0 15px rgba(255,215,0,0.2)";
            }
        };
        cell.onmouseleave = () => {
            cell.style.transform = "scale(1)";
            cell.style.zIndex = "1";
            if (isToday) {
                cell.style.boxShadow = "0 0 25px rgba(0,255,255,0.5), inset 0 0 8px rgba(0,255,255,0.1), 0 0 10px rgba(255,215,0,0.2)";
            } else {
                cell.style.boxShadow = "0 4px 10px rgba(0,0,0,0.5), 0 0 5px rgba(255, 215, 0, 0.1)";
                if (!isAlien) {
                    cell.style.borderColor = "rgba(255, 215, 0, 0.3)";
                }
            }
        };

        const cellDate = new Date(year, month, day);
        cell.onclick = (e) => {
            e.stopPropagation();
            if (typeof window.setDayViewDate === 'function') window.setDayViewDate(cellDate);
            else window.currentDisplayDate = new Date(cellDate);
            const selectViewMode = document.getElementById("selectViewMode");
            if (selectViewMode) selectViewMode.value = "day";
            if (typeof renderDayView === 'function') renderDayView();
        };

        // Номер дня
        const dayNumber = document.createElement("div");
        dayNumber.textContent = day;
        dayNumber.style.cssText = `font-size: 16px; font-weight: 700; margin-bottom: 8px; color: ${isToday ? '#00FFFF' : '#e0e0e0'}; font-family: monospace;`;
        cell.appendChild(dayNumber);

        // Контейнер для задач
        const eventsContainer = document.createElement("div");
        eventsContainer.style.cssText = `display: flex; flex-direction: column; gap: 4px; max-height: 90px; overflow-y: auto; scrollbar-width: none;`;
        eventsContainer.addEventListener('wheel', (e) => e.stopPropagation());

        const cellDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTasks = allTasks.filter(task => {
            if (task.start_ts_ms) {
                const d = new Date(task.start_ts_ms);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === cellDateString;
            }
            return false;
        }).sort((a, b) => (a.start_ts_ms || 0) - (b.start_ts_ms || 0));

        const maxVisible = 5;
        dayTasks.slice(0, maxVisible).forEach(task => {
            const card = document.createElement("div");
            let taskHour = "00:00";
            if (task.start_ts_ms) {
                const d = new Date(task.start_ts_ms);
                taskHour = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            }
            // Определяем цвет
            let taskColor = '#FFD700';
            const now = new Date();
            const taskDate = new Date(task.start_ts_ms);
            const isOverdue = (taskDate < now && task.status !== 'done' && task.status !== 'overdue');
            if (isOverdue || task.status === 'overdue') taskColor = '#ff4d4d';
            else if (task.color && task.color !== '#00E5FF') taskColor = task.color;
            else if (task.status) {
                const statusColors = { 'open': '#00E5FF', 'in_progress': '#FFD700', 'done': '#00FF00', 'urgent': '#FF4500', 'waiting': '#696969', 'attention': '#FF00FF' };
                taskColor = statusColors[task.status] || '#FFD700';
            }
            card.style.cssText = `display: flex; align-items: center; gap: 5px; padding: 4px 6px; background: rgba(25,25,35,0.9); border-radius: 4px; font-size: 10px; cursor: pointer; transition: all 0.2s; overflow: hidden; white-space: nowrap; border-left: 3px solid ${taskColor};`;
            card.onmouseenter = () => { card.style.transform = "translateX(3px) scale(1.02)"; card.style.backgroundColor = "rgba(45,45,60,0.95)"; };
            card.onmouseleave = () => { card.style.transform = "translateX(0) scale(1)"; card.style.backgroundColor = "rgba(25,25,35,0.9)"; };
            card.onclick = (e) => { e.stopPropagation(); if (typeof window.fetchAndOpenTaskModal === 'function') window.fetchAndOpenTaskModal(task.id); };
            const timeSpan = document.createElement("span"); timeSpan.textContent = taskHour; timeSpan.style.cssText = `color: ${taskColor}; font-family: monospace; font-weight: 700; font-size: 9px;`;
            const titleSpan = document.createElement("span"); titleSpan.textContent = (task.title || "Задача").length > 20 ? (task.title.slice(0, 18) + "..") : (task.title || "Задача"); titleSpan.style.cssText = `color: #e0e0e0; overflow: hidden; text-overflow: ellipsis; flex: 1; font-size: 10px;`;
            card.appendChild(timeSpan); card.appendChild(titleSpan);
            eventsContainer.appendChild(card);
        });
        if (dayTasks.length > maxVisible) {
            const moreEl = document.createElement("div");
            moreEl.textContent = `+${dayTasks.length - maxVisible} ещё`;
            moreEl.style.cssText = `font-size: 9px; color: #708599; text-align: center; padding: 3px; cursor: pointer; transition: color 0.2s;`;
            moreEl.onmouseenter = () => moreEl.style.color = "#00FFFF";
            moreEl.onmouseleave = () => moreEl.style.color = "#708599";
            moreEl.onclick = (e) => {
                e.stopPropagation();
                if (typeof window.setDayViewDate === 'function') window.setDayViewDate(cellDate);
                const selectViewMode = document.getElementById("selectViewMode");
                if (selectViewMode) selectViewMode.value = "day";
                if (typeof renderDayView === 'function') renderDayView();
            };
            eventsContainer.appendChild(moreEl);
        }
        cell.appendChild(eventsContainer);
        grid.appendChild(cell);
    };

    // Добавляем дни предыдущего месяца
    for (let i = webShift; i > 0; i--) {
        const dayNum = totalDaysPrevMonth - i + 1;
        addCell(dayNum, true, year, month - 1);
    }
    // Текущий месяц
    for (let i = 1; i <= totalDaysInMonth; i++) {
        const isToday = (i === today.getDate() && month === today.getMonth() && year === today.getFullYear());
        addCell(i, false, year, month, isToday);
    }
    // Следующий месяц
    const totalCells = Math.ceil((webShift + totalDaysInMonth) / 7) * 7;
    const remainingCells = totalCells - (webShift + totalDaysInMonth);
    for (let i = 1; i <= remainingCells; i++) {
        addCell(i, true, year, month + 1);
    }

    // Добавляем анимацию, если её нет
    if (!document.querySelector('#pulse-animation')) {
        const style = document.createElement('style');
        style.id = 'pulse-animation';
        style.textContent = `@keyframes pulse-glow { 0% { box-shadow: 0 0 4px rgba(0,255,255,0.2); border-color: rgba(0,255,255,0.5); } 50% { box-shadow: 0 0 16px rgba(0,255,255,0.6); border-color: #00FFFF; } 100% { box-shadow: 0 0 4px rgba(0,255,255,0.2); border-color: rgba(0,255,255,0.5); } }`;
        document.head.appendChild(style);
    }

    console.log("Рендер завершён, ячеек:", grid.children.length - 7);
}

window.setDayViewDate = function (date) {
    if (typeof currentDisplayDate !== 'undefined') currentDisplayDate = new Date(date);
    else window.currentDisplayDate = new Date(date);
    if (window.currentDisplayDate) window.currentDisplayDate.setHours(0, 0, 0, 0);
};

window.renderMonthView = renderMonthView;