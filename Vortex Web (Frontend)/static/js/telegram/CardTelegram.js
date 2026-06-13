// static/js/telegram/CardTelegram.js
// Интеграция Telegram в карточку клиента

let currentTelegramChatId = null;
let telegramMessagesList = [];
let telegramPollingCardInterval = null;
let isFirstLoad = true;
let isAudioPlaying = false;  // ← ДОБАВИТЬ
let audioElements = new Map();  // ← ДОБАВИТЬ

// ============================================
// ПРОВЕРКА ИНТЕГРАЦИИ TELEGRAM
// ============================================
async function checkTelegramIntegration() {
    try {
        const token = localStorage.getItem('vortex_token');
        const clientId = new URLSearchParams(window.location.search).get('id');

        // Сначала проверяем, есть ли у клиента identity telegram
        let hasTelegramIdentity = false;
        if (clientId) {
            const clientResponse = await fetch(`${API_BASE_URL}/api/crm/clients/${clientId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const clientData = await clientResponse.json();
            if (clientData.ok && clientData.identities) {
                hasTelegramIdentity = clientData.identities.some(i => i.kind === 'telegram');
            }
        }

        // Проверяем интеграцию бота
        const statusResponse = await fetch(`${API_BASE_URL}/api/telegram/status`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const statusData = await statusResponse.json();

        const tgButton = document.querySelector('.mini-tool-btn[onclick="toggleTelegramChat()"]');
        if (tgButton) {
            // Кнопка видна только если есть интеграция И клиент из Telegram
            if (statusData.ok && statusData.is_connected && hasTelegramIdentity) {
                tgButton.style.display = 'inline-flex';
                await loadClientTelegramChat();
            } else {
                tgButton.style.display = 'none';
            }
        }
    } catch (error) {
        console.error("Ошибка проверки Telegram интеграции:", error);
        const tgButton = document.querySelector('.mini-tool-btn[onclick="toggleTelegramChat()"]');
        if (tgButton) tgButton.style.display = 'none';
    }
}

// ============================================
// ЗАГРУЗКА TELEGRAM ЧАТА ДЛЯ ТЕКУЩЕГО КЛИЕНТА
// ============================================
async function loadClientTelegramChat() {
    const clientId = new URLSearchParams(window.location.search).get('id');
    if (!clientId) return;

    try {
        const token = localStorage.getItem('vortex_token');
        const response = await fetch(`${API_BASE_URL}/api/telegram/chats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        if (data.ok && data.chats) {
            const chat = data.chats.find(c => c.client_id == clientId);
            if (chat) {
                currentTelegramChatId = chat.id;
            } else {
                currentTelegramChatId = null;
            }
        }
    } catch (error) {
        console.error("Ошибка загрузки Telegram чата:", error);
    }
}

// ============================================
// ОТКРЫТИЕ TELEGRAM ЧАТА В КАРТОЧКЕ
// ============================================
async function openTelegramChat() {
    isFirstLoad = true;
    const clientId = new URLSearchParams(window.location.search).get('id');
    if (!clientId) return;

    // Скрываем другие редакторы
    const taskEditor = document.getElementById('task-editor');
    const noteEditor = document.getElementById('note-editor');
    const commentCreator = document.getElementById('comment-creator');
    if (taskEditor) taskEditor.style.display = 'none';
    if (noteEditor) noteEditor.style.display = 'none';
    if (commentCreator) commentCreator.style.display = 'none';

    // Скрываем pinned-notes-container и right-panel-display
    const pinnedNotes = document.getElementById('pinned-notes-container');
    const rightPanel = document.getElementById('right-panel-display');
    if (pinnedNotes) pinnedNotes.style.display = 'none';
    if (rightPanel) rightPanel.style.display = 'none';

    // Создаём или показываем контейнер чата
    let chatContainer = document.getElementById('telegram-chat-container');
    if (!chatContainer) {
        const parent = document.getElementById('zone-right');

        chatContainer = document.createElement('div');
        chatContainer.id = 'telegram-chat-container';
        chatContainer.className = 'telegram-chat-container';
        chatContainer.style.height = 'calc(100% - 50px)';
        chatContainer.style.display = 'flex';
        chatContainer.style.flexDirection = 'column';
        chatContainer.innerHTML = `
            <div class="telegram-chat-header">
                <span>📱 TELEGRAM ЧАТ</span>
                <button class="telegram-chat-close" onclick="toggleTelegramChat()">✕</button>
            </div>
            <div class="telegram-chat-messages" id="telegram-chat-messages">
                <div class="vortex-placeholder">Загрузка сообщений...</div>
            </div>
            <div class="telegram-chat-input-area">
                <button class="telegram-chat-attach" id="telegram-chat-attach" onclick="document.getElementById('telegram-chat-file-input').click()">📎</button>
                <input type="text" id="telegram-chat-input" placeholder="Введите сообщение..." onkeypress="if(event.key==='Enter') sendTelegramMessageToClient()">
                <button class="telegram-chat-send" onclick="sendTelegramMessageToClient()">➤</button>
                <input type="file" id="telegram-chat-file-input" style="display:none" accept="image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.*,text/plain">
            </div>
        `;

        parent.appendChild(chatContainer);

        // Обработчик выбора файла
        const fileInput = document.getElementById('telegram-chat-file-input');
        if (fileInput) {
            fileInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    await sendTelegramFileToClient(file);
                    fileInput.value = '';
                }
            };
        }
    } else {
        chatContainer.style.display = 'flex';
        if (pinnedNotes) pinnedNotes.style.display = 'none';
        if (rightPanel) rightPanel.style.display = 'none';
    }

    isTelegramChatOpen = true;

    // Загружаем сообщения (флаг isFirstLoad = true сработает сам)
    await loadTelegramMessagesForClient();
       
    // Запускаем polling для обновления сообщений
    startTelegramCardPolling();
}

// ============================================
// ЗАКРЫТИЕ TELEGRAM ЧАТА И ВОССТАНОВЛЕНИЕ ИСТОРИИ
// ============================================
function closeTelegramChat() {
    const chatContainer = document.getElementById('telegram-chat-container');
    if (chatContainer) {
        chatContainer.style.display = 'none';
    }

    // Останавливаем все аудио и очищаем
    audioElements.forEach((audio) => {
        if (audio) {
            audio.pause();
            audio.src = '';
        }
    });
    audioElements.clear();
    isAudioPlaying = false;

    // Показываем обратно pinned-notes и right-panel
    const pinnedNotes = document.getElementById('pinned-notes-container');
    const rightPanel = document.getElementById('right-panel-display');
    if (pinnedNotes) pinnedNotes.style.display = 'block';
    if (rightPanel) rightPanel.style.display = 'block';

    // Восстанавливаем историю
    if (typeof loadClientHistory === 'function') {
        loadClientHistory();
    }

    stopTelegramCardPolling();
    isTelegramChatOpen = false;
}

// ============================================
// ПЕРЕКЛЮЧЕНИЕ TELEGRAM ЧАТА (ОТКРЫТЬ/ЗАКРЫТЬ)
// ============================================
let isTelegramChatOpen = false;

async function toggleTelegramChat() {
    if (isTelegramChatOpen) {
        closeTelegramChat();
    } else {
        await openTelegramChat();
    }
}

// ============================================
// ЗАГРУЗКА СООБЩЕНИЙ TELEGRAM ДЛЯ КЛИЕНТА
// ============================================
async function loadTelegramMessagesForClient() {
    if (!currentTelegramChatId) {
        const messagesContainer = document.getElementById('telegram-chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '<div class="vortex-placeholder">Чат не найден. Напишите боту первым!</div>';
        }
        return;
    }

    try {
        const token = localStorage.getItem('vortex_token');
        const response = await fetch(`${API_BASE_URL}/api/telegram/messages/${currentTelegramChatId}?limit=50`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        if (data.ok) {
            const newMessages = data.messages || [];

            // Проверяем, есть ли новые сообщения
            const newIds = newMessages.map(m => m.id).join(',');
            const oldIds = telegramMessagesList.map(m => m.id).join(',');

            // Перерисовываем ТОЛЬКО если есть новые сообщения И не играет аудио
            if (newIds !== oldIds && !isAudioPlaying) {
                telegramMessagesList = newMessages;
                renderTelegramMessagesInCard(isFirstLoad);
            } else if (newIds !== oldIds && isAudioPlaying) {
                // Есть новые сообщения, но играет аудио - просто обновляем массив, не перерисовывая
                telegramMessagesList = newMessages;
            }

            if (isFirstLoad) {
                isFirstLoad = false;
            }
        }
    } catch (error) {
        console.error("Ошибка загрузки сообщений Telegram:", error);
    }
}

// ============================================
// ОТРИСОВКА СООБЩЕНИЙ В КАРТОЧКЕ (С ПРОКРУТКОЙ ВНИЗ)
// ============================================
function renderTelegramMessagesInCard(shouldScrollToBottom = false) {
    const container = document.getElementById('telegram-chat-messages');
    if (!container) return;

    if (telegramMessagesList.length === 0) {
        container.innerHTML = '<div class="vortex-placeholder">Нет сообщений. Начните диалог!</div>';
        return;
    }

    container.innerHTML = telegramMessagesList.map(msg => {
        let fileHtml = '';
        if (msg.file_id) {
            const fileUrl = `${API_BASE_URL}/api/files/public/${msg.file_id}`;
            const fileName = msg.file_name || 'file';
            const fileExt = fileName.split('.').pop().toLowerCase();

            // Аудио - плеер
            if (['mp3', 'wav', 'ogg', 'm4a'].includes(fileExt)) {
                fileHtml = `
                    <div class="telegram-audio-player" data-url="${fileUrl}">
                        <div class="telegram-audio-loading" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <div class="telegram-loading-spinner"></div>
                        </div>
                        <audio preload="auto" style="display: none;" controls>
                            <source src="${fileUrl}" type="audio/mpeg">
                        </audio>
                    </div>
                `;
            }
            // Изображения и GIF
            else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExt)) {
                const isGif = fileExt === 'gif';

                if (isGif) {
                    // Для GIF используем тег video для анимации
                    fileHtml = `
            <div class="telegram-media-mini" onclick="openMediaModal('${fileUrl}', 'image', '${escapeHtmlTelegram(fileName)}')">
                <video class="telegram-media-thumb" autoplay loop muted playsinline preload="auto">
                    <source src="${fileUrl}" type="image/gif">
                    Ваш браузер не поддерживает анимацию
                </video>
                <div class="telegram-media-overlay">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                </div>
            </div>
        `;
                } else {
                    fileHtml = `
            <div class="telegram-media-mini" onclick="openMediaModal('${fileUrl}', 'image', '${escapeHtmlTelegram(fileName)}')">
                <img src="${fileUrl}" class="telegram-media-thumb" alt="${escapeHtmlTelegram(fileName)}" loading="lazy">
                <div class="telegram-media-overlay">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                </div>
            </div>
        `;
                }
            }
            // Видео - миниатюра с плеером при клике
            else if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(fileExt)) {
                fileHtml = `
                    <div class="telegram-media-mini" onclick="openMediaModal('${fileUrl}', 'video', '${escapeHtmlTelegram(fileName)}')">
                        <video src="${fileUrl}" class="telegram-media-thumb" preload="metadata"></video>
                        <div class="telegram-media-overlay">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                        </div>
                    </div>
                `;
            }
            // Все остальные файлы - скачивание
            else {
                fileHtml = `
                    <div class="telegram-msg-file" onclick="downloadTelegramFile('${fileUrl}', '${escapeHtmlTelegram(fileName)}')">
                        <div class="telegram-file-download-card">
                            <span class="telegram-file-icon">📎</span>
                            <span class="telegram-file-name">${escapeHtmlTelegram(fileName)}</span>
                            <span class="telegram-file-download-btn">⬇️</span>
                        </div>
                    </div>
                `;
            }
        }

        let messageText = escapeHtmlTelegram(msg.text || '');
        messageText = messageText.replace(/\n/g, '<br>');

        return `
            <div class="telegram-card-message ${msg.direction === 'in' ? 'msg-in' : 'msg-out'}">
                <div class="telegram-msg-text">${messageText}</div>
                ${fileHtml}
                <div class="telegram-msg-time">${formatTelegramTimeCard(msg.ts_ms)}</div>
            </div>
        `;
    }).join('');

    // Инициализируем аудио плееры после отрисовки
    setTimeout(() => {
        initAudioPlayers();
    }, 100);

    if (shouldScrollToBottom) {
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 50);
    }
}

// ============================================
// ОТКРЫТИЕ МЕДИА В МОДАЛЬНОМ ОКНЕ
// ============================================
function openMediaModal(url, type, name) {
    const modal = document.createElement('div');
    modal.className = 'telegram-media-modal';
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };

    let content = '';
    if (type === 'image') {
        content = `<img src="${url}" alt="${name}" class="telegram-modal-image">`;
    } else if (type === 'video') {
        content = `<video src="${url}" controls autoplay class="telegram-modal-video"></video>`;
    }

    modal.innerHTML = `
        <div class="telegram-modal-content">
            <button class="telegram-modal-close" onclick="this.parentElement.parentElement.remove()">×</button>
            ${content}
            <div class="telegram-modal-caption">${name}</div>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
}

// ============================================
// ЗАГРУЗКА И ОТОБРАЖЕНИЕ GIF
// ============================================
function loadGifImage(imgElement, url) {
    // Убеждаемся, что GIF загружается с правильными заголовками
    fetch(url, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`
        }
    })
        .then(response => response.blob())
        .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            imgElement.src = blobUrl;
            imgElement.onload = () => URL.revokeObjectURL(blobUrl);
        })
        .catch(error => {
            console.error('Ошибка загрузки GIF:', error);
            imgElement.style.display = 'none';
        });
}

// ============================================
// ФУНКЦИЯ ДЛЯ СКАЧИВАНИЯ ФАЙЛОВ
// ============================================
function downloadTelegramFile(url, fileName) {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// После отрисовки сообщений, инициализируем аудио
function initAudioPlayers() {
    const players = document.querySelectorAll('.telegram-audio-player');

    players.forEach(player => {
        if (player.dataset.initialized) return;
        player.dataset.initialized = 'true';

        const audio = player.querySelector('audio');
        const loadingDiv = player.querySelector('.telegram-audio-loading');

        if (audio && loadingDiv) {
            audio.preload = 'auto';

            // Останавливаем ВСЕ другие аудио при начале воспроизведения этого
            audio.addEventListener('play', () => {
                isAudioPlaying = true;
                // Находим и останавливаем все другие аудио
                const allAudios = document.querySelectorAll('.telegram-audio-player audio');
                allAudios.forEach(otherAudio => {
                    if (otherAudio !== audio && !otherAudio.paused) {
                        otherAudio.pause();
                    }
                });
            });

            audio.addEventListener('pause', () => {
                isAudioPlaying = false;
            });

            audio.addEventListener('ended', () => {
                isAudioPlaying = false;
            });

            audio.addEventListener('loadedmetadata', () => {
                loadingDiv.style.display = 'none';
                audio.style.display = 'block';
            });

            audio.addEventListener('error', () => {
                loadingDiv.innerHTML = '<span style="color: #ff5555;">❌ Ошибка загрузки аудио</span>';
            });

            // Сохраняем ссылку на аудио
            audioElements.set(player, audio);

            audio.load();
        }
    });
}

// ============================================
// ОТПРАВКА СООБЩЕНИЯ ИЗ КАРТОЧКИ (С ИНДИКАТОРОМ)
// ============================================
async function sendTelegramMessageToClient() {
    const input = document.getElementById('telegram-chat-input');
    const text = input?.value?.trim();

    if (!text || !currentTelegramChatId) return;

    // Очищаем поле ввода сразу
    input.value = '';

    // Показываем "отправляется"
    const messagesContainer = document.getElementById('telegram-chat-messages');
    const tempId = 'temp-' + Date.now();
    const tempDiv = document.createElement('div');
    tempDiv.id = tempId;
    tempDiv.className = 'telegram-card-message msg-out';
    tempDiv.innerHTML = `
        <div class="telegram-msg-text">
            <div class="telegram-loading-spinner"></div>
            <span style="margin-left: 8px;">Отправка...</span>
        </div>
    `;
    messagesContainer.appendChild(tempDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
        const token = localStorage.getItem('vortex_token');
        const response = await fetch(`${API_BASE_URL}/api/telegram/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                chat_id: currentTelegramChatId,
                text: text
            })
        });

        const data = await response.json();

        // Удаляем временное сообщение
        const tempElement = document.getElementById(tempId);
        if (tempElement) tempElement.remove();

        if (data.status === 'ok') {
            loadTelegramMessagesForClient();
        } else {
            // Показываем ошибку
            const errorDiv = document.createElement('div');
            errorDiv.className = 'telegram-card-message msg-out';
            errorDiv.innerHTML = `
                <div class="telegram-msg-text" style="color: #ff5555;">
                    ❌ Ошибка: ${data.message}
                </div>
            `;
            messagesContainer.appendChild(errorDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            setTimeout(() => errorDiv.remove(), 3000);
        }
    } catch (error) {
        const tempElement = document.getElementById(tempId);
        if (tempElement) tempElement.remove();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'telegram-card-message msg-out';
        errorDiv.innerHTML = `
            <div class="telegram-msg-text" style="color: #ff5555;">
                ❌ Ошибка сети
            </div>
        `;
        messagesContainer.appendChild(errorDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        setTimeout(() => errorDiv.remove(), 3000);
    }
}

// ============================================
// ОТПРАВКА ФАЙЛА ИЗ КАРТОЧКИ (С ИНДИКАТОРОМ)
// ============================================
async function sendTelegramFileToClient(file) {
    if (!currentTelegramChatId) return;

    // Создаём индикатор загрузки
    const messagesContainer = document.getElementById('telegram-chat-messages');
    const loadingId = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.id = loadingId;
    loadingDiv.className = 'telegram-card-message msg-out';
    loadingDiv.innerHTML = `
        <div class="telegram-msg-text">
            <div class="telegram-loading-spinner"></div>
            <span style="margin-left: 8px;">Отправка ${file.name}...</span>
        </div>
    `;
    messagesContainer.appendChild(loadingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    const formData = new FormData();
    formData.append('chat_id', currentTelegramChatId);
    formData.append('file', file);

    const input = document.getElementById('telegram-chat-input');
    const text = input?.value?.trim();
    if (text) {
        formData.append('text', text);
        input.value = '';
    }

    try {
        const token = localStorage.getItem('vortex_token');
        const response = await fetch(`${API_BASE_URL}/api/telegram/send`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();

        // Удаляем индикатор загрузки
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) loadingElement.remove();

        if (data.status === 'ok') {
            // Показываем успешную отправку
            const successDiv = document.createElement('div');
            successDiv.className = 'telegram-card-message msg-out';
            successDiv.innerHTML = `
                <div class="telegram-msg-text">
                    <span>✅ Файл "${file.name}" отправлен</span>
                </div>
                <div class="telegram-msg-time">${new Date().toLocaleTimeString()}</div>
            `;
            messagesContainer.appendChild(successDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            setTimeout(() => {
                if (successDiv) successDiv.remove();
                loadTelegramMessagesForClient();
            }, 1500);
        } else {
            // Показываем ошибку
            const errorDiv = document.createElement('div');
            errorDiv.className = 'telegram-card-message msg-out';
            errorDiv.innerHTML = `
                <div class="telegram-msg-text" style="color: #ff5555;">
                    ❌ Ошибка: ${data.message || 'Не удалось отправить файл'}
                </div>
            `;
            messagesContainer.appendChild(errorDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            setTimeout(() => errorDiv.remove(), 3000);
        }
    } catch (error) {
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) loadingElement.remove();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'telegram-card-message msg-out';
        errorDiv.innerHTML = `
            <div class="telegram-msg-text" style="color: #ff5555;">
                ❌ Ошибка сети: ${error.message}
            </div>
        `;
        messagesContainer.appendChild(errorDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        setTimeout(() => errorDiv.remove(), 3000);
    }
}

// ============================================
// ПОЛЛИНГ ДЛЯ ОБНОВЛЕНИЯ СООБЩЕНИЙ
// ============================================
function startTelegramCardPolling() {
    if (telegramPollingCardInterval) clearInterval(telegramPollingCardInterval);
    telegramPollingCardInterval = setInterval(() => {
        // НЕ обновляем, если играет аудио
        if (currentTelegramChatId && !isAudioPlaying) {
            loadTelegramMessagesForClient();
        }
    }, 5000);
}

function stopTelegramCardPolling() {
    if (telegramPollingCardInterval) {
        clearInterval(telegramPollingCardInterval);
        telegramPollingCardInterval = null;
    }
}

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================
function escapeHtmlTelegram(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTelegramTimeCard(timestampMs) {
    if (!timestampMs) return '';
    const date = new Date(timestampMs);
    const now = new Date();
    const diff = now - date;

    if (diff < 24 * 60 * 60 * 1000) {
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }
}

// Запускаем проверку при загрузке
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(checkTelegramIntegration, 500);
});