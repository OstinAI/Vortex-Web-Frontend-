/**
* Модуль Контрагенты
* Путь: /crm/company/right/counterparty/counterparty.js
*/

(function () {
    'use strict';

    // ============================================
    // СОСТОЯНИЕ
    // ============================================
    let counterparties = [];
    let filteredCounterparties = [];
    let isLoading = false;
    let editId = null;
    let customFieldCounter = 0;
    let paymentFieldCounter = 0;

    // ============================================
    // ЗАГРУЗКА ДАННЫХ
    // ============================================
    async function loadCounterparties() {
        if (isLoading) return;
        isLoading = true;

        const listEl = document.getElementById('counterpartyList');
        if (listEl) {
            listEl.innerHTML = `
                <div class="counterparty-loader">
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

            const response = await fetch(API_BASE_URL + '/api/company/counterparty/list', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            console.log('[Counterparty] 📦 Ответ:', data);

            if (data.status === 'ok') {
                counterparties = data.data || [];
                filteredCounterparties = [...counterparties];
                renderCounterparties();
                // ★ ВСТАВИТЬ СЮДА ★
                updateFilterTypesFromData();
            } else {
                showNotification('Ошибка: ' + (data.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('[Counterparty] ❌ Ошибка:', error);
            showNotification('Ошибка загрузки: ' + error.message, 'error');
        }

        isLoading = false;
    }

    // ============================================
    // ЗАГРУЗКА ТИПОВ ДЛЯ ФИЛЬТРА (КАСТОМНЫЙ SELECT)
    // ============================================
    async function loadTypeFilterOptions() {
        const optionsContainer = document.getElementById('typeFilterOptions');
        const selectedSpan = document.getElementById('typeFilterSelected');
        if (!optionsContainer || !selectedSpan) return;

        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) return;

            const response = await fetch(API_BASE_URL + '/api/company/counterparty/types', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });
            const result = await response.json();

            // Сохраняем текущее выбранное значение
            const currentSelected = optionsContainer.querySelector('li.selected');
            const currentValue = currentSelected ? currentSelected.dataset.value : 'all';

            // Оставляем только первый пункт "Все типы"
            while (optionsContainer.children.length > 1) {
                optionsContainer.removeChild(optionsContainer.lastChild);
            }

            if (result.status === 'ok' && result.data && result.data.length > 0) {
                result.data.forEach(type => {
                    if (type.value === 'other') return;
                    const li = document.createElement('li');
                    li.dataset.value = type.value;
                    li.textContent = type.label;
                    optionsContainer.appendChild(li);
                });
            } else {
                // Запасные типы
                const defaultTypes = [
                    { value: 'supplier', label: 'Поставщик' },
                    { value: 'partner', label: 'Партнер' },
                    { value: 'distributor', label: 'Дистрибьютор' }
                ];
                defaultTypes.forEach(type => {
                    const li = document.createElement('li');
                    li.dataset.value = type.value;
                    li.textContent = type.label;
                    optionsContainer.appendChild(li);
                });
            }

            // Добавляем кастомные типы из существующих контрагентов
            const customTypes = new Set();
            counterparties.forEach(cp => {
                if (cp.type && cp.type !== 'all' &&
                    cp.type !== 'supplier' && cp.type !== 'partner' &&
                    cp.type !== 'distributor' && cp.type !== 'other') {
                    customTypes.add(cp.type);
                }
            });

            customTypes.forEach(typeValue => {
                // Проверяем, нет ли уже такого типа в списке
                const exists = Array.from(optionsContainer.querySelectorAll('li')).some(li => li.dataset.value === typeValue);
                if (!exists) {
                    const li = document.createElement('li');
                    li.dataset.value = typeValue;
                    li.textContent = typeValue;
                    optionsContainer.appendChild(li);
                }
            });

            // Восстанавливаем выбранное значение
            const newSelected = optionsContainer.querySelector(`li[data-value="${currentValue}"]`);
            if (newSelected) {
                optionsContainer.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
                newSelected.classList.add('selected');
                selectedSpan.textContent = newSelected.textContent;
            } else {
                const allItem = optionsContainer.querySelector('li[data-value="all"]');
                if (allItem) {
                    optionsContainer.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
                    allItem.classList.add('selected');
                    selectedSpan.textContent = allItem.textContent;
                }
            }
        } catch (error) {
            console.error('[Counterparty] Ошибка загрузки типов для фильтра:', error);
        }
    }

    // ============================================
    // Добавляет в фильтр все уникальные типы, которые есть в данных контрагентов,
    // ============================================
    function updateFilterTypesFromData() {
        const optionsContainer = document.getElementById('typeFilterOptions');
        const selectedSpan = document.getElementById('typeFilterSelected');
        if (!optionsContainer || !selectedSpan) return;

        // Сохраняем текущее выбранное значение
        const currentSelected = optionsContainer.querySelector('li.selected');
        const currentValue = currentSelected ? currentSelected.dataset.value : 'all';

        // Собираем все уникальные типы из загруженных контрагентов
        const typesFromData = new Set();
        counterparties.forEach(cp => {
            if (cp.type && cp.type !== 'all' &&
                cp.type !== 'supplier' && cp.type !== 'partner' &&
                cp.type !== 'distributor' && cp.type !== 'other') {
                typesFromData.add(cp.type);
            }
        });

        // Смотрим, какие уже есть в списке
        const existingValues = new Set();
        optionsContainer.querySelectorAll('li').forEach(li => {
            existingValues.add(li.dataset.value);
        });

        // Добавляем недостающие
        typesFromData.forEach(typeValue => {
            if (!existingValues.has(typeValue)) {
                const li = document.createElement('li');
                li.dataset.value = typeValue;
                li.textContent = typeValue; // отображаем как есть
                optionsContainer.appendChild(li);
            }
        });

        // Восстанавливаем выбранное значение
        const newSelected = optionsContainer.querySelector(`li[data-value="${currentValue}"]`);
        if (newSelected) {
            optionsContainer.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
            newSelected.classList.add('selected');
            selectedSpan.textContent = newSelected.textContent;
        } else {
            // Если такого больше нет – выбираем "Все типы"
            const allItem = optionsContainer.querySelector('li[data-value="all"]');
            if (allItem) {
                optionsContainer.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
                allItem.classList.add('selected');
                selectedSpan.textContent = allItem.textContent;
            }
        }
    }

    // ============================================
    // ИНИЦИАЛИЗАЦИЯ КАСТОМНОГО SELECT
    // ============================================
    function initCustomSelect() {
        const wrapper = document.getElementById('typeFilterWrapper');
        const trigger = document.getElementById('typeFilterTrigger');
        const optionsContainer = document.getElementById('typeFilterOptions');
        const selectedSpan = document.getElementById('typeFilterSelected');

        if (!wrapper || !trigger || !optionsContainer || !selectedSpan) return;

        // Открыть/закрыть по клику на триггер
        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            wrapper.classList.toggle('open');
        });

        // Закрыть по клику вне селекта
        document.addEventListener('click', function () {
            wrapper.classList.remove('open');
        });

        // Выбор пункта
        optionsContainer.addEventListener('click', function (e) {
            const li = e.target.closest('li');
            if (!li) return;
            const value = li.dataset.value;
            const text = li.textContent;

            // Обновить отображаемое значение
            selectedSpan.textContent = text;

            // Убрать выделение со всех, выделить текущий
            optionsContainer.querySelectorAll('li').forEach(item => item.classList.remove('selected'));
            li.classList.add('selected');

            // Закрыть список
            wrapper.classList.remove('open');

            // Применить фильтр
            window.filterCounterparties();
        });
    }

    // ============================================
    // ОТОБРАЖЕНИЕ СПИСКА (без изменений)
    // ============================================
    function renderCounterparties() {
        const listEl = document.getElementById('counterpartyList');
        if (!listEl) return;

        if (filteredCounterparties.length === 0) {
            const search = document.getElementById('counterpartySearch')?.value?.toLowerCase()?.trim() || '';
            const total = counterparties.length;
            let message = 'Нет контрагентов';
            if (total > 0 && search) {
                message = `Ничего не найдено по запросу "${search}"`;
            } else if (total === 0) {
                message = 'Нет контрагентов';
            }
            listEl.innerHTML = `
            <div class="counterparty-empty">
                <span class="empty-icon"></span>
                <p>${message}</p>
                ${total > 0 ? `<p style="font-size: 12px; color: rgba(255,255,255,0.15);">Всего контрагентов: ${total}</p>` : ''}
            </div>
        `;
            return;
        }

        let html = '';
        const search = document.getElementById('counterpartySearch')?.value?.toLowerCase()?.trim() || '';

        // Получаем выбранный тип из кастомного селекта
        const selectedOption = document.querySelector('#typeFilterOptions li.selected');
        const typeFilter = selectedOption ? selectedOption.dataset.value : 'all';

        let filterInfo = '';
        if (typeFilter !== 'all') {
            const typeLabel = selectedOption ? selectedOption.textContent : typeFilter;
            filterInfo = `, тип: ${typeLabel}`;
        }

        if ((search || typeFilter !== 'all') && counterparties.length > 0) {
            html += `
    <div style="padding: 4px 8px 8px 8px; font-size: 12px; color: rgba(255,255,255,0.3);">
        Найдено: ${filteredCounterparties.length} из ${counterparties.length}${filterInfo}
    </div>
`;
        }

        filteredCounterparties.forEach((cp, index) => {
            const typeMap = {
                'supplier': 'Поставщик',
                'partner': 'Партнер',
                'distributor': 'Дистрибьютор',
                'other': 'Свой'
            };
            const typeLabel = typeMap[cp.type] || cp.type || 'Свой';
            const typeClass = cp.type || 'other';

            const highlightText = (text, searchStr) => {
                if (!text || !searchStr) return escapeHtml(text || '—');
                const escaped = escapeHtml(text);
                const regex = new RegExp(`(${escapeHtml(searchStr).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                return escaped.replace(regex, '<span style="background: rgba(0,229,255,0.15); color: #00E5FF; padding: 0 2px; border-radius: 2px;">$1</span>');
            };

            const getShortLabel = (key) => {
                const cleanKey = key.replace(/_\d+$/, '');
                const labels = {
                    'payment_holder': 'Владелец',
                    'payment_bank': 'Банк',
                    'payment_bik': 'БИК',
                    'payment_account': 'Счет',
                    'payment_kbe': 'КБЕ',
                    'payment_kno': 'КНО',
                    'payment_link': 'Ссылка',
                    'payment_currency': 'Валюта',
                    'payment_qr': 'QR код'
                };
                return labels[cleanKey] || cleanKey.replace('payment_', '');
            };

            let paymentHTML = '';
            const paymentFields = cp.payment_fields || [];
            if (paymentFields.length > 0) {
                const grouped = groupPaymentFields(paymentFields);
                paymentHTML = `
                <div class="counterparty-payment-section">
                    <div class="section-title">Платежные реквизиты</div>
                    ${grouped.map(g => `
                        <div style="margin-bottom: 8px; padding: 8px 12px; background: rgba(255,255,255,0.02); border-radius: 6px; border: 1px solid rgba(255,255,255,0.04);">
                            <div style="font-size: 11px; font-weight: 500; color: rgba(0,229,255,0.7); margin-bottom: 4px;">${highlightText(g.title || 'Счет', search)}</div>
                            <div class="counterparty-payment-grid">
                                ${g.fields.map(f => `
                                    <div class="payment-item">
                                        <span class="payment-label">${getShortLabel(f.key)}</span>
                                        <span class="payment-value">${highlightText(f.value || '—', search)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            }

            let customHTML = '';
            const customFields = cp.custom_fields || [];
            if (customFields.length > 0) {
                customHTML = `
                <div class="counterparty-custom-section">
                    <div class="section-title">Дополнительные поля</div>
                    <div class="counterparty-custom-grid">
                        ${customFields.map(f => `
                            <div class="custom-item">
                                <span class="custom-label">${highlightText(f.key, search)}</span>
                                <span class="custom-value">${highlightText(f.value || '—', search)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            }

            html += `
            <div class="counterparty-card" data-id="${cp.id}" onclick="window.toggleCounterparty(${cp.id})">
                <div class="counterparty-card-header">
                    <div class="field">
                        <span class="field-label">Президент</span>
                        <span class="field-value">${highlightText(cp.president || '—', search)}</span>
                    </div>
                    <div class="field">
                        <span class="field-label">Организация</span>
                        <span class="field-value">${highlightText(cp.organization || '—', search)}</span>
                    </div>
                    <div class="field">
                        <span class="field-label">Телефон</span>
                        <span class="field-value">${highlightText(cp.phone || '—', search)}</span>
                    </div>
                    <div class="field">
                        <span class="field-label">Почта</span>
                        <span class="field-value">${highlightText(cp.email || '—', search)}</span>
                    </div>
                    <div class="field">
                        <span class="field-label">Тип</span>
                        <span class="field-value type-badge ${typeClass}">${highlightText(typeLabel, search)}</span>
                    </div>
                    <div class="counterparty-expand-icon">▼</div>
                </div>
                <div class="counterparty-card-body">
                    <div class="counterparty-card-body-inner">
                        <div class="counterparty-details">
                            <div class="detail-item">
                                <span class="detail-label">БИН/ИИН</span>
                                <span class="detail-value">${highlightText(cp.bin || '—', search)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Адрес</span>
                                <span class="detail-value">${highlightText(cp.address || '—', search)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Веб-сайт</span>
                                <span class="detail-value">${cp.website ? `<a href="${escapeHtml(cp.website)}" target="_blank">${highlightText(cp.website, search)}</a>` : '—'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Заметки</span>
                                <span class="detail-value">${highlightText(cp.notes || '—', search)}</span>
                            </div>
                        </div>
                        ${paymentHTML}
                        ${customHTML}
                        <div class="counterparty-actions-row">
                            <button class="counterparty-action-btn edit" onclick="event.stopPropagation(); window.openCounterpartyForm(${cp.id})">Редактировать</button>
                            <button class="counterparty-action-btn delete" onclick="event.stopPropagation(); window.deleteCounterparty(${cp.id})">Удалить</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        });

        listEl.innerHTML = html;
    }

    // ============================================
    // ГРУППИРОВКА ПЛАТЕЖНЫХ ПОЛЕЙ
    // ============================================
    function groupPaymentFields(fields) {
        const groups = {};
        const paymentKeys = ['holder', 'bank', 'bik', 'account', 'kbe', 'kno', 'link', 'currency', 'qr'];

        fields.forEach(f => {
            const key = f.key;
            let groupId = '0';
            let fieldType = '';

            const match = key.match(/^payment_(\w+)_(\d+)$/);
            if (match) {
                fieldType = match[1];
                groupId = match[2];
            } else {
                const simpleMatch = key.match(/^payment_(\w+)$/);
                if (simpleMatch) {
                    fieldType = simpleMatch[1];
                    groupId = '0';
                } else {
                    return;
                }
            }

            if (!groups[groupId]) {
                groups[groupId] = { fields: [], title: '' };
            }

            if (fieldType === 'holder' && f.value) {
                groups[groupId].title = f.value;
            }

            groups[groupId].fields.push(f);
        });

        const sorted = Object.keys(groups).sort((a, b) => parseInt(a) - parseInt(b));
        return sorted.map(id => ({
            id: id,
            title: groups[id].title || `Счет #${parseInt(id) + 1}`,
            fields: groups[id].fields
        }));
    }

    // ============================================
    // ПОЛУЧИТЬ ЛЕЙБЛ ДЛЯ ПЛАТЕЖНОГО ПОЛЯ
    // ============================================
    function getPaymentLabel(key) {
        const cleanKey = key.replace(/_\d+$/, '');
        const labels = {
            'payment_holder': { en: 'Holder', ru: 'Владелец' },
            'payment_bank': { en: 'Bank', ru: 'Банк' },
            'payment_bik': { en: 'BIK', ru: 'БИК' },
            'payment_account': { en: 'Account', ru: 'Счет' },
            'payment_kbe': { en: 'KBE', ru: 'КБЕ' },
            'payment_kno': { en: 'KNO', ru: 'КНО' },
            'payment_link': { en: 'Link', ru: 'Ссылка' },
            'payment_currency': { en: 'Currency', ru: 'Валюта' },
            'payment_qr': { en: 'QR Code', ru: 'QR код' }
        };
        const label = labels[cleanKey];
        if (label) return `${label.en} (${label.ru})`;
        return cleanKey.replace('payment_', '');
    }

    // ============================================
    // ПОИСК И ФИЛЬТР (изменена только строка чтения типа)
    // ============================================
    window.filterCounterparties = function () {
        const search = document.getElementById('counterpartySearch')?.value?.toLowerCase()?.trim() || '';

        // ★★★ ИЗМЕНЕНИЕ: читаем выбранное значение из кастомного селекта ★★★
        const selectedOption = document.querySelector('#typeFilterOptions li.selected');
        const typeFilter = selectedOption ? selectedOption.dataset.value : 'all';

        if (!search && typeFilter === 'all') {
            filteredCounterparties = [...counterparties];
        } else {
            filteredCounterparties = counterparties.filter(cp => {
                if (typeFilter !== 'all' && cp.type !== typeFilter) {
                    return false;
                }
                if (!search) return true;

                const searchInObject = (obj, searchStr) => {
                    if (!obj) return false;
                    if (typeof obj === 'string') return obj.toLowerCase().includes(searchStr);
                    if (typeof obj === 'number') return String(obj).toLowerCase().includes(searchStr);
                    if (Array.isArray(obj)) return obj.some(item => searchInObject(item, searchStr));
                    if (typeof obj === 'object' && obj !== null) {
                        for (const key in obj) {
                            if (key === 'id' || key === 'created_ts_ms' || key === 'updated_ts_ms' || key === 'is_active') continue;
                            if (searchInObject(obj[key], searchStr)) return true;
                        }
                    }
                    return false;
                };
                return searchInObject(cp, search);
            });
        }
        renderCounterparties();
    };

    // ============================================
    // РАСКРЫТИЕ/СВЕРТЫВАНИЕ
    // ============================================
    window.toggleCounterparty = function (id) {
        const currentCard = document.querySelector(`.counterparty-card[data-id="${id}"]`);
        if (!currentCard) return;
        if (currentCard.classList.contains('expanded')) {
            currentCard.classList.remove('expanded');
            return;
        }
        const allExpanded = document.querySelectorAll('.counterparty-card.expanded');
        allExpanded.forEach(card => card.classList.remove('expanded'));
        currentCard.classList.add('expanded');
    };

    // ============================================
    // ОТКРЫТЬ ФОРМУ (без изменений)
    // ============================================
    window.openCounterpartyForm = async function (id = null) {
        editId = id;
        const modal = document.createElement('div');
        modal.className = 'counterparty-modal-overlay';
        modal.id = 'counterpartyModal';
        modal.onclick = function (e) {
            if (e.target === this) window.closeCounterpartyForm();
        };

        let title = 'Добавить контрагента';
        let data = {
            president: '',
            organization: '',
            phone: '',
            email: '',
            type: 'other',
            bin: '',
            address: '',
            website: '',
            notes: '',
            custom_fields: [],
            payment_fields: []
        };

        if (id) {
            title = 'Редактировать контрагента';
            try {
                const token = localStorage.getItem('vortex_token');
                const response = await fetch(API_BASE_URL + '/api/company/counterparty/' + id, {
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    }
                });
                const result = await response.json();
                if (result.status === 'ok') {
                    data = result.data;
                    console.log('[Counterparty] Данные для редактирования:', data);
                }
            } catch (error) {
                console.error('[Counterparty] Ошибка загрузки данных:', error);
                showNotification('Ошибка загрузки данных', 'error');
                return;
            }
        }

        let types = [];
        try {
            const token = localStorage.getItem('vortex_token');
            const response = await fetch(API_BASE_URL + '/api/company/counterparty/types', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });
            const result = await response.json();
            if (result.status === 'ok') {
                types = result.data;
            }
        } catch (error) {
            console.error('[Counterparty] Ошибка загрузки типов:', error);
            types = [
                { value: 'supplier', label: 'Поставщик' },
                { value: 'partner', label: 'Партнер' },
                { value: 'distributor', label: 'Дистрибьютор' }
            ];
        }

        // ★★★ ДОБАВЛЯЕМ КАСТОМНЫЕ ТИПЫ ИЗ ДАННЫХ ★★★
        // Добавляем все уникальные типы из контрагентов
        const customTypes = new Set();
        counterparties.forEach(cp => {
            if (cp.type && cp.type !== 'all' &&
                cp.type !== 'supplier' && cp.type !== 'partner' &&
                cp.type !== 'distributor' && cp.type !== 'other') {
                customTypes.add(cp.type);
            }
        });

        customTypes.forEach(typeValue => {
            if (!types.some(t => t.value === typeValue)) {
                types.push({ value: typeValue, label: typeValue });
            }
        });

        const isCustomType = data.type && !types.some(t => t.value === data.type);
        const customTypeValue = isCustomType ? data.type : '';
        const selectedType = isCustomType ? 'other' : (data.type || 'other');

        let customFieldsHTML = '';
        const customFields = data.custom_fields || [];
        if (customFields.length > 0) {
            customFieldsHTML = customFields.map((f, i) => `
            <div class="counterparty-custom-field-row" data-index="${i}">
                <input type="text" class="counterparty-form-input" placeholder="Название поля" value="${escapeHtml(f.key)}" style="flex: 0.4;">
                <input type="text" class="counterparty-form-input" placeholder="Значение" value="${escapeHtml(f.value)}" style="flex: 0.6;">
                <button class="remove-custom-btn" onclick="this.closest('.counterparty-custom-field-row').remove()">✕</button>
            </div>
        `).join('');
        }

        let paymentFieldsHTML = '';
        const paymentFields = data.payment_fields || [];
        if (paymentFields.length > 0) {
            const grouped = groupPaymentFields(paymentFields);
            paymentFieldsHTML = grouped.map((g, gi) => `
            <div class="counterparty-payment-group-form" data-group="${gi}" style="margin-bottom: 12px; padding: 12px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid rgba(255,255,255,0.04);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 11px; font-weight: 500; color: rgba(0,229,255,0.6);">${g.title || 'Счет #' + (parseInt(g.id) + 1)}</span>
                    <button class="remove-payment-btn" onclick="this.closest('.counterparty-payment-group-form').remove()" style="background: none; border: none; color: rgba(255,70,70,0.4); cursor: pointer; font-size: 14px;">✕</button>
                </div>
                <div class="counterparty-payment-grid-form">
                    ${g.fields.map(f => `
                        <div class="payment-field">
                            <span class="payment-label">${getPaymentLabel(f.key)}</span>
                            <input type="text" class="payment-input" data-key="${f.key}" value="${escapeHtml(f.value || '')}" placeholder="—">
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
        }

        modal.innerHTML = `
        <div class="counterparty-modal" onclick="event.stopPropagation()">
            <div class="counterparty-modal-header">
                <h3 class="counterparty-modal-title">${title}</h3>
                <button class="counterparty-modal-close" onclick="window.closeCounterpartyForm()">✕</button>
            </div>
            <form id="counterpartyForm" onsubmit="return false;">
                <div class="counterparty-form-grid">
                    <div class="counterparty-form-field full-width">
                        <label class="counterparty-form-label">ФИО президента <span class="required-star">*</span></label>
                        <input type="text" class="counterparty-form-input" id="cfPresident" value="${escapeHtml(data.president)}" placeholder="Иванов Иван Иванович" required>
                    </div>
                    <div class="counterparty-form-field full-width">
                        <label class="counterparty-form-label">Наименование организации <span class="required-star">*</span></label>
                        <input type="text" class="counterparty-form-input" id="cfOrganization" value="${escapeHtml(data.organization)}" placeholder="ТОО Вортекс" required>
                    </div>
                    <div class="counterparty-form-field">
                        <label class="counterparty-form-label">Номер телефона <span class="required-star">*</span></label>
                        <input type="text" class="counterparty-form-input" id="cfPhone" value="${escapeHtml(data.phone)}" placeholder="+7 777 777 77 77" required>
                    </div>
                    <div class="counterparty-form-field">
                        <label class="counterparty-form-label">Почта <span class="required-star">*</span></label>
                        <input type="email" class="counterparty-form-input" id="cfEmail" value="${escapeHtml(data.email)}" placeholder="info@company.kz" required>
                    </div>
                    <div class="counterparty-form-field">
                        <label class="counterparty-form-label">Тип <span class="required-star">*</span></label>
                        <select class="counterparty-form-input" id="cfType" onchange="window.toggleCustomTypeInput()">
                            ${types.map(t => `
                                <option value="${t.value}" ${selectedType === t.value ? 'selected' : ''}>
                                    ${t.label}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="counterparty-form-field" id="customTypeField" style="${selectedType === 'other' || isCustomType ? '' : 'display: none;'}">
                        <label class="counterparty-form-label">Введите свой тип <span class="required-star">*</span></label>
                        <input type="text" class="counterparty-form-input" id="cfCustomType" value="${escapeHtml(isCustomType ? customTypeValue : '')}" placeholder="Например: Франчайзи, Агент и т.д.">
                    </div>
                    <div class="counterparty-form-field">
                        <label class="counterparty-form-label">БИН/ИИН</label>
                        <input type="text" class="counterparty-form-input" id="cfBin" value="${escapeHtml(data.bin)}" placeholder="123456789012">
                    </div>
                    <div class="counterparty-form-field full-width">
                        <label class="counterparty-form-label">Адрес</label>
                        <input type="text" class="counterparty-form-input" id="cfAddress" value="${escapeHtml(data.address)}" placeholder="г. Алматы, ул. Абая 10">
                    </div>
                    <div class="counterparty-form-field">
                        <label class="counterparty-form-label">Веб-сайт</label>
                        <input type="text" class="counterparty-form-input" id="cfWebsite" value="${escapeHtml(data.website)}" placeholder="www.company.kz">
                    </div>
                    <div class="counterparty-form-field">
                        <label class="counterparty-form-label">Заметки</label>
                        <input type="text" class="counterparty-form-input" id="cfNotes" value="${escapeHtml(data.notes)}" placeholder="Дополнительная информация">
                    </div>
                    <div class="counterparty-custom-fields-container">
                        <span class="section-label">Дополнительные поля</span>
                        <div id="customFieldsContainer">
                            ${customFieldsHTML}
                        </div>
                        <button type="button" class="counterparty-add-custom-btn" onclick="window.addCustomField()">+ Добавить поле</button>
                    </div>
                    <div class="counterparty-payment-fields-container">
                        <span class="section-label">Платежные реквизиты</span>
                        <div id="paymentFieldsContainer">
                            ${paymentFieldsHTML}
                        </div>
                        <button type="button" class="counterparty-add-custom-btn" onclick="window.addPaymentGroup()">+ Добавить счет</button>
                    </div>
                    <div class="counterparty-form-actions">
                        <button type="button" class="counterparty-form-btn cancel" onclick="window.closeCounterpartyForm()">Отмена</button>
                        <button type="button" class="counterparty-form-btn save" onclick="window.saveCounterparty()">${id ? 'Сохранить' : 'Добавить'}</button>
                    </div>
                </div>
            </form>
        </div>
    `;

        document.body.appendChild(modal);
    };

    // ============================================
    // ПЕРЕКЛЮЧЕНИЕ ПОЛЯ ДЛЯ СВОЕГО ТИПА
    // ============================================
    window.toggleCustomTypeInput = function () {
        const typeSelect = document.getElementById('cfType');
        const customField = document.getElementById('customTypeField');
        const customInput = document.getElementById('cfCustomType');
        if (typeSelect.value === 'other') {
            customField.style.display = '';
            if (customInput && !customInput.value) customInput.focus();
        } else {
            customField.style.display = 'none';
            if (customInput) customInput.value = '';
        }
    };

    // ============================================
    // ДОБАВИТЬ КАСТОМНОЕ ПОЛЕ
    // ============================================
    window.addCustomField = function () {
        const container = document.getElementById('customFieldsContainer');
        if (!container) return;
        const row = document.createElement('div');
        row.className = 'counterparty-custom-field-row';
        row.innerHTML = `
            <input type="text" class="counterparty-form-input" placeholder="Название поля" style="flex: 0.4;">
            <input type="text" class="counterparty-form-input" placeholder="Значение" style="flex: 0.6;">
            <button class="remove-custom-btn" onclick="this.closest('.counterparty-custom-field-row').remove()">✕</button>
        `;
        container.appendChild(row);
    };

    // ============================================
    // ДОБАВИТЬ ГРУППУ ПЛАТЕЖНЫХ РЕКВИЗИТОВ
    // ============================================
    window.addPaymentGroup = function () {
        const container = document.getElementById('paymentFieldsContainer');
        if (!container) return;
        const groupIndex = container.querySelectorAll('.counterparty-payment-group-form').length;
        const group = document.createElement('div');
        group.className = 'counterparty-payment-group-form';
        group.dataset.group = groupIndex;
        group.style.cssText = 'margin-bottom: 12px; padding: 12px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid rgba(255,255,255,0.04);';
        group.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 11px; font-weight: 500; color: rgba(0,229,255,0.6);">Счет #${groupIndex + 1}</span>
                <button class="remove-payment-btn" onclick="this.closest('.counterparty-payment-group-form').remove()" style="background: none; border: none; color: rgba(255,70,70,0.4); cursor: pointer; font-size: 14px;">✕</button>
            </div>
            <div class="counterparty-payment-grid-form">
                <div class="payment-field">
                    <span class="payment-label">ФИО</span>
                    <input type="text" class="payment-input" data-key="payment_holder_${groupIndex}" placeholder="ФИО владельца">
                </div>
                <div class="payment-field">
                    <span class="payment-label">Банк</span>
                    <input type="text" class="payment-input" data-key="payment_bank_${groupIndex}" placeholder="Название банка">
                </div>
                <div class="payment-field">
                    <span class="payment-label">БИК</span>
                    <input type="text" class="payment-input" data-key="payment_bik_${groupIndex}" placeholder="БИК">
                </div>
                <div class="payment-field">
                    <span class="payment-label">Счет</span>
                    <input type="text" class="payment-input" data-key="payment_account_${groupIndex}" placeholder="Номер счета">
                </div>
                <div class="payment-field">
                    <span class="payment-label">КБЕ</span>
                    <input type="text" class="payment-input" data-key="payment_kbe_${groupIndex}" placeholder="КБЕ">
                </div>
                <div class="payment-field">
                    <span class="payment-label">КНО</span>
                    <input type="text" class="payment-input" data-key="payment_kno_${groupIndex}" placeholder="КНО">
                </div>
                <div class="payment-field">
                    <span class="payment-label">Ссылка</span>
                    <input type="text" class="payment-input" data-key="payment_link_${groupIndex}" placeholder="Ссылка для оплаты">
                </div>
                <div class="payment-field">
                    <span class="payment-label">Валюта</span>
                    <input type="text" class="payment-input" data-key="payment_currency_${groupIndex}" placeholder="KZT/USD/EUR">
                </div>
            </div>
        `;
        container.appendChild(group);
    };

    // ============================================
    // ЗАКРЫТЬ ФОРМУ
    // ============================================
    window.closeCounterpartyForm = function () {
        const modal = document.getElementById('counterpartyModal');
        if (modal) modal.remove();
        editId = null;
    };

    // ============================================
    // СОХРАНИТЬ КОНТРАГЕНТА (без изменений)
    // ============================================
    window.saveCounterparty = async function () {
        const president = document.getElementById('cfPresident')?.value?.trim();
        const organization = document.getElementById('cfOrganization')?.value?.trim();
        const phone = document.getElementById('cfPhone')?.value?.trim();
        const email = document.getElementById('cfEmail')?.value?.trim();

        const typeSelect = document.getElementById('cfType');
        let type = typeSelect?.value || 'other';
        if (type === 'other') {
            const customType = document.getElementById('cfCustomType')?.value?.trim();
            if (customType) type = customType;
        }

        const bin = document.getElementById('cfBin')?.value?.trim() || '';
        const address = document.getElementById('cfAddress')?.value?.trim() || '';
        const website = document.getElementById('cfWebsite')?.value?.trim() || '';
        const notes = document.getElementById('cfNotes')?.value?.trim() || '';

        if (!president || !organization || !phone || !email) {
            showNotification('Заполните все обязательные поля (*)', 'warning');
            return;
        }

        const customFields = [];
        const customRows = document.querySelectorAll('.counterparty-custom-field-row');
        customRows.forEach(row => {
            const inputs = row.querySelectorAll('input');
            if (inputs.length >= 2) {
                const key = inputs[0].value?.trim();
                const value = inputs[1].value?.trim();
                if (key) customFields.push({ key, value, required: false });
            }
        });

        const paymentFields = [];
        const paymentGroups = document.querySelectorAll('.counterparty-payment-group-form');
        paymentGroups.forEach(group => {
            const inputs = group.querySelectorAll('.payment-input');
            inputs.forEach(input => {
                const key = input.dataset.key;
                const value = input.value?.trim();
                if (key && value) paymentFields.push({ key, value, required: false });
            });
        });

        const data = {
            president, organization, phone, email, type,
            bin, address, website, notes,
            custom_fields: customFields,
            payment_fields: paymentFields
        };

        console.log('[Counterparty] Сохранение данных:', data);

        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                showNotification('Токен не найден', 'error');
                return;
            }

            const url = editId
                ? API_BASE_URL + '/api/company/counterparty/update/' + editId
                : API_BASE_URL + '/api/company/counterparty/create';

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            console.log('[Counterparty] Результат:', result);

            if (result.status === 'ok') {
                showNotification(editId ? 'Контрагент обновлен' : 'Контрагент создан', 'success');
                window.closeCounterpartyForm();
                setTimeout(loadCounterparties, 300);
            } else {
                showNotification('Ошибка: ' + (result.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('[Counterparty] Ошибка сохранения:', error);
            showNotification('Ошибка: ' + error.message, 'error');
        }
    };

    // ============================================
    // УДАЛИТЬ КОНТРАГЕНТА
    // ============================================
    window.deleteCounterparty = async function (id) {
        if (!confirm('Удалить контрагента?')) return;
        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                showNotification('Токен не найден', 'error');
                return;
            }
            const response = await fetch(API_BASE_URL + '/api/company/counterparty/delete/' + id, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });
            const result = await response.json();
            if (result.status === 'ok') {
                showNotification('Контрагент удален', 'success');
                await loadCounterparties();
                refreshTypesAfterDelete();
            } else {
                showNotification('Ошибка: ' + (result.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('[Counterparty] Ошибка удаления:', error);
            showNotification('Ошибка: ' + error.message, 'error');
        }
    };

    // ============================================
    // ЗАКРЫТЬ МОДУЛЬ
    // ============================================
    window.closeCounterparty = function () {
        console.log('[Counterparty] 🔴 Закрытие модуля...');
        const modals = document.querySelectorAll('.counterparty-modal-overlay');
        modals.forEach(modal => modal.remove());
        editId = null;

        const rightContent = document.getElementById('rightContent');
        if (rightContent) {
            rightContent.innerHTML = '';
            console.log('[Counterparty] ✅ Контент очищен');
            if (typeof window.createCompanyButtons === 'function') {
                console.log('[Counterparty] 🔄 Вызов createCompanyButtons()...');
                window.createCompanyButtons();
            } else {
                console.warn('[Counterparty] ⚠️ createCompanyButtons не найден, пробуем загрузить...');
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
            console.log('[Counterparty] ✅ company-buttons.js загружен');
            if (typeof window.createCompanyButtons === 'function') {
                window.createCompanyButtons();
            }
        };
        script.onerror = function () {
            console.error('[Counterparty] ❌ Не удалось загрузить company-buttons.js');
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
    window.openCounterparty = function () {
        console.log('[Counterparty] 📋 Открытие...');
        const rightContent = document.getElementById('rightContent');
        if (!rightContent) {
            console.error('[Counterparty] ❌ #rightContent не найден');
            return;
        }

        if (document.getElementById('counterpartyApp')) {
            console.log('[Counterparty] ⚠️ Уже открыто');
            return;
        }

        fetch('/crm/company/right/counterparty/counterparty.html')
            .then(response => {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.text();
            })
            .then(html => {
                rightContent.innerHTML = html;

                // Подключаем CSS
                if (!document.querySelector('link[href*="counterparty.css"]')) {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = '/crm/company/right/counterparty/counterparty.css';
                    document.head.appendChild(link);
                }

                // Загружаем данные
                loadCounterparties();
                loadTypeFilterOptions();
                initCustomSelect(); // ★★★ ИНИЦИАЛИЗАЦИЯ КАСТОМНОГО SELECT ★★★

                // Настраиваем кнопку "Добавить"
                const addBtn = document.getElementById('counterpartyAddBtn');
                if (addBtn) {
                    addBtn.replaceWith(addBtn.cloneNode(true));
                    const newBtn = document.getElementById('counterpartyAddBtn');
                    newBtn.addEventListener('click', function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('[Counterparty] 🔘 Клик по кнопке "Добавить"');
                        window.openCounterpartyForm();
                    });
                    console.log('[Counterparty] ✅ Кнопка "Добавить" настроена');
                }

                // Настраиваем кнопку закрытия
                const closeBtn = document.getElementById('counterpartyCloseBtn');
                if (closeBtn) {
                    closeBtn.onclick = function () {
                        window.closeCounterparty();
                    };
                }
            })
            .catch(error => {
                console.error('[Counterparty] ❌ Ошибка:', error);
                rightContent.innerHTML = `
                <div style="padding: 40px; text-align: center; color: rgba(255,255,255,0.5);">
                    <span style="font-size: 40px;">⚠️</span>
                    <p>Не удалось загрузить страницу: ${error.message}</p>
                    <button onclick="window.openCounterparty()" style="margin-top: 12px; padding: 8px 24px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; cursor: pointer;">Повторить</button>
                </div>
            `;
            });
    };

    // ============================================
    // УВЕДОМЛЕНИЯ
    // ============================================
    function showNotification(message, type = 'info') {
        const container = document.querySelector('.counterparty-notification-container') || (() => {
            const c = document.createElement('div');
            c.className = 'counterparty-notification-container';
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
        notification.className = `counterparty-notification ${type}`;
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
    window.onCounterparty = function () {
        window.openCounterparty();
    };

    // ============================================
    // ОБНОВЛЕНИЕ ТИПОВ ПОСЛЕ УДАЛЕНИЯ
    // ============================================
    function refreshTypesAfterDelete() {
        // Собираем все используемые типы из контрагентов
        const usedTypes = new Set();
        counterparties.forEach(cp => {
            if (cp.type) {
                usedTypes.add(cp.type);
            }
        });

        // Обновляем фильтр
        const optionsContainer = document.getElementById('typeFilterOptions');
        const selectedSpan = document.getElementById('typeFilterSelected');
        if (!optionsContainer) return;

        // Сохраняем текущее выбранное значение
        const currentSelected = optionsContainer.querySelector('li.selected');
        const currentValue = currentSelected ? currentSelected.dataset.value : 'all';

        // Очищаем все опции кроме "Все типы"
        while (optionsContainer.children.length > 1) {
            optionsContainer.removeChild(optionsContainer.lastChild);
        }

        // Добавляем предопределённые типы (без "other")
        const defaultTypes = [
            { value: 'supplier', label: 'Поставщик' },
            { value: 'partner', label: 'Партнер' },
            { value: 'distributor', label: 'Дистрибьютор' }
        ];
        defaultTypes.forEach(type => {
            const li = document.createElement('li');
            li.dataset.value = type.value;
            li.textContent = type.label;
            optionsContainer.appendChild(li);
        });

        // Добавляем кастомные типы, которые используются
        usedTypes.forEach(type => {
            if (type !== 'all' &&
                type !== 'supplier' && type !== 'partner' &&
                type !== 'distributor' && type !== 'other') {
                const li = document.createElement('li');
                li.dataset.value = type;
                li.textContent = type;
                optionsContainer.appendChild(li);
            }
        });

        // Восстанавливаем выбранное значение
        const newSelected = optionsContainer.querySelector(`li[data-value="${currentValue}"]`);
        if (newSelected) {
            optionsContainer.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
            newSelected.classList.add('selected');
            if (selectedSpan) selectedSpan.textContent = newSelected.textContent;
        } else {
            const allItem = optionsContainer.querySelector('li[data-value="all"]');
            if (allItem) {
                optionsContainer.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
                allItem.classList.add('selected');
                if (selectedSpan) selectedSpan.textContent = allItem.textContent;
            }
        }
    }

    console.log('✅ Модуль Контрагенты загружен');
})();