// WhatsAppManager.js
// Логика управления чатами WhatsApp для Vortex CRM

class WhatsAppManager {
    constructor() {
        this.currentChatPhone = null;
        this.chats = [];
        this.apiUrl = '/api/whatsapp'; // Проксируется через ваш основной сервер (порт 5000)

        // Элементы UI из contact.html
        this.chatListContainer = document.getElementById('wa-chats-list');
        this.messagesContainer = document.getElementById('chat-messages');
        this.chatTitle = document.querySelector('.chat-active-name');
        this.chatStatus = document.querySelector('.chat-active-status');
    }

    // Инициализация
    init() {
        console.log("WhatsApp Manager Initialized");
        this.loadChats();

        // Интервал обновления списка чатов (раз в 10 секунд)
        setInterval(() => this.loadChats(), 10000);
    }

    // 1. Загрузка списка чатов слева
    async loadChats() {
        try {
            const response = await fetch(`${this.apiUrl}/numbers/db`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`
                }
            });
            const data = await response.json();

            if (data.numbers && data.numbers.length > 0) {
                // В данной логике берем первый активный номер компании
                const myPhone = data.numbers[0].phone;
                this.fetchChatList(myPhone);
            }
        } catch (error) {
            console.error("Error loading WA numbers:", error);
        }
    }

    async fetchChatList(myPhone) {
        try {
            // Запрос списка последних диалогов
            const response = await fetch(`${this.apiUrl}/chats?phone=${myPhone}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            });
            const data = await response.json();
            this.chats = data.chats || [];
            this.renderChatList();
        } catch (error) {
            console.error("Error fetching chats:", error);
        }
    }

    // 2. Отрисовка списка чатов (левая панель)
    renderChatList() {
        if (!this.chatListContainer) return;
        this.chatListContainer.innerHTML = '';

        this.chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${this.currentChatPhone === chat.peer_phone ? 'active' : ''}`;
            chatItem.onclick = () => this.selectChat(chat);

            chatItem.innerHTML = `
                <div class="chat-info">
                    <div class="chat-name">${chat.peer_name || chat.peer_phone}</div>
                    <div class="chat-last-msg">${chat.last_msg_text || 'Файл'}</div>
                </div>
                ${chat.unread_count > 0 ? `<div class="unread-badge">${chat.unread_count}</div>` : ''}
            `;
            this.chatListContainer.appendChild(chatItem);
        });
    }

    // 3. Выбор чата и загрузка сообщений (правая панель)
    async selectChat(chat) {
        this.currentChatPhone = chat.peer_phone;
        this.chatTitle.textContent = chat.peer_name || chat.peer_phone;
        this.chatStatus.textContent = "в сети"; // Упрощенно

        this.renderChatList(); // Обновить активный класс слева
        this.loadMessages(chat.peer_phone);
    }

    async loadMessages(peerPhone) {
        try {
            this.messagesContainer.innerHTML = '<div class="vortex-loader">Загрузка...</div>';

            const response = await fetch(`${this.apiUrl}/messages?peer=${peerPhone}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            });
            const data = await response.json();

            this.messagesContainer.innerHTML = '';
            data.messages.forEach(msg => {
                this.appendMessage(msg.text, msg.direction === 'out' ? 'out' : 'in', msg.type);
            });

            this.scrollToBottom();
        } catch (error) {
            console.error("Error loading messages:", error);
        }
    }

    // 4. Отправка сообщения
    async sendMessage(text) {
        if (!text || !this.currentChatPhone) return;

        try {
            const response = await fetch(`${this.apiUrl}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`
                },
                body: JSON.stringify({
                    to: this.currentChatPhone,
                    message: text
                })
            });

            if (response.ok) {
                this.appendMessage(text, 'out');
                this.scrollToBottom();
                return true;
            }
        } catch (error) {
            console.error("Send error:", error);
        }
        return false;
    }

    // Вспомогательные функции
    appendMessage(content, type, mediaType = 'text') {
        const div = document.createElement('div');
        div.className = `message-bubble msg-${type}`;

        if (mediaType === 'image') {
            div.innerHTML = `<img src="${content}" style="max-width: 200px; border-radius: 8px;">`;
        } else {
            div.textContent = content;
        }

        this.messagesContainer.appendChild(div);
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
}

// Создаем экземпляр и запускаем при загрузке страницы
const waManager = new WhatsAppManager();
document.addEventListener('DOMContentLoaded', () => {
    waManager.init();

    // Привязка кнопки отправки из contact.html
    const sendBtn = document.getElementById('wa-send');
    const input = document.getElementById('wa-input');

    if (sendBtn && input) {
        sendBtn.addEventListener('click', async () => {
            const ok = await waManager.sendMessage(input.value);
            if (ok) input.value = '';
        });

        input.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const ok = await waManager.sendMessage(input.value);
                if (ok) input.value = '';
            }
        });
    }
});