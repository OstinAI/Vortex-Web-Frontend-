// static/js/calendar/year-view.js

const yearMonthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

let currentYear = new Date().getFullYear();

function renderYearView() {
    const grid = document.getElementById("calendarDaysGrid");
    if (!grid) return;

    // Обновляем заголовок
    const monthYearText = document.getElementById("currentMonthYear");
    if (monthYearText) {
        monthYearText.textContent = `${currentYear}`;
    }

    // Скрываем баннер дней недели
    const weekdaysBanner = document.querySelector(".weekdays-banner");
    if (weekdaysBanner) weekdaysBanner.style.display = "none";

    // Стили сетки для года
    grid.className = "vortex-year-grid";
    grid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
        background: transparent;
        padding: 20px;
        height: calc(100vh - 150px);
        overflow-y: auto;
        scrollbar-width: none;
    `;

    grid.innerHTML = "";

    // Создаём по одному блоку на каждый месяц
    for (let month = 0; month < 12; month++) {
        const monthCard = document.createElement("div");
        monthCard.className = "year-month-card";
        monthCard.style.cssText = `
            background: linear-gradient(135deg, #0f1a2e 0%, #0a1020 100%);
            border-radius: 16px;
            border: 1px solid rgba(255, 215, 0, 0.2);
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            overflow: hidden;
            transition: all 0.3s ease;
        `;

        // Заголовок месяца
        const monthHeader = document.createElement("div");
        monthHeader.style.cssText = `
    text-align: center;
    padding: 12px;
    font-weight: 700;
    font-size: 16px;
    color: #FFD700;
    background: rgba(0,0,0,0.3);
    border-bottom: 1px solid rgba(255,215,0,0.2);
    cursor: pointer;
    transition: all 0.2s ease;
`;
        monthHeader.textContent = yearMonthNames[month];

        // Ховер эффект для заголовка месяца
        monthHeader.onmouseenter = () => {
            monthHeader.style.background = "rgba(0, 255, 255, 0.2)";
            monthHeader.style.color = "#00FFFF";
        };
        monthHeader.onmouseleave = () => {
            monthHeader.style.background = "rgba(0,0,0,0.3)";
            monthHeader.style.color = "#FFD700";
        };

        // Клик по заголовку месяца – переход на месячный режим с выбранным месяцем
        monthHeader.onclick = () => {
            // Устанавливаем выбранный месяц и год
            if (typeof window.currentDate !== 'undefined') {
                window.currentDate = new Date(currentYear, month, 1);
            }
            if (typeof currentDate !== 'undefined') {
                currentDate = new Date(currentYear, month, 1);
            }

            // Переключаем режим на месяц
            const selectViewMode = document.getElementById("selectViewMode");
            if (selectViewMode) selectViewMode.value = "month";

            // Обновляем отображение
            if (typeof renderCalendar === 'function') {
                renderCalendar();
            } else if (typeof window.renderMonthView === 'function') {
                window.renderMonthView();
            }
        };

        monthCard.appendChild(monthHeader);

        // Сетка дней в месяце
        const daysGrid = document.createElement("div");
        daysGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 4px;
            padding: 10px;
        `;

        // Заголовки дней недели
        const weekDays = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];
        weekDays.forEach(day => {
            const dayHeader = document.createElement("div");
            dayHeader.textContent = day;
            dayHeader.style.cssText = `
                text-align: center;
                font-size: 10px;
                padding: 4px;
                color: ${day === 'СБ' || day === 'ВС' ? '#ff6666' : '#708599'};
                font-weight: 600;
            `;
            daysGrid.appendChild(dayHeader);
        });

        // Расчёт дней в месяце
        const firstDayIndex = new Date(currentYear, month, 1).getDay();
        const webShift = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
        const totalDaysInMonth = new Date(currentYear, month + 1, 0).getDate();
        const totalDaysPrevMonth = new Date(currentYear, month, 0).getDate();
        const today = new Date();
        const isCurrentMonth = (today.getFullYear() === currentYear && today.getMonth() === month);

        // Дни предыдущего месяца
        for (let i = webShift; i > 0; i--) {
            const dayNum = totalDaysPrevMonth - i + 1;
            const dayCell = createYearDayCell(dayNum, true, currentYear, month - 1);
            daysGrid.appendChild(dayCell);
        }

        // Дни текущего месяца
        for (let i = 1; i <= totalDaysInMonth; i++) {
            const isToday = (isCurrentMonth && i === today.getDate());
            const dayCell = createYearDayCell(i, false, currentYear, month, isToday);
            daysGrid.appendChild(dayCell);
        }

        // Дни следующего месяца для заполнения
        const totalCells = Math.ceil((webShift + totalDaysInMonth) / 7) * 7;
        const remainingCells = totalCells - (webShift + totalDaysInMonth);
        for (let i = 1; i <= remainingCells; i++) {
            const dayCell = createYearDayCell(i, true, currentYear, month + 1);
            daysGrid.appendChild(dayCell);
        }

        monthCard.appendChild(daysGrid);
        grid.appendChild(monthCard);
    }
}

function createYearDayCell(day, isAlien, year, month, isToday = false) {
    const cell = document.createElement("div");
    cell.textContent = day;
    cell.style.cssText = `
        text-align: center;
        padding: 6px 4px;
        font-size: 12px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        background: ${isAlien ? 'rgba(255,255,255,0.05)' : (isToday ? 'rgba(0, 255, 255, 0.2)' : 'rgba(255,255,255,0.08)')};
        color: ${isAlien ? '#666' : (isToday ? '#00FFFF' : '#e0e0e0')};
        font-weight: ${isToday ? '700' : '400'};
        border: ${isToday ? '1px solid #00FFFF' : '1px solid transparent'};
    `;

    // Ховер эффект
    cell.onmouseenter = () => {
        cell.style.transform = "scale(1.05)";
        cell.style.background = "rgba(0, 255, 255, 0.3)";
        cell.style.color = "#fff";
    };
    cell.onmouseleave = () => {
        cell.style.transform = "scale(1)";
        if (!isToday) {
            cell.style.background = isAlien ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)';
            cell.style.color = isAlien ? '#666' : '#e0e0e0';
        } else {
            cell.style.background = 'rgba(0, 255, 255, 0.2)';
            cell.style.color = '#00FFFF';
        }
    };

    // Клик по дню – переход на дневной режим
    cell.onclick = () => {
        const selectedDate = new Date(year, month, day);

        if (typeof window.setDayViewDate === 'function') {
            window.setDayViewDate(selectedDate);
        } else if (typeof currentDisplayDate !== 'undefined') {
            currentDisplayDate = new Date(selectedDate);
            currentDisplayDate.setHours(0, 0, 0, 0);
        } else {
            window.currentDisplayDate = new Date(selectedDate);
            window.currentDisplayDate.setHours(0, 0, 0, 0);
        }

        const selectViewMode = document.getElementById("selectViewMode");
        if (selectViewMode) selectViewMode.value = "day";
        if (typeof renderDayView === 'function') renderDayView();
    };

    return cell;
}

// Функции переключения годов
function goToPrevYear() {
    currentYear--;
    renderYearView();
}

function goToNextYear() {
    currentYear++;
    renderYearView();
}

// Экспортируем функции глобально
window.renderYearView = renderYearView;
window.goToPrevYear = goToPrevYear;
window.goToNextYear = goToNextYear;