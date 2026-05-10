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

    // 1. АВТОМАТИЧЕСКИЙ СБОР ВСЕХ ПЛАШЕК
    // Ищем все элементы с классом feature-label
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
            // Привязываем плашки к первым N точкам
            const isFeature = i <= totalFeatures;
            // Увеличиваем разброс distance, чтобы они летали на разном удалении
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

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxRadius = Math.min(canvas.width, canvas.height) * 0.48;
        angleOffset -= 0.0006;

        // 3. ПОЗИЦИОНИРОВАНИЕ ЦЕНТРАЛЬНОЙ КНОПКИ
        const cta = document.getElementById('cta-button');
        if (cta) {
            cta.style.left = centerX + 'px';
            cta.style.top = (centerY + 160) + 'px'; // Опустил чуть ниже, чтобы не мешать заголовку
        }

        // Отрисовка взрывов и пыли
        explosions.forEach((ex, idx) => {
            ctx.beginPath(); ctx.arc(ex.x, ex.y, ex.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${ex.color}, ${ex.alpha * 0.4})`; ctx.fill();
            ex.size += 2; ex.alpha -= 0.05;
            if (ex.alpha <= 0) explosions.splice(idx, 1);
        });

        dustParticles.forEach((d, idx) => {
            d.x += d.vx; d.y += d.vy; d.life -= 0.02;
            if (d.life <= 0) dustParticles.splice(idx, 1);
            ctx.fillStyle = `rgba(${d.color}, ${d.life * 0.5})`; ctx.fillRect(d.x, d.y, 1.2, 1.2);
        });

        points.forEach((p, i) => {
            if (!p.alive && p.type !== 'core_blackhole') {
                if (Math.random() < 0.001) p.alive = true;
                return;
            }

            const r = p.distRatio * maxRadius;
            const currentAngle = p.baseAngle + angleOffset;
            let x = centerX + Math.cos(currentAngle) * r;
            let y = centerY + Math.sin(currentAngle) * r;

            // Логика затягивания в центр
            if (p.type !== 'core_blackhole') {
                const dxC = centerX - x;
                const dyC = centerY - y;
                const distC = Math.sqrt(dxC * dxC + dyC * dyC);
                if (distC < 150) {
                    p.baseAngle += 0.01 * ((150 - distC) / 150);
                    p.distRatio -= 0.0001;
                    if (distC < (points[0].baseRadius + 5)) {
                        p.alive = false;
                        triggerExplosion(x, y, '255, 200, 50');
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

            p.x = x; p.y = y;

            // 4. СИНХРОНИЗАЦИЯ ТЕКСТА С ТОЧКАМИ
            if (p.featureIdx !== undefined && p.featureIdx >= 0 && p.featureIdx < totalFeatures) {
                const el = featElements[p.featureIdx];
                if (el) {
                    el.style.left = (x + 12) + 'px';
                    el.style.top = (y - 12) + 'px';
                    el.style.opacity = p.alive ? 1 : 0;
                    if (!p.alive) el.style.display = 'none';
                    else el.style.display = 'block';
                }
            }

            // Отрисовка графики
            if (p.type === 'core_blackhole' || p.type === 'blackhole') {
                const isCore = p.type === 'core_blackhole';
                const diskR = p.baseRadius * (isCore ? 6 : 4);
                const grad = ctx.createRadialGradient(x, y, p.baseRadius, x, y, diskR);
                grad.addColorStop(0, isCore ? 'rgba(255, 220, 100, 0.9)' : 'rgba(255, 100, 0, 0.7)');
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath(); ctx.arc(x, y, diskR, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#000';
                ctx.beginPath(); ctx.arc(x, y, p.baseRadius, 0, Math.PI * 2); ctx.fill();
            } else {
                const isPulsar = p.type === 'pulsar';
                let s = p.baseRadius;
                if (isPulsar) s += (Math.sin(Date.now() * 0.005 + i) + 0.5);
                ctx.fillStyle = isPulsar ? '#fff' : `rgba(0, 255, 255, ${p.alpha})`;
                ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
            }
        });

        requestAnimationFrame(animate);
    }

    resize();
    animate();
}