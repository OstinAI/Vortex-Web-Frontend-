/* ============================================
   ИНДИКАТОР: НАЗВАНИЕ КОМПАНИИ - JavaScript
   Папка: /crm/indicator/company/
   ============================================ */

(function () {
    'use strict';

    // Получение имени компании из локального хранилища
    function getCompanyName() {
        let name = localStorage.getItem('company_name') || localStorage.getItem('vortex_company_name');
        if (!name) {
            name = 'Vortex'; // fallback по умолчанию
        }
        return name;
    }

    // Обработчик клика по индикатору компании
    function handleCompanyClick(event) {
        const button = event.currentTarget;
        const targetHref = button.getAttribute('data-href') || '/company';

        button.classList.add('clicked');
        setTimeout(function () {
            window.location.href = targetHref;
        }, 150);
    }

    // Инициализация индикатора
    function initCompanyIndicators() {
        const companyButtons = document.querySelectorAll('.crm-indicator.company-button');
        const companyName = getCompanyName();

        companyButtons.forEach(function (button) {
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

            // Устанавливаем полученное имя компании
            label.textContent = companyName;
            button.setAttribute('data-value', companyName);

            // Навешиваем клик
            button.removeEventListener('click', handleCompanyClick);
            button.addEventListener('click', handleCompanyClick);
        });
    }

    // Слушатели DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCompanyIndicators);
    } else {
        initCompanyIndicators();
    }

    // Динамическая обработка появления в DOM
    if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(function (mutations) {
            let needInit = false;
            mutations.forEach(function (mutation) {
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(function (node) {
                        if (node.nodeType === 1) {
                            if (node.matches && node.matches('.crm-indicator.company-button')) {
                                needInit = true;
                            }
                            if (node.querySelectorAll && node.querySelectorAll('.crm-indicator.company-button').length > 0) {
                                needInit = true;
                            }
                        }
                    });
                }
            });
            if (needInit) {
                setTimeout(initCompanyIndicators, 50);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Экспорт в глобальную область
    window.CompanyIndicator = {
        init: initCompanyIndicators,
        getName: getCompanyName
    };
})();