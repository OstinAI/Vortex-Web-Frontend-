/**
 * ============================================
 * УНИВЕРСАЛЬНЫЕ НЕОНОВЫЕ КАПЛИ
 * Динамическое расстояние между каплями
 * Версия: 6.0
 * ============================================
 */

class NeonDrops {
    constructor(options = {}) {
        this.settings = {
            container: options.container || '.neon-drops',
            count: options.count || 8,
            speed: options.speed || 5000,
            delay: options.delay || 180,
            color: options.color || '#00FFFF',
            onComplete: options.onComplete || null
        };

        this.drops = [];
        this.isActive = false;
        this.animationId = null;
        this.startTime = 0;
        this.container = document.querySelector(this.settings.container);

        if (!this.container) {
            console.error('Контейнер для капель не найден!');
            return;
        }

        this.init();
    }

    init() {
        for (let i = 0; i < this.settings.count; i++) {
            const drop = document.createElement('div');
            drop.className = 'neon-drop';

            const size = 2 + Math.random() * 1;
            drop.style.width = size + 'px';
            drop.style.height = size + 'px';
            drop.dataset.baseSize = size;

            drop.style.background = this.settings.color;
            drop.style.boxShadow = `
                0 0 6px ${this.settings.color}88,
                0 0 12px ${this.settings.color}44,
                0 0 20px ${this.settings.color}22
            `;

            drop.style.borderRadius = '0 50% 50% 0';
            drop.style.clipPath = 'polygon(0 0, 100% 20%, 100% 80%, 0 100%)';

            drop.style.opacity = '0';
            drop.style.left = '-20px';

            this.container.appendChild(drop);
            this.drops.push({
                element: drop,
                index: i,
                isActive: false,
                progress: 0,
                startDelay: i * this.settings.delay,
                size: size,
                offset: 0
            });
        }
    }

    start() {
        if (this.isActive) {
            this.stop();
        }
        this.isActive = true;
        this.startTime = performance.now();

        this.drops.forEach((drop, index) => {
            setTimeout(() => {
                if (!this.isActive) return;
                drop.isActive = true;
                drop.element.style.opacity = '1';
                drop.element.style.transition = 'none';
            }, drop.startDelay);
        });

        this.animate();
    }

    stop() {
        this.isActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.drops.forEach(drop => {
            drop.element.style.opacity = '0';
            drop.element.style.left = '-20px';
            drop.isActive = false;
            drop.progress = 0;
        });
    }

    animate() {
        if (!this.isActive) return;

        const now = performance.now();
        const elapsed = now - this.startTime;

        this.drops.forEach((drop, index) => {
            if (!drop.isActive) return;

            const dropElapsed = elapsed - drop.startDelay;
            if (dropElapsed < 0) return;

            const cycleDuration = this.settings.speed;
            let rawProgress = dropElapsed / cycleDuration;
            let progress = rawProgress % 1;

            const easedProgress = this.customEase(progress);

            // ============================================
            // РАСЧЁТ РАССТОЯНИЯ МЕЖДУ КАПЛЯМИ
            // ============================================

            // Базовое расстояние между каплями (в процентах)
            const totalDrops = this.drops.length;

            // Динамическое расстояние в зависимости от прогресса
            // В начале - растяжение, в середине - сжатие, в конце - растяжение и сжатие
            let spacingMultiplier;

            if (progress < 0.15) {
                // Начало: выход и растяжение
                const p = progress / 0.15;
                spacingMultiplier = 0.3 + p * 0.7;
            } else if (progress < 0.45) {
                // Первая половина: плавное сжатие к середине
                const p = (progress - 0.15) / 0.3;
                spacingMultiplier = 1.0 - p * 0.5;
            } else if (progress < 0.65) {
                // Середина: минимальное расстояние (сжатие)
                const p = (progress - 0.45) / 0.2;
                spacingMultiplier = 0.5 + p * 0.3;
            } else if (progress < 0.85) {
                // Вторая половина: растяжение
                const p = (progress - 0.65) / 0.2;
                spacingMultiplier = 0.8 + p * 0.7;
            } else {
                // Конец: сжатие и исчезновение
                const p = (progress - 0.85) / 0.15;
                spacingMultiplier = 1.5 - p * 1.2;
            }

            // Минимальное и максимальное расстояние в процентах
            const minSpacing = 2.5;  // ~5-10px при ширине экрана
            const maxSpacing = 18;   // растяжение

            const currentSpacing = minSpacing + (maxSpacing - minSpacing) *
                Math.max(0, Math.min(1, spacingMultiplier / 2));

            // Позиция капли с учётом расстояния
            const baseOffset = (index / (totalDrops - 1)) * 100;

            // Смещение относительно базовой позиции
            const spread = currentSpacing * (index - (totalDrops - 1) / 2);

            // Основная позиция с динамическим расстоянием
            let position = easedProgress * 105 + spread * 0.4;

            // Добавляем небольшое смещение для плавности
            position = position + (index / totalDrops) * 0.5;

            // Ограничиваем позицию
            position = Math.max(-15, Math.min(115, position));

            drop.element.style.left = position + '%';
            drop.element.style.transform = 'translateX(-50%)';

            // Обновляем внешний вид
            this.updateDropAppearance(drop, easedProgress, progress);

            drop.progress = easedProgress;
            drop.offset = spread;
        });

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    updateDropAppearance(drop, progress, rawProgress) {
        const el = drop.element;

        // Прозрачность
        let opacity = 1;
        if (progress < 0.02) {
            opacity = progress / 0.02;
        } else if (progress > 0.92) {
            opacity = 1 - ((progress - 0.92) / 0.08);
            opacity = Math.max(0, opacity);
        }
        el.style.opacity = opacity;

        // Размер
        const baseSize = parseFloat(drop.size);
        const scale = 1 + Math.sin(progress * Math.PI) * 0.15;
        const currentSize = baseSize * scale;
        el.style.width = currentSize + 'px';
        el.style.height = currentSize + 'px';

        // Свечение
        const glowIntensity = Math.sin(progress * Math.PI);
        const glowSize = 6 + glowIntensity * 12;
        el.style.boxShadow = `
            0 0 6px ${this.settings.color}88,
            0 0 ${glowSize}px ${this.settings.color}55,
            0 0 ${glowSize * 1.5}px ${this.settings.color}22
        `;
    }

    customEase(t) {
        if (t <= 0) return 0;
        if (t >= 1) return 1;

        if (t < 0.15) {
            const p = t / 0.15;
            return p * p * 0.08;
        } else if (t < 0.4) {
            const p = (t - 0.15) / 0.25;
            return 0.08 + p * 0.37;
        } else if (t < 0.6) {
            const p = (t - 0.4) / 0.2;
            return 0.45 + p * 0.25;
        } else if (t < 0.8) {
            const p = (t - 0.6) / 0.2;
            return 0.7 + p * 0.2;
        } else {
            const p = (t - 0.8) / 0.2;
            return 0.9 + p * p * 0.1;
        }
    }

    destroy() {
        this.stop();
        this.drops.forEach(drop => {
            drop.element.remove();
        });
        this.drops = [];
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

function initNeonDrops(selector, options = {}) {
    const container = document.querySelector(selector);
    if (!container) {
        console.error(`Элемент "${selector}" не найден!`);
        return null;
    }

    let dropsContainer = container.querySelector('.neon-drops');
    if (!dropsContainer) {
        dropsContainer = document.createElement('div');
        dropsContainer.className = 'neon-drops';
        container.appendChild(dropsContainer);
    }

    const drops = new NeonDrops({
        container: '.neon-drops',
        count: options.count || 8,
        speed: options.speed || 5000,
        delay: options.delay || 180,
        color: options.color || '#00FFFF',
        onComplete: options.onComplete || null
    });

    const parent = container;
    let isHovering = false;

    parent.addEventListener('mouseenter', () => {
        if (isHovering) return;
        isHovering = true;
        drops.start();
    });

    parent.addEventListener('mouseleave', () => {
        isHovering = false;
        drops.stop();
    });

    return drops;
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-neon-drops]').forEach(element => {
        const options = {
            count: parseInt(element.dataset.dropsCount) || 8,
            speed: parseInt(element.dataset.dropsSpeed) || 5000,
            delay: parseInt(element.dataset.dropsDelay) || 180,
            color: element.dataset.dropsColor || '#00FFFF'
        };
        initNeonDrops(`[data-neon-drops]`, options);
    });
});