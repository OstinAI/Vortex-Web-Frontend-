// -*- coding: utf-8 -*-
document.addEventListener("DOMContentLoaded", () => {
    const monthsNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
    let currentDate = new Date();
    let currentViewMode = 'month';
    let currentAssigneeId = null; // ID выбранного сотрудника для фильтрации задач
    window.currentAssigneeId = null;
    window.currentDate = currentDate;

    // КЭШИРОВАНИЕ DOM ЭЛЕМЕНТОВ
    const DOMCache = {
        editingEventId: document.getElementById("editingEventId"),
        eventSummary: document.getElementById("eventSummary"),
        eventDescription: document.getElementById("eventDescription"),
        selectedClientId: document.getElementById("selectedClientId"),
        selectedClientName: document.getElementById("selectedClientName"),
        eventStatus: document.getElementById("eventStatus"),
        targetEventType: document.getElementById("targetEventType"),
        eventDuration: document.getElementById("eventDuration"),
        editingEventClientId: document.getElementById("editingEventClientId"),
        btnSaveEvent: document.getElementById("btnSaveEvent"),
        createdByName: document.getElementById("createdByName")  // ← ДЛЯ СОЗДАТЕЛЯ
    };

    // НАША ИНИЦИАЛИЗАЦИЯ ПИКЕРА ЦВЕТОВ:
    if (window.VortexColorPicker) {
        window.VortexColorPicker.init();
    }

    // Инициализация менеджера выбора клиента
    if (window.ClientManager) {
        window.ClientManager.init();
        window.ClientManager.loadClients();
    }

    // DOM Элементы
    const currentMonthYearText = document.getElementById("currentMonthYear");
    const calendarDaysGrid = document.getElementById("calendarDaysGrid");
    const btnPrevMonth = document.getElementById("btnPrevMonth");
    const btnNextMonth = document.getElementById("btnNextMonth");

    // Элементы Сайдбара
    const selectViewMode = document.getElementById("selectViewMode");
    const selectUserScope = document.getElementById("selectUserScope");
    const selectEmployee = document.getElementById("selectEmployee");
    const managementFilterSection = document.getElementById("managementFilterSection");
    const btnCreateTask = document.getElementById("btnCreateTask");
    const btnCreateNote = document.getElementById("btnCreateNote");

    // Элементы Модального Окна
    const eventModal = document.getElementById("vortexEventModal");
    const btnCloseModal = document.getElementById("btnCloseModal");
    const btnSaveEvent = document.getElementById("btnSaveEvent");
    const modalTitle = document.getElementById("modalTitle");
    const targetEventType = document.getElementById("targetEventType");
    const eventStatus = document.getElementById("eventStatus");
    const eventAssignees = document.getElementById("eventAssignees");
    const enableEndDateCheckbox = document.getElementById("enableEndDateCheckbox");
    const endDateRowBlock = document.getElementById("endDateRowBlock");


    // Ссылка на новое объединенное поле окончания
    const eventEndDateTime = document.getElementById("eventEndDateTime");

    // Инициализируем второй темный пикер для даты и времени ОКОНЧАНИЯ
    const endDateTimePicker = flatpickr("#eventEndDateTime", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        time_24hr: true,
        locale: "ru",
        firstDayOfWeek: 1,
        onReady: function (selectedDates, dateStr, instance) {
            // Слушаем двойной клик внутри всплывающего окна Flatpickr окончания
            instance.calendarContainer.addEventListener("dblclick", () => {
                if (instance.selectedDates.length > 0) {
                    instance.close();
                }
            });
        }
    });

    // ШОРТКАТ: Двойной клик по самому инпуту окончания ставит текущее время и закрывает
    document.getElementById("eventEndDateTime").addEventListener("dblclick", (e) => {
        e.preventDefault();
        endDateTimePicker.setDate(new Date(), false);
        endDateTimePicker.close();
    });

    // Инициализируем единый темный пикер с автоматическим закрытием по dblclick
    const dateTimePicker = flatpickr("#eventTargetDateTime", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        time_24hr: true,
        locale: "ru",
        firstDayOfWeek: 1,
        onReady: function (selectedDates, dateStr, instance) {
            // Слушаем двойной клик внутри самого всплывающего окна Flatpickr
            instance.calendarContainer.addEventListener("dblclick", () => {
                // Если дата выбрана, фиксируем её и закрываем окно
                if (instance.selectedDates.length > 0) {
                    instance.close();
                }
            });
        }
    });

    // ШОРТКАТ: Двойной клик по самому инпуту ставит текущее время и сразу закрывает
    document.getElementById("eventTargetDateTime").addEventListener("dblclick", (e) => {
        e.preventDefault();
        dateTimePicker.setDate(new Date(), false); // Устанавливаем текущую дату/время
        dateTimePicker.close(); // Закрываем календарь
    });

    // Показ/скрытие даты окончания
    enableEndDateCheckbox.addEventListener("change", (e) => {
        endDateRowBlock.style.display = e.target.checked ? "flex" : "none";
    });

    // Автоматическое изменение цвета при смене статуса
    const statusSelect = document.getElementById("eventStatus");
    if (statusSelect) {
        statusSelect.addEventListener("change", function () {
            const status = this.value;
            let colorByStatus = '#00E5FF';

            switch (status) {
                case 'open': colorByStatus = '#00E5FF'; break;      // голубой
                case 'in_progress': colorByStatus = '#FFD700'; break; // жёлтый
                case 'done': colorByStatus = '#00FF00'; break;       // зелёный
                case 'urgent': colorByStatus = '#FF4500'; break;     // оранжевый
                case 'waiting': colorByStatus = '#696969'; break;    // серый
                case 'attention': colorByStatus = '#FF00FF'; break;  // розовый
                case 'overdue': colorByStatus = '#ff4d4d'; break;  // красный
                default: colorByStatus = '#00E5FF';
            }

            if (window.VortexColorPicker) {
                window.VortexColorPicker.setColor(colorByStatus);
            }

            console.log("Статус изменён на:", status, "Цвет:", colorByStatus);
        });
    }

    // Функция преобразования цвета в colorId Google Calendar
    function getGoogleColorId(hexColor) {
        const colorMap = {
            '#00E5FF': '5',   // голубой
            '#FFD700': '6',   // жёлтый
            '#00FF00': '7',   // зелёный
            '#FF4500': '2',   // оранжевый
            '#696969': '8',   // серый
            '#FF00FF': '9',   // розовый
            '#ff4d4d': '11',  // красный
            '#00BFFF': '1'    // синий
        };
        return colorMap[hexColor] || '5';
    }

    // Функция проверки просрочки (синхронизирована с day-view.js)
    function isTaskOverdueForModal(task) {
        const now = new Date();
        const taskDate = new Date(task.start_ts_ms || task.end_ts_ms);
        const isCompleted = task.status === 'done' || task.is_completed;
        if (isCompleted) return false;
        return taskDate < now;
    }

    // --- Блок Google интеграции ---

    async function checkConnectionStatus() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/google/status`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            const data = await res.json();
            renderGoogleSyncUI(data.connected === true);
        } catch (e) {
            console.error("Ошибка при проверке статуса:", e);
            renderGoogleSyncUI(false);
        }
    }

    function renderGoogleSyncUI(isSynced) {
        const container = document.getElementById("googleSyncContainer");
        if (!container) return;

        if (isSynced) {
            container.innerHTML = `
                <div class="sync-btn-connected">
                    <div class="btn-content">
                        <strong>Google синхронизирован</strong><br>
                        <a href="#" id="revokeLink">Отменить синхронизацию</a>
                    </div>
                </div>
            `;
            document.getElementById("revokeLink").onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                revokeGoogleSync();
            };
        } else {
            container.innerHTML = `
                <div id="btnGoogleConnect" class="vortex-status-node" style="cursor: pointer; border-color: rgba(255, 51, 102, 0.3); color: #ff3366;">
                    <span><i class="fa-brands fa-google"></i> Google Синхронизация</span>
                </div>
            `;
            document.getElementById("btnGoogleConnect").addEventListener("click", initiateAuthFlow);
        }
    }

    async function initiateAuthFlow() {
        const newWindow = window.open('', '_blank');
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/google/initiate`, { headers: getAuthHeaders() });
            const data = await res.json();
            if (data.url) newWindow.location.href = data.url;
            else newWindow.close();
        } catch (e) {
            newWindow.close();
        }
    }

    async function revokeGoogleSync() {
        if (!confirm("Отключить синхронизацию с Google?")) return;
        const res = await fetch(`${API_BASE_URL}/api/v1/google/revoke`, { method: 'POST', headers: getAuthHeaders() });
        if (res.ok) checkConnectionStatus();
        else alert("Ошибка при отключении");
    }

    // Слушаем успех авторизации из окна
    window.addEventListener('message', (event) => {
        if (event.data === 'google_auth_success') checkConnectionStatus();
    });

    // --- Остальной функционал ---

    function getAuthHeaders() {
        return {
            'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
            'Content-Type': 'application/json'
        };
    }

    let vortexEventsDatabase = [
        { id: "task_1", type: "task", summary: "Собрать коммерческое Darkhan", description: "Позвонить по интеграции API", date: "2026-05-19", time: "14:30", user_id: 1 },
        { id: "note_1", type: "note", summary: "Заметка: Купить удобрения", description: "Розы Endless Summer требуют подкормки", date: "2026-05-19", time: "18:00", user_id: 1 },
        { id: "task_2", type: "task", summary: "Тест системы для МедРокет", description: "Проверка логов телефонии", date: "2026-05-22", time: "10:00", user_id: 2 }
    ];

    // 🔥 ДОБАВИТЬ ЭТОТ БЛОК СЮДА
    // Синхронизируем ID существующих задач (убираем префиксы)
    vortexEventsDatabase = vortexEventsDatabase.map(ev => {
        if (ev.id && typeof ev.id === 'string' && (ev.id.startsWith('task_') || ev.id.startsWith('note_'))) {
            const numericId = parseInt(ev.id.replace(/[^\d]/g, ''), 10);
            if (!isNaN(numericId)) {
                return { ...ev, id: numericId };
            }
        }
        return ev;
    });

    function applyAccessControl() {
        const token = localStorage.getItem("vortex_token") || "";
        if (!token) return;
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(window.atob(base64));
            const userRole = (payload.role || "").trim().toLowerCase();
            if (["admin", "integrator", "director"].includes(userRole)) {
                managementFilterSection.classList.remove("hidden-acl");
                loadCompanyEmployees();
                return;
            }
            // Проверяем, не руководитель ли отдела
            fetch(`${API_BASE_URL}/api/employees/list`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'ok') {
                        const currentUserId = payload.user_id || payload.id;
                        const me = data.employees.find(emp => emp.id == currentUserId);
                        if (me && me.is_department_head) {
                            managementFilterSection.classList.remove("hidden-acl");
                            loadCompanyEmployees();
                        } else {
                            managementFilterSection.classList.add("hidden-acl");
                        }
                    }
                })
                .catch(e => console.error("Ошибка проверки руководителя:", e));
        } catch (e) { console.error("Ошибка прав доступа:", e); }
    }

    async function loadCompanyEmployees() {
        try {
            const token = localStorage.getItem('vortex_token');
            const response = await fetch(`${API_BASE_URL}/api/employees/list`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.status === 'ok') {
                const employees = data.employees.filter(emp => emp.role !== 'Integrator');
                selectEmployee.innerHTML = '<option value="">-- Все сотрудники --</option>';
                employees.forEach(emp => {
                    const opt = document.createElement('option');
                    opt.value = emp.id;
                    opt.textContent = emp.full_name || emp.username;
                    selectEmployee.appendChild(opt);
                });
                // ✅ ДОБАВЬТЕ ЭТИ СТРОКИ
                if (selectUserScope.value === "all") {
                    selectEmployee.disabled = false;
                } else {
                    selectEmployee.disabled = true;
                }
            } else {
                console.error('Ошибка загрузки сотрудников:', data.message);
            }
        } catch (e) {
            console.error('Ошибка сети при загрузке сотрудников:', e);
        }
    }

    selectUserScope.addEventListener("change", (e) => {
        selectEmployee.disabled = (e.target.value !== "all");
        if (e.target.value !== "all") selectEmployee.value = "";
        renderCalendar();
    });

    selectEmployee.addEventListener("change", async (e) => {
        currentAssigneeId = e.target.value ? parseInt(e.target.value) : null;
        window.currentAssigneeId = currentAssigneeId;

        // Вызываем функцию обновления в multi-day-view.js
        if (typeof window.updateAssigneeId === 'function') {
            window.updateAssigneeId(currentAssigneeId);
        }

        await syncTasksFromServer();

        const currentMode = selectViewMode.value;
        if (currentMode === '3days' || currentMode === 'week') {
            if (typeof window.refreshMultiDayView === 'function') {
                await window.refreshMultiDayView();
            }
        } else if (currentMode === 'day') {
            // Принудительно обновляем дневной вид с очисткой
            if (typeof window.forceRefreshDayView === 'function') {
                await window.forceRefreshDayView();
            } else if (typeof renderDayEvents === 'function') {
                isCalendarLoading = false;
                await renderDayEvents();
            }
        } else {
            renderCalendar();
        }
    });

    function renderCalendar() {
        const mode = selectViewMode.value;
        const weekdaysBanner = document.querySelector(".weekdays-banner");
        if (weekdaysBanner) weekdaysBanner.style.display = (mode === 'month') ? 'grid' : 'none';

        calendarDaysGrid.innerHTML = "";
        calendarDaysGrid.style.gridTemplateColumns = "";

        if (mode === 'month') {
            if (typeof window.renderMonthView === 'function') {
                window.renderMonthView();
            }
        } else if (mode === 'day') {
            if (typeof renderDayView === 'function') renderDayView();
        } else if (mode === 'year') {
            if (typeof window.renderYearView === 'function') {
                window.renderYearView();
            }
        } else if (mode === '3days') {
            if (typeof renderMultiDayView === 'function') renderMultiDayView();
        } else if (mode === 'week') {
            if (typeof renderMultiDayView === 'function') renderMultiDayView();
        }
    }

    // Загружаем реальные задачи с сервера при старте
    async function syncTasksFromServer(assigneeId = currentAssigneeId) {
        try {
            let url = `${API_BASE_URL}/api/tasks/?limit=500`;
            if (assigneeId) {
                url += `&assignee_id=${assigneeId}`;
            }
            const res = await fetch(url, { headers: getAuthHeaders() });
            const data = await res.json();
            if (data.ok && data.tasks) {
                vortexEventsDatabase = data.tasks.map(t => ({
                    id: t.id,
                    type: 'task',
                    summary: t.title,
                    description: t.description,
                    start_ts_ms: t.start_ts_ms,
                    end_ts_ms: t.end_ts_ms,
                    status: t.status,
                    color: t.color,
                    assignees: t.assignees,
                    user_id: t.created_by,
                    client_id: t.client_id,
                    client_name: t.client_name,
                    duration: t.duration
                }));
                renderCalendar();
            }
        } catch (e) { console.error("Ошибка загрузки задач с сервера:", e); }
    }
    syncTasksFromServer();


    async function openModalForCreate(dateString, type = "task") {
        // 🔥 ДОБАВИТЬ ЭТУ СТРОКУ - показываем кнопку для новой задачи
        const saveBtn = document.getElementById("btnSaveEvent");
        if (saveBtn) saveBtn.style.display = 'flex';

        document.getElementById("editingEventId").value = "";
        document.getElementById("eventSummary").value = "";
        document.getElementById("eventDescription").value = "";
        // Сброс выбора клиента
        if (window.ClientManager) {
            window.ClientManager.reset();
        }

        // 🔥 Скрываем поле "Создал задачу" при создании новой задачи
        const createdByWrapper = document.getElementById("createdByWrapper");
        if (createdByWrapper) createdByWrapper.style.display = "none";

        // Пишем дату и дефолтное время. Флаг true заставит flatpickr перерисовать инпут
        if (dateTimePicker) {
            dateTimePicker.setDate(`${dateString} 12:00`, true);
        }

        // 🔥 Удаляем статус "Просрочена" для новой задачи
        removeOverdueStatusFromSelect();

        // Сброс блока даты окончания
        enableEndDateCheckbox.checked = false;
        endDateRowBlock.style.display = "none";
        if (endDateTimePicker) endDateTimePicker.clear();

        targetEventType.value = type;
        eventStatus.value = "open";

        // Инициализируем пустой список для новой задачи
        AssigneeManager.init(
            'eventAssignees',     // ID родительского контейнера дропдауна
            'assigneesMenu',      // ID выпадающего меню
            'assigneesTrigger',   // ID кнопки-плашки
            'selectedCount',      // ID спана со счетчиком
            []                    // Массив выбранных пустой!
        );

        // ==========================================
        // 🔥 ДОБАВЛЕНО: Сброс цвета на дефолтный при создании новой задачи
        // ==========================================
        if (window.VortexColorPicker) {
            window.VortexColorPicker.setColor('#00E5FF');
        }

        const durationBox = document.querySelector(".id-duration-box");
        if (durationBox) durationBox.style.display = (type === "task") ? "flex" : "none";

        modalTitle.textContent = (type === "task") ? "Новая задача" : "Новая заметка";

        eventModal.style.display = "flex";
    }

    async function openModalForEdit(ev) {
        // Выводим в консоль пришедший объект, чтобы точно знать, какие в нем поля
        console.log("=== ОТКРЫТИЕ МОДАЛКИ (Данные события) ===", ev);

        if (!ev) {
            console.error("Объект события (ev) отсутствует!");
            return;
        }

        // ==========================================
        // ПРИНУДИТЕЛЬНАЯ ПРОВЕРКА ПРОСРОЧКИ И ЦВЕТА #ff4d4d
        // ==========================================
        let isOverdue = false;
        const taskTime = ev.start_ts_ms !== undefined ? ev.start_ts_ms : ev.end_ts_ms;
        if (taskTime && ev.status !== 'done') {
            const taskDate = new Date(taskTime);
            const now = new Date();
            isOverdue = taskDate.getTime() < now.getTime();
        }

        // Проверка цвета задачи
        let taskColor = ev.color || null;
        if (!taskColor && ev.description) {
            const colorMatch = ev.description.match(/\[color:\s*(#[0-9A-Fa-f]{6})\]/);
            if (colorMatch) {
                taskColor = colorMatch[1];
            }
        }

        const isRedColor = (taskColor && taskColor.toLowerCase() === '#ff4d4d') || ev.status === 'overdue';

        const saveBtn = document.getElementById("btnSaveEvent");
        if (saveBtn) {
            saveBtn.style.display = (isOverdue || isRedColor) ? 'none' : 'flex';
        }

        // 🔥 Добавляем статус "Просрочена" только если задача просрочена
        if (ev.status === 'overdue') {
            addOverdueStatusToSelect();
        } else {
            removeOverdueStatusFromSelect();
        }

        // 🔥 ДОБАВИТЬ СЮДА (после строки if (!ev) return;)
        // Извлекаем чистый числовой ID
        let cleanId = ev.id;
        if (typeof cleanId === 'string' && (cleanId.startsWith('task_') || cleanId.startsWith('note_'))) {
            cleanId = parseInt(cleanId.replace(/[^\d]/g, ''), 10);
        }
        document.getElementById("editingEventId").value = cleanId || "";

        // Сохраняем client_id задачи, чтобы не потерять связь с клиентом
        let clientIdField = document.getElementById("editingEventClientId");
        if (clientIdField) {
            clientIdField.value = ev.client_id || "";
        }

        document.getElementById("eventSummary").value = ev.summary || ev.title || "";

        // Сохраняем google_event_id для обновления
        if (ev.google_event_id) {
            window.currentGoogleEventId = ev.google_event_id;
        }

        // --- Парсинг системной заметки цвета и очистка текста ---
        let rawDescription = ev.description || "";
        let detectedColor = ev.color || null;

        // БЕЗОПАСНЫЙ ПАРСИНГ ЦВЕТА (try-catch защитит от падения)
        try {
            const colorRegex = /\[color:\s*(#[0-9A-Fa-f]{6})\]/;
            const match = rawDescription.match(colorRegex);

            if (match) {
                detectedColor = match[1]; // Извлекаем HEX цвет из тега
                rawDescription = rawDescription.replace(colorRegex, '').trim(); // Удаляем тег, чтобы скрыть его
            }
        } catch (colorError) {
            console.error("Ошибка парсинга цвета в описании:", colorError);
        }

        // Записываем в текстовое поле ОЧИЩЕННЫЙ текст без тега
        document.getElementById("eventDescription").value = rawDescription;

        // Находим элементы управления отображением блока даты окончания
        const endDateCheckbox = document.getElementById("enableEndDateCheckbox");
        const endDateRow = document.getElementById("endDateRowBlock");

        // БЕЗОПАСНЫЙ ПАРСИНГ ДАТ И ВРЕМЕНИ
        try {
            // ==========================================
            // 🔥 НАЧАЛО ИСПРАВЛЕНИЯ: Точный и надежный парсинг даты/времени
            // ==========================================
            let localStartString = "";

            // 1. ПЕРВЫЙ ПРИОРИТЕТ: Проверяем таймстампы, потому что в них ВСЕГДА есть точное время (часы и минуты)
            let startTimestamp = ev.start_ts_ms || ev.startTsMs || ev.startTimestamp || ev.start;

            if (startTimestamp && !isNaN(startTimestamp) && !isNaN(parseFloat(startTimestamp))) {
                const startDateObj = new Date(Number(startTimestamp));
                if (!isNaN(startDateObj.getTime())) {
                    const year = startDateObj.getFullYear();
                    const month = String(startDateObj.getMonth() + 1).padStart(2, '0');
                    const day = String(startDateObj.getDate()).padStart(2, '0');
                    const hours = String(startDateObj.getHours()).padStart(2, '0');
                    const minutes = String(startDateObj.getMinutes()).padStart(2, '0');
                    localStartString = `${year}-${month}-${day} ${hours}:${minutes}`;
                }
            }
            // 2. ВТОРОЙ ПРИОРИТЕТ: Если таймстампа нет, но есть строка ISO
            else if (startTimestamp && typeof startTimestamp === 'string') {
                localStartString = startTimestamp.replace('T', ' ').substring(0, 16);
            }
            // 3. ТРЕТИЙ ПРИОРИТЕТ: Если вообще нет таймстампов, собираем из текстовых полей
            else if (ev.date) {
                const timePart = ev.time || "00:00";
                localStartString = `${ev.date} ${timePart}`;
            }

            // Жестко пишем дату старта во Flatpickr без триггера событий
            if (localStartString && typeof dateTimePicker !== 'undefined' && dateTimePicker) {
                dateTimePicker.setDate(localStartString, false, "Y-m-d H:i");
            }

            // --- Разбор конечной даты ---
            let localEndString = "";

            // Точно так же меняем приоритет для даты окончания
            let endTimestamp = ev.end_ts_ms || ev.endTsMs || ev.endTimestamp || ev.end;

            if (endTimestamp && !isNaN(endTimestamp) && !isNaN(parseFloat(endTimestamp))) {
                const endDateObj = new Date(Number(endTimestamp));
                if (!isNaN(endDateObj.getTime())) {
                    const eYear = endDateObj.getFullYear();
                    const eMonth = String(endDateObj.getMonth() + 1).padStart(2, '0');
                    const eDay = String(endDateObj.getDate()).padStart(2, '0');
                    const eHours = String(endDateObj.getHours()).padStart(2, '0');
                    const eMinutes = String(endDateObj.getMinutes()).padStart(2, '0');
                    localEndString = `${eYear}-${eMonth}-${eDay} ${eHours}:${eMinutes}`;
                }
            }
            else if (endTimestamp && typeof endTimestamp === 'string') {
                localEndString = endTimestamp.replace('T', ' ').substring(0, 16);
            }
            else if (ev.end_date) {
                const endTimePart = ev.end_time || "00:00";
                localEndString = `${ev.end_date} ${endTimePart}`;
            }

            // Управляем чекбоксами и отображением блока конечной даты
            if (localEndString) {
                if (endDateCheckbox) endDateCheckbox.checked = true;
                if (endDateRow) endDateRow.style.display = "flex";
                if (typeof endDateTimePicker !== 'undefined' && endDateTimePicker) {
                    endDateTimePicker.setDate(localEndString, false, "Y-m-d H:i");
                }
            } else {
                if (endDateCheckbox) endDateCheckbox.checked = false;
                if (endDateRow) endDateRow.style.display = "none";
                if (typeof endDateTimePicker !== 'undefined' && endDateTimePicker && endDateTimePicker.clear) {
                    endDateTimePicker.clear();
                }
            }
        } catch (dateError) {
            console.error("Ошибка при установке дат в пикеры:", dateError);
        }

        if (document.getElementById("targetEventType")) {
            document.getElementById("targetEventType").value = ev.type || "task";
        }
        if (document.getElementById("eventStatus")) {
            document.getElementById("eventStatus").value = ev.status || "open";
            console.log("openModalForEdit - статус установлен:", ev.status);
        }

        // 🔥 Показываем поле "Создал задачу" при редактировании
        const createdByWrapper = document.getElementById("createdByWrapper");
        if (createdByWrapper) createdByWrapper.style.display = "block";

        // Отображаем имя создателя
        if (DOMCache.createdByName) {
            const creatorName = ev.created_by_name || ev.creator_name || (ev.created_by_user_id ? `ID: ${ev.created_by_user_id}` : 'Неизвестно');
            DOMCache.createdByName.innerText = creatorName;
        }

        // Перезагрузка сотрудников изолирована
        try {
            const currentAssignees = ev.assignees && Array.isArray(ev.assignees) ? ev.assignees : [];
            AssigneeManager.init(
                'eventAssignees',
                'assigneesMenu',
                'assigneesTrigger',
                'selectedCount',
                currentAssignees // Передаем ID тех, кто уже назначен
            );

            // Обновляем отображение текста на кнопке
            const countLabel = document.getElementById('selectedCount');
            if (countLabel) {
                countLabel.innerText = currentAssignees.length > 0
                    ? `${currentAssignees.length} выбрано`
                    : 'Выберите сотрудников...';
            }
        } catch (error) {
            console.error("Ошибка инициализации сотрудников:", error);
        }

        // Загружаем клиента задачи (асинхронная версия с подгрузкой имени)
        if (ev.client_id) {
            document.getElementById('selectedClientId').value = ev.client_id;

            // Функция для получения имени клиента
            const getClientName = async () => {
                // Сначала проверяем в уже загруженных
                if (window.ClientManager && window.ClientManager.clientsList.length > 0) {
                    const found = window.ClientManager.clientsList.find(c => c.id === ev.client_id);
                    if (found) {
                        // 🔥 ПРОВЕРКА НА СИСТЕМНОГО КЛИЕНТА
                        const isSystem = found.name === '__SYSTEM_TASK_CLIENT__';
                        if (!isSystem) {
                            document.getElementById('selectedClientName').innerText = found.name;
                            if (window.ClientManager) window.ClientManager.setClient(ev.client_id, found.name);
                        } else {
                            document.getElementById('selectedClientName').innerText = 'Без клиента';
                            if (window.ClientManager) window.ClientManager.reset();
                        }
                        return;
                    }
                }

                // Если нет - грузим конкретного клиента
                try {
                    const token = localStorage.getItem('vortex_token');
                    const response = await fetch(`${API_BASE_URL}/api/crm/clients/${ev.client_id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await response.json();
                    if (data.ok && data.client) {
                        const isSystem = data.client.name === '__SYSTEM_TASK_CLIENT__';
                        if (!isSystem) {
                            const name = data.client.name || `Клиент #${ev.client_id}`;
                            document.getElementById('selectedClientName').innerText = name;
                            if (window.ClientManager) window.ClientManager.setClient(ev.client_id, name);
                        } else {
                            document.getElementById('selectedClientName').innerText = 'Без клиента';
                            if (window.ClientManager) window.ClientManager.reset();
                        }
                    } else {
                        document.getElementById('selectedClientName').innerText = `Клиент #${ev.client_id}`;
                        if (window.ClientManager) window.ClientManager.setClient(ev.client_id, `Клиент #${ev.client_id}`);
                    }
                } catch (e) {
                    console.error("Ошибка загрузки имени клиента:", e);
                    document.getElementById('selectedClientName').innerText = `Клиент #${ev.client_id}`;
                    if (window.ClientManager) window.ClientManager.setClient(ev.client_id, `Клиент #${ev.client_id}`);
                }
            };

            getClientName();
        } else {
            document.getElementById('selectedClientId').value = '';
            document.getElementById('selectedClientName').innerText = 'Без клиента';
            if (window.ClientManager) {
                window.ClientManager.reset();
            }
        }

        // Передача цвета в пикер
        try {
            if (window.VortexColorPicker) {
                const finalColor = detectedColor || '#00E5FF';
                window.VortexColorPicker.setColor(finalColor);

                // Принудительно меняем цвет фона окна, если функция доступна
                if (typeof applyModalBackground === 'function') {
                    if (!detectedColor || detectedColor === '#00E5FF') {
                        const modal = document.querySelector('.modal-surface');
                        if (modal) modal.style.backgroundColor = '#01080f';
                    } else {
                        applyModalBackground(finalColor);
                    }
                }
            }
        } catch (colorUiError) {
            console.error("Ошибка применения цвета к UI:", colorUiError);
        }

        const durationBox = document.querySelector(".id-duration-box");
        if (durationBox) {
            durationBox.style.display = (ev.type === "task") ? "flex" : "none";
        }
        const durationInput = document.getElementById("eventDuration");
        if (durationInput && ev.type === "task") {
            durationInput.value = ev.duration || 30;
        }

        if (typeof modalTitle !== 'undefined' && modalTitle) {
            modalTitle.textContent = (ev.type === "task") ? "Редактирование задачи" : "Редактирование заметки";
        }

        // ЭТОТ БЛОК ТЕПЕРЬ СРАБОТАЕТ ВСЕГДА:
        if (typeof eventModal !== 'undefined' && eventModal) {
            eventModal.style.display = "flex";
        }
    }

    // Добавляет статус "Просрочена" в select
    function addOverdueStatusToSelect() {
        const statusSelect = document.getElementById("eventStatus");
        if (!statusSelect) return;

        // Проверяем, есть ли уже опция overdue
        const existingOption = statusSelect.querySelector('option[value="overdue"]');
        if (!existingOption) {
            const option = document.createElement("option");
            option.value = "overdue";
            option.textContent = "🔴 Просрочена";
            statusSelect.appendChild(option);
        }
    }

    // Удаляет статус "Просрочена" из select
    function removeOverdueStatusFromSelect() {
        const statusSelect = document.getElementById("eventStatus");
        if (!statusSelect) return;

        const overdueOption = statusSelect.querySelector('option[value="overdue"]');
        if (overdueOption) {
            overdueOption.remove();
        }
    }

    function closeVortexModal() {
        const modal = document.querySelector('.modal-surface');
        const modalContainer = document.querySelector('.vortex-core-modal');

        if (modalContainer) modalContainer.style.display = 'none';

        // Сбрасываем фон модалки на дефолтный
        if (modal) {
            modal.style.backgroundColor = '#01080f';
        }

        // 🔥 ДОБАВИТЬ ЭТИ 3 СТРОКИ
        const saveBtn = document.getElementById("btnSaveEvent");
        if (saveBtn) saveBtn.style.display = 'flex';
    }

    // Получение выбранного цвета из нашей кастомной HTML-палитры
    function getSelectedColorValue() {
        const checkedRadio = document.querySelector('input[name="taskColor"]:checked');
        return checkedRadio ? checkedRadio.value : "#ff3366";
    }

    btnCreateTask.addEventListener("click", () => openModalForCreate(new Date().toISOString().split('T')[0], "task"));
    btnCreateNote.addEventListener("click", () => openModalForCreate(new Date().toISOString().split('T')[0], "note"));

    btnSaveEvent.addEventListener("click", async () => {
        console.log("🔴 КНОПКА СОХРАНЕНИЯ НАЖАТА");

        const id = document.getElementById("editingEventId").value;
        const type = targetEventType.value;
        console.log("🔴 id:", id, "type:", type);

        // Безопасный забор объекта даты напрямую из Flatpickr
        const selectedDates = dateTimePicker.selectedDates;
        if (selectedDates.length === 0) {
            alert("Укажите дату и время начала!");
            return;
        }

        // Получаем timestamp локального времени
        const startTsMs = selectedDates[0].getTime();

        // Переводим дату окончания, если чекбокс активен
        let endTsMs = null;
        if (enableEndDateCheckbox.checked && endDateTimePicker.selectedDates.length > 0) {
            endTsMs = endDateTimePicker.selectedDates[0].getTime();
        }

        // 1. Получаем массив выбранных ID ответственных сотрудников
        const selectedAssignees = AssigneeManager.getSelectedIds();

        // 2. Забираем цвет из пикера
        let taskColor = '#00E5FF';
        if (window.VortexColorPicker && typeof window.VortexColorPicker.getSelectedColor === 'function') {
            taskColor = window.VortexColorPicker.getSelectedColor();
        }

        // Определяем цвет по статусу (для случая, если пользователь не трогал пикер)
        const currentStatusForColor = document.getElementById("eventStatus").value;
        let colorByStatus = '#00E5FF';
        switch (currentStatusForColor) {
            case 'open': colorByStatus = '#00E5FF'; break;
            case 'in_progress': colorByStatus = '#FFD700'; break;
            case 'done': colorByStatus = '#00FF00'; break;
            case 'urgent': colorByStatus = '#FF4500'; break;
            case 'waiting': colorByStatus = '#696969'; break;
            case 'attention': colorByStatus = '#FF00FF'; break;
        }

        // Если пользователь не менял цвет (остался дефолтным) — используем цвет по статусу
        if (taskColor === '#00E5FF') {
            taskColor = colorByStatus;
        }

        // Берем текст из инпута
        let rawDescription = document.getElementById("eventDescription").value.trim();

        // Очищаем текст от абсолютно всех старых тегов [color:...] во избежание дублирования
        rawDescription = rawDescription
            .replace(/\[color:[^\]]*\]/gi, '')
            .trim();

        // 🔥 МАНЕВР: Дописываем ОДИН актуальный тег цвета в самый конец описания для сервера
        // Если выбран дефолтный цвет, можно не писать, но для надежности пишем всегда
        // Убираем переносы строк и лишние пробелы
        const cleanDescription = rawDescription ? rawDescription.replace(/\n/g, ' ').replace(/\r/g, ' ').trim() : '';
        const descriptionWithColor = cleanDescription ? `${cleanDescription} [color:${taskColor}]` : `[color:${taskColor}]`;

        // 3. Формируем структуру для локального хранения
        let numericId = null;
        if (id && !isNaN(parseInt(String(id).replace(/[^\d]/g, ''), 10))) {
            numericId = parseInt(String(id).replace(/[^\d]/g, ''), 10);
        }

        const evData = {
            id: numericId,
            type: type,
            summary: document.getElementById("eventSummary").value.trim(),
            description: descriptionWithColor,
            start_ts_ms: startTsMs,
            end_ts_ms: endTsMs,
            status: eventStatus.value,
            color: taskColor,
            assignees: selectedAssignees,
            user_id: 1,
            duration: document.getElementById("eventDuration").value,
            client_id: document.getElementById("selectedClientId").value || null
        };

        if (!evData.summary) {
            alert("Заполните название события!");
            return;
        }

        try {
            const token = localStorage.getItem('vortex_token');
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            let resData = null; // 👈 ДОБАВИТЬ ЭТУ СТРОКУ

            if (id) {
                const taskId = parseInt(String(id).replace(/[^\d]/g, ''), 10);

                if (!isNaN(taskId)) {
                    const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
                        method: "POST",
                        headers: headers,
                        body: JSON.stringify({
                            title: evData.summary,
                            description: descriptionWithColor,
                            status: evData.status,
                            start_ts_ms: evData.start_ts_ms,
                            end_ts_ms: evData.end_ts_ms,
                            duration: evData.duration,
                            client_id: document.getElementById("selectedClientId").value || null,
                            assignees: selectedAssignees
                        })
                    });

                    if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);
                    resData = await response.json();
                    if (!resData.ok) throw new Error(resData.message || "Ошибка изменения на сервере");

                    // ==========================================
                    // 🔥 ОТПРАВКА В GOOGLE КАЛЕНДАРЬ (ОБНОВЛЕНИЕ)
                    // ==========================================
                    let clientInfo = '';
                    const clientNameVal = document.getElementById("selectedClientName").innerText;
                    const clientIdVal = document.getElementById("selectedClientId").value;

                    if (clientIdVal && clientNameVal && clientNameVal !== 'Без клиента') {
                        clientInfo = `\n📋 Клиент: ${clientNameVal}`;
                    }

                    // Берём google_event_id из сохранённой переменной
                    const googleEventId = window.currentGoogleEventId;

                    if (googleEventId) {
                        // Отправляем в Google без ожидания (фоном)
                        fetch(`${API_BASE_URL}/api/v1/google/event/${googleEventId}`, {
                            method: 'PUT',
                            headers: getAuthHeaders(),
                            body: JSON.stringify({
                                summary: evData.summary,
                                description: `${rawDescription}\n\n📌 Статус: ${evData.status}${clientInfo}\n🔄 Обновлено в Vortex CRM`,
                                duration: parseInt(evData.duration) || 30,
                                start_ts_ms: evData.start_ts_ms,
                                colorId: getGoogleColorId(taskColor)
                            })
                        }).then(response => {
                            if (response.ok) console.log("✅ Google обновлён в фоне");
                            else console.error("❌ Ошибка Google:", response.status);
                        }).catch(e => console.error("Ошибка сети Google:", e));
                    }
                }

            } else {
                console.log("🔵 СОЗДАНИЕ НОВОЙ ЗАДАЧИ");

                const response = await fetch(`${API_BASE_URL}/api/tasks/`, {
                    method: "POST",
                    headers: headers,
                    body: JSON.stringify({
                        title: evData.summary,
                        description: descriptionWithColor,
                        status: evData.status,
                        start_ts_ms: evData.start_ts_ms,
                        end_ts_ms: evData.end_ts_ms,
                        duration: evData.duration,
                        type: evData.type,
                        client_id: document.getElementById("selectedClientId").value || null,
                        assignees: selectedAssignees
                    })
                });

                if (!response.ok) throw new Error(`Ошибка сервера при создании: ${response.status}`);
                resData = await response.json();
                if (!resData.ok) throw new Error(resData.message || "Ошибка создания на сервере");

                // --- НАЧАЛО БЛОКА ИСПРАВЛЕНИЯ ---
                // Убеждаемся, что ID задачи получен корректно
                if (resData.task_id) {
                    numericId = resData.task_id;
                    evData.id = numericId;
                    console.log("🔵 numericId установлен из task_id:", numericId);
                } else if (resData.task && resData.task.id) {
                    numericId = resData.task.id;
                    evData.id = numericId;
                    console.log("🔵 numericId установлен из task.id:", numericId);
                } else {
                    console.error("❌ НЕ УДАЛОСЬ ПОЛУЧИТЬ ID ЗАДАЧИ! Ответ от сервера:", resData);
                }
                // --- КОНЕЦ БЛОКА ИСПРАВЛЕНИЯ ---

                // Далее идёт ваш существующий код отправки в Google...
                console.log("🔵 Пытаемся отправить в Google...");

                if (!numericId) {
                    console.error("❌ Ошибка: Нет ID задачи от сервера Vortex. Google-событие НЕ БУДЕТ связано с задачей.");
                    // return; // Можно раскомментировать, если не хотите создавать событие в Google без связи с задачей
                }

                // ==========================================
                // 🔥 ОТПРАВКА В GOOGLE КАЛЕНДАРЬ (СОЗДАНИЕ)
                // ==========================================
                let clientInfo = '';
                const clientNameVal = document.getElementById("selectedClientName").innerText;
                const clientIdVal = document.getElementById("selectedClientId").value;

                if (clientIdVal && clientNameVal && clientNameVal !== 'Без клиента') {
                    clientInfo = `\n📋 Клиент: ${clientNameVal}`;
                }

                // Отправляем в Google без ожидания (фоном)
                fetch(`${API_BASE_URL}/api/v1/google/event`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        summary: evData.summary,
                        description: `${rawDescription}\n\n📌 Статус: ${evData.status}${clientInfo}\n🔄 Создано в Vortex CRM`,
                        duration: parseInt(evData.duration) || 30,
                        start_ts_ms: evData.start_ts_ms,
                        colorId: getGoogleColorId(taskColor)
                    })
                }).then(async (googleResponse) => {
                    if (googleResponse.ok) {
                        const googleData = await googleResponse.json();
                        console.log("✅ Google событие создано в фоне:", googleData.event_id);
                        // Сохраняем google_event_id (тоже в фоне)
                        if (googleData.event_id && numericId) {
                            fetch(`${API_BASE_URL}/api/tasks/${numericId}/google-event-id`, {
                                method: 'POST',
                                headers: getAuthHeaders(),
                                body: JSON.stringify({ google_event_id: googleData.event_id })
                            }).catch(e => console.error("Ошибка сохранения google_event_id:", e));
                        }
                    }
                }).catch(e => console.error("Ошибка Google:", e));
            }

            // Обновляем локальную базу
            if (numericId) {
                const existingIndex = vortexEventsDatabase.findIndex(e => {
                    const eNumericId = parseInt(String(e.id).replace(/[^\d]/g, ''), 10);
                    return eNumericId === numericId;
                });

                if (existingIndex !== -1) {
                    // Обновляем существующую — ЯВНО указываем все поля
                    vortexEventsDatabase[existingIndex] = {
                        ...vortexEventsDatabase[existingIndex],
                        ...evData,
                        id: numericId,
                        status: evData.status  // ← ДОБАВЬ ЭТУ СТРОКУ
                    };
                } else {
                    // Добавляем новую
                    vortexEventsDatabase.push({ ...evData, id: numericId });
                }
            }

            eventModal.style.display = "none";

            // Принудительно перезагружаем эту конкретную задачу с сервера
            if (numericId) {
                try {
                    const token = localStorage.getItem('vortex_token');
                    const response = await fetch(`${API_BASE_URL}/api/tasks/${numericId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await response.json();
                    if (data.ok && data.task) {
                        // Обновляем задачу в локальной базе
                        const index = vortexEventsDatabase.findIndex(t => t.id == numericId);
                        if (index !== -1) {
                            vortexEventsDatabase[index] = {
                                ...vortexEventsDatabase[index],
                                status: data.task.status,
                                title: data.task.title,
                                description: data.task.description,
                                start_ts_ms: data.task.start_ts_ms,
                                end_ts_ms: data.task.end_ts_ms,
                                color: data.task.color,
                                assignees: data.task.assignees
                            };
                        }
                    }
                } catch (e) {
                    console.error("Ошибка перезагрузки задачи:", e);
                }
            }

            const currentMode = selectViewMode.value;
            if (currentMode === '3days' || currentMode === 'week') {
                // Обновляем только многодневный вид
                if (typeof window.refreshMultiDayView === 'function') {
                    await window.refreshMultiDayView();
                }
            } else {
                renderCalendar();
                syncTasksFromServer();
            }

            if (typeof window.refreshCurrentTimeLine === 'function') window.refreshCurrentTimeLine();

        } catch (error) {
            console.error("Ошибка сохранения задачи:", error);
            alert(`Данные не сохранились: ${error.message}`);
        }

    });

    btnCloseModal.addEventListener("click", () => eventModal.style.display = "none");

    btnPrevMonth.addEventListener("click", () => {
        const mode = selectViewMode.value;
        if (mode === '3days') {
            if (typeof goToPrevMulti === 'function') goToPrevMulti();
        } else if (mode === 'week') {
            if (typeof goToPrevMulti === 'function') goToPrevMulti();
        } else if (mode === 'day') {
            if (typeof window.goToPrevDay === 'function') window.goToPrevDay();
        } else if (mode === 'year') {
            if (typeof window.goToPrevYear === 'function') window.goToPrevYear();
        } else {
            currentDate.setMonth(currentDate.getMonth() - 1);
            window.currentDate = currentDate;
            renderCalendar();
        }
    });

    btnNextMonth.addEventListener("click", () => {
        const mode = selectViewMode.value;
        if (mode === '3days') {
            if (typeof goToNextMulti === 'function') goToNextMulti();
        } else if (mode === 'week') {
            if (typeof goToNextMulti === 'function') goToNextMulti();
        } else if (mode === 'day') {
            if (typeof window.goToNextDay === 'function') window.goToNextDay();
        } else if (mode === 'year') {
            if (typeof window.goToNextYear === 'function') window.goToNextYear();
        } else {
            currentDate.setMonth(currentDate.getMonth() + 1);
            window.currentDate = currentDate;
            renderCalendar();
        }
    });

    selectViewMode.addEventListener("change", renderCalendar);

    applyAccessControl();
    checkConnectionStatus();
    renderCalendar();

    // Глобальная функция для открытия модального окна и загрузки данных прямо с бэкенда
    window.fetchAndOpenTaskModal = function (taskOrId) {
        // Извлекаем чистый ID
        let rawId = (typeof taskOrId === 'object' && taskOrId !== null) ? taskOrId.id : taskOrId;
        if (!rawId) {
            console.error("Не удалось определить ID задачи для запроса");
            return;
        }

        // Очищаем ID от префиксов (если вдруг пришло "task_87", останется только 87)
        const taskId = parseInt(String(rawId).replace(/[^\d]/g, ''), 10);

        // Поиск задачи локально в массиве на случай фоллбэка (ошибки 404)
        const localTask = vortexEventsDatabase.find(e => e.id == rawId || e.id == taskId || e.id == `task_${taskId}`);

        if (isNaN(taskId)) {
            console.warn("ID не числовой. Попытка открыть из локальной базы данных.");
            if (localTask) openModalForEdit(localTask);
            return;
        }

        // Делаем правильный запрос с учетом API_BASE_URL и getAuthHeaders() вашего проекта
        fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
            method: "GET",
            headers: getAuthHeaders()
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Ошибка сервера: ${response.status}`);
                }
                return response.json();
            })
            .then(resData => {
                if (!resData.ok || !resData.task) {
                    throw new Error(resData.message || "Сервер вернул пустую задачу или ошибку прав");
                }

                const task = resData.task;
                if (task.id && typeof task.id === 'number') {
                    rawId = task.id;
                }

                // Функция, которая откроет модалку
                const openModal = () => {
                    // 1. Показываем модальное окно
                    if (eventModal) eventModal.style.display = "flex";

                    // --- ПАРСИНГ СИСТЕМНОЙ ЗАМЕТКИ ЦВЕТА И ОЧИСТКА ТЕКСТА ---
                    let rawDescription = task.description || "";
                    let detectedColor = '#00E5FF';

                    const colorRegex = /\[color:\s*(#[0-9A-Fa-f]{6})\]/;
                    const match = rawDescription.match(colorRegex);

                    if (match) {
                        detectedColor = match[1];
                        rawDescription = rawDescription.replace(colorRegex, '').trim();
                    } else if (task.color) {
                        detectedColor = task.color;
                    }

                    // 2. Связываем поля ответа сервера с элементами вашей формы
                    const idInput = document.getElementById("editingEventId");
                    const summaryInput = document.getElementById("eventSummary");
                    const descInput = document.getElementById("eventDescription");
                    const statusSelect = document.getElementById("eventStatus");

                    if (idInput) idInput.value = task.id;
                    if (summaryInput) summaryInput.value = task.title || task.summary || "";

                    // 🔥 СОХРАНЯЕМ КЛИЕНТА в правильные поля
                    const clientIdHidden = document.getElementById("selectedClientId");
                    const clientNameSpan = document.getElementById("selectedClientName");

                    if (clientIdHidden && task.client_id) {
                        clientIdHidden.value = task.client_id;
                    }

                    // Проверяем, не системный ли клиент
                    const isSystemClient = task.client_name === '__SYSTEM_TASK_CLIENT__' ||
                        (task.client_id && task.client_id.toString() === '0');

                    if (clientNameSpan && task.client_name && !isSystemClient) {
                        clientNameSpan.innerText = task.client_name;
                    } else if (clientNameSpan && task.client_id && !isSystemClient) {
                        clientNameSpan.innerText = `Клиент #${task.client_id}`;
                    } else if (clientNameSpan) {
                        clientNameSpan.innerText = 'Без клиента';
                    }

                    // 🔥 СИНХРОНИЗАЦИЯ С CLIENTMANAGER (только один блок!)
                    if (window.ClientManager) {
                        if (task.client_id && !isSystemClient) {
                            const clientName = (task.client_name && task.client_name !== '__SYSTEM_TASK_CLIENT__')
                                ? task.client_name
                                : `Клиент #${task.client_id}`;
                            window.ClientManager.setClient(task.client_id, clientName);
                        } else {
                            window.ClientManager.reset();
                        }
                    }

                    // Записываем в текстовое поле ОЧИЩЕННЫЙ текст без тега
                    if (descInput) descInput.value = rawDescription;

                    // 3. Выставляем статус (все возможные статусы)
                    if (statusSelect && task.status) {
                        const backendStatus = String(task.status).toLowerCase().trim();
                        // Разрешаем ВСЕ статусы, которые есть в select
                        const allowedStatuses = ['open', 'in_progress', 'urgent', 'waiting', 'attention', 'overdue', 'done'];
                        if (allowedStatuses.includes(backendStatus)) {
                            statusSelect.value = backendStatus;
                        } else {
                            statusSelect.value = "open";
                        }
                        statusSelect.dispatchEvent(new Event('change'));
                        console.log("Статус установлен:", statusSelect.value); // для отладки
                    }

                    // Добавляем статус "Просрочена" только если задача просрочена
                    if (task.status === 'overdue') {
                        addOverdueStatusToSelect();
                    } else {
                        removeOverdueStatusFromSelect();
                    }

                    // 4. Синхронизируем дату и время начала во Flatpickr
                    if (task.start_ts_ms && typeof dateTimePicker !== 'undefined' && dateTimePicker) {
                        const dateObj = new Date(task.start_ts_ms);
                        const year = dateObj.getFullYear();
                        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const day = String(dateObj.getDate()).padStart(2, '0');
                        const hours = String(dateObj.getHours()).padStart(2, '0');
                        const minutes = String(dateObj.getMinutes()).padStart(2, '0');

                        dateTimePicker.setDate(`${year}-${month}-${day} ${hours}:${minutes}`, false);
                    }

                    // Сохраняем google_event_id для обновления
                    if (task.google_event_id) {
                        window.currentGoogleEventId = task.google_event_id;
                    }

                    if (modalTitle) modalTitle.textContent = "Редактирование задачи";

                    // ==========================================================
                    // 5. ИНТЕГРАЦИЯ МЕНЕДЖЕРА СОТРУДНИКОВ
                    // ==========================================================
                    const rawAssignees = task.assignees && Array.isArray(task.assignees) ? task.assignees : [];

                    const currentAssigneesIds = rawAssignees.map(item => {
                        if (typeof item === 'object' && item !== null) {
                            return parseInt(item.id, 10);
                        }
                        return parseInt(item, 10);
                    }).filter(id => !isNaN(id));

                    console.log("DEBUG: Спарсенные ID ответственных для модалки:", currentAssigneesIds);

                    AssigneeManager.init(
                        'eventAssignees',
                        'assigneesMenu',
                        'assigneesTrigger',
                        'selectedCount',
                        currentAssigneesIds
                    );

                    // Показываем поле "Создал задачу"
                    const createdByWrapper = document.getElementById("createdByWrapper");
                    if (createdByWrapper) createdByWrapper.style.display = "block";

                    // Отображаем имя создателя
                    const createdByNameSpan = document.getElementById("createdByName");
                    if (createdByNameSpan && task.created_by_name) {
                        createdByNameSpan.innerText = task.created_by_name;
                    } else if (createdByNameSpan && task.created_by_user_id) {
                        createdByNameSpan.innerText = `ID: ${task.created_by_user_id}`;
                    }

                    // ==========================================
                    // 6. Установка цвета в пикер
                    // ==========================================
                    if (window.VortexColorPicker) {
                        window.VortexColorPicker.setColor(detectedColor);
                    }

                    // 7. ПРОВЕРКА КРАСНОГО ЦВЕТА И ПРОСРОЧКИ
                    const saveBtnModal = document.getElementById("btnSaveEvent");
                    if (saveBtnModal) {
                        // Проверяем цвет
                        const isRed = (detectedColor && detectedColor.toLowerCase() === '#ff4d4d');

                        // Проверяем просрочку по времени
                        let isOverdue = false;
                        const taskTime = task.start_ts_ms !== undefined ? task.start_ts_ms : task.end_ts_ms;
                        if (taskTime && task.status !== 'done') {
                            const taskDate = new Date(taskTime);
                            const now = new Date();
                            isOverdue = taskDate.getTime() < now.getTime();
                        }

                        saveBtnModal.style.display = (isRed || isOverdue) ? 'none' : 'flex';
                    }

                };

                // Если есть client_id но нет client_name - загружаем имя клиента
                if (task.client_id && !task.client_name) {
                    fetch(`${API_BASE_URL}/api/crm/clients/${task.client_id}`, {
                        headers: { 'Authorization': getAuthHeaders().Authorization }
                    })
                        .then(clientRes => clientRes.json())
                        .then(clientData => {
                            if (clientData.ok && clientData.client) {
                                task.client_name = clientData.client.name;
                            }
                            openModal();
                        })
                        .catch(err => {
                            console.error("Ошибка загрузки имени клиента:", err);
                            openModal();
                        });
                } else {
                    openModal();
                }
            })
            .catch(err => {
                console.warn("Бэкенд вернул 404/ошибку авторизации. Открываем данные из локального состояния:", err);
                if (localTask) {
                    openModalForEdit(localTask);
                } else {
                    alert(`Задача #${taskId} не найдена на сервере и отсутствует в локальном календаре.`);
                }
            });
    };

    // ============================================
    // Текущее время - вертикальная линия
    // ============================================
    let currentTimeLineInterval = null;
    let currentTimeLineElement = null;

    function drawCurrentTimeLine() {
        if (currentTimeLineElement && currentTimeLineElement.parentNode) {
            currentTimeLineElement.remove();
        }

        const mode = selectViewMode?.value;
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const percentOfHour = (currentMinute / 60) * 100;

        // --- Вспомогательная функция для добавления тултипа ---
        let tooltipInterval = null;
        let tooltipElement = null;

        function attachTooltip(line) {
            // Обработчик наведения
            line.addEventListener('mouseenter', (e) => {
                if (tooltipElement) {
                    tooltipElement.remove();
                    if (tooltipInterval) clearInterval(tooltipInterval);
                }

                // Создаём элемент тултипа
                tooltipElement = document.createElement('div');
                tooltipElement.className = 'current-time-tooltip';
                tooltipElement.style.cssText = `
                position: fixed;
                background: rgba(0, 0, 0, 0.85);
                color: #00FFFF;
                font-family: monospace;
                font-size: 12px;
                padding: 4px 8px;
                border-radius: 4px;
                border-left: 3px solid #00FFFF;
                pointer-events: none;
                z-index: 1001;
                white-space: nowrap;
                backdrop-filter: blur(4px);
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            `;
                document.body.appendChild(tooltipElement);

                // Функция обновления позиции и времени
                function updateTooltip() {
                    const rect = line.getBoundingClientRect();
                    const time = new Date();
                    const timeStr = time.toLocaleTimeString('ru-RU', { hour12: false });
                    tooltipElement.textContent = timeStr;

                    // Позиционируем слева от линии
                    let leftPos = rect.left - 10 - tooltipElement.offsetWidth;
                    if (leftPos < 5) leftPos = rect.left + 10; // если не влезает слева, показываем справа
                    tooltipElement.style.left = `${leftPos}px`;
                    tooltipElement.style.top = `${rect.top - tooltipElement.offsetHeight / 2}px`;
                }

                updateTooltip();
                // Обновляем время каждую секунду
                tooltipInterval = setInterval(updateTooltip, 1000);
            });

            line.addEventListener('mouseleave', () => {
                if (tooltipElement) {
                    tooltipElement.remove();
                    tooltipElement = null;
                }
                if (tooltipInterval) {
                    clearInterval(tooltipInterval);
                    tooltipInterval = null;
                }
            });
        }

        // --- Дневной режим ---
        if (mode === 'day') {
            const grid = document.getElementById('calendarDaysGrid');
            if (!grid) return;
            const slots = grid.querySelectorAll('.time-slot');
            if (slots.length === 0 || currentHour >= slots.length) return;
            if (currentDisplayDate.toDateString() !== now.toDateString()) return;

            const currentSlot = slots[currentHour];
            if (!currentSlot) return;

            const line = document.createElement('div');
            line.className = 'current-time-line';
            line.style.cssText = `
            position: absolute;
            left: 0;
            right: 0;
            height: 2px;
            background: #00FFFF;
            z-index: 1000;
            pointer-events: auto;   /* важно для наведения */
            box-shadow: 0 0 4px #00FFFF;
            top: calc(${percentOfHour}% - 1px);
            cursor: default;
        `;
            currentTimeLineElement = line;
            currentSlot.style.position = 'relative';
            currentSlot.appendChild(currentTimeLineElement);
            attachTooltip(line);
            return;
        }

        // --- Режимы 3 дня и Неделя ---
        if (mode !== '3days' && mode !== 'week') return;

        const grid = document.getElementById('calendarDaysGrid');
        if (!grid) return;

        const allSlots = grid.querySelectorAll('.time-slot-cell');
        if (allSlots.length === 0) return;

        const hoursPerDay = 24;
        const daysCount = allSlots.length / hoursPerDay;
        if (daysCount !== 3 && daysCount !== 7) return;

        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        let todayIndex = -1;
        for (let i = 0; i < daysCount; i++) {
            const slot = allSlots[i];
            if (slot.getAttribute('data-date') === todayStr) {
                todayIndex = i;
                break;
            }
        }
        if (todayIndex === -1) return;

        const targetSlotIndex = currentHour * daysCount + todayIndex;
        const targetSlot = allSlots[targetSlotIndex];
        if (!targetSlot) return;

        const slotHeight = targetSlot.offsetHeight;
        if (slotHeight === 0) return;

        const topPx = (percentOfHour / 100) * slotHeight;

        const line = document.createElement('div');
        line.className = 'current-time-line';
        line.style.cssText = `
        position: absolute;
        left: 0;
        right: 0;
        height: 2px;
        background: #00FFFF;
        z-index: 1000;
        pointer-events: auto;
        box-shadow: 0 0 4px #00FFFF;
        top: ${topPx}px;
        cursor: default;
    `;
        currentTimeLineElement = line;
        targetSlot.style.position = 'relative';
        targetSlot.appendChild(currentTimeLineElement);
        attachTooltip(line);
    }

    function initCurrentTimeLine() {
        if (currentTimeLineInterval) clearInterval(currentTimeLineInterval);
        drawCurrentTimeLine();
        currentTimeLineInterval = setInterval(() => {
            drawCurrentTimeLine();
        }, 60000); // обновляем каждую минуту
    }

    // Обновляем линию после любого рендера
    window.refreshCurrentTimeLine = drawCurrentTimeLine;

    // Запускаем при загрузке и при каждой смене режима/даты
    document.addEventListener('DOMContentLoaded', () => {
        initCurrentTimeLine();
        // Следим за сменой режима и перерисовкой
        const observer = new MutationObserver(() => {
            drawCurrentTimeLine();
        });
        const targetNode = document.getElementById('calendarDaysGrid');
        if (targetNode) observer.observe(targetNode, { childList: true, subtree: true });
    });

    const backBtn = document.getElementById("backToDashboardBtn");
    if (backBtn) {
        backBtn.addEventListener("click", function () {
            // Проверяем, есть ли предыдущая страница в истории
            if (window.history.length > 1 && document.referrer) {
                window.history.back(); // Возврат на предыдущую страницу
            } else {
                window.location.href = '/dashboard'; // Иначе на дашборд
            }
        });
    }

});