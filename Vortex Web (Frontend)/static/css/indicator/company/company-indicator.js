// static/css/indicator/company/company-indicator.js

(function () {
    'use strict';

    let cachedCompanyName = null;

    document.addEventListener('DOMContentLoaded', function () {
        const container = document.getElementById('company-indicator-placeholder');
        if (container) {
            _inject(container);
        } else {
            console.warn('⚠️ Контейнер company-indicator-placeholder не найден в DOM!');
        }
    });

    function _inject(container) {
        if (!container) {
            console.warn('⚠️ Контейнер для индикатора компании не найден.');
            return;
        }

        if (container.querySelector('.company-indicator')) {
            console.log('✅ Индикатор компании уже существует.');
            return;
        }

        // Создаем индикатор
        const indicator = document.createElement('div');
        indicator.className = 'company-indicator';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'company-name';

        // Пытаемся получить название компании из localStorage
        let companyName = localStorage.getItem('company_name');

        // Если нет, пробуем другие варианты
        if (!companyName) {
            companyName = localStorage.getItem('vortex_company_name');
        }

        // Если все еще нет, используем fallback
        if (!companyName) {
            companyName = 'ВИХРЬ';
            console.warn('⚠️ Название компании не найдено в localStorage, используем fallback');
        } else {
            console.log(`✅ Название компании из localStorage: ${companyName}`);
        }

        nameSpan.textContent = companyName;
        indicator.appendChild(nameSpan);
        container.appendChild(indicator);

        // Сохраняем в кеш
        cachedCompanyName = companyName;
    }

    console.log('✅ company-indicator.js загружен (использует localStorage)');
})();