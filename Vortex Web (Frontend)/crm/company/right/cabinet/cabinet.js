/**
 * Модуль Кабинет дистрибьютора
 * Путь: /crm/company/right/cabinet/cabinet.js
 */

(function () {
    'use strict';

    // ============================================
    // СОСТОЯНИЕ
    // ============================================
    let linkedCompanies = [];
    let filteredCompanies = [];
    let isLoading = false;
    let distributorInfo = null;

    // ============================================
    // ЗАГРУЗКА ДАННЫХ
    // ============================================
    async function loadLinkedCompanies() {
        if (isLoading) return;
        isLoading = true;

        const listEl = document.getElementById('cabinetList');
        if (listEl) {
            listEl.innerHTML = `
                <div class="cabinet-loader">
                    <div class="spinner"></div>
                    <span>Загрузка...</span>
                </div>
            `;
        }

        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                showNotification('Токен не найден', 'error');
                isLoading = false;
                return;
            }

            if (typeof API_BASE_URL === 'undefined') {
                showNotification('API_BASE_URL не определён', 'error');
                isLoading = false;
                return;
            }

            // Получаем привязанные компании
            const response = await fetch(API_BASE_URL + '/api/company/distributor/linked-companies', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            console.log('[Cabinet] 📦 Ответ:', data);

            if (data.status === 'ok') {
                linkedCompanies = data.data || [];
                distributorInfo = {
                    id: data.distributor_id,
                    name: data.distributor_name,
                    is_distributor: data.is_distributor
                };
                filteredCompanies = [...linkedCompanies];
                renderCompanies();
                updateStats();
            } else {
                showNotification('Ошибка: ' + (data.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('[Cabinet] ❌ Ошибка:', error);
            showNotification('Ошибка загрузки: ' + error.message, 'error');
        }

        isLoading = false;
    }

    // ============================================
    // ОБНОВЛЕНИЕ СТАТИСТИКИ
    // ============================================
    function updateStats() {
        const totalEl = document.getElementById('cabinetTotalCompanies');
        if (totalEl) {
            totalEl.textContent = linkedCompanies.length;
        }

        const activeEl = document.getElementById('cabinetActiveCompanies');
        if (activeEl) {
            const active = linkedCompanies.filter(c => c.is_active !== false).length;
            activeEl.textContent = active;
        }
    }

    // ============================================
    // ОТОБРАЖЕНИЕ СПИСКА КОМПАНИЙ
    // ============================================
    function renderCompanies() {
        const listEl = document.getElementById('cabinetList');
        if (!listEl) return;

        // Проверяем, является ли пользователь дистрибьютором
        if (distributorInfo && !distributorInfo.is_distributor) {
            listEl.innerHTML = `
                <div class="cabinet-empty-state">
                    <span class="empty-icon">🔒</span>
                    <p>Вы не являетесь дистрибьютором</p>
                    <span class="hint">Для доступа к кабинету необходимо подать заявку и получить одобрение</span>
                </div>
            `;
            return;
        }

        if (filteredCompanies.length === 0) {
            const search = document.getElementById('cabinetSearch')?.value?.toLowerCase()?.trim() || '';
            const total = linkedCompanies.length;
            let message = 'Нет привязанных компаний';
            if (total > 0 && search) {
                message = `Ничего не найдено по запросу "${search}"`;
            } else if (total === 0) {
                message = 'К вам пока не привязаны компании';
            }
            listEl.innerHTML = `
                <div class="cabinet-empty-state">
                    <span class="empty-icon">🏢</span>
                    <p>${message}</p>
                    ${total > 0 ? `<span class="hint">Всего компаний: ${total}</span>` : '<span class="hint">Компании появятся после привязки</span>'}
                </div>
            `;
            return;
        }

        let html = '';
        const search = document.getElementById('cabinetSearch')?.value?.toLowerCase()?.trim() || '';

        if (search && linkedCompanies.length > 0) {
            html += `
                <div style="padding: 4px 8px 8px 8px; font-size: 12px; color: rgba(255,255,255,0.3);">
                    Найдено: ${filteredCompanies.length} из ${linkedCompanies.length}
                </div>
            `;
        }

        filteredCompanies.forEach((company, index) => {
            const highlightText = (text, searchStr) => {
                if (!text || !searchStr) return escapeHtml(text || '—');
                const escaped = escapeHtml(text);
                const regex = new RegExp(`(${escapeHtml(searchStr).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                return escaped.replace(regex, '<span style="background: rgba(0,229,255,0.15); color: #00E5FF; padding: 0 2px; border-radius: 2px;">$1</span>');
            };

            const linkedDate = company.linked_date ||
                (company.linked_ts_ms ? new Date(company.linked_ts_ms).toLocaleDateString('ru-RU') : '—');

            html += `
                <div class="cabinet-card" data-id="${company.id}" onclick="window.toggleCabinetCompany(${company.id})">
                    <div class="cabinet-card-main">
                        <div class="cabinet-card-short">
                            <div class="short-row">
                                <span class="short-label">Компания</span>
                                <span class="short-value">${highlightText(company.name || '—', search)}</span>
                            </div>
                            <div class="short-row">
                                <span class="short-label">Президент</span>
                                <span class="short-value">${highlightText(company.president || '—', search)}</span>
                            </div>
                            <div class="short-row">
                                <span class="short-label">Почта</span>
                                <span class="short-value">${highlightText(company.email || '—', search)}</span>
                            </div>
                            <div class="short-row">
                                <span class="short-label">Телефон конт. лица</span>
                                <span class="short-value">${highlightText(company.contact_person_phone || '—', search)}</span>
                            </div>
                        </div>
                        <div class="cabinet-expand-icon">▼</div>
                    </div>
                    <div class="cabinet-card-body">
                        <div class="cabinet-card-body-inner">
                            <div class="cabinet-details">
                                <div class="detail-item">
                                    <span class="detail-label">Название компании</span>
                                    <span class="detail-value">${highlightText(company.name || '—', search)}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Президент</span>
                                    <span class="detail-value">${highlightText(company.president || '—', search)}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Почта</span>
                                    <span class="detail-value">${highlightText(company.email || '—', search)}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Телефон контактного лица</span>
                                    <span class="detail-value">${highlightText(company.contact_person_phone || '—', search)}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Дата привязки</span>
                                    <span class="detail-value">${highlightText(linkedDate, search)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        listEl.innerHTML = html;
    }

    // ============================================
    // ПОИСК И ФИЛЬТР
    // ============================================
    window.filterCabinetCompanies = function () {
        const search = document.getElementById('cabinetSearch')?.value?.toLowerCase()?.trim() || '';

        if (!search) {
            filteredCompanies = [...linkedCompanies];
        } else {
            filteredCompanies = linkedCompanies.filter(company => {
                const searchInObject = (obj, searchStr) => {
                    if (!obj) return false;
                    if (typeof obj === 'string') return obj.toLowerCase().includes(searchStr);
                    if (typeof obj === 'number') return String(obj).toLowerCase().includes(searchStr);
                    if (Array.isArray(obj)) return obj.some(item => searchInObject(item, searchStr));
                    if (typeof obj === 'object' && obj !== null) {
                        for (const key in obj) {
                            if (key === 'id' || key === 'linked_ts_ms' || key === 'is_active') continue;
                            if (searchInObject(obj[key], searchStr)) return true;
                        }
                    }
                    return false;
                };
                return searchInObject(company, search);
            });
        }
        renderCompanies();
    };

    // ============================================
    // РАСКРЫТИЕ/СВЕРТЫВАНИЕ
    // ============================================
    window.toggleCabinetCompany = function (id) {
        const currentCard = document.querySelector(`.cabinet-card[data-id="${id}"]`);
        if (!currentCard) return;
        if (currentCard.classList.contains('expanded')) {
            currentCard.classList.remove('expanded');
            return;
        }
        const allExpanded = document.querySelectorAll('.cabinet-card.expanded');
        allExpanded.forEach(card => card.classList.remove('expanded'));
        currentCard.classList.add('expanded');
    };

    // ============================================
    // ЗАКРЫТЬ МОДУЛЬ
    // ============================================
    window.closeCabinet = function () {
        console.log('[Cabinet] 🔴 Закрытие модуля...');

        const rightContent = document.getElementById('rightContent');
        if (rightContent) {
            rightContent.innerHTML = '';
            console.log('[Cabinet] ✅ Контент очищен');
            if (typeof window.createCompanyButtons === 'function') {
                console.log('[Cabinet] 🔄 Вызов createCompanyButtons()...');
                window.createCompanyButtons();
            } else {
                console.warn('[Cabinet] ⚠️ createCompanyButtons не найден, пробуем загрузить...');
                loadCompanyButtons();
            }
        }
    };

    // ============================================
    // ЗАГРУЗКА КНОПОК КОМПАНИИ
    // ============================================
    function loadCompanyButtons() {
        const script = document.createElement('script');
        script.src = '/crm/company/right/buttons/company-buttons.js';
        script.onload = function () {
            console.log('[Cabinet] ✅ company-buttons.js загружен');
            if (typeof window.createCompanyButtons === 'function') {
                window.createCompanyButtons();
            }
        };
        script.onerror = function () {
            console.error('[Cabinet] ❌ Не удалось загрузить company-buttons.js');
            const rightContent = document.getElementById('rightContent');
            if (rightContent) {
                rightContent.innerHTML = `
                    <div style="padding: 40px; text-align: center; color: rgba(255,255,255,0.3);">
                        <p>Кнопки компании не загружены</p>
                        <button onclick="location.reload()" style="padding: 8px 20px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; cursor: pointer; margin-top: 10px;">Обновить страницу</button>
                    </div>
                `;
            }
        };
        document.body.appendChild(script);
    }

    // ============================================
    // ОТКРЫТЬ МОДУЛЬ
    // ============================================
    window.openCabinet = function () {
        console.log('[Cabinet] 📋 Открытие...');
        const rightContent = document.getElementById('rightContent');
        if (!rightContent) {
            console.error('[Cabinet] ❌ #rightContent не найден');
            return;
        }

        if (document.getElementById('cabinetApp')) {
            console.log('[Cabinet] ⚠️ Уже открыто');
            return;
        }

        // HTML шаблон
        const html = `
            <div id="cabinetApp" class="cabinet-container">
                <!-- ШАПКА -->
                <div class="cabinet-header">
                    <div class="cabinet-header-left">
                        <h2 class="cabinet-title">Кабинет дистрибьютора</h2>
                    </div>
                    <button class="cabinet-close-btn" id="cabinetCloseBtn">✕</button>
                </div>

                <!-- СТАТИСТИКА -->
                <div class="cabinet-stats">
                    <div class="cabinet-stat-item">
                        <div class="cabinet-stat-value" id="cabinetTotalCompanies">0</div>
                        <div class="cabinet-stat-label">Всего компаний</div>
                    </div>
                    <div class="cabinet-stat-item">
                        <div class="cabinet-stat-value" id="cabinetActiveCompanies">0</div>
                        <div class="cabinet-stat-label">Активных</div>
                    </div>
                </div>

                <!-- ПОИСК -->
                <div class="cabinet-controls-row">
                    <div class="search-container">
                        <span class="search-icon">🔍</span>
                        <input type="text" id="cabinetSearch" placeholder="Поиск по компаниям..." oninput="window.filterCabinetCompanies()">
                    </div>
                    <span class="cabinet-count" id="cabinetCount"></span>
                </div>

                <!-- СПИСОК -->
                <div class="cabinet-list-grid" id="cabinetList">
                    <div class="cabinet-loader">
                        <div class="spinner"></div>
                        <span>Загрузка...</span>
                    </div>
                </div>
            </div>
        `;

        rightContent.innerHTML = html;

        // Подключаем CSS
        if (!document.querySelector('link[href*="cabinet.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/crm/company/right/cabinet/cabinet.css';
            document.head.appendChild(link);
        }

        // Настраиваем кнопку закрытия
        const closeBtn = document.getElementById('cabinetCloseBtn');
        if (closeBtn) {
            closeBtn.onclick = function () {
                window.closeCabinet();
            };
        }

        // Загружаем данные
        loadLinkedCompanies();

        // Обновляем счетчик при поиске
        const searchInput = document.getElementById('cabinetSearch');
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                const countEl = document.getElementById('cabinetCount');
                if (countEl) {
                    const total = filteredCompanies.length;
                    const all = linkedCompanies.length;
                    countEl.textContent = total === all ? `${total}` : `${total} из ${all}`;
                }
            });
        }
    };

    // ============================================
    // УВЕДОМЛЕНИЯ
    // ============================================
    function showNotification(message, type = 'info') {
        const container = document.querySelector('.cabinet-notification-container') || (() => {
            const c = document.createElement('div');
            c.className = 'cabinet-notification-container';
            c.style.cssText = `
                position: fixed;
                top: 30px;
                right: 30px;
                z-index: 100000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 420px;
                pointer-events: none;
            `;
            document.body.appendChild(c);
            return c;
        })();

        const notification = document.createElement('div');
        notification.className = `cabinet-notification ${type}`;
        notification.style.cssText = `
            padding: 12px 18px;
            background: rgba(20, 20, 30, 0.95);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 12px;
            color: #fff;
            font-family: 'Segoe UI', system-ui, sans-serif;
            font-size: 14px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.5);
            animation: slideInRight 0.3s ease;
            pointer-events: auto;
            border-left: 4px solid ${type === 'success' ? '#00E5FF' : type === 'error' ? '#ff6b6b' : type === 'warning' ? '#ffd93d' : '#4dabf7'};
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        notification.textContent = message;

        container.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(40px)';
            notification.style.transition = 'all 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // ============================================
    // ESCAPE HTML
    // ============================================
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ============================================
    // ГЛОБАЛЬНЫЙ ОБЪЕКТ
    // ============================================
    window.onCabinet = function () {
        window.openCabinet();
    };

    console.log('✅ Модуль Кабинет загружен');
})();