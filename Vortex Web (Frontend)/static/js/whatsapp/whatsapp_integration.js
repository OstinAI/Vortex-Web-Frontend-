/**
 * Модуль интеграции WhatsApp для Vortex (Только фронтенд)
 */

let waStatusTimer = null;
let waQrTimer = null;
let lastQrUrl = null;

async function connectWhatsApp() {
    const contentArea = document.getElementById('settings-content-area');
    if (!contentArea) return;

    stopAllWATimers();

    contentArea.innerHTML = '<div style="padding:20px; color:var(--vortex-accent); font-size: 10px; letter-spacing: 2px;">ПРОВЕРКА СТАТУСА...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/whatsapp/status`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await response.json();

        // Проверка авторизации: сервер возвращает boolean в поле 'authorized'
        if (data.ok === true && data.authorized === true) {
            renderWhatsAppConnected(data.phone || '');
        } else {
            renderPhoneNumberInput();
        }
    } catch (err) {
        renderPhoneNumberInput();
    }
}

function renderPhoneNumberInput() {
    const contentArea = document.getElementById('settings-content-area');
    contentArea.innerHTML = `
        <div style="padding: 30px; max-width: 400px;">
            <h3 style="color: var(--vortex-accent); letter-spacing: 3px; font-size: 12px; margin-bottom: 20px;">ИНТЕГРАЦИЯ WHATSAPP</h3>
            <p style="color: var(--text-muted); font-size: 11px; margin-bottom: 10px;">ВВЕДИТЕ НОМЕР ТЕЛЕФОНА (НАПРИМЕР: 79001234567)</p>
            <input type="text" id="wa-phone-input" placeholder="79000000000" 
                style="background: rgba(0,0,0,0.5); border: 1px solid var(--vortex-border); color: #fff; padding: 12px; width: 100%; border-radius: 4px; outline: none; margin-bottom: 20px; letter-spacing: 2px;">
            <div style="display: flex; gap: 10px;">
                <button class="btn-glass-vortex" onclick="startWASession()">ПОЛУЧИТЬ QR-КОД</button>
                <button class="btn-glass-vortex" onclick="cancelWAAuth()">ОТМЕНА</button>
            </div>
        </div>
    `;
}

async function startWASession() {
    const phoneInput = document.getElementById('wa-phone-input');
    const phone = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';

    if (phone.length < 10) {
        alert("ВВЕДИТЕ КОРРЕКТНЫЙ НОМЕР");
        return;
    }

    const contentArea = document.getElementById('settings-content-area');
    contentArea.innerHTML = `<div style="padding:20px; color:var(--vortex-accent);">ПОДГОТОВКА СЕССИИ ДЛЯ +${phone}...</div>`;

    try {
        await fetch(`${API_BASE_URL}/api/whatsapp/numbers/start`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone: phone, block_new_chats: true })
        });
        renderWhatsAppQR(phone);
    } catch (err) {
        contentArea.innerHTML = '<div style="padding:20px; color:red;">ОШИБКА ЗАПУСКА</div>';
    }
}

async function renderWhatsAppQR(phone) {
    const contentArea = document.getElementById('settings-content-area');
    const token = localStorage.getItem('vortex_token');

    contentArea.innerHTML = `
        <div style="padding: 20px; text-align: center;">
            <h3 style="color: var(--vortex-accent); letter-spacing: 3px; font-size: 12px; margin-bottom: 20px;">
                ОТСКАНИРУЙТЕ QR ДЛЯ НОМЕРА +${phone}
            </h3>
            <div id="qr-container" style="background: white; padding: 10px; display: inline-block; border-radius: 8px; min-width: 220px; min-height: 220px; position: relative;">
                <div id="qr-status" style="color: #000; padding-top: 90px; font-size: 10px;">ЗАГРУЗКА...</div>
            </div>
            <p style="color: var(--text-muted); font-size: 10px; margin-top: 15px;">Обновление произойдет автоматически</p>
            <div style="margin-top: 20px;">
                <button class="btn-glass-vortex" onclick="cancelWAAuth()">ОТМЕНА</button>
            </div>
        </div>
    `;

    stopAllWATimers();

    // 1. Цикл загрузки QR (аналог блока // QR в C#)
    waQrTimer = setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/whatsapp/qr?phone=${phone}&t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 200) {
                const blob = await response.blob();
                // Проверка размера (>1000 байт), чтобы не отрисовывать пустые файлы
                if (blob.size > 1000) {
                    if (lastQrUrl) URL.revokeObjectURL(lastQrUrl);
                    lastQrUrl = URL.createObjectURL(blob);
                    const container = document.getElementById('qr-container');
                    if (container) container.innerHTML = `<img src="${lastQrUrl}" style="width: 220px; height: 220px; display: block;">`;
                }
            }
        } catch (err) { console.error("QR Load Error", err); }
    }, 2000);

    // 2. Цикл проверки статуса (аналог блока // STATUS в C#)
    // Внутри renderWhatsAppQR
    waStatusTimer = setInterval(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/whatsapp/status?phone=${phone}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Если сервер вернул 200, проверяем данные
            if (res.status === 200) {
                const data = await res.json();

                // ЖДЕМ, пока authorized станет строго true
                if (data.authorized === true) {
                    console.log("СЕРВЕР ПОДТВЕРДИЛ АВТОРИЗАЦИЮ");
                    stopAllWATimers();
                    renderWhatsAppConnected(phone);
                    return;
                }
            }

            // Если пришло 202, 404 или authorized: false — просто ничего не делаем 
            // и ждем следующей итерации (через 2 сек)
            console.log("Ожидание авторизации...");

        } catch (err) {
            console.error("Ошибка сети, но продолжаем опрос...");
        }
    }, 2000);
}

function renderWhatsAppConnected(phone) {
    const contentArea = document.getElementById('settings-content-area');
    contentArea.innerHTML = `
        <div style="padding: 30px; border: 1px solid var(--vortex-border); background: rgba(0,255,255,0.02); margin-top: 10px; border-radius: 4px; max-width: 500px;">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                <div style="width: 14px; height: 14px; background: #00ff00; border-radius: 50%; box-shadow: 0 0 10px #00ff00;"></div>
                <span style="color: #00ff00; letter-spacing: 2px; font-size: 12px; text-transform: uppercase;">WHATSAPP АКТИВЕН</span>
            </div>
            <div style="margin-bottom: 25px;">
                <div style="font-size: 20px; letter-spacing: 4px; color: #fff;">+${phone}</div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="btn-glass-vortex" onclick="openIntegrations()">НАЗАД</button>
                <button class="btn-glass-vortex" style="color: #ff4444; border-color: rgba(255,0,0,0.2);" onclick="disconnectWA('${phone}')">ОТКЛЮЧИТЬ</button>
            </div>
        </div>
    `;
}

function stopAllWATimers() {
    if (waQrTimer) clearInterval(waQrTimer);
    if (waStatusTimer) clearInterval(waStatusTimer);
    if (lastQrUrl) {
        URL.revokeObjectURL(lastQrUrl);
        lastQrUrl = null;
    }
    waQrTimer = null;
    waStatusTimer = null;
}

function cancelWAAuth() {
    stopAllWATimers();
    openIntegrations();
}

async function disconnectWA(phone) {
    if (!confirm(`ОТКЛЮЧИТЬ WHATSAPP ${phone}?`)) return;
    try {
        await fetch(`${API_BASE_URL}/api/whatsapp/numbers/stop`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone: phone })
        });
        openIntegrations();
    } catch (err) { console.error("Disconnect failed"); }
}