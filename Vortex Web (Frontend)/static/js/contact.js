// contact.js
document.addEventListener('DOMContentLoaded', () => {
    const waTab = document.getElementById('tab-whatsapp');
    const mailTab = document.getElementById('tab-mail');
    const waSection = document.getElementById('section-whatsapp');
    const mailSection = document.getElementById('section-mail');

    // Переключение вкладок
    waTab.onclick = () => {
        waSection.classList.add('active');
        mailSection.classList.remove('active');
        waTab.classList.add('active');
        mailTab.classList.remove('active');
    };

    mailTab.onclick = () => {
        mailSection.classList.add('active');
        waSection.classList.remove('active');
        mailTab.classList.add('active');
        waTab.classList.remove('active');
        // Вызываем функцию загрузки папок из другого файла
        if (typeof loadMailFolders === 'function') {
            loadMailFolders();
        }
    };

    // --- WHATSAPP LOGIC ---
    const waSendBtn = document.getElementById('wa-send');
    const waInput = document.getElementById('wa-input');
    const waAttachBtn = document.getElementById('wa-attach');
    const waFileInput = document.getElementById('wa-file-input');

    waSendBtn.onclick = async () => {
        const text = waInput.value;
        if (!text) return;

        const response = await fetch('/api/whatsapp/send', {
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

    waAttachBtn.onclick = () => waFileInput.click();
    waFileInput.onchange = async (e) => {
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('phone', '7999...');
        formData.append('mode', file.type.startsWith('image') ? 'image' : 'document');

        await fetch('/api/whatsapp/send_file', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` },
            body: formData
        });
    };

    function appendMessage(content, type, mediaType = 'text') {
        const area = document.getElementById('chat-messages');
        const div = document.createElement('div');
        div.className = `message-bubble msg-${type}`;
        // ... (логика отрисовки контента)
        div.innerText = content;
        area.appendChild(div);
        area.scrollTop = area.scrollHeight;
    }
});