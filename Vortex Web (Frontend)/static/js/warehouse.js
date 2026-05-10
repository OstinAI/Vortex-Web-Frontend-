const resizer = document.getElementById('resizer');
const leftSide = document.getElementById('left-side');
let isResizing = false;

// 1. ПРИ ЗАГРУЗКЕ: Проверяем, есть ли сохраненная ширина в памяти браузера
// Кэш для хранения списка товаров (нужен для корректного открытия редактирования)
let currentProductsCache = [];

document.addEventListener('DOMContentLoaded', () => {
    loadWarehouses(); // Загрузка списка складов при старте

    // Восстановление ширины панелей из памяти
    const savedWidth = localStorage.getItem('vortex-warehouse-split');
    if (savedWidth) {
        const leftSide = document.getElementById('left-side');
        if (leftSide) leftSide.style.width = savedWidth + '%';
    }
});

// Начало изменения размера
resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    resizer.classList.add('active'); // Можно добавить для доп. эффектов
});

// Процесс движения
document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    // Рассчитываем положение в процентах
    let percentage = (e.clientX / window.innerWidth) * 100;

    // Лимиты (от 5% до 95%)
    if (percentage > 5 && percentage < 95) {
        const widthString = percentage.toFixed(2); // Округляем до 2 знаков
        leftSide.style.width = widthString + '%';

        // 2. СОХРАНЕНИЕ: Записываем текущее значение в память
        localStorage.setItem('vortex-warehouse-split', widthString);
    }
});

// Остановка процесса
document.addEventListener('mouseup', () => {
    if (isResizing) {
        isResizing = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    }
});

/* ___________________________________________________________________________________________ */

function openWarehouseModal() {
    document.getElementById('modal-create-warehouse').style.display = 'block';
}

function closeWarehouseModal() {
    document.getElementById('modal-create-warehouse').style.display = 'none';
}

// Закрытие при клике вне окна
window.onclick = function (event) {
    const modal = document.getElementById('modal-create-warehouse');
    if (event.target == modal) {
        closeWarehouseModal();
    }
}

async function saveWarehouse() {
    const name = document.getElementById('warehouse-name').value;
    const address = document.getElementById('warehouse-address').value;

    if (!name) return alert("Введите название!");

    // Здесь будет твой запрос к API (inventory_bp.py)
    console.log("Создаем склад:", { name, address });

    closeWarehouseModal();
}

async function saveWarehouse() {
    console.log("Кнопка 'Создать' нажата");

    const nameInput = document.getElementById('warehouse-name');
    const addressInput = document.getElementById('warehouse-address');

    if (!nameInput || !addressInput) {
        console.error("Поля ввода не найдены в HTML!");
        return;
    }

    const name = nameInput.value.trim();
    const address = addressInput.value.trim();

    if (!name) {
        // Оставляем только эту проверку, чтобы не отправлять пустой запрос
        alert("Введите название склада!");
        return;
    }

    const token = localStorage.getItem('vortex_token');

    try {
        const url = `${API_BASE_URL}/api/inventory/warehouses`;

        const response = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: name,
                address: address
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log("Успех: Склад создан", result);

            // Закрываем модальное окно сразу (без alert)
            closeWarehouseModal();

            // Очищаем поля ввода
            nameInput.value = '';
            addressInput.value = '';

            // Если на странице есть список складов, тут можно вызвать его обновление
            // loadWarehouses(); 
        } else {
            const errorData = await response.json();
            console.error("Ошибка от сервера:", errorData);
            alert("Ошибка: " + (errorData.error || "Не удалось сохранить"));
        }

    } catch (err) {
        console.error("Критический сбой запроса:", err);
        alert("Сбой сети. Проверьте консоль (F12)");
    }
}






// 1. Загрузка данных при открытии страницы
document.addEventListener('DOMContentLoaded', () => {
    loadWarehouses();

    // Восстановление ширины панелей (твой старый код)
    const savedWidth = localStorage.getItem('vortex-warehouse-split');
    if (savedWidth) {
        document.getElementById('left-side').style.width = savedWidth + '%';
    }
});

// 2. Функция получения складов с сервера
// Загрузка списка складов (сетка)
async function openWarehouse(warehouseId, warehouseName) {
    const container = document.getElementById('right-side');
    const token = localStorage.getItem('vortex_token');

    // Переключаем кнопку в шапке на "Добавить товар"
    const actionBtn = document.getElementById('main-action-btn');
    if (actionBtn) {
        actionBtn.innerText = "ДОБАВИТЬ ТОВАР";
        actionBtn.onclick = () => openAddItemModal(warehouseId);
    }

    try {
        // 1. Получаем все товары компании и сохраняем в кэш для редактирования
        const prodRes = await fetch(`${API_BASE_URL}/api/inventory/products`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const prodData = await prodRes.json();
        const allProducts = prodData.products || [];

        // ВАЖНО: сохраняем в глобальную переменную для функции редактирования
        currentProductsCache = allProducts;

        // 2. Получаем остатки именно для этого склада
        const stockRes = await fetch(`${API_BASE_URL}/api/inventory/stock?warehouse_id=${warehouseId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const stockData = await stockRes.json();
        const stockItems = stockData.items || [];

        // Карта остатков {product_id: qty}
        const stockMap = {};
        stockItems.forEach(item => {
            stockMap[item.product_id] = item.stock;
        });

        // 3. Формируем строки таблицы
        let rowsHtml = '';
        const productsInStock = allProducts.filter(p => stockMap[p.id] !== undefined);

        if (productsInStock.length === 0) {
            rowsHtml = `
                <tr>
                    <td colspan="5" style="text-align:center; opacity:0.1; padding:100px; letter-spacing:2px;">
                        СКЛАД ПУСТ
                    </td>
                </tr>`;
        } else {
            productsInStock.forEach(p => {
                // ОБНОВЛЕНО: теперь вызывается prepareEdit, передавая ID для поиска в кэше
                rowsHtml += `
                <tr class="vortex-table-row" onclick="prepareEdit(${p.id}, ${warehouseId})" style="cursor: pointer;">
                    <td class="col-artikul">
                        <span class="artikul-badge">${p.product_no}</span>
                    </td>
                    <td class="col-name">
                        <div class="product-info">
                            <span class="product-title">${p.title.toUpperCase()}</span>
                        </div>
                    </td>
                    <td class="col-stock">
                        <span class="stock-value">${stockMap[p.id]}</span>
                    </td>
                    <td class="col-unit">
                        <span class="unit-tag">ШТ.</span>
                    </td>
                    <td class="col-price">
                        <span class="price-value">${new Intl.NumberFormat('ru-RU').format(p.base_price || 0)}</span>
                        <span class="currency">₸</span>
                    </td>
                </tr>`;
            });
        }

        // 4. Отрисовка интерфейса (с учетом новых отступов 10px)
        container.innerHTML = `
        <div class="warehouse-content-inner">
            <div class="warehouse-content-header">
                <div class="header-left-part">
                    <button class="btn-vortex-back" onclick="loadWarehouses()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>
                    <h2 class="warehouse-title">${warehouseName.toUpperCase()}</h2>
                </div>
            </div>
            
            <div class="warehouse-table-container">
                <table class="vortex-table vortex-table-fixed">
                    <thead>
                        <tr>
                            <th style="width: 15%;">АРТИКУЛ</th>
                            <th style="width: 40%;">НАИМЕНОВАНИЕ</th>
                            <th style="width: 15%;">ОСТАТОК</th>
                            <th style="width: 15%;">ЕД. ИЗМ.</th>
                            <th style="width: 15%;">ЦЕНА</th>
                        </tr>
                    </thead>
                    <tbody id="inventory-items">
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        </div>`;

    } catch (err) {
        console.error("Ошибка загрузки данных склада:", err);
    }
}

async function loadWarehouses() {
    const container = document.getElementById('right-side');
    if (!container) return;

    // --- ВОЗВРАТ КНОПКИ ПРИ ВЫХОДЕ ---
    const actionBtn = document.getElementById('main-action-btn');
    if (actionBtn) {
        actionBtn.innerText = "СОЗДАТЬ СКЛАД";
        actionBtn.onclick = () => openWarehouseModal();
    }
    // ----------------------------------

    try {
        const response = await fetch(`${API_BASE_URL}/api/inventory/warehouses`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vortex_token')}` }
        });

        if (response.ok) {
            const data = await response.json();
            const list = data.warehouses || [];

            container.innerHTML = '';

            list.forEach(wh => {
                const card = document.createElement('div');
                card.className = 'warehouse-card';
                card.innerHTML = `<h3>${wh.name.toUpperCase()}</h3>`;

                // КЛИК: Исчезают карточки, открывается склад
                card.onclick = () => openWarehouse(wh.id, wh.name);

                container.appendChild(card);
            });
        }
    } catch (err) { console.error("Ошибка загрузки:", err); }
}

// Заглушка для функции добавления товара (чтобы не было ошибки)
function openAddItemModal(warehouseId) {
    console.log("Открываем модалку добавления товара для склада ID:", warehouseId);
    // Здесь будет вызов твоей модалки добавления товара
}

// 3. Обновленная функция сохранения (добавь вызов loadWarehouses в конце)
async function saveWarehouse() {
    const nameInput = document.getElementById('warehouse-name');
    const addressInput = document.getElementById('warehouse-address');
    const name = nameInput.value.trim();
    const address = addressInput.value.trim();

    if (!name) return alert("Введите название!");

    try {
        const response = await fetch(`${API_BASE_URL}/api/inventory/warehouses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('vortex_token')}`
            },
            body: JSON.stringify({ name, address })
        });

        if (response.ok) {
            closeWarehouseModal();
            nameInput.value = '';
            addressInput.value = '';

            // ВАЖНО: Обновляем список карточек сразу после создания
            loadWarehouses();
        }
    } catch (err) { console.error(err); }
}







// Открытие модалки (вызывается кнопкой "ДОБАВИТЬ ТОВАР")
function openAddItemModal(warehouseId) {
    // Сохраняем ID склада в атрибут модалки, если нужно будет сразу сделать приход
    document.getElementById('modal-product-create').dataset.warehouseId = warehouseId;
    document.getElementById('modal-product-create').style.display = 'block';
}

function closeProductModal() {
    document.getElementById('modal-product-create').style.display = 'none';
    // Очистка полей
    document.getElementById('product-title').value = '';
    document.getElementById('product-price').value = '';
    document.getElementById('product-description').value = '';
}

// Изменение заголовка при смене типа
function toggleKindLabels() {
    const kind = document.getElementById('product-kind').value;
    const title = document.getElementById('product-modal-title');
    title.innerText = kind === 'product' ? 'НОВЫЙ ТОВАР' : 'НОВАЯ УСЛУГА';
}

function toggleKindFields() {
    const kind = document.getElementById('product-kind').value;
    const qtyGroup = document.getElementById('group-quantity');
    // Услугам количество не нужно
    qtyGroup.style.display = (kind === 'service') ? 'none' : 'block';
}

function handleFileSelect(input) {
    const container = document.getElementById('file-preview-container');
    container.innerHTML = '';
    Array.from(input.files).forEach(file => {
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.className = 'file-preview-item';
            container.appendChild(img);
        } else {
            const icon = document.createElement('div');
            icon.className = 'file-preview-item';
            icon.innerText = 'VIDEO';
            icon.style.background = '#222';
            container.appendChild(icon);
        }
    });
}


// Исправленная функция закрытия модалки (без ошибок "null")
function closeProductModal() {
    const modal = document.getElementById('modal-product-create');
    if (modal) modal.style.display = 'none';

    const fields = ['product-title', 'product-price', 'product-qty', 'product-description', 'product-files'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = ''; // Очищаем только если элемент существует
    });

    const preview = document.getElementById('file-preview-container');
    if (preview) preview.innerHTML = '';
}





// Универсальное сохранение
async function saveProduct() {
    console.log("Кнопка сохранения нажата...");

    const modal = document.getElementById('modal-product-create');
    const mode = modal.dataset.mode || 'create';
    const productId = modal.dataset.productId;
    const warehouseId = modal.dataset.warehouseId;
    const token = localStorage.getItem('vortex_token');

    const titleEl = document.getElementById('product-title');
    const kindEl = document.getElementById('product-kind');
    const priceEl = document.getElementById('product-price');
    const qtyEl = document.getElementById('product-qty');
    const descEl = document.getElementById('product-description');

    if (!titleEl || !kindEl || !priceEl) {
        console.error("Критическая ошибка: Не найдены поля ввода в HTML!");
        return;
    }

    const title = titleEl.value.trim();
    const kind = kindEl.value;
    const price = parseFloat(priceEl.value) || 0;
    const deltaQty = qtyEl ? parseFloat(qtyEl.value) : 0; // Для редактирования это разница (+ или -)
    const description = descEl ? descEl.value : "";

    if (!title) {
        console.warn("Название товара пустое");
        return;
    }

    try {
        if (mode === 'edit') {
            console.log("Шаг 1: Обновление карточки товара...");
            const res = await fetch(`${API_BASE_URL}/api/inventory/products/${productId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ title, base_price: price, description })
            });
            const data = await res.json();
            if (!data.ok) throw new Error("Ошибка сервера при обновлении: " + data.message);

            // ШАГ 2 ДЛЯ РЕДАКТИРОВАНИЯ: Корректировка остатка (если не 0)
            if (deltaQty !== 0 && warehouseId) {
                console.log("Шаг 2: Корректировка остатка...", deltaQty);
                const movementType = deltaQty > 0 ? "IN" : "OUT";

                const moveRes = await fetch(`${API_BASE_URL}/api/inventory/movements`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        warehouse_id: parseInt(warehouseId),
                        product_id: parseInt(productId),
                        movement_type: movementType,
                        qty: Math.abs(deltaQty), // Сервер ожидает положительное число
                        reason: "Ручная корректировка через карточку"
                    })
                });
                const moveData = await moveRes.json();
                if (!moveData.ok) console.warn("Ошибка корректировки:", moveData.message);
            }

        } else {
            // --- ЛОГИКА СОЗДАНИЯ (оставляем как была) ---
            console.log("Шаг 1: Создание карточки товара...");
            const prodRes = await fetch(`${API_BASE_URL}/api/inventory/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ title, kind, base_price: price, description })
            });
            const prodData = await prodRes.json();
            if (!prodData.ok) throw new Error("Ошибка создания товара: " + prodData.message);

            const newId = prodData.product_id;

            // Шаг 2: Файлы
            const fileInput = document.getElementById('product-files');
            if (fileInput && fileInput.files.length > 0) {
                for (let file of fileInput.files) {
                    const fd = new FormData();
                    fd.append('file', file);
                    const upRes = await fetch(`${API_BASE_URL}/api/files/upload`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: fd
                    });
                    const upData = await upRes.json();
                    if (upData.status === "ok") {
                        await fetch(`${API_BASE_URL}/api/inventory/products/${newId}/files`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({
                                files: [{ file_id: upData.file_id, kind: file.type.startsWith('image') ? 'image' : 'video' }]
                            })
                        });
                    }
                }
            }

            // Шаг 3: Остаток при создании
            if (kind === 'product' && deltaQty > 0 && warehouseId) {
                await fetch(`${API_BASE_URL}/api/inventory/movements`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        warehouse_id: parseInt(warehouseId),
                        product_id: newId,
                        movement_type: "IN",
                        qty: deltaQty,
                        reason: "Начальный остаток"
                    })
                });
            }
        }

        console.log("Операции завершены.");
        closeProductModal();

        if (warehouseId) {
            const currentWhName = document.querySelector('.warehouse-title')?.innerText || "";
            openWarehouse(warehouseId, currentWhName);
        } else {
            loadWarehouses();
        }

    } catch (err) {
        console.error("Критическая ошибка в saveProduct:", err);
    }
}




// Функция для добавления НОВОГО товара
function openAddItemModal(warehouseId) {
    const modal = document.getElementById('modal-product-create');
    if (!modal) return;

    // ОБЯЗАТЕЛЬНО: Очищаем поля перед открытием, чтобы не видеть данные старого редактирования
    closeProductModal();

    modal.dataset.warehouseId = warehouseId;
    modal.dataset.mode = 'create'; // Режим создания

    // Показываем окно
    modal.style.display = 'block';
}

// Функция для подготовки данных к редактированию
// 1. Функция для подготовки данных к редактированию
// 1. Подготовка к редактированию (вызывается при клике на строку таблицы)
function prepareEdit(productId, warehouseId) {
    console.log("Клик по товару ID:", productId); // Позволит увидеть работу в консоли (F12)

    // Ищем товар в глобальном кэше, который заполнился в openWarehouse
    const product = currentProductsCache.find(item => item.id === productId);

    if (product) {
        // Передаем данные в функцию открытия модалки
        editProduct(product.id, product.title, product.base_price, product.description, warehouseId);
    } else {
        console.error("Товар не найден в кэше currentProductsCache. Проверь загрузку данных.");
    }
}

// 2. Открытие окна на РЕДАКТИРОВАНИЕ
function editProduct(productId, title, price, description, warehouseId) {
    const modal = document.getElementById('modal-product-create');
    if (!modal) return;

    // Указываем модалке, что мы в режиме редактирования
    modal.dataset.productId = productId;
    modal.dataset.warehouseId = warehouseId;
    modal.dataset.mode = 'edit';

    // Заполняем поля данными из таблицы
    document.getElementById('product-title').value = title || "";
    document.getElementById('product-price').value = price || 0;
    const descField = document.getElementById('product-description');
    if (descField) descField.value = description || "";

    // Настраиваем блок количества для корректировки
    const qtyGroup = document.getElementById('group-quantity');
    const qtyInput = document.getElementById('product-qty');

    if (qtyGroup) {
        qtyGroup.style.display = 'block';
        const label = qtyGroup.querySelector('label');
        if (label) label.innerText = "КОРРЕКТИРОВКА ОСТАТКА (+/-)";

        if (qtyInput) {
            qtyInput.value = "0"; // Всегда 0 при открытии
            qtyInput.placeholder = "Например: 10 или -5";
        }
    }

    // Меняем заголовки интерфейса
    document.getElementById('product-modal-title').innerText = "УПРАВЛЕНИЕ ТОВАРОМ";
    const confirmBtn = modal.querySelector('.btn-confirm');
    if (confirmBtn) confirmBtn.innerText = "СОХРАНИТЬ ИЗМЕНЕНИЯ";

    modal.style.display = 'block';
}

// 3. Единая функция закрытия и очистки (замени ею все старые версии closeProductModal)
function closeProductModal() {
    const modal = document.getElementById('modal-product-create');
    if (!modal) return;

    modal.style.display = 'none';

    // Сброс режима на "создание" по умолчанию
    modal.dataset.mode = 'create';
    modal.dataset.productId = '';

    // Очистка всех инпутов
    const fields = ['product-title', 'product-price', 'product-qty', 'product-description'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = (id === 'product-qty') ? '0' : '';
    });

    const preview = document.getElementById('file-preview-container');
    if (preview) preview.innerHTML = '';
}