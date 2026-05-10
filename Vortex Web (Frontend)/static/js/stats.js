// Настройки шрифта для графиков под стиль Vortex
Chart.defaults.color = '#888888';
Chart.defaults.font.family = 'sans-serif';

// 1. Линейный график активности
const ctxActivity = document.getElementById('activityChart').getContext('2d');
new Chart(ctxActivity, {
    type: 'line',
    data: {
        labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
        datasets: [{
            label: 'Запросы',
            data: [65, 59, 80, 81, 56, 55, 40],
            borderColor: '#00E5FF',
            backgroundColor: 'rgba(0, 229, 255, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { grid: { color: 'rgba(255, 255, 255, 0.05)' } },
            x: { grid: { display: false } }
        }
    }
});

// 2. Круговой график эффективности
const ctxEff = document.getElementById('efficiencyChart').getContext('2d');
new Chart(ctxEff, {
    type: 'doughnut',
    data: {
        labels: ['Dev', 'Design', 'QA'],
        datasets: [{
            data: [300, 50, 100],
            backgroundColor: [
                '#00E5FF',
                'rgba(0, 229, 255, 0.5)',
                'rgba(0, 229, 255, 0.2)'
            ],
            borderWidth: 0,
            hoverOffset: 10
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: { padding: 20, color: '#ffffff' }
            }
        },
        cutout: '80%'
    }
});