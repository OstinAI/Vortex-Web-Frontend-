/**
 * CardCommentsExtension.js
 * Расширение для создания комментариев прямо в правой панели
 */

(function () {
    // Открытие/закрытие формы для комментария (toggle)
    window.openComments = function () {
        console.log("openComments вызван");
        const creator = document.getElementById('comment-creator');

        // Если форма уже открыта - закрываем её
        if (creator && creator.style.display === 'block') {
            creator.style.display = 'none';
            return;
        }

        // Закрываем заметку, если она открыта
        const noteEditor = document.getElementById('note-editor');
        if (noteEditor) {
            noteEditor.style.display = 'none';
        }

        if (creator) {
            document.getElementById('comment-creator-text').value = '';
            creator.style.display = 'block';

            setTimeout(() => {
                creator.scrollIntoView({ behavior: 'smooth', block: 'start' });
                document.getElementById('comment-creator-text').focus();
            }, 100);
        } else {
            console.error("comment-creator not found!");
        }
    };

    // Закрытие формы
    window.closeCommentCreator = function () {
        const creator = document.getElementById('comment-creator');
        if (creator) {
            creator.style.display = 'none';
        }
    };

    // Сохранение комментария
    window.saveCommentFromCreator = async function () {
        const clientId = new URLSearchParams(window.location.search).get('id');
        const text = document.getElementById('comment-creator-text').value.trim();

        if (!text) {
            alert("Введите текст комментария!");
            return;
        }

        // --- ПОЛУЧАЕМ ИМЯ СОТРУДНИКА ---
        const userName = localStorage.getItem('vortex_user_name') ||
            localStorage.getItem('role') ||
            "Сотрудник";

        try {
            const response = await fetch(`${API_BASE_URL}/api/notes/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: parseInt(clientId),
                    // Сохраняем в формате: ТЕКСТ | [ИМЯ]
                    description: `${text} | [${userName}]`,
                    type: "comment"
                })
            });

            if (response.ok) {
                window.closeCommentCreator();
                if (typeof window.loadClientHistory === 'function') {
                    window.loadClientHistory();
                }
            } else {
                const err = await response.json();
                alert("Ошибка: " + (err.message || "Не удалось сохранить"));
            }
        } catch (e) {
            console.error("Ошибка:", e);
            alert("Ошибка сети");
        }
    };

})();