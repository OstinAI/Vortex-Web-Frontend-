// static/administration/admin.js - ОБНОВЛЕННАЯ ВЕРСИЯ

const ADMIN = {
    state: {
        companies: [],
        pipelines: [],
        stages: {},
        selectedPipelineId: null,
        selectedStageId: null,
        isLoaded: false,
        processingIds: new Set()
    },

    // Инициализация
    init() {
        console.log('[ADMIN] Инициализация панели...');
        this.loadPipelines();
        this.loadCompanies();
        this.setupEventListeners();
    },

    // Настройка обработчиков событий
    setupEventListeners() {
        const importBtn = document.getElementById('admin-import-all');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.importAllCompanies());
        }

        const pipelineSelect = document.getElementById('admin-pipeline-select');
        if (pipelineSelect) {
            pipelineSelect.addEventListener('change', (e) => {
                this.state.selectedPipelineId = e.target.value;
                this.loadStagesForPipeline(e.target.value);
            });
        }

        const stageSelect = document.getElementById('admin-stage-select');
        if (stageSelect) {
            stageSelect.addEventListener('change', (e) => {
                this.state.selectedStageId = e.target.value;
            });
        }
    },

    // ============================================================
    // ЗАГРУЗКА ДАННЫХ
    // ============================================================

    async loadPipelines() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/crm/pipelines`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            });
            const data = await response.json();

            if (data.ok && data.pipelines) {
                this.state.pipelines = data.pipelines;
                this.populatePipelineSelect();

                if (this.state.pipelines.length > 0) {
                    const first = this.state.pipelines[0];
                    this.state.selectedPipelineId = first.id;
                    document.getElementById('admin-pipeline-select').value = first.id;
                    await this.loadStagesForPipeline(first.id);
                }
            }
        } catch (error) {
            console.error('[ADMIN] Ошибка загрузки воронок:', error);
        }
    },

    async loadStagesForPipeline(pipelineId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/crm/pipelines/${pipelineId}/stages`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            });
            const data = await response.json();

            if (data.ok && data.stages) {
                this.state.stages[pipelineId] = data.stages;
                this.populateStageSelect(pipelineId);

                if (data.stages.length > 0) {
                    this.state.selectedStageId = data.stages[0].id;
                    document.getElementById('admin-stage-select').value = data.stages[0].id;
                }
            }
        } catch (error) {
            console.error('[ADMIN] Ошибка загрузки этапов:', error);
        }
    },

    populatePipelineSelect() {
        const select = document.getElementById('admin-pipeline-select');
        if (!select) return;

        select.innerHTML = '<option value="">-- Выберите воронку --</option>';
        this.state.pipelines.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name.toUpperCase();
            select.appendChild(opt);
        });
    },

    populateStageSelect(pipelineId) {
        const select = document.getElementById('admin-stage-select');
        if (!select) return;

        const stages = this.state.stages[pipelineId] || [];
        select.innerHTML = '<option value="">-- Выберите этап --</option>';
        stages.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name.toUpperCase();
            select.appendChild(opt);
        });
    },

    // ============================================================
    // ЗАГРУЗКА КОМПАНИЙ
    // ============================================================

    async loadCompanies() {
        const container = document.getElementById('admin-companies-list');
        if (!container) return;

        container.innerHTML = `
            <div class="admin-loader">
                <div class="spinner"></div>
                <span style="color:rgba(255,255,255,0.4);font-size:11px;">ЗАГРУЗКА КОМПАНИЙ...</span>
            </div>
        `;

        try {
            const response = await fetch(`${API_BASE_URL}/api/employees/companies/list`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            });
            const data = await response.json();

            if (data.status === 'ok' && data.companies) {
                await this.checkImportedCompanies(data.companies);
                this.state.companies = data.companies;
                this.renderCompanies();
                this.updateStats();
            } else {
                throw new Error(data.message || 'Ошибка загрузки');
            }
        } catch (error) {
            console.error('[ADMIN] Ошибка загрузки компаний:', error);
            container.innerHTML = `
                <div class="admin-empty-state">
                    ОШИБКА ЗАГРУЗКИ ДАННЫХ: ${error.message}
                </div>
            `;
        }
    },

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
            console.error('[ADMIN] Ошибка проверки импорта:', error);
        }
    },

    // ============================================================
    // ОТРИСОВКА
    // ============================================================

    renderCompanies() {
        const container = document.getElementById('admin-companies-list');
        if (!container) return;

        if (this.state.companies.length === 0) {
            container.innerHTML = `
                <div class="admin-empty-state">
                    НЕТ ЗАРЕГИСТРИРОВАННЫХ КОМПАНИЙ
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        const sorted = [...this.state.companies].sort((a, b) => {
            if (a.imported === b.imported) return a.name.localeCompare(b.name);
            return a.imported ? 1 : -1;
        });

        sorted.forEach(company => {
            const card = document.createElement('div');
            card.className = 'admin-company-card';
            card.dataset.companyId = company.id;

            card.innerHTML = `
                <div class="company-info">
                    <div class="company-name">${company.name.toUpperCase()}</div>
                    <div class="company-details">
                        <span>👤 ${company.admin_name || company.admin_login || 'Нет администратора'}</span>
                        <span>📧 ${company.admin_email || '—'}</span>
                        <span>📱 ${company.phone || '—'}</span>
                        <span>🆔 ID: ${company.id}</span>
                        ${company.bin ? `<span>🔑 БИН: ${company.bin}</span>` : ''}
                    </div>
                </div>
                <div class="company-actions">
                    <span class="company-status-badge ${company.imported ? 'imported' : 'pending'}">
                        ${company.imported ? 'В CRM' : 'ОЖИДАЕТ'}
                    </span>
                    ${!company.imported ? `
                        <button class="btn-admin-success" onclick="ADMIN.importCompany(${company.id})">
                            ИМПОРТ
                        </button>
                    ` : `
                        <button class="btn-admin-primary" onclick="ADMIN.viewCompanyFields(${company.id})">
                            ПОЛЯ
                        </button>
                    `}
                </div>
            `;

            card.addEventListener('click', (e) => {
                if (!e.target.closest('.company-actions')) {
                    this.viewCompanyFields(company.id);
                }
            });

            container.appendChild(card);
        });
    },

    updateStats() {
        const total = this.state.companies.length;
        const imported = this.state.companies.filter(c => c.imported).length;
        const pending = total - imported;

        document.getElementById('admin-stat-total').textContent = total;
        document.getElementById('admin-stat-imported').textContent = imported;
        document.getElementById('admin-stat-pending').textContent = pending;
    },

    // ============================================================
    // ИМПОРТ КОМПАНИЙ
    // ============================================================

    async importCompany(companyId) {
        if (this.state.processingIds.has(companyId)) return;

        const company = this.state.companies.find(c => c.id === companyId);
        if (!company) return;

        this.state.processingIds.add(companyId);
        this.updateCompanyCardStatus(companyId, 'processing');

        try {
            const pipelineId = this.state.selectedPipelineId;
            const stageId = this.state.selectedStageId;

            if (!pipelineId || !stageId) {
                throw new Error('Выберите воронку и этап для импорта');
            }

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
            company.crm_client_id = result.client.id;

            this.renderCompanies();
            this.updateStats();

            this.showNotification(`Компания "${company.name}" успешно импортирована!`, 'success');

        } catch (error) {
            console.error('[ADMIN] Ошибка импорта:', error);
            this.showNotification(`Ошибка импорта: ${error.message}`, 'error');
        } finally {
            this.state.processingIds.delete(companyId);
        }
    },

    async importAllCompanies() {
        const pending = this.state.companies.filter(c => !c.imported);

        if (pending.length === 0) {
            this.showNotification('Все компании уже импортированы', 'info');
            return;
        }

        if (!confirm(`Импортировать ${pending.length} компаний в CRM?`)) return;

        let success = 0;
        let failed = 0;

        for (const company of pending) {
            try {
                await this.importCompany(company.id);
                success++;
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (e) {
                failed++;
                console.error(`[ADMIN] Ошибка импорта ${company.name}:`, e);
            }
        }

        this.showNotification(`Импорт завершен: ${success} успешно, ${failed} с ошибками`, 'info');
    },

    // ============================================================
    // ПРОСМОТР ПОЛЕЙ
    // ============================================================

    viewCompanyFields(companyId) {
        const company = this.state.companies.find(c => c.id === companyId);
        if (!company) return;

        const fields = {
            'Название компании': company.name,
            'Слоган': company.slogan || '—',
            'БИН / ИИН': company.bin || '—',
            'Телефон': company.phone || '—',
            'Веб-сайт': company.website || '—',
            'Адрес': company.address || '—',
            'Логин администратора': company.admin_login || '—',
            'Имя администратора': company.admin_name || '—',
            'Email администратора': company.admin_email || '—'
        };

        const modal = document.createElement('div');
        modal.className = 'vortex-modal admin-fields-modal';
        modal.style.display = 'flex';
        modal.id = 'admin-fields-modal';

        modal.innerHTML = `
            <div class="modal-content" style="max-width:500px;">
                <h3 style="color: var(--vortex-accent); text-transform: uppercase; margin-bottom:20px;">
                    📋 ${company.name.toUpperCase()}
                </h3>
                <div style="margin-bottom:20px;font-size:11px;color:rgba(255,255,255,0.3);">
                    ${company.imported ? `✅ В CRM (ID: ${company.crm_client_id})` : '⏳ Ожидает импорта'}
                </div>
                <div style="max-height:400px;overflow-y:auto;">
                    ${Object.entries(fields).map(([label, value]) => `
                        <div class="admin-field-row">
                            <span class="field-label">${label}</span>
                            <span class="field-value">${value}</span>
                        </div>
                    `).join('')}
                </div>
                <div style="margin-top:20px;display:flex;gap:10px;">
                    <button onclick="document.getElementById('admin-fields-modal').remove()" 
                            class="vortex-btn-danger" style="flex:1;">
                        ЗАКРЫТЬ
                    </button>
                    ${!company.imported ? `
                        <button onclick="ADMIN.importCompany(${company.id}); document.getElementById('admin-fields-modal').remove();" 
                                class="vortex-btn-primary" style="flex:1;">
                            ИМПОРТИРОВАТЬ
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    },

    // ============================================================
    // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    // ============================================================

    updateCompanyCardStatus(companyId, status) {
        const card = document.querySelector(`.admin-company-card[data-company-id="${companyId}"]`);
        if (!card) return;

        const badge = card.querySelector('.company-status-badge');
        if (badge) {
            badge.textContent = status === 'processing' ? '⏳ ...' : 'ОЖИДАЕТ';
            badge.className = `company-status-badge ${status === 'processing' ? 'pending' : 'pending'}`;
        }
    },

    showNotification(message, type = 'info') {
        const existing = document.getElementById('admin-notification');
        if (existing) existing.remove();

        const colors = {
            success: '#28a745',
            error: '#ff4d4d',
            info: '#00E5FF'
        };

        const notification = document.createElement('div');
        notification.id = 'admin-notification';
        notification.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: rgba(0,0,0,0.9);
            border: 1px solid ${colors[type] || colors.info};
            color: #fff;
            padding: 14px 24px;
            border-radius: 6px;
            font-size: 12px;
            letter-spacing: 0.5px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.8);
            z-index: 999999;
            animation: admin-notification-in 0.3s ease;
            max-width: 400px;
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

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    ADMIN.init();
});

window.ADMIN = ADMIN;