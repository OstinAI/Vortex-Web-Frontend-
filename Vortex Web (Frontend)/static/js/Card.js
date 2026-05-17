// Глобальные переменные
let isManagementMode = false;
let selectedItems = []; // Список того, что клиент «купил»
let allItems = [];

const HISTORY_FIELD_KEY = "purchases_history"; // Ключ для авто-поля

// 1. Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Сначала базовые загрузки
    loadCardDetails();
    loadClientName();
    loadCustomFields();
    checkPermissions();
    initResizers();
    loadSavedSizes();
    initHorizontalResizers();
    loadSavedWidths();
    initPurchasesSection();
    loadSalesData();
    loadResponsibleUsers();

    // 2. Индикаторы (запуск сразу)
    updateCardClock();
    updateCardTaskIndicator();
    updateCardPaymentIndicator();

    // 3. Работа с историей и сотрудниками
    await loadUsersToTaskSelect();
    loadClientHistory();

    // 4. Таймеры обновления
    setInterval(updateCardClock, 1000);
    setInterval(updateCardTaskIndicator, 30000);
    setInterval(updateCardPaymentIndicator, 30000);

    // --- НОВОЕ: Обработка Enter для быстрой оплаты ---
    const amountInput = document.getElementById('manual-payment-amount');
    const commentInput = document.getElementById('manual-payment-comment');

    if (amountInput && commentInput) {
        [amountInput, commentInput].forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addManualPayment();
                }
            });
        });
    }
});

// --- НОВЫЕ ФУНКЦИИ ДЛЯ АВТО-ПОЛЯ И ИСТОРИИ ---

async function initPurchasesSection() {
    const fieldId = await getOrCreateHistoryField();
    if (fieldId) {
        await loadHistoryFromCustomField(fieldId);
    }
}

// Автоматическое создание поля в базе, если его нет
async function getOrCreateHistoryField() {
    const token = localStorage.getItem('vortex_token');
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/crm/fields`, { headers });
        const data = await res.json();

        let field = data.fields.find(f => f.key === HISTORY_FIELD_KEY);
        if (field) return field.id;

        // Если поля нет, создаем его программно
        const createRes = await fetch(`${API_BASE_URL}/api/crm/fields`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                scope_type: "company",
                scope_id: 0,
                key: HISTORY_FIELD_KEY,
                title: "История покупок (Системное)",
                type: "text",
                order_index: 999
            })
        });
        const createData = await createRes.json();
        return createData.field_id;
    } catch (e) {
        console.error("Ошибка авто-создания поля:", e);
        return null;
    }
}

// Загрузка истории из этого спец-поля
async function loadHistoryFromCustomField(fieldId) {
    const clientId = new URLSearchParams(window.location.search).get('id');
    try {
        const response = await fetch(`${API_BASE_URL}/api/crm/clients/${clientId}/card`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await response.json();
        if (data.ok && data.values) {
            const historyValue = data.values.find(v => v.field_id === fieldId);
            if (historyValue && historyValue.value_text) {
                // Превращаем сохраненный JSON-текст обратно в список для экрана
                selectedItems = JSON.parse(historyValue.value_text);
                renderSelectedItems();
            }
        }
    } catch (e) { console.log("История пуста"); }
}

// --- ТВОИ СУЩЕСТВУЮЩИЕ ФУНКЦИИ (БЕЗ УДАЛЕНИЙ) ---

async function loadCardDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('id');
    const pipelineElement = document.getElementById('current-pipeline-name');
    const stageElement = document.getElementById('current-stage-name');

    if (!clientId || !pipelineElement || !stageElement) return;

    try {
        const cardRes = await fetch(`${API_BASE_URL}/api/crm/clients/${clientId}/card`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const cardData = await cardRes.json();

        if (cardData.ok && cardData.client) {
            // Сохраняем текущие ID в глобальные переменные
            currentSelectedPipelineId = cardData.client.pipeline_id;
            currentSelectedStageId = cardData.client.stage_id;

            // Загружаем названия воронки
            const pipeListRes = await fetch(`${API_BASE_URL}/api/crm/pipelines`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            });
            const pipeListData = await pipeListRes.json();

            if (pipeListData.ok) {
                const currentPipe = pipeListData.pipelines.find(p => p.id === currentSelectedPipelineId);
                const pName = currentPipe ? currentPipe.name.toUpperCase() : "ID: " + currentSelectedPipelineId;
                pipelineElement.innerText = pName;

                // ВАЖНО: сохраняем старое название и ID для сравнения
                pipelineElement.setAttribute('data-old-id', currentSelectedPipelineId);
                pipelineElement.setAttribute('data-old-name', pName);
            }

            // Загружаем названия этапа
            const stageRes = await fetch(`${API_BASE_URL}/api/crm/pipelines/${currentSelectedPipelineId}/stages`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            });
            const stageData = await stageRes.json();

            if (stageData.ok) {
                const currentStage = stageData.stages.find(s => s.id === currentSelectedStageId);
                const sName = currentStage ? currentStage.name.toUpperCase() : "ЭТАП " + currentSelectedStageId;
                stageElement.innerText = sName;

                // ВАЖНО: сохраняем старое название и ID для сравнения
                stageElement.setAttribute('data-old-id', currentSelectedStageId);
                stageElement.setAttribute('data-old-name', sName);
            }
        }
    } catch (error) {
        console.error("Ошибка загрузки данных:", error);
    }
}

async function loadClientName() {
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('id');
    const clientElement = document.getElementById('current-client-name');
    if (!clientId || !clientElement) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/crm/clients/${clientId}/card`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await response.json();
        if (data.ok && data.client) { clientElement.innerText = data.client.name.toUpperCase(); }
    } catch (error) { console.error("Ошибка имени клиента:", error); }
}

async function loadCustomFields() {
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('id');
    const container = document.getElementById('custom-fields-container');
    if (!clientId || !container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/crm/clients/${clientId}/card`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await response.json();

        if (data.ok && data.fields) {
            container.innerHTML = '';

            data.fields.forEach(field => {
                // 1. Скрываем системное поле истории из общего списка
                if (field.key === HISTORY_FIELD_KEY) return;

                const valObj = data.values ? data.values.find(v => v.field_id === field.id) : null;
                let fieldInputHtml = "";

                // Логика отрисовки инпутов в зависимости от типа
                if (field.type === 'date') {
                    let dateString = "";
                    if (valObj && valObj.value_ts_ms) {
                        const d = new Date(valObj.value_ts_ms);
                        dateString = d.toISOString().slice(0, 16);
                    }
                    // Добавлен data-old-value
                    fieldInputHtml = `<input type="datetime-local" class="field-input custom-field-input" data-field-id="${field.id}" data-field-type="date" data-old-value="${dateString}" value="${dateString}">`;
                }
                else if (field.type === 'bool') {
                    const isChecked = valObj && valObj.value_bool ? 'checked' : '';
                    const oldValBool = valObj && valObj.value_bool ? 'true' : 'false';
                    // Добавлен data-old-value
                    fieldInputHtml = `
                        <div class="vortex-chipset">
                            <input type="checkbox" class="vortex-toggle custom-field-input" data-field-id="${field.id}" data-field-type="bool" data-old-value="${oldValBool}" ${isChecked}>
                            <span class="chipset-label">${field.title}</span>
                        </div>`;
                }
                else {
                    const displayValue = valObj ? (valObj.value_text || valObj.value_number || "") : "";
                    // Добавлен data-old-value
                    fieldInputHtml = `<input type="${field.type === 'number' ? 'number' : 'text'}" class="field-input custom-field-input" data-field-id="${field.id}" data-field-type="${field.type}" data-old-value="${displayValue}" value="${displayValue}" placeholder="Пусто...">`;
                }

                // 2. Добавляем иконки управления (Карандаш и Крестик)
                // Модификация: Добавлены атрибуты draggable и data-field-id на весь контейнер field-item
                const fieldHtml = `
                    <div class="field-item" draggable="true" data-field-id="${field.id}">
                        <div style="display: flex; align-items: center;">
                            <label class="field-label" style="cursor: grab;">${field.title}</label>
                            <span class="edit-pen-icon" onclick="renameFieldPrompt(${field.id}, '${field.title}')" style="cursor: pointer;">✎</span>
                            <span class="delete-field-btn" onclick="confirmDeleteField(${field.id})" style="cursor: pointer;">✖</span>
                        </div>
                        ${fieldInputHtml}
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', fieldHtml);
            });

            // Навешиваем Drag-and-Drop события на свежесозданные элементы
            initFieldsDragAndDrop(container);
        }
    } catch (error) {
        console.error("Ошибка загрузки полей:", error);
    }
}

async function saveChanges() {
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('id');
    if (!clientId) return;

    const saveBtn = document.querySelector('.vortex-btn-save');
    const inputs = document.querySelectorAll('.custom-field-input');
    const valuesToSave = [];
    const changesLog = []; // Массив для хранения строк изменений

    inputs.forEach(input => {
        const fieldId = input.getAttribute('data-field-id');
        const fieldType = input.getAttribute('data-field-type');
        const oldValue = input.getAttribute('data-old-value') || "";

        // Получаем заголовок поля из label
        const parent = input.closest('.field-item') || input.closest('.vortex-chipset');
        let fieldTitle = "Поле";
        if (parent) {
            const labelEl = parent.querySelector('.field-label') || parent.querySelector('.chipset-label');
            if (labelEl) fieldTitle = labelEl.innerText.trim();
        }

        let newVal;
        if (fieldType === 'bool') {
            newVal = input.checked;
        } else {
            newVal = input.value;
        }

        // Сравниваем старое и новое (приводим к строке для корректного сравнения)
        if (String(newVal) !== String(oldValue)) {
            let displayOld = oldValue || "пусто";
            let displayNew = newVal || "пусто";

            // Если это чекбокс, меняем true/false на Да/Нет
            if (fieldType === 'bool') {
                displayOld = oldValue === "true" ? "ДА" : "НЕТ";
                displayNew = newVal ? "ДА" : "НЕТ";
            }

            changesLog.push(`${fieldTitle}: ${displayOld} → ${displayNew}`);

            // Обновляем "старое" значение на новое на случай повторного сохранения без перезагрузки
            input.setAttribute('data-old-value', newVal);
        }

        // Формируем массив для отправки на сервер
        let saveVal = (fieldType === 'number') ? parseFloat(newVal) :
            (fieldType === 'date' ? new Date(newVal).getTime() : newVal);

        valuesToSave.push({ field_id: parseInt(fieldId), value: saveVal });
    });

    try {
        await savePipelineMove();

        const response = await fetch(`${API_BASE_URL}/api/crm/clients/${clientId}/values`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values: valuesToSave })
        });

        if (response.ok) {
            // Если были реальные изменения, отправляем системную заметку
            if (changesLog.length > 0) {
                const logDescription = `Обновлены данные:\n${changesLog.join('\n')}`;

                await fetch(`${API_BASE_URL}/api/notes/`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        client_id: parseInt(clientId),
                        description: logDescription,
                        type: "system"
                    })
                });
            }

            // Эффект кнопки
            if (saveBtn) {
                const oldT = saveBtn.innerText;
                saveBtn.classList.add('success-flash');
                saveBtn.innerText = "ГОТОВО!";
                setTimeout(() => {
                    saveBtn.classList.remove('success-flash');
                    saveBtn.innerText = oldT;
                }, 800);
            }

            await loadClientHistory(); // Обновляем ленту в реальном времени
        }
    } catch (error) {
        console.error("Ошибка сохранения:", error);
    }
}

function toggleManagementMode() {
    isManagementMode = !isManagementMode;
    const body = document.body;
    const editBtn = document.getElementById('admin-edit-btn');

    // Находим наш новый контейнер с кнопкой
    const addFieldContainer = document.getElementById('add-field-btn-container');
    // Находим все иконки редактирования и удаления
    const managementControls = document.querySelectorAll('.delete-field-btn, .edit-pen-icon');

    if (isManagementMode) {
        body.classList.add('management-active');
        if (editBtn) {
            editBtn.classList.add('btn-active-mode');
            editBtn.innerText = 'ВЫЙТИ';
        }

        // ПОКАЗЫВАЕМ кнопку добавления поля
        if (addFieldContainer) {
            addFieldContainer.style.display = 'block';
        }

        // Показываем карандаши и крестики
        managementControls.forEach(el => {
            el.style.display = 'inline-block';
        });

    } else {
        body.classList.remove('management-active');
        if (editBtn) {
            editBtn.classList.remove('btn-active-mode');
            editBtn.innerText = 'УПРАВЛЕНИЕ';
        }

        // СКРЫВАЕМ кнопку добавления поля
        if (addFieldContainer) {
            addFieldContainer.style.display = 'none';
        }

        // Скрываем инструменты
        managementControls.forEach(el => {
            el.style.display = 'none';
        });
    }
}

async function saveNewField() {
    const title = document.getElementById('new-field-title').value.trim();
    const type = document.getElementById('new-field-type').value;
    if (!title) return alert("Введите название поля");
    try {
        const fieldData = { scope_type: "company", scope_id: 0, key: "c_" + Date.now(), title: title, type: type, required: false, order_index: 100, options_json: "[]" };
        const response = await fetch(`${API_BASE_URL}/api/crm/fields`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(fieldData)
        });
        if ((await response.json()).ok) { closeFieldModal(); loadCustomFields(); }
    } catch (error) { console.error(error); }
}

async function renameFieldPrompt(fieldId, currentTitle) {
    const newTitle = prompt("Введите новое название для поля:", currentTitle);
    if (newTitle && newTitle !== currentTitle) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/crm/fields`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: fieldId, title: newTitle, scope_type: "company", key: "k_" + fieldId })
            });
            if ((await response.json()).ok) loadCustomFields();
        } catch (error) { console.error(error); }
    }
}

function checkPermissions() {
    const userRole = localStorage.getItem('role');
    const editBtn = document.getElementById('admin-edit-btn');
    if (editBtn && (userRole === 'Admin' || userRole === 'Integrator')) { editBtn.style.display = 'block'; }
}

function openFieldModal() { document.getElementById('field-modal').style.display = 'block'; }
function closeFieldModal() { document.getElementById('field-modal').style.display = 'none'; document.getElementById('new-field-title').value = ''; }
function showSuccessStatus() {
    const btn = document.querySelector('.vortex-btn-save');
    const oldText = btn.innerText; btn.innerText = "СОХРАНЕНО!";
    setTimeout(() => btn.innerText = oldText, 2000);
}

function initResizers() {
    const resizers = document.querySelectorAll('.sector-resizer');
    resizers.forEach(resizer => {
        resizer.addEventListener('mousedown', (e) => {
            const targetEl = document.getElementById(resizer.getAttribute('data-target'));
            const startY = e.pageY; const startH = targetEl.getBoundingClientRect().height;
            const onMove = (me) => {
                const h = startH + (me.pageY - startY);
                if (h > 50) { targetEl.style.height = h + 'px'; targetEl.style.flex = 'none'; }
            };
            const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); saveSizes(); };
            document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
        });
    });
}

function saveSizes() {
    const sizes = { top: document.getElementById('sector-top').style.height, middle: document.getElementById('sector-middle').style.height };
    localStorage.setItem('vortex_crm_sector_sizes', JSON.stringify(sizes));
}

function loadSavedSizes() {
    const saved = JSON.parse(localStorage.getItem('vortex_crm_sector_sizes') || '{}');
    if (saved.top) { document.getElementById('sector-top').style.height = saved.top; document.getElementById('sector-top').style.flex = 'none'; }
    if (saved.middle) { document.getElementById('sector-middle').style.height = saved.middle; document.getElementById('sector-middle').style.flex = 'none'; }
}

// --- ФУНКЦИИ ТОВАРОВ И ОПЛАТЫ ---

// 1. Открытие окна с выбором типа (kind)
// --- ОБНОВЛЁННАЯ ФУНКЦИЯ ОТКРЫТИЯ ОКНА (Kind: 'product' или 'service') ---
async function openProductPicker(kind = 'product') {
    // Используем новые классы
    const modal = document.getElementById('product-picker-modal');
    if (!modal) return;
    modal.style.display = 'block';

    // Сбрасываем количество на 1
    const qtyInput = document.getElementById('picker-qty');
    if (qtyInput) qtyInput.value = 1;

    // Меняем заголовок
    const titleEl = document.getElementById('picker-title');
    if (titleEl) titleEl.innerText = kind === 'product' ? 'ВЫБОР ТОВАРА' : 'ВЫБОР УСЛУГИ';

    const container = document.getElementById('server-products-list');
    container.innerHTML = '<div style="color:#555; padding:20px; text-align:center; font-size:12px; letter-spacing:1px;">ЗАГРУЗКА...</div>';

    // Определяем эндпоинт
    const endpoint = kind === 'product' ? '/api/inventory/products' : '/api/inventory/services';

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await response.json();

        if (data.ok) {
            container.innerHTML = '';
            const items = kind === 'product' ? data.products : data.services;

            if (!items || items.length === 0) {
                container.innerHTML = '<div style="color:#444; padding:20px; text-align:center; font-size:12px;">СПИСОК ПУСТ</div>';
                return;
            }

            // Формируем список
            // Внутри функции openProductPicker при формировании HTML:
            items.forEach(prod => {
                const price = prod.price || prod.base_price || 0;
                const formattedPrice = new Intl.NumberFormat('ru-RU').format(price);

                const item = document.createElement('div');
                item.className = 'picker-item-v2';
                item.onclick = () => {
                    const qty = parseFloat(document.getElementById('picker-qty').value) || 1;
                    addProductToClient(prod.id, prod.title, price, kind, qty);
                };

                // Весь текст теперь белый/серый, без фиолетовых оттенков
                item.innerHTML = `
        <div style="display: flex; flex-direction: column;">
            <span class="item-title-v2">${prod.title}</span>
            <span class="item-category-v2" style="color: #444;">${kind === 'product' ? 'СКЛАД' : 'УСЛУГА'}</span>
        </div>
        <span class="item-price-v2" style="color: #00E5FF;">${formattedPrice} ₸</span>
    `;
                container.appendChild(item);
            });
        }
    } catch (e) {
        console.error("Ошибка API:", e);
        container.innerHTML = '<div style="color:#ff4444; padding:20px; text-align:center; font-size:12px;">ОШИБКА СВЯЗИ</div>';
    }
}

// --- ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ КНОПОК КОЛИЧЕСТВА ---
function changePickerQty(delta) {
    const qtyInput = document.getElementById('picker-qty');
    if (!qtyInput) return;
    let currentQty = parseInt(qtyInput.value) || 1;
    currentQty += delta;

    if (currentQty < 1) currentQty = 1; // Минимум 1
    qtyInput.value = currentQty;
}

// Обновляем функцию закрытия, если классы поменялись
function closeProductPicker() {
    const modal = document.getElementById('product-picker-modal');
    if (modal) modal.style.display = 'none';
}

// 2. Добавление в карточку и запуск списания
function addProductToClient(productId, name, price, type, qty) {
    const clientId = new URLSearchParams(window.location.search).get('id');

    // Сохраняем объект в локальный массив карточки
    selectedItems.push({
        product_id: productId,
        name: name,
        price: parseFloat(price),
        type: type,
        qty: qty,
        date: new Date().toLocaleDateString()
    });

    renderSelectedItems(); // Твоя функция отрисовки списка
    saveHistoryToCustomField(); // Сохранение в доп. поле CRM

    // Списание со склада происходит ТОЛЬКО для товаров (product)
    if (type === 'product' && productId) {
        decreaseStock(productId, clientId, name, price, qty);
    }

    closeProductPicker();
}

// 3. Исправленное списание (теперь с учетом QTY)
async function decreaseStock(productId, clientId, name, price, qty) {
    const token = localStorage.getItem('vortex_token');
    const WAREHOUSE_ID = 6; // Твой рабочий ID склада из логов

    try {
        const response = await fetch(`${API_BASE_URL}/api/inventory/movements`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                warehouse_id: Number(WAREHOUSE_ID),
                product_id: Number(productId),
                movement_type: "OUT",
                qty: parseFloat(qty), // ПЕРЕДАЕМ ВЫБРАННОЕ КОЛИЧЕСТВО
                unit_cost: parseFloat(price),
                reason: `Продажа CRM (Веб). Клиент: ${clientId}`,
                ref_type: "sale",
                ref_id: Number(clientId)
            })
        });

        const data = await response.json();
        if (!data.ok) {
            console.error("Склад отклонил операцию:", data.message);
            alert("Склад: " + data.message);
        }
    } catch (e) {
        console.error("Сбой сети:", e);
    }
}
// Модифицированная функция ручного ввода
async function addManualPayment() {
    const amountInput = document.getElementById('manual-payment-amount');
    const commentInput = document.getElementById('manual-payment-comment');
    const clientId = new URLSearchParams(window.location.search).get('id');
    // Получаем имя текущего сотрудника
    const userName = localStorage.getItem('vortex_user_name') || localStorage.getItem('role') || 'Сотрудник';

    if (!amountInput.value || !clientId) return alert("Введите сумму");

    const sum = amountInput.value;
    const comment = commentInput.value || "Услуга";
    const newItem = {
        name: comment,
        price: parseFloat(sum),
        date: new Date().toLocaleDateString()
    };

    selectedItems.push(newItem);
    renderSelectedItems();

    try {
        await saveHistoryToCustomField();

        // Отправляем системное сообщение с указанием сотрудника и пометкой для фильтра
        await fetch(`${API_BASE_URL}/api/notes/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: parseInt(clientId),
                // Добавляем префикс [ОПЛАТА], чтобы фильтру было легче найти эту запись
                description: `[ОПЛАТА] ${sum} ₸ (${comment}). Добавил: ${userName}`,
                type: "system"
            })
        });

        await loadClientHistory();
        if (typeof loadSalesData === "function") await loadSalesData();

        amountInput.value = '';
        commentInput.value = '';

    } catch (e) {
        console.error("Ошибка при добавлении оплаты:", e);
    }
}

// Вспомогательная функция для записи истории в базу
async function saveHistoryToCustomField() {
    const clientId = new URLSearchParams(window.location.search).get('id');
    const fieldId = await getOrCreateHistoryField();
    if (!fieldId) return;

    try {
        await fetch(`${API_BASE_URL}/api/crm/clients/${clientId}/values`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                values: [{ field_id: fieldId, value: JSON.stringify(selectedItems) }]
            })
        });
        // Также дублируем в инвентарь для статистики (опционально)
        saveTransactionToCRM();
    } catch (e) { console.error("Ошибка сохранения истории:", e); }
}

function renderSelectedItems() {
    const container = document.getElementById('selected-products-list');
    const totalEl = document.getElementById('total-client-amount');
    if (!container) return;

    container.innerHTML = '';
    let total = 0;

    selectedItems.forEach((item, index) => {
        total += item.price;
        const rowHtml = `
            <div class="product-row">
                <span>
                    ${item.name} (${item.date})
                    <span class="delete-item-btn" onclick="deletePurchaseItem(${index})">✖</span>
                </span>
                <span class="price-tag">${item.price.toLocaleString()} ₸</span>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', rowHtml);
    });
    totalEl.innerText = total.toLocaleString();
    updateDashboardCharts(); // ДОБАВИТЬ ТУТ для графика оплат
}

// Функция удаления элемента из истории
async function deletePurchaseItem(index) {
    if (!confirm("Удалить эту запись об оплате?")) return;

    const clientId = new URLSearchParams(window.location.search).get('id');

    // Получаем данные удаляемого элемента перед тем, как удалить его из массива
    const itemToDelete = selectedItems[index];
    const itemName = itemToDelete.name || "Услуга";
    const itemPrice = itemToDelete.price || 0;

    // 1. Удаляем из локального массива (визуально на экране)
    selectedItems.splice(index, 1);

    // 2. Перерисовываем список товаров и сумму на экране
    renderSelectedItems();

    try {
        // 3. Сохраняем обновленный JSON в кастомное поле на сервер
        await saveHistoryToCustomField();

        // 4. ПРИНУДИТЕЛЬНО отправляем запись в системную ленту об удалении
        // Используем логику создания из notes_bp.py
        await fetch(`${API_BASE_URL}/api/notes/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: parseInt(clientId),
                description: `Удалена оплата: ${itemName} на сумму ${itemPrice} ₸`,
                type: "system" // Помечаем как системную запись для отображения в ленте
            })
        });

        // --- ОБНОВЛЕНИЕ В РЕАЛЬНОМ ВРЕМЕНИ ---

        // 5. Сразу обновляем ленту событий, чтобы увидеть запись об удалении
        await loadClientHistory();

        // 6. Обновляем общую сумму задолженности/оплат
        if (typeof loadSalesData === "function") {
            await loadSalesData();
        }

    } catch (e) {
        console.error("Ошибка при удалении записи и обновлении лога:", e);
        alert("Запись удалена локально, но произошла ошибка при обновлении сервера");
    }
}

async function saveTransactionToCRM() {
    const clientId = new URLSearchParams(window.location.search).get('id');
    const totalAmount = selectedItems.reduce((sum, item) => sum + item.price, 0);
    try {
        await fetch(`${API_BASE_URL}/api/inventory/sales/pay`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_id: parseInt(clientId), total: totalAmount, paid: totalAmount })
        });
    } catch (e) { console.error(e); }
}

function closeProductPicker() {
    const modal = document.getElementById('product-picker-modal');
    if (modal) modal.style.display = 'none';
}

async function loadSalesData() {
    const clientId = new URLSearchParams(window.location.search).get('id');
    const totalEl = document.getElementById('total-client-amount');
    if (!clientId || !totalEl) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/inventory/sales/pay?client_id=${clientId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await response.json();
        if (data.ok) { totalEl.innerText = parseFloat(data.total || 0).toLocaleString(); }
    } catch (e) { console.error(e); }
}

async function loadClientPurchases() {
    const clientId = new URLSearchParams(window.location.search).get('id');
    if (!clientId) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/inventory/sales/services?client_id=${clientId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await response.json();
        if (data.ok && data.items) {
            // Если есть данные в инвентаре, можно объединить, но мы приоритетно грузим из Custom Field выше
        }
    } catch (e) { console.error(e); }
}

// Функция для удаления (деактивации) поля на сервере
async function confirmDeleteField(fieldId) {
    // 1. Спрашиваем подтверждение, чтобы не удалить случайно
    if (!confirm("Вы уверены, что хотите удалить это поле? Оно исчезнет из карточки.")) return;

    try {
        // 2. Отправляем запрос на сервер по эндпоинту из твоего fields_bp
        // Путь: /api/crm/fields/<id>/disable
        const response = await fetch(`${API_BASE_URL}/api/crm/fields/${fieldId}/disable`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok && result.ok) {
            console.log(`Поле ${fieldId} успешно деактивировано`);
            // 3. Перезагружаем список полей, чтобы удаленное поле исчезло с экрана
            await loadCustomFields();
        } else {
            // Если сервер вернул ошибку (например, нет прав)
            alert("Ошибка при удалении: " + (result.message || "Доступ запрещен"));
        }
    } catch (e) {
        console.error("Критическая ошибка при удалении поля:", e);
        alert("Проблема с сетью или сервером");
    }
}

// Добавьте это в ваш общий блок инициализации (DOMContentLoaded)
document.addEventListener('DOMContentLoaded', () => {
    // ... ваши старые функции (loadCardDetails, initResizers и т.д.)
    initHorizontalResizers();
    loadSavedWidths();
});

// Функция для изменения ширины зон
function initHorizontalResizers() {
    const resizers = document.querySelectorAll('.vortex-resizer-h');

    resizers.forEach(resizer => {
        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const targetId = resizer.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            const startX = e.pageX;
            const startWidth = targetEl.getBoundingClientRect().width;

            resizer.classList.add('is-dragging');

            const onMouseMove = (moveEvent) => {
                const deltaX = moveEvent.pageX - startX;
                const newWidth = startWidth + deltaX;

                // Изменили лимит со 150 до 80, чтобы панель физически можно было сжать сильнее
                if (newWidth > 80) {
                    targetEl.style.width = newWidth + 'px';
                    targetEl.style.flex = 'none'; // Фиксируем ширину

                    // --- ХИТРЫЙ БЛЮР ДЛЯ ЛЕВОЙ ПАНЕЛИ ---
                    if (targetId === 'zone-left') {
                        if (newWidth <= 180) {
                            targetEl.classList.add('column-blurred');
                        } else {
                            targetEl.classList.remove('column-blurred');
                        }
                    }
                }
            };

            const onMouseUp = () => {
                resizer.classList.remove('is-dragging');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                saveWidths(); // Сохраняем состояние
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    });
}

// Функции сохранения и загрузки ширины в localStorage
function saveWidths() {
    const widths = {
        left: document.getElementById('zone-left').style.width,
        center: document.getElementById('resizable-container').style.width
    };
    localStorage.setItem('vortex_crm_widths', JSON.stringify(widths));
}

function loadSavedWidths() {
    const saved = JSON.parse(localStorage.getItem('vortex_crm_widths') || '{}');
    if (saved.left) {
        const el = document.getElementById('zone-left');
        el.style.width = saved.left;
        el.style.flex = 'none';

        // --- ПРОВЕРКА БЛЮРА ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ---
        // Если из памяти восстановилась узкая колонка — сразу вешаем блюр
        if (parseInt(saved.left) <= 180) {
            el.classList.add('column-blurred');
        }
    }
    if (saved.center) {
        const el = document.getElementById('resizable-container');
        el.style.width = saved.center;
        el.style.flex = 'none';
    }
}

// 1. Загрузка назначенных сотрудников для этого клиента
// Глобальная переменная для кэша сотрудников (как ResponsibleCandidates в C#)
let allEmployeesCache = [];

// 1. Функция загрузки списка ответственных (Полный аналог десктопной логики)
async function loadResponsibleUsers() {
    const clientId = new URLSearchParams(window.location.search).get('id');
    const container = document.getElementById('responsible-users-list');
    if (!clientId || !container) return;

    try {
        // ШАГ А: Сначала загружаем ВСЕХ сотрудников (если еще не загрузили)
        // Аналог Api_LoadEmployeesForResponsibleAsync
        if (allEmployeesCache.length === 0) {
            const respEmp = await fetch(`${API_BASE_URL}/api/employees/list`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            });
            const dataEmp = await respEmp.json();
            allEmployeesCache = dataEmp.employees || dataEmp.users || [];
        }

        // ШАГ Б: Загружаем только ID назначенных сотрудников
        // Аналог Api_LoadAssignmentsAsync
        const response = await fetch(`${API_BASE_URL}/api/crm/clients/${clientId}/assignments`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await response.json();

        // Десктоп ищет поле user_ids
        const assignedIds = data.user_ids || [];

        if (assignedIds.length === 0) {
            container.innerHTML = '<div class="empty-state">Ответственные не назначены</div>';
            return;
        }

        container.innerHTML = '';

        // ШАГ В: Сопоставляем ID с именами из кэша
        assignedIds.forEach(userId => {
            const emp = allEmployeesCache.find(x => x.id == userId);
            if (!emp) return; // Если сотрудник не найден в общем списке

            const row = document.createElement('div');
            row.className = 'product-row';

            // Используем full_name или username как в десктопе
            const displayName = emp.full_name || emp.username || "Сотрудник";

            row.innerHTML = `
                <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; padding: 5px 0;">
                    <span>
                        <i class="fas fa-user-shield" style="margin-right: 8px; color: var(--vortex-accent); opacity: 0.8;"></i>
                        <span style="color: #fff; font-weight: 500;">${displayName}</span>
                        <span class="delete-item-btn" onclick="deleteAssignment(${emp.id})" 
                              style="margin-left:12px; cursor:pointer; color: #ff4444;" title="Удалить">✖</span>
                    </span>
                    <small style="color: var(--vortex-accent); opacity: 0.6; text-transform: uppercase; font-size: 9px;">
                        ${emp.role || 'ответственный'}
                    </small>
                </div>
            `;
            container.appendChild(row);
        });
    } catch (e) {
        console.error("Ошибка загрузки ответственных:", e);
    }
}

// 2. Исправленная функция назначения (теперь отправляет массив user_ids)
async function assignUserToClient(userId) {
    const clientId = new URLSearchParams(window.location.search).get('id');

    try {
        const currentResp = await fetch(`${API_BASE_URL}/api/crm/clients/${clientId}/assignments`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const currentData = await currentResp.json();
        let ids = currentData.user_ids || [];

        if (!ids.includes(userId)) {
            ids.push(userId);
        }

        const response = await fetch(`${API_BASE_URL}/api/crm/clients/${clientId}/assignments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_ids: ids })
        });

        if ((await response.json()).ok) {
            closeUserPicker();
            await loadResponsibleUsers();

            // --- ОБНОВЛЕНИЕ В РЕАЛЬНОМ ВРЕМЕНИ ---
            await loadClientHistory(); // Подгружаем запись "Ответственный добавлен"
        }
    } catch (e) {
        console.error("Ошибка при назначении:", e);
    }
}

// 2. Открыть список всех сотрудников компании
async function openUserPicker() {
    document.getElementById('user-picker-modal').style.display = 'block';
    const container = document.getElementById('server-users-list');
    container.innerHTML = '<div style="color:white; padding:10px;">Загрузка...</div>';

    try {
        const token = localStorage.getItem('vortex_token');
        const clientId = new URLSearchParams(window.location.search).get('id');
        const headers = { 'Authorization': `Bearer ${token}` };

        // 1. Получаем список всех сотрудников компании
        const respUsers = await fetch(`${API_BASE_URL}/api/employees/list`, { headers });
        const dataUsers = await respUsers.json();

        // 2. Получаем текущие назначения (user_ids), как это делает десктоп
        const respAssign = await fetch(`${API_BASE_URL}/api/crm/clients/${clientId}/assignments`, { headers });
        const dataAssign = await respAssign.json();

        // В десктопной версии сервер возвращает объект с массивом user_ids
        const assignedIds = dataAssign.user_ids || [];

        if (dataUsers.status === "ok" && dataUsers.employees) {
            container.innerHTML = '';

            // 3. ФИЛЬТРАЦИЯ по двум критериям:
            // - Сотрудника еще нет в списке назначенных (assignedIds)
            // - Роль сотрудника не "Integrator" (как в десктопной версии)
            const availableEmployees = dataUsers.employees.filter(emp => {
                const isAssigned = assignedIds.includes(emp.id);
                const isIntegrator = (emp.role || "").trim().toLowerCase() === "integrator";
                return !isAssigned && !isIntegrator;
            });

            if (availableEmployees.length === 0) {
                container.innerHTML = '<div style="color:white; padding:10px; text-align:center;">Нет доступных сотрудников для назначения</div>';
                return;
            }

            // 4. Отрисовка списка
            availableEmployees.forEach(user => {
                const item = document.createElement('div');
                item.className = 'server-product-item';

                // Используем full_name или username, приоритеты как в десктопе
                const displayName = user.full_name || user.username || "Сотрудник";

                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <span>${displayName}</span>
                        <small style="opacity: 0.5; font-size: 10px; text-transform: uppercase;">${user.role || ''}</small>
                    </div>
                `;

                // Двойной клик для назначения, как вы просили ранее
                item.ondblclick = () => assignUserToClient(user.id);
                container.appendChild(item);
            });
        }
    } catch (e) {
        console.error("Ошибка при подборе сотрудников:", e);
        container.innerHTML = '<div style="color:white; padding:10px;">Ошибка загрузки списка</div>';
    }
}

// 4. Удалить ответственное лицо
async function deleteAssignment(userIdToDelete) {
    if (!confirm("Удалить ответственного?")) return;

    const clientId = new URLSearchParams(window.location.search).get('id');

    try {
        const currentResp = await fetch(`${API_BASE_URL}/api/crm/clients/${clientId}/assignments`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const currentData = await currentResp.json();
        let ids = currentData.user_ids || [];

        const updatedIds = ids.filter(id => id != userIdToDelete);

        const response = await fetch(`${API_BASE_URL}/api/crm/clients/${clientId}/assignments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_ids: updatedIds })
        });

        const result = await response.json();
        if (result.ok || result.status === "ok") {
            await loadResponsibleUsers();

            // --- ОБНОВЛЕНИЕ В РЕАЛЬНОМ ВРЕМЕНИ ---
            await loadClientHistory(); // Подгружаем запись "Ответственный убран"
        } else {
            alert("Ошибка сервера: " + (result.message || "Не удалось сохранить изменения"));
        }
    } catch (e) {
        console.error("Ошибка при удалении ответственного:", e);
        alert("Проблема с соединением");
    }
}

function closeUserPicker() {
    document.getElementById('user-picker-modal').style.display = 'none';
}

let pipelinesCache = [];

// Получаем название этапа по ID воронки и ID статуса
async function getStepName(pipelineId, statusId) {
    try {
        if (pipelinesCache.length === 0) {
            const resp = await fetch(`${API_BASE_URL}/api/crm/pipelines`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            });
            const data = await resp.json();
            pipelinesCache = data.pipelines || [];
        }

        const pipeline = pipelinesCache.find(p => p.id == pipelineId);
        if (!pipeline) return "Этап " + statusId;

        const step = pipeline.steps.find(s => s.id == statusId);
        return step ? step.name : "Этап " + statusId;
    } catch (e) {
        return "Этап " + statusId;
    }
}

let currentSelectedPipelineId = 0;
let currentSelectedStageId = 0;


// 2. Выбор воронки (сразу загружает первый этап этой воронки)
async function selectPipeline(id, name) {
    currentSelectedPipelineId = id;
    document.getElementById('current-pipeline-name').innerText = name.toUpperCase();
    document.getElementById('pipeline-dropdown').style.display = 'none';

    // После выбора воронки принудительно открываем выбор этапа
    await toggleStageDropdown(id);
}

// 1. Показать список воронок (Независимо)
async function togglePipelineDropdown() {
    const dropdown = document.getElementById('pipeline-dropdown');
    if (dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
        return;
    }
    document.getElementById('stage-dropdown').style.display = 'none';

    try {
        const response = await fetch(`${API_BASE_URL}/api/crm/pipelines`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await response.json();

        if (data.ok && data.pipelines) {
            dropdown.innerHTML = '';
            data.pipelines.forEach(p => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.innerText = p.name.toUpperCase();
                item.onclick = async () => {
                    currentSelectedPipelineId = p.id;
                    document.getElementById('current-pipeline-name').innerText = p.name.toUpperCase();
                    dropdown.style.display = 'none';

                    // При смене воронки десктоп обычно ставит первый этап
                    await autoFetchFirstStage(p.id);
                };
                dropdown.appendChild(item);
            });
            dropdown.style.display = 'block';
        }
    } catch (e) { console.error("Ошибка загрузки воронок", e); }
}

// Вспомогательная функция для сброса этапа при смене воронки
async function autoFetchFirstStage(pipeId) {
    const response = await fetch(`${API_BASE_URL}/api/crm/pipelines/${pipeId}/stages`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
    });
    const data = await response.json();
    if (data.ok && data.stages.length > 0) {
        const firstStage = data.stages[0];
        selectStage(firstStage.id, firstStage.name);
    }
}

// 2. Показать список этапов (Независимо)
async function toggleStageDropdown() {
    const dropdown = document.getElementById('stage-dropdown');
    if (dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
        return;
    }
    document.getElementById('pipeline-dropdown').style.display = 'none';

    // Используем уже сохраненный ID воронки (либо из базы, либо из нового выбора)
    if (!currentSelectedPipelineId) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/crm/pipelines/${currentSelectedPipelineId}/stages`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await response.json();

        if (data.ok && data.stages) {
            dropdown.innerHTML = '';
            data.stages.forEach(s => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.innerText = s.name.toUpperCase();
                item.onclick = () => selectStage(s.id, s.name);
                dropdown.appendChild(item);
            });
            dropdown.style.display = 'block';
        }
    } catch (e) { console.error("Ошибка загрузки этапов", e); }
}

// 4. Выбор этапа
function selectStage(id, name) {
    currentSelectedStageId = id;
    document.getElementById('current-stage-name').innerText = name.toUpperCase();
    document.getElementById('stage-dropdown').style.display = 'none';
    // Здесь мы просто обновили UI. Сохранение произойдет при нажатии кнопки "СОХРАНИТЬ"
}

// 5. Модифицируем saveChanges для отправки воронки и этапа (как Api_MoveClientAsync)
// Добавь этот блок внутрь своей функции saveChanges()
async function savePipelineMove() {
    const clientId = new URLSearchParams(window.location.search).get('id');
    const pipelineElement = document.getElementById('current-pipeline-name');
    const stageElement = document.getElementById('current-stage-name');

    // Берем старые данные из атрибутов
    const oldPipeId = pipelineElement.getAttribute('data-old-id');
    const oldStageId = stageElement.getAttribute('data-old-id');
    const oldPipeName = pipelineElement.getAttribute('data-old-name');
    const oldStageName = stageElement.getAttribute('data-old-name');

    // Новые данные (те, что сейчас в глобальных переменных после выбора в выпадашке)
    const newPipeId = currentSelectedPipelineId;
    const newStageId = currentSelectedStageId;
    const newPipeName = pipelineElement.innerText;
    const newStageName = stageElement.innerText;

    // Проверяем, изменились ли ID
    const isChanged = (String(oldPipeId) !== String(newPipeId)) || (String(oldStageId) !== String(newStageId));

    if (!isChanged) return; // Если ничего не меняли, выходим

    try {
        // 1. Отправляем запрос на перемещение (бэкенд crm_clients_bp)
        const response = await fetch(`${API_BASE_URL}/api/crm/clients/${clientId}/move`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pipeline_id: parseInt(newPipeId),
                stage_id: parseInt(newStageId)
            })
        });

        if (response.ok) {
            // 2. Формируем текст для истории
            let logText = "Перемещение: ";
            if (String(oldPipeId) !== String(newPipeId)) {
                logText += `Воронка "${oldPipeName}" → "${newPipeName}". `;
            }
            if (String(oldStageId) !== String(newStageId)) {
                logText += `Этап "${oldStageName}" → "${newStageName}".`;
            }

            // 3. Отправляем системную заметку
            await fetch(`${API_BASE_URL}/api/notes/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: parseInt(clientId),
                    description: logText,
                    type: "system"
                })
            });

            // Обновляем старые значения в атрибутах, чтобы при следующем сохранении не дублировать лог
            pipelineElement.setAttribute('data-old-id', newPipeId);
            pipelineElement.setAttribute('data-old-name', newPipeName);
            stageElement.setAttribute('data-old-id', newStageId);
            stageElement.setAttribute('data-old-name', newStageName);

            // Мгновенно обновляем ленту
            await loadClientHistory();
        }
    } catch (e) {
        console.error("Ошибка перемещения:", e);
    }
}

window.onclick = function (event) {
    if (!event.target.matches('.vortex-pipeline-name') && !event.target.matches('.vortex-stage-label')) {
        document.getElementById('pipeline-dropdown').style.display = 'none';
        document.getElementById('stage-dropdown').style.display = 'none';
    }
}

function openChat() { console.log("Чат"); }
function openMail() { console.log("Почта"); }
function openTasks() { console.log("Задачи"); }
function openNotes() { console.log("Заметка"); }


// Глобальная функция для открытия модального окна комментария
function openComments() {
    const modal = document.getElementById('comment-modal');
    const textArea = document.getElementById('comment-text-input');
    if (modal && textArea) {
        textArea.value = ''; // Очищаем поле при открытии
        modal.style.display = 'block';
        textArea.focus(); // Сразу ставим фокус
    }
}

// Функция закрытия окна
function closeCommentModal() {
    const modal = document.getElementById('comment-modal');
    if (modal) modal.style.display = 'none';
}

// Функция сохранения комментария на сервер (аналог Api_SaveClientCommentsAsync)
async function saveComment() {
    const clientId = new URLSearchParams(window.location.search).get('id');
    const text = document.getElementById('comment-text-input').value.trim();

    if (!text || !clientId) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/notes/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: parseInt(clientId),
                description: text,
                type: "comment"
            })
        });

        const result = await response.json();
        if (result.ok) {
            closeCommentModal();
            // КРИТИЧНО: Вызываем функцию, которая перерисовывает правую панель/ленту
            loadClientHistory();
        }
    } catch (e) {
        console.error("Ошибка:", e);
    }
}

// Закрытие окна при клике мимо (добавь в общий блок window.onclick, если он есть)
window.addEventListener('click', function (event) {
    const modal = document.getElementById('comment-modal');
    if (event.target === modal) {
        closeCommentModal();
    }
});

async function loadComments() {
    const clientId = new URLSearchParams(window.location.search).get('id');
    const response = await fetch(`${API_BASE_URL}/api/notes/?client_id=${clientId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
    });
    const data = await response.json();

    if (data.ok) {
        // Фильтруем только те, у которых type === "comment"
        const comments = data.notes.filter(n => n.type === "comment");
        // Отрисовка в твой контейнер комментариев...
    }
}

/**
 * Глобальные переменные (должны быть в самом верху Card.js)
 */
// let allItems = []; // Убедитесь, что эта строка есть в начале файла!

async function loadClientHistory() {
    const clientId = new URLSearchParams(window.location.search).get('id');
    const mainLog = document.getElementById('right-panel-display');
    const pinnedArea = document.getElementById('pinned-notes-container');

    if (!clientId || !mainLog || !pinnedArea) return;

    try {
        const [notesRes, tasksRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/notes/?client_id=${clientId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            }),
            fetch(`${API_BASE_URL}/api/tasks/?client_id=${clientId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            })
        ]);

        const notesData = await notesRes.json();
        const tasksData = await tasksRes.json();

        // ОЧИЩАЕМ И НАПОЛНЯЕМ ГЛОБАЛЬНЫЙ МАССИВ
        // Мы убрали 'let', чтобы данные были доступны функциям графиков
        allItems = [];

        if (notesData.ok && notesData.notes) {
            allItems = allItems.concat(notesData.notes);
        }

        if (tasksData.ok && tasksData.tasks) {
            const mappedTasks = tasksData.tasks.map(t => ({ ...t, type: 'task' }));
            allItems = allItems.concat(mappedTasks);
        }

        mainLog.innerHTML = '';
        pinnedArea.innerHTML = '';

        // Сортировка по дате обновления или создания
        allItems.sort((a, b) => {
            const timeA = a.updated_ts_ms || a.created_ts_ms || 0;
            const timeB = b.updated_ts_ms || b.created_ts_ms || 0;
            return timeB - timeA;
        });

        const now = Date.now();

        allItems.forEach(item => {
            const dateStr = new Date(item.created_ts_ms).toLocaleString('ru-RU');
            const decodedText = fixEncoding(item.description);
            const element = document.createElement('div');

            // 1. ЗАКРЕПЛЕННЫЕ ЗАМЕТКИ
            if (item.type === 'note') {
                const [title, ...descParts] = decodedText.split(' | ');
                const body = descParts.join(' | ');
                const safeTitle = title.replace(/'/g, "\\'").replace(/"/g, "&quot;");
                const safeBody = body.replace(/'/g, "\\'").replace(/"/g, "&quot;");

                element.className = 'history-item is-pinned-note';
                element.style.cursor = 'pointer';
                element.setAttribute('onclick', `editNote(${item.id}, '${safeTitle}', '${safeBody}')`);

                element.innerHTML = `
                    <div class="history-meta">
                        <span class="history-date">${dateStr}</span>
                        <span class="note-badge">ЗАМЕТКА</span>
                    </div>
                    <span class="note-caption">📍 ${title}</span>
                    <div class="note-body">${body}</div>
                `;
                pinnedArea.appendChild(element);
            }
            // 2. ЗАДАЧИ
            else if (item.type === 'task') {
                const isDone = item.status === 'done';
                const isOverdue = item.start_ts_ms && item.start_ts_ms < now && !isDone;

                const title = item.title || "Без названия";
                const body = item.description || "";
                const deadlineStr = item.start_ts_ms ? new Date(item.start_ts_ms).toLocaleString('ru-RU') : "Срок не задан";

                const assigneeId = (item.assignees && item.assignees.length > 0) ? item.assignees[0] : null;
                const assigneeName = assigneeId ? employeesCache[assigneeId] : null;
                const responsibleHtml = assigneeName ? `<span style="margin-left: 10px;">👤 ${assigneeName}</span>` : '';

                let taskAccentColor = "#FF9800";
                if (isDone) taskAccentColor = "#28a745";
                if (isOverdue) taskAccentColor = "#ff4d4d";

                const safeTitle = title.replace(/'/g, "\\'").replace(/"/g, "&quot;");
                const safeBody = body.replace(/'/g, "\\'").replace(/"/g, "&quot;");
                const isoDeadline = item.start_ts_ms ? new Date(item.start_ts_ms).toISOString().slice(0, 16) : '';

                element.className = `history-item is-task-item ${isDone ? 'task-completed' : ''} ${isOverdue ? 'task-overdue' : ''}`;

                // --- ИЗМЕНЕНИЯ ЗДЕСЬ ---
                if (isOverdue) {
                    element.style.cursor = 'not-allowed'; // Курсор "запрещено"
                    element.style.opacity = '0.8';        // Немного приглушим цвет
                    // НЕ добавляем onclick, если задача просрочена
                } else {
                    element.style.cursor = 'pointer';
                    element.setAttribute('onclick', `editTask(${item.id}, '${safeTitle}', '${safeBody}', '${isoDeadline}', '${assigneeId || ''}')`);
                }
                // -----------------------

                element.style.borderLeft = `3px solid ${taskAccentColor}`;

                if (assigneeName) {
                    element.setAttribute('data-author', assigneeName.toUpperCase());
                }

                element.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1;">
                            <div class="history-meta" style="margin-bottom: 5px;">
                                <span class="history-date">${dateStr}</span>
                                <span class="system-badge" style="
                                    background: ${isDone ? 'rgba(40, 167, 69, 0.1)' : 'rgba(255, 152, 0, 0.1)'}; 
                                    border-color: ${taskAccentColor}; 
                                    color: ${taskAccentColor} !important; 
                                    font-weight: bold;">
                                    ${isDone ? 'ВЫПОЛНЕНО ✓' : (isOverdue ? 'ПРОСРОЧЕНО ⚠' : 'ЗАДАЧА')}
                                </span>
                            </div>
                            <div style="color: ${taskAccentColor}; font-weight: 800; font-size: 13px; text-decoration: ${isDone ? 'line-through' : 'none'};">
                                📌 ${title}
                            </div>
                            <div style="color: ${isDone ? '#666' : '#eee'}; font-size: 12px; margin-top: 2px;">${body}</div>
                            <div style="margin-top: 8px; font-size: 11px; color: ${taskAccentColor}; opacity: 0.8;">
                                📅 Срок: ${deadlineStr} ${responsibleHtml}
                            </div>
                        </div>
                        ${(!isDone && !isOverdue) ? `
                            <button class="mini-btn" 
                                    style="background: #28a745; color: white; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 4px; border: none; margin-left: 15px; cursor: pointer;" 
                                    onclick="event.stopPropagation(); completeTask(${item.id})">
                                ✓
                            </button>
                        ` : ''}
                    </div>
                `;
                mainLog.appendChild(element);
            }
            // 3. КОММЕНТАРИИ, СИСТЕМА И ОПЛАТЫ
            else {
                element.className = 'history-item';
                const isComment = item.type === 'comment';
                const isPayment = decodedText.includes('[ОПЛАТА]') || decodedText.includes('Добавлена оплата');

                let badgeHtml = '';
                let textStyle = '';

                if (isPayment) {
                    badgeHtml = `<span class="system-badge" style="background: rgba(40, 167, 69, 0.1); border-color: #28a745; color: #28a745; font-weight: bold;">ОПЛАТА</span>`;
                    textStyle = 'color: #28a745; font-weight: 500;';
                    element.style.borderLeft = '3px solid #28a745';
                } else if (isComment) {
                    badgeHtml = `<span class="comment-badge" style="background: rgba(255, 235, 59, 0.1); border-color: #fdd835; color: #fdd835; font-weight: bold;">КОММЕНТАРИЙ</span>`;
                } else {
                    badgeHtml = `<span class="system-badge">СИСТЕМА</span>`;
                }

                element.innerHTML = `
                    <div class="history-meta">
                        <span class="history-date">${dateStr}</span>
                        ${badgeHtml}
                    </div>
                    <div class="history-text" style="${textStyle}">${decodedText}</div>
                `;
                mainLog.appendChild(element);
            }
        });

        mainLog.scrollTop = 0;

        // ВЫЗОВ ФУНКЦИЙ ОБНОВЛЕНИЯ
        applyFilter();
        updateDashboardCharts();
        updateTopIndicators();

    } catch (e) {
        console.error("Ошибка загрузки истории и задач:", e);
    }
}


/**
 * Исправляет кодировку текста, если сервер прислал UTF-8 байты 
 * в виде строки (классическая проблема "РґРѕР±Р°РІР»РµРЅ").
 */
function fixEncoding(text) {
    if (!text) return "";

    // 1. Проверяем, есть ли признаки "битой" кодировки (символы Р, С и т.д.)
    if (!/[РСЂСЃ]/.test(text)) return text;

    try {
        // 2. Пытаемся декодировать через байты (самый частый случай)
        const bytes = new Uint8Array(Array.from(text).map(c => c.charCodeAt(0) & 0xFF));
        const decoded = new TextDecoder('utf-8').decode(bytes);

        // Если результат содержит русскую кириллицу — успех
        if (/[а-яА-ЯёЁ]/.test(decoded)) return decoded;
    } catch (e) {
        console.warn("Ошибка первичного декодирования");
    }

    // 3. РЕЗЕРВНЫЙ ВАРИАНТ: Ручная замена (если сервер шлет двойное кодирование)
    // Этот метод исправляет "РґРѕР±Р°РІР»РµРЅ" -> "добавлен"
    const map = {
        'Р°': 'а', 'Р±': 'б', 'РІ': 'в', 'Рі': 'г', 'Рґ': 'д', 'Рµ': 'е', 'С‘': 'ё', 'Р¶': 'ж', 'Р·': 'з', 'Рё': 'и', 'Р№': 'й',
        'Рє': 'к', 'Р»': 'л', 'Рј': 'м', 'РЅ': 'н', 'Рѕ': 'о', 'Рї': 'п', 'СЂ': 'р', 'СЃ': 'с', 'С‚': 'т', 'Сѓ': 'у', 'С„': 'ф',
        'С…': 'х', 'С†': 'ц', 'С‡': 'ч', 'С€': 'ш', 'С‰': 'щ', 'СЉ': 'ъ', 'С‹': 'ы', 'СЊ': 'ь', 'СЌ': 'э', 'СЋ': 'ю', 'СЏ': 'я',
        'Рђ': 'А', 'Р‘': 'Б', 'Р’': 'В', 'Р“': 'Г', 'Р”': 'Д', 'Р•': 'Е', 'РЃ': 'Ё', 'Р¶': 'Ж', 'Р—': 'З', 'Р˜': 'И', 'Р™': 'Й',
        'Рљ': 'К', 'Р›': 'Л', 'Рњ': 'М', 'Рќ': 'Н', 'Рћ': 'О', 'Рџ': 'П', 'Р ': 'Р', 'РЎ': 'С', 'Рў': 'Т', 'РЈ': 'У', 'Р¤': 'Ф',
        'РҐ': 'Х', 'Р¦': 'Ц', 'Р§': 'Ч', 'РЁ': 'Ш', 'Р©': 'Щ', 'РЄ': 'Ъ', 'Р«': 'Ы', 'Р¬': 'Ь', 'Р­': 'Э', 'Р®': 'Ю', 'РЇ': 'Я'
    };

    let result = text;
    for (const [key, value] of Object.entries(map)) {
        result = result.split(key).join(value);
    }

    return result;
}

/**
 * Открывает модальное окно для создания закрепленной заметки
 */
function openNotes() {
    const modal = document.getElementById('note-modal');
    const modalHeader = document.getElementById('note-modal-header');
    const deleteBtn = document.getElementById('delete-note-btn');
    const editIdInput = document.getElementById('edit-note-id');

    if (modal) {
        // 1. Устанавливаем заголовок "Новая заметка"
        if (modalHeader) modalHeader.innerText = "НОВАЯ ЗАМЕТКА";

        // 2. Очищаем скрытый ID (чтобы система поняла, что это создание, а не редактирование)
        if (editIdInput) editIdInput.value = '';

        // 3. Очищаем поля ввода
        document.getElementById('note-title-input').value = '';
        document.getElementById('note-text-input').value = '';

        // 4. Прячем кнопку удаления (при создании новой она не нужна)
        if (deleteBtn) deleteBtn.style.display = 'none';

        // 5. Показываем модальное окно
        modal.style.display = 'flex';

        // 6. Ставим фокус на заголовок
        setTimeout(() => {
            document.getElementById('note-title-input').focus();
        }, 100);
    }
}

/**
 * Закрывает модальное окно заметки
 */
function closeNoteModal() {
    const modal = document.getElementById('note-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Сохраняет заметку с типом "note"
 */
async function saveNote() {
    const noteId = document.getElementById('edit-note-id').value;
    const clientId = new URLSearchParams(window.location.search).get('id');
    const title = document.getElementById('note-title-input').value.trim();
    const text = document.getElementById('note-text-input').value.trim();

    if (!title || !text) return alert("Заполните заголовок и описание!");

    // Если noteId есть — это обновление (маршрут /id), если нет — создание (маршрут /)
    const url = noteId ? `${API_BASE_URL}/api/notes/${noteId}` : `${API_BASE_URL}/api/notes/`;

    // ВАЖНО: Твой бэкенд ожидает POST для обоих случаев!
    const method = 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: parseInt(clientId),
                description: `${title} | ${text}`,
                type: "note"
            })
        });

        if (response.ok) {
            closeNoteModal();
            loadClientHistory();
        } else {
            const err = await response.json();
            alert("Ошибка: " + (err.message || "Не удалось сохранить"));
        }
    } catch (e) {
        console.error("Ошибка запроса:", e);
    }
}

function editNote(id, title, body) {
    const modal = document.getElementById('note-modal');
    document.getElementById('note-modal-header').innerText = "РЕДАКТИРОВАНИЕ ЗАМЕТКИ";
    document.getElementById('edit-note-id').value = id;
    document.getElementById('note-title-input').value = title;
    document.getElementById('note-text-input').value = body;

    // Показываем кнопку удаления
    document.getElementById('delete-note-btn').style.display = 'block';

    modal.style.display = 'flex';
}

async function deleteNote() {
    const noteId = document.getElementById('edit-note-id').value;
    if (!noteId) return;

    if (!confirm("Вы уверены, что хотите удалить эту заметку?")) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });

        if (response.ok) {
            closeNoteModal();
            loadClientHistory();
        } else {
            alert("Ошибка при удалении");
        }
    } catch (e) { console.error(e); }
}

// 0. Кэш сотрудников (добавь в самое начало Card.js)
let employeesCache = {};

/**
 * Открывает модальное окно для создания НОВОЙ задачи
 */
async function openTasks() {
    const modal = document.getElementById('task-modal');
    if (!modal) return;

    // 1. Очистка ID и полей
    const idInput = document.getElementById('edit-task-id');
    if (idInput) idInput.value = '';

    document.getElementById('task-title-input').value = '';
    document.getElementById('task-text-input').value = '';

    // Работа с календарем
    const deadlineInput = document.getElementById('task-deadline');
    if (deadlineInput) {
        deadlineInput.value = '';
        deadlineInput.onkeydown = function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.blur();
            }
        };
        deadlineInput.onclick = function () {
            if (this.value) {
                this.blur();
            }
        };
    }

    // 2. Сброс заголовка
    const header = modal.querySelector('.elegant-modal-header');
    if (header) {
        header.innerText = "ПОСТАНОВКА ЗАДАЧИ";
        header.style.color = "#00E5FF";
    }

    const select = document.getElementById('task-assignee-select');
    if (select) select.value = '';

    // 3. Сначала загружаем сотрудников, чтобы они были в кэше для отображения имен
    await loadUsersToTaskSelect();

    // 4. Показываем модальное окно
    modal.style.display = 'flex';
}

/**
 * Загружает список сотрудников с сервера и заполняет кэш имен
 */
async function loadUsersToTaskSelect() {
    const select = document.getElementById('task-assignee-select');
    if (!select) return;

    const url = `${API_BASE_URL}/api/employees/list`;

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await response.json();

        if (data.status === "ok" && data.employees) {
            select.innerHTML = '<option value="">Без исполнителя</option>';

            data.employees.forEach(user => {
                // Сохраняем в кэш для loadClientHistory
                employeesCache[user.id] = user.full_name || user.username;

                if ((user.role || "").toLowerCase() !== "integrator") {
                    const opt = document.createElement('option');
                    opt.value = user.id;
                    opt.textContent = user.full_name || user.username;
                    select.appendChild(opt);
                }
            });
        }
    } catch (e) {
        console.error("Ошибка загрузки сотрудников:", e);
        select.innerHTML = '<option value="">Ошибка загрузки</option>';
    }
}

function closeTaskModal() {
    document.getElementById('task-modal').style.display = 'none';
}


async function saveTask() {
    const taskId = document.getElementById('edit-task-id').value;
    const clientId = new URLSearchParams(window.location.search).get('id');
    const title = document.getElementById('task-title-input').value.trim();
    const description = document.getElementById('task-text-input').value.trim();
    const deadlineVal = document.getElementById('task-deadline').value;
    const assigneeId = document.getElementById('task-assignee-select').value;

    if (!title) return alert("Введите название задачи!");

    const deadlineMs = deadlineVal ? new Date(deadlineVal).getTime() : 0;
    const url = taskId ? `${API_BASE_URL}/api/tasks/${taskId}` : `${API_BASE_URL}/api/tasks/`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: parseInt(clientId),
                title: title,
                description: description,
                start_ts_ms: deadlineMs,
                status: "open",
                assignees: assigneeId ? [parseInt(assigneeId)] : []
            })
        });

        if (response.ok) {
            if (taskId) {
                // ИСПРАВЛЕННАЯ ЛОГИКА ОПРЕДЕЛЕНИЯ ИМЕНИ:
                // Пытаемся взять имя, если нет — берем роль, если нет — пишем "ID пользователя"
                const userName = localStorage.getItem('vortex_user_name') ||
                    localStorage.getItem('role') ||
                    "Сотрудник";

                await fetch(`${API_BASE_URL}/api/notes/`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        client_id: parseInt(clientId),
                        description: `Задача "${title}" была изменена: ${userName}`,
                        type: "system"
                    })
                });
            }
            closeTaskModal();
            loadClientHistory();
        }
    } catch (e) { console.error("Ошибка сохранения:", e); }
}

// Вспомогательная функция для системного лога (в таблицу notes)
async function createSystemLog(clientId, text) {
    try {
        await fetch(`${API_BASE_URL}/api/notes/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: parseInt(clientId),
                description: text,
                type: "system" // Сообщение пойдет в общую ленту
            })
        });
    } catch (e) { console.error("Ошибка лога:", e); }
}

// Вспомогательные функции для чистоты кода (чтобы не дублировать логику)
function renderNote(note, container, dateStr) {
    const decoded = fixEncoding(note.description);
    const [title, ...descParts] = decoded.split(' | ');
    const body = descParts.join(' | ');
    const el = document.createElement('div');
    el.className = 'history-item is-pinned-note';
    el.innerHTML = `
        <div class="history-meta"><span class="history-date">${dateStr}</span><span class="note-badge">ЗАМЕТКА</span></div>
        <span class="note-caption">📍 ${title}</span>
        <div class="note-body">${body}</div>
    `;
    container.appendChild(el);
}

function renderSystemOrComment(note, container, dateStr) {
    const el = document.createElement('div');
    el.className = 'history-item';
    const decoded = fixEncoding(note.description);
    el.innerHTML = `
        <div class="history-meta">
            <span class="history-date">${dateStr}</span>
            ${note.type === 'comment' ? '<span class="comment-badge">КОММЕНТАРИЙ</span>' : '<span class="system-badge">СИСТЕМА</span>'}
        </div>
        <div class="history-text">${decoded}</div>
    `;
    container.appendChild(el);
}

// Открытие модалки для редактирования
async function editTask(id, title, desc, deadline, assigneeId) {
    const modal = document.getElementById('task-modal');
    document.querySelector('#task-modal .elegant-modal-header').innerText = "РЕДАКТИРОВАНИЕ ЗАДАЧИ";

    let idInput = document.getElementById('edit-task-id');
    if (!idInput) {
        idInput = document.createElement('input');
        idInput.type = 'hidden';
        idInput.id = 'edit-task-id';
        document.getElementById('task-modal').appendChild(idInput);
    }
    idInput.value = id;

    document.getElementById('task-title-input').value = title;
    document.getElementById('task-text-input').value = desc;
    document.getElementById('task-deadline').value = deadline;

    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Ждем загрузки списка сотрудников, прежде чем ставить значение
    await loadUsersToTaskSelect();

    const select = document.getElementById('task-assignee-select');
    if (select) {
        select.value = assigneeId; // Теперь значение применится корректно
    }

    modal.style.display = 'flex';
}

// Быстрое выполнение задачи (Лайк)
async function completeTask(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
            method: 'POST', // Твой бэкенд использует POST для обновления
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: "done" }) //
        });
        if (response.ok) loadClientHistory();
    } catch (e) { console.error(e); }
}


/**
 * Добавляем логику быстрого закрытия календаря
 */
function setupCalendarListeners() {
    const deadlineInput = document.getElementById('task-deadline');

    if (deadlineInput) {
        // Вариант 1: Двойной клик по полю закрывает выбор (фокус уходит)
        deadlineInput.addEventListener('dblclick', function () {
            this.blur(); // Снимаем фокус, что часто заставляет виджет закрыться
        });

        // Вариант 2: Авто-закрытие после выбора даты (самый удобный)
        // Как только дата выбрана полностью, календарь "отпускает" пользователя
        deadlineInput.addEventListener('change', function () {
            if (this.value) {
                // Небольшая задержка, чтобы пользователь увидел, что выбрал
                setTimeout(() => {
                    this.blur();
                }, 100);
            }
        });
    }
}

let tasksChartInstance = null;
let paymentsChartInstance = null;

/**
 * Вызывай эту функцию в конце loadClientHistory, 
 * чтобы все 4 графика обновлялись одновременно.
 */
function updateDashboardCharts() {
    renderTasksChart();       // Твой существующий
    renderPaymentsChart();    // Твой существующий
    renderResponsibilityRadar(); // Новый (код из предыдущего ответа)
    renderTimeToAction();        // Новый (код из предыдущего ответа)
}

/**
 * График задач: Неоновое кольцо
 */
function renderTasksChart() {
    const ctx = document.getElementById('tasksChart');
    if (!ctx) return;
    const canvasCtx = ctx.getContext('2d');

    const tasks = Array.from(document.querySelectorAll('.is-task-item'));
    const done = tasks.filter(t => t.classList.contains('task-completed')).length;
    const overdue = tasks.filter(t => t.classList.contains('task-overdue')).length;
    const todo = tasks.length - done - overdue;

    if (tasksChartInstance) tasksChartInstance.destroy();

    tasksChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Выполнено', 'Просрочено', 'В работе'],
            datasets: [{
                data: [done, overdue, todo],
                backgroundColor: ['#28a745', '#ff4d4d', '#FF9800'],
                hoverBackgroundColor: ['#34ce57', '#ff6b6b', '#ffb74d'],
                borderWidth: 2,
                borderColor: '#111',
                borderRadius: 5,
                spacing: 5
            }]
        },
        options: {
            cutout: '75%', // Делаем кольцо тоньше и изящнее
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#888', usePointStyle: true, pointStyle: 'circle', font: { size: 10, weight: 'bold' } }
                }
            }
        }
    });
}

/**
 * Гистограмма оплат: Стеклянные столбцы с градиентом
 */
function renderPaymentsChart() {
    const ctx = document.getElementById('paymentsChart');
    if (!ctx) return;
    const canvasCtx = ctx.getContext('2d');

    // Создаем градиент для столбцов
    const gradient = canvasCtx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(40, 167, 69, 0.8)'); // Яркий верх
    gradient.addColorStop(1, 'rgba(40, 167, 69, 0.1)'); // Прозрачный низ

    const labels = selectedItems.map(item => item.date);
    const amounts = selectedItems.map(item => item.price);

    if (paymentsChartInstance) paymentsChartInstance.destroy();

    paymentsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: amounts,
                backgroundColor: gradient,
                borderColor: '#28a745',
                borderWidth: 1,
                borderRadius: 4, // Скругление верхушек
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
                    ticks: { color: '#666', font: { size: 9 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#666', font: { size: 8 } }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#111',
                    titleColor: '#00E5FF',
                    bodyColor: '#fff',
                    borderColor: 'rgba(0, 229, 255, 0.2)',
                    borderWidth: 1,
                    displayColors: false
                }
            }
        }
    });
}

let radarChartInstance = null;
let timeChartInstance = null;

/**
 * 3. РАДАР КОМПЕТЕНЦИЙ (ВКЛАД КОМАНДЫ)
 * Показывает активность каждого ответственного по этому клиенту
 */
function renderResponsibilityRadar() {
    const ctx = document.getElementById('responsibilityRadar');
    if (!ctx) return;

    const empIds = Object.keys(employeesCache);
    if (empIds.length === 0) return;

    const labels = ['Задачи', 'Оплаты', 'Просрочено', 'В работе'];
    const combinedData = {};
    const items = Array.from(document.querySelectorAll('.history-item'));
    const now = Date.now();

    // 1. Предварительно подготавливаем структуру данных для уникальных имен
    empIds.forEach(id => {
        let name = employeesCache[id];
        let upperName = name.toUpperCase();
        let targetName = (upperName === 'ADMIN' || upperName.includes('АДМИН')) ? 'марк' : name;

        if (!combinedData[targetName]) {
            combinedData[targetName] = { tasks: 0, payments: 0, overdue: 0, inWork: 0 };
        }
    });

    // 2. ОДИН ПРОХОД ПО ИСТОРИИ (Считаем задачи, пропуская оплаты)
    items.forEach(i => {
        const text = i.innerText.toUpperCase();

        // Определяем, к какому целевому имени относится эта запись
        let targetName = null;
        for (const id of empIds) {
            const name = employeesCache[id];
            const upperName = name.toUpperCase();
            if (text.includes(upperName) || (upperName === 'ADMIN' && text.includes('АДМИН'))) {
                targetName = (upperName === 'ADMIN' || upperName.includes('АДМИН')) ? 'марк' : name;
                break;
            }
        }

        if (!targetName || !combinedData[targetName]) return;

        // --- ЛОГИКА ПОДСЧЕТА ЗАДАЧ ---

        // А. Выполненные задачи (Зеленые)
        if (i.classList.contains('task-completed')) {
            combinedData[targetName].tasks += 1;
        }

        // Б. Просроченные задачи (Красные)
        if (i.classList.contains('task-overdue')) {
            combinedData[targetName].overdue += 1;
        }

        // В. Задачи в работе (Не завершены и не просрочены)
        const isTaskText = text.includes('ЗАДАЧА') || text.includes('НУЖНО');
        if (isTaskText && !i.classList.contains('task-completed') && !i.classList.contains('task-overdue')) {
            combinedData[targetName].inWork += 1;
        }
    });

    // 3. СТРОГИЙ ПОДСЧЕТ ОПЛАТ (Берем из массива товаров, а не из текста истории)
    // Определяем, на кого записать оплаты (на того, кто сейчас в системе)
    const currentUserName = localStorage.getItem('vortex_user_name') || "марк";
    let activeName = (currentUserName.toUpperCase() === 'ADMIN' || currentUserName.toUpperCase().includes('АДМИН')) ? 'марк' : currentUserName;

    if (combinedData[activeName]) {
        // Сколько товаров в списке "ТОВАРЫ И ОПЛАТА", столько и на радаре
        combinedData[activeName].payments = selectedItems.length;
    }

    // Отрисовка
    const datasets = [];
    const colors = ['#00E5FF', '#FF9800', '#FF4D4D', '#BF40BF'];
    let colorIdx = 0;

    for (const [name, stats] of Object.entries(combinedData)) {
        // Гарантируем, что оплаты не упадут ниже нуля
        const safePayments = Math.max(0, stats.payments);

        if (stats.tasks > 0 || safePayments > 0 || stats.overdue > 0 || stats.inWork > 0) {
            const color = colors[colorIdx % colors.length];
            datasets.push({
                label: name.toUpperCase(),
                data: [stats.tasks, safePayments, stats.overdue, stats.inWork],
                backgroundColor: hexToRgbA(color, 0.3),
                borderColor: color,
                pointBackgroundColor: color,
                pointBorderColor: "#fff",
                pointRadius: 4,
                borderWidth: 2
            });
            colorIdx++;
        }
    }

    if (radarChartInstance) radarChartInstance.destroy();
    if (datasets.length === 0) return;

    radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    pointLabels: {
                        color: (ctx) => {
                            if (ctx.label === 'Просрочено') return '#FF4D4D';
                            if (ctx.label === 'В работе') return '#BF40BF';
                            return '#00E5FF';
                        },
                        font: { size: 10, weight: 'bold' }
                    },
                    ticks: { display: false },
                    suggestedMin: 0,
                    beginAtZero: true
                }
            },
            plugins: {
                legend: { position: 'bottom', labels: { color: '#888', font: { size: 10 } } }
            }
        }
    });
}
/**
 * 4. СКОРОСТЬ РЕАКЦИИ (Time-to-Action)
 * Анализирует время от создания задачи до её выполнения (в часах)
 */
function renderTimeToAction() {
    const ctx = document.getElementById('timeToActionChart');
    if (!ctx) return;

    // 1. Берем ТОЛЬКО выполненные задачи
    // Если updated_ts_ms отсутствует, используем текущее время как временную заглушку
    const completedTasks = allItems
        .filter(t => t.type === 'task' && t.status === 'done')
        .sort((a, b) => (a.updated_ts_ms || a.created_ts_ms) - (b.updated_ts_ms || b.created_ts_ms));

    if (completedTasks.length === 0) {
        console.log("Нет выполненных задач для графика скорости");
        return;
    }

    // 2. Формируем метки (номера задач) и вычисляем разницу
    const labels = completedTasks.map((_, i) => `№${i + 1}`);
    const durations = completedTasks.map(t => {
        const start = t.created_ts_ms;
        const end = t.updated_ts_ms || Date.now(); // Если нет времени закрытия, берем "сейчас"

        let diffHours = (end - start) / (1000 * 60 * 60);

        // Если задача закрыта мгновенно или время сбоит, ставим минимум 0.1 часа
        return diffHours > 0 ? parseFloat(diffHours.toFixed(1)) : 0.1;
    });

    if (timeChartInstance) timeChartInstance.destroy();

    const canvasCtx = ctx.getContext('2d');
    const gradient = canvasCtx.createLinearGradient(0, 0, 0, 150);
    gradient.addColorStop(0, 'rgba(0, 229, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 229, 255, 0)');

    timeChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Часов на задачу',
                data: durations,
                borderColor: '#00E5FF',
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#00E5FF',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                    ticks: { color: '#666', font: { size: 10 }, callback: (v) => v + 'ч' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#444', font: { size: 9 } }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#111',
                    titleColor: '#00E5FF',
                    callbacks: {
                        label: (context) => `Время выполнения: ${context.raw} ч.`
                    }
                }
            }
        }
    });
}

// Вспомогательная функция для прозрачности (добавьте её в конец файла)
function hexToRgbA(hex, alpha) {
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length == 3) { c = [c[0], c[0], c[1], c[1], c[2], c[2]]; }
        c = '0x' + c.join('');
        return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
    }
    return hex;
}

// 1. Глобальная переменная для фильтра
let currentFilterValue = 'all';

// 2. Функция открытия/закрытия
function toggleVortexFilter(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('vortex-filter-menu');
    const isVisible = menu.style.display === 'block';

    // Закрываем все другие открытые меню, если есть
    menu.style.display = isVisible ? 'none' : 'block';
}

// 3. Функция выбора (Клик по пункту)
function setVortexFilter(val, event) {
    if (event) event.stopPropagation(); // КРИТИЧНО: чтобы клик не улетел "сквозь" меню

    currentFilterValue = val;
    console.log("Выбран фильтр:", val);

    // Закрываем меню
    document.getElementById('vortex-filter-menu').style.display = 'none';

    // Запускаем твою родную функцию фильтрации
    applyFilter();
}

// 4. Обновленная функция applyFilter
function applyFilter() {
    const filterValue = currentFilterValue; // Берем из глобальной переменной
    const items = document.querySelectorAll('#right-panel-display .history-item');

    items.forEach(item => {
        // Если выбрано "ВСЕ", показываем без условий
        if (filterValue === 'all') {
            item.style.display = 'block';
            return;
        }

        // 1. Определяем базовые типы по классам
        const isTask = item.classList.contains('is-task-item');
        const isNote = item.classList.contains('is-pinned-note');

        // 2. Определяем содержимое через текст и бейджи
        const itemText = item.innerText.toUpperCase();

        // Ищем бейдж, чтобы понять тип (СИСТЕМА, КОММЕНТАРИЙ и т.д.)
        const badge = item.querySelector('.system-badge, .comment-badge, .note-badge');
        const badgeText = badge ? badge.innerText.trim().toUpperCase() : "";

        // Флаги категорий
        const isPayment = itemText.includes('[ОПЛАТА]') ||
            itemText.includes('ДОБАВЛЕНА ОПЛАТА') ||
            itemText.includes('УДАЛЕНА ОПЛАТА');

        const isComment = item.querySelector('.comment-badge') !== null;

        let visible = false;

        switch (filterValue) {
            case 'task':
                visible = isTask;
                break;
            case 'note':
                visible = isNote;
                break;
            case 'comment':
                visible = isComment;
                break;
            case 'payment':
                visible = isPayment;
                break;
            case 'system':
                // КРИТИЧНО: Система — это когда есть бейдж СИСТЕМА, 
                // но при этом это НЕ задача и НЕ оплата.
                visible = (badgeText === 'СИСТЕМА') && !isTask && !isPayment;
                break;
        }

        item.style.display = visible ? 'block' : 'none';
    });
}

/**
 * ИНДИКАТОРЫ ДЛЯ КОНКРЕТНОЙ КАРТОЧКИ КЛИЕНТА
 */

// 1. Часы (как на Dashboard)
function updateCardClock() {
    const clockEl = document.getElementById('txt-clock');
    const dateEl = document.getElementById('txt-date');
    if (!clockEl) return;

    const now = new Date();
    // Время
    clockEl.innerText = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    // Дата (ПН, 21.04)
    if (dateEl) {
        dateEl.innerText = now.toLocaleDateString('ru-RU', { weekday: 'short', day: '2-digit', month: '2-digit' }).toUpperCase();
    }
}

// 2. Ближайшая задача именно этого клиента
async function updateCardTaskIndicator() {
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('id');
    const el = document.getElementById('txt-task');

    if (!clientId || !el) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/tasks/?client_id=${clientId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await res.json();

        const now = Date.now();
        // Фильтруем: НЕ выполнены И время начала БОЛЬШЕ текущего (будущие задачи)
        const futureTasks = (data.tasks || []).filter(t =>
            t.status !== 'done' &&
            t.start_ts_ms > now
        );

        // Берем самую ближайшую из будущих
        const nearest = futureTasks.sort((a, b) => a.start_ts_ms - b.start_ts_ms)[0];

        if (nearest) {
            const title = nearest.title.length > 15 ? nearest.title.substring(0, 15) + '..' : nearest.title;
            el.innerText = title.toUpperCase();
            el.style.color = "#00E5FF"; // Всегда бирюзовый, так как задача будущая
        } else {
            el.innerText = "НЕТ ПЛАНОВ";
            el.style.color = "rgba(255,255,255,0.5)";
        }
    } catch (e) {
        el.innerText = "СБОЙ";
    }
}

// 3. Сумма оплат именно по этой карте
async function updateCardPaymentIndicator() {
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('id');
    const sumEl = document.getElementById('txt-client-sum');

    if (!clientId || !sumEl) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/inventory/sales/pay?client_id=${clientId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await res.json();

        const total = data.total || 0;
        sumEl.innerText = `${parseFloat(total).toLocaleString()} ₸`;

        // Очищаем верхнее поле (где был "Менеджер"), если оно есть
        const nameEl = document.getElementById('txt-manager-name');
        if (nameEl) nameEl.innerText = "";
    } catch (e) {
        sumEl.innerText = "0 ₸";
    }
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ПЕРЕМЕЩЕНИЯ (Добавь их ниже) ---

function initFieldsDragAndDrop(container) {
    const items = container.querySelectorAll('.field-item');

    items.forEach(item => {
        item.addEventListener('dragstart', () => {
            item.classList.add('dragging');
        });

        item.addEventListener('dragend', async () => {
            item.classList.remove('dragging');
            // Перезаписываем порядок на сервере сразу после отпускания мыши
            await saveFieldsNewOrder(container);
        });
    });

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingElement = document.querySelector('.dragging');
        if (!draggingElement) return;

        const afterElement = getDragAfterElement(container, e.clientY);
        if (afterElement == null) {
            container.appendChild(draggingElement);
        } else {
            container.insertBefore(draggingElement, afterElement);
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.field-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

async function saveFieldsNewOrder(container) {
    const fieldElements = container.querySelectorAll('.field-item[data-field-id]');
    const fieldIds = Array.from(fieldElements).map(el => parseInt(el.getAttribute('data-field-id')));

    try {
        // Было:
		// const response = await fetch(`${API_BASE_URL}/api/crm_card/fields/reorder`, {

		// НАДО СДЕЛАТЬ:
		const response = await fetch(`${API_BASE_URL}/api/crm/fields/reorder`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`
			},
			body: JSON.stringify({ field_ids: fieldIds })
		});
        const resData = await response.json();
        if (!resData.ok) {
            console.error("Не удалось сохранить порядок полей:", resData.message);
        }
    } catch (error) {
        console.error("Ошибка сети при изменении порядка полей:", error);
    }
}

