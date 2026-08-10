/* ============================================
   ИНДИКАТОР: В РАБОТЕ (IN PROGRESS) - JavaScript
   Папка: /crm/indicator/in progress/
   ============================================ */

(function () {
    'use strict';

    if (typeof API_BASE_URL === 'undefined') {
        window.API_BASE_URL = 'http://127.0.0.1:5000';
        console.warn('[InProgress] ⚠️ API_BASE_URL не найден, установлен вручную:', API_BASE_URL);
    }

    const CONFIG = {
        REFRESH_INTERVAL: 30000,
        STORAGE_KEYS: ['in_progress_count'],
        DEFAULT_COUNT: 0
    };

    // ---- Запрос к серверу (считаем клиентов как в updateClientsCount) ----
    async function fetchInProgressCount() {
        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                console.warn('[InProgress] ❌ Токен не найден');
                return getFallbackCount();
            }

            const pipelineId = localStorage.getItem('vortex_last_pipeline_id') || 0;
            console.log('[InProgress] 📡 Pipeline ID:', pipelineId);

            // Если нет pipelineId, получаем всех клиентов напрямую
            if (!pipelineId || pipelineId == 0) {
                const resDirect = await fetch(`${API_BASE_URL}/api/crm/clients`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const dataDirect = await resDirect.json();
                if (dataDirect.ok) {
                    const count = dataDirect.cards ? dataDirect.cards.length : 0;
                    console.log('[InProgress] 👥 Клиентов (все):', count);
                    return count;
                }
                return getFallbackCount();
            }

            // Получаем этапы текущей воронки
            const resStages = await fetch(`${API_BASE_URL}/api/crm/pipelines/${pipelineId}/stages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataStages = await resStages.json();
            const stages = dataStages.stages || [];

            console.log('[InProgress] 📋 Этапов:', stages.length);

            // Параллельно получаем карточки со всех этапов
            const results = await Promise.all(stages.map(async (stage) => {
                const resCards = await fetch(`${API_BASE_URL}/api/crm/board/stage_cards?pipeline_id=${pipelineId}&stage_id=${stage.id}&limit=500`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const dataCards = await resCards.json();
                return dataCards.cards ? dataCards.cards.length : 0;
            }));

            const totalCount = results.reduce((a, b) => a + b, 0);
            console.log('[InProgress] 👥 Клиентов в работе:', totalCount);
            return totalCount;

        } catch (error) {
            console.error('[InProgress] ❌ Ошибка:', error);
            return getFallbackCount();
        }
    }

    // ---- Запасное значение ----
    function getFallbackCount() {
        for (const key of CONFIG.STORAGE_KEYS) {
            const value = localStorage.getItem(key);
            if (value !== null) {
                const num = parseInt(value, 10);
                if (!isNaN(num) && num >= 0) return num;
            }
        }
        return CONFIG.DEFAULT_COUNT;
    }

    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    // ---- Обработчик клика ----
    function handleInProgressClick(event) {
        const button = event.currentTarget;
        const targetHref = button.getAttribute('data-href') || '/crm';
        button.classList.add('clicked');
        setTimeout(() => { window.location.href = targetHref; }, 150);
    }

    // ---- Обновление индикатора ----
    function updateIndicator(count) {
        const buttons = document.querySelectorAll('.crm-indicator.in-progress-button');
        buttons.forEach(button => {
            const countNum = button.querySelector('.count-number');
            if (countNum) {
                countNum.textContent = formatNumber(count);
                console.log('[InProgress] Обновлено значение:', count);
            }
            button.setAttribute('data-count', count);

            button.removeEventListener('click', handleInProgressClick);
            button.addEventListener('click', handleInProgressClick);
        });
    }

    // ---- Обновление с сервера ----
    async function updateFromServer() {
        const count = await fetchInProgressCount();
        updateIndicator(count);
        localStorage.setItem('in_progress_count', count.toString());
    }

    // ---- Инициализация ----
    function init() {
        const buttons = document.querySelectorAll('.crm-indicator.in-progress-button');
        if (buttons.length === 0) {
            console.warn('[InProgress] Кнопки не найдены');
            return;
        }

        console.log('[InProgress] Инициализация...');

        const fallback = getFallbackCount();
        updateIndicator(fallback);

        updateFromServer();

        if (CONFIG.REFRESH_INTERVAL > 0) {
            setInterval(updateFromServer, CONFIG.REFRESH_INTERVAL);
        }
    }

    // ---- Глобальный API ----
    window.InProgressIndicator = {
        init: init,
        refresh: updateFromServer,
        getCount: fetchInProgressCount,
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