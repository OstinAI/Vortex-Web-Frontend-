// admin-background.js - Фоновая автоматическая проверка новых компаний

const ADMIN_BACKGROUND = {
    interval: null,
    isRunning: false,
    checkInterval: 30000, // 30 секунд (уменьшил для скорости)

    // Запуск фоновой проверки
    start() {
        if (this.isRunning) return;
        this.isRunning = true;

        console.log('[ADMIN_BACKGROUND] Запуск фоновой проверки...');

        // Проверяем сразу
        this.check();

        // Запускаем интервал
        this.interval = setInterval(() => {
            this.check();
        }, this.checkInterval);

        console.log('[ADMIN_BACKGROUND] Фоновая проверка запущена (интервал 30 сек)');
    },

    // Остановка фоновой проверки
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
        console.log('[ADMIN_BACKGROUND] Фоновая проверка остановлена');
    },

    // Проверка новых компаний
    async check() {
        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                console.log('[ADMIN_BACKGROUND] Нет токена, пропускаем');
                return;
            }

            // Проверяем, включена ли автоматизация
            const enabled = localStorage.getItem('vortex_automation_enabled') === 'true';
            if (!enabled) {
                // Если автоматизация выключена - останавливаем проверку
                if (this.isRunning) {
                    this.stop();
                }
                return;
            }

            // Проверяем, есть ли сохраненные настройки воронки и этапа
            const pipelineId = localStorage.getItem('vortex_automation_pipeline');
            const stageId = localStorage.getItem('vortex_automation_stage');

            if (!pipelineId || !stageId) {
                console.log('[ADMIN_BACKGROUND] Нет настроек воронки/этапа');
                return;
            }

            console.log('[ADMIN_BACKGROUND] Проверка новых компаний...');

            // Проверяем, есть ли новые компании
            const response = await fetch(`${API_BASE_URL}/api/employees/companies/check_new`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.status === 'ok' && data.companies && data.companies.length > 0) {
                console.log(`[ADMIN_BACKGROUND] ✅ Найдено ${data.companies.length} новых компаний`);

                // Импортируем новые компании
                const importResponse = await fetch(`${API_BASE_URL}/api/crm/auto_import`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        pipeline_id: parseInt(pipelineId),
                        stage_id: parseInt(stageId)
                    })
                });

                const importResult = await importResponse.json();
                if (importResult.ok && importResult.imported > 0) {
                    console.log(`[ADMIN_BACKGROUND] ✅ Импортировано ${importResult.imported} компаний`);

                    // Показываем уведомление (если окно открыто)
                    if (typeof ADMIN_MODAL !== 'undefined' && ADMIN_MODAL.state.isOpen) {
                        ADMIN_MODAL.showNotification(
                            `✅ Автоматически импортировано ${importResult.imported} новых компаний`,
                            'success'
                        );
                        // Обновляем список в модальном окне
                        await ADMIN_MODAL.loadCompanies();
                    }
                }
            }
        } catch (error) {
            console.error('[ADMIN_BACKGROUND] Ошибка:', error);
        }
    }
};

// Запускаем фоновую проверку при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('[ADMIN_BACKGROUND] DOM загружен, запускаем фоновую проверку...');
    // Запускаем через 3 секунды после загрузки
    setTimeout(() => {
        ADMIN_BACKGROUND.start();
    }, 3000);
});

// Экспортируем
window.ADMIN_BACKGROUND = ADMIN_BACKGROUND;

// Дополнительно: проверяем каждые 30 секунд даже если страница не активна
// Это обеспечит работу в фоне