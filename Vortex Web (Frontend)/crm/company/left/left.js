/**
 * Левая часть страницы компании
 * Заголовок "Статистика" с неоновой палочкой
 */

function createLeftContent() {
    console.log('✅ Left module loaded');

    // ============================================
    // ПОЛУЧАЕМ КОНТЕЙНЕР ЛЕВОЙ ЧАСТИ
    // ============================================
    const leftContent = document.getElementById('leftContent');

    if (leftContent) {
        console.log('✅ #leftContent found, creating content...');

        // Проверяем, не создан ли уже контент
        if (leftContent.querySelector('.left-content')) {
            console.log('ℹ️ Left content already exists');
            return;
        }

        // Очищаем контейнер
        leftContent.innerHTML = '';

        // Создаем структуру левой части
        const leftWrapper = document.createElement('div');
        leftWrapper.className = 'left-content';

        // ----- ЗАГОЛОВОК -----
        const header = document.createElement('div');
        header.className = 'statistics-header';

        // Неоновая палочка
        const neonBar = document.createElement('div');
        neonBar.className = 'neon-bar';
        header.appendChild(neonBar);

        // Заголовок
        const title = document.createElement('h1');
        title.textContent = 'Статистика';
        header.appendChild(title);

        leftWrapper.appendChild(header);

        // ----- ТЕЛО (пока пустое, для будущего контента) -----
        const body = document.createElement('div');
        body.className = 'statistics-body';
        leftWrapper.appendChild(body);

        leftContent.appendChild(leftWrapper);

        console.log('✅ Left content created: "Статистика" with neon bar');
    } else {
        console.warn('⚠️ #leftContent not found, retrying in 500ms...');
        setTimeout(createLeftContent, 500);
    }
}

// Ждем полной загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createLeftContent);
} else {
    // Если DOM уже загружен
    setTimeout(createLeftContent, 100);
}