/**
 * Модуль реквизитов компании для правой секции
 * Путь: /crm/company/requisite/requisite.js
 */

(function () {
    'use strict';

    // ============================================
    // СОСТОЯНИЕ
    // ============================================
    let isLoading = false;
    let isVisible = false;
    let currentData = null;
    let editingGroupIndex = null;
    let pendingQRGroupId = null;
    let distributorsList = [];
    let selectedDistributorId = null;
    let distributorSearchQuery = '';
    let isDistributorDropdownOpen = false;

    // ============================================
    // Показать список дистрибьюторов и привязанного дистрибьютора (если компания уже привязана к кому-то)
    // ============================================
    async function fetchDistributorInfo() {
        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) return;

            const listUrl = API_BASE_URL + '/api/company/distributor/list';
            const listResponse = await fetch(listUrl, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            if (listResponse.ok) {
                const listData = await listResponse.json();
                if (listData.status === 'ok') {
                    distributorsList = listData.data || [];
                    selectedDistributorId = listData.linked_distributor_id || null;
                }
            }
        } catch (error) {
            console.error('[Requisite] ❌ Ошибка получения дистрибьюторов:', error);
        }
    }

    // ============================================
    // ПОИСК ДИСТРИБЬЮТОРА
    // ============================================
    window.searchDistributors = function (query) {
        if (!query || query.length < 1) {
            return distributorsList;
        }
        const lowerQuery = query.toLowerCase();
        return distributorsList.filter(d =>
            d.company_name.toLowerCase().includes(lowerQuery) ||
            d.president.toLowerCase().includes(lowerQuery) ||
            d.phone.includes(query)
        );
    };

    // ============================================
    // ВЫБОР ДИСТРИБЬЮТОРА
    // ============================================
    window.selectDistributor = function (distributorId) {
        selectedDistributorId = distributorId;
        isDistributorDropdownOpen = false;
        window.linkToDistributor(distributorId);
    };

    // ============================================
    // ПРИВЯЗКА К ДИСТРИБЬЮТОРУ
    // ============================================
    window.linkToDistributor = async function (distributorId) {
        if (!distributorId) {
            showNotification('❌ Выберите дистрибьютора', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                showNotification('❌ Токен не найден', 'error');
                return;
            }

            const response = await fetch(API_BASE_URL + '/api/company/distributor/link', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ distributor_id: distributorId })
            });

            const result = await response.json();
            if (result.status === 'ok') {
                showNotification('✅ Компания привязана к дистрибьютору', 'success');
                setTimeout(() => window.requisiteLoad(), 500);
            } else {
                showNotification('❌ ' + (result.message || 'Ошибка привязки'), 'error');
            }
        } catch (error) {
            console.error('[Requisite] ❌ Ошибка привязки:', error);
            showNotification('❌ Ошибка при привязке: ' + error.message, 'error');
        }
    };

    // ============================================
    // ОТВЯЗКА ОТ ДИСТРИБЬЮТОРА
    // ============================================
    window.unlinkFromDistributor = async function () {
        if (!selectedDistributorId) {
            showNotification('❌ Нет привязанного дистрибьютора', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                showNotification('❌ Токен не найден', 'error');
                return;
            }

            const response = await fetch(API_BASE_URL + '/api/company/distributor/unlink', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            if (result.status === 'ok') {
                showNotification('✅ Компания отвязана от дистрибьютора', 'success');
                setTimeout(() => window.requisiteLoad(), 500);
            } else {
                showNotification('❌ ' + (result.message || 'Ошибка отвязки'), 'error');
            }
        } catch (error) {
            console.error('[Requisite] ❌ Ошибка отвязки:', error);
            showNotification('❌ Ошибка при отвязке: ' + error.message, 'error');
        }
    };

    // ============================================
    // ПЕРЕКЛЮЧЕНИЕ ВЫПАДАЮЩЕГО СПИСКА
    // ============================================
    window.toggleDistributorDropdown = function () {
        isDistributorDropdownOpen = !isDistributorDropdownOpen;
        if (isDistributorDropdownOpen) {
            distributorSearchQuery = '';
            const input = document.getElementById('distributorSearchInput');
            if (input) {
                input.value = '';
                input.focus();
            }
        }
    };

    // ============================================
    // СОЗДАНИЕ HTML ДЛЯ СЕКЦИИ ДИСТРИБЬЮТОРА
    // ============================================
    function createDistributorHTML() {
        // Находим выбранного дистрибьютора
        const selectedDistributor = distributorsList.find(d => d.id === selectedDistributorId);

        if (selectedDistributor) {
            // Дистрибьютор назначен
            return `
            <div class="distributor-assigned">
                <div class="distributor-info">
                    <div class="distributor-name">
                        <span class="distributor-icon"></span>
                        <strong>${escapeHtml(selectedDistributor.company_name)}</strong>
                    </div>
                    <div class="distributor-details">
                        <span> ${escapeHtml(selectedDistributor.president)}</span>
                        <span> ${escapeHtml(selectedDistributor.phone)}</span>
                        <span> ${escapeHtml(selectedDistributor.email)}</span>
                    </div>
                </div>
                <button class="distributor-unlink-btn" onclick="window.unlinkFromDistributor()">
                     Отвязать
                </button>
            </div>
        `;
        }

        // Дистрибьютор не назначен - показываем поиск
        return `
        <div class="distributor-search-area">
            <div class="distributor-search-wrapper ${isDistributorDropdownOpen ? 'open' : ''}">
                <div class="distributor-search-input-wrapper">
                    <input type="text" 
                           id="distributorSearchInput"
                           class="distributor-search-input" 
                           placeholder="🔍 Поиск дистрибьютора..."
                           oninput="window.filterDistributorList(this.value)"
                           onfocus="window.openDistributorDropdown()"
                           autocomplete="off">
                    <button class="distributor-search-toggle" onclick="window.toggleDistributorDropdown()">
                        ${isDistributorDropdownOpen ? '▲' : '▼'}
                    </button>
                </div>
                <div class="distributor-dropdown" id="distributorDropdown" style="display: ${isDistributorDropdownOpen ? 'block' : 'none'}">
                    ${distributorsList.length > 0 ? `
                        <div class="distributor-list" id="distributorList">
                            ${distributorsList.map(d => `
                                <div class="distributor-item" onclick="window.selectDistributor(${d.id})">
                                    <div class="distributor-item-name">${escapeHtml(d.company_name)}</div>
                                    <div class="distributor-item-info">
                                        <span>${escapeHtml(d.president)}</span>
                                        <span>${escapeHtml(d.phone)}</span>
                                    </div>
                                    <div class="distributor-item-clients">👥 ${d.total_clients || 0} клиентов</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="distributor-empty">Нет доступных дистрибьюторов</div>
                    `}
                </div>
            </div>
            ${distributorsList.length === 0 ? `
                <div class="distributor-hint">Нет активных дистрибьюторов. Выберите вашего дистрибьютора.</div>
            ` : ''}
        </div>
    `;
    }

    // ============================================
    // ФИЛЬТРАЦИЯ СПИСКА ДИСТРИБЬЮТОРОВ
    // ============================================
    window.filterDistributorList = function (query) {
        const dropdown = document.getElementById('distributorDropdown');
        const list = document.getElementById('distributorList');
        if (!list || !dropdown) return;

        const lowerQuery = query.toLowerCase().trim();
        const items = list.querySelectorAll('.distributor-item');

        let visibleCount = 0;
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            const match = text.includes(lowerQuery);
            item.style.display = match ? 'flex' : 'none';
            if (match) visibleCount++;
        });

        if (visibleCount === 0 && query.trim().length > 0) {
            // Показываем "ничего не найдено"
            let emptyMsg = list.querySelector('.distributor-no-results');
            if (!emptyMsg) {
                emptyMsg = document.createElement('div');
                emptyMsg.className = 'distributor-no-results';
                emptyMsg.textContent = 'Ничего не найдено';
                list.appendChild(emptyMsg);
            }
            emptyMsg.style.display = 'block';
        } else {
            const emptyMsg = list.querySelector('.distributor-no-results');
            if (emptyMsg) emptyMsg.style.display = 'none';
        }

        if (query.trim().length > 0) {
            dropdown.style.display = 'block';
            isDistributorDropdownOpen = true;
        }
    };

    // ============================================
    // ОТКРЫТИЕ ВЫПАДАЮЩЕГО СПИСКА
    // ============================================
    window.openDistributorDropdown = function () {
        const dropdown = document.getElementById('distributorDropdown');
        if (dropdown) {
            dropdown.style.display = 'block';
            isDistributorDropdownOpen = true;
        }
    };

    // ============================================
    // ЗАКРЫТИЕ ВЫПАДАЮЩЕГО СПИСКА ПРИ КЛИКЕ ВНЕ
    // ============================================
    document.addEventListener('click', function (event) {
        const dropdown = document.getElementById('distributorDropdown');
        const searchWrapper = document.querySelector('.distributor-search-wrapper');

        if (!dropdown || !searchWrapper) return;

        // Проверяем, был ли клик внутри области поиска
        const isClickInside = searchWrapper.contains(event.target);

        if (!isClickInside) {
            // Клик был вне - закрываем список
            dropdown.style.display = 'none';
            isDistributorDropdownOpen = false;
        }
    });

    // ============================================
    // ЗАКРЫТИЕ ВЫПАДАЮЩЕГО СПИСКА ПРИ НАЖАТИИ ESC
    // ============================================
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
    // ОБНОВЛЕННАЯ ФУНКЦИЯ ОТКРЫТИЯ/ЗАКРЫТИЯ
    // ============================================
    // Переопределяем toggleDistributorDropdown с учетом нового поведения
    const originalToggle = window.toggleDistributorDropdown;
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
            if (input) {
                input.focus();
            }
        }
    };

    // Обновленная функция открытия
    window.openDistributorDropdown = function () {
        const dropdown = document.getElementById('distributorDropdown');
        if (dropdown) {
            dropdown.style.display = 'block';
            isDistributorDropdownOpen = true;
        }
    };

    // Обновленная функция фильтрации
    window.filterDistributorList = function (query) {
        const dropdown = document.getElementById('distributorDropdown');
        const list = document.getElementById('distributorList');
        if (!list || !dropdown) return;

        // Если есть запрос - показываем список
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

        // Удаляем старые сообщения "ничего не найдено"
        const oldEmpty = list.querySelector('.distributor-no-results');
        if (oldEmpty) oldEmpty.remove();

        if (visibleCount === 0 && query.trim().length > 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'distributor-no-results';
            emptyMsg.textContent = 'Ничего не найдено';
            list.appendChild(emptyMsg);
        }
    };

    // ============================================
    // ПОЛУЧЕНИЕ ДАННЫХ С СЕРВЕРА
    // ============================================
    async function fetchRequisite() {
        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                console.warn('[Requisite] ❌ Токен не найден');
                return null;
            }

            if (typeof API_BASE_URL === 'undefined') {
                console.error('[Requisite] ❌ API_BASE_URL не определён');
                return null;
            }

            const url = API_BASE_URL + '/api/company/requisite';
            console.log('[Requisite] 📡 Запрос:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('[Requisite] ❌ Ошибка HTTP:', response.status);
                return null;
            }

            const data = await response.json();
            console.log('[Requisite] 📦 Полный ответ от сервера:', data);
            console.log('[Requisite] 📦 data.data:', data.data);
            console.log('[Requisite] 📦 data.data.name:', data.data?.name);
            console.log('[Requisite] 📦 data.data.bin:', data.data?.bin);
            console.log('[Requisite] 📦 data.data.phone:', data.data?.phone);
            console.log('[Requisite] 📦 data.data.address:', data.data?.address);
            console.log('[Requisite] 📦 data.data.website:', data.data?.website);
            console.log('[Requisite] 📦 data.data.slogan:', data.data?.slogan);

            if (data.status === 'ok') {
                currentData = data.data;
                console.log('[Requisite] 📋 Все custom_fields:', data.data.custom_fields);

                // Загружаем информацию о дистрибьюторе
                await fetchDistributorInfo();

                return data.data;
            } else {
                console.error('[Requisite] ❌ Ошибка:', data.message);
                return null;
            }

        } catch (error) {
            console.error('[Requisite] ❌ Ошибка запроса:', error);
            return null;
        }
    }

    // ============================================
    // ПОЛУЧЕНИЕ ВСЕХ ГРУПП ПЛАТЕЖНЫХ РЕКВИЗИТОВ С СЕРВЕРА
    // ============================================
    async function fetchAllPaymentGroups() {
        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                console.warn('[Requisite] ❌ Токен не найден');
                return null;
            }

            const url = API_BASE_URL + '/api/company/requisite/payment/all';
            console.log('[Requisite] 📡 Запрос всех групп:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('[Requisite] ❌ Ошибка HTTP:', response.status);
                return null;
            }

            const data = await response.json();
            console.log('[Requisite] 📦 Группы:', data);

            if (data.status === 'ok') {
                return data.data;
            } else {
                console.error('[Requisite] ❌ Ошибка:', data.message);
                return null;
            }

        } catch (error) {
            console.error('[Requisite] ❌ Ошибка запроса:', error);
            return null;
        }
    }

    // ============================================
    // МАППИНГ ПОЛЕЙ НА РУССКИЙ И АНГЛИЙСКИЙ
    // ============================================
    function getFieldLabel(key) {
        const labels = {
            'name': { ru: 'Название компании', en: 'Company name' },
            'bin': { ru: 'БИН/ИИН', en: 'BIN/IIN' },
            'phone': { ru: 'Телефон', en: 'Phone' },
            'website': { ru: 'Веб-сайт', en: 'Website' },
            'address': { ru: 'Адрес', en: 'Address' },
            'slogan': { ru: 'Слоган', en: 'Slogan' },
            'payment_holder': { ru: 'ФИО (чей счет)', en: 'Account holder' },
            'payment_bank': { ru: 'Название банка', en: 'Bank name' },
            'payment_bik': { ru: 'БИК', en: 'BIC' },
            'payment_account': { ru: 'Расчетный счет', en: 'Account number' },
            'payment_kbe': { ru: 'КБЕ', en: 'KBE' },
            'payment_kno': { ru: 'КНО', en: 'KNO' },
            'payment_link': { ru: 'Ссылка для оплаты', en: 'Payment link' },
            'payment_currency': { ru: 'Валюта счета', en: 'Currency' },
            'payment_qr': { ru: 'QR код для оплаты', en: 'QR code' }
        };

        if (labels[key]) {
            return labels[key];
        }

        const match = key.match(/^(.+?)(?:_\d+)?$/);
        if (match) {
            const baseKey = match[1];
            if (labels[baseKey]) {
                return labels[baseKey];
            }
        }

        return { ru: String(key), en: String(key) };
    }

    // ============================================
    // ПАРСИНГ ПЛАТЕЖНЫХ РЕКВИЗИТОВ ПО ГРУППАМ
    // ============================================
    function parsePaymentRequisites(customFields) {
        if (!customFields || !Array.isArray(customFields)) {
            return [];
        }

        // ✅ Добавлены все типы
        const paymentTypes = ['holder', 'bank', 'bik', 'account', 'kbe', 'kno', 'link', 'currency', 'qr'];
        const groups = {};

        customFields.forEach(field => {
            const key = String(field.key || '').trim();
            const value = field.value || '';

            if (!key.startsWith('payment_')) return;

            let fieldType = '';
            let groupIndex = '0';

            const match = key.match(/^payment_(\w+)_(\d+)$/);
            if (match) {
                fieldType = match[1];
                groupIndex = match[2];
            } else {
                const simpleMatch = key.match(/^payment_(\w+)$/);
                if (simpleMatch) {
                    fieldType = simpleMatch[1];
                    groupIndex = '0';
                } else {
                    return;
                }
            }

            if (!paymentTypes.includes(fieldType)) return;

            if (!groups[groupIndex]) {
                groups[groupIndex] = {};
            }

            const label = getFieldLabel(key);
            groups[groupIndex][fieldType] = {
                key: key,
                label_ru: label.ru,
                label_en: label.en,
                value: value || '—',
                required: field.required || false,
                is_qr: fieldType === 'qr',
                is_link: fieldType === 'link',
                is_currency: fieldType === 'currency'
            };
        });

        const result = [];
        const order = ['holder', 'bank', 'bik', 'account', 'kbe', 'kno', 'link', 'currency', 'qr'];

        Object.keys(groups).sort((a, b) => parseInt(a) - parseInt(b)).forEach(index => {
            const fieldsMap = groups[index];
            const fields = [];

            order.forEach(fieldType => {
                if (fieldsMap[fieldType]) {
                    fields.push(fieldsMap[fieldType]);
                }
            });

            Object.keys(fieldsMap).forEach(fieldType => {
                if (!order.includes(fieldType)) {
                    fields.push(fieldsMap[fieldType]);
                }
            });

            if (fields.length > 0) {
                result.push({
                    id: parseInt(index),
                    fields: fields
                });
            }
        });

        return result;
    }

    // ============================================
    // УДАЛЕНИЕ ГРУППЫ (С ПОКАЗОМ НАЗВАНИЯ СЧЕТА)
    // ============================================
    window.deletePaymentGroup = async function (groupId) {
        // Преобразуем в число
        const groupIdNum = parseInt(groupId);

        // Находим название счета для отображения в уведомлении
        let accountTitle = `Группа #${groupIdNum + 1}`;

        // Пытаемся найти название счета из currentData
        if (currentData?.custom_fields) {
            const groups = parsePaymentRequisites(currentData.custom_fields);
            const group = groups.find(g => g.id === groupIdNum);
            if (group) {
                // Ищем поле holder (ФИО)
                const holderField = group.fields.find(f =>
                    f.key === 'payment_holder' ||
                    f.key === `payment_holder_${groupIdNum}` ||
                    f.key.startsWith('payment_holder_')
                );
                if (holderField && holderField.value !== '—') {
                    accountTitle = `"${holderField.value}"`;
                } else {
                    // Если holder не найден, ищем bank
                    const bankField = group.fields.find(f =>
                        f.key === 'payment_bank' ||
                        f.key === `payment_bank_${groupIdNum}` ||
                        f.key.startsWith('payment_bank_')
                    );
                    if (bankField && bankField.value !== '—') {
                        accountTitle = `"${bankField.value}"`;
                    }
                }
            }
        }

        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                showNotification('❌ Токен не найден', 'error');
                return;
            }

            const url = API_BASE_URL + `/api/company/requisite/payment/group/${groupIdNum}`;
            console.log('[Requisite] 🗑️ Удаление группы:', groupIdNum, 'URL:', url);

            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            console.log('[Requisite] 📦 Результат удаления:', result);

            if (result.status === 'ok') {
                // Показываем уведомление с названием счета
                showNotification(`✅ Расчетный счет ${accountTitle} удален`, 'success');
                window.closePaymentForm();
                setTimeout(() => window.requisiteLoad(), 500);
            } else {
                showNotification('❌ Ошибка: ' + (result.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('[Requisite] ❌ Ошибка удаления:', error);
            showNotification('❌ Ошибка при удалении: ' + error.message, 'error');
        }
    };

    // ============================================
    // ПОЛУЧЕНИЕ МАКСИМАЛЬНОГО ИНДЕКСА ГРУППЫ
    // ============================================
    function getMaxGroupIndex(customFields) {
        if (!customFields || !Array.isArray(customFields)) {
            return -1;
        }

        let maxIndex = -1;

        customFields.forEach(field => {
            const key = String(field.key || '');
            if (!key.startsWith('payment_')) return;

            const match = key.match(/^payment_\w+_(\d+)$/);
            if (match) {
                const idx = parseInt(match[1]);
                if (idx > maxIndex) maxIndex = idx;
            }
        });

        return maxIndex;
    }

    // ============================================
    // ФОРМА РЕДАКТИРОВАНИЯ (ОТКРЫВАЕТСЯ СНИЗУ)
    // ============================================
    window.showEditPaymentForm = function (groupId) {
        console.log('[Requisite] ✏ Редактирование группы ID:', groupId);

        const container = document.querySelector('.requisite-container');
        if (!container) {
            console.error('[Requisite] ❌ Контейнер не найден');
            return;
        }

        window.closePaymentForm();

        const groups = parsePaymentRequisites(currentData?.custom_fields || []);
        const groupIdNum = parseInt(groupId);
        const group = groups.find(g => g.id === groupIdNum);

        if (!group) {
            console.error('[Requisite] ❌ Группа не найдена. ID:', groupIdNum);
            showNotification('❌ Группа не найдена', 'error');
            return;
        }

        editingGroupIndex = groupIdNum;

        const fields = {};
        group.fields.forEach(f => {
            const key = f.key;
            const value = f.value !== '—' ? f.value : '';
            fields[key] = value;
        });

        const hasIndex = groupIdNum !== 0;
        const indexSuffix = hasIndex ? `_${groupIdNum}` : '';

        let accountNumber = `#${groupIdNum + 1}`;
        const holderKey = `payment_holder${indexSuffix}`;
        const holderValue = fields[holderKey] || '';
        const accountKey = `payment_account${indexSuffix}`;
        const accountValue = fields[accountKey] || '';

        if (holderValue) {
            accountNumber = `"${holderValue}"`;
        } else if (accountValue) {
            accountNumber = `счет ${accountValue}`;
        }

        // ✅ Получаем значения с правильными ключами
        const getFieldValue = (fieldName) => {
            const key = hasIndex ? `${fieldName}${indexSuffix}` : fieldName;
            return fields[key] || '';
        };

        const formHTML = `
<div class="payment-add-form glass-effect slide-up-form">
    <div class="payment-form-header">
        <span class="payment-form-title">Редактировать ${accountNumber}</span>
        <button class="payment-form-close" onclick="window.closePaymentForm()">✕</button>
    </div>
    <div class="payment-form-body">
        <div class="payment-form-grid">
            <!-- ОСНОВНЫЕ РЕКВИЗИТЫ СЧЕТА -->
            <div class="payment-form-field full-width">
                <label class="payment-form-label">ФИО (чей счет) <span class="field-hint">(Account holder)</span></label>
                <input type="text" class="payment-form-input" id="paymentHolder" value="${escapeHtml(getFieldValue('payment_holder'))}" placeholder="Например: ТОО Вортекс">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">Название банка <span class="field-hint">(Bank name)</span></label>
                <input type="text" class="payment-form-input" id="paymentBank" value="${escapeHtml(getFieldValue('payment_bank'))}" placeholder="Например: Народный банк">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">БИК <span class="field-hint">(BIC)</span></label>
                <input type="text" class="payment-form-input" id="paymentBik" value="${escapeHtml(getFieldValue('payment_bik'))}" placeholder="Например: 123456789">
            </div>
            <div class="payment-form-field full-width">
                <label class="payment-form-label">Расчетный счет <span class="field-hint">(Account number)</span></label>
                <input type="text" class="payment-form-input" id="paymentAccount" value="${escapeHtml(getFieldValue('payment_account'))}" placeholder="Например: KZ123456789012345678">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">КБЕ <span class="field-hint">(KBE)</span></label>
                <input type="text" class="payment-form-input" id="paymentKbe" value="${escapeHtml(getFieldValue('payment_kbe'))}" placeholder="Например: 123">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">КНО <span class="field-hint">(KNO)</span></label>
                <input type="text" class="payment-form-input" id="paymentKno" value="${escapeHtml(getFieldValue('payment_kno'))}" placeholder="Например: 456">
            </div>
            
            <!-- ДОПОЛНИТЕЛЬНЫЕ ПОЛЯ ДЛЯ СЧЕТА -->
            <div class="payment-form-field full-width">
                <label class="payment-form-label">Ссылка для оплаты <span class="field-hint">(Payment link)</span></label>
                <input type="url" class="payment-form-input" id="paymentLink" value="${escapeHtml(getFieldValue('payment_link'))}" placeholder="https://example.com/pay">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">Валюта счета <span class="field-hint">(Currency)</span></label>
                <select class="payment-form-input" id="paymentCurrency">
                    <option value="">Выберите валюту</option>
                    <option value="KZT" ${getFieldValue('payment_currency') === 'KZT' ? 'selected' : ''}>₸ KZT</option>
                    <option value="USD" ${getFieldValue('payment_currency') === 'USD' ? 'selected' : ''}>$ USD</option>
                    <option value="EUR" ${getFieldValue('payment_currency') === 'EUR' ? 'selected' : ''}>€ EUR</option>
                    <option value="RUB" ${getFieldValue('payment_currency') === 'RUB' ? 'selected' : ''}>₽ RUB</option>
                    <option value="CNY" ${getFieldValue('payment_currency') === 'CNY' ? 'selected' : ''}>¥ CNY</option>
                    <option value="GBP" ${getFieldValue('payment_currency') === 'GBP' ? 'selected' : ''}>£ GBP</option>
                </select>
            </div>
            
            <!-- QR КОД С КНОПКОЙ ЗАГРУЗКИ И ОЧИСТКИ -->
            <div class="payment-form-field full-width">
                <label class="payment-form-label">QR код для оплаты <span class="field-hint">(QR code)</span></label>
                <div class="qr-upload-container" style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    ${getFieldValue('payment_qr') ? `
                        <img src="${getFieldValue('payment_qr')}?t=${Date.now()}" 
                             alt="QR код" 
                             class="qr-preview"
                             style="max-width: 80px; max-height: 80px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); padding: 4px; object-fit: contain;">
                    ` : ''}
                    <button class="payment-form-btn" onclick="window.uploadPaymentQR('${groupIdNum}')" style="background: rgba(0,229,255,0.1); color: #00E5FF; border-color: rgba(0,229,255,0.15);">
                        📷 ${getFieldValue('payment_qr') ? 'Заменить QR' : 'Загрузить QR'}
                    </button>
                    <button class="payment-form-btn qr-clear-btn" onclick="window.clearPaymentQR()" style="display: ${getFieldValue('payment_qr') ? 'inline-block' : 'none'}; background: rgba(255,70,70,0.1); color: #ff6b6b; border-color: rgba(255,70,70,0.15);">
                        🗑️ Очистить
                    </button>
                    ${getFieldValue('payment_qr') ? `<span style="color: rgba(255,255,255,0.3); font-size: 12px;">✓ QR загружен</span>` : ''}
                </div>
            </div>
        </div>
    </div>
    <div class="payment-form-footer">
        <button class="payment-form-btn danger" onclick="window.deletePaymentGroup('${groupIdNum}')">Удалить</button>
        <button class="payment-form-btn save" onclick="window.savePaymentRequisites('${groupIdNum}')">Сохранить</button>
    </div>
</div>
`;

        const formWrapper = document.createElement('div');
        formWrapper.innerHTML = formHTML;
        container.appendChild(formWrapper.firstElementChild);
    };

    // ============================================
    // ПОКАЗ ФОРМЫ ДОБАВЛЕНИЯ (ОТКРЫВАЕТСЯ СНИЗУ)
    // ============================================
    window.showAddPaymentForm = function () {
        const container = document.querySelector('.requisite-container');
        if (!container) return;

        if (document.querySelector('.payment-add-form')) {
            return;
        }

        editingGroupIndex = null;

        const formHTML = `
<div class="payment-add-form glass-effect slide-up-form">
    <div class="payment-form-header">
        <span class="payment-form-title">Добавить новый счет</span>
        <button class="payment-form-close" onclick="window.closePaymentForm()">✕</button>
    </div>
    <div class="payment-form-body">
        <div class="payment-form-grid">
            <!-- ОСНОВНЫЕ РЕКВИЗИТЫ СЧЕТА -->
            <div class="payment-form-field full-width">
                <label class="payment-form-label">ФИО (чей счет) <span class="field-hint">(Account holder)</span></label>
                <input type="text" class="payment-form-input" id="paymentHolder" placeholder="Например: ТОО Вортекс">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">Название банка <span class="field-hint">(Bank name)</span></label>
                <input type="text" class="payment-form-input" id="paymentBank" placeholder="Например: Народный банк">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">БИК <span class="field-hint">(BIC)</span></label>
                <input type="text" class="payment-form-input" id="paymentBik" placeholder="Например: 123456789">
            </div>
            <div class="payment-form-field full-width">
                <label class="payment-form-label">Расчетный счет <span class="field-hint">(Account number)</span></label>
                <input type="text" class="payment-form-input" id="paymentAccount" placeholder="Например: KZ123456789012345678">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">КБЕ <span class="field-hint">(KBE)</span></label>
                <input type="text" class="payment-form-input" id="paymentKbe" placeholder="Например: 123">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">КНО <span class="field-hint">(KNO)</span></label>
                <input type="text" class="payment-form-input" id="paymentKno" placeholder="Например: 456">
            </div>
            
            <!-- ДОПОЛНИТЕЛЬНЫЕ ПОЛЯ ДЛЯ СЧЕТА -->
            <div class="payment-form-field full-width">
                <label class="payment-form-label">Ссылка для оплаты <span class="field-hint">(Payment link)</span></label>
                <input type="url" class="payment-form-input" id="paymentLink" placeholder="https://example.com/pay">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">Валюта счета <span class="field-hint">(Currency)</span></label>
                <select class="payment-form-input" id="paymentCurrency">
                    <option value="">Выберите валюту</option>
                    <option value="KZT">₸ KZT</option>
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                    <option value="RUB">₽ RUB</option>
                    <option value="CNY">¥ CNY</option>
                    <option value="GBP">£ GBP</option>
                </select>
            </div>
            
            <!-- QR КОД С КНОПКОЙ ОЧИСТИТЬ -->
            <div class="payment-form-field full-width">
                <label class="payment-form-label">QR код для оплаты <span class="field-hint">(QR code)</span></label>
                <div class="qr-upload-container" style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <button class="payment-form-btn" onclick="window.uploadPaymentQR()" style="background: rgba(0,229,255,0.1); color: #00E5FF; border-color: rgba(0,229,255,0.15);">
                        📷 Загрузить QR
                    </button>
                    <button class="payment-form-btn qr-clear-btn" onclick="window.clearPaymentQR()" style="display: none; background: rgba(255,70,70,0.1); color: #ff6b6b; border-color: rgba(255,70,70,0.15);">
                        🗑️ Очистить
                    </button>
                    <span style="color: rgba(255,255,255,0.2); font-size: 11px;">(можно загрузить позже)</span>
                </div>
            </div>
        </div>
    </div>
    <div class="payment-form-footer">
        <button class="payment-form-btn cancel" onclick="window.closePaymentForm()">Отмена</button>
        <button class="payment-form-btn save" onclick="window.savePaymentRequisites()">Добавить</button>
    </div>
</div>
`;

        const formWrapper = document.createElement('div');
        formWrapper.innerHTML = formHTML;
        container.appendChild(formWrapper.firstElementChild);
    };

    // ============================================
    // ЗАКРЫТИЕ ФОРМЫ
    // ============================================
    window.closePaymentForm = function () {
        const form = document.querySelector('.payment-add-form');
        if (form) {
            form.remove();
        }
        editingGroupIndex = null;
    };

    // ============================================
    // СОХРАНЕНИЕ ПЛАТЕЖНЫХ РЕКВИЗИТОВ (С QR ДЛЯ КАЖДОГО СЧЕТА)
    // ============================================
    window.savePaymentRequisites = async function (groupId) {
        const holder = document.getElementById('paymentHolder')?.value?.trim();
        const bank = document.getElementById('paymentBank')?.value?.trim();
        const bik = document.getElementById('paymentBik')?.value?.trim();
        const account = document.getElementById('paymentAccount')?.value?.trim();
        const kbe = document.getElementById('paymentKbe')?.value?.trim();
        const kno = document.getElementById('paymentKno')?.value?.trim();
        const link = document.getElementById('paymentLink')?.value?.trim();
        const currency = document.getElementById('paymentCurrency')?.value?.trim();

        const hasData = holder || bank || bik || account || kbe || kno || link || currency;
        if (!hasData) {
            showNotification('Заполните хотя бы одно поле', 'warning');
            return;
        }

        const paymentData = {};

        let isEdit = false;
        let accountDisplayName = '';
        let targetGroupId = null;

        // Получаем QR файл из контейнера
        const qrContainer = document.querySelector('.qr-upload-container');
        let qrFile = null;
        let qrUploaded = false;
        let qrToDelete = false;

        if (qrContainer) {
            qrFile = qrContainer._qrFile || null;
            qrUploaded = !!qrFile;
            qrToDelete = qrContainer._qrToDelete || false;
            console.log('[Requisite] 📷 Состояние QR:', { qrUploaded, qrToDelete });
        }

        // ✅ Определяем режим: редактирование или создание
        const isEditing = groupId !== undefined && groupId !== null && groupId !== 'new';

        if (isEditing) {
            // ============================================
            // РЕДАКТИРОВАНИЕ СУЩЕСТВУЮЩЕЙ ГРУППЫ
            // ============================================
            isEdit = true;
            const groupIdNum = parseInt(groupId);
            const hasIndex = groupIdNum !== 0;
            const indexSuffix = hasIndex ? `_${groupIdNum}` : '';
            targetGroupId = groupIdNum;

            // ✅ Если нужно удалить QR - отправляем специальный флаг
            if (qrToDelete) {
                const qrKey = hasIndex ? `payment_qr${indexSuffix}` : 'payment_qr';
                paymentData[qrKey] = '__DELETE__';
                paymentData['_delete_qr'] = true;
                console.log('[Requisite] 🗑️ QR помечен на удаление');

                // Очищаем контейнер
                if (qrContainer) {
                    const preview = qrContainer.querySelector('.qr-preview');
                    if (preview) preview.remove();
                    qrContainer._qrFile = null;
                    qrContainer._qrToDelete = false;
                    qrContainer.dataset.qrFile = 'false';
                    const clearBtn = qrContainer.querySelector('.qr-clear-btn');
                    if (clearBtn) clearBtn.style.display = 'none';
                }
            }
            // ✅ Если загружен новый QR - загружаем его
            else if (qrFile) {
                try {
                    const token = localStorage.getItem('vortex_token');
                    if (!token) {
                        showNotification('Токен не найден', 'error');
                        return;
                    }

                    const qrFormData = new FormData();
                    qrFormData.append('qr', qrFile);
                    qrFormData.append('group_index', String(groupIdNum));

                    showNotification('⏳ Загрузка QR кода...', 'info');

                    const qrResponse = await fetch(API_BASE_URL + '/api/company/requisite/payment/upload-qr', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + token
                        },
                        body: qrFormData
                    });

                    const qrResult = await qrResponse.json();
                    if (qrResult.status !== 'ok') {
                        showNotification('❌ Ошибка загрузки QR: ' + (qrResult.message || 'Неизвестная ошибка'), 'error');
                        return;
                    }

                    // Очищаем QR из контейнера
                    if (qrContainer) {
                        const preview = qrContainer.querySelector('.qr-preview');
                        if (preview) preview.remove();
                        qrContainer._qrFile = null;
                        qrContainer._qrToDelete = false;
                        qrContainer.dataset.qrFile = 'false';
                        const clearBtn = qrContainer.querySelector('.qr-clear-btn');
                        if (clearBtn) clearBtn.style.display = 'none';
                    }

                } catch (error) {
                    console.error('[Requisite] ❌ Ошибка загрузки QR:', error);
                    showNotification('❌ Ошибка при загрузке QR: ' + error.message, 'error');
                    return;
                }
            }
            // ✅ Если QR не загружен и не удален - сохраняем существующий
            else {
                try {
                    const groups = parsePaymentRequisites(currentData?.custom_fields || []);
                    const group = groups.find(g => g.id === groupIdNum);
                    if (group) {
                        const qrField = group.fields.find(f => f.is_qr);
                        if (qrField && qrField.value && qrField.value !== '—') {
                            const qrKey = hasIndex ? `payment_qr${indexSuffix}` : 'payment_qr';
                            paymentData[qrKey] = qrField.value;
                            console.log('[Requisite] ✅ Сохраняем существующий QR:', qrField.value);
                        }
                    }
                } catch (error) {
                    console.warn('[Requisite] ⚠️ Не удалось найти существующий QR:', error);
                }
            }

            // ✅ Добавляем поля с БАЗОВЫМИ ключами (без индекса)
            const fieldsToUpdate = {
                'payment_holder': holder,
                'payment_bank': bank,
                'payment_bik': bik,
                'payment_account': account,
                'payment_kbe': kbe,
                'payment_kno': kno,
                'payment_link': link,
                'payment_currency': currency
            };

            for (const [key, value] of Object.entries(fieldsToUpdate)) {
                if (value) {
                    paymentData[key] = value;
                }
            }

            // ✅ Добавляем group_index для бэкенда (без action)
            paymentData['group_index'] = groupIdNum;

            if (holder) {
                accountDisplayName = `"${holder}"`;
            } else if (account) {
                accountDisplayName = `счет ${account}`;
            } else {
                accountDisplayName = `#${groupIdNum + 1}`;
            }

        } else {
            // ============================================
            // СОЗДАНИЕ НОВОЙ ГРУППЫ
            // ============================================
            isEdit = false;

            // Если есть QR - загружаем его и получаем индекс
            if (qrFile) {
                try {
                    const token = localStorage.getItem('vortex_token');
                    if (!token) {
                        showNotification('Токен не найден', 'error');
                        return;
                    }

                    const qrFormData = new FormData();
                    qrFormData.append('qr', qrFile);
                    qrFormData.append('group_index', 'new');

                    showNotification('⏳ Загрузка QR кода...', 'info');

                    const qrResponse = await fetch(API_BASE_URL + '/api/company/requisite/payment/upload-qr', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + token
                        },
                        body: qrFormData
                    });

                    const qrResult = await qrResponse.json();
                    if (qrResult.status !== 'ok') {
                        showNotification('❌ Ошибка загрузки QR: ' + (qrResult.message || 'Неизвестная ошибка'), 'error');
                        return;
                    }

                    if (qrResult.data && qrResult.data.group_index !== undefined) {
                        targetGroupId = parseInt(qrResult.data.group_index);
                        console.log('[Requisite] ✅ QR загружен с индексом:', targetGroupId);
                    }

                    if (qrContainer) {
                        const preview = qrContainer.querySelector('.qr-preview');
                        if (preview) preview.remove();
                        qrContainer._qrFile = null;
                        qrContainer._qrToDelete = false;
                        qrContainer.dataset.qrFile = 'false';
                        const clearBtn = qrContainer.querySelector('.qr-clear-btn');
                        if (clearBtn) clearBtn.style.display = 'none';
                    }

                } catch (error) {
                    console.error('[Requisite] ❌ Ошибка загрузки QR:', error);
                    showNotification('❌ Ошибка при загрузке QR: ' + error.message, 'error');
                    return;
                }
            }

            // Если QR не загружен, определяем индекс сами
            if (targetGroupId === null) {
                const groups = parsePaymentRequisites(currentData?.custom_fields || []);
                let maxIdx = -1;
                let hasGroupZero = false;

                groups.forEach(g => {
                    if (g.id === 0) hasGroupZero = true;
                    if (g.id > maxIdx) maxIdx = g.id;
                });

                if (hasGroupZero) {
                    targetGroupId = Math.max(1, maxIdx + 1);
                } else {
                    targetGroupId = 0;
                }
                console.log('[Requisite] 📌 Определен индекс для новой группы:', targetGroupId);
            }

            // Добавляем поля с БАЗОВЫМИ ключами
            const fieldsToAdd = {
                'payment_holder': holder,
                'payment_bank': bank,
                'payment_bik': bik,
                'payment_account': account,
                'payment_kbe': kbe,
                'payment_kno': kno,
                'payment_link': link,
                'payment_currency': currency
            };

            for (const [key, value] of Object.entries(fieldsToAdd)) {
                if (value) {
                    paymentData[key] = value;
                }
            }

            paymentData['action'] = 'add';
            paymentData['group_index'] = targetGroupId;

            if (holder) {
                accountDisplayName = `"${holder}"`;
            } else if (account) {
                accountDisplayName = `счет ${account}`;
            } else {
                accountDisplayName = `#${targetGroupId + 1}`;
            }
        }

        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                showNotification('Токен не найден', 'error');
                return;
            }

            console.log('[Requisite] 📤 Отправка данных счета:', paymentData);

            const url = API_BASE_URL + '/api/company/requisite/payment';
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(paymentData)
            });

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('[Requisite] ❌ Ответ не JSON:', text);
                showNotification('❌ Ошибка сервера: неверный ответ', 'error');
                return;
            }

            const result = await response.json();
            console.log('[Requisite] 📦 Ответ:', result);

            if (result.status === 'ok') {
                if (isEdit) {
                    showNotification(`Счет ${accountDisplayName} успешно обновлен`, 'success');
                } else {
                    showNotification('Новый счет успешно добавлен', 'success');
                }

                window.closePaymentForm();
                setTimeout(() => window.requisiteLoad(), 500);
            } else {
                showNotification('❌ Ошибка: ' + (result.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('[Requisite] ❌ Ошибка сохранения:', error);
            showNotification('❌ Ошибка при сохранении: ' + error.message, 'error');
        }
    };

    // ============================================
    // ФОРМА РЕДАКТИРОВАНИЯ ОСНОВНЫХ РЕКВИЗИТОВ (ОТКРЫВАЕТСЯ СНИЗУ)
    // ============================================
    window.showEditCompanyRequisites = function () {
        console.log('[Requisite] ✏️ Редактирование основных реквизитов...');

        const container = document.querySelector('.requisite-container');
        if (!container) {
            console.error('[Requisite] ❌ Контейнер не найден');
            return;
        }

        window.closePaymentForm();

        if (!currentData) {
            showNotification('Данные не загружены', 'error');
            return;
        }

        console.log('[Requisite] Текущие данные для редактирования:', currentData);

        const getValue = (value) => {
            return value || '';
        };

        const formHTML = `
<div class="payment-add-form glass-effect slide-up-form" style="max-height: calc(100vh - 200px); overflow-y: auto;">
    <div class="payment-form-header" style="position: sticky; top: 0; z-index: 10; background: rgba(20, 20, 30, 0.95); backdrop-filter: blur(20px);">
        <span class="payment-form-title">Редактировать реквизиты компании</span>
        <button class="payment-form-close" onclick="window.closePaymentForm()">✕</button>
    </div>
    <div class="payment-form-body">
        <div class="payment-form-grid">
            <div class="payment-form-field full-width">
                <label class="payment-form-label">Название компании <span class="field-hint">(Company name)</span></label>
                <input type="text" class="payment-form-input" id="editCompanyName" value="${escapeHtml(getValue(currentData.name))}" placeholder="Например: ТОО Вортекс">
            </div>
            <div class="payment-form-field full-width">
                <label class="payment-form-label">БИН/ИИН <span class="field-hint">(BIN/IIN)</span></label>
                <input type="text" class="payment-form-input" id="editCompanyBin" value="${escapeHtml(getValue(currentData.bin))}" placeholder="Например: 123456789012">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">Телефон <span class="field-hint">(Phone)</span></label>
                <input type="text" class="payment-form-input" id="editCompanyPhone" value="${escapeHtml(getValue(currentData.phone))}" placeholder="Например: +7 777 777 77 77">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">Веб-сайт <span class="field-hint">(Website)</span></label>
                <input type="text" class="payment-form-input" id="editCompanyWebsite" value="${escapeHtml(getValue(currentData.website))}" placeholder="Например: www.company.kz">
            </div>
            <div class="payment-form-field full-width">
                <label class="payment-form-label">Юридический адрес <span class="field-hint">(Legal address)</span></label>
                <input type="text" class="payment-form-input" id="editCompanyAddress" value="${escapeHtml(getValue(currentData.address))}" placeholder="Например: г. Алматы, ул. Абая 10">
            </div>
            <div class="payment-form-field full-width">
                <label class="payment-form-label">Слоган <span class="field-hint">(Slogan)</span></label>
                <input type="text" class="payment-form-input" id="editCompanySlogan" value="${escapeHtml(getValue(currentData.slogan))}" placeholder="Например: Мы строим будущее">
            </div>
            <div class="payment-form-field full-width">
                <label class="payment-form-label">Президент компании <span class="field-hint">(President)</span></label>
                <input type="text" class="payment-form-input" id="editCompanyPresident" value="${escapeHtml(getValue(currentData.president))}" placeholder="Например: Иванов Иван Иванович">
            </div>
            <div class="payment-form-field full-width">
                <label class="payment-form-label">Почтовый адрес <span class="field-hint">(Postal address)</span></label>
                <input type="text" class="payment-form-input" id="editCompanyPostalAddress" value="${escapeHtml(getValue(currentData.postal_address))}" placeholder="Например: 050000, г. Алматы, ул. Абая 10">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">E-mail компании <span class="field-hint">(Company email)</span></label>
                <input type="email" class="payment-form-input" id="editCompanyEmail" value="${escapeHtml(getValue(currentData.company_email))}" placeholder="Например: info@company.kz">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">E-mail президента <span class="field-hint">(President email)</span></label>
                <input type="email" class="payment-form-input" id="editPresidentEmail" value="${escapeHtml(getValue(currentData.president_email))}" placeholder="Например: president@company.kz">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">Свидетельство о регистрации <span class="field-hint">(Reg. certificate)</span></label>
                <input type="text" class="payment-form-input" id="editRegCertificate" value="${escapeHtml(getValue(currentData.reg_certificate))}" placeholder="Например: 12345-6789">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">Дата регистрации <span class="field-hint">(Reg. date)</span></label>
                <input type="date" class="payment-form-input" id="editRegDate" value="${escapeHtml(getValue(currentData.reg_date))}">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">Форма собственности <span class="field-hint">(Ownership form)</span></label>
                <input type="text" class="payment-form-input" id="editOwnershipForm" value="${escapeHtml(getValue(currentData.ownership_form))}" placeholder="Например: ТОО, АО, ИП">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">Дата основания <span class="field-hint">(Foundation date)</span></label>
                <input type="date" class="payment-form-input" id="editFoundationDate" value="${escapeHtml(getValue(currentData.foundation_date))}">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">Код ОКЭД <span class="field-hint">(OKED code)</span></label>
                <input type="text" class="payment-form-input" id="editOkedCode" value="${escapeHtml(getValue(currentData.oked_code))}" placeholder="Например: 62010">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">КБК <span class="field-hint">(KBK code)</span></label>
                <input type="text" class="payment-form-input" id="editKbkCode" value="${escapeHtml(getValue(currentData.kbk_code))}" placeholder="Например: 101010">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">Номер лицензии <span class="field-hint">(License number)</span></label>
                <input type="text" class="payment-form-input" id="editLicenseNumber" value="${escapeHtml(getValue(currentData.license_number))}" placeholder="Например: 12345-6789">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">Дата выдачи лицензии <span class="field-hint">(License date)</span></label>
                <input type="date" class="payment-form-input" id="editLicenseDate" value="${escapeHtml(getValue(currentData.license_date))}">
            </div>
            <div class="payment-form-field full-width">
                <label class="payment-form-label">Фактический адрес <span class="field-hint">(Actual address)</span></label>
                <input type="text" class="payment-form-input" id="editActualAddress" value="${escapeHtml(getValue(currentData.actual_address))}" placeholder="Например: г. Алматы, ул. Абая 10">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">Instagram <span class="field-hint">(Instagram)</span></label>
                <input type="text" class="payment-form-input" id="editInstagram" value="${escapeHtml(getValue(currentData.instagram))}" placeholder="@username">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">Facebook <span class="field-hint">(Facebook)</span></label>
                <input type="text" class="payment-form-input" id="editFacebook" value="${escapeHtml(getValue(currentData.facebook))}" placeholder="@username">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">LinkedIn <span class="field-hint">(LinkedIn)</span></label>
                <input type="text" class="payment-form-input" id="editLinkedin" value="${escapeHtml(getValue(currentData.linkedin))}" placeholder="@username">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">YouTube <span class="field-hint">(YouTube)</span></label>
                <input type="text" class="payment-form-input" id="editYoutube" value="${escapeHtml(getValue(currentData.youtube))}" placeholder="Канал">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">TikTok <span class="field-hint">(TikTok)</span></label>
                <input type="text" class="payment-form-input" id="editTiktok" value="${escapeHtml(getValue(currentData.tiktok))}" placeholder="@username">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">ИИН/БИН руководителя <span class="field-hint">(CEO identification)</span></label>
                <input type="text" class="payment-form-input" id="editCeoIdentification" value="${escapeHtml(getValue(currentData.ceo_identification))}" placeholder="Например: 123456789012">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">Контактное лицо <span class="field-hint">(Contact person)</span></label>
                <input type="text" class="payment-form-input" id="editContactPerson" value="${escapeHtml(getValue(currentData.contact_person))}" placeholder="Например: Петров Петр">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">Телефон контактного лица <span class="field-hint">(Contact phone)</span></label>
                <input type="text" class="payment-form-input" id="editContactPersonPhone" value="${escapeHtml(getValue(currentData.contact_person_phone))}" placeholder="Например: +7 777 777 77 77">
            </div>
            <div class="payment-form-field">
                <label class="payment-form-label">Email контактного лица <span class="field-hint">(Contact email)</span></label>
                <input type="email" class="payment-form-input" id="editContactPersonEmail" value="${escapeHtml(getValue(currentData.contact_person_email))}" placeholder="Например: contact@company.kz">
            </div>
        </div>
    </div>
    <div class="payment-form-footer" style="position: sticky; bottom: 0; z-index: 10; background: transparent; backdrop-filter: none; border-top: 1px solid rgba(255, 255, 255, 0.06);">
        <button class="payment-form-btn cancel" onclick="window.closePaymentForm()">Отмена</button>
        <button class="payment-form-btn save" onclick="window.saveCompanyRequisites()">Сохранить</button>
    </div>
</div>
`;

        const formWrapper = document.createElement('div');
        formWrapper.innerHTML = formHTML;
        // ВСТАВЛЯЕМ В КОНЕЦ КОНТЕЙНЕРА (СНИЗУ)
        container.appendChild(formWrapper.firstElementChild);

        const style = document.createElement('style');
        style.textContent = `
    .payment-add-form::-webkit-scrollbar {
        width: 6px;
    }
    .payment-add-form::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
    }
    .payment-add-form::-webkit-scrollbar-thumb {
        background: rgba(0, 229, 255, 0.3);
        border-radius: 10px;
    }
    .payment-add-form::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 229, 255, 0.5);
    }
    `;
        document.head.appendChild(style);
    };

    // ============================================
    // СОЗДАНИЕ HTML (ИСПРАВЛЕННАЯ - СКЛЮЧАЮЩАЯ НОВЫЕ ПОЛЯ ИЗ ОБЩИХ РЕКВИЗИТОВ)
    // ============================================
    function createRequisiteHTML(data) {
        if (!data) {
            return `
    <div class="requisite-error">
        <span style="font-size: 40px;">⚠️</span>
        <p>Не удалось загрузить данные</p>
        <button onclick="window.requisiteLoad()" class="requisite-retry-btn">Повторить</button>
    </div>
`;
        }

        const requisites = [];

        // Основные поля компании
        if (data.name && data.name.trim()) requisites.push({ key: 'Название компании', value: data.name, highlight: true });
        if (data.bin && data.bin.trim()) requisites.push({ key: 'БИН/ИИН', value: data.bin });
        if (data.phone && data.phone.trim()) requisites.push({ key: 'Телефон', value: data.phone });
        if (data.website && data.website.trim()) requisites.push({ key: 'Веб-сайт', value: data.website });
        if (data.address && data.address.trim()) requisites.push({ key: 'Юридический адрес', value: data.address });
        if (data.slogan && data.slogan.trim()) requisites.push({ key: 'Слоган', value: data.slogan });
        if (data.president && data.president.trim()) requisites.push({ key: 'Президент компании', value: data.president });
        if (data.postal_address && data.postal_address.trim()) requisites.push({ key: 'Почтовый адрес', value: data.postal_address });
        if (data.company_email && data.company_email.trim()) requisites.push({ key: 'E-mail компании', value: data.company_email });
        if (data.president_email && data.president_email.trim()) requisites.push({ key: 'E-mail президента', value: data.president_email });
        if (data.reg_certificate && data.reg_certificate.trim()) requisites.push({ key: 'Свидетельство о регистрации', value: data.reg_certificate });
        if (data.reg_date && data.reg_date.trim()) requisites.push({ key: 'Дата регистрации', value: data.reg_date });
        if (data.ownership_form && data.ownership_form.trim()) requisites.push({ key: 'Форма собственности', value: data.ownership_form });
        if (data.foundation_date && data.foundation_date.trim()) requisites.push({ key: 'Дата основания', value: data.foundation_date });
        if (data.oked_code && data.oked_code.trim()) requisites.push({ key: 'Код ОКЭД', value: data.oked_code });
        if (data.kbk_code && data.kbk_code.trim()) requisites.push({ key: 'КБК', value: data.kbk_code });
        if (data.license_number && data.license_number.trim()) requisites.push({ key: 'Номер лицензии', value: data.license_number });
        if (data.license_date && data.license_date.trim()) requisites.push({ key: 'Дата выдачи лицензии', value: data.license_date });
        if (data.actual_address && data.actual_address.trim()) requisites.push({ key: 'Фактический адрес', value: data.actual_address });
        if (data.ceo_identification && data.ceo_identification.trim()) requisites.push({ key: 'ИИН/БИН руководителя', value: data.ceo_identification });
        if (data.contact_person && data.contact_person.trim()) requisites.push({ key: 'Контактное лицо', value: data.contact_person });
        if (data.contact_person_phone && data.contact_person_phone.trim()) requisites.push({ key: 'Телефон контактного лица', value: data.contact_person_phone });
        if (data.contact_person_email && data.contact_person_email.trim()) requisites.push({ key: 'Email контактного лица', value: data.contact_person_email });

        // Социальные сети
        const socialNetworks = [];
        if (data.instagram && data.instagram.trim()) socialNetworks.push(`Instagram: ${data.instagram}`);
        if (data.facebook && data.facebook.trim()) socialNetworks.push(`Facebook: ${data.facebook}`);
        if (data.linkedin && data.linkedin.trim()) socialNetworks.push(`LinkedIn: ${data.linkedin}`);
        if (data.youtube && data.youtube.trim()) socialNetworks.push(`YouTube: ${data.youtube}`);
        if (data.tiktok && data.tiktok.trim()) socialNetworks.push(`TikTok: ${data.tiktok}`);
        if (socialNetworks.length > 0) {
            requisites.push({ key: 'Социальные сети', value: socialNetworks.join(' | ') });
        }

        const customFields = data.custom_fields || [];
        // ✅ ИСПРАВЛЕНО: Добавляем ВСЕ payment_* поля в список исключений
        const paymentKeywords = ['payment_holder', 'payment_bank', 'payment_bik', 'payment_account', 'payment_kbe', 'payment_kno', 'payment_link', 'payment_currency', 'payment_qr'];
        const existingKeys = requisites.map(r => r.key.toLowerCase());

        const paymentFields = [];
        const otherFields = [];

        // Собираем все дополнительные поля
        customFields.forEach(field => {
            const key = String(field.key || '');
            const isPayment = paymentKeywords.some(pk => key === pk || key.startsWith(pk + '_'));

            const label = getFieldLabel(key);
            const keyLower = label.ru.toLowerCase();
            const exists = existingKeys.some(ex => ex === keyLower);

            if (exists) {
                return;
            }

            if (isPayment && field.value) {
                paymentFields.push(field);
            } else if (!isPayment && field.value) {
                otherFields.push({
                    key: label.ru,
                    value: field.value,
                    required: field.required,
                    originalKey: key
                });
                existingKeys.push(keyLower);
            }
        });

        // Парсим платежные реквизиты
        const paymentGroups = parsePaymentRequisites(paymentFields);

        

        const statusBadge = data.is_active
            ? '<span class="requisite-status-badge active">Активна</span>'
            : '<span class="requisite-status-badge inactive">Неактивна</span>';

        const usedMB = (data.storage_used_bytes || 0) / (1024 * 1024);
        const storageText = `${usedMB.toFixed(1)} МБ / ${data.storage_limit_mb || 100} МБ`;

        // Логотип компании (кликабельный для загрузки)
        const logoUrl = data.logo_path ? (API_BASE_URL + data.logo_path) : '';
        const logoHTML = logoUrl ? `
    <div class="company-logo-wrapper" onclick="window.uploadCompanyLogo()" title="Нажмите чтобы загрузить новый логотип">
        <img src="${logoUrl}?t=${Date.now()}" alt="Логотип компании" class="company-logo" style="cursor: pointer;">
        <div class="logo-upload-overlay">
            <span class="logo-upload-icon"></span>
            <span class="logo-upload-text">Изменить</span>
        </div>
    </div>
` : `
    <div class="company-logo-wrapper" onclick="window.uploadCompanyLogo()" title="Нажмите чтобы загрузить логотип">
        <div class="company-logo-placeholder" style="cursor: pointer;">
            ${data.name ? data.name.charAt(0).toUpperCase() : '🏢'}
        </div>
        <div class="logo-upload-overlay">
            <span class="logo-upload-icon"></span>
            <span class="logo-upload-text">Загрузить</span>
        </div>
    </div>
`;

        // Основные реквизиты
        let requisitesHTML = '';
        if (requisites.length > 0 || otherFields.length > 0) {
            const allRequisites = [...requisites, ...otherFields];

            requisitesHTML = `
        <div class="requisite-section">
            <div class="requisite-section-header">
                <h3 class="requisite-section-title">Реквизиты компании</h3>
                <button class="requisite-edit-btn" onclick="window.showEditCompanyRequisites()" title="Редактировать реквизиты">
                    <span class="edit-icon">✏️</span>
                </button>
            </div>
            <div class="requisite-grid">
                ${allRequisites.map(field => `
                    <div class="requisite-item ${field.highlight ? 'full-width highlight-item' : ''}">
                        <span class="requisite-label">${escapeHtml(field.key)} ${field.required ? '*' : ''}</span>
                        <span class="requisite-value ${field.highlight ? 'highlight' : ''}">${escapeHtml(field.value) || '—'}</span>
                    </div>
                `).join('')}
            </div>
            <div class="requisite-add-btn-wrapper">
                <button class="requisite-add-btn" onclick="window.showAddPaymentForm()">
                    <span class="add-icon">+</span> Добавить счет
                </button>
            </div>
        </div>
    `;
        }

        // ============================================
        // СОЗДАНИЕ HTML - СЕКЦИЯ СЧЕТОВ
        // ============================================
        // Платежные реквизиты - каждый счет отображается отдельно
        let paymentHTML = '';
        if (paymentGroups.length > 0) {
            paymentHTML = `
    <div class="requisite-section">
        <h3 class="requisite-section-title">Счета компании (${paymentGroups.length})</h3>
        ${paymentGroups.map((group, index) => {
                // Находим название счета
                const holderField = group.fields.find(f => f.key === 'payment_holder' || f.key.startsWith('payment_holder_'));
                const groupTitle = holderField?.value || `Счет #${index + 1}`;

                return `
                <div class="payment-group">
                    <div class="payment-group-header">
                        <div class="payment-group-title">
                            <span class="group-number">#${index + 1}</span>
                            ${escapeHtml(groupTitle)}
                        </div>
                        <div class="payment-group-actions">
                            <button class="payment-action-btn edit" onclick="window.showEditPaymentForm('${group.id}')" title="Редактировать">✏️</button>
                            <button class="payment-action-btn delete" onclick="window.deletePaymentGroup('${group.id}')" title="Удалить">🗑️</button>
                        </div>
                    </div>
                    <div class="requisite-grid payment-grid">
                        ${group.fields.map(field => {
                    // ✅ QR код - показываем как изображение на всю ширину
                    if (field.is_qr && field.value && field.value !== '—') {
                        const qrUrl = field.value.startsWith('http') ? field.value : API_BASE_URL + field.value;
                        return `
                                    <div class="requisite-item full-width">
                                        <span class="requisite-label">${escapeHtml(field.label_ru)} <span class="field-hint">(${escapeHtml(field.label_en)})</span></span>
                                        <div class="qr-code-container">
                                            <img src="${qrUrl}?t=${Date.now()}" 
                                                 alt="QR код" 
                                                 class="qr-code-image"
                                                 onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=\\'color: rgba(255,255,255,0.4); font-size: 13px;\\'>QR код не загружен</span>'">
                                            <button class="qr-upload-btn" onclick="window.uploadPaymentQR('${group.id}')" title="Заменить QR код">
                                                📷 Заменить
                                            </button>
                                        </div>
                                    </div>
                                `;
                    }

                    // ✅ Ссылка - показываем как кликабельную ссылку
                    if (field.is_link && field.value && field.value !== '—') {
                        return `
                                    <div class="requisite-item full-width">
                                        <span class="requisite-label">${escapeHtml(field.label_ru)} <span class="field-hint">(${escapeHtml(field.label_en)})</span></span>
                                        <span class="requisite-value">
                                            <a href="${escapeHtml(field.value)}" target="_blank" rel="noopener noreferrer" 
                                               style="color: #00E5FF; text-decoration: none; border-bottom: 1px dashed rgba(0,229,255,0.3);">
                                                ${escapeHtml(field.value)}
                                            </a>
                                        </span>
                                    </div>
                                `;
                    }

                    // ✅ Валюта - показываем с символом
                    if (field.is_currency && field.value && field.value !== '—') {
                        const currencySymbols = {
                            'KZT': '₸',
                            'USD': '$',
                            'EUR': '€',
                            'RUB': '₽',
                            'CNY': '¥',
                            'GBP': '£'
                        };
                        const symbol = currencySymbols[field.value] || '';
                        return `
                                    <div class="requisite-item">
                                        <span class="requisite-label">${escapeHtml(field.label_ru)} <span class="field-hint">(${escapeHtml(field.label_en)})</span></span>
                                        <span class="requisite-value">${symbol} ${escapeHtml(field.value) || '—'}</span>
                                    </div>
                                `;
                    }

                    // ✅ Обычное поле
                    return `
                                <div class="requisite-item">
                                    <span class="requisite-label">${escapeHtml(field.label_ru)} <span class="field-hint">(${escapeHtml(field.label_en)})</span></span>
                                    <span class="requisite-value">${escapeHtml(field.value) || '—'}</span>
                                </div>
                            `;
                }).join('')}
                    </div>
                </div>
            `;
            }).join('')}
    </div>
`;
        }

        return `
    <div class="requisite-header">
        <h2 class="requisite-title">Реквизиты компании</h2>
        <button class="requisite-close-btn" onclick="window.closeRequisite()">✕</button>
    </div>

    <div class="requisite-content">
        <!-- СТАТИСТИКА - ПЕРВАЯ -->
        <div class="requisite-section company-stats-section">
            <div class="company-stats-container">
                ${logoHTML}
                <div class="company-stats-info">
                    <div class="company-stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">Состояние</span>
                            <span class="stat-value">${statusBadge}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Хранилище</span>
                            <span class="stat-value">${storageText}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Администраторы</span>
                            <span class="stat-value">${data.admins?.length || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Счета</span>
                            <span class="stat-value">${paymentGroups.length}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- РЕКВИЗИТЫ - ВТОРАЯ -->
        ${requisitesHTML}
        ${paymentHTML}

               <!-- АДМИНИСТРАТОРЫ -->
        <div class="requisite-section">
            <h3 class="requisite-section-title">Администраторы (${data.admins?.length || 0})</h3>
            ${data.admins && data.admins.length > 0 ? data.admins.map(admin => `
                <div class="requisite-grid" style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.04);">
                    <div class="requisite-item">
                        <span class="requisite-label">ФИО</span>
                        <span class="requisite-value">${escapeHtml(admin.full_name) || '—'}</span>
                    </div>
                    <div class="requisite-item">
                        <span class="requisite-label">Логин</span>
                        <span class="requisite-value">${escapeHtml(admin.username) || '—'}</span>
                    </div>
                    <div class="requisite-item">
                        <span class="requisite-label">Email</span>
                        <span class="requisite-value">${escapeHtml(admin.email) || '—'}</span>
                    </div>
                    <div class="requisite-item">
                        <span class="requisite-label">Телефон</span>
                        <span class="requisite-value">${escapeHtml(admin.phone) || '—'}</span>
                    </div>
                </div>
            `).join('') : '<div class="requisite-item" style="grid-column: 1/-1; color: rgba(255,255,255,0.3);">Администраторы не найдены</div>'}
        </div>

               <!-- ДИСТРИБЬЮТОР - ПОСЛЕ АДМИНИСТРАТОРОВ -->
        <div class="requisite-section">
            <h3 class="requisite-section-title">Дистрибьютор компании</h3>
            <div class="distributor-container">
                ${createDistributorHTML()}
            </div>
        </div>
        
        <!-- ПУСТОЕ ПРОСТРАНСТВО 200px -->
        <div style="height: 150px; width: 100%; flex-shrink: 0;"></div>
    </div>
`;

        // закрывающая скобка функции и остальной код
    }

    // ============================================
    // СОХРАНЕНИЕ ОСНОВНЫХ РЕКВИЗИТОВ КОМПАНИИ
    // ============================================
    window.saveCompanyRequisites = async function () {
        const name = document.getElementById('editCompanyName')?.value?.trim();
        const bin = document.getElementById('editCompanyBin')?.value?.trim();
        const phone = document.getElementById('editCompanyPhone')?.value?.trim();
        const website = document.getElementById('editCompanyWebsite')?.value?.trim();
        const address = document.getElementById('editCompanyAddress')?.value?.trim();
        const slogan = document.getElementById('editCompanySlogan')?.value?.trim();
        const president = document.getElementById('editCompanyPresident')?.value?.trim();
        const postalAddress = document.getElementById('editCompanyPostalAddress')?.value?.trim();
        const companyEmail = document.getElementById('editCompanyEmail')?.value?.trim();
        const presidentEmail = document.getElementById('editPresidentEmail')?.value?.trim();
        const regCertificate = document.getElementById('editRegCertificate')?.value?.trim();
        const regDate = document.getElementById('editRegDate')?.value?.trim();

        // Новые поля
        const ownershipForm = document.getElementById('editOwnershipForm')?.value?.trim();
        const foundationDate = document.getElementById('editFoundationDate')?.value?.trim();
        const okedCode = document.getElementById('editOkedCode')?.value?.trim();
        const kbkCode = document.getElementById('editKbkCode')?.value?.trim();
        const licenseNumber = document.getElementById('editLicenseNumber')?.value?.trim();
        const licenseDate = document.getElementById('editLicenseDate')?.value?.trim();
        const actualAddress = document.getElementById('editActualAddress')?.value?.trim();
        const instagram = document.getElementById('editInstagram')?.value?.trim();
        const facebook = document.getElementById('editFacebook')?.value?.trim();
        const linkedin = document.getElementById('editLinkedin')?.value?.trim();
        const youtube = document.getElementById('editYoutube')?.value?.trim();
        const tiktok = document.getElementById('editTiktok')?.value?.trim();
        const ceoIdentification = document.getElementById('editCeoIdentification')?.value?.trim();
        const contactPerson = document.getElementById('editContactPerson')?.value?.trim();
        const contactPersonPhone = document.getElementById('editContactPersonPhone')?.value?.trim();
        const contactPersonEmail = document.getElementById('editContactPersonEmail')?.value?.trim();

        // Проверяем обязательные поля
        if (!name) {
            showNotification('Название компании обязательно', 'warning');
            return;
        }

        // Формируем данные для отправки
        const dataToSend = {
            name: name,
            bin: bin || '',
            phone: phone || '',
            website: website || '',
            address: address || '',
            slogan: slogan || '',
            president: president || '',
            postal_address: postalAddress || '',
            company_email: companyEmail || '',
            president_email: presidentEmail || '',
            reg_certificate: regCertificate || '',
            reg_date: regDate || '',
            // Новые поля
            ownership_form: ownershipForm || '',
            foundation_date: foundationDate || '',
            oked_code: okedCode || '',
            kbk_code: kbkCode || '',
            license_number: licenseNumber || '',
            license_date: licenseDate || '',
            actual_address: actualAddress || '',
            instagram: instagram || '',
            facebook: facebook || '',
            linkedin: linkedin || '',
            youtube: youtube || '',
            tiktok: tiktok || '',
            ceo_identification: ceoIdentification || '',
            contact_person: contactPerson || '',
            contact_person_phone: contactPersonPhone || '',
            contact_person_email: contactPersonEmail || ''
        };

        console.log('[Requisite] Сохранение реквизитов:', dataToSend);

        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                showNotification('Токен не найден', 'error');
                return;
            }

            const url = API_BASE_URL + '/api/company/requisite/update';

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataToSend)
            });

            const result = await response.json();
            console.log('[Requisite] Ответ:', result);

            if (result.status === 'ok') {
                showNotification('Реквизиты компании успешно обновлены', 'success');
                window.closePaymentForm();
                setTimeout(() => window.requisiteLoad(), 500);
            } else {
                showNotification('Ошибка: ' + (result.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('[Requisite] Ошибка сохранения:', error);
            showNotification('Ошибка при сохранении: ' + error.message, 'error');
        }
    };

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
            <div class="requisite-loader">
                <div class="spinner"></div>
                <span>Загрузка данных...</span>
            </div>
        `;
    }

    // ============================================
    // ЗАГРУЗКА ДАННЫХ
    // ============================================
    window.requisiteLoad = async function () {
        if (isLoading) return;
        isLoading = true;

        const rightContent = document.getElementById('rightContent');
        if (!rightContent) {
            console.error('[Requisite] ❌ #rightContent не найден');
            isLoading = false;
            return;
        }

        rightContent.innerHTML = `<div class="requisite-container">${showLoader()}</div>`;

        const data = await fetchRequisite();

        if (data) {
            rightContent.innerHTML = `<div class="requisite-container">${createRequisiteHTML(data)}</div>`;
            isVisible = true;
        } else {
            rightContent.innerHTML = `
                <div class="requisite-container">
                    <div class="requisite-error">
                        <span style="font-size: 40px;">⚠️</span>
                        <p>Не удалось загрузить данные</p>
                        <button onclick="window.requisiteLoad()" class="requisite-retry-btn">Повторить</button>
                    </div>
                </div>
            `;
        }

        isLoading = false;
    };

    // ============================================
    // ЗАГРУЗКА ЛОГОТИПА КОМПАНИИ
    // ============================================
    window.uploadCompanyLogo = function () {
        // Создаем скрытый input для выбора файла
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        fileInput.onchange = async function (e) {
            const file = e.target.files[0];
            if (!file) {
                fileInput.remove();
                return;
            }

            // Проверка размера (макс 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showNotification('❌ Размер файла не должен превышать 5 МБ', 'error');
                fileInput.remove();
                return;
            }

            // Проверка типа
            if (!file.type.startsWith('image/')) {
                showNotification('❌ Пожалуйста, выберите изображение', 'error');
                fileInput.remove();
                return;
            }

            try {
                const token = localStorage.getItem('vortex_token');
                if (!token) {
                    showNotification('❌ Токен не найден', 'error');
                    fileInput.remove();
                    return;
                }

                const formData = new FormData();
                formData.append('logo', file);

                showNotification('⏳ Загрузка логотипа...', 'info');

                const response = await fetch(API_BASE_URL + '/api/company/requisite/upload-logo', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + token
                    },
                    body: formData
                });

                const result = await response.json();
                console.log('[Requisite] 📦 Результат загрузки:', result);

                if (result.status === 'ok') {
                    showNotification('✅ Логотип успешно загружен', 'success');
                    // Обновляем данные
                    setTimeout(() => window.requisiteLoad(), 500);
                } else {
                    showNotification('❌ Ошибка: ' + (result.message || 'Неизвестная ошибка'), 'error');
                }
            } catch (error) {
                console.error('[Requisite] ❌ Ошибка загрузки:', error);
                showNotification('❌ Ошибка при загрузке: ' + error.message, 'error');
            }

            fileInput.remove();
        };

        fileInput.click();
    };

    // ============================================
    // ЗАГРУЗКА QR КОДА ДЛЯ СЧЕТА (С ПОДДЕРЖКОЙ МНОЖЕСТВЕННЫХ СЧЕТОВ)
    // ============================================
    window.uploadPaymentQR = function (groupId) {
        console.log('[Requisite] 📷 Загрузка QR для группы:', groupId);

        // Сохраняем groupId для использования после загрузки
        pendingQRGroupId = groupId;

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        fileInput.onchange = function (e) {
            const file = e.target.files[0];
            if (!file) {
                fileInput.remove();
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                showNotification('❌ Размер файла не должен превышать 2 МБ', 'error');
                fileInput.remove();
                return;
            }

            if (!file.type.startsWith('image/')) {
                showNotification('❌ Пожалуйста, выберите изображение', 'error');
                fileInput.remove();
                return;
            }

            // Находим контейнер QR в текущей форме
            const qrContainer = document.querySelector('.qr-upload-container');
            if (!qrContainer) {
                showNotification('❌ Контейнер QR не найден', 'error');
                fileInput.remove();
                return;
            }

            // Определяем targetGroupId
            let targetGroupId = groupId;
            if (targetGroupId === 'new' || targetGroupId === null || targetGroupId === undefined) {
                targetGroupId = 'new';
            } else {
                targetGroupId = parseInt(targetGroupId);
                if (isNaN(targetGroupId)) {
                    targetGroupId = 0;
                }
            }

            // ✅ Сохраняем в контейнере
            qrContainer.dataset.qrFile = 'true';
            qrContainer.dataset.qrFileName = file.name;
            qrContainer.dataset.qrGroupId = String(targetGroupId);
            qrContainer._qrFile = file;

            // ✅ Также сохраняем в глобальной переменной
            pendingQRGroupId = targetGroupId;

            console.log('[Requisite] 📷 QR сохранен для группы:', targetGroupId);

            // Создаем preview
            const reader = new FileReader();
            reader.onload = function (e) {
                const oldPreview = qrContainer.querySelector('.qr-preview');
                if (oldPreview) oldPreview.remove();

                const preview = document.createElement('img');
                preview.className = 'qr-preview';
                preview.src = e.target.result;
                preview.style.cssText = `
                max-width: 80px;
                max-height: 80px;
                border-radius: 6px;
                border: 1px solid rgba(255,255,255,0.08);
                padding: 4px;
                object-fit: contain;
            `;
                qrContainer.appendChild(preview);

                const clearBtn = qrContainer.querySelector('.qr-clear-btn');
                if (clearBtn) clearBtn.style.display = 'inline-block';

                const hint = qrContainer.querySelector('.qr-hint');
                if (hint) hint.style.display = 'none';

                showNotification('✅ QR код добавлен в форму. Нажмите "Сохранить" для загрузки.', 'success');
            };
            reader.readAsDataURL(file);
            fileInput.remove();
        };

        fileInput.click();
    };

    // ============================================
    // ОЧИСТКА QR КОДА ИЗ ФОРМЫ И ПОМЕТКА НА УДАЛЕНИЕ
    // ============================================
    window.clearPaymentQR = function () {
        const qrContainer = document.querySelector('.qr-upload-container');
        if (qrContainer) {
            const preview = qrContainer.querySelector('.qr-preview');
            if (preview) preview.remove();

            // ✅ Помечаем, что QR нужно удалить
            qrContainer.dataset.qrFile = 'false';
            qrContainer.dataset.qrFileName = '';
            qrContainer.dataset.qrGroupId = '';
            qrContainer._qrFile = null;
            qrContainer._qrToDelete = true; // ✅ Флаг, что QR нужно удалить
            pendingQRGroupId = null;

            const clearBtn = qrContainer.querySelector('.qr-clear-btn');
            if (clearBtn) clearBtn.style.display = 'none';

            const hint = qrContainer.querySelector('.qr-hint');
            if (hint) hint.style.display = 'inline';

            showNotification('🗑️ QR код будет удален при сохранении', 'info');
        }
    };

    // ============================================
    // ФУНКЦИЯ ДЛЯ КРАСИВЫХ УВЕДОМЛЕНИЙ (2 СЕКУНДЫ)
    // ============================================
    function showNotification(message, type = 'info') {
        // Удаляем старые уведомления
        const oldNotifications = document.querySelectorAll('.custom-notification');
        oldNotifications.forEach(n => n.remove());

        // Создаем контейнер если нет
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

        // Цвета для разных типов
        const colors = {
            success: {
                border: '#00E5FF',
                bg: 'rgba(0, 229, 255, 0.08)',
                icon: ''
            },
            error: {
                border: '#ff6b6b',
                bg: 'rgba(255, 70, 70, 0.08)',
                icon: ''
            },
            warning: {
                border: '#ffd93d',
                bg: 'rgba(255, 217, 61, 0.08)',
                icon: ''
            },
            info: {
                border: '#4dabf7',
                bg: 'rgba(77, 171, 247, 0.08)',
                icon: ''
            }
        };

        const color = colors[type] || colors.info;

        // Создаем уведомление
        const notification = document.createElement('div');
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
        transform-origin: right;
        border-left: 4px solid ${color.border};
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 260px;
        max-width: 400px;
        transition: all 0.3s ease;
    `;

        // Иконка
        const iconSpan = document.createElement('span');
        iconSpan.style.cssText = `
        font-size: 18px;
        flex-shrink: 0;
    `;
        iconSpan.textContent = color.icon;

        // Текст
        const textSpan = document.createElement('span');
        textSpan.style.cssText = `
        flex: 1;
        line-height: 1.4;
    `;
        textSpan.textContent = message;

        // Кнопка закрытия
        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = `
        background: none;
        border: none;
        color: rgba(255,255,255,0.3);
        font-size: 16px;
        cursor: pointer;
        padding: 0 4px;
        transition: color 0.3s ease;
        flex-shrink: 0;
    `;
        closeBtn.textContent = '';
        closeBtn.onmouseover = () => closeBtn.style.color = 'rgba(255,255,255,0.8)';
        closeBtn.onmouseout = () => closeBtn.style.color = 'rgba(255,255,255,0.3)';
        closeBtn.onclick = () => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(60px)';
            setTimeout(() => notification.remove(), 300);
        };

        notification.appendChild(iconSpan);
        notification.appendChild(textSpan);
        notification.appendChild(closeBtn);
        container.appendChild(notification);

        // Прогресс-бар (2 секунды)
        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        height: 2px;
        background: ${color.border};
        border-radius: 0 0 12px 12px;
        animation: progressBar 2s linear forwards;
        width: 100%;
    `;
        notification.style.position = 'relative';
        notification.style.overflow = 'hidden';
        notification.appendChild(progressBar);

        // Автоматическое удаление через 2 секунды
        const timeoutId = setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(60px)';
                setTimeout(() => {
                    notification.remove();
                    if (container.children.length === 0) {
                        container.remove();
                    }
                }, 300);
            }
        }, 2000);

        // Останавливаем таймер при наведении
        notification.onmouseenter = () => {
            clearTimeout(timeoutId);
            progressBar.style.animationPlayState = 'paused';
        };
        notification.onmouseleave = () => {
            // Перезапускаем таймер на 2 секунды
            const newTimeout = setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.opacity = '0';
                    notification.style.transform = 'translateX(60px)';
                    setTimeout(() => {
                        notification.remove();
                        if (container.children.length === 0) {
                            container.remove();
                        }
                    }, 300);
                }
            }, 2000);
            notification._timeoutId = newTimeout;
            progressBar.style.animationPlayState = 'running';
        };
    }

    // Добавляем стили для анимаций (если ещё не добавлены)
    (function addNotificationStyles() {
        if (document.getElementById('notification-styles')) return;

        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(80px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateX(0) scale(1);
            }
        }
        
        @keyframes progressBar {
            from {
                width: 100%;
            }
            to {
                width: 0%;
            }
        }
        
        .custom-notification {
            animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
    `;
        document.head.appendChild(style);
    })();

    // ============================================
    // ОТКРЫТИЕ / ЗАКРЫТИЕ
    // ============================================
    window.openRequisite = function () {
        console.log('[Requisite] 📋 Открытие реквизитов...');
        window.requisiteLoad();
    };

    window.closeRequisite = function () {
        console.log('[Requisite] ❌ Закрытие реквизитов...');
        const rightContent = document.getElementById('rightContent');
        if (rightContent) {
            // Полностью очищаем правую часть
            rightContent.innerHTML = '';

            // Вызываем функцию из company-buttons.js для восстановления кнопок
            if (typeof window.createCompanyButtons === 'function') {
                window.createCompanyButtons();
            } else {
                // Если функция не загружена, подгружаем скрипт
                console.warn('⚠️ createCompanyButtons не найден, подгружаем...');
                const script = document.createElement('script');
                script.src = '/crm/company/right/buttons/company-buttons.js';
                script.onload = function () {
                    setTimeout(() => {
                        if (typeof window.createCompanyButtons === 'function') {
                            window.createCompanyButtons();
                        }
                    }, 100);
                };
                document.body.appendChild(script);
            }
        }
        isVisible = false;
    };

    // ============================================
    // ЭКСПОРТ ФУНКЦИЙ (добавьте новые)
    // ============================================
    window.showAddPaymentForm = window.showAddPaymentForm;
    window.showEditPaymentForm = window.showEditPaymentForm;
    window.deletePaymentGroup = window.deletePaymentGroup;
    window.savePaymentRequisites = window.savePaymentRequisites;
    window.closePaymentForm = window.closePaymentForm;
    window.selectDistributor = window.selectDistributor;
    window.linkToDistributor = window.linkToDistributor;
    window.unlinkFromDistributor = window.unlinkFromDistributor;
    window.filterDistributorList = window.filterDistributorList;
    window.toggleDistributorDropdown = window.toggleDistributorDropdown;
    window.openDistributorDropdown = window.openDistributorDropdown;

    // ============================================
    // ИНИЦИАЛИЗАЦИЯ
    // ============================================
    console.log('Модуль реквизитов инициализирован');

})();