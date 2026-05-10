/**
 * CardMail.js - Интеграция почты Mail.ru в карточку CRM Vortex
 */

let currentClientEmail = "";

/**
 * Основная функция открытия почты
 */
async function openMail() {
    const rightPanel = document.getElementById('right-panel-display');
    const pinnedArea = document.getElementById('pinned-notes-container');

    if (!rightPanel || !pinnedArea) return;

    pinnedArea.style.display = 'none';
    currentClientEmail = findEmailInFields();

    if (!currentClientEmail) {
        rightPanel.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <div style="color: #ff4d4d; font-weight: bold; margin-bottom: 10px;">EMAIL НЕ НАЙДЕН</div>
                <div style="color: #888; font-size: 11px;">Заполните поле с почтой в информации о клиенте.</div>
                <button class="mini-tool-btn" style="margin-top: 15px;" onclick="exitMailMode()">ВЕРНУТЬСЯ</button>
            </div>
        `;
        return;
    }

    renderMailLayout(rightPanel);

    if (typeof mailSearchQuery !== 'undefined') {
        mailSearchQuery = currentClientEmail.toLowerCase();
    }

    if (typeof loadEmails === 'function') {
        loadEmails('INBOX');
    }
}

function findEmailInFields() {
    const inputs = document.querySelectorAll('.custom-field-input');
    let foundEmail = "";
    inputs.forEach(input => {
        const val = input.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(val)) foundEmail = val;
    });
    return foundEmail;
}

/**
 * Отрисовка структуры почты внутри правой панели
 */
function renderMailLayout(container) {
    container.innerHTML = `
        <style>
            /* Тонкий скроллбар для почтового контейнера */
            #mail-view::-webkit-scrollbar, 
            #mail-items-list::-webkit-scrollbar {
                width: 2px; /* Ультра-тонкая ширина */
            }
            #mail-view::-webkit-scrollbar-track,
            #mail-items-list::-webkit-scrollbar-track {
                background: transparent; 
            }
            #mail-view::-webkit-scrollbar-thumb,
            #mail-items-list::-webkit-scrollbar-thumb {
                background: var(--vortex-accent); /* Твой яркий циан */
                border-radius: 10px;
                box-shadow: 0 0 5px var(--vortex-accent); /* Легкое неоновое свечение */
            }
            /* Для Firefox */
            #mail-view, #mail-items-list {
                scrollbar-width: thin;
                scrollbar-color: var(--vortex-accent) transparent;
            }
        </style>

        <div id="card-mail-container" style="display: flex; flex-direction: column; height: 100%;">
            <div style="padding: 10px; border-bottom: 1px solid rgba(0, 229, 255, 0.1); background: rgba(0,0,0,0.2); display: flex; gap: 10px; align-items: center; justify-content: space-between;">
                
                <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                    <button class="mini-tool-btn" onclick="exitMailMode()" style="color: #ff4d4d; border-color: #ff4d4d;">✕</button>
                    
                    <input type="text" id="mail-search-input" value="${currentClientEmail}" 
                           style="background: transparent; border: none; color: transparent; pointer-events: none; width: 1px; outline: none;">
                    
                    <span style="color: var(--vortex-accent); font-size: 11px; font-weight: bold; letter-spacing: 0.5px; opacity: 0.8;">
                        КЛИЕНТ: ${currentClientEmail}
                    </span>
                </div>

                <button class="mini-tool-btn" onclick="openComposeInCard()">НОВОЕ ПИСЬМО</button>
            </div>

            <div id="mail-content-split" style="display: flex; flex: 1; overflow: hidden; flex-direction: column; position: relative;">
                <div id="mail-items-list" style="flex: 1; overflow-y: auto;">
                    <div style="padding: 20px; color: var(--vortex-accent); font-size: 11px;">СИНХРОНИЗАЦИЯ ПОТОКА...</div>
                </div>
                
                <div id="mail-view" style="display:none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #0b0f14; z-index: 100; overflow-y: auto; box-sizing: border-box; padding: 10px;">
                </div>
            </div>
        </div>
    `;

    if (typeof initMailSearch === 'function') initMailSearch();
}

/**
 * Открытие формы нового письма
 */
function openComposeInCard() {
    const view = document.getElementById('mail-view');
    if (view) {
        view.style.display = 'block';
        if (typeof openComposeModal === 'function') {
            openComposeModal(currentClientEmail);

            // Кнопка назад выровнена по сетке (без лишних отступов слева, так как у контейнера уже есть padding)
            const backBtn = document.createElement('button');
            backBtn.className = "mini-tool-btn";
            backBtn.style.marginBottom = "15px";
            backBtn.innerText = "← К СПИСКУ";
            backBtn.onclick = () => { view.style.display = 'none'; };

            view.prepend(backBtn);
        }
    }
}

function exitMailMode() {
    const pinnedArea = document.getElementById('pinned-notes-container');
    if (pinnedArea) pinnedArea.style.display = 'block';
    if (typeof loadClientHistory === 'function') loadClientHistory();
}

/**
 * Просмотр письма
 */
const originalViewEmail = window.viewEmail;
window.viewEmail = async function (folder, uid) {
    const view = document.getElementById('mail-view');
    if (view) {
        view.style.display = 'block';
        view.scrollTop = 0;
        view.innerHTML = '<div style="color: var(--vortex-accent); font-size: 11px;">ЗАГРУЗКА...</div>';
    }

    await originalViewEmail(folder, uid);

    // Выравнивание кнопки назад в режиме просмотра
    if (view) {
        const backBtn = document.createElement('button');
        backBtn.innerText = "← К СПИСКУ";
        backBtn.className = "mini-tool-btn btn-mail-back";
        backBtn.style.marginBottom = "15px";
        backBtn.onclick = () => { view.style.display = 'none'; };
        view.prepend(backBtn);
    }
};