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

// Используем тот же метод, что сработал при регистрации
async function hashSHA256(input) {
    const msgUint8 = new TextEncoder().encode(input || "");
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    // Тот самый метод конвертации, который подошел серверу при регистрации
    return btoa(hashArray.map(b => String.fromCharCode(b)).join(''));
}

async function handleLogin() {
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
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ company, username, password: passwordHash })
        });

        const result = await response.json();

        if (response.ok && result.status === "ok") {
            // 1. Сохраняем токен и роль
            localStorage.setItem('vortex_token', result.token);
            localStorage.setItem('role', result.role);
            localStorage.setItem('username', username);

            // --- НОВОЕ: ЗАПРОС ФИО С СЕРВЕРА ---
            try {
                // Идем в эндпоинт сотрудников, чтобы найти себя
                const empRes = await fetch(`${API_BASE_URL}/api/employees/list`, {
                    headers: { 'Authorization': `Bearer ${result.token}` }
                });
                const empData = await empRes.json();

                if (empData.status === "ok" && empData.employees) {
                    // Ищем в списке сотрудника с нашим логином
                    const me = empData.employees.find(e => e.username === username);
                    if (me && me.full_name) {
                        localStorage.setItem('vortex_user_name', me.full_name);
                        console.log("ФИО получено с сервера:", me.full_name);
                    } else {
                        localStorage.setItem('vortex_user_name', username);
                    }
                }
            } catch (e) {
                console.error("Не удалось подтянуть ФИО:", e);
                localStorage.setItem('vortex_user_name', username);
            }

            window.location.href = '/dashboard';
        } else {
            errorBox.innerText = result.message || "Ошибка входа";
        }
    } catch (err) {
        errorBox.innerText = "Сервер недоступен";
    }
}