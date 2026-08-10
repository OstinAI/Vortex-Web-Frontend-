// static/employees/employees-user.js

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(renderUserIndicator, 100);
    });

    function renderUserIndicator() {
        // Если индикатор уже есть в HTML (вы его сами прописали) — просто выходим
        if (document.getElementById('employees-user-indicator')) {
            return;
        }

        // Если индикатора нет в HTML, создадим его (на случай, если он нужен динамически)
        const header = document.querySelector('.vortex-top-bar');
        if (!header) {
            console.warn('⚠️ Header не найден');
            return;
        }

        const indicator = document.createElement('div');
        indicator.id = 'employees-user-indicator';
        // Используем класс mark-indicator, чтобы подхватить стили из indicator.css
        indicator.className = 'header-indicator user-indicator mark-indicator';

        // Вставляем статичные M и МАРК
        indicator.innerHTML = `
            <div class="user-avatar" id="emp-user-avatar">M</div>
            <span id="emp-user-name">МАРК</span>
        `;

        const controls = header.querySelector('.vortex-header-controls');
        if (controls) {
            controls.appendChild(indicator);
        } else {
            header.appendChild(indicator);
        }
    }

    // Функция обновления оставлена, но полностью опустошена, чтобы не перезаписывать HTML
    function updateUserInfo() {
        // Ничего не делаем. Индикатор теперь статичный (M и МАРК).
    }

    window.addEventListener('storage', function (e) {
        // Слушаем изменения, но ничего не делаем, так как updateUserInfo пустая
        if (e.key === 'vortex_user_name' || e.key === 'username' || e.key === 'full_name' || e.key === 'role') {
            console.log('🔄 localStorage изменился (но индикатор статичен)');
        }
    });

    window.updateEmployeesUser = updateUserInfo;

    console.log('✅ employees-user.js загружен (статичный режим МАРК)');
})();