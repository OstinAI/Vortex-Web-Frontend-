let allEmployees = [];
let statusEmpChart, positionChart, hiringChart, retentionChart;

document.addEventListener('DOMContentLoaded', () => {
    initResizer();
    loadEmployees();
});

// --- ЛОГИКА РЕСАЙЗЕРА ---
function initResizer() {
    const resizer = document.getElementById('resizer');
    const leftSide = document.getElementById('left-side');
    let isResizing = false;

    // Загружаем сохраненную ширину из памяти
    const savedWidth = localStorage.getItem('vortex-emp-split');
    if (savedWidth) leftSide.style.width = savedWidth + '%';

    resizer.addEventListener('mousedown', () => isResizing = true);
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        let percentage = (e.clientX / window.innerWidth) * 100;
        if (percentage > 20 && percentage < 50) {
            leftSide.style.width = percentage + '%';
            localStorage.setItem('vortex-emp-split', percentage);
        }
    });
    document.addEventListener('mouseup', () => isResizing = false);
}

// --- ЗАГРУЗКА СПИСКА ---
async function loadEmployees() {
    const token = localStorage.getItem('vortex_token');
    const container = document.getElementById('employees-list-container');

    try {
        const res = await fetch(`${API_BASE_URL}/api/employees/list`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.status === 'ok') {
            allEmployees = data.employees;
            renderEmployees();
        } else {
            container.innerHTML = `<div class="loading-state">Ошибка: ${data.message}</div>`;
        }
    } catch (e) {
        console.error("Ошибка загрузки:", e);
        container.innerHTML = `<div class="loading-state">Ошибка сети</div>`;
    }
}

function renderEmployees() {
    const container = document.getElementById('employees-list-container');
    container.innerHTML = '';

    if (allEmployees.length === 0) {
        container.innerHTML = '<div class="loading-state">Сотрудников пока нет</div>';
        // Если список пуст, тоже вызываем статистику, чтобы обнулить графики
        updateEmployeeStats();
        return;
    }

    // Получаем роль и ID текущего пользователя из токена/localStorage
    const currentUserRole = (localStorage.getItem('vortex_role') || '').toLowerCase();
    const currentUserId = parseInt(localStorage.getItem('vortex_user_id') || '0');

    allEmployees.forEach(emp => {
        const empRole = (emp.role || '').toLowerCase();
        const isIntegrator = empRole === 'integrator';

        // ЛОГИКА СКРЫТИЯ:
        // Если это карточка Интегратора, но текущий пользователь НЕ Интегратор — пропускаем отрисовку
        if (isIntegrator && currentUserRole !== 'integrator') {
            return; // Прыгаем к следующему сотруднику
        }

        const div = document.createElement('div');
        div.className = 'employee-item';
        div.onclick = () => openEmployeeModal(emp);

        // Цвет полоски в зависимости от статуса
        let statusColor = '#00E5FF';
        if (emp.status === 'fired') statusColor = '#941B1B';
        if (emp.status === 'vacation') statusColor = '#FFB000';

        div.style.borderLeft = `4px solid ${statusColor}`;

        div.innerHTML = `
            <span class="emp-name">${emp.full_name || emp.username}</span>
            <div class="emp-meta">
                <span style="color: ${statusColor}">${emp.position || 'Должность не указана'}</span> | ${emp.phone || 'Без связи'}
            </div>
        `;
        container.appendChild(div);
    });

    // --- ОБНОВЛЕНИЕ ГРАФИКОВ ---
    // Вызываем функцию статистики сразу после отрисовки списка
    // Данные для графиков будут браться из глобального массива allEmployees
    updateEmployeeStats();
}

// --- УПРАВЛЕНИЕ МОДАЛКОЙ ---
// ===== УПРАВЛЕНИЕ МОДАЛКОЙ =====
function openEmployeeModal(emp = null) {
    const modal = document.getElementById('modal-employee');
    const btn = document.getElementById('btn-save-employee');
    const title = document.getElementById('modal-title');
    const passwordInput = document.getElementById('emp-password');

    if (!modal) return;

    if (passwordInput) {
        passwordInput.placeholder = '••••••••';
    }

    if (emp) {
        title.innerText = 'РЕДАКТИРОВАНИЕ СОТРУДНИКА';
        if (btn) btn.innerText = 'СОХРАНИТЬ ИЗМЕНЕНИЯ';

        const fields = {
            'employee-id': emp.id,
            'emp-fullname': emp.full_name,
            'emp-phone': emp.phone,
            'emp-email': emp.email,
            'emp-position': emp.position,
            'emp-birth': emp.birth_date,
            'emp-hire': emp.hire_date,
            'emp-address': emp.address,
            'emp-note': emp.notes,
            'emp-login': emp.username,
            'emp-role': emp.role || 'User',
            'emp-status': emp.status || 'active'
        };

        for (let id in fields) {
            let el = document.getElementById(id);
            if (el) el.value = fields[id] || '';
        }

        const roleText = document.getElementById('selected-role-text');
        if (roleText) roleText.innerText = emp.role || 'Сотрудник (User)';

        const statusText = document.getElementById('selected-status-text');
        if (statusText) statusText.innerText = (emp.status === 'active' ? 'В ШТАТЕ' :
            emp.status === 'intern' ? 'СТАЖЕР' :
                emp.status === 'vacation' ? 'В ОТПУСКЕ' :
                    emp.status === 'sick' ? 'БОЛЬНИЧНЫЙ' :
                        emp.status === 'exchange' ? 'ПО ОБМЕНУ' :
                            emp.status === 'outstaff' ? 'ВНЕШТАТНИК' :
                                emp.status === 'fired' ? 'УВОЛЕН' : 'В ШТАТЕ');

        if (passwordInput) {
            passwordInput.value = '';
            passwordInput.placeholder = 'ОСТАВЬТЕ ПУСТЫМ, ЧТОБЫ НЕ МЕНЯТЬ';
        }
    } else {
        title.innerText = 'РЕГИСТРАЦИЯ СОТРУДНИКА';
        if (btn) btn.innerText = 'ЗАРЕГИСТРИРОВАТЬ';

        const idField = document.getElementById('employee-id');
        if (idField) idField.value = '';

        document.querySelectorAll('.vortex-modal-body input, .vortex-modal-body textarea').forEach(i => {
            i.value = '';
            if (i.id === 'emp-fullname') i.placeholder = 'ИВАНОВ ИВАН ИВАНОВИЧ';
            if (i.id === 'emp-phone') i.placeholder = '+7 (___) ___-__-__';
            if (i.id === 'emp-email') i.placeholder = 'VORTEX@EXAMPLE.COM';
            if (i.id === 'emp-login') i.placeholder = 'USER_LOGIN';
        });

        let statusField = document.getElementById('emp-status');
        if (statusField) statusField.value = 'active';
        let roleField = document.getElementById('emp-role');
        if (roleField) roleField.value = 'User';

        const roleText = document.getElementById('selected-role-text');
        if (roleText) roleText.innerText = 'Сотрудник (User)';

        const statusText = document.getElementById('selected-status-text');
        if (statusText) statusText.innerText = 'В ШТАТЕ';
    }

    modal.style.display = 'flex';
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
        const nameInput = document.getElementById('emp-fullname');
        if (nameInput) nameInput.focus();
    }, 100);
}

// ===== ФУНКЦИЯ ЗАКРЫТИЯ (ОДНА!) =====
function closeEmployeeModal() {
    const modal = document.getElementById('modal-employee');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ===== ЗАКРЫТИЕ ПО КЛИКУ НА ФОН =====
document.addEventListener('DOMContentLoaded', function () {
    const modal = document.getElementById('modal-employee');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                closeEmployeeModal();
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                closeEmployeeModal();
            }
        });
    }
});

// --- СОХРАНЕНИЕ (СВЯЗКА С PYTHON) ---
async function saveEmployee() {
    const editIdEl = document.getElementById('employee-id');
    const token = localStorage.getItem('vortex_token');

    // Безопасное получение значений
    const getValue = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : '';
    };

    const payload = {
        full_name: getValue('emp-fullname'),
        phone: getValue('emp-phone'),
        email: getValue('emp-email'),
        position: getValue('emp-position'),
        status: getValue('emp-status'),
        birth_date: getValue('emp-birth'),
        hire_date: getValue('emp-hire'),
        address: getValue('emp-address'),
        notes: getValue('emp-note'),
        username: getValue('emp-login'),
        role: getValue('emp-role')
    };

    const password = getValue('emp-password');
    if (password) payload.password = password;

    let url = `${API_BASE_URL}/api/employees/create`;
    if (editIdEl && editIdEl.value) {
        url = `${API_BASE_URL}/api/employees/update`;
        payload.id = editIdEl.value;
    }

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (result.status === 'ok' || result.ok === true) {
            closeEmployeeModal();
            loadEmployees();
        } else {
            alert("Ошибка: " + (result.message || "Неизвестная ошибка"));
        }
    } catch (e) {
        console.error("Ошибка сохранения:", e);
        alert("Ошибка сети при сохранении");
    }
}

function toggleVortexSelect(id) {
    // Закрываем другие списки, если они открыты
    document.querySelectorAll('.vortex-select-dropdown').forEach(d => {
        if (d.id !== id) d.classList.remove('show');
    });
    document.getElementById(id).classList.toggle('show');
}

function selectVortexOption(type, value, text) {
    if (type === 'role') {
        document.getElementById('emp-role').value = value;
        document.getElementById('selected-role-text').innerText = text;
    } else if (type === 'status') {
        document.getElementById('emp-status').value = value;
        document.getElementById('selected-status-text').innerText = text;
    }
    // Скрываем список после выбора
    document.querySelectorAll('.vortex-select-dropdown').forEach(d => d.classList.remove('show'));
}

// Закрытие при клике мимо
window.addEventListener('click', function (e) {
    if (!e.target.closest('.vortex-custom-select')) {
        document.querySelectorAll('.vortex-select-dropdown').forEach(d => d.classList.remove('show'));
    }
});

function checkAndShowIntegrator() {
    // Получаем роль текущего пользователя из localStorage
    const currentUserRole = (localStorage.getItem('vortex_user_role') || '').toLowerCase();
    const dropdown = document.getElementById('role-dropdown');

    if (!dropdown) return;

    // Только Директор или сам Интегратор могут видеть и назначать эту роль
    if (currentUserRole === 'director' || currentUserRole === 'integrator') {
        const item = document.createElement('div');
        item.className = 'vortex-select-item';
        item.innerText = 'Интегратор';
        item.onclick = () => selectVortexOption('role', 'Integrator', 'Интегратор');
        dropdown.appendChild(item);
    }
}

// 1. Главная функция сбора данных
// 1. Главная функция сбора данных
// 1. Главная функция управления статистикой
function updateEmployeeStats() {
    // Если данных еще нет, пробуем подождать 100мс (на случай задержки загрузки)
    if (!allEmployees || allEmployees.length === 0) {
        return;
    }

    const stats = {
        status: { active: 0, vacation: 0, sick: 0, intern: 0, fired: 0, exchange: 0, outstaff: 0 },
        positions: {},
        hiring: {},
        retention: { active: 0, fired: 0 }
    };

    allEmployees.forEach(emp => {
        // Статусы (приводим к нижнему регистру для точности)
        const s = (emp.status || 'active').toLowerCase();
        if (stats.status.hasOwnProperty(s)) stats.status[s]++;

        // Должности (убираем лишние пробелы)
        const pos = (emp.position || 'Не указана').trim();
        stats.positions[pos] = (stats.positions[pos] || 0) + 1;

        // Динамика найма (парсим YYYY-MM-DD из Python)
        if (emp.hire_date && emp.hire_date.includes('-')) {
            const year = emp.hire_date.split('-')[0];
            stats.hiring[year] = (stats.hiring[year] || 0) + 1;
        }

        // Текучесть
        if (s === 'fired') stats.retention.fired++;
        else stats.retention.active++;
    });

    // Рисуем графики только если нашли данные
    try {
        renderStatusChart(stats.status);
        renderPositionChart(stats.positions);
        renderHiringChart(stats.hiring);
        renderRetentionChart(stats.retention);
    } catch (e) {
        console.error("Chart Render Error:", e);
    }
}

// 2. Кольцевая диаграмма
function renderStatusChart(data) {
    const ctx = document.getElementById('statusEmpChart')?.getContext('2d');
    if (!ctx) return;
    if (window.stChart) window.stChart.destroy();
    window.stChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['В штате', 'Отпуск', 'Болеют', 'Стажеры'],
            datasets: [{
                data: [data.active, data.vacation, data.sick, data.intern],
                backgroundColor: ['#1DB954', '#FFB000', '#941B1B', '#00E5FF'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%', // Делаем кольцо тоньше (минимализм)
            plugins: { legend: { position: 'bottom', labels: { color: '#888', usePointStyle: true, font: { size: 10 } } } }
        }
    });
}

// 3. Должности (Горизонтальный график)
function renderPositionChart(posData) {
    const ctx = document.getElementById('positionChart')?.getContext('2d');
    if (!ctx) return;
    if (window.pChart) window.pChart.destroy();

    const labels = Object.keys(posData);
    const values = Object.values(posData);

    window.pChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: 'rgba(0, 229, 255, 0.5)',
                borderColor: '#00E5FF',
                borderWidth: 1,
                borderRadius: 2
            }]
        },
        options: {
            indexAxis: 'y', // Это делает график горизонтальным
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#555', stepSize: 1 } },
                y: { grid: { display: false }, ticks: { color: '#888', font: { size: 10 } } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// ОСТАЛЬНЫЕ ГРАФИКИ (Наем и Текучесть) реализуй аналогично, используя window.названиеГрафика.destroy()

// 4. Линия: Динамика найма
function renderHiringChart(hiringData) {
    const canvas = document.getElementById('hiringChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (window.hireChart) window.hireChart.destroy();

    const years = Object.keys(hiringData).sort();
    const counts = years.map(y => hiringData[y]);

    window.hireChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'Нанято',
                data: counts,
                borderColor: '#00E5FF',
                backgroundColor: 'rgba(0, 229, 255, 0.05)',
                fill: true,
                tension: 0.4,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false }, ticks: { color: '#555' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#555' }, beginAtZero: true }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// 5. Текучесть: Сравнение
function renderRetentionChart(retData) {
    const canvas = document.getElementById('retentionChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (window.retChart) window.retChart.destroy();

    window.retChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Активные', 'Уволенные'],
            datasets: [{
                data: [retData.active, retData.fired],
                backgroundColor: ['#1DB954', '#941B1B'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#888' } } }
        }
    });
}