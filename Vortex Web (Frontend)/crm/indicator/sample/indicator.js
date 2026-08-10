/* ============================================
   УНИВЕРСАЛЬНЫЙ ИНДИКАТОР - JS (опционально)
   Папка: /crm/indicator/
   ============================================ */

(function () {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initIndicators);
    } else {
        initIndicators();
    }

    function initIndicators() {
        const indicators = document.querySelectorAll('.crm-indicator');

        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', function (e) {
                const action = this.dataset.action || 'default';
                const value = this.dataset.value || '';

                console.log(`[Индикатор #${index}] Клик! Action: ${action}, Value: ${value}`);

                this.classList.toggle('active');

                // Если есть data-href - переходим по ссылке
                const href = this.dataset.href;
                if (href) {
                    window.location.href = href;
                }
            });

            indicator.updateContent = function (newHTML) {
                const content = this.querySelector('.indicator-content');
                if (content) {
                    content.innerHTML = newHTML;
                } else {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'indicator-content';
                    wrapper.innerHTML = newHTML;
                    this.innerHTML = '';
                    this.appendChild(wrapper);
                }
            };

            indicator.addEventListener('mouseenter', function () {
                this.classList.add('hovering');
            });

            indicator.addEventListener('mouseleave', function () {
                this.classList.remove('hovering');
            });
        });

        window.IndicatorManager = {
            updateBySelector: function (selector, newHTML) {
                const el = document.querySelector(selector);
                if (el && typeof el.updateContent === 'function') {
                    el.updateContent(newHTML);
                    return true;
                }
                return false;
            },
            updateAll: function (newHTML) {
                document.querySelectorAll('.crm-indicator').forEach(el => {
                    if (typeof el.updateContent === 'function') {
                        el.updateContent(newHTML);
                    }
                });
            }
        };

        console.log(`🟢 Индикаторы инициализированы: ${indicators.length} шт.`);
    }

})();