/**
 * CardFieldManager.js
 * Управление полями клиента: просмотр всех полей, создание, восстановление удаленных,
 * настройка прав доступа (замок) для каждого поля
 * 
 * ОТКРЫТИЕ: 
 * - По кнопке "+ ДОБАВИТЬ НОВОЕ ПОЛЕ" (в режиме управления)
 * - По двойному клику по заголовку "ИНФОРМАЦИЯ О КЛИЕНТЕ"
 */

(function () {
    'use strict';

    // ====================================================
    // 1. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
    // ====================================================
    let allFieldsData = [];
    let fieldLockStates = {};
    let currentClientFields = [];

    // ====================================================
    // 2. СОХРАНЕНИЕ (ДЛЯ КНОПКИ "СОХРАНИТЬ")
    // ====================================================

    window.saveChanges = async function () {
        const urlParams = new URLSearchParams(window.location.search);
        const clientId = urlParams.get('id');
        if (!clientId) return;

        const saveBtn = document.querySelector('.vortex-btn-save');
        const inputs = document.querySelectorAll('.custom-field-input');
        const valuesToSave = [];
        const changesLog = [];

        const userName = localStorage.getItem('vortex_user_name') ||
            localStorage.getItem('role') ||
            "Сотрудник";

        inputs.forEach(input => {
            const fieldId = input.getAttribute('data-field-id');
            if (fieldLockStates[fieldId] === true) {
                return;
            }

            const fieldType = input.getAttribute('data-field-type');
            const oldValue = input.getAttribute('data-old-value') || "";

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

            if (String(newVal) !== String(oldValue)) {
                let displayOld = oldValue || "пусто";
                let displayNew = newVal || "пусто";

                if (fieldType === 'bool') {
                    displayOld = oldValue === "true" ? "ДА" : "НЕТ";
                    displayNew = newVal ? "ДА" : "НЕТ";
                }

                changesLog.push(`${fieldTitle}: ${displayOld} → ${displayNew}`);
                input.setAttribute('data-old-value', newVal);
            }

            let saveVal = (fieldType === 'number') ? parseFloat(newVal) :
                (fieldType === 'date' ? new Date(newVal).getTime() : newVal);

            valuesToSave.push({ field_id: parseInt(fieldId), value: saveVal });
        });

        try {
            if (typeof savePipelineMove === 'function') {
                await savePipelineMove();
            }

            const response = await fetch(`${API_BASE_URL}/api/crm/clients/${clientId}/values`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ values: valuesToSave })
            });

            if (response.ok) {
                if (changesLog.length > 0) {
                    const logDescription = `${userName} изменил(а):\n${changesLog.join('\n')}`;
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

                if (saveBtn) {
                    const oldT = saveBtn.innerText;
                    saveBtn.classList.add('success-flash');
                    saveBtn.innerText = "ГОТОВО!";
                    setTimeout(() => {
                        saveBtn.classList.remove('success-flash');
                        saveBtn.innerText = oldT;
                    }, 800);
                }

                if (typeof loadClientHistory === 'function') {
                    await loadClientHistory();
                }
            }
        } catch (error) {
            console.error("Ошибка сохранения:", error);
        }
    };

    // ====================================================
    // 3. ИНИЦИАЛИЗАЦИЯ
    // ====================================================

    document.addEventListener('DOMContentLoaded', function () {
        // УДАЛЯЕМ ЭТОТ БЛОК - больше не открываем по двойному клику
        // const sectorTitle = document.querySelector('#sector-top .sector-title');
        // if (sectorTitle) {
        //     sectorTitle.style.cursor = 'pointer';
        //     sectorTitle.title = 'Двойной клик для управления полями';
        //     sectorTitle.addEventListener('dblclick', function (e) {
        //         e.stopPropagation();
        //         openFieldManager();
        //     });
        // }

        // ПЕРЕХВАТ КНОПКИ "+ ДОБАВИТЬ НОВОЕ ПОЛЕ"
        const addFieldContainer = document.getElementById('add-field-btn-container');
        if (addFieldContainer) {
            const addFieldBtn = addFieldContainer.querySelector('.mini-btn');
            if (addFieldBtn) {
                addFieldBtn.removeEventListener('click', openFieldManager);
                addFieldBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔘 Кнопка "+ ДОБАВИТЬ НОВОЕ ПОЛЕ" нажата');
                    openFieldManager();
                });
                console.log('✅ Перехват кнопки "+ ДОБАВИТЬ НОВОЕ ПОЛЕ" настроен');
            }
        }

        loadFieldLocks();
        console.log('🔍 CardFieldManager.js загружен');
        console.log('🔒 Блокировки из localStorage:', fieldLockStates);
    });

    // ====================================================
    // 4. ОТКРЫТИЕ/ЗАКРЫТИЕ МОДАЛЬНОГО ОКНА
    // ====================================================

    window.openFieldManager = async function () {
        console.log('🚀 openFieldManager вызван');

        let modal = document.getElementById('field-manager-modal');
        if (!modal) {
            console.log('📦 Создаем модальное окно динамически...');
            modal = createFieldManagerModal();
            document.body.appendChild(modal);
        }

        modal.style.display = 'flex';
        console.log('✅ Модальное окно открыто');

        await loadAllFieldsData();
        renderFieldManagerList('all');
        setupFilterHandlers();
    };

    window.closeFieldManager = function () {
        const modal = document.getElementById('field-manager-modal');
        if (modal) {
            modal.style.display = 'none';
            console.log('✅ Модальное окно закрыто');
        }
    };

    // ====================================================
    // 5. СОЗДАНИЕ МОДАЛЬНОГО ОКНА
    // ====================================================

    function createFieldManagerModal() {
        const modal = document.createElement('div');
        modal.id = 'field-manager-modal';
        modal.className = 'vortex-modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            z-index: 99999;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(12px);
        `;

        modal.innerHTML = `
            <div class="vortex-modal-content" style="
                background: linear-gradient(145deg, #0d0d0d 0%, #0a0a0a 100%);
                border: 1px solid rgba(0, 229, 255, 0.12);
                border-radius: 20px;
                max-width: 820px;
                width: 95%;
                max-height: 92vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 40px 100px rgba(0, 0, 0, 0.95), 0 0 80px rgba(0, 229, 255, 0.03);
                overflow: hidden;
            ">
                <!-- ШАПКА -->
                <div class="vortex-modal-header" style="
                    padding: 20px 28px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-shrink: 0;
                    background: rgba(0, 0, 0, 0.3);
                ">
                    <h2 style="
                        color: var(--vortex-accent, #00E5FF);
                        text-transform: uppercase;
                        font-size: 18px;
                        letter-spacing: 2px;
                        margin: 0;
                        font-weight: 700;
                    ">
                        УПРАВЛЕНИЕ ПОЛЯМИ
                    </h2>
                    <button onclick="closeFieldManager()" style="
                        background: rgba(255, 255, 255, 0.03);
                        border: 1px solid rgba(255, 255, 255, 0.06);
                        color: #555;
                        width: 36px;
                        height: 36px;
                        border-radius: 50%;
                        font-size: 20px;
                        cursor: pointer;
                        transition: all 0.25s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        line-height: 1;
                    " onmouseover="this.style.background='rgba(255,255,255,0.08)'; this.style.color='#fff'; this.style.borderColor='rgba(255,255,255,0.15)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'; this.style.color='#555'; this.style.borderColor='rgba(255,255,255,0.06)'">
                        ✕
                    </button>
                </div>

                <!-- ТЕЛО -->
                <div class="vortex-modal-body" style="
                    padding: 22px 28px 16px 28px;
                    overflow-y: auto;
                    flex: 1;
                ">
                    <!-- ФИЛЬТРЫ -->
<div class="field-manager-filters">
    <button class="fm-filter-btn active" data-filter="all">📋 Все поля</button>
    <button class="fm-filter-btn" data-filter="active">✅ Активные</button>
    <button class="fm-filter-btn" data-filter="locked">🔒 Заблок.</button>
    <button class="fm-filter-btn" data-filter="unlocked">🔓 Доступные</button>
    <button class="fm-filter-btn" data-filter="client">👤 У клиента</button>
</div>

                    <!-- СПИСОК ПОЛЕЙ -->
                    <div id="field-manager-list" style="
                        max-height: 420px;
                        overflow-y: auto;
                        margin-bottom: 16px;
                        padding-right: 4px;
                    ">
                        <div style="text-align: center; color: #444; padding: 30px; font-size: 11px;">ЗАГРУЗКА...</div>
                    </div>
                </div>

                <!-- ФУТЕР -->
<div class="vortex-modal-footer">
    <button class="btn-new-field" onclick="saveNewFieldFromManager()">+ НОВОЕ ПОЛЕ</button>
    <button class="btn-close-modal" onclick="closeFieldManager()">ЗАКРЫТЬ</button>
</div>
            </div>
        `;

        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                closeFieldManager();
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                closeFieldManager();
            }
        });

        return modal;
    }

    // ====================================================
    // 6. СОЗДАНИЕ НОВОГО ПОЛЯ (ВНУТРИ МОДАЛЬНОГО ОКНА)
    // ====================================================

    window.saveNewFieldFromManager = async function () {
        // Создаем простой prompt для ввода названия поля
        const title = prompt('Введите название нового поля:');
        if (!title || title.trim() === '') return;

        // Спрашиваем тип поля
        const typeOptions = {
            '1': 'text',
            '2': 'number',
            '3': 'date',
            '4': 'bool'
        };

        const typeChoice = prompt(
            'Выберите тип поля:\n' +
            '1 - Текст\n' +
            '2 - Число\n' +
            '3 - Дата\n' +
            '4 - Чипсет (Да/Нет)'
        );

        const type = typeOptions[typeChoice] || 'text';

        try {
            const fieldData = {
                scope_type: "company",
                scope_id: 0,
                key: "c_" + Date.now(),
                title: title.trim(),
                type: type,
                required: false,
                order_index: 100,
                options_json: "[]"
            };

            const response = await fetch(`${API_BASE_URL}/api/crm/fields`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(fieldData)
            });

            const result = await response.json();

            if (result.ok) {
                // Обновляем список полей
                await loadAllFieldsData();
                renderFieldManagerList();
                if (typeof loadCustomFields === 'function') {
                    loadCustomFields();
                }
                console.log(`✅ Поле "${title.trim()}" создано`);
            } else {
                alert('Ошибка: ' + (result.message || 'Не удалось создать поле'));
            }
        } catch (error) {
            console.error('Ошибка создания поля:', error);
            alert('Ошибка сети при создании поля');
        }
    };

    // ====================================================
    // 7. ЗАГРУЗКА ДАННЫХ
    // ====================================================

    async function loadAllFieldsData() {
        const clientId = new URLSearchParams(window.location.search).get('id');
        console.log('📡 Загрузка полей для клиента:', clientId);

        try {
            const response = await fetch(`${API_BASE_URL}/api/crm/fields`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`
                }
            });
            const data = await response.json();

            if (data.ok && data.fields) {
                allFieldsData = data.fields;

                if (clientId) {
                    const clientRes = await fetch(`${API_BASE_URL}/api/crm/clients/${clientId}/card`, {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`
                        }
                    });
                    const clientData = await clientRes.json();
                    if (clientData.ok && clientData.fields) {
                        currentClientFields = clientData.fields.map(f => f.id);
                    } else {
                        currentClientFields = [];
                    }
                }

                console.log(`📊 Загружено полей: ${allFieldsData.length}`);
                console.log(`👤 Полей у клиента: ${currentClientFields.length}`);
            } else {
                allFieldsData = [];
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки полей:', error);
            allFieldsData = [];
        }
    }

    // ====================================================
    // 8. ЗАГРУЗКА БЛОКИРОВОК
    // ====================================================

    function loadFieldLocks() {
        const savedLocks = localStorage.getItem('vortex_field_locks');
        if (savedLocks) {
            try {
                fieldLockStates = JSON.parse(savedLocks);
            } catch (e) {
                fieldLockStates = {};
            }
        } else {
            fieldLockStates = {};
            localStorage.setItem('vortex_field_locks', JSON.stringify(fieldLockStates));
        }
    }

    // ====================================================
    // 9. ОТРИСОВКА СПИСКА ПОЛЕЙ
    // ====================================================

    function renderFieldManagerList(filterType = 'all') {
        const container = document.getElementById('field-manager-list');
        if (!container) {
            console.error('❌ Контейнер field-manager-list не найден');
            return;
        }

        let filteredFields = [...allFieldsData];

        if (filteredFields.length === 0) {
            container.innerHTML = `
            <div style="text-align: center; color: #444; padding: 40px 20px;">
                <div style="font-size: 32px; display: block; margin-bottom: 10px; opacity: 0.5;">📭</div>
                <div style="font-size: 11px; letter-spacing: 1px;">Нет полей для отображения</div>
                <div style="font-size: 9px; color: #333; margin-top: 4px;">Загружено полей: ${allFieldsData.length}</div>
            </div>
        `;
            return;
        }

        filteredFields.sort((a, b) => {
            if (a.is_active !== b.is_active) {
                return a.is_active ? -1 : 1;
            }
            return (a.order_index || 0) - (b.order_index || 0);
        });

        if (filterType === 'active') {
            filteredFields = filteredFields.filter(f => f.is_active !== false);
        } else if (filterType === 'deleted') {
            filteredFields = filteredFields.filter(f => f.is_active === false);
        } else if (filterType === 'locked') {
            filteredFields = filteredFields.filter(f => fieldLockStates[f.id] === true);
        } else if (filterType === 'unlocked') {
            filteredFields = filteredFields.filter(f => fieldLockStates[f.id] !== true);
        } else if (filterType === 'client') {
            filteredFields = filteredFields.filter(f => currentClientFields.includes(f.id));
        } else if (filterType === 'available') {
            filteredFields = filteredFields.filter(f => !currentClientFields.includes(f.id) && f.is_active !== false);
        }

        if (filteredFields.length === 0) {
            container.innerHTML = `
            <div style="text-align: center; color: #444; padding: 40px 20px;">
                <div style="font-size: 32px; display: block; margin-bottom: 10px; opacity: 0.5;">🔍</div>
                <div style="font-size: 11px; letter-spacing: 1px;">Нет полей для фильтра</div>
            </div>
        `;
            return;
        }

        container.innerHTML = '';

        const userRole = (localStorage.getItem('role') || '').toLowerCase();
        const isAdmin = userRole === 'admin' || userRole === 'integrator';

        filteredFields.forEach(field => {
            const isLocked = fieldLockStates[field.id] === true;
            const isActive = field.is_active !== false;
            const isSystemField = field.key === 'purchases_history';
            const isInClient = currentClientFields.includes(field.id);

            const card = document.createElement('div');
            card.style.cssText = `
            background: ${!isActive ? 'rgba(255, 0, 0, 0.03)' : isInClient ? 'rgba(40, 167, 69, 0.03)' : 'rgba(255, 255, 255, 0.02)'};
            border: 1px solid ${!isActive ? 'rgba(255, 0, 0, 0.08)' : isInClient ? 'rgba(40, 167, 69, 0.08)' : 'rgba(255, 255, 255, 0.04)'};
            border-radius: 12px;
            padding: 12px 16px;
            margin-bottom: 6px;
            opacity: ${!isActive ? '0.4' : '1'};
            transition: all 0.25s ease;
            ${isInClient ? 'border-left: 2px solid rgba(40, 167, 69, 0.2);' : ''}
            ${isLocked ? 'border-left: 2px solid rgba(255, 193, 7, 0.15);' : ''}
        `;

            let actionsHtml = '';

            // РЕДАКТИРОВАНИЕ НАЗВАНИЯ (для админа, не для системных полей)
            if (!isSystemField && isAdmin) {
                actionsHtml += `
                <button onclick="editFieldName(${field.id}, '${field.title}')" style="
                    width: 30px; height: 30px; padding: 0;
                    border: 1px solid rgba(0, 229, 255, 0.12);
                    border-radius: 8px;
                    background: rgba(255,255,255,0.02);
                    color: #00E5FF;
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.2s;
                " onmouseover="this.style.background='rgba(0,229,255,0.06)'; this.style.borderColor='rgba(0,229,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.02)'; this.style.borderColor='rgba(0,229,255,0.12)'">
                    ✏️
                </button>
            `;
            }

            // БЛОКИРОВКА (для админа, не для системных полей)
            if (!isSystemField && isAdmin) {
                actionsHtml += `
                <button onclick="toggleFieldLock(${field.id})" style="
                    width: 30px; height: 30px; padding: 0;
                    border: 1px solid ${isLocked ? 'rgba(255,193,7,0.15)' : 'rgba(255,255,255,0.06)'};
                    border-radius: 8px;
                    background: rgba(255,255,255,0.02);
                    color: ${isLocked ? '#ffc107' : '#555'};
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.2s;
                " onmouseover="this.style.background='rgba(255,255,255,0.04)'; this.style.borderColor='rgba(255,255,255,0.12)'" onmouseout="this.style.background='rgba(255,255,255,0.02)'; this.style.borderColor='${isLocked ? 'rgba(255,193,7,0.15)' : 'rgba(255,255,255,0.06)'}'">
                    ${isLocked ? '🔓' : '🔒'}
                </button>
            `;
            }

            // УДАЛЕНИЕ (для админа, не для системных полей)
            if (!isSystemField && isAdmin) {
                actionsHtml += `
                <button onclick="deleteFieldPermanently(${field.id})" style="
                    width: 30px; height: 30px; padding: 0;
                    border: 1px solid rgba(255, 0, 0, 0.08);
                    border-radius: 8px;
                    background: rgba(255,255,255,0.02);
                    color: #ff4d4d;
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.2s;
                " onmouseover="this.style.background='rgba(255,0,0,0.06)'; this.style.borderColor='rgba(255,0,0,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.02)'; this.style.borderColor='rgba(255,0,0,0.08)'">
                    🗑
                </button>
            `;
            }

            let badgesHtml = '';
            if (!isActive) {
                badgesHtml += `<span style="font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 3px 10px; border-radius: 100px; background: rgba(255,0,0,0.12); color: #ff4d4d;">🗑 УДАЛЕНО</span>`;
            }
            if (isLocked) {
                badgesHtml += `<span style="font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 3px 10px; border-radius: 100px; background: rgba(255,193,7,0.12); color: #ffc107;">🔒 ЗАБЛОКИРОВАНО</span>`;
            }
            if (isSystemField) {
                badgesHtml += `<span style="font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 3px 10px; border-radius: 100px; background: rgba(255,255,255,0.04); color: #444;">⚙️ СИСТЕМНОЕ</span>`;
            }
            if (!isInClient && isActive && !isSystemField) {
                badgesHtml += `<span style="font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 3px 10px; border-radius: 100px; background: rgba(0,229,255,0.06); color: #00E5FF;">📥 ДОСТУПНО</span>`;
            }
            if (isInClient) {
                badgesHtml += `<span style="font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 3px 10px; border-radius: 100px; background: rgba(40,167,69,0.1); color: #28a745;">✅ У КЛИЕНТА</span>`;
            }

            card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; flex: 1; min-width: 0;">
                    <span style="color: ${isActive ? '#e8e8e8' : '#555'}; font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">
                        ${field.title}
                    </span>
                    <span style="color: #555; font-size: 10px; background: rgba(255,255,255,0.04); padding: 2px 12px; border-radius: 100px; font-weight: 500; letter-spacing: 0.3px; white-space: nowrap;">
                        ${getFieldTypeLabel(field.type)}
                    </span>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        ${badgesHtml}
                    </div>
                </div>
                <div style="display: flex; gap: 3px; align-items: center; flex-shrink: 0;">
                    ${actionsHtml}
                </div>
            </div>
        `;

            container.appendChild(card);
        });
    }

    // ====================================================
    // РЕДАКТИРОВАНИЕ НАЗВАНИЯ ПОЛЯ
    // ====================================================

    window.editFieldName = async function (fieldId, currentTitle) {
        const userRole = (localStorage.getItem('role') || '').toLowerCase();
        if (userRole !== 'admin' && userRole !== 'integrator') {
            alert('Только администратор может редактировать поля!');
            return;
        }

        // Простой prompt для ввода нового названия
        const newTitle = prompt('Редактирование названия поля:', currentTitle);

        // Если пользователь нажал Отмена или ничего не ввел
        if (newTitle === null) return;
        if (newTitle.trim() === '') {
            alert('Название поля не может быть пустым!');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/crm/fields`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: fieldId,
                    title: newTitle.trim(),
                    scope_type: "company",
                    key: "k_" + fieldId
                })
            });

            const result = await response.json();

            if (result.ok) {
                // Обновляем список полей
                await loadAllFieldsData();
                renderFieldManagerList();

                // Обновляем поля в карточке клиента
                if (typeof loadCustomFields === 'function') {
                    await loadCustomFields();
                }

                console.log(`✅ Поле ${fieldId} переименовано в "${newTitle.trim()}"`);
            } else {
                alert('Ошибка: ' + (result.message || 'Не удалось переименовать поле'));
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка сети при переименовании поля');
        }
    };
    // ====================================================
    // 10. ФИЛЬТРЫ
    // ====================================================

    function setupFilterHandlers() {
        const filterButtons = document.querySelectorAll('.fm-filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', function () {
                filterButtons.forEach(b => {
                    b.classList.remove('active');
                    b.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                    b.style.color = '#555';
                    b.style.background = 'rgba(255, 255, 255, 0.02)';
                });
                this.classList.add('active');
                this.style.borderColor = 'var(--vortex-accent, #00E5FF)';
                this.style.color = 'var(--vortex-accent, #00E5FF)';
                this.style.background = 'rgba(0, 229, 255, 0.06)';

                const filterType = this.dataset.filter || 'all';
                renderFieldManagerList(filterType);
            });
        });
    }

    // ====================================================
    // 11. УПРАВЛЕНИЕ БЛОКИРОВКОЙ
    // ====================================================

    window.toggleFieldLock = function (fieldId) {
        const userRole = (localStorage.getItem('role') || '').toLowerCase();
        if (userRole !== 'admin' && userRole !== 'integrator') {
            alert('Только администратор может изменять блокировку полей!');
            return;
        }

        const currentState = fieldLockStates[fieldId] === true;
        const newState = !currentState;

        if (newState) {
            fieldLockStates[fieldId] = true;
        } else {
            delete fieldLockStates[fieldId];
        }

        localStorage.setItem('vortex_field_locks', JSON.stringify(fieldLockStates));

        renderFieldManagerList();
        applyFieldLocksToClient();

        console.log(`✅ Поле ${fieldId} ${newState ? 'заблокировано' : 'разблокировано'}`);
    };

    // ====================================================
    // 12. ПРИМЕНЕНИЕ БЛОКИРОВОК
    // ====================================================

    function applyFieldLocksToClient() {
        const fieldItems = document.querySelectorAll('.field-item');

        fieldItems.forEach(item => {
            const fieldId = parseInt(item.dataset.fieldId);
            const isLocked = fieldLockStates[fieldId] === true;

            const inputs = item.querySelectorAll('input, select, textarea');

            if (isLocked) {
                inputs.forEach(input => {
                    input.disabled = true;
                    input.style.opacity = '';
                    input.style.cursor = '';
                });

                const editBtn = item.querySelector('.edit-pen-icon');
                const deleteBtn = item.querySelector('.delete-field-btn');
                if (editBtn) editBtn.style.display = 'none';
                if (deleteBtn) deleteBtn.style.display = 'none';

            } else {
                inputs.forEach(input => {
                    input.disabled = false;
                    input.style.opacity = '';
                    input.style.cursor = '';
                });

                if (window.isManagementMode) {
                    const editBtn = item.querySelector('.edit-pen-icon');
                    const deleteBtn = item.querySelector('.delete-field-btn');
                    if (editBtn) editBtn.style.display = 'inline-block';
                    if (deleteBtn) deleteBtn.style.display = 'inline-block';
                }
            }
        });
    }

    // ====================================================
    // 13. ДОБАВЛЕНИЕ/УДАЛЕНИЕ ПОЛЯ У КЛИЕНТА
    // ====================================================

    window.addFieldToClient = async function (fieldId) {
        const clientId = new URLSearchParams(window.location.search).get('id');
        if (!clientId) {
            alert('Клиент не найден');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/crm/clients/${clientId}/card`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`
                }
            });
            const data = await response.json();

            if (data.ok && data.fields) {
                if (data.fields.some(f => f.id === fieldId)) {
                    alert('Это поле уже есть у клиента');
                    return;
                }

                const field = allFieldsData.find(f => f.id === fieldId);
                if (!field) return;

                let emptyValue = '';
                if (field.type === 'bool') {
                    emptyValue = false;
                } else if (field.type === 'number') {
                    emptyValue = 0;
                } else if (field.type === 'date') {
                    emptyValue = Date.now();
                } else {
                    emptyValue = '';
                }

                const addRes = await fetch(`${API_BASE_URL}/api/crm/clients/${clientId}/values`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        values: [{ field_id: fieldId, value: emptyValue }]
                    })
                });

                if (addRes.ok) {
                    currentClientFields.push(fieldId);
                    renderFieldManagerList();
                    if (typeof loadCustomFields === 'function') {
                        loadCustomFields();
                    }
                    console.log(`✅ Поле ${fieldId} добавлено клиенту`);
                } else {
                    const err = await addRes.json();
                    alert('Ошибка: ' + (err.message || 'Не удалось добавить поле'));
                }
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка сети');
        }
    };

    window.removeFieldFromClient = async function (fieldId) {
        const clientId = new URLSearchParams(window.location.search).get('id');
        if (!clientId) {
            alert('Клиент не найден');
            return;
        }

        if (!confirm('Удалить это поле из карточки клиента? Данные будут потеряны.')) return;

        try {
            // 1. Получаем текущие значения клиента
            const response = await fetch(`${API_BASE_URL}/api/crm/clients/${clientId}/card`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`
                }
            });
            const data = await response.json();

            if (data.ok && data.values) {
                // 2. Фильтруем значения - удаляем нужное поле
                const filteredValues = data.values.filter(v => v.field_id !== fieldId);

                // 3. Отправляем обновленный список значений на сервер
                const updateRes = await fetch(`${API_BASE_URL}/api/crm/clients/${clientId}/values`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        values: filteredValues.map(v => ({
                            field_id: v.field_id,
                            value: v.value_text || v.value_number || v.value_bool || v.value_ts_ms || ''
                        }))
                    })
                });

                if (updateRes.ok) {
                    // 4. Обновляем локальный список полей клиента
                    currentClientFields = currentClientFields.filter(id => id !== fieldId);

                    // 5. Обновляем UI в модальном окне
                    renderFieldManagerList();

                    // 6. Обновляем поля в карточке клиента
                    if (typeof loadCustomFields === 'function') {
                        await loadCustomFields();
                    }

                    // 7. Обновляем историю
                    if (typeof loadClientHistory === 'function') {
                        await loadClientHistory();
                    }

                    console.log(`✅ Поле ${fieldId} удалено у клиента`);
                } else {
                    const err = await updateRes.json();
                    alert('Ошибка: ' + (err.message || 'Не удалось удалить поле'));
                }
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка сети');
        }
    };

    // ====================================================
    // 14. ВОССТАНОВЛЕНИЕ ПОЛЯ
    // ====================================================

    window.restoreField = async function (fieldId) {
        if (!confirm('Восстановить это поле? Оно снова появится в списке доступных.')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/crm/fields/${fieldId}/restore`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`
                }
            });

            if (response.ok) {
                await loadAllFieldsData();
                renderFieldManagerList();
                if (typeof loadCustomFields === 'function') {
                    loadCustomFields();
                }
                console.log(`✅ Поле ${fieldId} восстановлено`);
            } else {
                const data = await response.json();
                alert('Ошибка: ' + (data.message || 'Не удалось восстановить'));
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка сети');
        }
    };

    // ====================================================
    // 15. ОКОНЧАТЕЛЬНОЕ УДАЛЕНИЕ
    // ====================================================

    window.deleteFieldPermanently = async function (fieldId) {
        const userRole = (localStorage.getItem('role') || '').toLowerCase();
        if (userRole !== 'admin' && userRole !== 'integrator') {
            alert('Только администратор может удалять поля!');
            return;
        }

        try {
            // Используем эндпоинт /disable (деактивация) вместо DELETE
            const response = await fetch(`${API_BASE_URL}/api/crm/fields/${fieldId}/disable`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Обновляем список полей
                await loadAllFieldsData();
                renderFieldManagerList();

                // Обновляем поля в карточке клиента
                if (typeof loadCustomFields === 'function') {
                    await loadCustomFields();
                }

                console.log(`✅ Поле ${fieldId} удалено (деактивировано)`);
            } else {
                const data = await response.json();
                console.error('Ошибка:', data.message || 'Не удалось удалить поле');
            }
        } catch (error) {
            console.error('Ошибка:', error);
        }
    };

    // ====================================================
    // 16. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    // ====================================================

    function getFieldTypeLabel(type) {
        const types = {
            'text': '📝 Текст',
            'number': '🔢 Число',
            'date': '📅 Дата',
            'bool': '✅ Чипсет',
            'select': '📋 Список',
            'textarea': '📄 Текст (много)'
        };
        return types[type] || type;
    }

    // ====================================================
    // 17. ЭКСПОРТ
    // ====================================================

    window.applyFieldLocksToClient = applyFieldLocksToClient;
    window.fieldLockStates = fieldLockStates;
    window.currentClientFields = currentClientFields;

    console.log('✅ CardFieldManager.js загружен');
    console.log('📌 Двойной клик по заголовку "ИНФОРМАЦИЯ О КЛИЕНТЕ" для управления полями');

})();