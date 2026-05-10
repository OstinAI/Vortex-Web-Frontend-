/**
 * CardHistoryExtension.js
 * Расширение для автоматической записи логов добавления/удаления товаров в историю.
 */

(function () {
    // --- 1. ПЕРЕХВАТ ДОБАВЛЕНИЯ ТОВАРА ---
    // Сохраняем оригинальную функцию во внутреннюю переменную
    const originalAddProduct = window.addProductToClient;

    if (typeof originalAddProduct === 'function') {
        window.addProductToClient = async function (productId, name, price, type, qty) {
            // Сначала выполняем оригинальную логику (добавление в массив, списание со склада)
            originalAddProduct(productId, name, price, type, qty);

            // Добавляем нашу новую логику: запись в системную историю
            const clientId = new URLSearchParams(window.location.search).get('id');
            const userName = localStorage.getItem('vortex_user_name') || "Сотрудник";
            const typeLabel = type === 'product' ? 'Товар' : 'Услуга';

            const logMessage = `[ОПЛАТА] Добавлен ${typeLabel}: "${name}" (${qty} шт.) на сумму ${price * qty} ₸. Менеджер: ${userName}`;

            try {
                await fetch(`${API_BASE_URL}/api/notes/`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        client_id: parseInt(clientId),
                        description: logMessage,
                        type: "system"
                    })
                });

                // Обновляем ленту, чтобы сразу увидеть запись
                if (typeof loadClientHistory === 'function') loadClientHistory();
            } catch (e) {
                console.error("Ошибка записи лога добавления:", e);
            }
        };
    }

    // --- 2. ПЕРЕХВАТ УДАЛЕНИЯ ТОВАРА ---
    const originalDeletePurchase = window.deletePurchaseItem;

    if (typeof originalDeletePurchase === 'function') {
        window.deletePurchaseItem = async function (index) {
            // Нам нужно достать данные товара ДО того, как оригинальная функция удалит его из массива
            if (window.selectedItems && window.selectedItems[index]) {
                const item = window.selectedItems[index];
                const clientId = new URLSearchParams(window.location.search).get('id');
                const userName = localStorage.getItem('vortex_user_name') || "Сотрудник";

                // Вызываем оригинал (он спросит confirm и удалит из массива)
                // Важно: если пользователь нажмет "Отмена" в confirm, мы не должны слать лог
                const oldSelectedLength = window.selectedItems.length;

                // Ждем выполнения оригинала
                await originalDeletePurchase(index);

                // Если длина массива уменьшилась, значит удаление подтверждено
                if (window.selectedItems.length < oldSelectedLength) {
                    const logMessage = `[СИСТЕМА] Удалена запись: "${item.name}" на сумму ${item.price} ₸. Исполнитель: ${userName}`;

                    try {
                        await fetch(`${API_BASE_URL}/api/notes/`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                client_id: parseInt(clientId),
                                description: logMessage,
                                type: "system"
                            })
                        });
                        if (typeof loadClientHistory === 'function') loadClientHistory();
                    } catch (e) {
                        console.error("Ошибка записи лога удаления:", e);
                    }
                }
            } else {
                // Если по каким-то причинам массива нет, просто запускаем оригинал
                originalDeletePurchase(index);
            }
        };
    }
})();