/**
 * CardNotesExtension.js
 * Расширение для управления заметками прямо в правой панели (без модальных окон)
 */

(function () {
    // Вспомогательная функция для получения имени пользователя
    function getUserName() {
        return localStorage.getItem('vortex_user_name') ||
            localStorage.getItem('role') ||
            "Сотрудник";
    }

    // Вспомогательная функция для создания системной записи
    async function addSystemLog(clientId, description) {
        try {
            await fetch(`${API_BASE_URL}/api/notes/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: parseInt(clientId),
                    description: description,
                    type: "system"
                })
            });
        } catch (e) {
            console.error("Ошибка создания системного лога:", e);
        }
    }

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

    // Сохранение заметки (новая или редактирование)
    window.saveNoteFromEditor = async function () {
        const noteId = document.getElementById('edit-note-id').value;
        const clientId = new URLSearchParams(window.location.search).get('id');
        const newTitle = document.getElementById('note-editor-title-input').value.trim();
        const newText = document.getElementById('note-editor-text-input').value.trim();

        if (!newTitle || !newText) {
            alert("Заполните заголовок и описание заметки!");
            return;
        }

        const userName = getUserName();
        const isEditing = !!noteId;

        // Если редактируем, сначала загружаем старые данные
        let oldTitle = '';
        let oldText = '';

        if (isEditing) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
                });
                const data = await response.json();
                if (data.ok && data.note) {
                    const oldParts = data.note.description.split(' | ');
                    oldTitle = oldParts[0] || '';
                    oldText = oldParts.slice(1).join(' | ').replace(/\s*\|?\s*\[.*\]$/, '').trim();
                }
            } catch (e) {
                console.error("Ошибка загрузки старой заметки:", e);
            }
        }

        const url = isEditing ? `${API_BASE_URL}/api/notes/${noteId}` : `${API_BASE_URL}/api/notes/`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: parseInt(clientId),
                    description: `${newTitle} | ${newText} | [${userName}]`,
                    type: "note"
                })
            });

            if (response.ok) {
                // --- СОЗДАЕМ СИСТЕМНУЮ ЗАПИСЬ ---
                if (isEditing) {
                    // Редактирование: показываем что изменилось
                    const changes = [];
                    if (oldTitle !== newTitle) {
                        changes.push(`Заголовок: "${oldTitle}" → "${newTitle}"`);
                    }
                    if (oldText !== newText) {
                        changes.push(`Содержание: "${oldText.substring(0, 50)}${oldText.length > 50 ? '...' : ''}" → "${newText.substring(0, 50)}${newText.length > 50 ? '...' : ''}"`);
                    }

                    if (changes.length > 0) {
                        await addSystemLog(clientId, `${userName} изменил(а) заметку:\n${changes.join('\n')}`);
                    } else {
                        await addSystemLog(clientId, `${userName} отредактировал(а) заметку "${newTitle}" (без изменений)`);
                    }
                } else {
                    // Создание новой заметки
                    await addSystemLog(clientId, `${userName} создал(а) новую заметку: "${newTitle}"`);
                }

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
        const clientId = new URLSearchParams(window.location.search).get('id');

        if (!noteId) return;

        // Загружаем название заметки перед удалением
        let noteTitle = "Без названия";
        try {
            const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            });
            const data = await response.json();
            if (data.ok && data.note) {
                const parts = data.note.description.split(' | ');
                noteTitle = parts[0] || "Без названия";
            }
        } catch (e) {
            console.error("Ошибка загрузки названия заметки:", e);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
            });

            if (response.ok) {
                // --- СОЗДАЕМ СИСТЕМНУЮ ЗАПИСЬ ОБ УДАЛЕНИИ ---
                const userName = getUserName();
                await addSystemLog(clientId, `${userName} удалил(а) заметку: "${noteTitle}"`);

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