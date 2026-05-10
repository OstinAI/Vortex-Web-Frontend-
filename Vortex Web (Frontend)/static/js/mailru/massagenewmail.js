
/**
 * ОТКРЫТИЕ ФОРМЫ НАПИСАНИЯ ПИСЬМА
 */
async function openComposeModal(prefillTo = "", prefillSubject = "") {
    const view = document.getElementById('mail-view');
    if (!view) return;

    view.scrollTop = 0;

    // 1. ОПРЕДЕЛЯЕМ ВАШ EMAIL
    let myEmail = "vortex-user@mail.ru";
    try {
        const messages = window.allMessages || [];
        if (messages.length > 0) {
            const latestMsg = messages[0];
            if (latestMsg.to) {
                myEmail = getCleanEmail(latestMsg.to);
                console.log("[Vortex] Ваш адрес определен:", myEmail);
            }
        }
    } catch (e) {
        console.error("[Vortex] Ошибка при поиске адреса:", e);
    }

    // 2. ОТРИСОВКА ИНТЕРФЕЙСА
    view.innerHTML = `
        <div class="compose-wrapper" style="padding-right: 30px; height: 100%; box-sizing: border-box;">
            <div class="compose-container" style="
                display: flex; 
                flex-direction: column; 
                height: 100%; 
                width: 100%; 
                padding: 25px; 
                background: #050505; 
                box-sizing: border-box; 
                border: 1px solid #1a1a1a;
                overflow-y: auto;
            ">
                <h2 style="color: var(--vortex-accent); font-size: 14px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 30px; border-left: 3px solid var(--vortex-accent); padding-left: 15px;">
                    Новое сообщение
                </h2>
                
                <div style="margin-bottom: 20px;">
                    <label style="display:block; color:#555; font-size:9px; text-transform:uppercase; margin-bottom:5px;">От кого (Ваш адрес)</label>
                    <input type="text" id="compose-from" value="${myEmail}" disabled 
                           style="width: 100%; background: rgba(255,255,255,0.03); border: none; border-bottom: 1px solid #222; color: var(--vortex-accent); padding: 10px; font-size: 12px; outline: none; box-sizing: border-box; font-weight: bold;">
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display:block; color:#555; font-size:9px; text-transform:uppercase; margin-bottom:5px;">Кому</label>
                    <input type="email" id="compose-to" value="${prefillTo}" placeholder="address@example.com"
                           style="width: 100%; background: transparent; border: none; border-bottom: 1px solid #333; color: #fff; padding: 10px 0; font-size: 13px; outline: none; box-sizing: border-box;">
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display:block; color:#555; font-size:9px; text-transform:uppercase; margin-bottom:5px;">Тема</label>
                    <input type="text" id="compose-subject" value="${prefillSubject}" placeholder="Тема сообщения"
                           style="width: 100%; background: transparent; border: none; border-bottom: 1px solid #333; color: #fff; padding: 10px 0; font-size: 13px; outline: none; box-sizing: border-box;">
                </div>

                <div style="margin-bottom: 25px; flex: 1; display: flex; flex-direction: column;">
                    <label style="display:block; color:#555; font-size:9px; text-transform:uppercase; margin-bottom:10px;">Сообщение</label>
                    <textarea id="compose-body" style="width: 100%; flex: 1; min-height: 200px; background: #0a0a0a; border: 1px solid #1a1a1a; color: #ccc; padding: 15px; font-family: inherit; font-size: 13px; outline: none; resize: none; box-sizing: border-box;"></textarea>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 15px; border: 1px solid #111;">
                    <div class="attachment-zone">
                        <input type="file" id="compose-file" style="display:none;" multiple onchange="updateFileLabel()">
                        <button onclick="document.getElementById('compose-file').click()" 
                                style="background:transparent; border:1px solid #333; color:#888; padding:8px 15px; font-size:9px; cursor:pointer; text-transform:uppercase;">
                            📎 ПРИКРЕПИТЬ ФАЙЛЫ
                        </button>
                        <span id="file-name-label" style="color:var(--vortex-accent); font-size:10px; margin-left:12px;"></span>
                    </div>

                    <button id="send-mail-btn" onclick="sendNewEmail()" 
                            style="background:var(--vortex-accent); color:#000; border:none; padding:12px 35px; font-weight:bold; cursor:pointer; text-transform:uppercase; font-size:11px; letter-spacing:2px;">
                        ОТПРАВИТЬ
                    </button>
                </div>
                <div id="compose-status" style="margin-top:15px; color:var(--vortex-accent); font-size:9px; text-align:right;"></div>
            </div>
        </div>
    `;
}


// Функции-помощники
function updateFileLabel() {
    const input = document.getElementById('compose-file');
    const label = document.getElementById('file-name-label');

    if (input && input.files.length > 0) {
        const count = input.files.length;

        if (count === 1) {
            // Если файл один, показываем его имя
            label.innerText = input.files[0].name.toUpperCase();
        } else {
            // Если файлов несколько, показываем количество
            const finalCount = count > 10 ? 10 : count;
            label.innerText = `ВЫБРАНО ФАЙЛОВ: ${finalCount} ${count > 10 ? '(MAX 10)' : ''}`;

            if (count > 10) {
                alert("Система Vortex поддерживает отправку максимум 10 файлов за один раз.");
            }
        }
    } else {
        label.innerText = "";
    }
}

/**
 * Функция отправки письма (фронтенд-часть)
 */
async function sendNewEmail() {
    // 1. Получаем элементы интерфейса
    const toInput = document.getElementById('compose-to');
    const subjectInput = document.getElementById('compose-subject');
    const bodyInput = document.getElementById('compose-body');
    const fileInput = document.getElementById('compose-file');
    const status = document.getElementById('compose-status');
    const btn = document.getElementById('send-mail-btn');

    const to = toInput.value.trim();
    if (!to) {
        alert("Укажите адрес получателя!");
        return;
    }

    // Блокируем кнопку и выводим статус
    btn.disabled = true;
    status.innerText = "ПОДГОТОВКА К ОТПРАВКЕ...";
    status.style.color = "var(--vortex-accent)";

    // 2. СОБИРАЕМ ВЛОЖЕНИЯ (Теперь поддерживаем до 10 файлов)
    let attachments = [];
    if (fileInput && fileInput.files.length > 0) {
        // Берем массив файлов и ограничиваем его первыми 10 элементами
        const filesToUpload = Array.from(fileInput.files).slice(0, 10);

        for (const file of filesToUpload) {
            try {
                // Обновляем статус для каждого файла, чтобы пользователь видел прогресс
                status.innerText = `КОДИРОВАНИЕ: ${file.name.toUpperCase()}...`;

                const base64Data = await toBase64(file);
                attachments.push({
                    filename: file.name,
                    data: base64Data.split(',')[1] // Убираем заголовок "data:*/*;base64,"
                });
            } catch (e) {
                console.error(`Ошибка при обработке файла ${file.name}:`, e);
            }
        }
    }

    try {
        status.innerText = "ПРОТОКОЛ ОТПРАВКИ ЗАПУЩЕН...";

        // 3. ОТПРАВКА НА CRM (Порт 5000)
        const response = await fetch(`${API_BASE_URL}/api/mail/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`
            },
            body: JSON.stringify({
                to: to,
                subject: subjectInput.value.trim(),
                body: bodyInput.value.trim(),
                attachments: attachments // Отправляем массив со всеми файлами
            })
        });

        const result = await response.json();

        if (response.ok && result.status === "ok") {
            status.innerText = "СООБЩЕНИЕ И ВЛОЖЕНИЯ ДОСТАВЛЕНЫ УСПЕШНО";

            // Техническое имя папки "ОТПРАВЛЕННЫЕ" для Mail.ru
            const SENT_FOLDER = "&BB4EQgQ,BEAEMAQyBDsENQQ9BD0ESwQ1-";

            // Даем серверу 1.5 секунды завершить запись данных
            setTimeout(() => {
                if (typeof loadEmails === 'function') {
                    console.log("[Vortex] Синхронизация папки Отправленные...");
                    loadEmails(SENT_FOLDER);
                }

                if (typeof openComposeModal === 'function') {
                    openComposeModal(); // Очищаем форму
                }
            }, 1500);

        } else {
            throw new Error(result.message || "Ошибка сервера");
        }

    } catch (e) {
        console.error("Критический сбой:", e);
        status.style.color = "#ff4444";
        status.innerText = "ОШИБКА: " + e.message.toUpperCase();
        btn.disabled = false;
    }
}
/**
 * Утилита для конвертации файла в Base64
 */
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

// Экспорт в глобальную область
window.openComposeModal = openComposeModal;
window.sendNewEmail = sendNewEmail;
window.updateFileLabel = updateFileLabel;