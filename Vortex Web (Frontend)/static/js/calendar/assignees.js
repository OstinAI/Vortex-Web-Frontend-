// static/js/calendar/assignees.js

window.AssigneeManager = {
    selectedIds: [],
    container: null,
    menu: null,
    trigger: null,
    countLabel: null,

    // Получить массив выбранных ID для сохранения на бэкенд
    getSelectedIds() {
        return this.selectedIds;
    },

    // Инициализация менеджера (вызывается при открытии модалки)
    async init(containerId, menuId, triggerId, countId, currentAssignees = []) {
        this.container = document.getElementById(containerId);
        this.menu = document.getElementById(menuId);
        this.trigger = document.getElementById(triggerId);
        this.countLabel = document.getElementById(countId);

        // Превращаем входящие ID в числа, чтобы сравнение типов не сбоило
        this.selectedIds = currentAssignees.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

        // Навешиваем открытие/закрытие меню на плашку
        if (this.trigger) {
            this.trigger.onclick = (e) => {
                e.stopPropagation(); // Чтобы документ не перехватывал клик
                if (this.menu) {
                    this.menu.classList.toggle('show');
                }
            };
        }

        // Загружаем данные сотрудников
        await this.loadEmployees();
    },

    async loadEmployees() {
        try {
            const token = localStorage.getItem('vortex_token');
            const currentUserRole = (localStorage.getItem('vortex_user_role') || '').toLowerCase();

            if (!token) {
                console.error("ОШИБКА VORTEX AUTH: Токен авторизации не найден!");
                return;
            }

            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            let res = await fetch(`${API_BASE_URL}/api/employees/list`, { headers });

            if (!res.ok) {
                console.error(`Ошибка сервера: Статус ${res.status}`);
                return;
            }

            const data = await res.json();

            let list = [];
            if (data.status === 'ok' && Array.isArray(data.employees)) {
                list = data.employees;
            } else if (Array.isArray(data)) {
                list = data;
            }

            // --- ФИЛЬТРАЦИЯ ИНТЕГРАТОРОВ КАК В TASKS.JS ---
            this.allEmployeesCache = list.filter(user => {
                const userRole = (user.role || '').toLowerCase();

                // Если сотрудник в списке — интегратор, оставляем его ТОЛЬКО если мы сами интеграторы
                if (userRole === 'integrator' || userRole === 'интегратор') {
                    return currentUserRole === 'integrator';
                }
                return true;
            });

            console.log("DEBUG [AssigneeManager]: Отфильтрованный список сотрудников:", this.allEmployeesCache);

            this.render(this.allEmployeesCache);
        } catch (e) {
            console.error("Ошибка загрузки сотрудников в AssigneeManager:", e);
        }
    },

    render(employees) {
        if (!this.menu) return;
        this.menu.innerHTML = ''; // Очищаем старый список перед перерисовкой

        if (!Array.isArray(employees)) {
            console.warn("Предупреждение: Ожидался массив сотрудников, получено:", employees);
            return;
        }

        employees.forEach(emp => {
            const empId = parseInt(emp.id, 10);

            // Жесткое сравнение чисел через .some()
            const isSelected = this.selectedIds.some(id => parseInt(id, 10) === empId);

            const item = document.createElement('div');
            item.className = `dropdown-item ${isSelected ? 'selected' : ''}`;

            // ТОЧНЫЙ ПОДБОР ИМЕНИ: сначала ищем full_name или username, как в tasks.js
            const employeeName = emp.full_name || emp.username || emp.name || emp.fio || `Сотрудник №${empId}`;

            // Чекбокс-иконка + ФИО сотрудника
            item.innerHTML = `
                <i class="fa-regular ${isSelected ? 'fa-square-check' : 'fa-square'}" style="margin-right: 8px; color: ${isSelected ? 'var(--vortex-accent, #00e5ff)' : '#555'}"></i>
                <span>${employeeName}</span>
            `;

            // Обработчик выбора сотрудника
            item.onclick = (e) => {
                e.stopPropagation(); // Не закрываем меню при выборе элементов!

                if (this.selectedIds.some(id => parseInt(id, 10) === empId)) {
                    // Если уже выбран — удаляем из массива
                    this.selectedIds = this.selectedIds.filter(id => parseInt(id, 10) !== empId);
                } else {
                    // Если не выбран — добавляем
                    this.selectedIds.push(empId);
                }

                this.render(employees);
                this.updateTriggerText();
            };

            this.menu.appendChild(item);
        });

        // После отрисовки обновляем надпись на кнопке
        this.updateTriggerText();
    },

    // Функция обновления счетчика выбранных
    updateTriggerText() {
        if (!this.trigger) return;

        // Если массив пустой (новая задача или сбросили выбор)
        if (!this.selectedIds || this.selectedIds.length === 0) {
            this.trigger.innerHTML = `<span>Выберите сотрудников</span> <i class="fa-solid fa-chevron-down text-muted" style="font-size: 10px;"></i>`;
            return;
        }

        // Ищем объекты сотрудников для каждого выбранного ID из закэшированного списка
        const cache = this.allEmployeesCache || [];
        const chosenNames = this.selectedIds.map(id => {
            const emp = cache.find(e => parseInt(e.id, 10) === parseInt(id, 10));
            return emp ? (emp.full_name || emp.username || emp.name) : `ID: ${id}`;
        });

        // Выводим красивые ФИО через запятую прямо на кнопку
        this.trigger.innerHTML = `
            <span style="color: #ffffff; font-weight: 500;">${chosenNames.join(', ')}</span>
            <i class="fa-solid fa-chevron-down text-muted" style="font-size: 10px;"></i>
        `;
    },
};

// Глобальный клик закрывает открытые выпадающие списки сотрудников
document.addEventListener('click', () => {
    const menu = document.getElementById('assigneesMenu');
    if (menu) menu.classList.remove('show');
});