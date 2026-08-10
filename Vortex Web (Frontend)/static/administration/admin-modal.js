// admin-modal.js - Исправленная версия с сохранением на сервер

const ADMIN_MODAL = {
    // Состояние
    state: {
        isOpen: false,
        companies: [],
        isLoading: false,
        pipelines: [],
        stages: [],
        selectedPipelineId: null,
        selectedStageId: null,
        automationEnabled: false,
        loadAllCompanies: false,
        loadNewCompanies: true,
        isFirstLoad: true,
        autoCheckInterval: null
    },

    // Открыть модальное окно
    open() {
        if (this.state.isOpen) return;

        if (!this.hasAccess()) {
            this.showNotification('❌ Доступ запрещен. Требуются права администратора.', 'error');
            return;
        }

        this.createModal();
        this.state.isOpen = true;

        // Загружаем настройки с сервера
        this.loadSettingsFromServer();

        this.loadPipelines();
        this.loadAutomationStatus();
        this.loadCompanies();

        // Запускаем автопроверку новых компаний
        this.startAutoCheck();

        // Запускаем фоновую проверку (если не запущена)
        if (typeof ADMIN_BACKGROUND !== 'undefined' && !ADMIN_BACKGROUND.isRunning) {
            ADMIN_BACKGROUND.start();
        }

        // Проверяем статус фоновой проверки
        this.checkBackgroundStatus();
    },

    // Проверка прав доступа
    hasAccess() {
        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) return false;

            const payload = JSON.parse(atob(token.split('.')[1]));
            const role = payload.role || '';

            return role === 'Integrator' || role === 'Admin';
        } catch (e) {
            console.error('[ADMIN_MODAL] Ошибка проверки прав:', e);
            return false;
        }
    },

    // ============================================================
    // РАБОТА С СЕРВЕРОМ
    // ============================================================

    // Сохранение настроек на сервер
    async saveSettingsToServer() {
        try {
            const token = localStorage.getItem('vortex_token');
            const pipelineId = this.state.selectedPipelineId;
            const stageId = this.state.selectedStageId;
            const enabled = this.state.automationEnabled;

            if (!pipelineId || !stageId) {
                console.log('[ADMIN_MODAL] Нет выбранной воронки или этапа');
                return;
            }

            console.log('[ADMIN_MODAL] Сохранение настроек на сервер:', { pipelineId, stageId, enabled });

            const response = await fetch(`${API_BASE_URL}/api/auto_import/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    pipeline_id: parseInt(pipelineId),
                    stage_id: parseInt(stageId),
                    enabled: enabled
                })
            });

            const result = await response.json();
            if (result.status === 'ok') {
                console.log('[ADMIN_MODAL] ✅ Настройки сохранены на сервер');
            } else {
                console.error('[ADMIN_MODAL] Ошибка сохранения:', result);
            }
        } catch (error) {
            console.error('[ADMIN_MODAL] Ошибка сохранения настроек:', error);
        }
    },

    // Загрузка настроек с сервера
    async loadSettingsFromServer() {
        try {
            const token = localStorage.getItem('vortex_token');
            const response = await fetch(`${API_BASE_URL}/api/auto_import/status`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();
            console.log('[ADMIN_MODAL] Ответ от сервера:', result);

            if (result.enabled !== undefined) {
                this.state.automationEnabled = result.enabled;
                if (result.pipeline_id) {
                    this.state.selectedPipelineId = String(result.pipeline_id);
                }
                if (result.stage_id) {
                    this.state.selectedStageId = String(result.stage_id);
                }
                console.log('[ADMIN_MODAL] ✅ Настройки загружены с сервера:', {
                    enabled: this.state.automationEnabled,
                    pipeline: this.state.selectedPipelineId,
                    stage: this.state.selectedStageId
                });

                this.updateAutomationButton();

                // Сохраняем в localStorage
                localStorage.setItem('vortex_automation_enabled', String(result.enabled));
                localStorage.setItem('vortex_automation_pipeline', String(result.pipeline_id || ''));
                localStorage.setItem('vortex_automation_stage', String(result.stage_id || ''));

                // Обновляем селекты
                setTimeout(() => {
                    this.updateSelects();
                }, 300);
            }
        } catch (error) {
            console.error('[ADMIN_MODAL] Ошибка загрузки настроек:', error);
        }
    },

    // Обновление селектов
    updateSelects() {
        const pipelineSelect = document.getElementById('admin-modal-pipeline-select');
        const stageSelect = document.getElementById('admin-modal-stage-select');

        console.log('[ADMIN_MODAL] Обновление селектов:', {
            pipeline: this.state.selectedPipelineId,
            stage: this.state.selectedStageId
        });

        if (pipelineSelect && this.state.selectedPipelineId) {
            pipelineSelect.value = this.state.selectedPipelineId;
            // Загружаем этапы для выбранной воронки
            this.loadStagesForPipeline(this.state.selectedPipelineId);
        }
        if (stageSelect && this.state.selectedStageId) {
            setTimeout(() => {
                stageSelect.value = this.state.selectedStageId;
                console.log('[ADMIN_MODAL] Установлен этап:', stageSelect.value);
            }, 200);
        }
    },

    // ============================================================
    // ПРОВЕРКА СТАТУСА ФОНОВОЙ ПРОВЕРКИ
    // ============================================================

    checkBackgroundStatus() {
        if (typeof ADMIN_BACKGROUND !== 'undefined') {
            if (this.state.automationEnabled && !ADMIN_BACKGROUND.isRunning) {
                console.log('[ADMIN_MODAL] Фоновая проверка не запущена, запускаем...');
                ADMIN_BACKGROUND.start();
            } else if (!this.state.automationEnabled && ADMIN_BACKGROUND.isRunning) {
                console.log('[ADMIN_MODAL] Автоматизация отключена, останавливаем фоновую проверку...');
                ADMIN_BACKGROUND.stop();
            } else if (this.state.automationEnabled && ADMIN_BACKGROUND.isRunning) {
                console.log('[ADMIN_MODAL] Фоновая проверка активна');
            }
        } else {
            console.warn('[ADMIN_MODAL] ADMIN_BACKGROUND не найден');
        }
    },

    // Загрузка сохраненных настроек (локальные)
    loadSavedSettings() {
        try {
            const savedPipeline = localStorage.getItem('vortex_automation_pipeline');
            if (savedPipeline) {
                this.state.selectedPipelineId = savedPipeline;
            }

            const savedStage = localStorage.getItem('vortex_automation_stage');
            if (savedStage) {
                this.state.selectedStageId = savedStage;
            }

            const savedLoadAll = localStorage.getItem('vortex_automation_load_all');
            if (savedLoadAll !== null) {
                this.state.loadAllCompanies = savedLoadAll === 'true';
            }

            const savedLoadNew = localStorage.getItem('vortex_automation_load_new');
            if (savedLoadNew !== null) {
                this.state.loadNewCompanies = savedLoadNew === 'true';
            }

            console.log('[ADMIN_MODAL] Загружены настройки:', {
                pipeline: this.state.selectedPipelineId,
                stage: this.state.selectedStageId,
                loadAll: this.state.loadAllCompanies,
                loadNew: this.state.loadNewCompanies
            });
        } catch (e) {
            console.error('[ADMIN_MODAL] Ошибка загрузки настроек:', e);
        }
    },

    // Сохранение настроек (локальные + сервер)
    saveSettings() {
        try {
            localStorage.setItem('vortex_automation_pipeline', this.state.selectedPipelineId || '');
            localStorage.setItem('vortex_automation_stage', this.state.selectedStageId || '');
            localStorage.setItem('vortex_automation_load_all', String(this.state.loadAllCompanies));
            localStorage.setItem('vortex_automation_load_new', String(this.state.loadNewCompanies));
            localStorage.setItem('vortex_automation_enabled', String(this.state.automationEnabled));

            // ✅ СОХРАНЯЕМ НА СЕРВЕР
            this.saveSettingsToServer();
        } catch (e) {
            console.error('[ADMIN_MODAL] Ошибка сохранения настроек:', e);
        }
    },

    // Закрыть модальное окно
    close() {
        this.stopAutoCheck();

        const modal = document.getElementById('admin-modal-overlay');
        if (modal) {
            modal.remove();
        }
        this.state.isOpen = false;
        document.removeEventListener('keydown', this.handleEsc);
    },

    handleEsc(e) {
        if (e.key === 'Escape') {
            ADMIN_MODAL.close();
        }
    },

    // Загрузка статуса автоматизации
    async loadAutomationStatus() {
        try {
            const saved = localStorage.getItem('vortex_automation_enabled');
            if (saved !== null) {
                this.state.automationEnabled = saved === 'true';
            } else {
                this.state.automationEnabled = false;
            }
            this.updateAutomationButton();
            this.checkBackgroundStatus();
        } catch (e) {
            console.error('[ADMIN_MODAL] Ошибка загрузки статуса:', e);
        }
    },

    // Обновление кнопки автоматизации
    updateAutomationButton() {
        const btn = document.getElementById('admin-modal-automation-btn');
        if (!btn) return;

        if (this.state.automationEnabled) {
            btn.innerHTML = '✅ АВТОМАТИЗАЦИЯ ПОДКЛЮЧЕНА';
            btn.style.background = '#28a745';
            btn.style.color = '#fff';
            btn.style.border = '1px solid #28a745';
            btn.style.boxShadow = '0 0 30px rgba(40, 167, 69, 0.3)';
            btn.onmouseover = null;
            btn.onmouseout = null;
        } else {
            btn.innerHTML = '⚡ ПОДКЛЮЧИТЬ АВТОМАТИЗАЦИЮ';
            btn.style.background = 'var(--vortex-accent, #00E5FF)';
            btn.style.color = '#020b12';
            btn.style.border = 'none';
            btn.style.boxShadow = 'none';
            btn.onmouseover = function () {
                this.style.boxShadow = '0 0 30px rgba(0, 229, 255, 0.4)';
                this.style.transform = 'scale(1.02)';
            };
            btn.onmouseout = function () {
                this.style.boxShadow = 'none';
                this.style.transform = 'scale(1)';
            };
        }
    },

    // ============================================================
    // АВТОМАТИЧЕСКАЯ ПРОВЕРКА НОВЫХ КОМПАНИЙ
    // ============================================================

    startAutoCheck() {
        this.stopAutoCheck();

        this.state.autoCheckInterval = setInterval(() => {
            if (this.state.automationEnabled && this.state.isOpen) {
                this.checkNewCompanies();
            }
        }, 30000);

        console.log('[ADMIN_MODAL] Автопроверка запущена (интервал 30 сек)');
    },

    stopAutoCheck() {
        if (this.state.autoCheckInterval) {
            clearInterval(this.state.autoCheckInterval);
            this.state.autoCheckInterval = null;
            console.log('[ADMIN_MODAL] Автопроверка остановлена');
        }
    },

    // Проверка новых компаний
    async checkNewCompanies() {
        try {
            const token = localStorage.getItem('vortex_token');

            const response = await fetch(`${API_BASE_URL}/api/employees/companies/check_new`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.status === 'ok' && data.companies && data.companies.length > 0) {
                console.log(`[ADMIN_MODAL] Найдено ${data.companies.length} новых компаний`);

                const importResponse = await fetch(`${API_BASE_URL}/api/crm/auto_import`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        pipeline_id: this.state.selectedPipelineId,
                        stage_id: this.state.selectedStageId
                    })
                });

                const importResult = await importResponse.json();
                if (importResult.ok && importResult.imported > 0) {
                    this.showNotification(`✅ Автоматически импортировано ${importResult.imported} новых компаний`, 'success');
                    await this.loadCompanies();
                }
            }
        } catch (error) {
            console.error('[ADMIN_MODAL] Ошибка проверки новых компаний:', error);
        }
    },

    // Загрузка компаний
    async loadCompanies() {
        try {
            const token = localStorage.getItem('vortex_token');
            const response = await fetch(`${API_BASE_URL}/api/employees/companies/list`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.status === 'ok' && data.companies) {
                await this.checkImportedCompanies(data.companies);
                this.state.companies = data.companies;
            }
        } catch (error) {
            console.error('[ADMIN_MODAL] Ошибка загрузки компаний:', error);
        }
    },

    // Создание модального окна
    createModal() {
        const existing = document.getElementById('admin-modal-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'admin-modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: adminModalFadeIn 0.3s ease;
        `;

        overlay.innerHTML = `
            <div id="admin-modal-content" style="
                background: linear-gradient(180deg, #020b12 0%, #050505 100%);
                border: 1px solid rgba(0, 229, 255, 0.2);
                border-radius: 12px;
                max-width: 700px;
                width: 95%;
                max-height: 90vh;
                overflow: hidden;
                box-shadow: 0 0 60px rgba(0, 229, 255, 0.1), inset 0 0 60px rgba(0, 229, 255, 0.02);
                position: relative;
            ">
                <!-- Заголовок -->
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 25px;
                    border-bottom: 1px solid rgba(0, 229, 255, 0.1);
                    background: rgba(0, 0, 0, 0.3);
                ">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 20px;">⚡</span>
                        <h2 style="
                            color: var(--vortex-accent, #00E5FF);
                            font-size: 16px;
                            letter-spacing: 3px;
                            text-transform: uppercase;
                            margin: 0;
                            font-weight: 300;
                        ">АДМИНИСТРИРОВАНИЕ VORTEX</h2>
                    </div>
                    <button onclick="ADMIN_MODAL.close()" style="
                        background: transparent;
                        border: none;
                        color: rgba(255, 255, 255, 0.4);
                        font-size: 24px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        padding: 5px 10px;
                        border-radius: 4px;
                    "
                    onmouseover="this.style.color='#fff'; this.style.background='rgba(255,255,255,0.05)'"
                    onmouseout="this.style.color='rgba(255,255,255,0.4)'; this.style.background='transparent'"
                    >
                        ✕
                    </button>
                </div>

                <!-- Содержимое -->
                <div id="admin-modal-body" style="
                    padding: 25px;
                    overflow-y: auto;
                    max-height: calc(90vh - 80px);
                ">
                    <!-- Настройки импорта -->
                    <div style="
                        display: flex;
                        flex-direction: column;
                        gap: 15px;
                        padding: 20px;
                        background: rgba(0, 0, 0, 0.3);
                        border-radius: 8px;
                        border: 1px solid rgba(0, 229, 255, 0.1);
                        margin-bottom: 20px;
                    ">
                        <div style="
                            font-size: 10px;
                            letter-spacing: 2px;
                            text-transform: uppercase;
                            color: rgba(255, 255, 255, 0.3);
                            margin-bottom: 5px;
                        ">НАСТРОЙКИ ИМПОРТА</div>

                        <!-- Воронка и Этап в одну строку -->
                        <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                            <div style="flex: 1; min-width: 180px;">
                                <label style="
                                    font-size: 9px;
                                    letter-spacing: 1.5px;
                                    text-transform: uppercase;
                                    color: rgba(255, 255, 255, 0.4);
                                    display: block;
                                    margin-bottom: 4px;
                                ">ВОРОНКА</label>
                                <select id="admin-modal-pipeline-select" style="
                                    width: 100%;
                                    background: rgba(0, 0, 0, 0.5);
                                    border: 1px solid rgba(0, 229, 255, 0.15);
                                    color: #fff;
                                    padding: 8px 12px;
                                    border-radius: 4px;
                                    font-size: 12px;
                                    outline: none;
                                    transition: border-color 0.3s;
                                    cursor: pointer;
                                "
                                onfocus="this.style.borderColor='var(--vortex-accent, #00E5FF)'"
                                onblur="this.style.borderColor='rgba(0, 229, 255, 0.15)'"
                                >
                                    <option value="">-- Выберите воронку --</option>
                                </select>
                            </div>

                            <div style="flex: 1; min-width: 180px;">
                                <label style="
                                    font-size: 9px;
                                    letter-spacing: 1.5px;
                                    text-transform: uppercase;
                                    color: rgba(255, 255, 255, 0.4);
                                    display: block;
                                    margin-bottom: 4px;
                                ">ЭТАП</label>
                                <select id="admin-modal-stage-select" style="
                                    width: 100%;
                                    background: rgba(0, 0, 0, 0.5);
                                    border: 1px solid rgba(0, 229, 255, 0.15);
                                    color: #fff;
                                    padding: 8px 12px;
                                    border-radius: 4px;
                                    font-size: 12px;
                                    outline: none;
                                    transition: border-color 0.3s;
                                    cursor: pointer;
                                "
                                onfocus="this.style.borderColor='var(--vortex-accent, #00E5FF)'"
                                onblur="this.style.borderColor='rgba(0, 229, 255, 0.15)'"
                                >
                                    <option value="">-- Выберите этап --</option>
                                </select>
                            </div>
                        </div>

                        <!-- Чекбоксы -->
                        <div style="display: flex; gap: 30px; flex-wrap: wrap; margin-top: 5px;">
                            <label style="
                                display: flex;
                                align-items: center;
                                gap: 10px;
                                cursor: pointer;
                                font-size: 11px;
                                color: rgba(255, 255, 255, 0.7);
                                letter-spacing: 0.5px;
                            ">
                                <input type="checkbox" id="admin-modal-load-all" style="
                                    width: 16px;
                                    height: 16px;
                                    accent-color: var(--vortex-accent, #00E5FF);
                                    cursor: pointer;
                                ">
                                Загрузить все компании
                            </label>

                            <label style="
                                display: flex;
                                align-items: center;
                                gap: 10px;
                                cursor: pointer;
                                font-size: 11px;
                                color: rgba(255, 255, 255, 0.7);
                                letter-spacing: 0.5px;
                            ">
                                <input type="checkbox" id="admin-modal-load-new" style="
                                    width: 16px;
                                    height: 16px;
                                    accent-color: var(--vortex-accent, #00E5FF);
                                    cursor: pointer;
                                ">
                                Загружать новые компании
                            </label>
                        </div>

                        <!-- Кнопки: ПОДКЛЮЧИТЬ и ОТКЛЮЧИТЬ -->
                        <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 5px;">
                            <button id="admin-modal-automation-btn" onclick="ADMIN_MODAL.toggleAutomation()" style="
                                background: var(--vortex-accent, #00E5FF);
                                color: #020b12;
                                border: none;
                                padding: 10px 30px;
                                border-radius: 4px;
                                font-size: 11px;
                                letter-spacing: 2px;
                                text-transform: uppercase;
                                cursor: pointer;
                                transition: all 0.3s ease;
                                font-weight: 700;
                            "
                            onmouseover="if(this.textContent.includes('ПОДКЛЮЧИТЬ')){this.style.boxShadow='0 0 30px rgba(0, 229, 255, 0.4)'; this.style.transform='scale(1.02)'}"
                            onmouseout="this.style.boxShadow='none'; this.style.transform='scale(1)'"
                            >
                                ⚡ ПОДКЛЮЧИТЬ АВТОМАТИЗАЦИЮ
                            </button>
                            
                            <button id="admin-modal-automation-off-btn" onclick="ADMIN_MODAL.disableAutomation()" style="
                                background: transparent;
                                color: #ff4d4d;
                                border: 1px solid #ff4d4d;
                                padding: 10px 30px;
                                border-radius: 4px;
                                font-size: 11px;
                                letter-spacing: 2px;
                                text-transform: uppercase;
                                cursor: pointer;
                                transition: all 0.3s ease;
                                font-weight: 700;
                            "
                            onmouseover="this.style.background='#ff4d4d'; this.style.color='#fff'"
                            onmouseout="this.style.background='transparent'; this.style.color='#ff4d4d'"
                            >
                                ⛔ ОТКЛЮЧИТЬ
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close();
            }
        });

        document.addEventListener('keydown', this.handleEsc);

        // Обработчики для селектов - СОХРАНЯЕМ НА СЕРВЕР
        const pipelineSelect = document.getElementById('admin-modal-pipeline-select');
        if (pipelineSelect) {
            pipelineSelect.addEventListener('change', (e) => {
                this.state.selectedPipelineId = e.target.value;
                this.loadStagesForPipeline(e.target.value);
                this.saveSettings(); // ✅ Сохраняем на сервер
                console.log('[ADMIN_MODAL] Выбрана воронка:', e.target.value);
            });
        }

        const stageSelect = document.getElementById('admin-modal-stage-select');
        if (stageSelect) {
            stageSelect.addEventListener('change', (e) => {
                this.state.selectedStageId = e.target.value;
                this.saveSettings(); // ✅ Сохраняем на сервер
                console.log('[ADMIN_MODAL] Выбран этап:', e.target.value);
            });
        }

        // Обработчики для чекбоксов
        const loadAllCheckbox = document.getElementById('admin-modal-load-all');
        if (loadAllCheckbox) {
            loadAllCheckbox.addEventListener('change', (e) => {
                this.state.loadAllCompanies = e.target.checked;
                this.saveSettings();
            });
        }

        const loadNewCheckbox = document.getElementById('admin-modal-load-new');
        if (loadNewCheckbox) {
            loadNewCheckbox.addEventListener('change', (e) => {
                this.state.loadNewCompanies = e.target.checked;
                this.saveSettings();
            });
        }

        // Устанавливаем начальное состояние чекбоксов из сохраненных настроек
        setTimeout(() => {
            const loadAll = document.getElementById('admin-modal-load-all');
            const loadNew = document.getElementById('admin-modal-load-new');
            if (loadAll) loadAll.checked = this.state.loadAllCompanies;
            if (loadNew) loadNew.checked = this.state.loadNewCompanies;
        }, 100);
    },

    // Переключение автоматизации (включить)
    toggleAutomation() {
        if (this.state.automationEnabled) {
            this.showNotification('Автоматизация уже подключена', 'info');
            return;
        }
        this.connectAutomation();
    },

    // ОТКЛЮЧИТЬ АВТОМАТИЗАЦИЮ
    disableAutomation() {
        if (!this.state.automationEnabled) {
            this.showNotification('Автоматизация уже отключена', 'info');
            return;
        }

        if (!confirm('Вы уверены, что хотите отключить автоматизацию?')) {
            return;
        }

        this.state.automationEnabled = false;
        localStorage.setItem('vortex_automation_enabled', 'false');
        this.saveSettings();
        this.updateAutomationButton();

        this.stopAutoCheck();

        if (typeof ADMIN_BACKGROUND !== 'undefined') {
            ADMIN_BACKGROUND.stop();
        }

        this.showNotification('✅ Автоматизация отключена', 'info');
    },

    // Загрузка воронок
    async loadPipelines() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/crm/pipelines`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            });
            const data = await response.json();

            if (data.ok && data.pipelines) {
                this.state.pipelines = data.pipelines;
                this.populatePipelineSelect();

                let pipelineToSelect = this.state.selectedPipelineId;

                if (!pipelineToSelect || !this.state.pipelines.find(p => String(p.id) === String(pipelineToSelect))) {
                    pipelineToSelect = this.state.pipelines.length > 0 ? String(this.state.pipelines[0].id) : null;
                }

                if (pipelineToSelect) {
                    this.state.selectedPipelineId = pipelineToSelect;
                    const select = document.getElementById('admin-modal-pipeline-select');
                    if (select) {
                        select.value = pipelineToSelect;
                        console.log('[ADMIN_MODAL] Установлена воронка:', pipelineToSelect);
                    }
                    await this.loadStagesForPipeline(pipelineToSelect);
                }
            }
        } catch (error) {
            console.error('[ADMIN_MODAL] Ошибка загрузки воронок:', error);
        }
    },

    // Загрузка этапов
    async loadStagesForPipeline(pipelineId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/crm/pipelines/${pipelineId}/stages`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            });
            const data = await response.json();

            if (data.ok && data.stages) {
                this.state.stages = data.stages;
                this.populateStageSelect();

                let stageToSelect = this.state.selectedStageId;

                if (!stageToSelect || !this.state.stages.find(s => String(s.id) === String(stageToSelect))) {
                    stageToSelect = this.state.stages.length > 0 ? String(this.state.stages[0].id) : null;
                }

                if (stageToSelect) {
                    this.state.selectedStageId = stageToSelect;
                    const select = document.getElementById('admin-modal-stage-select');
                    if (select) {
                        select.value = stageToSelect;
                        console.log('[ADMIN_MODAL] Установлен этап:', stageToSelect);
                    }
                }
            }
        } catch (error) {
            console.error('[ADMIN_MODAL] Ошибка загрузки этапов:', error);
        }
    },

    populatePipelineSelect() {
        const select = document.getElementById('admin-modal-pipeline-select');
        if (!select) return;

        select.innerHTML = '<option value="">-- Выберите воронку --</option>';
        this.state.pipelines.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name.toUpperCase();
            select.appendChild(opt);
        });
    },

    populateStageSelect() {
        const select = document.getElementById('admin-modal-stage-select');
        if (!select) return;

        select.innerHTML = '<option value="">-- Выберите этап --</option>';
        this.state.stages.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name.toUpperCase();
            select.appendChild(opt);
        });
    },

    // ГЛАВНАЯ ФУНКЦИЯ - ПОДКЛЮЧИТЬ АВТОМАТИЗАЦИЮ
    async connectAutomation() {
        const pipelineId = this.state.selectedPipelineId;
        const stageId = this.state.selectedStageId;

        if (!pipelineId || !stageId) {
            this.showNotification('Пожалуйста, выберите воронку и этап', 'error');
            return;
        }

        this.showNotification('⏳ Подключение автоматизации...', 'info');

        try {
            const token = localStorage.getItem('vortex_token');

            // ✅ 1. СОХРАНЯЕМ НАСТРОЙКИ НА СЕРВЕР
            console.log('[ADMIN_MODAL] Сохранение настроек:', { pipelineId, stageId });

            const settingsResponse = await fetch(`${API_BASE_URL}/api/auto_import/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    pipeline_id: parseInt(pipelineId),
                    stage_id: parseInt(stageId),
                    enabled: true
                })
            });

            const settingsResult = await settingsResponse.json();
            console.log('[ADMIN_MODAL] Результат сохранения:', settingsResult);

            if (settingsResult.status !== 'ok') {
                this.showNotification('Ошибка сохранения настроек', 'error');
                return;
            }

            // ✅ 2. Загружаем компании
            const response = await fetch(`${API_BASE_URL}/api/employees/companies/list`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.status === 'ok' && data.companies) {
                await this.checkImportedCompanies(data.companies);
                this.state.companies = data.companies;

                let companiesToImport = [];

                if (this.state.loadAllCompanies) {
                    companiesToImport = this.state.companies;
                } else if (this.state.loadNewCompanies) {
                    companiesToImport = this.state.companies.filter(c => !c.imported);
                } else {
                    companiesToImport = this.state.companies.filter(c => !c.imported);
                }

                if (companiesToImport.length === 0) {
                    this.showNotification('Нет компаний для импорта', 'info');
                    return;
                }

                let success = 0;
                let failed = 0;

                for (const company of companiesToImport) {
                    try {
                        await this.importCompany(company.id);
                        success++;
                        await new Promise(resolve => setTimeout(resolve, 200));
                    } catch (e) {
                        failed++;
                        console.error(`[ADMIN_MODAL] Ошибка импорта ${company.name}:`, e);
                    }
                }

                this.state.automationEnabled = true;
                this.saveSettings();
                this.updateAutomationButton();

                this.startAutoCheck();

                if (typeof ADMIN_BACKGROUND !== 'undefined') {
                    ADMIN_BACKGROUND.start();
                }

                this.checkBackgroundStatus();

                const message = `✅ Автоматизация подключена! Импортировано: ${success} компаний, ошибок: ${failed}`;
                this.showNotification(message, success > 0 ? 'success' : 'error');

            } else {
                throw new Error(data.message || 'Ошибка загрузки компаний');
            }

        } catch (error) {
            console.error('[ADMIN_MODAL] Ошибка:', error);
            this.showNotification(`❌ Ошибка: ${error.message}`, 'error');
        }
    },

    // Проверка импортированных компаний
    async checkImportedCompanies(companies) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/crm/clients`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            });
            const data = await response.json();

            if (data.ok && data.clients) {
                const importedNames = new Set();
                data.clients.forEach(client => {
                    if (client.name && client.name.startsWith('КОМПАНИЯ ')) {
                        importedNames.add(client.name.replace('КОМПАНИЯ ', '').toUpperCase());
                    }
                });

                companies.forEach(company => {
                    company.imported = importedNames.has(company.name.toUpperCase());
                    const found = data.clients.find(c =>
                        c.name && c.name.replace('КОМПАНИЯ ', '').toUpperCase() === company.name.toUpperCase()
                    );
                    company.crm_client_id = found ? found.id : null;
                });
            }
        } catch (error) {
            console.error('[ADMIN_MODAL] Ошибка проверки импорта:', error);
        }
    },

    // Импорт одной компании
    async importCompany(companyId) {
        const company = this.state.companies.find(c => c.id === companyId);
        if (!company) return;

        const pipelineId = this.state.selectedPipelineId;
        const stageId = this.state.selectedStageId;

        if (!pipelineId || !stageId) {
            throw new Error('Выберите воронку и этап');
        }

        console.log(`[ADMIN_MODAL] Импорт компании: ${company.name}, pipeline=${pipelineId}, stage=${stageId}`);

        const response = await fetch(`${API_BASE_URL}/api/crm/clients/from_company`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`
            },
            body: JSON.stringify({
                company_id: companyId,
                pipeline_id: parseInt(pipelineId),
                stage_id: parseInt(stageId)
            })
        });

        const result = await response.json();
        if (!result.ok) {
            throw new Error(result.message || 'Ошибка импорта');
        }

        company.imported = true;
        company.crm_client_id = result.client?.id || null;
    },

    // Уведомление
    showNotification(message, type = 'info') {
        const existing = document.getElementById('admin-modal-notification');
        if (existing) existing.remove();

        const colors = {
            success: '#28a745',
            error: '#ff4d4d',
            info: '#00E5FF'
        };

        const notification = document.createElement('div');
        notification.id = 'admin-modal-notification';
        notification.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: rgba(0,0,0,0.95);
            border: 1px solid ${colors[type] || colors.info};
            color: #fff;
            padding: 14px 24px;
            border-radius: 6px;
            font-size: 12px;
            letter-spacing: 0.5px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.8);
            z-index: 9999999;
            max-width: 400px;
            animation: adminModalSlideIn 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
};

// Добавляем анимации
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes adminModalFadeIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
    }
    @keyframes adminModalSlideIn {
        from { transform: translateX(100px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(styleSheet);

window.ADMIN_MODAL = ADMIN_MODAL;