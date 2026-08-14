/**
 * Модуль списка всех компаний (только для компании ID=1)
 * Путь: /crm/company/right/List_of_companies/list_of_companies.js
 */

(function () {
    'use strict';

    let isLoading = false;
    let isLoadingMore = false;
    let companiesList = [];
    let expandedCompanyId = null;
    let companyDetailsCache = {};
    let currentSearch = '';

    // ============================================
    // ПАГИНАЦИЯ
    // ============================================
    let currentPage = 1;
    const PAGE_SIZE = 20;
    const LOAD_MORE = 10;
    let hasMore = true;
    let allCompanies = [];
    let filteredCompaniesList = [];

    // ============================================
    // ПОЛУЧЕНИЕ СПИСКА ВСЕХ КОМПАНИЙ
    // ============================================
    async function fetchAllCompanies() {
        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                console.warn('[Companies] Token not found');
                return null;
            }

            const url = API_BASE_URL + '/api/admin/companies/all';
            console.log('[Companies] Request:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('[Companies] HTTP error:', response.status);
                return null;
            }

            const data = await response.json();
            console.log('[Companies] Response:', data);

            if (data.status === 'ok') {
                allCompanies = data.data || [];
                filteredCompaniesList = [...allCompanies];
                return data;
            } else {
                console.error('[Companies] Error:', data.message);
                return null;
            }

        } catch (error) {
            console.error('[Companies] Request error:', error);
            return null;
        }
    }

    // ============================================
    // ПОЛУЧЕНИЕ ДЕТАЛЬНОЙ ИНФОРМАЦИИ О КОМПАНИИ
    // ============================================
    async function fetchCompanyDetails(companyId) {
        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                console.warn('[Companies] Token not found');
                return null;
            }

            const url = API_BASE_URL + '/api/admin/company/' + companyId + '/details';
            console.log('[Companies] Details request:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('[Companies] HTTP error:', response.status);
                return null;
            }

            const data = await response.json();
            console.log('[Companies] Details response:', data);

            if (data.status === 'ok' && data.data) {
                return data.data;
            } else {
                console.error('[Companies] Error:', data.message);
                return null;
            }

        } catch (error) {
            console.error('[Companies] Request error:', error);
            return null;
        }
    }

    // ============================================
    // РАСКРЫТЬ КОМПАНИЮ
    // ============================================
    window.toggleCompanyExpand = async function (companyId) {
        const card = document.querySelector(`.companies-card[data-id="${companyId}"]`);
        if (!card) return;

        if (expandedCompanyId === companyId) {
            expandedCompanyId = null;
            card.classList.remove('expanded');
            const content = card.querySelector('.companies-expand-content');
            if (content) content.remove();
            const icon = card.querySelector('.companies-expand-icon');
            if (icon) icon.textContent = '▼';
            return;
        }

        if (expandedCompanyId) {
            const prevCard = document.querySelector(`.companies-card[data-id="${expandedCompanyId}"]`);
            if (prevCard) {
                prevCard.classList.remove('expanded');
                const prevContent = prevCard.querySelector('.companies-expand-content');
                if (prevContent) prevContent.remove();
                const prevIcon = prevCard.querySelector('.companies-expand-icon');
                if (prevIcon) prevIcon.textContent = '▼';
            }
        }

        expandedCompanyId = companyId;
        card.classList.add('expanded');
        const icon = card.querySelector('.companies-expand-icon');
        if (icon) icon.textContent = '▲';

        let expandContent = document.createElement('div');
        expandContent.className = 'companies-expand-content';
        expandContent.innerHTML = `
            <div class="loading-details">
                <div class="spinner" style="display: inline-block; width: 20px; height: 20px; border: 2px solid rgba(0,229,255,0.1); border-top: 2px solid #00E5FF; border-radius: 50%; animation: spin 0.8s linear infinite; vertical-align: middle; margin-right: 10px;"></div>
                Загрузка данных...
            </div>
        `;
        card.appendChild(expandContent);

        let details = companyDetailsCache[companyId];
        if (!details) {
            details = await fetchCompanyDetails(companyId);
            if (details) {
                companyDetailsCache[companyId] = details;
                const company = companiesList.find(c => c.id === companyId);
                if (company) {
                    company._details = details;
                }
            } else {
                companyDetailsCache[companyId] = { error: true };
            }
        }

        if (details && !details.error) {
            let detailHTML = `
                <div class="companies-detail-section">
                    <div class="detail-row">
                        <span class="detail-label">Название</span>
                        <span class="detail-value">${escapeHtml(details.name || '')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">БИН/ИИН</span>
                        <span class="detail-value">${escapeHtml(details.bin || '—')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Президент</span>
                        <span class="detail-value">${escapeHtml(details.president || '—')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Телефон</span>
                        <span class="detail-value">${escapeHtml(details.phone || '—')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Email</span>
                        <span class="detail-value">${escapeHtml(details.email || '—')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Адрес</span>
                        <span class="detail-value">${escapeHtml(details.address || '—')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Сайт</span>
                        <span class="detail-value">${escapeHtml(details.website || '—')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Активна</span>
                        <span class="detail-value">${details.is_active ? '✅ Да' : '❌ Нет'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Пользователей</span>
                        <span class="detail-value">${details.users_count || 0}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Клиентов</span>
                        <span class="detail-value">${details.clients_count || 0}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Дата регистрации</span>
                        <span class="detail-value">${details.reg_date || '—'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Форма собственности</span>
                        <span class="detail-value">${escapeHtml(details.ownership_form || '—')}</span>
                    </div>
                </div>
            `;

            expandContent.innerHTML = detailHTML;
        } else {
            expandContent.innerHTML = `
                <div class="error-loading">Ошибка загрузки данных</div>
            `;
        }
    };

    // ============================================
    // ПОИСК
    // ============================================
    let searchTimeout = null;

    window.filterCompanies = function () {
        const searchInput = document.getElementById('companiesSearch');
        if (!searchInput) return;

        currentSearch = searchInput.value.toLowerCase().trim();

        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        searchTimeout = setTimeout(function () {
            // Фильтруем все компании
            if (currentSearch) {
                filteredCompaniesList = allCompanies.filter(function (c) {
                    var text = (c.name || '') + ' ' + (c.president || '') + ' ' + (c.phone || '') + ' ' + (c.email || '') + ' ' + (c.bin || '');
                    return text.toLowerCase().includes(currentSearch);
                });
            } else {
                filteredCompaniesList = [...allCompanies];
            }

            // Сбрасываем пагинацию
            currentPage = 1;
            companiesList = [];

            // Загружаем первую страницу
            loadCompaniesPage();

            const cursorPosition = searchInput.selectionStart;
            const wasFocused = document.activeElement === searchInput;

            renderCompanies(function () {
                if (wasFocused) {
                    const newInput = document.getElementById('companiesSearch');
                    if (newInput) {
                        newInput.focus();
                        newInput.setSelectionRange(cursorPosition, cursorPosition);
                    }
                }
            });
        }, 300);
    };

    // ============================================
    // ЗАГРУЗКА СТРАНИЦЫ КОМПАНИЙ
    // ============================================
    function loadCompaniesPage() {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        let endIndex = startIndex + PAGE_SIZE;

        // Если осталось меньше PAGE_SIZE, берем все оставшиеся
        if (endIndex > filteredCompaniesList.length) {
            endIndex = filteredCompaniesList.length;
        }

        const newItems = filteredCompaniesList.slice(startIndex, endIndex);

        if (newItems.length === 0) {
            hasMore = false;
            return;
        }

        // Добавляем новые элементы к существующему списку
        companiesList = companiesList.concat(newItems);

        // Проверяем, есть ли еще элементы
        hasMore = endIndex < filteredCompaniesList.length;

        console.log(`[Companies] Загружено: ${companiesList.length} из ${filteredCompaniesList.length}, hasMore: ${hasMore}`);
    }

    // ============================================
    // ЗАГРУЗКА ЕЩЕ КОМПАНИЙ
    // ============================================
    function loadMoreCompanies() {
        if (isLoadingMore || !hasMore) return;

        isLoadingMore = true;

        // Показываем индикатор загрузки на кнопке
        const loadBtn = document.querySelector('.load-more-btn');
        if (loadBtn) {
            loadBtn.textContent = 'Загрузка...';
            loadBtn.disabled = true;
        }

        // Увеличиваем страницу и загружаем
        currentPage++;
        loadCompaniesPage();

        // Добавляем новые карточки в конец списка
        const grid = document.querySelector('.companies-list-grid');
        if (grid) {
            // Находим индекс начала новых элементов
            const startIndex = (currentPage - 1) * PAGE_SIZE;
            const endIndex = Math.min(startIndex + PAGE_SIZE, filteredCompaniesList.length);
            const newItems = filteredCompaniesList.slice(startIndex, endIndex);

            newItems.forEach(function (c) {
                const cardHTML = createCompanyCardHTML(c, false);
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = cardHTML;
                const cardElement = tempDiv.firstElementChild;
                if (cardElement) {
                    grid.appendChild(cardElement);
                }
            });
        }

        // Обновляем счетчик
        const countElement = document.querySelector('.companies-count');
        if (countElement) {
            countElement.textContent = `${companiesList.length} из ${filteredCompaniesList.length}`;
        }

        // Обновляем кнопку
        updateLoadMoreButton();

        isLoadingMore = false;
    }

    // ============================================
    // ОБНОВЛЕНИЕ КНОПКИ "ЗАГРУЗИТЬ ЕЩЕ"
    // ============================================
    function updateLoadMoreButton() {
        let loadMoreContainer = document.querySelector('.load-more-container');
        const grid = document.querySelector('.companies-list-grid');

        if (!grid) return;

        // Удаляем старую кнопку если есть
        if (loadMoreContainer) {
            loadMoreContainer.remove();
            loadMoreContainer = null;
        }

        // Проверяем, есть ли еще элементы для загрузки
        const totalLoaded = companiesList.length;
        const totalAvailable = filteredCompaniesList.length;

        if (totalLoaded < totalAvailable) {
            loadMoreContainer = document.createElement('div');
            loadMoreContainer.className = 'load-more-container';
            loadMoreContainer.style.cssText = `
                display: flex;
                justify-content: center;
                padding: 20px 0 10px 0;
            `;

            const button = document.createElement('button');
            button.className = 'load-more-btn';
            const remaining = totalAvailable - totalLoaded;
            button.textContent = `Загрузить еще (${remaining} осталось)`;
            button.style.cssText = `
                padding: 8px 24px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 8px;
                color: rgba(255, 255, 255, 0.6);
                font-family: var(--vortex-font-family, 'Segoe UI', system-ui, sans-serif);
                font-size: 13px;
                cursor: pointer;
                transition: all 0.3s ease;
            `;
            button.onmouseenter = function () {
                this.style.background = 'rgba(255, 255, 255, 0.08)';
                this.style.color = 'rgba(255, 255, 255, 0.9)';
            };
            button.onmouseleave = function () {
                this.style.background = 'rgba(255, 255, 255, 0.05)';
                this.style.color = 'rgba(255, 255, 255, 0.6)';
            };
            button.onclick = function () {
                // Загружаем следующую порцию (10 штук)
                loadMoreByCount(LOAD_MORE);
            };

            loadMoreContainer.appendChild(button);
            grid.parentNode.insertBefore(loadMoreContainer, grid.nextSibling);
        }
    }

    // ============================================
    // ЗАГРУЗКА ПОРЦИИ КОМПАНИЙ (по 10)
    // ============================================
    function loadMoreByCount(count) {
        if (isLoadingMore) return;

        const totalLoaded = companiesList.length;
        const totalAvailable = filteredCompaniesList.length;

        if (totalLoaded >= totalAvailable) {
            hasMore = false;
            updateLoadMoreButton();
            return;
        }

        isLoadingMore = true;

        const loadBtn = document.querySelector('.load-more-btn');
        if (loadBtn) {
            loadBtn.textContent = 'Загрузка...';
            loadBtn.disabled = true;
        }

        // Определяем сколько загрузить
        let loadCount = Math.min(count, totalAvailable - totalLoaded);
        const endIndex = totalLoaded + loadCount;
        const newItems = filteredCompaniesList.slice(totalLoaded, endIndex);

        if (newItems.length === 0) {
            isLoadingMore = false;
            hasMore = false;
            updateLoadMoreButton();
            return;
        }

        // Добавляем в список
        companiesList = companiesList.concat(newItems);

        // Добавляем карточки
        const grid = document.querySelector('.companies-list-grid');
        if (grid) {
            newItems.forEach(function (c) {
                const cardHTML = createCompanyCardHTML(c, false);
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = cardHTML;
                const cardElement = tempDiv.firstElementChild;
                if (cardElement) {
                    grid.appendChild(cardElement);
                }
            });
        }

        // Обновляем счетчик
        const countElement = document.querySelector('.companies-count');
        if (countElement) {
            countElement.textContent = `${companiesList.length} из ${filteredCompaniesList.length}`;
        }

        // Проверяем, все ли загружены
        hasMore = companiesList.length < filteredCompaniesList.length;

        // Обновляем кнопку
        updateLoadMoreButton();

        isLoadingMore = false;
    }

    // ============================================
    // СОЗДАНИЕ HTML КАРТОЧКИ КОМПАНИИ
    // ============================================
    function createCompanyCardHTML(c, isExpanded) {
        var details = c._details || companyDetailsCache[c.id] || null;

        var expandContent = '';
        if (isExpanded) {
            if (details && !details.error) {
                var detailInfoHTML = `
                    <div class="companies-detail-section">
                        <div class="detail-row">
                            <span class="detail-label">Название</span>
                            <span class="detail-value">${highlightText(details.name || '', currentSearch)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">БИН/ИИН</span>
                            <span class="detail-value">${highlightText(details.bin || '—', currentSearch)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Президент</span>
                            <span class="detail-value">${highlightText(details.president || '—', currentSearch)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Телефон</span>
                            <span class="detail-value">${highlightText(details.phone || '—', currentSearch)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Email</span>
                            <span class="detail-value">${highlightText(details.email || '—', currentSearch)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Адрес</span>
                            <span class="detail-value">${highlightText(details.address || '—', currentSearch)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Сайт</span>
                            <span class="detail-value">${highlightText(details.website || '—', currentSearch)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Активна</span>
                            <span class="detail-value">${details.is_active ? '✅ Да' : '❌ Нет'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Пользователей</span>
                            <span class="detail-value">${details.users_count || 0}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Клиентов</span>
                            <span class="detail-value">${details.clients_count || 0}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Дата регистрации</span>
                            <span class="detail-value">${details.reg_date || '—'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Форма собственности</span>
                            <span class="detail-value">${highlightText(details.ownership_form || '—', currentSearch)}</span>
                        </div>
                    </div>
                `;

                expandContent = `
                    <div class="companies-expand-content">
                        ${detailInfoHTML}
                    </div>
                `;
            } else if (details && details.error) {
                expandContent = `
                    <div class="companies-expand-content">
                        <div class="error-loading">Ошибка загрузки данных</div>
                    </div>
                `;
            } else {
                expandContent = `
                    <div class="companies-expand-content">
                        <div class="loading-details">Загрузка данных...</div>
                    </div>
                `;
            }
        }

        var shortInfoHTML = `
            <div class="companies-card-short">
                <div class="short-row">
                    <span class="short-label">Название</span>
                    <span class="short-value">${highlightText(c.name || '—', currentSearch)}</span>
                </div>
                <div class="short-row">
                    <span class="short-label">Президент</span>
                    <span class="short-value">${highlightText(c.president || '—', currentSearch)}</span>
                </div>
                <div class="short-row">
                    <span class="short-label">Телефон</span>
                    <span class="short-value">${highlightText(c.phone || '—', currentSearch)}</span>
                </div>
                <div class="short-row">
                    <span class="short-label">Статус</span>
                    <span class="short-value" style="color: ${c.is_active ? '#00E5FF' : '#ff6b6b'};">${c.is_active ? 'Активна' : 'Неактивна'}</span>
                </div>
            </div>
        `;

        return `
            <div class="companies-card ${isExpanded ? 'expanded' : ''}" data-id="${c.id}" onclick="window.toggleCompanyExpand(${c.id})">
                <div class="companies-card-main">
                    ${shortInfoHTML}
                    <div class="companies-expand-icon">${isExpanded ? '▲' : '▼'}</div>
                </div>
                ${expandContent}
            </div>
        `;
    }

    // ============================================
    // ОТРИСОВКА КОМПАНИЙ
    // ============================================
    function renderCompanies(callback) {
        var rightContent = document.getElementById('rightContent');
        if (!rightContent) {
            if (callback) callback();
            return;
        }

        var totalCompanies = allCompanies.length;
        var search = currentSearch || '';

        // ============================================
        // КОНТРОЛЫ
        // ============================================
        var controlsHTML = `
            <div class="companies-controls-row">
                <div class="search-container">
                    <span class="search-icon">🔍</span>
                    <input type="text" 
                           id="companiesSearch"
                           class="companies-search-input" 
                           placeholder="Поиск компании..."
                           value="${escapeHtml(search)}"
                           oninput="window.filterCompanies()">
                </div>
                <div class="companies-count">
                    ${companiesList.length} из ${filteredCompaniesList.length}
                </div>
            </div>
        `;

        // ============================================
        // СПИСОК КОМПАНИЙ
        // ============================================
        var allCompaniesHTML = '';
        if (companiesList.length > 0) {
            allCompaniesHTML = `
                <div class="companies-list-grid">
                    ${companiesList.map(function (c) {
                var isExpanded = expandedCompanyId === c.id;
                return createCompanyCardHTML(c, isExpanded);
            }).join('')}
                </div>
            `;
        } else {
            var emptyMessage = 'Нет компаний';
            if (search) {
                emptyMessage = 'Ничего не найдено по запросу "' + search + '"';
            }
            allCompaniesHTML = `
                <div class="companies-empty-state">
                    <span class="empty-icon"></span>
                    <p>${emptyMessage}</p>
                    ${search ? '<p class="hint">Попробуйте изменить запрос</p>' : ''}
                </div>
            `;
        }

        var html = `
            <div class="companies-container" id="companiesApp">
                <div class="companies-header">
                    <h2 class="companies-title">
                        <span class="title-icon"></span>
                        Список всех компаний
                    </h2>
                    <button class="companies-close-btn" onclick="window.closeCompanies()">✕</button>
                </div>

                <div class="companies-content">
                    <div class="companies-section">
                        <h3 class="companies-section-title">Все компании (${filteredCompaniesList.length})</h3>
                        ${controlsHTML}
                        ${allCompaniesHTML}
                    </div>
                    <div style="height: 80px; width: 100%; flex-shrink: 0;"></div>
                </div>
            </div>
        `;

        rightContent.innerHTML = html;

        // Обновляем кнопку "Загрузить еще"
        setTimeout(function () {
            updateLoadMoreButton();
        }, 100);

        if (callback) callback();
    }

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
            <div class="companies-loader">
                <div class="spinner"></div>
                <span>Загрузка...</span>
            </div>
        `;
    }

    function highlightText(text, search) {
        if (!text || !search) return escapeHtml(text || '—');
        const escaped = escapeHtml(text);
        const regex = new RegExp('(' + escapeHtml(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        return escaped.replace(regex, '<span class="highlight-match">$1</span>');
    }

    // ============================================
    // ЗАГРУЗКА ДАННЫХ
    // ============================================
    window.companiesLoad = async function (callback) {
        if (isLoading) return;
        isLoading = true;

        var rightContent = document.getElementById('rightContent');
        if (!rightContent) {
            console.error('[Companies] #rightContent not found');
            isLoading = false;
            if (callback) callback();
            return;
        }

        rightContent.innerHTML = '<div class="companies-container">' + showLoader() + '</div>';

        var data = await fetchAllCompanies();

        if (data) {
            // Применяем фильтр если есть поиск
            if (currentSearch) {
                filteredCompaniesList = allCompanies.filter(function (c) {
                    var text = (c.name || '') + ' ' + (c.president || '') + ' ' + (c.phone || '') + ' ' + (c.email || '') + ' ' + (c.bin || '');
                    return text.toLowerCase().includes(currentSearch);
                });
            } else {
                filteredCompaniesList = [...allCompanies];
            }

            // Сбрасываем списки
            companiesList = [];
            currentPage = 1;

            // Загружаем первую страницу (20 штук)
            loadCompaniesPage();

            renderCompanies(callback);
        } else {
            rightContent.innerHTML = `
                <div class="companies-container">
                    <div class="companies-error">
                        <span style="font-size: 40px;">⚠</span>
                        <p>Не удалось загрузить данные</p>
                        <button onclick="window.companiesLoad()" class="companies-retry-btn">Повторить</button>
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
    window.openCompanies = function () {
        console.log('[Companies] Opening companies list...');
        expandedCompanyId = null;
        companyDetailsCache = {};
        currentSearch = '';
        currentPage = 1;
        hasMore = true;
        companiesList = [];
        window.companiesLoad();
    };

    window.closeCompanies = function () {
        console.log('[Companies] Closing companies list...');
        var rightContent = document.getElementById('rightContent');
        if (rightContent) {
            rightContent.innerHTML = '';
            if (typeof window.createCompanyButtons === 'function') {
                console.log('[Companies] Calling createCompanyButtons');
                window.createCompanyButtons();
            } else {
                console.warn('[Companies] createCompanyButtons not found, loading company-buttons.js');
                var script = document.createElement('script');
                script.src = '/crm/company/right/buttons/company-buttons.js';
                script.onload = function () {
                    console.log('[Companies] company-buttons.js loaded');
                    setTimeout(function () {
                        if (typeof window.createCompanyButtons === 'function') {
                            window.createCompanyButtons();
                        }
                    }, 200);
                };
                script.onerror = function () {
                    console.error('[Companies] Failed to load company-buttons.js');
                };
                document.body.appendChild(script);
            }
        }
    };

    // ============================================
    // СТИЛИ ДЛЯ АНИМАЦИЙ
    // ============================================
    (function addStyles() {
        if (document.getElementById('companies-notification-styles')) return;
        var style = document.createElement('style');
        style.id = 'companies-notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                from { opacity: 0; transform: translateX(80px) scale(0.95); }
                to { opacity: 1; transform: translateX(0) scale(1); }
            }
        `;
        document.head.appendChild(style);
    })();

    console.log('Companies list module initialized');

})();