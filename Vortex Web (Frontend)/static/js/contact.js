// contact.js - ОБНОВЛЁННЫЙ С TELEGRAM
document.addEventListener('DOMContentLoaded', () => {
    const waTab = document.getElementById('tab-whatsapp');
    const tgTab = document.getElementById('tab-telegram');
    const mailTab = document.getElementById('tab-mail');
    const waSection = document.getElementById('section-whatsapp');
    const tgSection = document.getElementById('section-telegram');
    const mailSection = document.getElementById('section-mail');

    // Переключение вкладок
    if (waTab) {
        waTab.onclick = () => {
            waSection.classList.add('active');
            if (tgSection) tgSection.classList.remove('active');
            mailSection.classList.remove('active');
            waTab.classList.add('active');
            if (tgTab) tgTab.classList.remove('active');
            mailTab.classList.remove('active');
            // Останавливаем Telegram polling
            if (typeof stopTelegramPolling === 'function') stopTelegramPolling();
        };
    }

    if (tgTab) {
        tgTab.onclick = () => {
            if (tgSection) tgSection.classList.add('active');
            waSection.classList.remove('active');
            mailSection.classList.remove('active');
            tgTab.classList.add('active');
            waTab.classList.remove('active');
            mailTab.classList.remove('active');
            // Загружаем чаты Telegram и запускаем polling
            if (typeof loadTelegramChats === 'function') {
                loadTelegramChats();
                if (typeof startTelegramPolling === 'function') startTelegramPolling();
            }
        };
    }

    if (mailTab) {
        mailTab.onclick = () => {
            mailSection.classList.add('active');
            waSection.classList.remove('active');
            if (tgSection) tgSection.classList.remove('active');
            mailTab.classList.add('active');
            waTab.classList.remove('active');
            if (tgTab) tgTab.classList.remove('active');
            // Вызываем функцию загрузки папок из другого файла
            if (typeof loadMailFolders === 'function') {
                loadMailFolders();
            }
            // Останавливаем Telegram polling
            if (typeof stopTelegramPolling === 'function') stopTelegramPolling();
        };
    }

    // --- WHATSAPP LOGIC ---
    const waSendBtn = document.getElementById('wa-send');
    const waInput = document.getElementById('wa-input');
    const waAttachBtn = document.getElementById('wa-attach');
    const waFileInput = document.getElementById('wa-file-input');

    if (waSendBtn) {
        waSendBtn.onclick = async () => {
            const text = waInput.value;
            if (!text) return;

            const response = await fetch(`${API_BASE_URL}/api/whatsapp/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`
                },
                body: JSON.stringify({ phone: "7999...", message: text })
            });

            if (response.ok) {
                appendMessage(text, 'out');
                waInput.value = '';
            }
        };
    }

    if (waAttachBtn) {
        waAttachBtn.onclick = () => waFileInput.click();
    }

    if (waFileInput) {
        waFileInput.onchange = async (e) => {
            const file = e.target.files[0];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('phone', '7999...');
            formData.append('mode', file.type.startsWith('image') ? 'image' : 'document');

            await fetch(`${API_BASE_URL}/api/whatsapp/send_file`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` },
                body: formData
            });
        };
    }

    function appendMessage(content, type, mediaType = 'text') {
        const area = document.getElementById('chat-messages');
        const div = document.createElement('div');
        div.className = `message-bubble msg-${type}`;
        div.innerText = content;
        area.appendChild(div);
        area.scrollTop = area.scrollHeight;
    }
});

// Глобальная функция переключения вкладок (на случай если вызывается из HTML)
window.switchContactTab = function (tab) {
    // Обновляем кнопки
    document.querySelectorAll('.vortex-tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeTab = document.getElementById(`tab-${tab}`);
    if (activeTab) activeTab.classList.add('active');

    // Скрываем все секции
    document.querySelectorAll('.contact-container').forEach(section => {
        section.classList.remove('active');
    });

    if (tab === 'whatsapp') {
        const waSection = document.getElementById('section-whatsapp');
        if (waSection) waSection.classList.add('active');
        if (typeof stopTelegramPolling === 'function') stopTelegramPolling();
    } else if (tab === 'telegram') {
        const tgSection = document.getElementById('section-telegram');
        if (tgSection) tgSection.classList.add('active');
        if (typeof loadTelegramChats === 'function') {
            loadTelegramChats();
            if (typeof startTelegramPolling === 'function') startTelegramPolling();
        }
    } else if (tab === 'mail') {
        const mailSection = document.getElementById('section-mail');
        if (mailSection) mailSection.classList.add('active');
        if (typeof stopTelegramPolling === 'function') stopTelegramPolling();
        if (typeof loadMailFolders === 'function') {
            loadMailFolders();
        }
    }
};

async function loadTelegramChats() {
    console.log("🔄 loadTelegramChats called");
    try {
        const token = localStorage.getItem('vortex_token');
        console.log("Token:", token ? "exists" : "missing");

        const response = await fetch(`${API_BASE_URL}/api/telegram/chats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log("Response status:", response.status);
        const data = await response.json();
        console.log("Response data:", data);

        if (data.ok) {
            telegramChats = data.chats || [];
            console.log(`📊 Loaded ${telegramChats.length} chats`);
            renderTelegramChatsList();
        } else {
            console.error("API error:", data.error);
        }
    } catch (error) {
        console.error("Ошибка загрузки чатов Telegram:", error);
    }
}

// Проверка наличия Telegram интеграции
async function checkTelegramIntegration() {
    try {
        const token = localStorage.getItem('vortex_token');
        const response = await fetch(`${API_BASE_URL}/api/telegram/status`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        const tgTab = document.getElementById('tab-telegram');
        if (tgTab) {
            if (data.ok && data.is_connected) {
                tgTab.style.display = 'flex';
            } else {
                tgTab.style.display = 'none';
            }
        }
    } catch (error) {
        console.error("Ошибка проверки Telegram интеграции:", error);
        const tgTab = document.getElementById('tab-telegram');
        if (tgTab) tgTab.style.display = 'none';
    }
}

// Вызываем при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    checkTelegramIntegration();
    checkMailIntegration();
});

// Проверка наличия почтовой интеграции
async function checkMailIntegration() {
    try {
        const token = localStorage.getItem('vortex_token');
        const response = await fetch(`${API_BASE_URL}/api/mail/list`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        const mailTab = document.getElementById('tab-mail');
        if (mailTab) {
            if (data.items && data.items.length > 0) {
                mailTab.style.display = 'flex';
            } else {
                mailTab.style.display = 'none';
            }
        }
    } catch (error) {
        console.error("Ошибка проверки почтовой интеграции:", error);
        const mailTab = document.getElementById('tab-mail');
        if (mailTab) mailTab.style.display = 'none';
    }
}