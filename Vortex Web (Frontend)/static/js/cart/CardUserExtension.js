(function () {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(renderCurrentUser, 500);
    });

    function renderCurrentUser() {
        const initialsEl = document.getElementById('user-initial-circle');
        const nameEl = document.getElementById('user-display-name');
        if (!initialsEl || !nameEl) return;

        // Берем ФИО, которое auth.js сохранил после запроса к серверу
        let rawName = localStorage.getItem('vortex_user_name') || localStorage.getItem('username') || "Сотрудник";

        const parts = rawName.trim().split(/\s+/);

        let displayInit = "";
        let displayFullName = "";

        if (parts.length >= 2) {
            // Если пришло ФИО (минимум 2 слова)
            // Допустим: Иванов(0) Иван(1) Иванович(2)
            const f = parts[0];
            const i = parts[1];
            const o = parts[2] || "";

            displayInit = i.charAt(0).toUpperCase(); // Буква Имени в кружок

            let initials = `${f.charAt(0)}.`; // Ф.
            if (o) initials += `${o.charAt(0)}.`; // О.

            displayFullName = `${i} ${initials}`; // ИВАН И.И.
        } else {
            // Если все-таки только логин
            displayInit = rawName.charAt(0).toUpperCase();
            displayFullName = rawName;
        }

        initialsEl.innerText = displayInit;
        nameEl.innerText = displayFullName.toUpperCase();
    }
})();