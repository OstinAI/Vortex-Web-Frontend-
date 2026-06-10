/**
 * CardTasksExtension.js
 * Расширение для управления задачами прямо в правой панели
 */

(function () {
    // Цвета для пикера
    const taskColors = [
        '#FF5252', // Красный
        '#FF9100', // Оранжевый
        '#FFD700', // Желтый
        '#00E676', // Зеленый
        '#00E5FF', // Голубой
        '#2979FF', // Синий
        '#AA00FF', // Фиолетовый
        '#ff4d4d'  // Красный для просрочки
    ];

    let selectedTaskColor = '#00E5FF';
    let flatpickrStart = null;
    let flatpickrEnd = null;

    // Получение имени пользователя
    function getTaskUserName() {
        return localStorage.getItem('vortex_user_name') ||
            localStorage.getItem('role') ||
            "Сотрудник";
    }

    // Вспомогательная функция для создания системной записи
    async function addTaskSystemLog(clientId, description) {
        try {
            await fetch(`${API_BASE_URL}/api/notes/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: parseInt(clientId),
                    description: description,
                    type: "system"
                })
            });
        } catch (e) {
            console.error("Ошибка создания системного лога:", e);
        }
    }

    // Инициализация цветового пикера
    function initTaskColorPicker() {
        const container = document.getElementById('task-color-picker-container');
        if (!container) return;

        container.innerHTML = '';

        taskColors.forEach(color => {
            const circle = document.createElement('div');
            circle.className = 'task-color-circle';
            circle.style.cssText = `
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: ${color};
                cursor: pointer;
                border: 2px solid ${selectedTaskColor === color ? '#fff' : 'transparent'};
                box-shadow: 0 0 5px rgba(0,0,0,0.3);
                transition: all 0.2s ease;
            `;
            circle.onclick = () => {
                selectedTaskColor = color;
                document.querySelectorAll('.task-color-circle').forEach(c => {
                    c.style.border = '2px solid transparent';
                });
                circle.style.border = '2px solid #fff';
            };
            container.appendChild(circle);
        });
    }

    // Инициализация пикеров даты
    function initDateTimePickers() {
        const startInput = document.getElementById('task-editor-start-datetime');
        const endInput = document.getElementById('task-editor-end-datetime');
        const enableCheckbox = document.getElementById('task-enable-end-date');
        const endRow = document.getElementById('task-end-date-row');
        const checkboxLabel = document.querySelector('.task-checkbox-label');

        if (!startInput) return;

        // Flatpickr для начала (с возможностью выбора времени)
        flatpickrStart = flatpickr(startInput, {
            enableTime: true,
            dateFormat: "Y-m-d H:i",
            time_24hr: true,
            locale: "ru",
            allowInput: false,
            onReady: function (selectedDates, dateStr, instance) {
                instance.calendarContainer.addEventListener("dblclick", () => {
                    if (instance.selectedDates.length > 0) instance.close();
                });
            }
        });

        // Клик по полю открывает календарь
        startInput.addEventListener("click", () => {
            flatpickrStart.open();
        });

        // Flatpickr для окончания
        flatpickrEnd = flatpickr(endInput, {
            enableTime: true,
            dateFormat: "Y-m-d H:i",
            time_24hr: true,
            locale: "ru",
            allowInput: false,
            onReady: function (selectedDates, dateStr, instance) {
                instance.calendarContainer.addEventListener("dblclick", () => {
                    if (instance.selectedDates.length > 0) instance.close();
                });
            }
        });

        endInput.addEventListener("click", () => {
            flatpickrEnd.open();
        });

        // Обработчик чекбокса (стрелки)
        if (enableCheckbox && endRow) {
            enableCheckbox.addEventListener("change", (e) => {
                if (e.target.checked) {
                    endRow.style.display = "flex";
                    if (checkboxLabel) checkboxLabel.classList.add('active');
                } else {
                    endRow.style.display = "none";
                    if (checkboxLabel) checkboxLabel.classList.remove('active');
                }
            });

            // Синхронизируем класс лейбла с состоянием чекбокса
            if (checkboxLabel) {
                if (enableCheckbox.checked) {
                    checkboxLabel.classList.add('active');
                } else {
                    checkboxLabel.classList.remove('active');
                }
            }
        }
    }

    // Открытие/закрытие формы для НОВОЙ задачи (toggle)
    window.openTasks = function () {
        console.log("openTasks вызван");
        const editor = document.getElementById('task-editor');

        if (!editor) {
            console.error("task-editor not found!");
            return;
        }

        // Проверяем, открыт ли редактор
        const isVisible = editor.style.display === 'block';

        if (isVisible) {
            // ЗАКРЫВАЕМ редактор при повторном нажатии
            editor.style.display = 'none';
            console.log("Редактор задач закрыт");
            return;
        }

        // ОТКРЫВАЕМ редактор для новой задачи
        editor.style.display = 'block';

        // Очищаем все поля
        document.getElementById('task-editor-title-input').value = '';
        document.getElementById('task-editor-text-input').value = '';
        document.getElementById('task-editor-start-datetime').value = '';
        document.getElementById('task-editor-end-datetime').value = '';
        document.getElementById('task-editor-duration').value = '30';
        document.getElementById('task-editor-status').value = 'open';
        document.getElementById('edit-task-id').value = '';
        document.getElementById('task-editor-title').innerText = 'НОВАЯ ЗАДАЧА';
        document.getElementById('delete-task-editor-btn').style.display = 'none';

        // Скрываем блок "Создал задачу"
        const creatorWrapper = document.getElementById('task-creator-wrapper');
        if (creatorWrapper) {
            creatorWrapper.style.display = 'none';
        }

        // Скрываем блок окончания и сбрасываем чекбокс
        const enableCheckbox = document.getElementById('task-enable-end-date');
        const endRow = document.getElementById('task-end-date-row');
        const checkboxLabel = document.querySelector('.task-checkbox-label');

        if (enableCheckbox) enableCheckbox.checked = false;
        if (endRow) endRow.style.display = 'none';
        if (checkboxLabel) checkboxLabel.classList.remove('active');

        // Сброс цвета по статусу
        const defaultStatus = 'open';
        selectedTaskColor = getColorByStatus(defaultStatus);
        initTaskColorPicker();

        // Инициализируем слушатель статуса
        const statusSelect = document.getElementById('task-editor-status');
        if (statusSelect) {
            statusSelect.value = defaultStatus;
            statusSelect.setAttribute('data-prev-status', defaultStatus);
        }
        initStatusListener();

        // Загружаем список сотрудников и автоматически выбираем текущего пользователя
        loadTaskAssigneesWithCurrentUser();

        // Устанавливаем фокус на поле названия
        setTimeout(() => {
            document.getElementById('task-editor-title-input').focus();
        }, 100);

        console.log("Редактор задач открыт");
    };

    // Новая функция: загрузка сотрудников с автоматическим выбором текущего пользователя
    async function loadTaskAssigneesWithCurrentUser() {
        const select = document.getElementById('task-editor-assignee');
        if (!select) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/employees/list`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            });
            const data = await response.json();

            if (data.status === "ok" && data.employees) {
                select.innerHTML = '<option value="">Без исполнителя</option>';

                // Получаем ID текущего пользователя из токена
                let currentUserId = null;
                try {
                    const token = localStorage.getItem('vortex_token');
                    if (token) {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        currentUserId = payload.user_id || payload.id;
                    }
                } catch (e) {
                    console.error("Ошибка получения ID пользователя:", e);
                }

                let selectedId = null;

                data.employees.forEach(user => {
                    if ((user.role || "").toLowerCase() !== "integrator") {
                        const opt = document.createElement('option');
                        opt.value = user.id;
                        opt.textContent = user.full_name || user.username;

                        // Если это текущий пользователь - отмечаем его как выбранный
                        if (currentUserId && user.id == currentUserId) {
                            opt.selected = true;
                            selectedId = user.id;
                        }

                        select.appendChild(opt);
                    }
                });

                // Если нашли текущего пользователя, обновляем имя создателя (если нужно)
                if (selectedId) {
                    const selectedUser = data.employees.find(u => u.id == selectedId);
                    if (selectedUser && document.getElementById('task-creator-name')) {
                        // Не меняем имя создателя, оно остается тем кто создает задачу
                    }
                }
            }
        } catch (e) {
            console.error("Ошибка загрузки сотрудников:", e);
        }
    }

    // Открытие формы для РЕДАКТИРОВАНИЯ задачи
    window.editTask = function (id, title, description, startMs, endMs, assigneeId, status, color, duration, createdByName) {
        console.log("editTask вызван:", id, title, "startMs:", startMs);

        const editor = document.getElementById('task-editor');

        if (editor) {
            document.getElementById('task-editor-title-input').value = title || '';
            document.getElementById('task-editor-text-input').value = description || '';

            // ===== ИСПРАВЛЕНО: загружаем длительность =====
            document.getElementById('task-editor-duration').value = duration || 30;

            document.getElementById('task-editor-status').value = status || 'open';

            // Устанавливаем дату начала
            let startValue = '';
            if (startMs && startMs > 0) {
                const date = new Date(startMs);
                startValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            }
            document.getElementById('task-editor-start-datetime').value = startValue;

            // Устанавливаем дату окончания
            let endValue = '';
            let hasEndDate = false;
            if (endMs && endMs > 0) {
                const date = new Date(endMs);
                endValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                hasEndDate = true;
            }
            document.getElementById('task-editor-end-datetime').value = endValue;

            // Показываем/скрываем блок окончания
            const enableCheckbox = document.getElementById('task-enable-end-date');
            const endRow = document.getElementById('task-end-date-row');
            const checkboxLabel = document.querySelector('.task-checkbox-label');

            if (enableCheckbox) enableCheckbox.checked = hasEndDate;
            if (endRow) endRow.style.display = hasEndDate ? "flex" : "none";
            if (checkboxLabel) {
                if (hasEndDate) {
                    checkboxLabel.classList.add('active');
                } else {
                    checkboxLabel.classList.remove('active');
                }
            }

            document.getElementById('edit-task-id').value = id;
            document.getElementById('task-editor-title').innerText = 'РЕДАКТИРОВАНИЕ ЗАДАЧИ';
            document.getElementById('delete-task-editor-btn').style.display = 'block';

            // Показываем блок "Создал задачу"
            const creatorWrapper = document.getElementById('task-creator-wrapper');
            if (creatorWrapper) {
                creatorWrapper.style.display = 'block';
            }

            // Устанавливаем имя создателя
            document.getElementById('task-creator-name').innerText = createdByName || localStorage.getItem('vortex_user_name') || 'Неизвестно';

            // Устанавливаем цвет (используем цвет из задачи, если есть)
            selectedTaskColor = color || getColorByStatus(status || 'open');
            initTaskColorPicker();

            // Инициализируем слушатель статуса
            const statusSelect = document.getElementById('task-editor-status');
            if (statusSelect) {
                statusSelect.setAttribute('data-prev-status', status || 'open');
            }
            initStatusListener();

            // Загружаем список сотрудников и выбираем исполнителя
            loadTaskAssignees(assigneeId || '');

            editor.style.display = 'block';

            setTimeout(() => {
                document.getElementById('task-editor-title-input').focus();
            }, 100);
        } else {
            console.error("task-editor not found!");
        }
    };

    // Закрытие формы
    window.closeTaskEditor = function () {
        const editor = document.getElementById('task-editor');
        if (editor) {
            editor.style.display = 'none';
        }
    };

    // Загрузка сотрудников для выбора (при редактировании - сохраняем выбранного)
    async function loadTaskAssignees(selectedId) {
        const select = document.getElementById('task-editor-assignee');
        if (!select) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/employees/list`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            });
            const data = await response.json();

            if (data.status === "ok" && data.employees) {
                select.innerHTML = '<option value="">Без исполнителя</option>';

                data.employees.forEach(user => {
                    if ((user.role || "").toLowerCase() !== "integrator") {
                        const opt = document.createElement('option');
                        opt.value = user.id;
                        opt.textContent = user.full_name || user.username;
                        if (selectedId && user.id == selectedId) {
                            opt.selected = true;
                        }
                        select.appendChild(opt);
                    }
                });
            }
        } catch (e) {
            console.error("Ошибка загрузки сотрудников:", e);
        }
    }

    // Сохранение задачи (новая или редактирование)
    window.saveTaskFromEditor = async function () {
        const taskId = document.getElementById('edit-task-id').value;
        const clientId = new URLSearchParams(window.location.search).get('id');
        const title = document.getElementById('task-editor-title-input').value.trim();
        const description = document.getElementById('task-editor-text-input').value.trim();

        // Получаем timestamp начала
        let startTsMs = 0;
        const startInput = document.getElementById('task-editor-start-datetime');
        if (startInput && startInput.value) {
            const date = new Date(startInput.value);
            startTsMs = date.getTime();
        }

        // Получаем timestamp окончания
        let endTsMs = null;
        const enableEndDate = document.getElementById('task-enable-end-date');
        if (enableEndDate && enableEndDate.checked) {
            const endInput = document.getElementById('task-editor-end-datetime');
            if (endInput && endInput.value) {
                const date = new Date(endInput.value);
                endTsMs = date.getTime();
            }
        }

        const assigneeId = document.getElementById('task-editor-assignee').value;
        const status = document.getElementById('task-editor-status').value;
        const duration = parseInt(document.getElementById('task-editor-duration').value) || 30;

        if (!title) {
            alert("Введите название задачи!");
            return;
        }

        if (!startTsMs) {
            alert("Укажите дату и время начала!");
            return;
        }

        const userName = getTaskUserName();
        const isEditing = !!taskId;

        // Если редактируем, загружаем старые данные для сравнения
        let oldData = null;
        if (isEditing) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
                });
                const data = await response.json();
                if (data.ok && data.task) {
                    oldData = data.task;
                }
            } catch (e) {
                console.error("Ошибка загрузки старой задачи:", e);
            }
        }

        // Очищаем описание от старых цветовых тегов
        let cleanDescription = description || '';
        cleanDescription = cleanDescription.replace(/\[color:\s*#[0-9A-Fa-f]{6}\]/gi, '').trim();

        // Формируем описание с новым цветом
        let descriptionWithColor = cleanDescription;
        if (selectedTaskColor && selectedTaskColor !== '#00E5FF') {
            descriptionWithColor = cleanDescription ? `${cleanDescription} [color:${selectedTaskColor}]` : `[color:${selectedTaskColor}]`;
        }

        const url = taskId ? `${API_BASE_URL}/api/tasks/${taskId}` : `${API_BASE_URL}/api/tasks/`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: parseInt(clientId),
                    title: title,
                    description: descriptionWithColor,
                    start_ts_ms: startTsMs,
                    end_ts_ms: endTsMs,
                    status: status,
                    duration: duration,
                    color: selectedTaskColor,
                    assignees: assigneeId ? [parseInt(assigneeId)] : []
                })
            });

            if (response.ok) {
                // --- СОЗДАЕМ ДЕТАЛЬНУЮ СИСТЕМНУЮ ЗАПИСЬ ---
                if (isEditing && oldData) {
                    const changes = [];

                    // Сравниваем заголовок
                    if (oldData.title !== title) {
                        changes.push(`Заголовок: "${oldData.title}" → "${title}"`);
                    }

                    // Сравниваем описание (очищаем от цветовых тегов)
                    const oldCleanDesc = (oldData.description || '').replace(/\[color:\s*#[0-9A-Fa-f]{6}\]/gi, '').trim();
                    if (oldCleanDesc !== cleanDescription) {
                        const oldShort = oldCleanDesc.length > 50 ? oldCleanDesc.substring(0, 50) + '...' : oldCleanDesc;
                        const newShort = cleanDescription.length > 50 ? cleanDescription.substring(0, 50) + '...' : cleanDescription;
                        changes.push(`Описание: "${oldShort}" → "${newShort}"`);
                    }

                    // Сравниваем дату начала
                    if (oldData.start_ts_ms !== startTsMs) {
                        const oldDate = oldData.start_ts_ms ? new Date(oldData.start_ts_ms).toLocaleString('ru-RU') : 'не указана';
                        const newDate = startTsMs ? new Date(startTsMs).toLocaleString('ru-RU') : 'не указана';
                        changes.push(`Дата начала: ${oldDate} → ${newDate}`);
                    }

                    // Сравниваем дату окончания
                    if (oldData.end_ts_ms !== endTsMs) {
                        const oldEnd = oldData.end_ts_ms ? new Date(oldData.end_ts_ms).toLocaleString('ru-RU') : 'не указана';
                        const newEnd = endTsMs ? new Date(endTsMs).toLocaleString('ru-RU') : 'не указана';
                        changes.push(`Дата окончания: ${oldEnd} → ${newEnd}`);
                    }

                    // Сравниваем статус
                    if (oldData.status !== status) {
                        const statusMap = { 'open': 'Открыта', 'in_progress': 'В работе', 'done': 'Выполнена', 'urgent': 'Срочно', 'waiting': 'Ожидание', 'attention': 'Внимание' };
                        const oldStatus = statusMap[oldData.status] || oldData.status;
                        const newStatus = statusMap[status] || status;
                        changes.push(`Статус: ${oldStatus} → ${newStatus}`);
                    }

                    // Сравниваем длительность
                    if (oldData.duration !== duration) {
                        changes.push(`Длительность: ${oldData.duration || 0} мин → ${duration} мин`);
                    }

                    // Сравниваем исполнителя
                    const oldAssignee = oldData.assignees && oldData.assignees.length > 0 ? oldData.assignees[0] : null;
                    if (oldAssignee != assigneeId) {
                        // Получаем имена сотрудников
                        let oldName = 'не назначен';
                        let newName = 'не назначен';

                        if (oldAssignee) {
                            const empRes = await fetch(`${API_BASE_URL}/api/employees/list`, {
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
                            });
                            const empData = await empRes.json();
                            if (empData.employees) {
                                const oldEmp = empData.employees.find(e => e.id == oldAssignee);
                                const newEmp = empData.employees.find(e => e.id == assigneeId);
                                oldName = oldEmp ? (oldEmp.full_name || oldEmp.username) : 'сотрудник';
                                newName = newEmp ? (newEmp.full_name || newEmp.username) : 'сотрудник';
                            }
                        } else if (assigneeId) {
                            const empRes = await fetch(`${API_BASE_URL}/api/employees/list`, {
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
                            });
                            const empData = await empRes.json();
                            if (empData.employees) {
                                const newEmp = empData.employees.find(e => e.id == assigneeId);
                                newName = newEmp ? (newEmp.full_name || newEmp.username) : 'сотрудник';
                            }
                        }

                        changes.push(`Исполнитель: ${oldName} → ${newName}`);
                    }

                    // Сравниваем цвет
                    if (oldData.color !== selectedTaskColor) {
                        changes.push(`Цвет задачи изменён`);
                    }

                    // Отправляем системный лог с изменениями
                    if (changes.length > 0) {
                        await addTaskSystemLog(clientId, `${userName} изменил(а) задачу:<br>${changes.join('<br>')}`);
                    } else {
                        await addTaskSystemLog(clientId, `${userName} отредактировал(а) задачу "${title}" (без изменений)`);
                    }

                } else if (!isEditing) {
                    // Новая задача
                    const assigneeName = await getAssigneeName(assigneeId);
                    const startDate = new Date(startTsMs).toLocaleString('ru-RU');
                    let logMsg = `${userName} создал(а) новую задачу: "${title}"\n📅 Начало: ${startDate}`;
                    if (endTsMs) {
                        const endDate = new Date(endTsMs).toLocaleString('ru-RU');
                        logMsg += `\n📅 Окончание: ${endDate}`;
                    }
                    if (assigneeName) {
                        logMsg += `\n👤 Исполнитель: ${assigneeName}`;
                    }
                    if (duration !== 30) {
                        logMsg += `\n⏱ Длительность: ${duration} мин`;
                    }
                    await addTaskSystemLog(clientId, logMsg);
                }

                window.closeTaskEditor();
                if (typeof window.loadClientHistory === 'function') {
                    window.loadClientHistory();
                }
            } else {
                const err = await response.json();
                alert("Ошибка: " + (err.message || "Не удалось сохранить"));
            }
        } catch (e) {
            console.error("Ошибка:", e);
            alert("Ошибка сети");
        }
    };

    // Вспомогательная функция для получения имени исполнителя
    async function getAssigneeName(assigneeId) {
        if (!assigneeId) return null;
        try {
            const response = await fetch(`${API_BASE_URL}/api/employees/list`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            });
            const data = await response.json();
            if (data.employees) {
                const emp = data.employees.find(e => e.id == assigneeId);
                return emp ? (emp.full_name || emp.username) : null;
            }
        } catch (e) {
            console.error(e);
        }
        return null;
    }

    // Выполнение задачи
    window.completeTaskFromEditor = async function (taskId) {
        if (!taskId) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: "done" })
            });

            if (response.ok) {
                if (typeof window.loadClientHistory === 'function') {
                    window.loadClientHistory();
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Удаление задачи
    window.deleteTaskFromEditor = async function () {
        const taskId = document.getElementById('edit-task-id').value;
        const clientId = new URLSearchParams(window.location.search).get('id');
        if (!taskId) return;

        // Загружаем название задачи перед удалением
        let taskTitle = "Без названия";
        try {
            const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            });
            const data = await response.json();
            if (data.ok && data.task) {
                taskTitle = data.task.title || "Без названия";
            }
        } catch (e) {
            console.error("Ошибка загрузки названия задачи:", e);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            });

            if (response.ok) {
                const userName = getTaskUserName();
                await addTaskSystemLog(clientId, `${userName} удалил(а) задачу: "${taskTitle}"`);

                window.closeTaskEditor();
                if (typeof window.loadClientHistory === 'function') {
                    window.loadClientHistory();
                }
            } else {
                alert("Ошибка при удалении");
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Получить цвет по статусу
    function getColorByStatus(status) {
        switch (status) {
            case 'open': return '#00E5FF';      // голубой
            case 'in_progress': return '#FFD700'; // жёлтый
            case 'urgent': return '#FF4500';     // оранжевый
            case 'waiting': return '#696969';    // серый
            case 'attention': return '#FF00FF';  // розовый
            case 'done': return '#00FF00';       // зелёный
            default: return '#00E5FF';
        }
    }

    // Инициализация обработчика статуса
    function initStatusListener() {
        const statusSelect = document.getElementById('task-editor-status');
        if (!statusSelect) return;

        // Убираем старый обработчик, если есть
        statusSelect.removeEventListener('change', onStatusChange);
        statusSelect.addEventListener('change', onStatusChange);
    }

    function onStatusChange(e) {
        const newStatus = e.target.value;
        const colorByStatus = getColorByStatus(newStatus);

        // Если пользователь не менял цвет вручную (цвет равен цвету по статусу)
        // или если статус изменился, обновляем цвет
        if (selectedTaskColor === getColorByStatus(document.getElementById('task-editor-status').getAttribute('data-prev-status')) ||
            selectedTaskColor === '#00E5FF') {
            selectedTaskColor = colorByStatus;
            initTaskColorPicker();
        }

        // Сохраняем предыдущий статус
        e.target.setAttribute('data-prev-status', newStatus);
    }

    // Инициализация после загрузки DOM
    document.addEventListener('DOMContentLoaded', () => {
        initDateTimePickers();
    });

    // Добавьте в конец CardTasksExtension.js
    // Закрытие редактора при клике вне его области (только на планшете)
    document.addEventListener('click', function (event) {
        // Проверяем, что мы на планшете
        if (window.innerWidth > 1024) return;

        const editor = document.getElementById('task-editor');
        const taskButton = event.target.closest('.mini-tool-btn');
        const isTaskButton = taskButton && taskButton.innerText.includes('ЗАДАЧИ');

        // Если кликнули не по редактору и не по кнопке "ЗАДАЧИ"
        if (editor && editor.style.display === 'block') {
            if (!editor.contains(event.target) && !isTaskButton) {
                editor.style.display = 'none';
                console.log("Редактор закрыт кликом вне");
            }
        }
    });

})();