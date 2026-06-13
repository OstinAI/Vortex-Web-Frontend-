// settings.js - ПОЛНОСТЬЮ ОБНОВЛЁННЫЙ ФАЙЛ

async function openIntegrations() {
    const contentArea = document.getElementById('settings-content-area');
    if (!contentArea) return;

    // Сначала показываем заглушку загрузки
    contentArea.innerHTML = '<div style="padding:20px; color:var(--vortex-accent); font-size: 10px;">CHECKING STATUS...</div>';

    let mailIsConnected = false;
    let telegramIsConnected = false;

    try {
        // Проверяем статус интеграции почты на сервере
        const res = await fetch(`${API_BASE_URL}/api/mail/list`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await res.json();
        mailIsConnected = data.items && data.items.some(i => i.provider === 'mailru');
    } catch (err) {
        console.error("Ошибка проверки статуса почты:", err);
    }

    try {
        // Проверяем статус Telegram
        const tgRes = await fetch(`${API_BASE_URL}/api/telegram/status`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const tgData = await tgRes.json();
        telegramIsConnected = tgData.ok && tgData.is_connected;
    } catch (err) {
        console.error("Ошибка проверки статуса Telegram:", err);
        // Если API ещё нет, просто не показываем галочку
        telegramIsConnected = false;
    }

    // Функция для создания галочки
    const getCheckmarkHtml = (isConnected) => {
        if (!isConnected) return '';
        return `
            <div style="
                width: 14px; 
                height: 14px; 
                background: #00ff00; 
                border-radius: 50%; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                margin-left: 10px;
                box-shadow: 0 0 8px rgba(0, 255, 0, 0.4);
            ">
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 5L4 7L8 3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
        `;
    };

    contentArea.innerHTML = `
        <div class="integrations-grid" style="margin-top: 20px; display: flex; gap: 20px; padding-left: 20px; flex-wrap: wrap;">
            <div class="integration-card" onclick="connectMailRu()" style="display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative;">
                <span>MAIL.RU</span>
                ${getCheckmarkHtml(mailIsConnected)}
            </div>
            <div class="integration-card" onclick="connectWhatsApp()" style="display: flex; align-items: center; justify-content: center; cursor: pointer;">
                <span>WHATSAPP</span>
            </div>
            <div class="integration-card" onclick="connectTelegram()" style="display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative;">
                <span>TELEGRAM</span>
                ${getCheckmarkHtml(telegramIsConnected)}
            </div>
        </div>
    `;
}

function openAutomation() {
    const contentArea = document.getElementById('settings-content-area');
    if (!contentArea) return;

    contentArea.innerHTML = `
        <div style="margin-top: 20px; color: var(--vortex-accent); letter-spacing: 2px;">
            МОДУЛЬ АВТОМАТИЗАЦИИ ГОТОВ К НАСТРОЙКЕ
        </div>
    `;

    console.log("Автоматизация открыта");
}