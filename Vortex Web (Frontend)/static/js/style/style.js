const canvas = document.getElementById('spiralCanvas');

if (canvas) {
    const ctx = canvas.getContext('2d');
    let points = [];
    let dustParticles = [];
    let explosions = [];
    const numPoints = 1100;
    const maxDust = 300;
    let angleOffset = 0;
    const mouse = { x: -2000, y: -2000 };

    let galaxyTwist = Math.random() * 7 + 5;
    let armCount = Math.floor(Math.random() * 3) + 2;

    // === НАСТРОЙКИ НАКЛОНА ГАЛАКТИКИ ===
    const galaxyScaleY = 0.4; // Степень сплющивания (от 0 до 1). Чем меньше, тем сильнее наклонена "от нас"
    const galaxyTilt = 0.2;   // Поворот всей галактики в радианах (примерно -11 градусов). Сдвигает левый/правый край выше/ниже

    // 1. АВТОМАТИЧЕСКИЙ СБОР ВСЕХ ПЛАШЕК
    const featureLabels = document.querySelectorAll('.feature-label');
    const featElements = Array.from(featureLabels);
    const totalFeatures = featElements.length;

    window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener('resize', resize);

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initPoints();
    }

    function initPoints() {
        points = [];
        dustParticles = [];
        explosions = [];
        galaxyTwist = Math.random() * 8 + 4;
        armCount = Math.floor(Math.random() * 3) + 2;

        // Центральная черная дыра
        points.push({
            distRatio: 0,
            baseAngle: 0,
            type: 'core_blackhole',
            alive: true,
            alpha: 1,
            baseRadius: 15 + Math.random() * 10,
            x: 0, y: 0
        });

        for (let i = 1; i < numPoints; i++) {
            const roll = Math.random();
            let type = 'star';
            if (roll < 0.02) type = 'quasar';
            else if (roll < 0.04) type = 'blackhole';
            else if (roll < 0.18) type = 'pulsar';

            // 2. РАСПРЕДЕЛЕНИЕ ПРЕИМУЩЕСТВ ПО ОРБИТАМ
            const isFeature = i <= totalFeatures;
            const distance = isFeature ? (0.25 + (i * 0.05)) : (0.05 + Math.random() * 0.95);

            const angle = (distance * galaxyTwist) + (Math.floor(Math.random() * armCount) * (Math.PI * 2 / armCount));
            const thicknessPower = (1 - distance) * 0.6;
            const scatter = isFeature ? 0 : (Math.random() - 0.5) * (0.25 + thicknessPower);

            points.push({
                distRatio: distance,
                baseAngle: angle + scatter,
                type: isFeature ? 'pulsar' : type,
                alive: true,
                alpha: 0.3 + Math.random() * 0.6,
                baseRadius: type === 'blackhole' ? 5 : (type === 'quasar' ? 3 : 1.5),
                x: 0, y: 0,
                featureIdx: isFeature ? i - 1 : -1
            });
        }
    }

    function triggerExplosion(x, y, color) {
        if (explosions.length > 5) return;
        explosions.push({ x: x, y: y, size: 2, maxSize: 50, alpha: 1.0, color: color || '255, 255, 255' });
    }

    function createDust(x, y, color, speed = 1) {
        if (dustParticles.length > maxDust) return;
        dustParticles.push({
            x: x, y: y, vx: (Math.random() - 0.5) * speed, vy: (Math.random() - 0.5) * speed,
            life: 1.0, color: color || '0, 255, 255'
        });
    }

    // Переменные для определения типа устройства (добавь в глобальную область, если их нет)
    const isMobileOrTV = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|SmartTV|Tizen|LG|NetCast|Web0S/i.test(navigator.userAgent);

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        const maxRadius = Math.min(canvas.width, canvas.height) * 0.65;
        angleOffset -= 0.0006;

        // 3. ПОЗИЦИОНИРОВАНИЕ ЦЕНТРАЛЬНОЙ КНОПКИ (Устраняем прыжки)
        const cta = document.getElementById('cta-button');
        if (cta) {
            // Принудительно сбрасываем старые left и top, чтобы они не дергали кнопку
            cta.style.left = '0px';
            cta.style.top = '0px';
            cta.style.margin = '0px';

            // Переносим кнопку в координаты (centerX, centerY + 100) с аппаратным ускорением
            // transform: translateX(-50%) центрирует кнопку ровно по ее середине
            cta.style.transform = `translate3d(${centerX}px, ${centerY + 100}px, 0) translateX(-50%)`;
        }

        // Оптимизированная отрисовка взрывов (удаление с конца массива, чтобы не тормозило)
        for (let idx = explosions.length - 1; idx >= 0; idx--) {
            const ex = explosions[idx];
            ctx.beginPath();
            ctx.arc(ex.x, ex.y, ex.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${ex.color}, ${ex.alpha * 0.4})`;
            ctx.fill();
            ex.size += 2;
            ex.alpha -= 0.05;
            if (ex.alpha <= 0) explosions.splice(idx, 1);
        }

        // Оптимизированная отрисовка пыли
        for (let idx = dustParticles.length - 1; idx >= 0; idx--) {
            const d = dustParticles[idx];
            d.x += d.vx;
            d.y += d.vy;
            d.life -= 0.02;
            if (d.life <= 0) {
                dustParticles.splice(idx, 1);
                continue;
            }
            ctx.fillStyle = `rgba(${d.color}, ${d.life * 0.5})`;
            ctx.fillRect(d.x, d.y, 1.2, 1.2);
        }

        // Кэшируем тригонометрию наклона ОДИН раз перед циклом, а не 1100 раз внутри
        const cosT = Math.cos(galaxyTilt);
        const sinT = Math.sin(galaxyTilt);

        points.forEach((p, i) => {
            if (!p.alive && p.type !== 'core_blackhole') {
                if (Math.random() < 0.001) p.alive = true;
                return;
            }

            const r = p.distRatio * maxRadius;
            const currentAngle = p.baseAngle + angleOffset;

            const flatX = Math.cos(currentAngle) * r;
            const flatY = Math.sin(currentAngle) * r;

            const scaledX = flatX;
            const scaledY = flatY * galaxyScaleY;

            let x = centerX + (scaledX * cosT - scaledY * sinT);
            let y = centerY + (scaledX * sinT + scaledY * cosT);

            // Логика затягивания в центр
            if (p.type !== 'core_blackhole') {
                const dxC = centerX - x;
                const dyC = centerY - y;
                const distC = Math.sqrt(dxC * dxC + dyC * dyC);
                if (distC < 100) {
                    p.baseAngle += 0.01 * ((100 - distC) / 100);
                    p.distRatio -= 0.0001;
                    if (distC < (points[0].baseRadius + 5)) {
                        p.alive = false;
                        // Ограничиваем взрывы на слабых устройствах ради производительности
                        if (!isMobileOrTV || Math.random() < 0.3) {
                            triggerExplosion(x, y, '255, 200, 50');
                        }
                    }
                }
            }

            // Интерактив с мышью
            const dxM = x - mouse.x;
            const dyM = y - mouse.y;
            const distM_Sq = dxM * dxM + dyM * dyM;
            if (distM_Sq < 14400) {
                const distM = Math.sqrt(distM_Sq);
                const forceM = (120 - distM) / 120;
                x += (dxM / distM) * forceM * 30;
                y += (dyM / distM) * forceM * 30;
            }

            p.x = x;
            p.y = y;

            // 4. СИНХРОНИЗАЦИЯ ТЕКСТА С ТОЧКАМИ (Переведено на аппаратное ускорение translate3d)
            if (p.featureIdx !== undefined && p.featureIdx >= 0 && p.featureIdx < totalFeatures) {
                const el = featElements[p.featureIdx];
                if (el) {
                    if (!p.alive) {
                        el.style.display = 'none';
                    } else {
                        el.style.display = 'block';
                        // Сбрасываем left/top в CSS один раз, а двигаем через translate3d
                        el.style.left = '0px';
                        el.style.top = '0px';
                        el.style.transform = `translate3d(${x + 12}px, ${y - 12}px, 0)`;
                        el.style.opacity = '1';
                    }
                }
            }

            // Отрисовка графики галактики
            if (p.type === 'core_blackhole' || p.type === 'blackhole') {
                const isCore = p.type === 'core_blackhole';
                const diskR = p.baseRadius * (isCore ? 6 : 4);

                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(galaxyTilt);
                ctx.scale(1, galaxyScaleY);

                const grad = ctx.createRadialGradient(0, 0, p.baseRadius, 0, 0, diskR);
                grad.addColorStop(0, isCore ? 'rgba(255, 220, 100, 0.9)' : 'rgba(255, 100, 0, 0.7)');
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(0, 0, diskR, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                ctx.save();
                ctx.translate(x, y);
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(0, 0, p.baseRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

            } else {
                const isPulsar = p.type === 'pulsar';
                let s = p.baseRadius;
                if (isPulsar) s += (Math.sin(Date.now() * 0.005 + i) + 0.5);
                ctx.fillStyle = isPulsar ? '#fff' : `rgba(0, 255, 255, ${p.alpha})`;
                ctx.beginPath();
                ctx.arc(x, y, s, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        requestAnimationFrame(animate);
    }

    resize();
    animate();
}