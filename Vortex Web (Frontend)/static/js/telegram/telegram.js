// static/js/telegram/telegram.js
// Telegram интеграция для раздела Контакты

let currentTelegramChat = null;
let telegramChats = [];
let telegramMessages = [];
let telegramPollingInterval = null;
let isLoadingMore = false;
let hasMoreMessages = true;
let currentOffset = 0;
const MESSAGES_LIMIT = 50;

// ============================================
// ЗАГРУЗКА СООБЩЕНИЙ TELEGRAM (С ПАГИНАЦИЕЙ)
// ============================================
async function loadTelegramMessages(chatId, loadMore = false) {
    if (isLoadingMore) return;

    try {
        isLoadingMore = true;
        const token = localStorage.getItem('vortex_token');

        // Если загружаем больше - используем offset
        let url = `${API_BASE_URL}/api/telegram/messages/${chatId}?limit=${MESSAGES_LIMIT}`;
        if (loadMore && currentOffset > 0) {
            url += `&offset=${currentOffset}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.ok) {
            const newMessages = data.messages || [];

            if (loadMore) {
                // Добавляем старые сообщения в начало
                telegramMessages = [...newMessages, ...telegramMessages];
                hasMoreMessages = newMessages.length === MESSAGES_LIMIT;
                if (hasMoreMessages) {
                    currentOffset += MESSAGES_LIMIT;
                }
                renderTelegramMessages(true); // preserveScroll = true
            } else {
                // Первая загрузка или обновление
                const isFirstLoad = telegramMessages.length === 0;
                telegramMessages = newMessages;
                hasMoreMessages = newMessages.length === MESSAGES_LIMIT;
                currentOffset = hasMoreMessages ? MESSAGES_LIMIT : 0;
                // Если это не первая загрузка - сохраняем скролл
                renderTelegramMessages(!isFirstLoad);
            }
        }
    } catch (error) {
        console.error("Ошибка загрузки сообщений:", error);
    } finally {
        isLoadingMore = false;
    }
}


// ============================================
// ЗАГРУЗКА СПИСКА ЧАТОВ TELEGRAM
// ============================================
async function loadTelegramChats() {
    try {
        const token = localStorage.getItem('vortex_token');
        const response = await fetch(`${API_BASE_URL}/api/telegram/chats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.ok) {
            telegramChats = data.chats || [];
            renderTelegramChatsList();
        }
    } catch (error) {
        console.error("Ошибка загрузки чатов Telegram:", error);
    }
}

// ============================================
// ОТРИСОВКА СПИСКА ЧАТОВ TELEGRAM
// ============================================
function renderTelegramChatsList() {
    const container = document.getElementById('telegram-chats-list');
    if (!container) return;

    // Бэкенд уже отфильтровал чаты по правам, просто отображаем
    if (telegramChats.length === 0) {
        container.innerHTML = `
            <div class="vortex-placeholder" style="padding: 20px; text-align: center;">
                Нет активных чатов
            </div>
        `;
        return;
    }

    container.innerHTML = telegramChats.map(chat => `
        <div class="telegram-chat-item ${currentTelegramChat?.id === chat.id ? 'active' : ''}" 
             onclick="selectTelegramChat(${chat.id})"
             data-chat-id="${chat.id}">
            <div class="telegram-chat-avatar">
                ${chat.peer_avatar_url
            ? `<img src="${chat.peer_avatar_url}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">`
            : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="8" r="4"/>
                        <path d="M5 20v-2a7 7 0 0 1 14 0v2"/>
                       </svg>`
        }
            </div>
            <div class="telegram-chat-info">
                <div class="telegram-chat-name">${escapeHtml(chat.peer_name || chat.telegram_user_id || 'Unknown')}</div>
                <div class="telegram-chat-last-msg">${escapeHtml(chat.last_message || '')}</div>
            </div>
            <div class="telegram-chat-meta">
                <div class="telegram-chat-time">${formatTelegramTime(chat.last_message_ts_ms)}</div>
                ${chat.unread_count > 0 ? `<div class="telegram-unread-badge">${chat.unread_count}</div>` : ''}
            </div>
        </div>
    `).join('');
}

// ============================================
// ВЫБОР ЧАТА TELEGRAM
// ============================================
async function selectTelegramChat(chatId) {
    currentTelegramChat = telegramChats.find(c => c.id === chatId);

    // Сбрасываем пагинацию
    hasMoreMessages = true;
    currentOffset = 0;
    telegramMessages = [];

    // Обновляем активный класс в списке
    document.querySelectorAll('.telegram-chat-item').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.chatId == chatId) {
            el.classList.add('active');
        }
    });

    // Загружаем первые 50 сообщений
    await loadTelegramMessages(chatId, false);

    // Показываем область чата
    const chatArea = document.getElementById('telegram-chat-area');
    if (chatArea) {
        chatArea.style.display = 'flex';
    }

    // Обновляем заголовок чата
    const chatHeader = document.getElementById('telegram-chat-header');
    if (chatHeader) {
        chatHeader.innerHTML = `
            <div class="telegram-chat-header-info">
                <div class="telegram-chat-header-name">${escapeHtml(currentTelegramChat.peer_name || currentTelegramChat.telegram_user_id || 'Telegram User')}</div>
            </div>
            <button class="telegram-refresh-btn" onclick="loadTelegramMessages(${chatId}, false)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
            </button>
        `;
    }

    // Прокрутка вниз после открытия (даём время на отрисовку)
    setTimeout(() => {
        const messagesContainer = document.getElementById('telegram-messages-container');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }, 100);
}

// ============================================
// ОТРИСОВКА СООБЩЕНИЙ TELEGRAM
// ============================================
function renderTelegramMessages(preserveScroll = false) {
    const container = document.getElementById('telegram-messages-container');
    if (!container) return;

    // Сохраняем позицию ТОЛЬКО при подгрузке старых сообщений
    let oldScrollHeight = 0;
    let oldScrollTop = 0;
    let wasAtBottom = false;

    if (preserveScroll) {
        oldScrollHeight = container.scrollHeight;
        oldScrollTop = container.scrollTop;
        wasAtBottom = (container.scrollHeight - container.scrollTop - container.clientHeight) < 50;
    }

    if (telegramMessages.length === 0) {
        container.innerHTML = `<div class="vortex-placeholder" style="padding: 40px; text-align: center;">Нет сообщений. Начните диалог!</div>`;
        return;
    }

    let loadingIndicator = hasMoreMessages ? `
        <div class="telegram-loading-indicator" id="telegram-loading-more">
            <div class="telegram-loading-spinner"></div>
            <span>Загрузка старых сообщений...</span>
        </div>
    ` : '';

    container.innerHTML = loadingIndicator + telegramMessages.map(msg => {
        let fileHtml = '';
        if (msg.file_id) {
            const fileUrl = `${API_BASE_URL}/api/files/public/${msg.file_id}`;
            const fileName = msg.file_name || 'file';
            const fileExt = fileName.split('.').pop().toLowerCase();

            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExt)) {
                fileHtml = `<div class="telegram-media-card" onclick="window.open('${fileUrl}', '_blank')"><div class="telegram-media-preview"><img src="${fileUrl}" alt="${escapeHtml(fileName)}" loading="lazy"><div class="telegram-media-overlay"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></div></div></div>`;
            } else if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(fileExt)) {
                fileHtml = `<div class="telegram-media-card" onclick="window.open('${fileUrl}', '_blank')"><div class="telegram-media-preview"><video src="${fileUrl}" preload="metadata" style="width:100%;height:100%;object-fit:cover;"></video><div class="telegram-media-overlay"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></div></div></div>`;
            } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(fileExt)) {
                fileHtml = `<div class="telegram-audio-card"><div class="telegram-audio-icon">🎵</div><div class="telegram-audio-info"><div class="telegram-audio-name">${escapeHtml(fileName)}</div><audio src="${fileUrl}" controls style="width:180px;height:30px;"></audio></div></div>`;
            } else {
                fileHtml = `<div class="telegram-doc-card" onclick="window.open('${fileUrl}', '_blank')"><div class="telegram-doc-icon">📎</div><div class="telegram-doc-info"><div class="telegram-doc-name">${escapeHtml(fileName)}</div><div class="telegram-doc-size">${formatFileSize(msg.file_size || 0)}</div></div><div class="telegram-doc-download">⬇️</div></div>`;
            }
        }

        let messageText = '';
        if (msg.text && msg.text.trim()) {
            const rawText = msg.text.trim();
            const autoCaptions = ['📷 Фото', 'Фото', 'Photo', '🎥 Видео', 'Видео', 'Video'];
            const isAutoCaption = autoCaptions.some(caption => rawText === caption || rawText.includes(caption));
            if (!isAutoCaption) {
                // Сохраняем переносы строк
                let formattedText = escapeHtml(rawText);
                // Заменяем \n на <br> для переносов строк
                formattedText = formattedText.replace(/\n/g, '<br>');
                // Ссылки
                formattedText = formattedText.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: #00E5FF;">$1</a>');
                messageText = `<div class="telegram-message-text">${formattedText}</div>`;
            }
        }

        if (!messageText && !fileHtml) messageText = `<div class="telegram-message-text">📎 Вложение</div>`;

        return `<div class="telegram-message ${msg.direction === 'in' ? 'msg-in' : 'msg-out'}">${messageText}${fileHtml}<div class="telegram-message-time">${formatTelegramTime(msg.ts_ms)}</div></div>`;
    }).join('');

    // 🔥 ЛОГИКА ПРОКРУТКИ:
    if (preserveScroll) {
        // Подгрузка старых сообщений - сохраняем позицию (не прыгаем)
        if (oldScrollHeight > 0) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
        }
    } else {
        // Первое открытие чата - прокручиваем вниз
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 50);
    }

    // Сохраняем флаг "был внизу" для новых сообщений
    if (wasAtBottom) {
        container.dataset.wasAtBottom = 'true';
    } else if (!preserveScroll) {
        container.dataset.wasAtBottom = 'false';
    }

    setupScrollHandler(container);
}

// ============================================
// ОБРАБОТЧИК ПРОКРУТКИ ДЛЯ ПОДГРУЗКИ
// ============================================
function setupScrollHandler(container) {
    if (!container) return;

    // Удаляем старый обработчик, чтобы не дублировать
    container.removeEventListener('scroll', handleScroll);
    container.addEventListener('scroll', handleScroll);
}

function handleScroll(e) {
    const container = e.target;
    // Если прокрутили до верха (осталось меньше 100px) и есть ещё сообщения
    if (container.scrollTop < 100 && hasMoreMessages && !isLoadingMore && currentTelegramChat) {
        loadTelegramMessages(currentTelegramChat.id, true);
    }
}

// ============================================
// ОТКРЫТИЕ ДОКУМЕНТА В НОВОЙ ВКЛАДКЕ
// ============================================
function openDocument(url, fileName) {
    // Открываем в новой вкладке
    window.open(url, '_blank');
}

// ============================================
// ФУНКЦИИ ДЛЯ РАБОТЫ С МЕДИА
// ============================================

function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function openMediaViewer(url, type, name) {
    // Создаём модальное окно
    const modal = document.createElement('div');
    modal.className = 'telegram-media-modal';
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };

    let content = '';
    if (type === 'image') {
        content = `<img src="${url}" alt="${name}" class="telegram-modal-image" onclick="event.stopPropagation()">`;
    } else if (type === 'video') {
        content = `<video src="${url}" controls autoplay class="telegram-modal-video" onclick="event.stopPropagation()"></video>`;
    }

    modal.innerHTML = `
        <div class="telegram-modal-content">
            <button class="telegram-modal-close" onclick="closeModal()">×</button>
            ${content}
            <div class="telegram-modal-caption">${escapeHtml(name)}</div>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);

    // Обработка ESC
    window.closeModal = () => {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
        delete window.closeModal;
    };

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            if (window.closeModal) window.closeModal();
        }
    });
}

function downloadFile(url, fileName) {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// ============================================
// ОТПРАВКА СООБЩЕНИЯ В TELEGRAM
// ============================================
async function sendTelegramMessage() {
    const input = document.getElementById('telegram-message-input');
    const text = input?.value?.trim();

    if (!text || !currentTelegramChat) return;

    try {
        const token = localStorage.getItem('vortex_token');
        const response = await fetch(`${API_BASE_URL}/api/telegram/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                chat_id: currentTelegramChat.id,
                text: text
            })
        });

        const data = await response.json();

        if (data.status === 'ok') {
            // Очищаем поле ввода
            input.value = '';
            // Перезагружаем сообщения (С ПАГИНАЦИЕЙ)
            hasMoreMessages = true;
            currentOffset = 0;
            await loadTelegramMessages(currentTelegramChat.id, false);
            // Обновляем список чатов (последнее сообщение)
            await loadTelegramChats();
            // Прокрутка вниз к новому сообщению
            setTimeout(() => {
                const container = document.getElementById('telegram-messages-container');
                if (container) container.scrollTop = container.scrollHeight;
            }, 100);
        } else {
            console.error("Ошибка отправки:", data.message);
        }
    } catch (error) {
        console.error("Ошибка отправки сообщения:", error);
    }
}

// ============================================
// ЗАГРУЗКА ТОЛЬКО НОВЫХ СООБЩЕНИЙ (БЕЗ СБРОСА ПРОКРУТКИ)
// ============================================
async function loadNewMessagesOnly(chatId) {
    try {
        const token = localStorage.getItem('vortex_token');
        const url = `${API_BASE_URL}/api/telegram/messages/${chatId}?limit=${MESSAGES_LIMIT}&offset=0`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.ok) {
            const newMessages = data.messages || [];
            const existingIds = new Set(telegramMessages.map(m => m.id));
            const freshMessages = newMessages.filter(m => !existingIds.has(m.id));

            if (freshMessages.length > 0) {
                const container = document.getElementById('telegram-messages-container');
                // Проверяем, был ли пользователь внизу
                const wasNearBottom = container && (container.scrollHeight - container.scrollTop - container.clientHeight) < 100;

                // Добавляем новые сообщения
                telegramMessages = [...telegramMessages, ...freshMessages];

                if (telegramMessages.length > 200) {
                    telegramMessages = telegramMessages.slice(-200);
                }

                // Перерисовываем с сохранением позиции
                renderTelegramMessages(true);

                // Прокручиваем вниз ТОЛЬКО если пользователь был внизу
                if (wasNearBottom && container) {
                    setTimeout(() => {
                        container.scrollTop = container.scrollHeight;
                    }, 50);
                }
            }
        }
    } catch (error) {
        console.error("Ошибка загрузки новых сообщений:", error);
    }
}

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTelegramTime(timestampMs) {
    if (!timestampMs) return '';
    const date = new Date(timestampMs);
    const now = new Date();
    const diff = now - date;

    if (diff < 24 * 60 * 60 * 1000) {
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 7 * 24 * 60 * 60 * 1000) {
        return date.toLocaleDateString('ru-RU', { weekday: 'short' });
    } else {
        return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }
}

// ============================================
// ЗАПУСК ПОЛЛИНГА ДЛЯ ОБНОВЛЕНИЯ ЧАТОВ
// ============================================
function startTelegramPolling() {
    if (telegramPollingInterval) clearInterval(telegramPollingInterval);

    telegramPollingInterval = setInterval(() => {
        loadTelegramChats();
        if (currentTelegramChat) {
            loadTelegramMessages(currentTelegramChat.id);
        }
    }, 5000); // Обновление каждые 5 секунд
}

function stopTelegramPolling() {
    if (telegramPollingInterval) {
        clearInterval(telegramPollingInterval);
        telegramPollingInterval = null;
    }
}

// ============================================
// ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК (WHATSAPP/TELEGRAM/MAIL)
// ============================================
function switchContactTab(tab) {
    // Обновляем кнопки
    document.querySelectorAll('.vortex-tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`tab-${tab}`)?.classList.add('active');

    // Скрываем все секции
    document.querySelectorAll('.contact-container').forEach(section => {
        section.classList.remove('active');
    });

    if (tab === 'whatsapp') {
        const waSection = document.getElementById('section-whatsapp');
        if (waSection) waSection.classList.add('active');
        // Останавливаем Telegram polling
        stopTelegramPolling();
    } else if (tab === 'telegram') {
        const tgSection = document.getElementById('section-telegram');
        if (tgSection) tgSection.classList.add('active');
        // Загружаем чаты и запускаем polling
        loadTelegramChats();
        startTelegramPolling();
    } else if (tab === 'mail') {
        const mailSection = document.getElementById('section-mail');
        if (mailSection) mailSection.classList.add('active');
        stopTelegramPolling();
        if (typeof loadMailFolders === 'function') {
            loadMailFolders();
        }
    }
}

// ============================================
// ОТПРАВКА ФАЙЛА В TELEGRAM
// ============================================
async function sendTelegramFile(file) {
    if (!currentTelegramChat) return;

    const formData = new FormData();
    formData.append('chat_id', currentTelegramChat.id);
    formData.append('file', file);

    const input = document.getElementById('telegram-message-input');
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

        if (data.status === 'ok') {
            // Ждём 1.5 секунды для синхронизации файла через polling
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Принудительная синхронизация
            await fetch(`${API_BASE_URL}/api/telegram/sync-from-telegram`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Ещё небольшая задержка
            await new Promise(resolve => setTimeout(resolve, 500));

            // Обновляем сообщения
            hasMoreMessages = true;
            currentOffset = 0;
            await loadTelegramMessages(currentTelegramChat.id, false);
            await loadTelegramChats();

            setTimeout(() => {
                const container = document.getElementById('telegram-messages-container');
                if (container) container.scrollTop = container.scrollHeight;
            }, 100);
        } else {
            console.error("Ошибка отправки файла:", data.message);
        }
    } catch (error) {
        console.error("Ошибка отправки файла:", error);
    }
}

// Обработчик выбора файла
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('telegram-file-input');
    if (fileInput) {
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                await sendTelegramFile(file);
                fileInput.value = '';
            }
        };
    }
});

// ============================================
// АВТОМАТИЧЕСКАЯ СИНХРОНИЗАЦИЯ (ТОЛЬКО НОВЫЕ СООБЩЕНИЯ)
// ============================================
let autoSyncInterval = null;
let isSyncing = false;

async function autoSyncTelegram() {
    if (isSyncing) return;

    const tgSection = document.getElementById('section-telegram');
    if (!tgSection || !tgSection.classList.contains('active')) return;

    isSyncing = true;

    try {
        const token = localStorage.getItem('vortex_token');

        // 1. Синхронизация с Telegram API (получаем новые сообщения в БД)
        const syncResponse = await fetch(`${API_BASE_URL}/api/telegram/sync-from-telegram`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const syncData = await syncResponse.json();

        if (syncData.status === 'ok' && syncData.new_messages > 0) {
            console.log(`🔄 Auto-sync: +${syncData.new_messages} new messages`);

            if (currentTelegramChat) {
                // 2. Загружаем ТОЛЬКО последние новые сообщения (не все)
                const messagesUrl = `${API_BASE_URL}/api/telegram/messages/${currentTelegramChat.id}?limit=${syncData.new_messages}&offset=0`;
                const messagesResponse = await fetch(messagesUrl, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const messagesData = await messagesResponse.json();

                if (messagesData.ok && messagesData.messages && messagesData.messages.length > 0) {
                    const newMessages = messagesData.messages;

                    // Проверяем, какие сообщения уже есть (по ID)
                    const existingIds = new Set(telegramMessages.map(m => m.id));
                    const freshMessages = newMessages.filter(m => !existingIds.has(m.id));

                    if (freshMessages.length > 0) {
                        // Сохраняем позицию прокрутки
                        const container = document.getElementById('telegram-messages-container');
                        const wasNearBottom = container && container.scrollHeight - container.scrollTop - container.clientHeight < 100;

                        // Добавляем новые сообщения в КОНЕЦ (не перезаписываем всё)
                        telegramMessages = [...telegramMessages, ...freshMessages];

                        // Перерисовываем с сохранением позиции
                        renderTelegramMessages(true);

                        // Если были внизу - прокручиваем к новым сообщениям
                        if (wasNearBottom && container) {
                            setTimeout(() => {
                                container.scrollTop = container.scrollHeight;
                            }, 50);
                        }
                    }
                }
            }

            // Обновляем список чатов (для последнего сообщения)
            await loadTelegramChats();
        }
    } catch (error) {
        console.error("Auto-sync error:", error);
    } finally {
        isSyncing = false;
    }
}

function startAutoSync() {
    if (autoSyncInterval) clearInterval(autoSyncInterval);
    // Запускаем синхронизацию каждые 5 секунд
    autoSyncInterval = setInterval(autoSyncTelegram, 5000);
    console.log("✅ Telegram auto-sync started (every 5 sec)");
}

function stopAutoSync() {
    if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
        autoSyncInterval = null;
        console.log("⏹️ Telegram auto-sync stopped");
    }
}

// Обновите switchContactTab
const originalSwitchContactTab = window.switchContactTab;
window.switchContactTab = function (tab) {
    if (tab === 'telegram') {
        startAutoSync();
        loadTelegramChats();
    } else {
        stopAutoSync();
    }

    // Вызываем оригинальную функцию
    if (typeof originalSwitchContactTab === 'function') {
        originalSwitchContactTab(tab);
    }
};

// Запускаем авто-синхронизацию если Telegram активен при загрузке
document.addEventListener('DOMContentLoaded', () => {
    const tgSection = document.getElementById('section-telegram');
    if (tgSection && tgSection.classList.contains('active')) {
        startAutoSync();
    }
});