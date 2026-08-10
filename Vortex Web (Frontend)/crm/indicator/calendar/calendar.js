/* ============================================
   ИНДИКАТОР: КАЛЕНДАРЬ - JavaScript (с секундами и днём недели)
   Папка: /crm/indicator/calendar/
   ============================================ */

(function () {
    'use strict';

    function getWeekday(date) {
        const days = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
        return days[date.getDay()];
    }

    function formatDate(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }

    function formatTime(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const weekday = getWeekday(date);
        return `${weekday} ${hours}:${minutes}:${seconds}`;
    }

    function updateCalendarLabels(dateStr, timeStr) {
        const calendarButtons = document.querySelectorAll('.crm-indicator.calendar-button');
        calendarButtons.forEach(function (button) {
            let content = button.querySelector('.indicator-content');
            if (!content) {
                content = document.createElement('div');
                content.className = 'indicator-content';
                button.appendChild(content);
            }

            let dateLabel = content.querySelector('.date-label');
            let timeLabel = content.querySelector('.time-label');

            if (!dateLabel) {
                dateLabel = document.createElement('span');
                dateLabel.className = 'date-label';
                content.appendChild(dateLabel);
            }

            if (!timeLabel) {
                timeLabel = document.createElement('span');
                timeLabel.className = 'time-label';
                content.appendChild(timeLabel);
            }

            dateLabel.textContent = dateStr || '--.--.----';
            timeLabel.textContent = timeStr || '-- --:--:--';
            button.setAttribute('data-value', `${dateStr} ${timeStr}`);
            button.setAttribute('data-href', '/calendar');

            button.removeEventListener('click', handleCalendarClick);
            button.addEventListener('click', handleCalendarClick);
        });
    }

    function handleCalendarClick(event) {
        const button = event.currentTarget;
        const targetHref = button.getAttribute('data-href') || '/calendar';
        button.classList.add('clicked');
        setTimeout(function () {
            window.location.href = targetHref;
        }, 150);
    }

    function initCalendarIndicators() {
        const calendarButtons = document.querySelectorAll('.crm-indicator.calendar-button');
        if (calendarButtons.length === 0) return;

        const now = new Date();
        const dateStr = formatDate(now);
        const timeStr = formatTime(now);

        updateCalendarLabels(dateStr, timeStr);
    }

    // Обновление времени КАЖДУЮ СЕКУНДУ
    function startClock() {
        // Первое обновление сразу
        updateClock();

        // Затем каждую секунду
        setInterval(updateClock, 1000);
    }

    function updateClock() {
        const now = new Date();
        const dateStr = formatDate(now);
        const timeStr = formatTime(now);

        const calendarButtons = document.querySelectorAll('.crm-indicator.calendar-button');
        calendarButtons.forEach(function (button) {
            const dateLabel = button.querySelector('.date-label');
            const timeLabel = button.querySelector('.time-label');
            if (dateLabel) dateLabel.textContent = dateStr;
            if (timeLabel) timeLabel.textContent = timeStr;
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            initCalendarIndicators();
            startClock();
        });
    } else {
        initCalendarIndicators();
        startClock();
    }

    window.CalendarIndicator = {
        init: initCalendarIndicators,
        updateLabels: updateCalendarLabels,
        startClock: startClock,
        getWeekday: getWeekday
    };
})();