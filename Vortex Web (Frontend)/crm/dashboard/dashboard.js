// 1. Проверка авторизации
(function initVortex() {
    if (!localStorage.getItem('vortex_token')) window.location.href = '/';
})();

// Функция открытия профиля (оставляем)
function openProfile() { window.location.href = '/profile'; }

// Функция задач на сегодня (боковая панель)
async function updateSideTasks() {
    try {
        const token = localStorage.getItem('vortex_token');

        let currentUserId = null;
        try {
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                currentUserId = payload.user_id || payload.id;
                console.log("Текущий пользователь ID:", currentUserId);
            }
        } catch (e) {
            console.error("Ошибка парсинга токена:", e);
        }

        const res = await fetch(`${API_BASE_URL}/api/tasks/?my=1&limit=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const container = document.getElementById('vortex-side-tasks');
        if (!container) return;

        container.classList.add('vortex-side-panel');

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const endOfToday = startOfToday + 24 * 60 * 60 * 1000;

        const tasks = (data.tasks || []).filter(t => {
            let taskTime = parseInt(t.start_ts_ms || t.end_ts_ms || 0);
            if (taskTime > 0 && taskTime < 10000000000) taskTime *= 1000;
            const isNotDone = t.status !== 'done';
            const isExactlyToday = taskTime >= startOfToday && taskTime < endOfToday;

            let isAssignedToMe = false;
            if (currentUserId && t.assignees && Array.isArray(t.assignees)) {
                isAssignedToMe = t.assignees.some(assigneeId => parseInt(assigneeId) === parseInt(currentUserId));
            }

            if (!isAssignedToMe && currentUserId && t.created_by) {
                isAssignedToMe = parseInt(t.created_by) === parseInt(currentUserId);
            }

            return isNotDone && isExactlyToday && isAssignedToMe;
        });

        tasks.sort((a, b) => (a.start_ts_ms || 0) - (b.start_ts_ms || 0));

        let html = '<div class="side-panel-header">МОИ ЗАДАЧИ НА СЕГОДНЯ</div>';
        html += '<div class="side-tasks-list">';

        if (tasks.length === 0) {
            html += '<div class="mini-task-card" style="border:none; opacity:0.5; font-size:10px; text-align:center;">На сегодня задач нет</div>';
        } else {
            html += tasks.map(t => {
                const typeLabel = t.client_id > 0 ? 'КЛИЕНТ' : 'ЛИЧНАЯ';

                let statusColor = '#00E5FF';
                switch (t.status) {
                    case 'open': statusColor = '#00E5FF'; break;
                    case 'in_progress': statusColor = '#FFD700'; break;
                    case 'done': statusColor = '#00FF00'; break;
                    case 'urgent': statusColor = '#FF4500'; break;
                    case 'waiting': statusColor = '#696969'; break;
                    case 'attention': statusColor = '#FF00FF'; break;
                    case 'overdue': statusColor = '#ff4d4d'; break;
                    default: statusColor = '#00E5FF';
                }

                let isOverdue = false;
                const taskTime = t.start_ts_ms;
                if (taskTime && t.status !== 'done') {
                    const taskDate = new Date(taskTime);
                    isOverdue = taskDate < now;
                }

                if (isOverdue || t.status === 'overdue') {
                    statusColor = '#ff4d4d';
                }

                let statusText = '';
                switch (t.status) {
                    case 'open': statusText = 'НОВАЯ'; break;
                    case 'in_progress': statusText = 'В РАБОТЕ'; break;
                    case 'done': statusText = 'ВЫПОЛНЕНА'; break;
                    case 'urgent': statusText = 'СРОЧНО'; break;
                    case 'waiting': statusText = 'ОЖИДАНИЕ'; break;
                    case 'attention': statusText = 'ВНИМАНИЕ'; break;
                    case 'overdue': statusText = 'ПРОСРОЧЕНА'; break;
                    default: statusText = '';
                }

                let cleanDescription = t.description || '';
                cleanDescription = cleanDescription.replace(/\[color:\s*#[0-9A-Fa-f]{6}\]/gi, '').trim();
                cleanDescription = cleanDescription.replace(/^\s+|\s+$/g, '');

                let onClickAction = '';
                if (t.client_id && t.client_id > 0) {
                    onClickAction = `window.location.href = '/Card.html?id=${t.client_id}'`;
                } else {
                    onClickAction = `fetchAndOpenTaskModal(${t.id})`;
                }

                return `
                    <div class="mini-task-card" 
                         title="${cleanDescription || ''}" 
                         onclick="${onClickAction}"
                         style="cursor:pointer; border-left: 2px solid ${statusColor}; margin-bottom: 8px; padding: 8px; background: rgba(255,255,255,0.03);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <div style="font-size: 9px; color: ${statusColor}; font-weight: bold; letter-spacing: 0.5px;">${typeLabel}</div>
                            ${statusText ? `<div style="font-size: 8px; color: ${statusColor}; font-weight: bold; letter-spacing: 0.5px; background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 10px;">${statusText}</div>` : ''}
                        </div>
                        <div class="mini-task-title" style="color: #ffffff; font-weight: 600; font-size: 13px; line-height: 1.2; margin-bottom: 4px;">${escapeHtml(t.title || 'Без названия')}</div>
                        ${cleanDescription ? `<div class="mini-task-desc" style="color: #888; font-size: 11px; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(cleanDescription)}</div>` : ''}
                    </div>
                `;
            }).join('');
        }

        html += '</div>';
        container.innerHTML = html;

        setTimeout(() => {
            const cards = container.querySelectorAll('.mini-task-card');
            if (cards.length > 0) {
                const cardHeight = cards[0].offsetHeight;
                const headerHeight = container.querySelector('.side-panel-header')?.offsetHeight || 40;
                const targetVisible = Math.min(8, cards.length);
                const newMaxHeight = headerHeight + (cardHeight * targetVisible) + (8 * targetVisible);
                container.style.maxHeight = newMaxHeight + 'px';
            }
        }, 50);

    } catch (err) {
        console.error("Ошибка обновления боковой панели:", err);
    }
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

// ========== ЗАПУСК ПРИ ЗАГРУЗКЕ ==========
document.addEventListener('DOMContentLoaded', () => {
    updateSideTasks();
    setInterval(updateSideTasks, 300000);
});