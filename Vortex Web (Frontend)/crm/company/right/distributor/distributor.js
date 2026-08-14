/**
 * Модуль дистрибьюторов для правой секции
 * Путь: /crm/company/right/distributor/distributor.js
 */

(function () {
    'use strict';

    let isLoading = false;
    let distributorsList = [];
    let applicationsList = [];
    let selectedDistributorId = null;
    let isDistributorDropdownOpen = false;
    let activeTab = 'distributors';
    let applicationFilter = 'all';
    let expandedDistributorId = null;
    let expandedCompanyId = null;
    let distributorDetailsCache = {};
    let currentSearch = '';

    // ============================================
    // ПОЛУЧЕНИЕ ДАННЫХ
    // ============================================
    async function fetchDistributors() {
        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                console.warn('[Distributor] Token not found');
                return null;
            }

            const url = API_BASE_URL + '/api/company/distributor/list';
            console.log('[Distributor] Request:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('[Distributor] HTTP error:', response.status);
                return null;
            }

            const data = await response.json();
            console.log('[Distributor] Response distributors:', data);

            if (data.status === 'ok') {
                distributorsList = data.data || [];
                selectedDistributorId = data.linked_distributor_id || null;
                return data;
            } else {
                console.error('[Distributor] Error:', data.message);
                return null;
            }

        } catch (error) {
            console.error('[Distributor] Request error:', error);
            return null;
        }
    }

    // ============================================
    // ПОЛУЧЕНИЕ ЗАЯВОК
    // ============================================
    async function fetchApplications() {
        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                console.warn('[Distributor] Token not found');
                return null;
            }

            const url = API_BASE_URL + '/api/company/distributor/applications/all';
            console.log('[Distributor] Applications request:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('[Distributor] HTTP error:', response.status);
                return null;
            }

            const data = await response.json();
            console.log('[Distributor] Applications:', data);

            if (data.status === 'ok') {
                applicationsList = data.data || [];
                return data;
            } else {
                console.error('[Distributor] Error:', data.message);
                return null;
            }

        } catch (error) {
            console.error('[Distributor] Request error:', error);
            return null;
        }
    }

    // ============================================
    // ПОЛУЧЕНИЕ ДЕТАЛЬНОЙ ИНФОРМАЦИИ О ДИСТРИБЬЮТОРЕ
    // ============================================
    async function fetchDistributorDetails(distributorId) {
        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                console.warn('[Distributor] Token not found');
                return null;
            }

            const url = API_BASE_URL + '/api/company/distributor/details/' + distributorId;
            console.log('[Distributor] Details request:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('[Distributor] HTTP error:', response.status);
                return null;
            }

            const data = await response.json();
            console.log('[Distributor] Details response:', data);

            if (data.status === 'ok' && data.data) {
                return data.data;
            } else {
                console.error('[Distributor] Error:', data.message);
                return null;
            }

        } catch (error) {
            console.error('[Distributor] Request error:', error);
            return null;
        }
    }

    // ============================================
    // ПОЛУЧЕНИЕ РЕКВИЗИТОВ КОМПАНИИ
    // ============================================
    async function fetchCompanyRequisites(companyId) {
        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                console.warn('[Distributor] Token not found');
                return null;
            }

            const url = API_BASE_URL + '/api/company/requisite';
            console.log('[Distributor] Company requisite request:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('[Distributor] HTTP error:', response.status);
                return null;
            }

            const data = await response.json();
            console.log('[Distributor] Company requisite:', data);

            if (data.status === 'ok') {
                return data.data;
            } else {
                console.error('[Distributor] Error:', data.message);
                return null;
            }

        } catch (error) {
            console.error('[Distributor] Request error:', error);
            return null;
        }
    }

    // ============================================
    // РАСКРЫТЬ ДИСТРИБЬЮТОРА (исправлено - без перезагрузки)
    // ============================================
    window.toggleDistributorExpand = async function (distributorId) {
        // Находим карточку
        const card = document.querySelector(`.distributor-card[data-id="${distributorId}"]`);
        if (!card) return;

        // Если уже раскрыт - просто закрываем
        if (expandedDistributorId === distributorId) {
            expandedDistributorId = null;
            expandedCompanyId = null;

            // Убираем класс expanded
            card.classList.remove('expanded');
            // Удаляем контент
            const content = card.querySelector('.distributor-expand-content');
            if (content) content.remove();
            // Меняем иконку обратно
            const icon = card.querySelector('.distributor-expand-icon');
            if (icon) icon.textContent = '▼';
            return;
        }

        // Закрываем предыдущий раскрытый
        if (expandedDistributorId) {
            const prevCard = document.querySelector(`.distributor-card[data-id="${expandedDistributorId}"]`);
            if (prevCard) {
                prevCard.classList.remove('expanded');
                const prevContent = prevCard.querySelector('.distributor-expand-content');
                if (prevContent) prevContent.remove();
                const prevIcon = prevCard.querySelector('.distributor-expand-icon');
                if (prevIcon) prevIcon.textContent = '▼';
            }
        }

        expandedDistributorId = distributorId;
        expandedCompanyId = null;

        // Добавляем класс expanded
        card.classList.add('expanded');
        const icon = card.querySelector('.distributor-expand-icon');
        if (icon) icon.textContent = '▲';

        // Создаем контейнер для контента
        let expandContent = document.createElement('div');
        expandContent.className = 'distributor-expand-content';
        expandContent.innerHTML = `
        <div class="loading-details">
            <div class="spinner" style="display: inline-block; width: 20px; height: 20px; border: 2px solid rgba(0,229,255,0.1); border-top: 2px solid #00E5FF; border-radius: 50%; animation: spin 0.8s linear infinite; vertical-align: middle; margin-right: 10px;"></div>
            Загрузка данных...
        </div>
    `;
        card.appendChild(expandContent);

        // Загружаем данные
        let details = distributorDetailsCache[distributorId];
        if (!details) {
            details = await fetchDistributorDetails(distributorId);
            if (details) {
                distributorDetailsCache[distributorId] = details;
                const distributor = distributorsList.find(d => d.id === distributorId);
                if (distributor) {
                    distributor._details = details;
                }
            } else {
                distributorDetailsCache[distributorId] = { error: true };
            }
        }

        // Обновляем контент
        if (details && !details.error) {
            // Собираем HTML для деталей
            let detailHTML = `
            <div class="distributor-detail-section">
                <div class="detail-row">
                    <span class="detail-label">Название</span>
                    <span class="detail-value">${escapeHtml(details.company_name || '')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Президент</span>
                    <span class="detail-value">${escapeHtml(details.president || '')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Телефон</span>
                    <span class="detail-value">${escapeHtml(details.phone || '')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Email</span>
                    <span class="detail-value">${escapeHtml(details.email || '')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Адрес</span>
                    <span class="detail-value">${escapeHtml(details.address || '')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Сайт</span>
                    <span class="detail-value">${escapeHtml(details.website || '')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">PayPal</span>
                    <span class="detail-value" style="color: #00E5FF;">${escapeHtml(details.paypal_email || '—')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Клиентов</span>
                    <span class="detail-value">${details.total_clients || 0}</span>
                </div>
            </div>
        `;

            // Компании
            let companiesHTML = '';
            if (details.linked_companies && details.linked_companies.length > 0) {
                companiesHTML = `
                <div class="distributor-companies">
                    <div class="companies-title">Закрепленные компании (${details.linked_companies.length})</div>
                    ${details.linked_companies.map(function (comp) {
                    return `
                            <div class="company-item" onclick="event.stopPropagation(); window.toggleCompanyExpand(${comp.id})">
                                <div class="company-item-header">
                                    <span class="company-name">${escapeHtml(comp.name)}</span>
                                    <span class="company-expand-icon">▶</span>
                                </div>
                            </div>
                        `;
                }).join('')}
                </div>
            `;
            } else {
                companiesHTML = `
                <div class="distributor-companies">
                    <div class="companies-title">Закрепленные компании: 0</div>
                    <div class="no-companies">Нет закрепленных компаний</div>
                </div>
            `;
            }

            expandContent.innerHTML = detailHTML + companiesHTML;
        } else {
            expandContent.innerHTML = `
            <div class="error-loading">Ошибка загрузки данных</div>
        `;
        }
    };

    // ============================================
    // РАСКРЫТЬ КОМПАНИЮ (исправлено - без перезагрузки)
    // ============================================
    window.toggleCompanyExpand = async function (companyId) {
        // Находим элемент компании
        const companyItem = document.querySelector(`.company-item`);
        // Ищем по onclick атрибуту (костыль, но работает)
        let targetItem = null;
        document.querySelectorAll('.company-item').forEach(function (el) {
            if (el.getAttribute('onclick') && el.getAttribute('onclick').includes(companyId)) {
                targetItem = el;
            }
        });

        if (!targetItem) return;

        // Проверяем, есть ли уже раскрытые реквизиты
        let reqDiv = targetItem.querySelector('.company-requisites');

        if (expandedCompanyId === companyId) {
            expandedCompanyId = null;
            if (reqDiv) reqDiv.remove();
            const icon = targetItem.querySelector('.company-expand-icon');
            if (icon) icon.textContent = '▶';
            targetItem.classList.remove('expanded');
            return;
        }

        // Закрываем предыдущую
        if (expandedCompanyId) {
            document.querySelectorAll('.company-item').forEach(function (el) {
                const prevReq = el.querySelector('.company-requisites');
                if (prevReq) {
                    prevReq.remove();
                    const icon = el.querySelector('.company-expand-icon');
                    if (icon) icon.textContent = '▶';
                    el.classList.remove('expanded');
                }
            });
        }

        expandedCompanyId = companyId;
        targetItem.classList.add('expanded');

        // Меняем иконку
        const icon = targetItem.querySelector('.company-expand-icon');
        if (icon) icon.textContent = '▼';

        // Создаем контейнер для реквизитов
        if (!reqDiv) {
            reqDiv = document.createElement('div');
            reqDiv.className = 'company-requisites';
            reqDiv.innerHTML = '<div style="padding: 8px 0; color: rgba(255,255,255,0.3);">Загрузка...</div>';
            targetItem.appendChild(reqDiv);
        }

        // Загружаем реквизиты
        const requisites = await fetchCompanyRequisites(companyId);

        if (requisites) {
            const reqFields = [
                { label: 'Название', key: 'name' },
                { label: 'БИН/ИИН', key: 'bin' },
                { label: 'Телефон', key: 'phone' },
                { label: 'Адрес', key: 'address' },
                { label: 'Сайт', key: 'website' },
                { label: 'Слоган', key: 'slogan' },
                { label: 'Президент', key: 'president' },
                { label: 'Email компании', key: 'company_email' }
            ];

            let html = '';
            reqFields.forEach(function (f) {
                const val = requisites[f.key] || '';
                if (!val) return;
                html += `
                <div class="req-row">
                    <span class="req-label">${f.label}</span>
                    <span class="req-value">${escapeHtml(val)}</span>
                </div>
            `;
            });

            reqDiv.innerHTML = html || '<div style="padding: 8px 0; color: rgba(255,255,255,0.3);">Нет данных</div>';
        } else {
            reqDiv.innerHTML = '<div style="padding: 8px 0; color: #ff6b6b;">Ошибка загрузки</div>';
        }
    };

    // ============================================
    // ОДОБРИТЬ ЗАЯВКУ
    // ============================================
    window.approveApplication = async function (applicationId) {
        if (!confirm('Одобрить заявку?')) return;

        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                showNotification('Токен не найден', 'error');
                return;
            }

            const response = await fetch(API_BASE_URL + '/api/company/distributor/application/review/' + applicationId, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'approve', comment: 'Заявка одобрена' })
            });

            const result = await response.json();
            if (result.status === 'ok') {
                showNotification('Заявка одобрена!', 'success');
                distributorDetailsCache = {};
                setTimeout(() => {
                    distributorDetailsCache = {};
                    // Если есть раскрытый дистрибьютор - обновляем его
                    if (expandedDistributorId) {
                        window.toggleDistributorExpand(expandedDistributorId);
                    }
                }, 500);
            } else {
                showNotification('Ошибка: ' + (result.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('[Distributor] Error:', error);
            showNotification('Ошибка: ' + error.message, 'error');
        }
    };

    // ============================================
    // ОТКЛОНИТЬ ЗАЯВКУ
    // ============================================
    window.rejectApplication = async function (applicationId) {
        if (!confirm('Отклонить заявку?')) return;

        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                showNotification('Токен не найден', 'error');
                return;
            }

            const response = await fetch(API_BASE_URL + '/api/company/distributor/application/review/' + applicationId, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'reject', comment: 'Заявка отклонена' })
            });

            const result = await response.json();
            if (result.status === 'ok') {
                showNotification('Заявка отклонена', 'success');
                distributorDetailsCache = {};
                setTimeout(() => {
                    distributorDetailsCache = {};
                    // Если есть раскрытый дистрибьютор - обновляем его
                    if (expandedDistributorId) {
                        window.toggleDistributorExpand(expandedDistributorId);
                    }
                }, 500);
            } else {
                showNotification('Ошибка: ' + (result.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('[Distributor] Error:', error);
            showNotification('Ошибка: ' + error.message, 'error');
        }
    };

    // ============================================
    // ОТОЗВАТЬ ОДОБРЕНИЕ
    // ============================================
    window.revokeApproval = async function (applicationId) {
        if (!confirm('Отозвать одобрение заявки?')) return;

        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                showNotification('Токен не найден', 'error');
                return;
            }

            const response = await fetch(API_BASE_URL + '/api/company/distributor/application/revoke/' + applicationId, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ comment: 'Одобрение отозвано' })
            });

            const result = await response.json();
            if (result.status === 'ok') {
                showNotification('Одобрение отозвано', 'success');
                distributorDetailsCache = {};
                setTimeout(() => {
                    distributorDetailsCache = {};
                    // Если есть раскрытый дистрибьютор - обновляем его
                    if (expandedDistributorId) {
                        window.toggleDistributorExpand(expandedDistributorId);
                    }
                }, 500);
            } else {
                showNotification('Ошибка: ' + (result.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('[Distributor] Error:', error);
            showNotification('Ошибка: ' + error.message, 'error');
        }
    };

    // ============================================
    // ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
    // ============================================
    window.switchDistributorTab = function (tab) {
        activeTab = tab;
        applicationFilter = 'all';
        expandedDistributorId = null;
        expandedCompanyId = null;
        window.distributorLoad();
    };

    // ============================================
    // ФИЛЬТРАЦИЯ ЗАЯВОК
    // ============================================
    window.filterApplications = function (status) {
        applicationFilter = status;
        window.distributorLoad();
    };

    // ============================================
    // ПОИСК (исправленная версия)
    // ============================================
    let searchTimeout = null;

    window.filterDistributors = function () {
        const searchInput = document.getElementById('distributorSearch');
        if (!searchInput) return;

        currentSearch = searchInput.value.toLowerCase().trim();

        // Очищаем предыдущий таймер
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        // Задержка перед обновлением (debounce)
        searchTimeout = setTimeout(function () {
            // Сохраняем позицию курсора и фокус
            const cursorPosition = searchInput.selectionStart;
            const wasFocused = document.activeElement === searchInput;

            window.distributorLoad(function () {
                // После загрузки восстанавливаем фокус и позицию курсора
                if (wasFocused) {
                    const newInput = document.getElementById('distributorSearch');
                    if (newInput) {
                        newInput.focus();
                        newInput.setSelectionRange(cursorPosition, cursorPosition);
                    }
                }
            });
        }, 300);
    };


    // ============================================
    // ВЫПАДАЮЩИЙ СПИСОК
    // ============================================
    window.toggleDistributorDropdown = function () {
        const dropdown = document.getElementById('distributorDropdown');
        if (!dropdown) return;

        if (dropdown.style.display === 'block') {
            dropdown.style.display = 'none';
            isDistributorDropdownOpen = false;
        } else {
            dropdown.style.display = 'block';
            isDistributorDropdownOpen = true;
            const input = document.getElementById('distributorSearchInput');
            if (input) input.focus();
        }
    };

    window.openDistributorDropdown = function () {
        const dropdown = document.getElementById('distributorDropdown');
        if (dropdown) {
            dropdown.style.display = 'block';
            isDistributorDropdownOpen = true;
        }
    };

    window.filterDistributorList = function (query) {
        const dropdown = document.getElementById('distributorDropdown');
        const list = document.getElementById('distributorList');
        if (!list || !dropdown) return;

        if (query.trim().length > 0) {
            dropdown.style.display = 'block';
            isDistributorDropdownOpen = true;
        }

        const lowerQuery = query.toLowerCase().trim();
        const items = list.querySelectorAll('.distributor-item');

        let visibleCount = 0;
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            const match = text.includes(lowerQuery);
            item.style.display = match ? 'flex' : 'none';
            if (match) visibleCount++;
        });

        const oldEmpty = list.querySelector('.distributor-no-results');
        if (oldEmpty) oldEmpty.remove();

        if (visibleCount === 0 && query.trim().length > 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'distributor-no-results';
            emptyMsg.textContent = 'Ничего не найдено';
            list.appendChild(emptyMsg);
        }
    };

    window.selectDistributor = function (distributorId) {
        isDistributorDropdownOpen = false;
        const dropdown = document.getElementById('distributorDropdown');
        if (dropdown) dropdown.style.display = 'none';
        showNotification('Выбран дистрибьютор', 'info');
    };

    // Закрытие при клике вне
    document.addEventListener('click', function (event) {
        const dropdown = document.getElementById('distributorDropdown');
        const searchWrapper = document.querySelector('.distributor-search-wrapper');
        if (!dropdown || !searchWrapper) return;
        if (!searchWrapper.contains(event.target)) {
            dropdown.style.display = 'none';
            isDistributorDropdownOpen = false;
        }
    });

    // Закрытие по ESC
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            const dropdown = document.getElementById('distributorDropdown');
            if (dropdown) {
                dropdown.style.display = 'none';
                isDistributorDropdownOpen = false;
            }
        }
    });

    // ============================================
    // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    // ============================================
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showLoader() {
        return `
            <div class="distributor-loader">
                <div class="spinner"></div>
                <span>Загрузка...</span>
            </div>
        `;
    }

    function showNotification(message, type) {
        type = type || 'info';

        const oldNotifications = document.querySelectorAll('.custom-notification');
        oldNotifications.forEach(function (n) { n.remove(); });

        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 30px;
                right: 30px;
                z-index: 100000;
                display: flex;
                flex-direction: column;
                gap: 12px;
                max-width: 420px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }

        var colors = {
            success: { border: '#00E5FF', bg: 'rgba(0, 229, 255, 0.08)', icon: '✓' },
            error: { border: '#ff6b6b', bg: 'rgba(255, 70, 70, 0.08)', icon: '✗' },
            warning: { border: '#ffd93d', bg: 'rgba(255, 217, 61, 0.08)', icon: '⚠' },
            info: { border: '#4dabf7', bg: 'rgba(77, 171, 247, 0.08)', icon: 'ℹ' }
        };

        var color = colors[type] || colors.info;

        var notification = document.createElement('div');
        notification.className = 'custom-notification';
        notification.style.cssText = `
            padding: 14px 20px;
            background: rgba(20, 20, 30, 0.95);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid ${color.border};
            border-radius: 12px;
            color: #fff;
            font-family: 'Segoe UI', system-ui, sans-serif;
            font-size: 14px;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
            animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            border-left: 4px solid ${color.border};
            pointer-events: auto;
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 260px;
            max-width: 400px;
            position: relative;
            overflow: hidden;
        `;

        var iconSpan = document.createElement('span');
        iconSpan.style.cssText = 'font-size: 18px; flex-shrink: 0;';
        iconSpan.textContent = color.icon;

        var textSpan = document.createElement('span');
        textSpan.style.cssText = 'flex: 1; line-height: 1.4;';
        textSpan.textContent = message;

        var closeBtn = document.createElement('button');
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: rgba(255,255,255,0.3);
            font-size: 16px;
            cursor: pointer;
            padding: 0 4px;
            flex-shrink: 0;
        `;
        closeBtn.textContent = '✕';
        closeBtn.onclick = function () {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(60px)';
            setTimeout(function () { notification.remove(); }, 300);
        };

        notification.appendChild(iconSpan);
        notification.appendChild(textSpan);
        notification.appendChild(closeBtn);
        container.appendChild(notification);

        setTimeout(function () {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(60px)';
                setTimeout(function () {
                    notification.remove();
                    if (container.children.length === 0) container.remove();
                }, 300);
            }
        }, 3000);
    }

    // ============================================
    // ПОДСВЕТКА ПОИСКА
    // ============================================
    function highlightText(text, search) {
        if (!text || !search) return escapeHtml(text || '—');
        const escaped = escapeHtml(text);
        const regex = new RegExp('(' + escapeHtml(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        return escaped.replace(regex, '<span class="highlight-match">$1</span>');
    }

    // ============================================
    // СОЗДАНИЕ HTML
    // ============================================
    function createDistributorHTML(data, applications) {
        console.log('[Distributor] createDistributorHTML called');

        if (!data) {
            return `
            <div class="distributor-error">
                <span style="font-size: 40px;">⚠</span>
                <p>Не удалось загрузить данные</p>
                <button onclick="window.distributorLoad()" class="distributor-retry-btn">Повторить</button>
            </div>
        `;
        }

        var distributors = data.data || [];
        var totalDistributors = distributors.length;

        var search = currentSearch || '';
        var filteredDistributors = distributors;
        if (search) {
            filteredDistributors = distributors.filter(function (d) {
                var text = (d.company_name || '') + ' ' + (d.president || '') + ' ' + (d.phone || '') + ' ' + (d.email || '') + ' ' + (d.paypal_email || '');
                return text.toLowerCase().includes(search);
            });
        }

        // ============================================
        // ВКЛАДКИ
        // ============================================
        var appsData = applications && applications.data ? applications.data : [];
        var totalApps = appsData.length;

        var pendingApps = appsData.filter(function (a) { return a.status === 'pending'; });
        var approvedApps = appsData.filter(function (a) { return a.status === 'approved'; });
        var rejectedApps = appsData.filter(function (a) { return a.status === 'rejected'; });

        var filteredApps = appsData;
        if (applicationFilter === 'pending') {
            filteredApps = pendingApps;
        } else if (applicationFilter === 'approved') {
            filteredApps = approvedApps;
        } else if (applicationFilter === 'rejected') {
            filteredApps = rejectedApps;
        }

        var tabsHTML = `
        <div class="distributor-tabs">
            <button class="distributor-tab ${activeTab === 'distributors' ? 'active' : ''}" 
                    onclick="window.switchDistributorTab('distributors')">
                Дистрибьюторы (${filteredDistributors.length})
            </button>
            <button class="distributor-tab ${activeTab === 'applications' ? 'active' : ''}" 
                    onclick="window.switchDistributorTab('applications')">
                Заявки (${totalApps})
            </button>
        </div>
    `;

        // ============================================
        // КОНТРОЛЫ
        // ============================================
        var controlsHTML = `
        <div class="distributor-controls-row">
            <div class="search-container">
                <span class="search-icon">🔍</span>
                <input type="text" 
                       id="distributorSearch"
                       class="distributor-search-input" 
                       placeholder="Поиск дистрибьютора..."
                       value="${escapeHtml(search)}"
                       oninput="window.filterDistributors()">
            </div>
            <div class="distributor-count">
                ${filteredDistributors.length} из ${totalDistributors}
            </div>
        </div>
    `;

        // ============================================
        // СПИСОК ДИСТРИБЬЮТОРОВ
        // ============================================
        var allDistributorsHTML = '';
        if (filteredDistributors.length > 0) {
            allDistributorsHTML = `
            <div class="distributor-list-grid">
                ${filteredDistributors.map(function (d) {
                var isExpanded = expandedDistributorId === d.id;
                var details = d._details || distributorDetailsCache[d.id] || null;

                var expandContent = '';
                if (isExpanded) {
                    if (details && !details.error) {
                        // ==========================================
                        // ДЕТАЛЬНАЯ ИНФОРМАЦИЯ (под краткой)
                        // ==========================================
                        var detailInfoHTML = `
                        <div class="distributor-detail-section">
                            <div class="detail-row">
                                <span class="detail-label">Название</span>
                                <span class="detail-value">${highlightText(details.company_name || '', search)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Президент</span>
                                <span class="detail-value">${highlightText(details.president || '', search)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Телефон</span>
                                <span class="detail-value">${highlightText(details.phone || '', search)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Email</span>
                                <span class="detail-value">${highlightText(details.email || '', search)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Адрес</span>
                                <span class="detail-value">${highlightText(details.address || '', search)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Сайт</span>
                                <span class="detail-value">${highlightText(details.website || '', search)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Форма собственности</span>
                                <span class="detail-value">${highlightText(details.ownership_form || '', search)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">PayPal Email</span>
                                <span class="detail-value" style="color: #00E5FF;">${highlightText(details.paypal_email || '—', search)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Всего клиентов</span>
                                <span class="detail-value">${details.total_clients || 0}</span>
                            </div>
                        </div>
                    `;

                        // ==========================================
                        // ЗАКРЕПЛЕННЫЕ КОМПАНИИ
                        // ==========================================
                        var companiesHTML = '';
                        if (details.linked_companies && details.linked_companies.length > 0) {
                            companiesHTML = `
                            <div class="distributor-companies">
                                <div class="companies-title">Закрепленные компании (${details.linked_companies.length})</div>
                                ${details.linked_companies.map(function (comp) {
                                var isCompanyExpanded = expandedCompanyId === comp.id;
                                var companyRequisites = window._companyRequisites || null;

                                var companyRequisitesHTML = '';
                                if (isCompanyExpanded && companyRequisites) {
                                    var reqFields = [
                                        { label: 'Название', key: 'name' },
                                        { label: 'БИН/ИИН', key: 'bin' },
                                        { label: 'Телефон', key: 'phone' },
                                        { label: 'Адрес', key: 'address' },
                                        { label: 'Сайт', key: 'website' },
                                        { label: 'Слоган', key: 'slogan' },
                                        { label: 'Президент', key: 'president' },
                                        { label: 'Email компании', key: 'company_email' }
                                    ];

                                    companyRequisitesHTML = `
                                            <div class="company-requisites">
                                                ${reqFields.map(function (f) {
                                        var val = companyRequisites[f.key] || '';
                                        if (!val) return '';
                                        return `
                                                        <div class="req-row">
                                                            <span class="req-label">${f.label}</span>
                                                            <span class="req-value">${escapeHtml(val)}</span>
                                                        </div>
                                                    `;
                                    }).join('')}
                                            </div>
                                        `;
                                }

                                return `
                                        <div class="company-item ${isCompanyExpanded ? 'expanded' : ''}" 
                                             onclick="event.stopPropagation(); window.toggleCompanyExpand(${comp.id})">
                                            <div class="company-item-header">
                                                <span class="company-name"> ${escapeHtml(comp.name)}</span>
                                                <span class="company-expand-icon">${isCompanyExpanded ? '▼' : '▶'}</span>
                                            </div>
                                            ${isCompanyExpanded ? companyRequisitesHTML : ''}
                                        </div>
                                    `;
                            }).join('')}
                            </div>
                        `;
                        } else {
                            companiesHTML = `
                            <div class="distributor-companies">
                                <div class="companies-title">Закрепленные компании: 0</div>
                                <div class="no-companies">Нет закрепленных компаний</div>
                            </div>
                        `;
                        }

                        expandContent = `
                        <div class="distributor-expand-content">
                            ${detailInfoHTML}
                            ${companiesHTML}
                        </div>
                    `;
                    } else if (details && details.error) {
                        expandContent = `
                        <div class="distributor-expand-content">
                            <div class="error-loading">Ошибка загрузки данных</div>
                        </div>
                    `;
                    } else {
                        expandContent = `
                        <div class="distributor-expand-content">
                            <div class="loading-details">Загрузка данных...</div>
                        </div>
                    `;
                    }
                }

                // ==========================================
                // КРАТКАЯ ИНФОРМАЦИЯ (всегда видна)
                // ==========================================
                var shortInfoHTML = `
                <div class="distributor-card-short">
                    <div class="short-row">
                        <span class="short-label">Название</span>
                        <span class="short-value">${highlightText(d.company_name || '—', search)}</span>
                    </div>
                    <div class="short-row">
                        <span class="short-label">Президент</span>
                        <span class="short-value">${highlightText(d.president || '—', search)}</span>
                    </div>
                    <div class="short-row">
                        <span class="short-label">Телефон</span>
                        <span class="short-value">${highlightText(d.phone || '—', search)}</span>
                    </div>
                    <div class="short-row">
                        <span class="short-label">Email</span>
                        <span class="short-value">${highlightText(d.email || '—', search)}</span>
                    </div>
                    <div class="short-row">
                        <span class="short-label">Клиентов</span>
                        <span class="short-value">${d.total_clients || 0}</span>
                    </div>
                </div>
            `;

                return `
                <div class="distributor-card ${isExpanded ? 'expanded' : ''}" data-id="${d.id}" onclick="window.toggleDistributorExpand(${d.id})">
                    <div class="distributor-card-main">
                        ${shortInfoHTML}
                        <div class="distributor-expand-icon">${isExpanded ? '▲' : '▼'}</div>
                    </div>
                    ${expandContent}
                </div>
            `;
            }).join('')}
            </div>
        `;
        } else {
            var emptyMessage = 'Нет дистрибьюторов';
            if (search) {
                emptyMessage = 'Ничего не найдено по запросу "' + search + '"';
            }
            allDistributorsHTML = `
            <div class="distributor-empty-state">
                <span class="empty-icon">📦</span>
                <p>${emptyMessage}</p>
                ${search ? '<p class="hint">Попробуйте изменить запрос</p>' : ''}
            </div>
        `;
        }

        // ============================================
        // ЗАЯВКИ
        // ============================================
        var applicationsHTML = '';

        var filterButtonsHTML = `
        <div class="application-filters">
            <button class="filter-btn ${applicationFilter === 'all' ? 'active' : ''}" 
                    onclick="window.filterApplications('all')">
                Все (${totalApps})
            </button>
            <button class="filter-btn pending ${applicationFilter === 'pending' ? 'active' : ''}" 
                    onclick="window.filterApplications('pending')">
                Ожидают (${pendingApps.length})
            </button>
            <button class="filter-btn approved ${applicationFilter === 'approved' ? 'active' : ''}" 
                    onclick="window.filterApplications('approved')">
                Одобрены (${approvedApps.length})
            </button>
            <button class="filter-btn rejected ${applicationFilter === 'rejected' ? 'active' : ''}" 
                    onclick="window.filterApplications('rejected')">
                Отклонены (${rejectedApps.length})
            </button>
        </div>
    `;

        if (filteredApps && filteredApps.length > 0) {
            applicationsHTML = `
            ${filterButtonsHTML}
            <div class="applications-list">
                ${filteredApps.map(function (app) {
                var statusClass = app.status;
                var statusLabel = app.status === 'pending' ? 'Ожидает' :
                    app.status === 'approved' ? 'Одобрена' : 'Отклонена';

                var actionsHTML = '';
                if (app.status === 'pending') {
                    actionsHTML = `
                    <div class="application-actions">
                        <button class="app-btn approve" onclick="window.approveApplication(${app.id})">
                            Одобрить
                        </button>
                        <button class="app-btn reject" onclick="window.rejectApplication(${app.id})">
                            Отклонить
                        </button>
                    </div>
                `;
                } else if (app.status === 'approved') {
                    actionsHTML = `
                    <div class="application-actions">
                        <span class="app-info">👥 Привязано клиентов: ${app.linked_count || 0}</span>
                        <button class="app-btn revoke" onclick="window.revokeApproval(${app.id})">
                            Отозвать одобрение
                        </button>
                    </div>
                `;
                } else if (app.status === 'rejected') {
                    actionsHTML = `
                    <div class="application-actions">
                        <span class="app-info">Заявка отклонена</span>
                        <button class="app-btn approve" onclick="window.approveApplication(${app.id})">
                            Одобрить повторно
                        </button>
                    </div>
                `;
                }

                return `
                        <div class="application-card ${statusClass}">
                            <div class="application-header">
                                <div class="application-company"> ${escapeHtml(app.company_name)}</div>
                                <span class="application-status ${statusClass}">${statusLabel}</span>
                            </div>
                            <div class="application-details">
                                <span>👤 ${escapeHtml(app.president)}</span>
                                <span>📞 ${escapeHtml(app.phone)}</span>
                                <span>✉️ ${escapeHtml(app.email)}</span>
                                <span>📋 БИН: ${escapeHtml(app.bin)}</span>
                                <span>💳 PayPal: ${escapeHtml(app.paypal_email || '—')}</span>
                                ${app.website ? '<span>🌐 ' + escapeHtml(app.website) + '</span>' : ''}
                                ${app.address ? '<span>📍 ' + escapeHtml(app.address) + '</span>' : ''}
                                ${app.notes ? '<span>📝 ' + escapeHtml(app.notes) + '</span>' : ''}
                                ${app.review_comment ? '<span class="review-comment">💬 ' + escapeHtml(app.review_comment) + '</span>' : ''}
                                <span class="app-date">📅 ${new Date(app.created_ts_ms).toLocaleDateString()}</span>
                            </div>
                            ${actionsHTML}
                        </div>
                    `;
            }).join('')}
            </div>
        `;
        } else {
            var emptyMessage = 'Нет заявок';
            if (applicationFilter === 'pending') emptyMessage = 'Нет заявок в ожидании';
            else if (applicationFilter === 'approved') emptyMessage = 'Нет одобренных заявок';
            else if (applicationFilter === 'rejected') emptyMessage = 'Нет отклоненных заявок';

            applicationsHTML = `
            ${filterButtonsHTML}
            <div class="distributor-empty-state">
                <span class="empty-icon"></span>
                <p>${emptyMessage}</p>
            </div>
        `;
        }

        // ============================================
        // СТАТИСТИКА - УДАЛЕНА
        // ============================================
        var statsHTML = '';

        // Контент в зависимости от вкладки
        var contentHTML = '';
        if (activeTab === 'distributors') {
            contentHTML = `
            <div class="distributor-section">
                <h3 class="distributor-section-title">Все дистрибьюторы (${filteredDistributors.length})</h3>
                ${controlsHTML}
                ${allDistributorsHTML}
            </div>
        `;
        } else {
            contentHTML = `
            <div class="distributor-section">
                <h3 class="distributor-section-title">Заявки на дистрибьюторов</h3>
                ${applicationsHTML}
            </div>
        `;
        }

        return `
        <div class="distributor-container" id="distributorApp">
            <div class="distributor-header">
                <h2 class="distributor-title">
                    <span class="title-icon"></span>
                    Дистрибьюторы
                </h2>
                <button class="distributor-close-btn" onclick="window.closeDistributor()">✕</button>
            </div>

            <div class="distributor-content">
                ${tabsHTML}
                ${contentHTML}
                <div style="height: 80px; width: 100%; flex-shrink: 0;"></div>
            </div>
        </div>
    `;
    }

    // ============================================
    // ЗАГРУЗКА ДАННЫХ (исправленная)
    // ============================================
    window.distributorLoad = async function (callback) {
        if (isLoading) return;
        isLoading = true;

        var rightContent = document.getElementById('rightContent');
        if (!rightContent) {
            console.error('[Distributor] #rightContent not found');
            isLoading = false;
            if (callback) callback();
            return;
        }

        rightContent.innerHTML = '<div class="distributor-container">' + showLoader() + '</div>';

        var data = await fetchDistributors();
        var applications = await fetchApplications();

        if (data) {
            var html = createDistributorHTML(data, applications);
            rightContent.innerHTML = html;
        } else {
            rightContent.innerHTML = `
            <div class="distributor-container">
                <div class="distributor-error">
                    <span style="font-size: 40px;">⚠</span>
                    <p>Не удалось загрузить данные</p>
                    <button onclick="window.distributorLoad()" class="distributor-retry-btn">Повторить</button>
                </div>
            </div>
        `;
        }

        isLoading = false;
        if (callback) callback();
    };

    // ============================================
    // ОТКРЫТИЕ / ЗАКРЫТИЕ
    // ============================================
    window.openDistributor = function () {
        console.log('[Distributor] Opening distributors...');
        activeTab = 'distributors';
        applicationFilter = 'all';
        expandedDistributorId = null;
        expandedCompanyId = null;
        distributorDetailsCache = {};
        currentSearch = '';
        window.distributorLoad();
    };

    window.closeDistributor = function () {
        console.log('[Distributor] Closing distributors...');
        var rightContent = document.getElementById('rightContent');
        if (rightContent) {
            rightContent.innerHTML = '';
            // Вызываем createCompanyButtons из company-buttons.js для восстановления кнопок
            if (typeof window.createCompanyButtons === 'function') {
                console.log('[Distributor] Calling createCompanyButtons');
                window.createCompanyButtons();
            } else {
                console.warn('[Distributor] createCompanyButtons not found, loading company-buttons.js');
                // Загружаем company-buttons.js если функция не найдена
                var script = document.createElement('script');
                script.src = '/crm/company/right/buttons/company-buttons.js';
                script.onload = function () {
                    console.log('[Distributor] company-buttons.js loaded');
                    setTimeout(function () {
                        if (typeof window.createCompanyButtons === 'function') {
                            window.createCompanyButtons();
                        }
                    }, 200);
                };
                script.onerror = function () {
                    console.error('[Distributor] Failed to load company-buttons.js');
                };
                document.body.appendChild(script);
            }
        }
    };

    // ============================================
    // СТИЛИ ДЛЯ АНИМАЦИЙ
    // ============================================
    (function addStyles() {
        if (document.getElementById('distributor-notification-styles')) return;
        var style = document.createElement('style');
        style.id = 'distributor-notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                from { opacity: 0; transform: translateX(80px) scale(0.95); }
                to { opacity: 1; transform: translateX(0) scale(1); }
            }
        `;
        document.head.appendChild(style);
    })();

    console.log('Distributor module initialized');

})();