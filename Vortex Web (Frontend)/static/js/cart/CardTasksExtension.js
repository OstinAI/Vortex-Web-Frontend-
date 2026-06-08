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

    // Открытие формы для НОВОЙ задачи
    window.openTasks = function () {
        console.log("openTasks вызван");
        const editor = document.getElementById('task-editor');

        if (editor) {
            document.getElementById('task-editor-title-input').value = '';
            document.getElementById('task-editor-text-input').value = '';
            document.getElementById('task-editor-start-datetime').value = '';
            document.getElementById('task-editor-end-datetime').value = '';
            document.getElementById('task-editor-duration').value = '30';
            document.getElementById('task-editor-status').value = 'open';
            document.getElementById('edit-task-id').value = '';
            document.getElementById('task-editor-title').innerText = 'НОВАЯ ЗАДАЧА';
            document.getElementById('delete-task-editor-btn').style.display = 'none';

            // Скрываем весь блок "Создал задачу"
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

            editor.style.display = 'block';

            setTimeout(() => {
                document.getElementById('task-editor-title-input').focus();
            }, 100);
        } else {
            console.error("task-editor not found!");
        }
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

    // Сохранение задачи
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

        // Очищаем описание от старых цветовых тегов
        let cleanDescription = description || '';
        cleanDescription = cleanDescription.replace(/\[color:\s*#[0-9A-Fa-f]{6}\]/gi, '').trim();

        // Формируем описание с новым цветом ТОЛЬКО ЕСЛИ ВЫБРАН НЕ ДЕФОЛТНЫЙ ЦВЕТ
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
                if (taskId) {
                    const userName = localStorage.getItem('vortex_user_name') || "Сотрудник";
                    await fetch(`${API_BASE_URL}/api/notes/`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            client_id: parseInt(clientId),
                            description: `Задача "${title}" была изменена: ${userName}`,
                            type: "system"
                        })
                    });
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
        if (!taskId) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            });

            if (response.ok) {
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

})();