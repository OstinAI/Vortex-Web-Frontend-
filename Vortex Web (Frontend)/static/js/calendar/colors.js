/**
 * Модуль централизованного управления цветами интерфейса Vortex OS.
 * Содержит системные статусные цвета, радужную палитру для меток задач и логику кастомного выбора.
 */

// 1. Статусные цвета вашей CRM-системы (для левых неоновых границ карточек)
const VORTEX_STATUS_PALETTE = {
    cyan: '#00E5FF',      // Новая / Обычная задача
    amber: '#FFD700',     // В работе
    emerald: '#00E676',   // Выполнена / Завершена
    coral: '#FF5252',     // Отменена / Срочно
    slate: '#90A4AE'      // Неопределенный дефолтный статус
};

/**
 * Возвращает цвет в зависимости от статуса задачи.
 * @param {string} status - Статус задачи ('open', 'in_progress', 'done', 'canceled')
 * @returns {string} HEX-код цвета
 */
function getStatusColor(status) {
    const cleanStatus = (status || '').toString().trim().toLowerCase();

    switch (cleanStatus) {
        case 'open':
        case 'normal':
            return VORTEX_STATUS_PALETTE.cyan;
        case 'in_progress':
            return VORTEX_STATUS_PALETTE.amber;
        case 'done':
            return VORTEX_STATUS_PALETTE.emerald;
        case 'canceled':
            return VORTEX_STATUS_PALETTE.coral;
        default:
            return VORTEX_STATUS_PALETTE.slate;
    }
}




function updateModalAccentLine(color) {
    const modalTop = document.querySelector('.modal-top');
    if (modalTop) {
        modalTop.style.borderBottomColor = color || '#00E5FF';
        // Обновляем цвет свечения
        modalTop.style.animation = 'none';
        modalTop.offsetHeight; // Триггер перерисовки
        modalTop.style.animation = 'modalGlow 2s ease-in-out infinite';

        // Обновляем тень текста у заголовка
        const h3 = modalTop.querySelector('h3');
        if (h3) {
            h3.style.textShadow = `0 0 5px ${color}`;
        }
    }
}

/**
 * Извлекает цвет из системной метки [color:#HEX] в тексте описания 
 * и возвращает объект с чистым описанием и цветом.
 */
function parseTaskDescriptionAndColor(rawDescription) {
    const text = rawDescription || "";
    const colorRegex = /\[color:\s*(#[0-9A-Fa-f]{6})\]/;
    const match = text.match(colorRegex);

    if (match) {
        const color = match[1];
        const cleanDescription = text.replace(colorRegex, '').trim();
        return { description: cleanDescription, color: color };
    }

    return { description: text.trim(), color: null };
}

// Вспомогательная функция конвертации цвета
// Вспомогательная функция конвертации цвета
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 2. Менеджер Радужного Пикера (7 цветов радуги + 8-й кастомный серый)
const VortexColorPicker = {
    rainbowColors: [
        '#FF5252', // Красный
        '#FF9100', // Оранжевый
        '#FFD700', // Желтый
        '#00E676', // Зеленый
        '#00E5FF', // Голубой
        '#2979FF', // Синий
        '#AA00FF'  // Фиолетовый
    ],
    selectedColor: '#00E5FF',
    containerId: 'taskColorPickerContainer',
    inputId: 'vortexCustomColorInput',

    init() {
        this.initObserver();
        const customInput = document.getElementById(this.inputId);
        if (customInput) {
            customInput.addEventListener('input', (e) => {
                this.selectedColor = e.target.value;
                this.render();
            });
            customInput.addEventListener('change', (e) => {
                this.selectedColor = e.target.value;
                this.render();
            });
        }
        this.render();
    },

    initObserver() {
        const observer = new MutationObserver((mutations) => {
            const modal = document.querySelector('.modal-surface');
            if (modal && !modal.dataset.initialized) {
                modal.dataset.initialized = "true";
                this.reset();
            }
            if (!modal) {
                document.querySelectorAll('.modal-surface').forEach(m => delete m.dataset.initialized);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    },

    /**
     * Задать текущий активный цвет извне (при загрузке задачи из БД)
     */
    setColor(color) {
        this.selectedColor = color || '#00E5FF';
        updateModalAccentLine(this.selectedColor);
        this.render();
    },

    reset() {
        this.selectedColor = '#00E5FF';
        updateModalAccentLine('#00E5FF');
        this.render();
    },

    getSelectedColor() {
        return this.selectedColor;
    },

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = '';

        // 1. Рендер радуги
        this.rainbowColors.forEach(color => {
            const circle = document.createElement('div');
            const isActive = this.selectedColor.toUpperCase() === color.toUpperCase();
            circle.className = `vortex-color-circle ${isActive ? 'active' : ''}`;
            circle.style.backgroundColor = color;

            circle.onclick = () => {
                this.selectedColor = color;
                updateModalAccentLine(color);

                // Автоматически обновляем тег цвета в поле описания, удаляя старые
                const descInput = document.getElementById('task-desc');
                if (descInput) {
                    let currentDesc = descInput.value;
                    // Регулярка удаляет абсолютно все старые теги [color:...]
                    const colorRegex = /\[color:\s*#[0-9A-Fa-f]{6}\]\s*/g;
                    currentDesc = currentDesc.replace(colorRegex, '').trim();

                    // Добавляем один новый тег с новой строчки
                    descInput.value = currentDesc ? `${currentDesc}\n\n[color:${color}]` : `[color:${color}]`;
                }

                this.render();
            };
            container.appendChild(circle);
        });

        // 2. Рендер 8-го кружка
        const isRainbowColor = this.rainbowColors.map(c => c.toUpperCase()).includes(this.selectedColor.toUpperCase());
        const customCircle = document.createElement('div');
        customCircle.className = `vortex-color-circle custom-palette-btn ${!isRainbowColor ? 'active' : ''}`;
        customCircle.innerHTML = '<i class="fa-solid fa-palette"></i>';

        if (!isRainbowColor) {
            customCircle.style.backgroundColor = this.selectedColor;
        }

        customCircle.onclick = (e) => {
            const existing = document.getElementById('vortex-picker-popup');
            if (existing) {
                existing.remove();
                return;
            }

            const popup = document.createElement('div');
            popup.id = 'vortex-picker-popup';
            popup.tabIndex = 0;
            popup.style.outline = 'none';
            popup.style.cssText = `
                position: absolute; background: #0f172a; padding: 15px; border-radius: 12px; 
                border: 1px solid #334155; z-index: 9999; box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            `;

            document.body.appendChild(popup);
            popup.focus();

            const rect = customCircle.getBoundingClientRect();
            popup.style.top = (rect.bottom + window.scrollY + 8) + 'px';
            popup.style.left = (rect.left + window.scrollX) + 'px';

            const colorPicker = iro.ColorPicker(popup, {
                width: 150,
                color: this.selectedColor,
                layout: [{ component: iro.ui.Wheel }, { component: iro.ui.Slider }]
            });

            colorPicker.on('color:change', (color) => {
                const newColor = color.hexString;
                this.selectedColor = newColor;
                customCircle.style.backgroundColor = newColor;
                updateModalAccentLine(newColor);
                hexInput.value = newColor;
            });

            const hexInput = document.createElement('input');
            hexInput.type = "text";
            hexInput.value = this.selectedColor;
            hexInput.style.cssText = `
                width: 130px; 
                margin-top: 10px; 
                padding: 8px; 
                background: #1e293b; 
                border: 1px solid #334155; 
                color: #fff; 
                text-align: center; 
                border-radius: 4px; 
                font-family: monospace;
                display: block;
                margin-left: auto;
                margin-right: auto;
                box-sizing: border-box;
            `;
            popup.appendChild(hexInput);

           

           

            hexInput.addEventListener('input', (e) => {
                const val = e.target.value;
                if (/^#[0-9A-F]{6}$/i.test(val)) {
                    colorPicker.color.hexString = val;
                    this.selectedColor = val;
                    customCircle.style.backgroundColor = val;
                    updateModalAccentLine(val);
                }
            });

            // 🔥 ДОБАВИТЬ ОБРАБОТЧИК ENTER
            hexInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = hexInput.value;
                    if (/^#[0-9A-F]{6}$/i.test(val)) {
                        this.selectedColor = val;
                        customCircle.style.backgroundColor = val;
                        updateModalAccentLine(val);
                        this.render();
                        popup.remove();
                    } else {
                        alert('Введите корректный HEX цвет (например: #00E5FF)');
                    }
                }
            });

            setTimeout(() => {
                document.addEventListener('click', function closePicker(event) {
                    if (!popup.contains(event.target) && event.target !== customCircle) {
                        popup.remove();
                        document.removeEventListener('click', closePicker);
                        VortexColorPicker.render();
                    }
                });
            }, 100);
        };

        container.appendChild(customCircle);
    }
};

// --- ИСПРАВЛЕННЫЙ НАБЛЮДАТЕЛЬ ЗА МОДАЛКОЙ ---
let lastTaskId = null;
const observer = new MutationObserver(() => {
    const modal = document.querySelector('.modal-surface');
    if (modal) {
        // Замени 'some-task-id-field' на актуальный ID (например 'editingEventId' или 'edit-task-id')
        const taskIdField = document.getElementById('editingEventId') || document.getElementById('edit-task-id');
        const currentTaskId = taskIdField ? taskIdField.value : '';

        if (currentTaskId !== lastTaskId) {
            lastTaskId = currentTaskId;
            // Если это открытие формы создания НОВОЙ задачи (ID пустой) — сбрасываем в дефолт
            if (!currentTaskId) {
                VortexColorPicker.reset();
            }
        }
    } else {
        lastTaskId = null;
    }
});
observer.observe(document.body, { childList: true, subtree: true });

window.VortexColors = {
    getStatusColor,
    VORTEX_STATUS_PALETTE,
    parseTaskDescriptionAndColor
};
window.VortexColorPicker = VortexColorPicker;