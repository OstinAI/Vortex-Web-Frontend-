/**
 * Разделение окна на левую и правую часть
 * Блюр работает на ТОЙ части, которая закрыта (свернута до 40px)
 */

document.addEventListener('DOMContentLoaded', function () {
    console.log('✅ Separation module loaded');

    // ============================================
    // СОЗДАНИЕ СТРУКТУРЫ РАЗДЕЛЕНИЯ
    // ============================================
    const overlay = document.querySelector('.content-overlay');

    if (overlay) {
        overlay.innerHTML = '';
        overlay.style.padding = '0';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'stretch';
        overlay.style.flexDirection = 'column';

        const splitContainer = document.createElement('div');
        splitContainer.className = 'split-container';
        splitContainer.id = 'splitContainer';

        const leftPart = document.createElement('div');
        leftPart.className = 'split-left';
        leftPart.id = 'splitLeft';
        leftPart.innerHTML = `<div class="content-wrapper" id="leftContent"></div>`;

        const divider = document.createElement('div');
        divider.className = 'split-divider';
        divider.id = 'splitDivider';

        const neonGlow = document.createElement('div');
        neonGlow.className = 'neon-glow';
        divider.appendChild(neonGlow);

        const rightPart = document.createElement('div');
        rightPart.className = 'split-right';
        rightPart.id = 'splitRight';
        rightPart.innerHTML = `<div class="content-wrapper" id="rightContent"></div>`;

        splitContainer.appendChild(leftPart);
        splitContainer.appendChild(divider);
        splitContainer.appendChild(rightPart);
        overlay.appendChild(splitContainer);

        console.log('✅ Structure created');
    } else {
        console.warn('⚠️ .content-overlay not found');
        return;
    }

    // ============================================
    // КОНСТАНТЫ И ПЕРЕМЕННЫЕ
    // ============================================
    const container = document.getElementById('splitContainer');
    const divider = document.getElementById('splitDivider');
    const leftPart = document.getElementById('splitLeft');
    const rightPart = document.getElementById('splitRight');

    const MIN_WIDTH = 40;
    const GLASS_THRESHOLD = 80;
    const STORAGE_KEY = 'split_position';

    let isDragging = false;
    let startX = 0;
    let startLeftWidth = 0;

    // ============================================
    // ФУНКЦИИ
    // ============================================

    // Обновление эффекта стекла
    function updateGlassEffect(leftWidth, containerWidth) {
        // Сначала убираем блюр со всех частей
        leftPart.classList.remove('glass-effect');
        rightPart.classList.remove('glass-effect');

        // Вычисляем ширину правой части
        const rightWidth = containerWidth - leftWidth - 2; // 2px - ширина разделителя

        // Если левая часть свернута до минимума - блюрим её
        if (leftWidth <= GLASS_THRESHOLD) {
            leftPart.classList.add('glass-effect');
        }

        // Если правая часть свернута до минимума - блюрим её
        if (rightWidth <= GLASS_THRESHOLD) {
            rightPart.classList.add('glass-effect');
        }

        // Логирование для отладки (раскомментировать при необходимости)
        // console.log(`📐 Left: ${leftWidth}px, Right: ${rightWidth}px, Glass: L=${leftPart.classList.contains('glass-effect')}, R=${rightPart.classList.contains('glass-effect')}`);
    }

    // Сохранение позиции в localStorage
    function savePosition(width) {
        try {
            localStorage.setItem(STORAGE_KEY, width.toString());
        } catch (e) {
            console.warn('⚠️ Could not save position:', e);
        }
    }

    // Загрузка позиции из localStorage
    function loadPosition() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved !== null) {
                return parseFloat(saved);
            }
        } catch (e) {
            console.warn('⚠️ Could not load position:', e);
        }
        return null;
    }

    // Установка ширины левой части
    function setLeftWidth(width, save = true) {
        const containerWidth = container.offsetWidth;
        const maxLeftWidth = containerWidth - MIN_WIDTH - 2;
        const clampedWidth = Math.min(Math.max(width, MIN_WIDTH), maxLeftWidth);

        leftPart.style.flex = 'none';
        leftPart.style.width = clampedWidth + 'px';
        rightPart.style.flex = '1';

        updateGlassEffect(clampedWidth, containerWidth);

        if (save) {
            savePosition(clampedWidth);
        }

        // Вызываем проверку видимости кнопок если функция существует
        if (typeof window.checkButtonsVisibility === 'function') {
            setTimeout(window.checkButtonsVisibility, 10);
        }
    }

    // ============================================
    // ЗАГРУЗКА СОХРАНЁННОЙ ПОЗИЦИИ
    // ============================================
    const savedWidth = loadPosition();

    setTimeout(function () {
        const containerWidth = container.offsetWidth;
        if (savedWidth !== null) {
            setLeftWidth(savedWidth, false);
        } else {
            // По умолчанию: левая часть открыта на 30% от ширины контейнера
            const defaultWidth = Math.round(containerWidth * 0.3);
            const clampedDefault = Math.min(Math.max(defaultWidth, MIN_WIDTH), containerWidth - MIN_WIDTH - 2);
            setLeftWidth(clampedDefault, false);
        }
        console.log('📍 Position loaded:', leftPart.offsetWidth + 'px');
    }, 50);

    // ============================================
    // РЕСАЙЗ РАЗДЕЛИТЕЛЯ
    // ============================================

    if (divider && container) {
        // Mouse events
        divider.addEventListener('mousedown', function (e) {
            isDragging = true;
            startX = e.clientX;
            startLeftWidth = leftPart.offsetWidth;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            divider.style.background = 'rgba(0, 255, 255, 0.8)';
            divider.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.4), 0 0 40px rgba(0, 255, 255, 0.2)';
        });

        document.addEventListener('mousemove', function (e) {
            if (!isDragging) return;

            const containerWidth = container.offsetWidth;
            const deltaX = e.clientX - startX;
            const newLeftWidth = startLeftWidth + deltaX;

            const maxLeftWidth = containerWidth - MIN_WIDTH - 2;
            const clampedWidth = Math.min(Math.max(newLeftWidth, MIN_WIDTH), maxLeftWidth);

            leftPart.style.flex = 'none';
            leftPart.style.width = clampedWidth + 'px';
            rightPart.style.flex = '1';

            updateGlassEffect(clampedWidth, containerWidth);

            // Вызываем проверку видимости кнопок при движении
            if (typeof window.checkButtonsVisibility === 'function') {
                window.checkButtonsVisibility();
            }
        });

        document.addEventListener('mouseup', function () {
            if (isDragging) {
                isDragging = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                divider.style.background = '';
                divider.style.boxShadow = '';

                const currentWidth = leftPart.offsetWidth;
                savePosition(currentWidth);
                console.log('💾 Position saved:', currentWidth + 'px');

                // Вызываем проверку видимости кнопок после завершения
                if (typeof window.checkButtonsVisibility === 'function') {
                    setTimeout(window.checkButtonsVisibility, 50);
                }
            }
        });

        // Touch events
        divider.addEventListener('touchstart', function (e) {
            isDragging = true;
            startX = e.touches[0].clientX;
            startLeftWidth = leftPart.offsetWidth;
            divider.style.background = 'rgba(0, 255, 255, 0.8)';
            divider.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.4), 0 0 40px rgba(0, 255, 255, 0.2)';
        });

        document.addEventListener('touchmove', function (e) {
            if (!isDragging) return;

            const containerWidth = container.offsetWidth;
            const deltaX = e.touches[0].clientX - startX;
            const newLeftWidth = startLeftWidth + deltaX;

            const maxLeftWidth = containerWidth - MIN_WIDTH - 2;
            const clampedWidth = Math.min(Math.max(newLeftWidth, MIN_WIDTH), maxLeftWidth);

            leftPart.style.flex = 'none';
            leftPart.style.width = clampedWidth + 'px';
            rightPart.style.flex = '1';

            updateGlassEffect(clampedWidth, containerWidth);

            // Вызываем проверку видимости кнопок при движении
            if (typeof window.checkButtonsVisibility === 'function') {
                window.checkButtonsVisibility();
            }
        });

        document.addEventListener('touchend', function () {
            if (isDragging) {
                isDragging = false;
                divider.style.background = '';
                divider.style.boxShadow = '';

                const currentWidth = leftPart.offsetWidth;
                savePosition(currentWidth);
                console.log('💾 Position saved:', currentWidth + 'px');

                // Вызываем проверку видимости кнопок после завершения
                if (typeof window.checkButtonsVisibility === 'function') {
                    setTimeout(window.checkButtonsVisibility, 50);
                }
            }
        });
    }

    // ============================================
    // ОБРАБОТКА ИЗМЕНЕНИЯ РАЗМЕРА ОКНА
    // ============================================
    let resizeTimeout;

    window.addEventListener('resize', function () {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function () {
            if (leftPart.style.width && !leftPart.style.flex) {
                const containerWidth = container.offsetWidth;
                const currentWidth = parseFloat(leftPart.style.width);

                const maxLeftWidth = containerWidth - MIN_WIDTH - 2;
                const clampedWidth = Math.min(Math.max(currentWidth, MIN_WIDTH), maxLeftWidth);

                if (currentWidth < MIN_WIDTH || currentWidth > maxLeftWidth) {
                    leftPart.style.width = clampedWidth + 'px';
                }

                updateGlassEffect(clampedWidth, containerWidth);

                // Вызываем проверку видимости кнопок
                if (typeof window.checkButtonsVisibility === 'function') {
                    setTimeout(window.checkButtonsVisibility, 50);
                }
            }
        }, 200);
    });

    // ============================================
    // ПЕРИОДИЧЕСКАЯ ПРОВЕРКА СОСТОЯНИЯ ПРАВОЙ ПАНЕЛИ
    // ============================================
    setInterval(function () {
        if (typeof window.checkButtonsVisibility === 'function') {
            window.checkButtonsVisibility();
        }
    }, 500);

    console.log('🚀 Split view ready (glass on closed part)');
});