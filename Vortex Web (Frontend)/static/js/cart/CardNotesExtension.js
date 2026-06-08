/**
 * CardNotesExtension.js
 * Расширение для управления заметками прямо в правой панели (без модальных окон)
 */

(function () {
    // Открытие/закрытие формы для заметки (toggle)
    window.openNotes = function () {
        console.log("openNotes вызван");
        const editor = document.getElementById('note-editor');

        // Если форма уже открыта - закрываем её
        if (editor && editor.style.display === 'block') {
            editor.style.display = 'none';
            return;
        }

        // Закрываем комментарий, если он открыт
        const commentCreator = document.getElementById('comment-creator');
        if (commentCreator) {
            commentCreator.style.display = 'none';
        }

        if (editor) {
            document.getElementById('note-editor-title-input').value = '';
            document.getElementById('note-editor-text-input').value = '';
            document.getElementById('edit-note-id').value = '';
            document.getElementById('note-editor-title').innerText = 'НОВАЯ ЗАМЕТКА';
            document.getElementById('delete-note-editor-btn').style.display = 'none';

            editor.style.display = 'block';

            setTimeout(() => {
                document.getElementById('note-editor-title-input').focus();
            }, 100);
        } else {
            console.error("editor not found!");
        }
    };

    // Открытие формы для РЕДАКТИРОВАНИЯ заметки
    window.editNote = function (id, title, body) {
        console.log("editNote вызван:", id, title, body);

        const editor = document.getElementById('note-editor');

        // Закрываем комментарий, если он открыт
        const commentCreator = document.getElementById('comment-creator');
        if (commentCreator) {
            commentCreator.style.display = 'none';
        }

        if (editor) {
            document.getElementById('note-editor-title-input').value = title;
            document.getElementById('note-editor-text-input').value = body;
            document.getElementById('edit-note-id').value = id;
            document.getElementById('note-editor-title').innerText = 'РЕДАКТИРОВАНИЕ ЗАМЕТКИ';
            document.getElementById('delete-note-editor-btn').style.display = 'block';

            editor.style.display = 'block';

            setTimeout(() => {
                document.getElementById('note-editor-title-input').focus();
            }, 100);
        } else {
            console.error("editor not found!");
        }
    };

    // Закрытие формы
    window.closeNoteEditor = function () {
        const editor = document.getElementById('note-editor');
        if (editor) {
            editor.style.display = 'none';
        }
    };

    // Сохранение заметки
    window.saveNoteFromEditor = async function () {
        const noteId = document.getElementById('edit-note-id').value;
        const clientId = new URLSearchParams(window.location.search).get('id');
        const title = document.getElementById('note-editor-title-input').value.trim();
        const text = document.getElementById('note-editor-text-input').value.trim();

        if (!title || !text) {
            alert("Заполните заголовок и описание заметки!");
            return;
        }

        const url = noteId ? `${API_BASE_URL}/api/notes/${noteId}` : `${API_BASE_URL}/api/notes/`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: parseInt(clientId),
                    description: `${title} | ${text}`,
                    type: "note"
                })
            });

            if (response.ok) {
                window.closeNoteEditor();
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

    // Удаление заметки
    window.deleteNoteFromEditor = async function () {
        const noteId = document.getElementById('edit-note-id').value;
        if (!noteId) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            });

            if (response.ok) {
                window.closeNoteEditor();
                if (typeof window.loadClientHistory === 'function') {
                    window.loadClientHistory();
                }
            } else {
                alert("Ошибка при удалении");
            }
        } catch (e) {
            console.error(e);
        }
    };

})();