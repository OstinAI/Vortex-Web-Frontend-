/* ============================================
   ИНДИКАТОР: СОТРУДНИК - JavaScript
   Папка: /crm/indicator/employee/
   ============================================ */

(function () {
    'use strict';

    // Преобразование ФИО в Инициалы
    function formatInitials(rawFullName) {
        if (!rawFullName || rawFullName === '—' || rawFullName === 'undefined' || rawFullName === 'null') {
            return '—';
        }

        let cleanName = rawFullName.trim();

        if (cleanName.includes('@')) {
            return '—';
        }

        const parts = cleanName.split(/[\s._-]+/).filter(Boolean);
        if (parts.length === 0) return '—';

        const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

        if (parts.length === 1) {
            return capitalize(parts[0]);
        }

        const surname = capitalize(parts[0]);
        const nameInitial = parts[1].charAt(0).toUpperCase();

        if (parts.length === 2) {
            return `${surname} ${nameInitial}.`;
        }

        const patronymicInitial = parts[2].charAt(0).toUpperCase();
        return `${surname} ${nameInitial}. ${patronymicInitial}.`;
    }

    // ✅ ПОЛУЧАЕМ ИМЯ ТОЛЬКО ИЗ LOCALSTORAGE
    function getEmployeeName() {
        // 1. Сначала ищем full_name
        let name = localStorage.getItem('full_name');
        if (name && name !== '—' && name !== 'undefined' && name !== 'null' && name !== '' && !name.includes('@')) {
            return name;
        }

        // 2. Если нет - ищем vortex_user_name
        name = localStorage.getItem('vortex_user_name');
        if (name && name !== '—' && name !== 'undefined' && name !== 'null' && name !== '' && !name.includes('@')) {
            return name;
        }

        // 3. Если нет - ищем username
        name = localStorage.getItem('username');
        if (name && name !== '—' && name !== 'undefined' && name !== 'null' && name !== '') {
            return name;
        }

        return null;
    }

    function updateLabelText(text) {
        const employeeButtons = document.querySelectorAll('.crm-indicator.employee-button');
        employeeButtons.forEach(function (button) {
            let label = button.querySelector('.label');
            if (!label) {
                let content = button.querySelector('.indicator-content');
                if (!content) {
                    content = document.createElement('div');
                    content.className = 'indicator-content';
                    button.appendChild(content);
                }
                label = document.createElement('span');
                label.className = 'label';
                content.appendChild(label);
            }

            // Если текст - это полное ФИО (есть пробелы), форматируем в инициалы
            const displayText = (text && text.includes(' ')) ? formatInitials(text) : (text || '—');
            label.textContent = displayText;
            button.setAttribute('data-value', displayText);

            // Устанавливаем URL для перехода
            button.setAttribute('data-href', '/employees');

            button.removeEventListener('click', handleEmployeeClick);
            button.addEventListener('click', handleEmployeeClick);
        });
    }

    function handleEmployeeClick(event) {
        const button = event.currentTarget;
        const targetHref = button.getAttribute('data-href') || '/employees'; // ← СМЕНИЛ НА /employees
        button.classList.add('clicked');
        setTimeout(function () {
            window.location.href = targetHref;
        }, 150);
    }

    function initEmployeeIndicators() {
        const employeeButtons = document.querySelectorAll('.crm-indicator.employee-button');
        if (employeeButtons.length === 0) return;

        const name = getEmployeeName();

        if (name) {
            console.log('[EmployeeIndicator] Показываю:', name);
            updateLabelText(name);
        } else {
            console.log('[EmployeeIndicator] Имя не найдено');
            updateLabelText('—');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEmployeeIndicators);
    } else {
        initEmployeeIndicators();
    }

    window.EmployeeIndicator = {
        init: initEmployeeIndicators,
        formatInitials: formatInitials
    };
})();