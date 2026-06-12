let currentPipelineId = 0;
let allPipelines = [];
let sortableInstance = null;
// ========= ПЕРЕМЕННЫЕ ДЛЯ ПОИСКА =========
let searchAbortController = null;
const searchInput = document.getElementById('global-search-input');
const clearBtn = document.getElementById('clear-search-btn');
const resultsDropdown = document.getElementById('search-results-dropdown');

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Общие системные функции
    updateClock();
    setInterval(updateClock, 1000);

    // 2. Индикаторы менеджера (Задачи и Оплаты)
    await updateManagerTaskIndicator();
    await updateManagerTotalSales();

    // Обновляем их раз в минуту
    setInterval(updateManagerTaskIndicator, 60000);
    setInterval(updateManagerTotalSales, 60000);

    // 3. Загрузка CRM доски
    await initPipelinesUI();

    // ========= ИНИЦИАЛИЗАЦИЯ ПОИСКА =========
    initGlobalSearch();

});

function updateClock() {
    const timeEl = document.getElementById('vortex-time-display');
    const dateEl = document.getElementById('vortex-date-display');
    if (!timeEl || !dateEl) return;
    const now = new Date();
    timeEl.innerText = now.toLocaleTimeString('ru-RU', { hour12: false });
    dateEl.innerText = now.toLocaleDateString('ru-RU', { weekday: 'short', day: '2-digit', month: '2-digit' }).toLowerCase();

    // ========= ДОБАВЬТЕ ЭТОТ БЛОК =========
    // Делаем индикатор времени кликабельным для открытия календаря
    if (timeEl && !timeEl.hasAttribute('data-calendar-attached')) {
        const parentNode = timeEl.closest('.vortex-status-node');
        if (parentNode) {
            parentNode.style.cursor = 'pointer';
            parentNode.onclick = () => {
                window.location.href = '/calendar';
            };
            parentNode.setAttribute('data-calendar-attached', 'true');
        }
    }
}

async function initPipelinesUI() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/crm/pipelines`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await res.json();
        allPipelines = data.pipelines || [];

        if (allPipelines.length > 0) {
            // [НОВОЕ] Проверяем, есть ли сохраненная воронка в памяти
            const savedId = localStorage.getItem('vortex_last_pipeline_id');
            const savedName = localStorage.getItem('vortex_last_pipeline_name');

            // Проверяем, существует ли еще эта воронка в списке (на случай, если её удалили)
            const exists = allPipelines.find(p => p.id == savedId);

            if (savedId && exists) {
                // Восстанавливаем прошлую сессию
                await selectPipeline(parseInt(savedId), savedName);
            } else {
                // Если памяти нет — открываем первую
                const first = allPipelines[0];
                await selectPipeline(first.id, first.name);
            }
        }
    } catch (ex) {
        console.error("Err:", ex);
    }
}

async function selectPipeline(id, name) {
    currentPipelineId = id;

    // [НОВОЕ] Запоминаем выбор пользователя
    localStorage.setItem('vortex_last_pipeline_id', id);
    localStorage.setItem('vortex_last_pipeline_name', name);

    const btnText = document.getElementById('current-pipeline-btn-text');
    if (btnText) {
        btnText.innerText = name ? name.toUpperCase() : "+ ВОРОНКА";
    }
    await loadBoardStages(id);
}

async function loadBoardStages(pipelineId) {
    const canvas = document.getElementById('crm-canvas');
    if (!canvas) return;
    canvas.innerHTML = '<div style="color:var(--vortex-accent); padding: 20px;">Синхронизация...</div>';

    try {
        const res = await fetch(`${API_BASE_URL}/api/crm/pipelines/${pipelineId}/stages`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await res.json();
        const stages = data.stages || [];

        renderBoard(stages);

        stages.forEach(stage => {
            loadStageCards(pipelineId, stage.id);
        });

    } catch (err) {
        console.error("Ошибка загрузки доски:", err);
        canvas.innerHTML = '<div style="color:red; padding: 20px;">Ошибка загрузки данных</div>';
    }
}

async function moveDeal(evt) {
    const dealId = evt.item.dataset.id;
    const fromBody = evt.from; // Откуда ушла сделка
    const targetBody = evt.to; // Куда пришла сделка
    const newStageId = targetBody.closest('.vortex-stage-column').dataset.id;
    const pipelineId = currentPipelineId;

    // 1. Управляем текстом в целевом этапе (куда пришла сделка)
    const targetPlug = targetBody.querySelector('.empty-deals-plug');
    if (targetPlug) targetPlug.style.display = 'none';

    // 2. Управляем текстом в исходном этапе (откуда ушла сделка)
    // Если после ухода карточки в блоке не осталось других сделок (vortex-deal-card)
    const remainingCards = fromBody.querySelectorAll('.vortex-deal-card').length;
    if (remainingCards === 0) {
        // Если заглушки нет, создаем её, если есть — показываем
        let fromPlug = fromBody.querySelector('.empty-deals-plug');
        if (!fromPlug) {
            fromBody.innerHTML = '<div class="empty-deals-plug">НЕТ СДЕЛОК</div>';
        } else {
            fromPlug.style.display = 'block';
        }
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/crm/clients/${dealId}/move`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`
            },
            body: JSON.stringify({
                pipeline_id: parseInt(pipelineId),
                stage_id: parseInt(newStageId)
            })
        });

        if (!response.ok) {
            alert("Не удалось сохранить перемещение");
            location.reload();
        }
    } catch (err) {
        console.error("Ошибка сети:", err);
    }
}

async function createNewStage() {
    const name = prompt("Название нового этапа:");
    if (!name) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/crm/pipelines/${currentPipelineId}/stages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`
            },
            body: JSON.stringify({ name: name })
        });
        if (res.ok) await loadBoardStages(currentPipelineId);
    } catch (ex) { console.error(ex); }
}

async function deleteStage(stageId, name) {
    if (!confirm(`Удалить этап "${name}"?`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/crm/stages/${stageId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        if (res.ok) await loadBoardStages(currentPipelineId);
    } catch (ex) { console.error(ex); }
}

async function updateStageName(stageId, newName) {
    if (!newName.trim()) return;
    try {
        await fetch(`${API_BASE_URL}/api/crm/stages/${stageId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`
            },
            body: JSON.stringify({ name: newName })
        });
    } catch (ex) { console.error(ex); }
}

async function saveStagesOrder() {
    const columns = document.querySelectorAll('.vortex-stage-column');
    const order = Array.from(columns).map((col, idx) => ({
        id: col.dataset.id,
        position: idx
    }));
    try {
        await fetch(`${API_BASE_URL}/api/crm/pipelines/${currentPipelineId}/reorder-stages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`
            },
            body: JSON.stringify({ order: order })
        });
    } catch (ex) { console.error(ex); }
}

function openCreatePipelineModal() {
    const modal = document.getElementById('pipeline-modal');
    if (!modal) return;

    modal.style.display = 'flex';
    renderPipelineManagementList();

    // ПРОВЕРКА: Извлекаем роль прямо из памяти
    const role = (localStorage.getItem('role') || "").trim().toLowerCase();
    const hasAccess = (role === "admin" || role === "integrator");

    // Блок "НАЗВАНИЕ НОВОЙ ВОРОНКИ" (первый .vortex-field-group)
    const fieldGroups = modal.querySelectorAll('.vortex-field-group');
    if (fieldGroups.length > 0) {
        // Показываем блок ввода только Админу и Интегратору
        fieldGroups[0].style.display = hasAccess ? 'block' : 'none';
    }

    const input = document.getElementById('pipeline-new-name');
    if (input && hasAccess) {
        input.value = '';
        input.focus();
    }
}

function renderPipelineManagementList() {
    const listContainer = document.getElementById('pipeline-manage-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    // ПРОВЕРКА: Извлекаем роль для отрисовки кнопок удаления
    const role = (localStorage.getItem('role') || "").trim().toLowerCase();
    const hasAccess = (role === "admin" || role === "integrator");

    if (allPipelines.length === 0) {
        listContainer.innerHTML = '<div style="padding: 20px; opacity: 0.3; text-align: center;">НЕТ ВОРОНОК</div>';
        return;
    }

    allPipelines.forEach(p => {
        const item = document.createElement('div');
        // Добавляем класс pipeline-item для всей строки
        item.className = `pipeline-item ${p.id === currentPipelineId ? 'active' : ''}`;

        // ПРОВЕРКА: Извлекаем роль для отрисовки кнопок удаления
        const role = (localStorage.getItem('role') || "").trim().toLowerCase();
        const hasAccess = (role === "admin" || role === "integrator");

        // Формируем внутренний HTML
        // Теперь кнопка имеет класс btn-delete-pipeline, который мы настроили в CSS
        item.innerHTML = `
        <div class="pipeline-item-name">
            ${p.name.toUpperCase()} 
            ${p.id === currentPipelineId ? '<small style="color: var(--vortex-accent); margin-left: 8px;">[АКТИВНА]</small>' : ''}
        </div>
        ${hasAccess ? `<div class="btn-delete-pipeline" title="Удалить воронку"></div>` : ''}
    `;

        // 1. КЛИК ПО ВСЕЙ ВОРОНКЕ (Двойной клик на всю строку item)
        item.ondblclick = async () => {
            console.log("[VORTEX] Выбрана воронка:", p.name);
            await selectPipeline(p.id, p.name);
            closePipelineModal();
        };

        // 2. ЛОГИКА КНОПКИ УДАЛЕНИЯ (Крестик)
        const delBtn = item.querySelector('.btn-delete-pipeline');
        if (delBtn) {
            delBtn.onclick = (e) => {
                // ОСТАНАВЛИВАЕМ всплытие, чтобы двойной клик не сработал при удалении
                e.stopPropagation();
                deletePipeline(p.id, p.name);
            };
        }

        listContainer.appendChild(item);
    });
}

async function deletePipeline(id, name) {
    if (!confirm(`Вы действительно хотите удалить воронку "${name.toUpperCase()}"?`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/crm/pipelines/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        if (res.ok) {
            await initPipelinesUI();
        }
    } catch (ex) { console.error(ex); }
}

async function saveNewPipeline() {
    const nameInput = document.getElementById('pipeline-new-name');
    const name = nameInput.value.trim();
    if (!name) return alert("Введите название воронки");
    try {
        const res = await fetch(`${API_BASE_URL}/api/crm/pipelines`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`
            },
            body: JSON.stringify({ name: name })
        });
        if (res.ok) {
            nameInput.value = '';
            const updateRes = await fetch(`${API_BASE_URL}/api/crm/pipelines`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            });
            const data = await updateRes.json();
            allPipelines = data.pipelines || [];
            renderPipelineManagementList();
        }
    } catch (ex) { console.error(ex); }
}

function closePipelineModal() {
    document.getElementById('pipeline-modal').style.display = 'none';
}

async function openCreateDealModal() {
    const modal = document.getElementById('deal-modal');
    const pSelect = document.getElementById('deal-pipeline-select');
    const sSelect = document.getElementById('deal-stage-select');

    // [ДОБАВЛЕНО] Находим поле ввода имени клиента
    const nameInput = document.getElementById('deal-client-name');

    if (!modal || !pSelect || !sSelect) return;

    // [ДОБАВЛЕНО] Очищаем имя клиента перед показом окна
    if (nameInput) {
        nameInput.value = '';
    }

    modal.style.display = 'flex';
    pSelect.innerHTML = '<option value=""> ВЫБЕРИТЕ ВОРОНКУ </option>';
    sSelect.innerHTML = '<option value=""> СНАЧАЛА ВЫБЕРИТЕ ВОРОНКУ </option>';

    if (allPipelines.length > 0) {
        allPipelines.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.innerText = p.name.toUpperCase();
            if (p.id === currentPipelineId) opt.selected = true;
            pSelect.appendChild(opt);
        });
        if (pSelect.value) await updateModalStages();
    } else {
        await initPipelinesUI();
        if (allPipelines.length > 0) return openCreateDealModal();
    }
}

function closeModal() {
    const modal = document.getElementById('deal-modal');
    // [ДОБАВЛЕНО] Находим поле ввода имени клиента
    const nameInput = document.getElementById('deal-client-name');

    if (modal) {
        modal.style.display = 'none';
    }

    // [ДОБАВЛЕНО] Дополнительная очистка при закрытии
    if (nameInput) {
        nameInput.value = '';
    }
}

async function updateModalStages() {
    const pSelect = document.getElementById('deal-pipeline-select');
    const sSelect = document.getElementById('deal-stage-select');
    if (!pSelect || !sSelect) return;
    const pId = pSelect.value;
    if (!pId) return;
    sSelect.innerHTML = '<option>ЗАГРУЗКА ЭТАПОВ...</option>';
    try {
        const res = await fetch(`${API_BASE_URL}/api/crm/pipelines/${pId}/stages`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await res.json();
        const stages = data.stages || [];
        sSelect.innerHTML = '<option value=""> ВЫБЕРИТЕ ЭТАП </option>';
        stages.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.innerText = s.name.toUpperCase();
            sSelect.appendChild(opt);
        });
    } catch (e) { console.error(e); }
}

async function createOfflineDeal() {
    const name = document.getElementById('deal-client-name').value.trim();
    const pId = document.getElementById('deal-pipeline-select').value;
    const sId = document.getElementById('deal-stage-select').value;
    if (!name || !pId || !sId) return alert("Заполните все поля");
    try {
        const res = await fetch(`${API_BASE_URL}/api/crm/clients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`
            },
            body: JSON.stringify({ name, channel: "manual", pipeline_id: parseInt(pId), stage_id: parseInt(sId) })
        });
        if (res.ok) {
            closeModal();
            await loadBoardStages(pId);
        }
    } catch (ex) { console.error(ex); }
}

// Функция проверки прав доступа (Админ или Интегратор)
// 1. Улучшенная функция проверки ролей
function canManageBoard() {
    // В login.py сервер возвращает ключ 'role'. Проверяем его и альтернативы.
    const rawRole = localStorage.getItem('role') || localStorage.getItem('vortex_role') || "";
    const role = rawRole.trim().toLowerCase();

    // ЭТО ПОМОЖЕТ ВАМ УВИДЕТЬ ПРОБЛЕМУ: Нажмите F12 в браузере -> вкладка Console
    console.log("[VORTEX DEBUG] Роль в браузере:", rawRole);

    // Сверяем с Admin или Integrator (из вашего login.py)
    return role === "Admin" || role === "integrator";
}

function renderBoard(stages) {
    const canvas = document.getElementById('crm-canvas');
    if (!canvas) return;

    // Очищаем экран
    canvas.innerHTML = '';

    // Проверка роли (Admin/Integrator из твоего login.py)
    const rawRole = localStorage.getItem('role') || localStorage.getItem('vortex_role') || "";
    const hasManagerAccess = (rawRole.trim().toLowerCase() === "admin" || rawRole.trim().toLowerCase() === "integrator");

    // Если этапов вообще нет
    if (stages.length === 0) {
        if (hasManagerAccess) {
            canvas.innerHTML = '<div style="padding: 40px;"><button onclick="createNewStage()" class="vortex-btn-primary">СОЗДАТЬ ПЕРВЫЙ ЭТАП</button></div>';
        } else {
            canvas.innerHTML = '<div style="padding: 40px; opacity: 0.3;">ВОРОНКА ПУСТА</div>';
        }
        return;
    }

    // Рисуем этапы
    stages.forEach((stage) => {
        const template = document.getElementById('stage-template');
        if (!template) return;

        const clone = template.content.cloneNode(true);
        const column = clone.querySelector('.vortex-stage-column');
        const stageBody = clone.querySelector('.stage-body');
        const input = clone.querySelector('.stage-input');
        const delBtn = clone.querySelector('.del-btn');
        const addBtn = clone.querySelector('.add-btn');

        // Безопасный поиск нижней полоски и палитры
        const neonLine = clone.querySelector('.stage-neon-line');
        const colorPicker = clone.querySelector('.stage-color-picker');

        if (column) column.dataset.id = stage.id;
        if (input) input.value = stage.name;

        // Применение кастомного цвета из БД или неона по умолчанию (#00FFCC)
        const defaultNeonColor = '#00ffff';
        const currentStageColor = stage.color || defaultNeonColor;

        if (neonLine) {
            neonLine.style.backgroundColor = currentStageColor;
            neonLine.style.boxShadow = `0 0 10px ${currentStageColor}80`; // Неоновый отсвет в цвет полоски
        }
        if (colorPicker) {
            colorPicker.value = currentStageColor;
        }

        // ЛОГИКА ПЛЮСОВ И МИНУСОВ
        if (!hasManagerAccess) {
            // Если НЕ админ - удаляем элементы управления из DOM
            if (delBtn) delBtn.remove();
            if (addBtn) addBtn.remove();
            if (colorPicker) colorPicker.remove(); // Обычный юзер не может вызывать палитру
            if (input) {
                input.readOnly = true;
                input.style.cursor = 'default';
            }
        } else {
            // Если админ - настраиваем события
            if (delBtn) delBtn.onclick = () => deleteStage(stage.id, stage.name);
            if (addBtn) addBtn.onclick = () => createNewStage();
            if (input) {
                input.onblur = () => updateStageName(stage.id, input.value);
                input.onkeydown = (e) => { if (e.key === 'Enter') input.blur(); };
            }

            // Настройка событий палитры на нижней полоске
            if (colorPicker) {
                // Изменение цвета в реальном времени при движении по кругу палитры
                colorPicker.oninput = (e) => {
                    const selectedColor = e.target.value;
                    if (neonLine) {
                        neonLine.style.backgroundColor = selectedColor;
                        neonLine.style.boxShadow = `0 0 10px ${selectedColor}80`;
                    }
                };

                // Фиксация и сохранение цвета на бэкенд при закрытии палитры
                colorPicker.onchange = async (e) => {
                    const finalColor = e.target.value;
                    console.log(`[VORTEX] Сохраняем нижний цвет для этапа ${stage.id}:`, finalColor);

                    try {
                        await fetch(`${API_BASE_URL}/api/crm/stages/${stage.id}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`
                            },
                            body: JSON.stringify({ color: finalColor })
                        });
                    } catch (err) {
                        console.error("Ошибка при сохранении цвета этапа:", err);
                    }
                };
            }
        }

        canvas.appendChild(clone);

        // Догружаем сделки для этого этапа
        loadStageCards(currentPipelineId, stage.id);
    });

    // --- ИНИЦИАЛИЗАЦИЯ SORTABLE (ВНУТРИ ФУНКЦИИ) ---

    // 1. Перетаскивание карточек внутри этапов
    document.querySelectorAll('.stage-body').forEach(el => {
        new Sortable(el, {
            group: 'deals',
            animation: 150,
            ghostClass: 'vortex-ghost',
            onEnd: (evt) => {
                if (evt.from !== evt.to) {
                    moveDeal(evt);
                }
            }
        });
    });

    // 2. Перетаскивание самих колонок (только для админов)
    if (typeof sortableInstance !== 'undefined' && sortableInstance) {
        if (typeof sortableInstance.destroy === 'function') sortableInstance.destroy();
    }

    sortableInstance = new Sortable(canvas, {
        animation: 150,
        handle: '.stage-header',
        disabled: !hasManagerAccess, // Запрещаем двигать этапы, если не админ
        onEnd: () => saveStagesOrder()
    });
}

// ПРОВЕРКА АВТОРИЗАЦИИ (БЕЗОПАСНОСТЬ)
(function checkAuth() {
    const token = localStorage.getItem('vortex_token');

    // Если токена нет в памяти этого браузера — немедленно выкидываем на логин
    if (!token) {
        console.error("Доступ запрещен: токен не найден");
        window.location.href = '/'; // Укажи путь к своей странице входа
    }
})();

// 1. Подключаемся к сокет-серверу Vortex
// API_BASE_URL должен быть "http://127.0.0.1:5000" (или твой IP)
const socket = io(API_BASE_URL);

// 2. Слушаем событие 'deal_moved'
socket.on('deal_moved', (data) => {
    console.log("[VORTEX-LIVE] Получен сигнал о перемещении:", data);

    // Проверяем, открыта ли у нас сейчас та же воронка
    if (parseInt(data.pipelineId) === currentPipelineId) {

        // Находим карточку на странице по её ID
        const card = document.querySelector(`.vortex-deal-card[data-id="${data.dealId}"]`);
        // Находим колонку (этап), куда она должна переместиться
        const targetStageBody = document.querySelector(`.vortex-stage-column[data-id="${data.newStageId}"] .stage-body`);

        if (card && targetStageBody) {
            console.log(`[VORTEX] Перемещаю карточку ${data.dealId} в этап ${data.newStageId}`);

            // Визуальный эффект перемещения
            card.style.opacity = '0.3';
            setTimeout(() => {
                targetStageBody.appendChild(card);
                card.style.opacity = '1';

                // Опционально: можно пересчитать счетчики сделок в колонках здесь
            }, 200);
        } else {
            // Если карточки нет на экране (например, она новая), 
            // просто обновляем данные этого этапа
            console.log("[VORTEX] Карточка не найдена, обновляю этап полностью");
            loadStageCards(currentPipelineId, data.newStageId);
        }
    }
});

// Функция переключения между Канбаном и Списком
// Переключение между Канбаном и Списком
function switchView(viewType) {
    const kanbanContainer = document.getElementById('crm-canvas');
    const listContainer = document.getElementById('crm-list-view');
    const btnKanban = document.getElementById('btn-kanban');
    const btnList = document.getElementById('btn-list');

    if (viewType === 'kanban') {
        kanbanContainer.style.display = 'flex';
        listContainer.style.display = 'none';
        btnKanban.classList.add('active');
        btnList.classList.remove('active');
        loadBoardStages(currentPipelineId); // Обновляем канбан
    } else {
        kanbanContainer.style.display = 'none';
        listContainer.style.display = 'block';
        btnKanban.classList.remove('active');
        btnList.classList.add('active');
        loadListData(); // [НОВОЕ] Загружаем данные для списка
    }
}

// [НОВОЕ] Загрузка данных специально для таблицы
// [ШАГ 2] Оптимизированная загрузка данных специально для таблицы (List View)
async function loadListData() {
    const listBody = document.getElementById('list-body');
    if (!listBody) return;

    listBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--vortex-accent);">СИНХРОНИЗАЦИЯ ТАБЛИЦЫ...</td></tr>';

    try {
        // 1. Получаем этапы текущей воронки
        const res = await fetch(`${API_BASE_URL}/api/crm/pipelines/${currentPipelineId}/stages`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await res.json();
        const stages = data.stages || [];

        listBody.innerHTML = '';
        const pipelineName = localStorage.getItem('vortex_last_pipeline_name') || "ВОРОНКА";

        // 2. Собираем все карточки со всех этапов параллельно
        const stageCardsPromises = stages.map(stage =>
            fetch(`${API_BASE_URL}/api/crm/board/stage_cards?pipeline_id=${currentPipelineId}&stage_id=${stage.id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            }).then(r => r.json()).then(d => ({ stage, cards: d.cards || [] }))
        );

        const stagesWithCards = await Promise.all(stageCardsPromises);

        // Массив для всех строк, которые мы отрисуем
        const allRowsData = [];

        // 3. Вытягиваем карточки в плоский список
        for (const item of stagesWithCards) {
            for (const card of item.cards) {
                allRowsData.push({ card, stage: item.stage });
            }
        }

        if (allRowsData.length === 0) {
            listBody.innerHTML = '<tr><td colspan="5" style="text-align:center; opacity:0.3; padding:40px;">В ЭТОЙ ВОРОНКЕ НЕТ СДЕЛОК</td></tr>';
            return;
        }

        // 4. Оптимизированный параллельный запрос стоимостей/оплат для всех найденных клиентов
        const paymentPromises = allRowsData.map(async (rowData) => {
            let realPaidAmount = 0;
            try {
                const payRes = await fetch(`${API_BASE_URL}/api/inventory/sales/pay?client_id=${rowData.card.id}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
                });
                const payData = await payRes.json();
                if (payData.ok) {
                    realPaidAmount = parseFloat(payData.total || 0);
                }
            } catch (e) {
                console.error(`Ошибка получения оплаты для клиента ${rowData.card.id}:`, e);
            }
            return { ...rowData, amount: realPaidAmount };
        });

        // Ждем завершения всех запросов по оплатам
        const finalizedRows = await Promise.all(paymentPromises);

        // 5. Отрисовываем строки в таблицу
        finalizedRows.forEach(({ card, stage, amount }) => {
            const row = document.createElement('tr');
            row.className = 'vortex-list-row';

            // ВАЖНО ДЛЯ ШАГА 2: Устанавливаем data-id, чтобы функция renderListView() могла его прочитать
            row.setAttribute('data-id', card.id);

            // Обработчик клика для открытия карточки
            row.onclick = () => openClientPage(card.id);

            const displayAmount = (amount > 0)
                ? amount.toLocaleString('ru-RU') + ' ₸'
                : '<span style="opacity:0.3">0 ₸</span>';

            row.innerHTML = `
                <td class="list-deal-title" style="font-weight:bold;">${card.title.toUpperCase()}</td>
                <td class="list-pipeline-name">${pipelineName.toUpperCase()}</td>
                <td><span class="vortex-status-node" style="font-size:10px; padding:4px 8px;">${stage.name.toUpperCase()}</span></td>
                <td class="list-manager-name">${card.owner_name || '<span style="opacity:0.4">НЕ НАЗНАЧЕН</span>'}</td>
                <td class="list-amount-cell" style="text-align:right; font-weight:bold; color:var(--vortex-accent, #00FFCC);">${displayAmount}</td>
            `;
            listBody.appendChild(row);
        });

        // Принудительно вызываем инициализацию обработчиков (если требуется дополнительная логика)
        renderListView();

    } catch (err) {
        console.error("Ошибка Шага 2 (Загрузка списка):", err);
        listBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">СБОЙ ОБНОВЛЕНИЯ ДАННЫХ</td></tr>';
    }
}

// Функция загрузки карточек в колонки канбана
async function loadStageCards(pipelineId, stageId) {
    try {
        const url = `${API_BASE_URL}/api/crm/board/stage_cards?pipeline_id=${pipelineId}&stage_id=${stageId}&limit=50&offset=0`;
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await res.json();

        if (data.ok && data.cards) {
            const stageColumn = document.querySelector(`.vortex-stage-column[data-id="${stageId}"]`);
            if (!stageColumn) return;
            const stageBody = stageColumn.querySelector('.stage-body');

            if (data.cards.length > 0) {
                // Если сделки есть — очищаем всё (включая заглушку) и рисуем карточки
                stageBody.innerHTML = '';
                data.cards.forEach(card => {
                    const cardEl = document.createElement('div');
                    cardEl.className = 'vortex-deal-card';
                    cardEl.dataset.id = card.id;

                    // КЛИК: Переход на отдельную страницу клиента
                    cardEl.onclick = () => openClientPage(card.id);

                    // Преобразуем канал в читаемый вид
                    let channelDisplay = card.channel || 'manual';
                    if (channelDisplay === 'manual') {
                        channelDisplay = 'офлайн';
                    } else if (channelDisplay === 'whatsapp') {
                        channelDisplay = 'WHATSAPP';
                    } else if (channelDisplay === 'telegram') {
                        channelDisplay = 'TELEGRAM';
                    } else if (channelDisplay === 'instagram') {
                        channelDisplay = 'INSTAGRAM';
                    } else if (channelDisplay === 'email') {
                        channelDisplay = 'EMAIL';
                    } else {
                        channelDisplay = channelDisplay.toUpperCase();
                    }

                    cardEl.innerHTML = `
    <span class="deal-card-name">${card.title.toUpperCase()}</span>
    <div class="deal-card-info">
        <span class="deal-card-owner" style="font-size: 10px; opacity: 0.6;">
            ${card.owner_name || 'НЕ НАЗНАЧЕН'}
        </span>
        <span class="deal-card-channel" style="margin-left: auto;">${channelDisplay}</span>
    </div>
`;
                    stageBody.appendChild(cardEl);
                });
            } else {
                // НОВОЕ: Если сделок нет — возвращаем заглушку обратно
                stageBody.innerHTML = '<div class="empty-deals-plug">НЕТ СДЕЛОК</div>';
            }
        }
    } catch (ex) {
        console.error(`Ошибка загрузки карточек:`, ex);
    }
}

// Обновление табличного вида (List View)
function renderListView() {
    const listBody = document.getElementById('list-body');
    if (!listBody) return;

    // Находим все строки или карточки в таблице
    const rows = document.querySelectorAll('.vortex-list-row');
    rows.forEach(row => {
        const id = row.getAttribute('data-id');
        if (id) {
            // При нажатии на строку таблицы открываем отдельную страницу
            row.onclick = () => openClientPage(id);
        }
    });
}

/**
 * ГЛАВНЫЙ МЕТОД: Переход на отдельную страницу карточки клиента
 * Открывает файл Card.html на сервере интерфейса.
 * Файл Card.js сам прочитает ID из URL и сделает необходимые запросы к серверу CRM.
 */
function openClientPage(clientId) {
    window.location.href = `Card.html?id=${clientId}`;
}

// 1. Ближайшая задача менеджера (только название)
async function updateManagerTaskIndicator() {
    const el = document.getElementById('txt-manager-task');
    const node = document.getElementById('node-task-link');
    if (!el || !node) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/tasks/?limit=100`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await res.json();

        const now = Date.now();
        const myTasks = (data.tasks || []).filter(t => t.status !== 'done' && t.start_ts_ms > now);
        const nearest = myTasks.sort((a, b) => a.start_ts_ms - b.start_ts_ms)[0];

        if (nearest) {
            const title = nearest.title.length > 15 ? nearest.title.substring(0, 15) + '..' : nearest.title;
            el.innerText = title.toUpperCase();
            el.style.color = "var(--vortex-accent)";
            node.style.opacity = "1";

            // НАСТРОЙКА КЛИКА
            node.onclick = () => {
                if (nearest.client_id) {
                    // Если у задачи есть ID клиента, открываем его карточку
                    openClientPage(nearest.client_id);
                } else {
                    // Если задача общая, можно просто вывести уведомление или открыть модалку
                    alert("Задача: " + nearest.title);
                }
            };
        } else {
            el.innerText = "НЕТ ПЛАНОВ";
            el.style.color = "rgba(255,255,255,0.3)";
            node.onclick = null; // Отключаем клик, если задач нет
            node.style.opacity = "0.5";
        }
    } catch (e) {
        el.innerText = "СБОЙ";
        console.error("Ошибка задач:", e);
    }
}

// 2. Сумма оплат менеджера (только за текущий месяц)
async function updateManagerTotalSales() {
    const sumEl = document.getElementById('txt-manager-total-pay');
    const monthEl = document.getElementById('manager-month-name');
    if (!sumEl) return;

    // Устанавливаем название текущего месяца автоматически
    const currentMonthName = new Date().toLocaleString('ru', { month: 'long' }).toUpperCase();
    if (monthEl) monthEl.innerText = currentMonthName;

    try {
        // Вызываем API плана. Бэкенд на /sales/plan/month обычно сам считает данные 
        // от 1-го числа текущего месяца до текущего момента.
        const res = await fetch(`${API_BASE_URL}/api/inventory/sales/plan/month`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await res.json();

        // Показываем ТОЛЬКО цифру
        const total = data.total || 0;
        sumEl.innerText = `${parseFloat(total).toLocaleString()} ₸`;

    } catch (e) {
        sumEl.innerText = "0 ₸";
    }
}

// ==================== ГЛОБАЛЬНЫЙ ПОИСК КЛИЕНТОВ ====================
function initGlobalSearch() {
    if (!searchInput) return;

    const handleSearch = async () => {
        const query = searchInput.value.trim();

        if (query.length < 2) {
            resultsDropdown.style.display = 'none';
            if (clearBtn) clearBtn.style.display = 'none';
            return;
        }

        if (clearBtn) clearBtn.style.display = 'flex';
        resultsDropdown.style.display = 'block';
        resultsDropdown.innerHTML = '<div class="no-results-placeholder">ПОИСК...</div>';

        if (searchAbortController) {
            searchAbortController.abort();
        }
        searchAbortController = new AbortController();

        try {
            // 1. Получаем все сделки из текущей воронки
            const stagesRes = await fetch(`${API_BASE_URL}/api/crm/pipelines/${currentPipelineId}/stages`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` },
                signal: searchAbortController.signal
            });
            const stagesData = await stagesRes.json();
            const stages = stagesData.stages || [];

            let allCards = [];
            for (const stage of stages) {
                const cardsRes = await fetch(`${API_BASE_URL}/api/crm/board/stage_cards?pipeline_id=${currentPipelineId}&stage_id=${stage.id}&limit=100`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` },
                    signal: searchAbortController.signal
                });
                const cardsData = await cardsRes.json();
                if (cardsData.ok && cardsData.cards) {
                    allCards.push(...cardsData.cards.map(card => ({ ...card, stageName: stage.name, stageId: stage.id })));
                }
            }

            // 2. Для каждой сделки получаем кастомные поля
            const cardsWithFields = await Promise.all(allCards.map(async (card) => {
                let customFields = [];
                try {
                    const fieldsRes = await fetch(`${API_BASE_URL}/api/crm/clients/${card.id}/fields`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` },
                        signal: searchAbortController.signal
                    });
                    const fieldsData = await fieldsRes.json();
                    customFields = fieldsData.fields || [];
                } catch (e) { /* ignore */ }
                return { ...card, customFields };
            }));

            // 3. Фильтрация по названию и кастомным полям
            const lowerQuery = query.toLowerCase();
            const filtered = cardsWithFields.filter(card => {
                if (card.title.toLowerCase().includes(lowerQuery)) return true;
                return card.customFields.some(field =>
                    field.value && field.value.toString().toLowerCase().includes(lowerQuery)
                );
            });

            // 4. Отрисовка результатов
            if (filtered.length === 0) {
                resultsDropdown.innerHTML = '<div class="no-results-placeholder">НИЧЕГО НЕ НАЙДЕНО</div>';
                return;
            }

            resultsDropdown.innerHTML = '';
            filtered.forEach(card => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.innerHTML = `
                    <div>
                        <div class="result-deal-name">${escapeHtml(card.title.toUpperCase())}</div>
                        <div class="result-deal-meta">${card.owner_name || 'НЕТ ОТВЕТСТВЕННОГО'}</div>
                    </div>
                    <div class="result-deal-stage">${card.stageName.toUpperCase()}</div>
                `;
                item.onclick = () => openClientPage(card.id);
                resultsDropdown.appendChild(item);
            });
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error("Ошибка поиска:", err);
            resultsDropdown.innerHTML = '<div class="no-results-placeholder">ОШИБКА ПОИСКА</div>';
        }
    };

    const debouncedSearch = debounce(handleSearch, 400);
    searchInput.addEventListener('input', debouncedSearch);

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            resultsDropdown.style.display = 'none';
            searchInput.focus();
        });
    }

    document.addEventListener('click', (e) => {
        if (!searchInput?.contains(e.target) && !resultsDropdown?.contains(e.target)) {
            resultsDropdown.style.display = 'none';
        }
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function debounce(func, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), delay);
    };
}