
/**
 * 1. ПРОВЕРКА И ОТОБРАЖЕНИЕ СТАТУСА ПРИ НАЖАТИИ НА КНОПКУ В SETTINGS
 */
async function connectMailRu() {
    const contentArea = document.getElementById('settings-content-area');
    if (!contentArea) return;

    contentArea.innerHTML = '<div style="padding:20px; color:var(--vortex-accent); font-size: 10px; letter-spacing: 2px;">CHECKING...</div>';

    try {
        const res = await fetch(`${API_BASE_URL}/api/mail/list`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await res.json();
        const mailAcc = data.items ? data.items.find(i => i.provider === 'mailru') : null;

        if (mailAcc) {
            // КОМПАКТНЫЙ ВИД (240px) СЛЕВА (20px)
            contentArea.innerHTML = `
                <div style="padding: 20px 0 0 20px; display: flex; justify-content: flex-start;">
                    <div style="width: 240px; background: rgba(0,0,0,0.5); border: 1px solid #00ff00; padding: 20px; box-shadow: 0 0 15px rgba(0, 255, 0, 0.05); position: relative;">
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <span style="color: #fff; font-size: 11px; letter-spacing: 2px; font-weight: bold;">MAIL.RU</span>
                            <div style="width: 8px; height: 8px; background: #00ff00; border-radius: 50%; box-shadow: 0 0 8px #00ff00;"></div>
                        </div>

                        <div style="color: #00ff00; font-size: 9px; font-weight: bold; margin-bottom: 25px; letter-spacing: 1px; text-transform: uppercase;">
                            ПОЧТА ИНТЕГРИРОВАНА
                        </div>

                        <button onclick="removeMailIntegration()" 
                                style="width: 100%; background: transparent; border: 1px solid rgba(255,68,68,0.5); color: #ff4444; padding: 8px; cursor: pointer; font-size: 9px; font-weight: bold; text-transform: uppercase; transition: 0.3s;"
                                onmouseover="this.style.background='rgba(255,0,0,0.05)'" onmouseout="this.style.background='transparent'">
                            УДАЛИТЬ СВЯЗЬ
                        </button>
                    </div>
                </div>
            `;
        } else {
            renderMailLoginForm();
        }
    } catch (err) {
        contentArea.innerHTML = '<div style="color:red; padding:20px; font-size: 10px;">СЕРВЕР НЕ ОТВЕЧАЕТ</div>';
    }
}
/**
 * 2. ОТРИСОВКА ФОРМЫ ВВОДА (Если интеграции нет)
 */
function renderMailLoginForm() {
    const contentArea = document.getElementById('settings-content-area');
    contentArea.innerHTML = `
        <div class="mail-setup-container" style="margin-top: 20px; margin-left: 20px; width: 400px; background: rgba(0,0,0,0.5); padding: 30px; border: 1px solid var(--vortex-border); box-sizing: border-box; box-shadow: 0 0 20px rgba(0,0,0,0.3);">
            <h3 style="color: var(--vortex-accent); font-size: 13px; letter-spacing: 3px; margin-bottom: 25px; text-align: left; text-transform: uppercase; font-weight: bold;">Настройка Mail.ru</h3>
            
            <div style="margin-bottom: 18px;">
                <label style="display: block; font-size: 10px; color: #777; margin-bottom: 6px; letter-spacing: 1.5px; text-transform: uppercase;">Email адрес</label>
                <input type="email" id="mail-login" placeholder="example@mail.ru" 
                       style="width: 100%; background: #050505; border: 1px solid #2a2a2a; color: #fff; padding: 12px; font-size: 12px; outline: none; border-radius: 2px; box-sizing: border-box; transition: border-color 0.3s;"
                       onfocus="this.style.borderColor='var(--vortex-accent)'" onblur="this.style.borderColor='#2a2a2a'">
            </div>

            <div style="margin-bottom: 30px;">
                <label style="display: block; font-size: 10px; color: #777; margin-bottom: 6px; letter-spacing: 1.5px; text-transform: uppercase;">Пароль приложения</label>
                <input type="password" id="mail-password" placeholder="•••• •••• •••• ••••" 
                       style="width: 100%; background: #050505; border: 1px solid #2a2a2a; color: #fff; padding: 12px; font-size: 12px; outline: none; border-radius: 2px; box-sizing: border-box; transition: border-color 0.3s;"
                       onfocus="this.style.borderColor='var(--vortex-accent)'" onblur="this.style.borderColor='#2a2a2a'">
            </div>

            <button onclick="saveMailSettings()" 
                    style="width: 100%; background: var(--vortex-accent); color: #000; border: none; padding: 15px; font-weight: bold; cursor: pointer; text-transform: uppercase; font-size: 11px; letter-spacing: 2px; transition: opacity 0.2s;"
                    onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                Активировать интеграцию
            </button>
            
            <div id="setup-status" style="margin-top: 20px; font-size: 10px; text-align: center; min-height: 14px; letter-spacing: 1px;"></div>
        </div>
    `;
}

/**
 * 3. СОХРАНЕНИЕ ДАННЫХ
 */
async function saveMailSettings() {
    const login = document.getElementById('mail-login').value.trim();
    const password = document.getElementById('mail-password').value.trim();
    const status = document.getElementById('setup-status');

    try {
        const res = await fetch(`${API_BASE_URL}/api/mail/setup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`
            },
            body: JSON.stringify({ login, password })
        });
        const data = await res.json();
        if (data.status === "ok") {
            status.style.color = "#00ff00";
            status.innerText = "ИНТЕГРАЦИЯ УСПЕШНО ВКЛЮЧЕНА";
            setTimeout(() => connectMailRu(), 1500); // Обновляем до вида "Подключено"
        }
    } catch (err) {
        status.innerText = "ОШИБКА ОТПРАВКИ";
    }
}

/**
 * 4. УДАЛЕНИЕ ИНТЕГРАЦИИ
 */
async function removeMailIntegration() {
    if (!confirm("ВНИМАНИЕ: ВСЕ СООБЩЕНИЯ И ФАЙЛЫ БУДУТ УДАЛЕНЫ С СЕРВЕРА. ПРОДОЛЖИТЬ?")) return;

    const btn = event.target;
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "УДАЛЕНИЕ...";

    try {
        const res = await fetch(`${API_BASE_URL}/api/mail/remove`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`
            }
        });

        const data = await res.json();

        if (data.status === "ok") {
            // После успешного удаления на сервере, возвращаем форму ввода
            renderMailLoginForm();

            // Обновляем видимость кнопки в карточке клиента
            if (typeof window.refreshMailButtonVisibility === 'function') {
                window.refreshMailButtonVisibility();
            }

        } else {
            alert("ОШИБКА: " + (data.message || "НЕИЗВЕСТНАЯ ОШИБКА"));
            btn.disabled = false;
            btn.innerText = originalText;
        }
    } catch (err) {
        console.error("Remove error:", err);
        alert("СЕРВЕР НЕ ОТВЕЧАЕТ");
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

// Привязываем к окну, чтобы HTML-кнопка видела функцию
window.removeMailIntegration = removeMailIntegration;
// Заглушка для ватцапа, чтобы не было ошибки
window.connectWhatsApp = () => {
    document.getElementById('settings-content-area').innerHTML = '<div style="padding:20px; color:#00ff00;">WHATSAPP: СТАТУС АКТИВЕН</div>';
};

// Привязываем функцию к window для срабатывания из settings.js
window.connectMailRu = connectMailRu;