/**
 * CardInfoFields.js
 * Управление полями информации о клиенте (CRUD)
 */

(function () {
    'use strict';

    // ====================================================
    // 1. ЗАГРУЗКА ПОЛЕЙ И ИНФОРМАЦИИ О КЛИЕНТЕ
    // ====================================================

    window.loadCustomFields = async function () {
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
                    // Скрываем системное поле истории из общего списка
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
                        fieldInputHtml = `<input type="datetime-local" class="field-input custom-field-input" data-field-id="${field.id}" data-field-type="date" data-old-value="${dateString}" value="${dateString}">`;
                    } else if (field.type === 'bool') {
                        const isChecked = valObj && valObj.value_bool ? 'checked' : '';
                        const oldValBool = valObj && valObj.value_bool ? 'true' : 'false';
                        fieldInputHtml = `
                        <div class="vortex-chipset">
                            <input type="checkbox" class="vortex-toggle custom-field-input" data-field-id="${field.id}" data-field-type="bool" data-old-value="${oldValBool}" ${isChecked}>
                            <span class="chipset-label">${field.title}</span>
                        </div>`;
                    } else {
                        const displayValue = valObj ? (valObj.value_text || valObj.value_number || "") : "";
                        fieldInputHtml = `<input type="${field.type === 'number' ? 'number' : 'text'}" class="field-input custom-field-input" data-field-id="${field.id}" data-field-type="${field.type}" data-old-value="${displayValue}" value="${displayValue}" placeholder="Пусто...">`;
                    }

                    // УБИРАЕМ КНОПКИ ✎ и ✖ - оставляем только название поля и инпут
                    const fieldHtml = `
                    <div class="field-item" draggable="true" data-field-id="${field.id}">
                        <div style="display: flex; align-items: center;">
                            <label class="field-label" style="cursor: grab;">${field.title}</label>
                            <!-- КНОПКИ ✎ и ✖ УДАЛЕНЫ -->
                        </div>
                        ${fieldInputHtml}
                    </div>
                `;
                    container.insertAdjacentHTML('beforeend', fieldHtml);
                });

                // Навешиваем Drag-and-Drop события
                initFieldsDragAndDrop(container);

                // Применяем блокировки
                if (typeof window.applyFieldLocksToClient === 'function') {
                    setTimeout(() => {
                        window.applyFieldLocksToClient();
                    }, 100);
                }
            }
        } catch (error) {
            console.error("Ошибка загрузки полей:", error);
        }
    };

   

    // ====================================================
    // 3. УПРАВЛЕНИЕ ПОЛЯМИ (СОЗДАНИЕ, РЕДАКТИРОВАНИЕ, УДАЛЕНИЕ)
    // ====================================================

    /**
     * Открывает модальное окно для создания нового поля
     */
    window.openFieldModal = function () {
        const modal = document.getElementById('field-modal');
        if (!modal) {
            console.error('Модальное окно field-modal не найдено!');
            return;
        }

        // Очищаем поля
        document.getElementById('new-field-title').value = '';
        document.getElementById('new-field-type').value = 'text';

        // Показываем окно
        modal.style.display = 'flex';
        console.log('✅ Модальное окно открыто');
    };

    /**
     * Закрывает модальное окно создания поля
     */
    window.closeFieldModal = function () {
        const modal = document.getElementById('field-modal');
        if (modal) {
            modal.style.display = 'none';
            document.getElementById('new-field-title').value = '';
        }
        console.log('✅ Модальное окно закрыто');
    };

    /**
     * Создает новое поле на сервере
     */
    window.saveNewField = async function () {
        const title = document.getElementById('new-field-title').value.trim();
        const type = document.getElementById('new-field-type').value;
        if (!title) return alert("Введите название поля");
        try {
            const fieldData = {
                scope_type: "company",
                scope_id: 0,
                key: "c_" + Date.now(),
                title: title,
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
            if ((await response.json()).ok) {
                closeFieldModal();
                loadCustomFields();
            }
        } catch (error) {
            console.error(error);
        }
    };

    /**
     * Переименовывает существующее поле
     */
    window.renameFieldPrompt = async function (fieldId, currentTitle) {
        const newTitle = prompt("Введите новое название для поля:", currentTitle);
        if (newTitle && newTitle !== currentTitle) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/crm/fields`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        id: fieldId,
                        title: newTitle,
                        scope_type: "company",
                        key: "k_" + fieldId
                    })
                });
                if ((await response.json()).ok) loadCustomFields();
            } catch (error) {
                console.error(error);
            }
        }
    };

    /**
     * Удаляет (деактивирует) поле
     */
    window.confirmDeleteField = async function (fieldId) {
        if (!confirm("Вы уверены, что хотите удалить это поле? Оно исчезнет из карточки.")) return;

        try {
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
                await loadCustomFields();
            } else {
                alert("Ошибка при удалении: " + (result.message || "Доступ запрещен"));
            }
        } catch (e) {
            console.error("Критическая ошибка при удалении поля:", e);
            alert("Проблема с сетью или сервером");
        }
    };

    // ====================================================
    // 4. ПЕРЕМЕЩЕНИЕ ПОЛЕЙ (DRAG-AND-DROP)
    // ====================================================

    /**
     * Инициализирует Drag-and-Drop для полей
     */
    function initFieldsDragAndDrop(container) {
        const items = container.querySelectorAll('.field-item');

        items.forEach(item => {
            item.addEventListener('dragstart', () => {
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', async () => {
                item.classList.remove('dragging');
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

    /**
     * Находит элемент, после которого нужно вставить перетаскиваемый
     */
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

    /**
     * Сохраняет новый порядок полей на сервере
     */
    async function saveFieldsNewOrder(container) {
        const fieldElements = container.querySelectorAll('.field-item[data-field-id]');
        const fieldIds = Array.from(fieldElements).map(el => parseInt(el.getAttribute('data-field-id')));

        try {
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

    // ====================================================
    // 5. РЕЖИМ УПРАВЛЕНИЯ (ПОКАЗ/СКРЫТИЕ ИНСТРУМЕНТОВ)
    // ====================================================

    /**
     * Переключает режим управления полями
     */
    window.toggleManagementMode = function () {
        isManagementMode = !isManagementMode;
        const body = document.body;
        const editBtn = document.getElementById('admin-edit-btn');

        const addFieldContainer = document.getElementById('add-field-btn-container');
        const managementControls = document.querySelectorAll('.delete-field-btn, .edit-pen-icon');

        if (isManagementMode) {
            body.classList.add('management-active');
            if (editBtn) {
                editBtn.classList.add('btn-active-mode');
                editBtn.innerText = 'ВЫЙТИ';
            }
            if (addFieldContainer) {
                addFieldContainer.style.display = 'block';
            }
            managementControls.forEach(el => {
                el.style.display = 'inline-block';
            });
        } else {
            body.classList.remove('management-active');
            if (editBtn) {
                editBtn.classList.remove('btn-active-mode');
                editBtn.innerText = 'УПРАВЛЕНИЕ';
            }
            if (addFieldContainer) {
                addFieldContainer.style.display = 'none';
            }
            managementControls.forEach(el => {
                el.style.display = 'none';
            });
        }
    };

    /**
     * Проверяет права доступа для показа кнопки управления
     */
    window.checkPermissions = function () {
        const userRole = localStorage.getItem('role');
        const editBtn = document.getElementById('admin-edit-btn');

        // Разрешенные роли: Admin, Director, Integrator
        const allowedRoles = ['Admin', 'Director', 'Integrator'];

        if (editBtn && allowedRoles.includes(userRole)) {
            editBtn.style.display = 'block';
        } else if (editBtn) {
            editBtn.style.display = 'none';
        }
    };

})();