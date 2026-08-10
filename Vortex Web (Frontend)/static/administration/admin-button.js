// admin-button.js - Финальная версия

function isVortexCompany() {
    const companyId = localStorage.getItem('company_id') ||
        localStorage.getItem('vortex_company_id') || '';

    const VORTEX_COMPANY_ID = 2;
    const parsedId = parseInt(companyId);
    const isVortex = parsedId === VORTEX_COMPANY_ID;

    console.log('[ADMIN-BUTTON] Проверка компании:', {
        companyId: companyId,
        parsedId: parsedId,
        isVortex: isVortex
    });

    return isVortex;
}

function openVortexAdmin() {
    console.log("[ADMIN-BUTTON] Открытие админ-панели Vortex");

    if (!isVortexCompany()) {
        alert('Доступ запрещен. Только для компании Vortex.');
        return;
    }

    if (typeof ADMIN_MODAL !== 'undefined' && ADMIN_MODAL.open) {
        ADMIN_MODAL.open();
    } else {
        alert('Админ-панель временно недоступна.');
    }
}

function getAdminButtonHTML() {
    if (!isVortexCompany()) {
        return '';
    }

    return `
        <div class="admin-button-wrapper" style="
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 12px 24px;
            margin-top: 8px;
            background: rgba(0, 229, 255, 0.03);
            border: 1px solid var(--vortex-border, rgba(0, 229, 255, 0.15));
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s ease;
            gap: 12px;
            width: 100%;
        "
        onclick="openVortexAdmin()"
        onmouseover="this.style.background='rgba(0, 229, 255, 0.08)'; this.style.borderColor='var(--vortex-accent, #00E5FF)'; this.style.boxShadow='0 0 20px rgba(0, 229, 255, 0.1)'"
        onmouseout="this.style.background='rgba(0, 229, 255, 0.03)'; this.style.borderColor='var(--vortex-border, rgba(0, 229, 255, 0.15))'; this.style.boxShadow='none'"
        >
            <span style="
                color: var(--vortex-accent, #00E5FF);
                font-size: 11px;
                letter-spacing: 2px;
                text-transform: uppercase;
                font-weight: 600;
            ">
                ⚙️ АДМИНИСТРИРОВАНИЕ
            </span>
            <div style="
                width: 18px;
                height: 18px;
                background: var(--vortex-accent, #00E5FF);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                box-shadow: 0 0 12px rgba(0, 229, 255, 0.3);
            ">
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 5L4 7L8 3" stroke="#020b12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
        </div>
    `;
}

function renderAdminButton(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`[ADMIN-BUTTON] Контейнер с id "${containerId}" не найден`);
        return;
    }

    container.innerHTML = getAdminButtonHTML();
    console.log('[ADMIN-BUTTON] Кнопка отрендерена в контейнере:', containerId);
}

window.isVortexCompany = isVortexCompany;
window.openVortexAdmin = openVortexAdmin;
window.renderAdminButton = renderAdminButton;