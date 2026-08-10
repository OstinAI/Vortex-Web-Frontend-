/* ============================================
   TOOLS - Логика панели инструментов
   Папка: /crm/tools/
   ============================================ */

(function () {
    'use strict';

    // Создаем элемент подсказки сразу при загрузке
    (function createHint() {
        if (!document.getElementById('vortex-hint')) {
            const hint = document.createElement('div');
            hint.id = 'vortex-hint';
            document.body.appendChild(hint);
        }
    })();

    // ==========================================
    // 0. СОЗДАЕМ ЭЛЕМЕНТ ПОДСКАЗКИ СРАЗУ
    // ==========================================
    function createHintElement() {
        let hint = document.getElementById('vortex-hint');
        if (!hint) {
            hint = document.createElement('div');
            hint.id = 'vortex-hint';
            hint.className = 'vortex-ui-hint';
            document.body.appendChild(hint);
        }
        return hint;
    }

    // Создаем подсказку сразу при загрузке
    const hintElement = createHintElement();

    // ==========================================
    // 1. ОТКРЫТИЕ/ЗАКРЫТИЕ МЕНЮ ИНСТРУМЕНТОВ
    // ==========================================
    window.vortexToggleTools = function () {
        const menu = document.getElementById('tools-menu');
        if (menu) {
            menu.classList.toggle('active');
        }
    };

    // ==========================================
    // 2. ФУНКЦИИ ОТКРЫТИЯ СТРАНИЦ
    // ==========================================
    window.openStat = function () {
        window.location.href = '/stats';
    };

    window.openTasks = function () {
        window.location.href = '/tasks';
    };

    window.openWH = function () {
        window.location.href = '/warehouse';
    };

    window.openCRM = function () {
        window.location.href = '/crm';
    };

    window.openContact = function () {
        window.location.href = '/contact';
    };

    window.openEmpl = function () {
        window.location.href = '/employees';
    };

    window.openCompany = function () {
        window.location.href = '/company';
    };

    window.openSettings = function () {
        window.location.href = '/settings';
    };

    // ==========================================
    // 3. ВЫХОД
    // ==========================================
    window.vortexLogout = function () {
        localStorage.removeItem('vortex_token');
        window.location.href = '/';
    };

    // ==========================================
    // 4. ПОДСКАЗКИ ПРИ НАВЕДЕНИИ
    // ==========================================
    function initVortexHints() {
        // Создаем элемент для подсказки, если его нет
        let hint = document.getElementById('vortex-hint');
        if (!hint) {
            hint = document.createElement('div');
            hint.id = 'vortex-hint';
            document.body.appendChild(hint);
        }

        // Подсказки для элементов с data-label
        document.querySelectorAll('[data-label]').forEach(item => {
            item.addEventListener('mouseenter', (e) => {
                const hint = document.getElementById('vortex-hint');
                if (!hint) return;
                hint.innerText = item.getAttribute('data-label');
                hint.style.display = 'block';
                hint.style.left = e.pageX + 'px';
                hint.style.top = (e.pageY - 40) + 'px';
            });

            item.addEventListener('mouseleave', () => {
                const hint = document.getElementById('vortex-hint');
                if (hint) hint.style.display = 'none';
            });
        });

        // Подсказка для кнопки "Инструменты" (триггер)
        const triggerCell = document.querySelector('.vortex-trigger-cell');
        if (triggerCell) {
            const hint = document.getElementById('vortex-hint');
            if (!hint) return;

            triggerCell.addEventListener('mouseenter', (e) => {
                hint.innerHTML = `
                    <span style="display: flex; align-items: center; gap: 12px;">
                        
                        <span style="font-weight: 600; color: #ffffff;">Инструменты</span>
                        <span style="display: inline-flex; align-items: center; gap: 6px; background: rgba(0, 229, 255, 0.08); padding: 4px 12px; border-radius: 6px; border: 1px solid rgba(0, 229, 255, 0.1);">
                            <kbd>SHIFT</kbd>
                            <span style="color: rgba(255,255,255,0.2);">+</span>
                            <kbd>Q</kbd>
                        </span>
                        <span style="color: rgba(255,255,255,0.4); font-size: 12px;">показать/скрыть</span>
                    </span>
                `;
                hint.style.display = 'block';
                hint.style.left = e.pageX + 'px';
                hint.style.top = (e.pageY - 55) + 'px';
            });

            triggerCell.addEventListener('mouseleave', () => {
                const hint = document.getElementById('vortex-hint');
                if (hint) {
                    hint.style.display = 'none';
                    hint.innerHTML = '';
                }
            });
        }
    }

    // ==========================================
    // 5. DRAG & DROP (ПЕРЕТАСКИВАНИЕ)
    // ==========================================
    let draggedItem = null;
    let dragClone = null;
    let dragStartX = 0, dragStartY = 0;
    let isDragging = false;
    let dragTimeout = null;

    const openFunctions = {
        'Статистика': () => window.location.href = '/stats',
        'Задачи': () => window.location.href = '/tasks',
        'Склад': () => window.location.href = '/warehouse',
        'CRM': () => window.location.href = '/crm',
        'Контакт-центр': () => window.location.href = '/contact',
        'Сотрудники': () => window.location.href = '/employees',
        'Компания': () => window.location.href = '/company',
        'Настройки': () => window.location.href = '/settings'
    };

    function initDragAndDrop() {
        const toolCells = document.querySelectorAll('.vortex-tool-cell');

        toolCells.forEach(cell => {
            cell.setAttribute('draggable', 'false');

            cell.addEventListener('mousedown', (e) => {
                if (e.button === 0) {
                    e.preventDefault();
                    dragTimeout = setTimeout(() => {
                        startDrag(e, cell);
                    }, 150);
                    dragStartX = e.clientX;
                    dragStartY = e.clientY;
                }
            });

            cell.addEventListener('mouseup', (e) => {
                if (e.button === 0 && !isDragging && dragTimeout) {
                    clearTimeout(dragTimeout);
                    dragTimeout = null;
                    const label = cell.getAttribute('data-label');
                    const openFunction = openFunctions[label];
                    if (openFunction) openFunction();
                }
            });

            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                return false;
            });
        });

        document.addEventListener('mouseup', () => {
            if (dragTimeout) {
                clearTimeout(dragTimeout);
                dragTimeout = null;
            }
        });
    }

    function startDrag(e, element) {
        if (dragTimeout) {
            clearTimeout(dragTimeout);
            dragTimeout = null;
        }

        isDragging = true;
        draggedItem = element;
        const rect = draggedItem.getBoundingClientRect();

        dragStartX = e.clientX - rect.left;
        dragStartY = e.clientY - rect.top;

        dragClone = draggedItem.cloneNode(true);
        dragClone.style.position = 'fixed';
        dragClone.style.left = (e.clientX - dragStartX) + 'px';
        dragClone.style.top = (e.clientY - dragStartY) + 'px';
        dragClone.style.width = rect.width + 'px';
        dragClone.style.height = rect.height + 'px';
        dragClone.style.margin = '0';
        dragClone.style.opacity = '0.8';
        dragClone.style.zIndex = '9999';
        dragClone.style.cursor = 'grabbing';
        dragClone.style.pointerEvents = 'none';
        dragClone.style.transition = 'none';
        document.body.appendChild(dragClone);

        draggedItem.style.opacity = '0.3';

        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', onDragEnd);
    }

    function onDragMove(e) {
        if (!dragClone || !isDragging) return;
        e.preventDefault();
        dragClone.style.left = (e.clientX - dragStartX) + 'px';
        dragClone.style.top = (e.clientY - dragStartY) + 'px';
    }

    function onDragEnd(e) {
        if (!dragClone || !isDragging) {
            if (draggedItem) draggedItem.style.opacity = '1';
            draggedItem = null;
            dragClone = null;
            isDragging = false;
            document.removeEventListener('mousemove', onDragMove);
            document.removeEventListener('mouseup', onDragEnd);
            return;
        }

        const elemUnderCursor = document.elementsFromPoint(e.clientX, e.clientY);
        const toolsGrid = document.getElementById('tools-menu');

        let targetCell = null;
        for (let elem of elemUnderCursor) {
            if (elem.classList && elem.classList.contains('vortex-tool-cell') && elem !== draggedItem) {
                targetCell = elem;
                break;
            }
        }

        if (targetCell && toolsGrid) {
            const items = Array.from(toolsGrid.children);
            const draggedIndex = items.indexOf(draggedItem);
            const targetIndex = items.indexOf(targetCell);

            if (draggedIndex < targetIndex) {
                targetCell.parentNode.insertBefore(draggedItem, targetCell.nextSibling);
            } else {
                targetCell.parentNode.insertBefore(draggedItem, targetCell);
            }

            saveToolsOrder();

            targetCell.style.transform = 'scale(1.1)';
            setTimeout(() => {
                if (targetCell) targetCell.style.transform = '';
            }, 200);
        }

        dragClone.remove();
        draggedItem.style.opacity = '1';
        draggedItem = null;
        dragClone = null;
        isDragging = false;

        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
    }

    function saveToolsOrder() {
        const toolsGrid = document.getElementById('tools-menu');
        if (toolsGrid) {
            const order = Array.from(toolsGrid.children).map(child => child.getAttribute('data-label'));
            localStorage.setItem('vortex_tools_order', JSON.stringify(order));
        }
    }

    function restoreToolsOrder() {
        const savedOrder = JSON.parse(localStorage.getItem('vortex_tools_order'));
        const toolsGrid = document.getElementById('tools-menu');
        if (savedOrder && toolsGrid) {
            const items = Array.from(toolsGrid.children);
            savedOrder.forEach(label => {
                const item = items.find(el => el.getAttribute('data-label') === label);
                if (item) toolsGrid.appendChild(item);
            });
        }
    }

    // ==========================================
    // 6. ПРОВЕРКА ПРАВ ДОСТУПА
    // ==========================================
    function checkAccessControl() {
        const rawRole = localStorage.getItem('role') || "";
        const userRole = rawRole.toLowerCase().trim();
        const allowedRoles = ['admin', 'integrator', 'director'];

        const settingsBtn = document.getElementById('tool-settings');
        if (settingsBtn) {
            if (!allowedRoles.includes(userRole)) {
                settingsBtn.remove();
            } else {
                settingsBtn.style.setProperty('display', 'flex', 'important');
            }
        }

        const companyBtn = document.getElementById('tool-company');
        if (companyBtn) {
            if (!allowedRoles.includes(userRole)) {
                companyBtn.remove();
            } else {
                companyBtn.style.setProperty('display', 'flex', 'important');
            }
        }
    }

    // ==========================================
    // 7. ЗАМЕНА GIF НА СТАТИКУ
    // ==========================================
    function makeGifStaticOnHover() {
        const gifElements = document.querySelectorAll('.vortex-trigger-cell img, .vortex-exit-cell img, .vortex-tool-cell img');

        gifElements.forEach(img => {
            const originalSrc = img.src;
            if (!originalSrc.toLowerCase().includes('.gif')) return;

            const tempImg = new Image();
            tempImg.src = originalSrc;

            tempImg.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = tempImg.naturalWidth;
                canvas.height = tempImg.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(tempImg, 0, 0);

                const staticSrc = canvas.toDataURL();

                img.src = staticSrc;

                img.parentElement.addEventListener('mouseenter', () => {
                    img.src = originalSrc + '?t=' + Date.now();
                });

                img.parentElement.addEventListener('mouseleave', () => {
                    img.src = staticSrc;
                });
            };
        });
    }

    // ==========================================
    // 8. ИНИЦИАЛИЗАЦИЯ
    // ==========================================
    function initTools() {
        checkAccessControl();
        restoreToolsOrder();
        initDragAndDrop();
        initVortexHints();
        setTimeout(makeGifStaticOnHover, 500);

        // ВОССТАНАВЛИВАЕМ ВИДИМОСТЬ (если была скрыта)
        restoreToolsVisibility();

        // ИНИЦИАЛИЗИРУЕМ SHIFT + Q
        initKeyboardHide();
    }

    // Запуск при загрузке
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTools);
    } else {
        initTools();
    }

    // ==========================================
    // 9. СКРЫТИЕ/ПОКАЗ ВСЕХ КНОПОК ПО SHIFT + Q
    // ==========================================

    function hideAllTools() {
        // Скрываем только нижнюю панель с инструментами
        const bottomBar = document.querySelector('.vortex-bottom-bar');
        if (bottomBar) bottomBar.style.display = 'none';

        // НЕ СКРЫВАЕМ боковую панель задач (она должна оставаться)
        // const sidePanel = document.getElementById('vortex-side-tasks');
        // if (sidePanel) sidePanel.style.display = 'none';

        localStorage.setItem('vortex_tools_hidden', 'true');
    }

    function showAllTools() {
        // Показываем нижнюю панель
        const bottomBar = document.querySelector('.vortex-bottom-bar');
        if (bottomBar) bottomBar.style.display = '';

        // Боковая панель задач и так видима, не трогаем её
        localStorage.removeItem('vortex_tools_hidden');
    }

    function restoreToolsVisibility() {
        if (localStorage.getItem('vortex_tools_hidden') === 'true') {
            const bottomBar = document.querySelector('.vortex-bottom-bar');
            if (bottomBar) bottomBar.style.display = 'none';
        }
    }

    function initKeyboardHide() {
        document.addEventListener('keydown', function (e) {
            const key = e.key.toLowerCase();
            if (e.shiftKey && (key === 'q' || key === 'й')) {
                e.preventDefault();

                const isHidden = localStorage.getItem('vortex_tools_hidden') === 'true';
                if (isHidden) {
                    showAllTools();
                } else {
                    hideAllTools();
                }
            }
        });
    }

})();