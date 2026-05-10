// В начало mailru.js к переменным состояния
let mailSearchQuery = "";

/**
 * Извлекает чистый адрес почты (удаляет имя)
 */
function getCleanEmail(s) {
    if (!s) return "";
    // Ищем текст внутри угловых скобок < >
    const match = s.match(/<(.+?)>/);
    return match ? match[1] : s.trim();
}
/**
 * ИНИЦИАЛИЗАЦИЯ ПОИСКА
 * Добавь этот вызов в конец функции loadMailFolders или в DomContentLoaded
 */
function initMailSearch() {
    const searchInput = document.getElementById('mail-search-input');
    if (!searchInput) return;

    searchInput.oninput = (e) => {
        mailSearchQuery = e.target.value.toLowerCase().trim();
        // Сбрасываем счетчик и очищаем список для новой отрисовки
        displayedCount = 0;
        const list = document.getElementById('mail-items-list');
        if (list) list.innerHTML = '';
        renderNextMessages();
    };
}

// ОБНОВЛЕННЫЙ СПИСОК ПИСЕМ
function renderNextMessages() {
    const list = document.getElementById('mail-items-list');
    if (!list) return;

    // Фильтрация (добавлен поиск по полю to)
    const filtered = allMessages.filter(m => {
        if (!mailSearchQuery) return true;
        const from = (m.from || "").toLowerCase();
        const to = (m.to || "").toLowerCase();
        const subject = (m.subject || "").toLowerCase();
        const bodyText = (m.text || "").toLowerCase();
        return from.includes(mailSearchQuery) ||
            to.includes(mailSearchQuery) ||
            subject.includes(mailSearchQuery) ||
            bodyText.includes(mailSearchQuery);
    });

    if (displayedCount >= filtered.length) return;
    const nextBatch = filtered.slice(displayedCount, displayedCount + PAGE_SIZE);

    const htmlBatch = nextBatch.map(m => `
        <div class="mail-item" onclick="viewEmail('${currentMailFolder}', '${m.uid}')" style="padding: 12px; border-bottom: 1px solid rgba(0, 229, 255, 0.1); cursor: pointer;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <div style="color:var(--vortex-accent); font-size: 13px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60%;">${m.from}</div>
                <div style="color: #666; font-size: 10px; white-space: nowrap; margin-left: 10px;">${m.date || ''}</div>
            </div>
            
            <div style="font-size: 11px; color: #888; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                Кому: <span style="color: var(--vortex-accent)">${getCleanEmail(m.to)}</span>
            </div>

            <div style="font-size: 12px; color: #fff; opacity: 0.8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.subject || '(Без темы)'}</div>
        </div>
    `).join('');

    list.insertAdjacentHTML('beforeend', htmlBatch);
    displayedCount += nextBatch.length;
}

// Переменные состояния
window.allMessages = [];
let displayedCount = 0;
let currentMailFolder = '';
const PAGE_SIZE = 25;
let isPolling = false; // Флаг для предотвращения дублей ожидания

 //* 1. ЗАГРУЗКА ПАПОК ----------------------------------------------------------------------------------
async function loadMailFolders() {
    const list = document.getElementById('mail-folders-list');
    if (!list) return;

    list.innerHTML = '<div style="padding:10px; color:var(--vortex-accent)">ЗАГРУЗКА ПАПОК...</div>';

    try {
        await fetch(`${API_BASE_URL}/api/mail/online`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });

        const res = await fetch(`${API_BASE_URL}/api/mail/folders`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });
        const data = await res.json();

        if (data.status === "ok" && data.folders) {
            // Если у тебя в Спаме лежат Черновики, мы принудительно меняем им названия
            const forceRename = {
                "&BCEEPwQwBDw-": "СПАМ",       // Раньше были Черновики, теперь пишем СПАМ
                "&BCcENQRABD0EPgQyBDgEOgQ4-": "ЧЕРНОВИКИ" // Раньше был Спам, теперь пишем ЧЕРНОВИКИ
            };

            let foldersHtml = `
                <div class="mail-item" onclick="loadEmails('INBOX')">
                    ВСЕ ПИСЬМА
                </div>
            `;

            foldersHtml += data.folders.map(f => {
                // Выводим в консоль, чтобы ты мог проверить коды, если опять не сработает
                console.log(`Folder: ${f.name}, IMAP_NAME: ${f.imap_name}`);

                const displayName = forceRename[f.imap_name] || f.name.toUpperCase();

                return `
                    <div class="mail-item" onclick="loadEmails('${f.imap_name}')">
                        ${displayName}
                    </div>
                `;
            }).join('');

            list.innerHTML = foldersHtml;
            if (data.folders.length > 0) loadEmails('INBOX');
        }
    } catch (err) {
        list.innerHTML = '<div style="padding:10px; color:red">СЕРВЕР НЕДОСТУПЕН</div>';
    }
}

/**
 * ЗАГРУЗКА ПИСЕМ (с поддержкой бесконечной подгрузки)
 */
async function loadEmails(folder, isMore = false) {
    const list = document.getElementById('mail-items-list');
    if (!list) return;

    // --- ЛОГИКА ПОДСВЕТКИ АКТИВНОЙ ПАПКИ ---
    if (!isMore) {
        document.querySelectorAll('#mail-folders-list .mail-item').forEach(el => {
            el.classList.remove('active');
            // Проверяем, содержит ли атрибут onclick имя текущей папки
            if (el.getAttribute('onclick') && el.getAttribute('onclick').includes(`'${folder}'`)) {
                el.classList.add('active');
            }
        });
    }

    if (!isMore) {
        currentMailFolder = folder;
        displayedCount = 0;
        allMessages = [];
        list.innerHTML = '<div style="padding:10px; color:var(--vortex-accent)">СИНХРОНИЗАЦИЯ...</div>';
    }

    try {
        // Сообщаем серверу, какие UID у нас уже есть
        const haveUids = allMessages.map(m => m.uid);

        const res = await fetch(`${API_BASE_URL}/api/mail/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`
            },
            body: JSON.stringify({ folder: folder, have: haveUids })
        });
        const data = await res.json();

        if (data.status === "ok" && data.messages) {
            // Объединяем старые письма с новыми
            const newBatch = data.messages;
            allMessages = isMore ? allMessages.concat(newBatch) : newBatch;

            // 🔥 ВСЕГДА СОРТИРУЕМ ПО ДАТЕ (новые сверху)
            allMessages.sort((a, b) => {
                return (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0);
            });

            if (!isMore) {
                list.innerHTML = '';
                startMailWait(folder); // Слушаем новые письма
            }

            renderNextMessages();
            initMailScroll();
        } else if (!isMore) {
            list.innerHTML = '<div style="padding:10px; color:#555;">ПУСТО</div>';
        }
    } catch (err) {
        if (!isMore) list.innerHTML = '<div style="padding:10px; color:red">ОШИБКА ЗАГРУЗКИ</div>';
    }
}

/**
 * 3. ОЖИДАНИЕ НОВЫХ ПИСЕМ (Long Polling)
 * Решает проблему "пропавшего письма", дожидаясь ответа от сервера
 */
async function startMailWait(folder) {
    if (isPolling) return;
    isPolling = true;

    while (isPolling && currentMailFolder === folder) {
        try {
            const lastUid = allMessages.length > 0 ? Math.max(...allMessages.map(m => parseInt(m.uid) || 0)) : 0;

            const res = await fetch(`${API_BASE_URL}/api/mail/wait?folder=${folder}&last_uid=${lastUid}&timeout=25`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            });
            const data = await res.json();

            if (data.status === "ok" && data.new_uids && data.new_uids.length > 0) {
                // Если пришли новые UID — догружаем их
                const syncRes = await fetch(`${API_BASE_URL}/api/mail/sync`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`
                    },
                    body: JSON.stringify({ folder: folder, have: allMessages.map(m => m.uid) })
                });
                const syncData = await syncRes.json();

                if (syncData.messages && syncData.messages.length > 0) {
                    allMessages = [...syncData.messages, ...allMessages].sort((a, b) => {
                        return (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0);
                    });
                    document.getElementById('mail-items-list').innerHTML = '';
                    displayedCount = 0;
                    renderNextMessages();
                }
            }
        } catch (err) {
            await new Promise(r => setTimeout(r, 5000));
        }
    }
    isPolling = false;
}

/**
 * ИНИЦИАЛИЗАЦИЯ СКРОЛЛА
 */
function initMailScroll() {
    const listPanel = document.getElementById('mail-items-list');
    if (!listPanel) return;

    listPanel.onscroll = () => {
        const scrollPos = listPanel.scrollTop + listPanel.clientHeight;
        const totalHeight = listPanel.scrollHeight;

        if (scrollPos >= totalHeight - 50) {
            if (displayedCount < allMessages.length) {
                renderNextMessages();
            } else if (!mailSearchQuery) {
                // Если отрисовали всё, что скачано — идем на сервер за более старыми письмами
                loadEmails(currentMailFolder, true);
            }
        }
    };
}

// ОБНОВЛЕННЫЙ ПРОСМОТР ПИСЬМА
async function viewEmail(folder, uid) {
    const view = document.getElementById('mail-view');
    if (!view) return;

    // Подсветка активного письма
    document.querySelectorAll('#mail-items-list .mail-item').forEach(el => {
        el.classList.remove('active');
        if (el.getAttribute('onclick') && el.getAttribute('onclick').includes(`'${uid}'`)) {
            el.classList.add('active');
        }
    });

    view.innerHTML = '<div style="padding:20px; color:var(--vortex-accent)">ЗАГРУЗКА...</div>';

    try {
        const url = `${API_BASE_URL}/api/mail/message/${encodeURIComponent(folder)}/${uid}`;
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Ошибка сервера: ${res.status}. ${errorText}`);
        }

        const data = await res.json();

        if (data.status === "ok" && data.message) {
            const msg = data.message;

            // Если и HTML и TEXT пустые, выводим заглушку
            let bodyHtml = msg.html || msg.text || '<p style="color:#555">Текст письма отсутствует</p>';

            const senderEmail = typeof getCleanEmail === 'function' ? getCleanEmail(msg.from) : (msg.from || "");
            const replySubject = msg.subject && msg.subject.toLowerCase().startsWith('re:') ? msg.subject : `Re: ${msg.subject || ''}`;

            // 1. ОБРАБОТКА ВСТРОЕННЫХ КАРТИН (CID)
            if (msg.attachments && msg.attachments.length > 0) {
                msg.attachments.forEach(att => {
                    if (att.content_id && att.data) {
                        const dataUrl = `data:image/jpeg;base64,${att.data}`;
                        // Используем регулярное выражение, чтобы заменить все вхождения CID
                        const reg = new RegExp(`cid:${att.content_id}`, 'g');
                        bodyHtml = bodyHtml.replace(reg, dataUrl);
                    }
                });
            }

            // 2. ОБРАБОТКА ВЛОЖЕНИЙ
            let attHtml = "";
            if (msg.attachments && msg.attachments.length > 0) {
                attHtml = `
                    <div style="margin-top:30px; border-top:1px solid rgba(0,229,255,0.1); padding-top:20px;">
                        <b style="font-size:10px; color:#555; text-transform:uppercase; letter-spacing:1px;">Вложения:</b>
                        <div style="display:flex; flex-wrap:wrap; gap:15px; margin-top:15px;">
                `;

                msg.attachments.forEach((att) => {
                    const filename = att.filename || "file.bin";
                    const ext = filename.split('.').pop().toLowerCase();
                    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext);

                    if (isImage) {
                        attHtml += `
                            <div style="width: 150px; background: rgba(255,255,255,0.02); border: 1px solid #1a1a1a; padding: 10px; text-align: center;">
                                <img src="data:image/${ext};base64,${att.data}" 
                                     style="width: 100%; height: 100px; object-fit: cover; cursor: pointer; margin-bottom: 8px; border: 1px solid #333;"
                                     onclick="window.open().document.write('<img src=\\'data:image/${ext};base64,${att.data}\\' style=\\'max-width:100%\\'>')">
                                <div style="font-size: 9px; color: #666; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${filename}</div>
                                <button onclick="downloadFromBase64('${filename}', '${att.data}')" 
                                        style="width:100%; background: var(--vortex-accent); color: #000; border: none; padding: 5px; cursor: pointer; font-size: 9px; font-weight: bold;">
                                    СКАЧАТЬ
                                </button>
                            </div>`;
                    } else {
                        attHtml += `
                            <div style="width: 150px; background: rgba(0,229,255,0.03); border: 1px solid rgba(0,229,255,0.1); padding: 10px; display: flex; flex-direction: column; justify-content: center;">
                                <div style="font-size: 24px; text-align: center; margin-bottom: 10px;">📄</div>
                                <div style="font-size: 9px; color: #888; text-align: center; margin-bottom: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${filename}">${filename}</div>
                                <button onclick="downloadFromBase64('${filename}', '${att.data}')" 
                                        style="background: #333; color: var(--vortex-accent); border: 1px solid var(--vortex-accent); padding: 5px; cursor: pointer; font-size: 9px; font-weight: bold; text-transform: uppercase;">
                                    СКАЧАТЬ
                                </button>
                            </div>`;
                    }
                });
                attHtml += '</div></div>';
            }

            view.innerHTML = `
                <div class="email-view-wrapper" style="position: relative; padding: 25px; width: 100%; box-sizing: border-box; overflow-x: hidden;">
                    <div style="margin-bottom: 25px; position: relative;">
                        <h3 style="color:var(--vortex-accent); margin: 0; padding-right: 150px; word-break: break-word; font-size: 18px;">
                            ${msg.subject || '(Без темы)'}
                        </h3>
                        <button class="mail-reply-btn" 
                                onclick="openComposeModal('${senderEmail}', '${replySubject}')"
                                style="position: absolute; top: 0; right: 20px; background: var(--vortex-accent); color: #000; border: none; padding: 10px 20px; font-weight: bold; cursor: pointer; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; white-space: nowrap; z-index: 10;">
                            ОТВЕТИТЬ
                        </button>
                    </div>
                    <div style="font-size: 12px; color: #888; margin-bottom: 5px;">ОТ: <span style="color: var(--vortex-accent)">${getCleanEmail(msg.from)}</span></div>
                    <div style="font-size: 12px; color: #888; margin-bottom: 15px;">КОМУ: <span style="color: var(--vortex-accent)">${getCleanEmail(msg.to)}</span></div>
                    <hr style="border:0; border-bottom:1px solid rgba(255,255,255,0.1); margin-bottom: 20px;">
                    <div class="mail-body" style="color:#ccc; line-height: 1.7; font-size: 14px; overflow-x: auto;">
                        ${bodyHtml}
                    </div>
                    ${attHtml}
                </div>`;
        } else {
            view.innerHTML = `<div style="padding:20px; color:red">ОШИБКА: ${data.message || 'Неизвестная ошибка сервера'}</div>`;
        }
    } catch (err) {
        console.error("Ошибка при открытии письма:", err);
        view.innerHTML = `<div style="padding:20px; color:red">ОШИБКА ОТКРЫТИЯ: ${err.message}</div>`;
    }
}

window.loadMailFolders = loadMailFolders;
window.loadEmails = loadEmails;
window.viewEmail = viewEmail;
initMailScroll();
initMailSearch();

// Функция для скачивания файла прямо из памяти браузера
function downloadFromBase64(filename, base64Data) {
    const link = document.createElement('a');
    // Создаем ссылку с данными
    link.href = `data:application/octet-stream;base64,${base64Data}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

