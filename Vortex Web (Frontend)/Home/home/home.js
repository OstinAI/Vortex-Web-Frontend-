// Функция открытия формы авторизации
function checkAndOpenAuth() {
    if (window.location.hash === "#auth") {
        const authForm = document.getElementById("auth-form");

        if (authForm) {
            authForm.style.display = "";
            authForm.classList.add("active");

            const currentDisplay = window.getComputedStyle(authForm).display;
            if (currentDisplay === "none") {
                authForm.style.display = "block";
            }

            setTimeout(() => {
                authForm.scrollIntoView({ behavior: "smooth", block: "center" });
                const companyInput = document.getElementById("company");
                if (companyInput) companyInput.focus();
            }, 100);
        }
    }
}

// ===== МОДАЛЬНОЕ ОКНО ПОЛИТИКИ КОНФИДЕНЦИАЛЬНОСТИ =====
function openPrivacyModal() {
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.id = 'privacyModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 1000;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.4s ease;
    `;

    modal.innerHTML = `
        <div style="
            background: rgba(255, 255, 255, 0.04);
            backdrop-filter: blur(30px);
            -webkit-backdrop-filter: blur(30px);
            border-radius: 28px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 40px 36px;
            max-width: 720px;
            width: 92%;
            max-height: 85vh;
            overflow-y: auto;
            box-shadow: 0 40px 100px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05);
            position: relative;
            animation: slideUp 0.4s ease;
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
        ">
            <style>
                #privacyModal > div::-webkit-scrollbar {
                    width: 4px;
                }
                #privacyModal > div::-webkit-scrollbar-track {
                    background: transparent;
                }
                #privacyModal > div::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.15);
                    border-radius: 4px;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(40px) scale(0.96); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
                .glass-text {
                    background: rgba(255, 255, 255, 0.06);
                    border-radius: 12px;
                    padding: 16px 20px;
                    border: 1px solid rgba(255, 255, 255, 0.04);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                }
                .glass-list-item {
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 10px;
                    padding: 10px 16px;
                    border: 1px solid rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(5px);
                    -webkit-backdrop-filter: blur(5px);
                    transition: all 0.3s ease;
                }
                .glass-list-item:hover {
                    background: rgba(255, 255, 255, 0.06);
                    border-color: rgba(0, 212, 255, 0.1);
                }
                .glass-title {
                    background: linear-gradient(135deg, #00d4ff, #7b2ffc);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                .glass-contact {
                    background: rgba(0, 212, 255, 0.04);
                    border-radius: 14px;
                    padding: 18px 22px;
                    border: 1px solid rgba(0, 212, 255, 0.06);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                }
            </style>

            <!-- Кнопка закрытия -->
            <button onclick="closePrivacyModal()" style="
                position: sticky;
                top: 0;
                float: right;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.06);
                color: rgba(255, 255, 255, 0.4);
                width: 40px;
                height: 40px;
                border-radius: 50%;
                font-size: 18px;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 10px;
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
            " onmouseover="this.style.background='rgba(255,255,255,0.1)'; this.style.color='#fff'; this.style.borderColor='rgba(255,255,255,0.15)'" 
              onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.color='rgba(255,255,255,0.4)'; this.style.borderColor='rgba(255,255,255,0.06)'">
                ✕
            </button>

            <h1 style="
                font-family: 'Inter', sans-serif;
                font-size: 30px;
                font-weight: 700;
                background: linear-gradient(135deg, #00d4ff, #7b2ffc);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin: 0 0 8px 0;
                letter-spacing: 0.5px;
                clear: both;
            ">
                <i class="fas fa-shield-alt" style="color: #00E5FF; margin-right: 14px; -webkit-text-fill-color: #00E5FF; font-size: 28px;"></i>
                Политика конфиденциальности
            </h1>
            <p style="color: rgba(255, 255, 255, 0.3); font-size: 13px; margin: 0 0 28px 50px; letter-spacing: 0.5px; font-family: 'Inter', sans-serif;">
                <i class="far fa-calendar-alt" style="margin-right: 6px;"></i> Последнее обновление: 10 августа 2026 г.
            </p>

            <div style="font-family: 'Inter', sans-serif; color: rgba(255, 255, 255, 0.8); line-height: 1.8; font-size: 14px;">
                
                <!-- 1. Общие положения -->
                <h2 style="font-size: 16px; font-weight: 600; color: rgba(255,255,255,0.9); margin: 0 0 12px 0; display: flex; align-items: center; gap: 10px; letter-spacing: 0.5px;">
                    <span style="
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        width: 28px;
                        height: 28px;
                        background: rgba(0, 212, 255, 0.1);
                        border-radius: 50%;
                        color: #00E5FF;
                        font-size: 14px;
                        border: 1px solid rgba(0, 212, 255, 0.1);
                    ">1</span>
                    Общие положения
                </h2>
                <div class="glass-text" style="margin-bottom: 24px;">
                    <p style="margin: 0 0 8px 0; color: rgba(255, 255, 255, 0.7);">
                        Настоящая Политика конфиденциальности регулирует порядок обработки и защиты персональных данных пользователей компании 
                        <strong style="color: #00E5FF;">Vortex Technologies Inc.</strong>
                    </p>
                    <p style="margin: 0; color: rgba(255, 255, 255, 0.5); font-size: 13px;">
                        Используя наш сайт и сервисы, вы даете согласие на обработку ваших персональных данных.
                    </p>
                </div>

                <!-- 2. Какие данные собираем -->
                <h2 style="font-size: 16px; font-weight: 600; color: rgba(255,255,255,0.9); margin: 28px 0 12px 0; display: flex; align-items: center; gap: 10px; letter-spacing: 0.5px;">
                    <span style="
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        width: 28px;
                        height: 28px;
                        background: rgba(0, 212, 255, 0.1);
                        border-radius: 50%;
                        color: #00E5FF;
                        font-size: 14px;
                        border: 1px solid rgba(0, 212, 255, 0.1);
                    ">2</span>
                    Какие данные мы собираем
                </h2>
                <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px;">
                    <div class="glass-list-item" style="display: flex; align-items: center; gap: 12px;">
                        <span style="color: #00E5FF; font-size: 14px;">📝</span>
                        <div><strong style="color: rgba(255,255,255,0.9);">Регистрационные данные:</strong> <span style="color: rgba(255,255,255,0.5);">имя, компания, email, телефон</span></div>
                    </div>
                    <div class="glass-list-item" style="display: flex; align-items: center; gap: 12px;">
                        <span style="color: #00E5FF; font-size: 14px;">🖥️</span>
                        <div><strong style="color: rgba(255,255,255,0.9);">Технические данные:</strong> <span style="color: rgba(255,255,255,0.5);">IP-адрес, браузер, ОС</span></div>
                    </div>
                    <div class="glass-list-item" style="display: flex; align-items: center; gap: 12px;">
                        <span style="color: #00E5FF; font-size: 14px;">🍪</span>
                        <div><strong style="color: rgba(255,255,255,0.9);">Cookies:</strong> <span style="color: rgba(255,255,255,0.5);">данные о посещениях и предпочтениях</span></div>
                    </div>
                    <div class="glass-list-item" style="display: flex; align-items: center; gap: 12px;">
                        <span style="color: #00E5FF; font-size: 14px;">📊</span>
                        <div><strong style="color: rgba(255,255,255,0.9);">Аналитические данные:</strong> <span style="color: rgba(255,255,255,0.5);">статистика использования сервисов</span></div>
                    </div>
                </div>

                <!-- 3. Как используем данные -->
                <h2 style="font-size: 16px; font-weight: 600; color: rgba(255,255,255,0.9); margin: 0 0 12px 0; display: flex; align-items: center; gap: 10px; letter-spacing: 0.5px;">
                    <span style="
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        width: 28px;
                        height: 28px;
                        background: rgba(0, 212, 255, 0.1);
                        border-radius: 50%;
                        color: #00E5FF;
                        font-size: 14px;
                        border: 1px solid rgba(0, 212, 255, 0.1);
                    ">3</span>
                    Как мы используем ваши данные
                </h2>
                <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px;">
                    <div class="glass-list-item" style="display: flex; align-items: center; gap: 12px;">
                        <span style="color: #00E5FF;">▸</span>
                        <span style="color: rgba(255,255,255,0.7);">Предоставление доступа к CRM-системе</span>
                    </div>
                    <div class="glass-list-item" style="display: flex; align-items: center; gap: 12px;">
                        <span style="color: #00E5FF;">▸</span>
                        <span style="color: rgba(255,255,255,0.7);">Улучшение качества обслуживания</span>
                    </div>
                    <div class="glass-list-item" style="display: flex; align-items: center; gap: 12px;">
                        <span style="color: #00E5FF;">▸</span>
                        <span style="color: rgba(255,255,255,0.7);">Техническая поддержка и обратная связь</span>
                    </div>
                    <div class="glass-list-item" style="display: flex; align-items: center; gap: 12px;">
                        <span style="color: #00E5FF;">▸</span>
                        <span style="color: rgba(255,255,255,0.7);">Аналитика и улучшение продуктов</span>
                    </div>
                </div>

                <!-- 4. Защита данных -->
                <h2 style="font-size: 16px; font-weight: 600; color: rgba(255,255,255,0.9); margin: 0 0 12px 0; display: flex; align-items: center; gap: 10px; letter-spacing: 0.5px;">
                    <span style="
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        width: 28px;
                        height: 28px;
                        background: rgba(0, 212, 255, 0.1);
                        border-radius: 50%;
                        color: #00E5FF;
                        font-size: 14px;
                        border: 1px solid rgba(0, 212, 255, 0.1);
                    ">4</span>
                    Защита данных
                </h2>
                <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px;">
                    <div class="glass-list-item" style="display: flex; align-items: center; gap: 12px;">
                        <span style="color: #00E5FF;">🔒</span>
                        <span style="color: rgba(255,255,255,0.7);">Сквозное шифрование данных (AES-256)</span>
                    </div>
                    <div class="glass-list-item" style="display: flex; align-items: center; gap: 12px;">
                        <span style="color: #00E5FF;">🔐</span>
                        <span style="color: rgba(255,255,255,0.7);">Защищенные SSL/TLS соединения</span>
                    </div>
                    <div class="glass-list-item" style="display: flex; align-items: center; gap: 12px;">
                        <span style="color: #00E5FF;">🛡️</span>
                        <span style="color: rgba(255,255,255,0.7);">Двухфакторная аутентификация</span>
                    </div>
                    <div class="glass-list-item" style="display: flex; align-items: center; gap: 12px;">
                        <span style="color: #00E5FF;">📋</span>
                        <span style="color: rgba(255,255,255,0.7);">Регулярные аудиты безопасности</span>
                    </div>
                </div>

                <!-- 5. Cookies -->
                <h2 style="font-size: 16px; font-weight: 600; color: rgba(255,255,255,0.9); margin: 0 0 12px 0; display: flex; align-items: center; gap: 10px; letter-spacing: 0.5px;">
                    <span style="
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        width: 28px;
                        height: 28px;
                        background: rgba(0, 212, 255, 0.1);
                        border-radius: 50%;
                        color: #00E5FF;
                        font-size: 14px;
                        border: 1px solid rgba(0, 212, 255, 0.1);
                    ">5</span>
                    Cookies
                </h2>
                <div class="glass-text" style="margin-bottom: 24px;">
                    <p style="margin: 0 0 8px 0; color: rgba(255, 255, 255, 0.6);">
                        Мы используем файлы cookies для:
                    </p>
                    <div style="display: flex; flex-direction: column; gap: 6px; padding-left: 8px;">
                        <span style="color: rgba(255,255,255,0.5); font-size: 13px;">• Запоминания ваших настроек и предпочтений</span>
                        <span style="color: rgba(255,255,255,0.5); font-size: 13px;">• Улучшения производительности сайта</span>
                        <span style="color: rgba(255,255,255,0.5); font-size: 13px;">• Сбора аналитической информации</span>
                        <span style="color: rgba(255,255,255,0.5); font-size: 13px;">• Обеспечения безопасности</span>
                    </div>
                    <p style="margin: 12px 0 0 0; color: rgba(255, 255, 255, 0.4); font-size: 13px;">
                        Вы можете управлять cookies в настройках вашего браузера.
                    </p>
                </div>

                <!-- 6. Контакты -->
                <h2 style="font-size: 16px; font-weight: 600; color: rgba(255,255,255,0.9); margin: 0 0 12px 0; display: flex; align-items: center; gap: 10px; letter-spacing: 0.5px;">
                    <span style="
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        width: 28px;
                        height: 28px;
                        background: rgba(0, 212, 255, 0.1);
                        border-radius: 50%;
                        color: #00E5FF;
                        font-size: 14px;
                        border: 1px solid rgba(0, 212, 255, 0.1);
                    ">6</span>
                    Контактная информация
                </h2>
                <div class="glass-contact" style="margin-bottom: 28px;">
                    <p style="margin: 4px 0; display: flex; align-items: center; gap: 12px; color: rgba(255,255,255,0.7);">
                        <i class="fas fa-envelope" style="color: #00E5FF; width: 20px;"></i>
                        <strong style="color: rgba(255,255,255,0.9);">Email:</strong> 
                        <a href="mailto:vortex.blocks@gmail.com" style="color: #00E5FF; text-decoration: none; transition: color 0.3s;" onmouseover="this.style.color='#66f0ff'" onmouseout="this.style.color='#00E5FF'">vortex.blocks@gmail.com</a>
                    </p>
                    <p style="margin: 8px 0 4px 0; display: flex; align-items: center; gap: 12px; color: rgba(255,255,255,0.7);">
                        <i class="fas fa-phone" style="color: #00E5FF; width: 20px;"></i>
                        <strong style="color: rgba(255,255,255,0.9);">Телефон:</strong> 
                        <span style="color: rgba(255,255,255,0.6);">+7 (771) 894-5319</span>
                    </p>
                </div>

                <!-- Кнопка закрытия внизу -->
                <div style="text-align: center; padding-top: 8px;">
                    <button onclick="closePrivacyModal()" style="
                        background: rgba(255, 255, 255, 0.05);
                        backdrop-filter: blur(10px);
                        -webkit-backdrop-filter: blur(10px);
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        padding: 14px 48px;
                        border-radius: 14px;
                        font-family: 'Inter', sans-serif;
                        font-size: 14px;
                        font-weight: 600;
                        color: rgba(255, 255, 255, 0.7);
                        cursor: pointer;
                        transition: all 0.3s ease;
                        letter-spacing: 0.5px;
                    " onmouseover="this.style.background='rgba(255,255,255,0.08)'; this.style.color='#fff'; this.style.borderColor='rgba(255,255,255,0.15)'" 
                      onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.color='rgba(255,255,255,0.7)'; this.style.borderColor='rgba(255,255,255,0.08)'">
                        <i class="fas fa-check" style="margin-right: 10px; color: #00E5FF;"></i>
                        Понятно
                    </button>
                </div>

                <p style="text-align: center; color: rgba(255, 255, 255, 0.15); font-size: 11px; margin: 20px 0 0 0; letter-spacing: 1px;">
                    VORTEX TECHNOLOGIES INC. © 2025 — 2026
                </p>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Закрытие по клику вне модального окна
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            closePrivacyModal();
        }
    });

    // Закрытие по Escape
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closePrivacyModal();
        }
    });
}

// Закрытие модального окна
function closePrivacyModal() {
    const modal = document.getElementById('privacyModal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// Добавляем анимацию закрытия
const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(styleSheet);

// Перехватываем клик по ссылке политики конфиденциальности
document.addEventListener('DOMContentLoaded', function () {
    const privacyLinks = document.querySelectorAll('a[href="/privacy-policy"]');
    privacyLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            openPrivacyModal();
        });
    });
});

document.addEventListener("DOMContentLoaded", checkAndOpenAuth);
window.addEventListener("hashchange", checkAndOpenAuth);