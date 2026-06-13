// static/js/telegram/telegram_integration.js

let currentTelegramStatus = {
    isConnected: false,
    botId: null,
    botUsername: null,
    greetingEnabled: false,
    greetingText: "",
    crmSyncEnabled: true
};

// ============================================
// ГЛАВНАЯ ФУНКЦИЯ ПОДКЛЮЧЕНИЯ TELEGRAM
// ============================================
async function connectTelegram() {
    const contentArea = document.getElementById('settings-content-area');
    if (!contentArea) return;

    // Показываем форму настройки
    contentArea.innerHTML = `
        <div style="
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 500px;
            padding: 40px;
        ">
            <div class="telegram-settings-panel" style="
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(0, 229, 255, 0.3);
                border-radius: 12px;
                padding: 40px;
                width: 500px;
                max-width: 90%;
            ">
                <div style="text-align: center; margin-bottom: 30px;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM9.5 13.5l-2-1L16 8l-2.5 8.5-2-2 2.5-2.5-4.5 1z" fill="#00E5FF"/>
                    </svg>
                    <h2 style="color: #fff; letter-spacing: 2px; margin-top: 15px;">TELEGRAM БОТ</h2>
                    <p style="color: #888; font-size: 12px; margin-top: 10px;">Подключите Telegram бота для работы с клиентами</p>
                </div>

                <!-- CRM СИНХРОНИЗАЦИЯ (ПОЛЗУНОК) -->
                <div style="
                    background: rgba(0, 229, 255, 0.05);
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 25px;
                    border: 1px solid rgba(0, 229, 255, 0.1);
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="color: #fff; font-size: 14px; letter-spacing: 1px;">ПОДКЛЮЧЕНИЕ К CRM</div>
                            <div style="color: #666; font-size: 10px; margin-top: 5px;">Автосоздание клиентов из Telegram</div>
                        </div>
                        <label class="telegram-switch">
                            <input type="checkbox" id="telegram-crm-sync" ${currentTelegramStatus.crmSyncEnabled ? 'checked' : ''}>
                            <span class="telegram-slider"></span>
                        </label>
                    </div>
                </div>

                <!-- МАРШРУТИЗАЦИЯ КЛИЕНТОВ -->
                <div style="
                    background: rgba(0, 229, 255, 0.05);
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 25px;
                    border: 1px solid rgba(0, 229, 255, 0.1);
                ">
                    <div style="color: #fff; font-size: 14px; letter-spacing: 1px; margin-bottom: 15px;">МАРШРУТИЗАЦИЯ КЛИЕНТОВ</div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="color: var(--vortex-accent); font-size: 11px; letter-spacing: 1px; display: block; margin-bottom: 8px;">
                            ВОРОНКА ПРОДАЖ
                        </label>
                        <select id="telegram-pipeline" style="
                            width: 100%;
                            background: rgba(0, 0, 0, 0.5);
                            border: 1px solid rgba(0, 229, 255, 0.3);
                            border-radius: 6px;
                            padding: 10px;
                            color: #fff;
                            font-size: 12px;
                            outline: none;
                        ">
                            <option value="">-- Выберите воронку --</option>
                        </select>
                    </div>
                    
                    <div>
                        <label style="color: var(--vortex-accent); font-size: 11px; letter-spacing: 1px; display: block; margin-bottom: 8px;">
                            ЭТАП (СТАДИЯ)
                        </label>
                        <select id="telegram-stage" style="
                            width: 100%;
                            background: rgba(0, 0, 0, 0.5);
                            border: 1px solid rgba(0, 229, 255, 0.3);
                            border-radius: 6px;
                            padding: 10px;
                            color: #fff;
                            font-size: 12px;
                            outline: none;
                        ">
                            <option value="">-- Сначала выберите воронку --</option>
                        </select>
                    </div>
                </div>

                <div id="telegram-bot-section">
                    <div style="margin-bottom: 20px;">
                        <label style="color: var(--vortex-accent); font-size: 11px; letter-spacing: 1px; display: block; margin-bottom: 8px;">
                            ТОКЕН БОТА (от @BotFather)
                        </label>
                        <input type="password" id="telegram-bot-token" placeholder="1234567890:ABCdefGHIJKLMNopQRStUVWXYZ" style="
                            width: 100%;
                            background: rgba(0, 0, 0, 0.5);
                            border: 1px solid rgba(0, 229, 255, 0.3);
                            border-radius: 6px;
                            padding: 12px;
                            color: #fff;
                            font-size: 12px;
                            outline: none;
                            font-family: monospace;
                        ">
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="color: var(--vortex-accent); font-size: 11px; letter-spacing: 1px; display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <span>ПРИВЕТСТВИЕ НОВЫМ ЧАТАМ</span>
                            <label class="telegram-switch-small">
                                <input type="checkbox" id="telegram-greeting-enabled" ${currentTelegramStatus.greetingEnabled ? 'checked' : ''}>
                                <span class="telegram-slider-small"></span>
                            </label>
                        </label>
                        <textarea id="telegram-greeting-text" rows="3" placeholder="Здравствуйте! Чем могу помочь?" style="
                            width: 100%;
                            background: rgba(0, 0, 0, 0.5);
                            border: 1px solid rgba(0, 229, 255, 0.3);
                            border-radius: 6px;
                            padding: 12px;
                            color: #fff;
                            font-size: 12px;
                            outline: none;
                            resize: vertical;
                        ">${currentTelegramStatus.greetingText || "Здравствуйте! Это автоматическое сообщение. Я отвечу вам в ближайшее время."}</textarea>
                    </div>

                    <div id="telegram-status-message" style="
                        font-size: 11px;
                        padding: 10px;
                        border-radius: 6px;
                        margin-bottom: 20px;
                        display: none;
                    "></div>

                    <button onclick="saveTelegramSettings()" style="
                        width: 100%;
                        background: linear-gradient(90deg, #00E5FF 0%, #007BFF 100%);
                        border: none;
                        border-radius: 6px;
                        padding: 14px;
                        color: #000;
                        font-weight: bold;
                        letter-spacing: 2px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        margin-bottom: 15px;
                    " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                        ${currentTelegramStatus.isConnected ? 'ОБНОВИТЬ НАСТРОЙКИ' : 'ПОДКЛЮЧИТЬ БОТА'}
                    </button>

                    ${currentTelegramStatus.isConnected ? `
                    <button onclick="disconnectTelegram()" style="
                        width: 100%;
                        background: rgba(255, 50, 50, 0.2);
                        border: 1px solid rgba(255, 50, 50, 0.5);
                        border-radius: 6px;
                        padding: 12px;
                        color: #ff5555;
                        letter-spacing: 2px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        margin-bottom: 10px;
                    " onmouseover="this.style.background='rgba(255,50,50,0.4)'" onmouseout="this.style.background='rgba(255,50,50,0.2)'">
                        ОТКЛЮЧИТЬ БОТА
                    </button>
                    
                    <button onclick="deleteTelegramIntegration()" style="
                        width: 100%;
                        background: rgba(255, 0, 0, 0.15);
                        border: 1px solid rgba(255, 0, 0, 0.5);
                        border-radius: 6px;
                        padding: 12px;
                        color: #ff6666;
                        letter-spacing: 2px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='rgba(255,0,0,0.3)'" onmouseout="this.style.background='rgba(255,0,0,0.15)'">
                        🗑 УДАЛИТЬ ИНТЕГРАЦИЮ
                    </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    // Навешиваем обработчик на ползунок CRM
    const crmSyncCheckbox = document.getElementById('telegram-crm-sync');
    if (crmSyncCheckbox) {
        crmSyncCheckbox.addEventListener('change', async (e) => {
            const isEnabled = e.target.checked;
            await saveTelegramCrmSync(isEnabled);
        });
    }

    // Обработчик на ползунок приветствия
    const greetingCheckbox = document.getElementById('telegram-greeting-enabled');
    const greetingTextarea = document.getElementById('telegram-greeting-text');

    if (greetingCheckbox) {
        greetingCheckbox.addEventListener('change', (e) => {
            if (greetingTextarea) {
                greetingTextarea.disabled = !e.target.checked;
            }
        });
        if (greetingTextarea) {
            greetingTextarea.disabled = !greetingCheckbox.checked;
        }
    }

    // Загружаем текущий статус
    await loadTelegramStatus();

    // Загружаем список воронок
    await loadPipelines();

    // Обработчик изменения воронки
    const pipelineSelect = document.getElementById('telegram-pipeline');
    if (pipelineSelect) {
        pipelineSelect.addEventListener('change', (e) => {
            loadStages(e.target.value);
        });
    }
}

// ============================================
// ЗАГРУЗКА СТАТУСА TELEGRAM
// ============================================
async function loadTelegramStatus() {
    try {
        const token = localStorage.getItem('vortex_token');
        const response = await fetch(`${API_BASE_URL}/api/telegram/status`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.ok) {
            currentTelegramStatus.isConnected = data.is_connected;
            currentTelegramStatus.botId = data.bot_id;
            currentTelegramStatus.botUsername = data.bot_username;
            currentTelegramStatus.greetingEnabled = data.greeting_enabled || false;
            currentTelegramStatus.greetingText = data.greeting_text || "";
            currentTelegramStatus.crmSyncEnabled = data.crm_sync_enabled !== false;

            const tokenInput = document.getElementById('telegram-bot-token');
            const greetingCheckbox = document.getElementById('telegram-greeting-enabled');
            const greetingTextarea = document.getElementById('telegram-greeting-text');
            const crmSyncCheckbox = document.getElementById('telegram-crm-sync');

            if (tokenInput && currentTelegramStatus.isConnected) {
                tokenInput.placeholder = `Бот @${currentTelegramStatus.botUsername} уже подключён`;
                tokenInput.value = "";
            }

            if (greetingCheckbox) {
                greetingCheckbox.checked = currentTelegramStatus.greetingEnabled;
            }

            if (greetingTextarea) {
                greetingTextarea.value = currentTelegramStatus.greetingText;
                greetingTextarea.disabled = !currentTelegramStatus.greetingEnabled;
            }

            if (crmSyncCheckbox) {
                crmSyncCheckbox.checked = currentTelegramStatus.crmSyncEnabled;
            }
        }
    } catch (error) {
        console.error("Ошибка загрузки статуса Telegram:", error);
    }
}

// ============================================
// СОХРАНЕНИЕ НАСТРОЕК TELEGRAM
// ============================================
async function saveTelegramSettings() {
    const token = document.getElementById('telegram-bot-token')?.value?.trim();
    const greetingEnabled = document.getElementById('telegram-greeting-enabled')?.checked || false;
    const greetingText = document.getElementById('telegram-greeting-text')?.value || "";

    const statusDiv = document.getElementById('telegram-status-message');

    if (!token && !currentTelegramStatus.isConnected) {
        showStatusMessage(statusDiv, "Введите токен бота", "error");
        return;
    }

    showStatusMessage(statusDiv, "Сохранение настроек...", "info");

    try {
        const token_stored = localStorage.getItem('vortex_token');
        const response = await fetch(`${API_BASE_URL}/api/telegram/configure`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token_stored}`
            },
            body: JSON.stringify({
                bot_token: token || undefined,
                greeting_enabled: greetingEnabled,
                greeting_text: greetingText,
                base_url: window.location.origin
            })
        });

        const data = await response.json();

        if (data.status === "ok") {
            // Сохраняем маршрут (воронку и этап)
            await saveChannelRoute();

            showStatusMessage(statusDiv, `✅ Бот @${data.bot_username} успешно подключён!`, "success");
            currentTelegramStatus.isConnected = true;
            currentTelegramStatus.botUsername = data.bot_username;
            currentTelegramStatus.botId = data.bot_id;
            currentTelegramStatus.greetingEnabled = greetingEnabled;
            currentTelegramStatus.greetingText = greetingText;

            setTimeout(() => {
                connectTelegram();
            }, 1500);
        } else {
            showStatusMessage(statusDiv, `❌ Ошибка: ${data.message}`, "error");
        }
    } catch (error) {
        showStatusMessage(statusDiv, `❌ Ошибка соединения: ${error.message}`, "error");
    }
}

// ============================================
// СОХРАНЕНИЕ CRM СИНХРОНИЗАЦИИ
// ============================================
async function saveTelegramCrmSync(enabled) {
    try {
        const token = localStorage.getItem('vortex_token');
        const response = await fetch(`${API_BASE_URL}/api/telegram/crm-sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ enabled: enabled })
        });

        const data = await response.json();
        if (data.status === "ok") {
            currentTelegramStatus.crmSyncEnabled = enabled;
            console.log("CRM синхронизация Telegram:", enabled ? "включена" : "выключена");
        }
    } catch (error) {
        console.error("Ошибка сохранения CRM синхронизации:", error);
    }
}

// ============================================
// ОТКЛЮЧЕНИЕ TELEGRAM БОТА
// ============================================
async function disconnectTelegram() {
    if (!confirm("Отключить Telegram бота? Все настройки будут сброшены.")) return;

    const statusDiv = document.getElementById('telegram-status-message');
    showStatusMessage(statusDiv, "Отключение бота...", "info");

    try {
        const token = localStorage.getItem('vortex_token');
        const response = await fetch(`${API_BASE_URL}/api/telegram/disconnect`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.status === "ok") {
            showStatusMessage(statusDiv, "✅ Бот отключён", "success");
            currentTelegramStatus.isConnected = false;
            currentTelegramStatus.botId = null;
            currentTelegramStatus.botUsername = null;
            currentTelegramStatus.greetingEnabled = false;
            currentTelegramStatus.crmSyncEnabled = false;

            setTimeout(() => {
                connectTelegram();
            }, 1500);
        } else {
            showStatusMessage(statusDiv, `❌ Ошибка: ${data.message}`, "error");
        }
    } catch (error) {
        showStatusMessage(statusDiv, `❌ Ошибка: ${error.message}`, "error");
    }
}

// ============================================
// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ
// ============================================
function showStatusMessage(element, message, type) {
    if (!element) return;

    element.style.display = "block";
    element.innerHTML = message;

    const colors = {
        success: "rgba(0, 255, 100, 0.2)",
        error: "rgba(255, 50, 50, 0.2)",
        info: "rgba(0, 229, 255, 0.2)"
    };

    element.style.background = colors[type] || colors.info;
    element.style.border = `1px solid ${type === 'success' ? '#00ff64' : type === 'error' ? '#ff3232' : '#00E5FF'}`;
    element.style.color = type === 'error' ? '#ff8888' : '#fff';
}

// ============================================
// ЗАГРУЗКА ВОРОНОК ДЛЯ ВЫБОРА
// ============================================
async function loadPipelines() {
    try {
        const token = localStorage.getItem('vortex_token');
        const response = await fetch(`${API_BASE_URL}/api/crm/pipelines`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        const pipelineSelect = document.getElementById('telegram-pipeline');
        if (pipelineSelect && data.pipelines) {
            pipelineSelect.innerHTML = '<option value="">-- Выберите воронку --</option>';
            data.pipelines.forEach(pipeline => {
                pipelineSelect.innerHTML += `<option value="${pipeline.id}">${pipeline.name}</option>`;
            });

            // Загружаем сохранённый маршрут
            await loadChannelRoute();
        }
    } catch (error) {
        console.error("Ошибка загрузки воронок:", error);
    }
}

// ============================================
// ЗАГРУЗКА ЭТАПОВ ПРИ ВЫБОРЕ ВОРОНКИ
// ============================================
async function loadStages(pipelineId) {
    if (!pipelineId) {
        document.getElementById('telegram-stage').innerHTML = '<option value="">-- Сначала выберите воронку --</option>';
        return;
    }

    try {
        const token = localStorage.getItem('vortex_token');
        const response = await fetch(`${API_BASE_URL}/api/crm/pipelines/${pipelineId}/stages`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        const stageSelect = document.getElementById('telegram-stage');
        if (stageSelect && data.stages) {
            stageSelect.innerHTML = '<option value="">-- Выберите этап --</option>';
            data.stages.forEach(stage => {
                stageSelect.innerHTML += `<option value="${stage.id}">${stage.name}</option>`;
            });
        }
    } catch (error) {
        console.error("Ошибка загрузки этапов:", error);
    }
}

// ============================================
// ЗАГРУЗКА СОХРАНЁННОГО МАРШРУТА ДЛЯ TELEGRAM
// ============================================
async function loadChannelRoute() {
    try {
        const token = localStorage.getItem('vortex_token');
        const response = await fetch(`${API_BASE_URL}/api/crm/channel-routes`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        if (data.ok && data.routes) {
            const telegramRoute = data.routes.find(r => r.channel === 'telegram');
            if (telegramRoute) {
                const pipelineSelect = document.getElementById('telegram-pipeline');
                if (pipelineSelect && telegramRoute.pipeline_id) {
                    pipelineSelect.value = telegramRoute.pipeline_id;
                    await loadStages(telegramRoute.pipeline_id);

                    const stageSelect = document.getElementById('telegram-stage');
                    if (stageSelect && telegramRoute.stage_id) {
                        stageSelect.value = telegramRoute.stage_id;
                    }
                }
            }
        }
    } catch (error) {
        console.error("Ошибка загрузки маршрута:", error);
    }
}

// ============================================
// СОХРАНЕНИЕ МАРШРУТА ДЛЯ TELEGRAM
// ============================================
async function saveChannelRoute() {
    const pipelineId = document.getElementById('telegram-pipeline')?.value;
    const stageId = document.getElementById('telegram-stage')?.value;

    if (!pipelineId) return;

    try {
        const token = localStorage.getItem('vortex_token');
        const response = await fetch(`${API_BASE_URL}/api/crm/channel-routes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                channel: 'telegram',
                pipeline_id: parseInt(pipelineId),
                stage_id: stageId ? parseInt(stageId) : null
            })
        });
        const data = await response.json();
        if (data.ok) {
            console.log("Маршрут для Telegram сохранён");
        }
    } catch (error) {
        console.error("Ошибка сохранения маршрута:", error);
    }
}

// ============================================
// УДАЛЕНИЕ ИНТЕГРАЦИИ TELEGRAM
// ============================================
async function deleteTelegramIntegration() {
    if (!confirm("⚠️ ВНИМАНИЕ! Это действие удалит:\n\n- Все чаты Telegram\n- Все сообщения\n- Настройки бота\n- Маршрутизацию канала\n\nВосстановить будет невозможно!\n\nПродолжить?")) return;

    const statusDiv = document.getElementById('telegram-status-message');
    showStatusMessage(statusDiv, "Удаление интеграции...", "info");

    try {
        const token = localStorage.getItem('vortex_token');

        // 1. Отключаем бота
        await fetch(`${API_BASE_URL}/api/telegram/disconnect`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // 2. Удаляем маршрут канала Telegram
        await fetch(`${API_BASE_URL}/api/crm/channel-routes?channel=telegram`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        showStatusMessage(statusDiv, "✅ Интеграция полностью удалена", "success");

        // Сбрасываем статус
        currentTelegramStatus.isConnected = false;
        currentTelegramStatus.botId = null;
        currentTelegramStatus.botUsername = null;
        currentTelegramStatus.greetingEnabled = false;
        currentTelegramStatus.crmSyncEnabled = false;

        // Обновляем интерфейс
        setTimeout(() => {
            connectTelegram();
            // Обновляем отображение кнопки вкладки
            if (typeof checkTelegramIntegration === 'function') {
                checkTelegramIntegration();
            }
        }, 1500);

    } catch (error) {
        showStatusMessage(statusDiv, `❌ Ошибка: ${error.message}`, "error");
    }
}