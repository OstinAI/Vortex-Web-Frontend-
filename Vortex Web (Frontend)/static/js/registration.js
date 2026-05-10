// Аналог ClientHash из Registration.xaml.cs 
async function hashSHA256(input) {
    const msgUint8 = new TextEncoder().encode(input || "");
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return btoa(hashArray.map(b => String.fromCharCode(b)).join(''));
}

async function handleRegistration() {
    console.log("Кнопка нажата"); // Если этой надписи нет в F12 -> Console, файл не подключен

    const errorBox = document.getElementById('reg-error-box');
    const btn = document.getElementById('btnRegister');

    if (errorBox) {
        errorBox.innerText = "";
        errorBox.style.display = "none";
    }

    if (btn) btn.disabled = true; // Аналог IsEnabled = false 

    try {
        // Сбор данных как в Registration.xaml.cs 
        const company = document.getElementById('tbCompany').value.trim();
        const login = document.getElementById('tbLogin').value.trim();
        const pass = document.getElementById('pbPassword').value;
        const pass2 = document.getElementById('pbPassword2').value;
        const bin = document.getElementById('tbBin').value.trim();
        const phone = document.getElementById('tbPhone').value.trim();

        // Валидация точно по вашему C# коду 
        if (company.length < 2) throw "Введите название компании.";
        if (login.length < 3) throw "Введите логин (минимум 3 символа).";
        if (pass.length < 4) throw "Введите пароль (минимум 4 символа).";
        if (pass !== pass2) throw "Пароли не совпадают.";
        if (bin.length < 3) throw "Введите БИН.";
        if (phone.length < 5) throw "Введите телефон.";

        const passwordHash = await hashSHA256(pass);
        const passwordHash2 = await hashSHA256(pass2);

        const body = {
            "company": company,
            "username": login,
            "password": passwordHash,
            "password2": passwordHash2,
            "fields": {
                "bin": bin,
                "phone": phone,
                "website": document.getElementById('tbWebsite').value.trim(),
                "address": document.getElementById('tbAddress').value.trim(),
                "slogan": document.getElementById('tbSlogan').value.trim()
            },
            "required_fields": ["bin", "phone"]
        };

        console.log("Отправка на 127.0.0.1:5000...");

        // Код для вставки в registration.js
        const response = await fetch(`${API_BASE_URL}/api/auth/register_company`, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (response.ok && result.status === "ok") {
            alert("Компания успешно зарегистрирована!");
            window.location.href = '/';
        } else {
            throw result.message || "Ошибка сервера";
        }

    } catch (err) {
        console.error("Ошибка:", err);
        if (errorBox) {
            errorBox.innerText = err;
            errorBox.style.display = "block";
        }
    } finally {
        if (btn) btn.disabled = false;
    }
}