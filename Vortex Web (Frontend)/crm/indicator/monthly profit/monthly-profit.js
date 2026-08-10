/* ============================================
   ИНДИКАТОР: ВЫРУЧКА ЗА ТЕКУЩИЙ МЕСЯЦ
   Папка: /crm/indicator/monthly profit/
   ============================================ */

(function () {
    'use strict';

    if (typeof API_BASE_URL === 'undefined') {
        window.API_BASE_URL = 'http://127.0.0.1:5000';
        console.warn('[MonthlyProfit] ⚠️ API_BASE_URL не найден, установлен вручную:', API_BASE_URL);
    }

    const CONFIG = {
        REFRESH_INTERVAL: 3600000, // 1 час
        STORAGE_KEYS: ['monthly_profit'],
        DEFAULT_COUNT: 0
    };

    // ---- Получение выручки за месяц ----
    async function fetchMonthlyProfit() {
        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                console.warn('[MonthlyProfit] ❌ Токен не найден');
                return getFallbackCount();
            }

            // Получаем текущую дату
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;

            // ✅ ИСПОЛЬЗУЕМ SaleState (ручные суммы)
            const saleUrl = `${API_BASE_URL}/api/inventory/sales/plan/month?year=${year}&month=${month}`;
            console.log('[MonthlyProfit] 📡 Запрос SaleState:', saleUrl);

            const saleResponse = await fetch(saleUrl, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            if (!saleResponse.ok) {
                console.error('[MonthlyProfit] ❌ Ошибка HTTP:', saleResponse.status);
                return getFallbackCount();
            }

            const saleData = await saleResponse.json();
            console.log('[MonthlyProfit] 📦 SaleState ответ:', saleData);

            const total = saleData.total || 0;
            console.log('[MonthlyProfit] 💰 ИТОГО за месяц:', total);
            return total;

        } catch (error) {
            console.error('[MonthlyProfit] ❌ Ошибка:', error);
            return getFallbackCount();
        }
    }

    // ---- Запасное значение ----
    function getFallbackCount() {
        for (const key of CONFIG.STORAGE_KEYS) {
            const value = localStorage.getItem(key);
            if (value !== null) {
                const num = parseFloat(value);
                if (!isNaN(num) && num >= 0) return num;
            }
        }
        return CONFIG.DEFAULT_COUNT;
    }

    function formatNumber(num) {
        return num.toLocaleString('ru-RU');
    }

    // ---- Получение названия месяца ----
    function getMonthName() {
        const months = ['ЯНВАРЬ', 'ФЕВРАЛЬ', 'МАРТ', 'АПРЕЛЬ', 'МАЙ', 'ИЮНЬ',
            'ИЮЛЬ', 'АВГУСТ', 'СЕНТЯБРЬ', 'ОКТЯБРЬ', 'НОЯБРЬ', 'ДЕКАБРЬ'];
        const now = new Date();
        return months[now.getMonth()];
    }

    // ---- Обработчик клика ----
    function handleMonthlyProfitClick(event) {
        const button = event.currentTarget;
        const targetHref = button.getAttribute('data-href') || '/stats';
        button.classList.add('clicked');
        setTimeout(() => { window.location.href = targetHref; }, 150);
    }

    // ---- Обновление индикатора ----
    function updateIndicator(profit) {
        const buttons = document.querySelectorAll('.crm-indicator.monthly-profit-button');
        const monthName = getMonthName();

        buttons.forEach(button => {
            const profitNum = button.querySelector('.profit-number');
            const profitLabel = button.querySelector('.profit-label');

            if (profitNum) {
                profitNum.textContent = formatNumber(profit) + ' ₸';
                console.log('[MonthlyProfit] Обновлено значение:', profit);
            }

            if (profitLabel) {
                profitLabel.textContent = monthName;
            }

            button.setAttribute('data-count', profit);

            button.removeEventListener('click', handleMonthlyProfitClick);
            button.addEventListener('click', handleMonthlyProfitClick);
        });
    }

    // ---- Обновление с сервера ----
    async function updateFromServer() {
        const profit = await fetchMonthlyProfit();
        updateIndicator(profit);
        localStorage.setItem('monthly_profit', profit.toString());
    }

    // ---- Инициализация ----
    function init() {
        const buttons = document.querySelectorAll('.crm-indicator.monthly-profit-button');
        if (buttons.length === 0) {
            console.warn('[MonthlyProfit] Кнопки не найдены');
            return;
        }

        console.log('[MonthlyProfit] Инициализация...');

        const fallback = getFallbackCount();
        updateIndicator(fallback);

        updateFromServer();

        if (CONFIG.REFRESH_INTERVAL > 0) {
            setInterval(updateFromServer, CONFIG.REFRESH_INTERVAL);
        }
    }

    // ---- Глобальный API ----
    window.MonthlyProfitIndicator = {
        init: init,
        refresh: updateFromServer,
        getCount: fetchMonthlyProfit,
        formatNumber: formatNumber,
        setConfig: (cfg) => Object.assign(CONFIG, cfg)
    };

    // ---- Запуск ----
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();