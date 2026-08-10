// auth.js

function toggleAuth() {
    const form = document.getElementById('auth-form');
    const landing = document.getElementById('landing-text');
    if (form.style.display === 'block') {
        form.style.display = 'none';
        landing.style.opacity = '1';
    } else {
        form.style.display = 'block';
        landing.style.opacity = '0.3';
    }
}

async function hashSHA256(input) {
    const msgUint8 = new TextEncoder().encode(input || "");
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return btoa(hashArray.map(b => String.fromCharCode(b)).join(''));
}

async function handleLogin() {
    console.log("🚀🚀🚀 handleLogin() ВЫЗВАНА! 🚀🚀🚀");
    console.log("API_BASE_URL =", API_BASE_URL);

    const company = document.getElementById('company').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorBox = document.getElementById('error-box');

    if (!company || !username || !password) {
        errorBox.innerText = "Заполните все поля!";
        return;
    }

    try {
        const passwordHash = await hashSHA256(password);
        const url = `${API_BASE_URL}/api/auth/login`;

        const response = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ company, username, password: passwordHash })
        });

        const result = await response.json();

        if (response.ok && result.status === "ok") {
            // Сохраняем токен и роль
            localStorage.setItem('vortex_token', result.token);
            localStorage.setItem('role', result.role);
            localStorage.setItem('company_name', company);
            localStorage.setItem('username', username);

            if (result.companyId) {
                localStorage.setItem('company_id', String(result.companyId));
                localStorage.setItem('vortex_company_id', String(result.companyId));
            }

            // ✅ ПОЛУЧАЕМ ФИО С БЕКЕНДА
            try {
                console.log('[Auth] Запрашиваю ФИО...');
                const fioResponse = await fetch(`${API_BASE_URL}/api/employees/list`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${result.token}`
                    }
                });

                if (fioResponse.ok) {
                    const fioData = await fioResponse.json();
                    console.log('[Auth] Данные сотрудников:', fioData);

                    const employees = fioData.employees || fioData.data || [];
                    // Ищем текущего пользователя по username
                    const currentUser = employees.find(u => u.username === username);

                    if (currentUser && currentUser.full_name && currentUser.full_name !== '') {
                        console.log('[Auth] Найдено ФИО:', currentUser.full_name);
                        localStorage.setItem('full_name', currentUser.full_name);
                        localStorage.setItem('vortex_user_name', currentUser.full_name);
                    } else {
                        console.log('[Auth] ФИО не найдено, использую username');
                        localStorage.setItem('full_name', username);
                        localStorage.setItem('vortex_user_name', username);
                    }
                } else {
                    console.warn('[Auth] Ошибка получения ФИО:', fioResponse.status);
                    localStorage.setItem('full_name', username);
                    localStorage.setItem('vortex_user_name', username);
                }
            } catch (err) {
                console.warn('[Auth] Ошибка запроса ФИО:', err);
                localStorage.setItem('full_name', username);
                localStorage.setItem('vortex_user_name', username);
            }

            errorBox.innerText = "";
            errorBox.style.color = "#28a745";
            errorBox.innerText = "✅ Вход выполнен! Перенаправление...";

            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
        } else {
            errorBox.innerText = result.message || "Ошибка входа";
        }
    } catch (err) {
        console.error("Ошибка авторизации:", err);
        errorBox.innerText = "Сервер недоступен";
    }
}

document.addEventListener('mousedown', (event) => {
    const form = document.getElementById('auth-form');
    const landing = document.getElementById('landing-text');
    const authCard = document.querySelector('.auth-card');
    const loginBtn = document.getElementById('login-nav');

    if (!form || form.style.display === 'none') return;

    if (!authCard.contains(event.target) && event.target !== loginBtn) {
        form.style.display = 'none';
        if (landing) landing.style.opacity = '1';
    }
});