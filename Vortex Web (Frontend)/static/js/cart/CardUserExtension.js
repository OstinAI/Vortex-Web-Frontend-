// static/js/cart/CardUserExtension.js
(function () {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(renderCurrentUser, 500);
    });

    function renderCurrentUser() {
        const initialsEl = document.getElementById('user-initial-circle');
        const nameEl = document.getElementById('user-display-name');
        if (!initialsEl || !nameEl) return;

        // ⭐ ИСПРАВЛЕНО: Приоритет - сначала username, потом vortex_user_name
        let rawName = localStorage.getItem('username') ||
            localStorage.getItem('vortex_user_name') ||
            localStorage.getItem('full_name') ||
            "Сотрудник";

        // Если имя "Никита" - пробуем взять из username (это запасной вариант)
        if (rawName === 'Никита') {
            const username = localStorage.getItem('username');
            if (username && username !== 'Никита') {
                rawName = username;
                // Сохраняем правильное имя обратно в localStorage
                localStorage.setItem('vortex_user_name', rawName);
                localStorage.setItem('full_name', rawName);
            }
        }

        // Если имя все еще "Никита" - пробуем получить из токена
        if (rawName === 'Никита') {
            try {
                const token = localStorage.getItem('vortex_token');
                if (token) {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    console.log('🔍 Данные из токена:', payload);
                    if (payload.username && payload.username !== 'Никита') {
                        rawName = payload.username;
                    } else if (payload.full_name && payload.full_name !== 'Никита') {
                        rawName = payload.full_name;
                    }
                }
            } catch (e) {
                console.warn('⚠️ Не удалось распарсить токен:', e);
            }
        }

        // Если имя "Никита" - заменяем на "Сотрудник"
        if (rawName === 'Никита') {
            rawName = 'Сотрудник';
        }

        console.log('🔍 Имя пользователя для отображения:', rawName);

        const parts = rawName.trim().split(/\s+/);
        let displayInit = "";
        let displayFullName = "";

        if (parts.length >= 3) {
            // Иванов Иван Иванович → ИВАН И.И.
            const surname = parts[0];
            const firstName = parts[1];
            const patronymic = parts[2] || "";
            displayInit = firstName.charAt(0).toUpperCase();
            let initials = `${surname.charAt(0)}.`;
            if (patronymic) initials += `${patronymic.charAt(0)}.`;
            displayFullName = `${firstName} ${initials}`;
        } else if (parts.length === 2) {
            // Иванов Иван → ИВАН И.
            const firstName = parts[1];
            const surname = parts[0];
            displayInit = firstName.charAt(0).toUpperCase();
            displayFullName = `${firstName} ${surname.charAt(0)}.`;
        } else if (parts.length === 1) {
            // Только одно слово (логин)
            const name = parts[0];
            displayInit = name.charAt(0).toUpperCase();
            displayFullName = name;
        } else {
            displayInit = "?";
            displayFullName = "Сотрудник";
        }

        initialsEl.innerText = displayInit;
        nameEl.innerText = displayFullName.toUpperCase();

        console.log('👤 Отображаем:', displayFullName.toUpperCase(), '| Инициал:', displayInit);
    }

    // Функция для принудительного обновления имени
    window.updateUserName = function () {
        renderCurrentUser();
        console.log('✅ Имя обновлено');
    };

    // Слушаем изменения localStorage
    window.addEventListener('storage', function (e) {
        if (e.key === 'vortex_user_name' || e.key === 'username' || e.key === 'full_name') {
            console.log('🔄 localStorage изменился, обновляем имя');
            setTimeout(renderCurrentUser, 200);
        }
    });

})();