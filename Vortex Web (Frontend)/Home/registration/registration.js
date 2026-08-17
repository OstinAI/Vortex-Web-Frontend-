// ============================================
// УПРАВЛЕНИЕ МОДАЛЬНЫМ ОКНОМ
// ============================================

function openRegistrationModal() {
    console.log('🔓 openRegistrationModal() вызвана');

    const modal = document.getElementById('registration-modal');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Очищаем ошибки
        const errorBox = document.getElementById('reg-error-box');
        if (errorBox) {
            errorBox.style.display = 'none';
            errorBox.innerText = '';
        }

        // Очищаем поля
        const company = document.getElementById('tbCompany');
        const login = document.getElementById('tbLogin');
        const pass = document.getElementById('pbPassword');
        const pass2 = document.getElementById('pbPassword2');

        if (company) company.value = '';
        if (login) login.value = '';
        if (pass) pass.value = '';
        if (pass2) pass2.value = '';

        // Фокус на первое поле
        setTimeout(() => {
            if (company) company.focus();
        }, 300);

        console.log('✅ Модальное окно открыто');
    } else {
        console.error('❌ Модальное окно не найдено!');
    }
}

function closeRegistrationModal() {
    console.log('🔒 closeRegistrationModal() вызвана');

    const modal = document.getElementById('registration-modal');
    if (modal) {
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.style.animation = 'modalSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
        }
        setTimeout(() => {
            modal.classList.remove('active');
            modal.style.display = 'none';
            document.body.style.overflow = '';
            // Сбрасываем ошибки
            const errorBox = document.getElementById('reg-error-box');
            if (errorBox) {
                errorBox.style.display = 'none';
                errorBox.innerText = '';
            }
        }, 300);
    }
}

// Закрытие по клику вне модального окна
document.addEventListener('click', function (e) {
    const modal = document.getElementById('registration-modal');
    if (modal && modal.classList.contains('active')) {
        if (e.target === modal) {
            closeRegistrationModal();
        }
    }
});

// Закрытие по Escape
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('registration-modal');
        if (modal && modal.classList.contains('active')) {
            closeRegistrationModal();
        }
    }
});

// ============================================
// ХЕШИРОВАНИЕ SHA-256 (для отправки на сервер)
// ============================================

async function hashSHA256(input) {
    const msgUint8 = new TextEncoder().encode(input || "");
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return btoa(hashArray.map(b => String.fromCharCode(b)).join(''));
}

// ============================================
// ОТПРАВКА ДАННЫХ НА СЕРВЕР
// ============================================

async function handleRegistration() {
    console.log("🚀 Кнопка регистрации нажата!");

    const errorBox = document.getElementById('reg-error-box');
    const btn = document.getElementById('btnRegister');

    if (errorBox) {
        errorBox.innerText = "";
        errorBox.style.display = "none";
    }

    if (btn) btn.disabled = true;

    try {
        // Сбор данных
        const company = document.getElementById('tbCompany').value.trim();
        const username = document.getElementById('tbLogin').value.trim();
        const pass = document.getElementById('pbPassword').value;
        const pass2 = document.getElementById('pbPassword2').value;

        console.log("📝 Данные:", { company, username, pass: '***', pass2: '***' });

        // Валидация
        if (company.length < 2) throw new Error("Введите название компании (минимум 2 символа).");
        if (username.length < 3) throw new Error("Введите логин (минимум 3 символа).");
        if (pass.length < 4) throw new Error("Введите пароль (минимум 4 символа).");
        if (pass !== pass2) throw new Error("Пароли не совпадают.");

        console.log("🔐 Хешируем пароль...");
        const passwordHash = await hashSHA256(pass);
        const passwordHash2 = await hashSHA256(pass2);

        // Формируем тело запроса
        const body = {
            "company": company,
            "username": username,
            "password": passwordHash,
            "password2": passwordHash2,
            "fields": {},
            "required_fields": []
        };

        console.log("📤 Отправка на сервер:", body);

        // ✅ ТАК ЖЕ КАК В auth.js
        const url = `${API_BASE_URL}/api/auth/register_company`;
        console.log("🌐 URL:", url);

        const response = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        });

        console.log("📥 Ответ получен, статус:", response.status);

        // Пробуем распарсить ответ
        let result;
        try {
            result = await response.json();
        } catch (e) {
            console.error("❌ Не удалось распарсить JSON:", e);
            throw new Error("Сервер вернул некорректный ответ");
        }

        console.log("📦 Результат:", result);

        if (response.ok && result.status === "ok") {
            showCustomNotification(`Компания "${company}" успешно зарегистрирована!`);

            setTimeout(() => {
                closeRegistrationModal();
                // Обновляем страницу для входа
                window.location.reload();
            }, 2000);
        } else {
            // Показываем сообщение от сервера
            const errorMsg = result.message || result.error || "Ошибка регистрации";
            throw new Error(errorMsg);
        }

    } catch (err) {
        console.error("❌ Ошибка:", err);
        if (errorBox) {
            errorBox.innerText = err.message || "Произошла ошибка при регистрации";
            errorBox.style.display = "block";
        }
    } finally {
        if (btn) btn.disabled = false;
        console.log("✅ Кнопка разблокирована");
    }
}

// ============================================
// КАСТОМНОЕ УВЕДОМЛЕНИЕ (GLASSMORPHISM)
// ============================================

function showCustomNotification(message) {
    // Удаляем старое уведомление если есть
    const oldNotif = document.getElementById('customNotification');
    if (oldNotif) oldNotif.remove();

    const notification = document.createElement('div');
    notification.id = 'customNotification';
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 99999;
        background: rgba(255, 255, 255, 0.06);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        padding: 36px 56px;
        color: rgba(255, 255, 255, 0.95);
        font-family: 'Inter', sans-serif;
        font-size: 18px;
        font-weight: 500;
        text-align: center;
        box-shadow: 
            0 24px 80px rgba(0, 0, 0, 0.6),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
        animation: fadeInNotif 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        min-width: 320px;
        max-width: 500px;
        letter-spacing: 0.3px;
        line-height: 1.6;
    `;

    notification.innerHTML = `
        <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 4px;
        ">
            <div style="
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: linear-gradient(135deg, #00d4ff, #7b2ffc);
                box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
                animation: pulseDot 1.5s ease-in-out infinite;
            "></div>
            <span style="
                background: linear-gradient(135deg, #00d4ff, #7b2ffc);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                font-weight: 600;
                font-size: 14px;
                letter-spacing: 2px;
                text-transform: uppercase;
            ">Успешно</span>
        </div>
        <div style="
            margin-top: 12px;
            font-size: 16px;
            font-weight: 400;
            color: rgba(255, 255, 255, 0.85);
            -webkit-text-fill-color: rgba(255, 255, 255, 0.85);
        ">${message}</div>
        <div style="
            margin-top: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        ">
            <div style="
                width: 4px;
                height: 4px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.15);
                animation: loadingDot 1.2s ease-in-out infinite;
            "></div>
            <div style="
                width: 4px;
                height: 4px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.15);
                animation: loadingDot 1.2s ease-in-out 0.2s infinite;
            "></div>
            <div style="
                width: 4px;
                height: 4px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.15);
                animation: loadingDot 1.2s ease-in-out 0.4s infinite;
            "></div>
        </div>
    `;

    // Добавляем стили анимации
    if (!document.getElementById('notificationStyles')) {
        const style = document.createElement('style');
        style.id = 'notificationStyles';
        style.textContent = `
            @keyframes fadeInNotif {
                from { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.92) translateY(10px); 
                }
                to { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1) translateY(0); 
                }
            }
            @keyframes fadeOutNotif {
                from { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1) translateY(0); 
                }
                to { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.92) translateY(10px); 
                }
            }
            @keyframes pulseDot {
                0%, 100% { 
                    transform: scale(1); 
                    opacity: 1; 
                }
                50% { 
                    transform: scale(1.6); 
                    opacity: 0.6; 
                }
            }
            @keyframes loadingDot {
                0%, 80%, 100% { 
                    transform: scale(0.6); 
                    opacity: 0.3; 
                }
                40% { 
                    transform: scale(1.2); 
                    opacity: 1; 
                }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Автоматическое закрытие через 2 секунды
    setTimeout(() => {
        notification.style.animation = 'fadeOutNotif 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
        setTimeout(() => {
            notification.remove();
        }, 400);
    }, 2000);
}

// ============================================
// ТЕСТОВАЯ ФУНКЦИЯ
// ============================================

function testModal() {
    console.log('🧪 Тестирование модального окна...');
    openRegistrationModal();
}

console.log('✅ registration.js загружен');
console.log('📌 Используйте testModal() для тестирования');