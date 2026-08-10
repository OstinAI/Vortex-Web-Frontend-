/* ============================================
   ИНДИКАТОР: ТАРИФЫ - JavaScript
   Папка: /crm/indicator/rates/
   ============================================ */

(function () {
    'use strict';

    function updateRatesLabel(text) {
        const ratesButtons = document.querySelectorAll('.crm-indicator.rates-button');
        ratesButtons.forEach(function (button) {
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

            label.textContent = text || 'Тарифы';
            button.setAttribute('data-value', text || 'Тарифы');
            button.setAttribute('data-href', '/tariffs');

            button.removeEventListener('click', handleRatesClick);
            button.addEventListener('click', handleRatesClick);
        });
    }

    function handleRatesClick(event) {
        const button = event.currentTarget;
        const targetHref = button.getAttribute('data-href') || '/tariffs';
        button.classList.add('clicked');
        setTimeout(function () {
            window.location.href = targetHref;
        }, 150);
    }

    function initRatesIndicators() {
        const ratesButtons = document.querySelectorAll('.crm-indicator.rates-button');
        if (ratesButtons.length === 0) return;

        // Можно загружать текст из localStorage или использовать стандартный
        const tariffText = localStorage.getItem('tariff_name') || 'Тарифы';
        updateRatesLabel(tariffText);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initRatesIndicators);
    } else {
        initRatesIndicators();
    }

    window.RatesIndicator = {
        init: initRatesIndicators,
        updateLabel: updateRatesLabel
    };
})();