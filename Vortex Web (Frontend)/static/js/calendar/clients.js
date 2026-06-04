// static/js/calendar/clients.js

window.ClientManager = {
    selectedClientId: null,
    clientsList: [],
    isLoading: false,
    hasMore: true,
    offset: 0,
    limit: 20,
    searchTerm: '',
    menu: null,
    trigger: null,
    nameSpan: null,
    searchInput: null,

    init() {
        this.menu = document.getElementById('clientMenu');
        this.trigger = document.getElementById('clientTrigger');
        this.nameSpan = document.getElementById('selectedClientName');

        if (!this.menu || !this.trigger) {
            console.error("ClientManager: элементы clientMenu или clientTrigger не найдены");
            return;
        }

        this.trigger.onclick = (e) => {
            e.stopPropagation();
            this.toggleMenu();
        };

        document.addEventListener('click', (e) => {
            if (this.menu && !this.menu.contains(e.target) && e.target !== this.trigger) {
                this.closeMenu();
            }
        });
    },

    toggleMenu() {
        if (this.menu) {
            this.menu.classList.toggle('show');
            // Если открываем меню и список пуст - загружаем клиентов
            if (this.menu.classList.contains('show') && this.clientsList.length === 0 && !this.isLoading) {
                this.loadClients();
            }
        }
    },

    closeMenu() {
        if (this.menu) {
            this.menu.classList.remove('show');
        }
    },

    resetAndLoad() {
        this.clientsList = [];
        this.offset = 0;
        this.hasMore = true;
        this.searchTerm = '';
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        this.loadClients();
    },

    async loadClients() {
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            const token = localStorage.getItem('vortex_token');
            // Загружаем ВСЕХ клиентов без поиска на сервере
            let url = `${API_BASE_URL}/api/crm/clients?limit=200&offset=0`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.ok && Array.isArray(data.clients)) {
                // Фильтруем системного клиента
                let filteredClients = data.clients.filter(client =>
                    client.name !== '__SYSTEM_TASK_CLIENT__' &&
                    !client.name?.startsWith('__SYSTEM')
                );

                // 🔥 ФИЛЬТРАЦИЯ ПО ПОИСКУ НА КЛИЕНТЕ
                if (this.searchTerm && this.searchTerm !== '') {
                    const searchLower = this.searchTerm.toLowerCase();
                    filteredClients = filteredClients.filter(client =>
                        (client.name || '').toLowerCase().includes(searchLower)
                    );
                }

                this.clientsList = filteredClients;
                this.hasMore = false; // Отключаем пагинацию, так как грузим всех сразу
                this.renderList();
            } else {
                this.clientsList = [];
                this.renderList();
            }
        } catch (e) {
            console.error("Ошибка загрузки клиентов:", e);
            this.clientsList = [];
            this.renderList();
        } finally {
            this.isLoading = false;
        }
    },

    loadMore() {
        if (this.hasMore && !this.isLoading) {
            this.offset += this.limit;
            this.loadClients();
        }
    },

    onScroll(e) {
        const target = e.target;
        if (target.scrollTop + target.clientHeight >= target.scrollHeight - 50) {
            this.loadMore();
        }
    },

    renderList() {
        if (!this.menu) return;

        // Сохраняем текущее значение поиска и фокус
        const currentSearchValue = this.searchInput ? this.searchInput.value : '';

        this.menu.innerHTML = '';

        // Поле поиска
        const searchDiv = document.createElement('div');
        searchDiv.style.cssText = 'padding: 8px; border-bottom: 1px solid rgba(0,229,255,0.2);';

        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.placeholder = '🔍 Поиск клиента...';
        this.searchInput.style.cssText = `
        width: 100%;
        padding: 8px;
        background: #0a0f1a;
        border: 1px solid #334155;
        border-radius: 4px;
        color: #fff;
        font-size: 12px;
        box-sizing: border-box;
    `;

        // Восстанавливаем значение
        this.searchInput.value = currentSearchValue;

        let searchTimeout;
        this.searchInput.oninput = (e) => {
            e.stopPropagation();
            const value = e.target.value;
            // Не запускаем поиск при каждом символе, только после задержки
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchTerm = value.toLowerCase().trim();
                this.offset = 0;
                this.clientsList = [];
                this.loadClients();
            }, 300);
        };

        // Предотвращаем потерю фокуса
        this.searchInput.onclick = (e) => {
            e.stopPropagation();
        };

        this.searchInput.onmousedown = (e) => {
            e.stopPropagation();
        };

        searchDiv.appendChild(this.searchInput);
        this.menu.appendChild(searchDiv);

        // Список клиентов с прокруткой
        const listDiv = document.createElement('div');
        listDiv.className = 'clients-list';
        listDiv.style.cssText = 'max-height: 250px; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none;';
        listDiv.onscroll = (e) => this.onScroll(e);

        // Пункт "Без клиента"
        const noneItem = this.createItem(null, 'Без клиента', 'fa-circle-xmark');
        listDiv.appendChild(noneItem);

        if (this.clientsList.length === 0 && !this.isLoading) {
            const emptyItem = document.createElement('div');
            emptyItem.className = 'dropdown-item';
            emptyItem.style.cssText = 'text-align: center; color: #666; padding: 12px;';
            emptyItem.innerText = this.searchTerm ? 'Клиенты не найдены' : 'Нет клиентов';
            listDiv.appendChild(emptyItem);
        } else {
            // Сортируем: выбранный клиент первым
            let sortedList = [...this.clientsList];
            if (this.selectedClientId !== null && this.selectedClientId !== undefined) {
                const selectedIndex = sortedList.findIndex(c => c.id === this.selectedClientId);
                if (selectedIndex > 0) {
                    const selected = sortedList.splice(selectedIndex, 1)[0];
                    sortedList.unshift(selected);
                }
            }

            sortedList.forEach(client => {
                const name = client.name || `Клиент #${client.id}`;
                const item = this.createItem(client.id, name, 'fa-building');
                listDiv.appendChild(item);
            });

            if (this.isLoading) {
                const loadingItem = document.createElement('div');
                loadingItem.className = 'dropdown-item';
                loadingItem.style.cssText = 'text-align: center; color: #666; padding: 12px;';
                loadingItem.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Загрузка...';
                listDiv.appendChild(loadingItem);
            } else if (this.hasMore && !this.searchTerm) {
                const moreItem = document.createElement('div');
                moreItem.className = 'dropdown-item';
                moreItem.style.cssText = 'text-align: center; color: var(--vortex-accent); padding: 8px; cursor: pointer;';
                moreItem.innerHTML = '<i class="fa-solid fa-chevron-down"></i> Загрузить еще';
                moreItem.onclick = (e) => {
                    e.stopPropagation();
                    this.loadMore();
                };
                listDiv.appendChild(moreItem);
            }
        }

        this.menu.appendChild(listDiv);

        // Восстанавливаем фокус на поле ввода
        if (this.searchInput && document.activeElement !== this.searchInput) {
            this.searchInput.focus();
            // Ставим курсор в конец текста
            const len = this.searchInput.value.length;
            this.searchInput.setSelectionRange(len, len);
        }
    },

    createItem(id, name, iconClass) {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        if (id !== null && this.selectedClientId === id) {
            item.classList.add('selected');
        }
        item.style.cssText = 'padding: 10px 12px; cursor: pointer; display: flex; align-items: center; gap: 10px;';
        item.innerHTML = `
            <i class="fa-regular ${iconClass}" style="width: 18px;"></i>
            <span style="flex: 1;">${this.escapeHtml(name)}</span>
            ${id !== null && this.selectedClientId === id ? '<i class="fa-solid fa-check"></i>' : ''}
        `;

        item.onclick = () => {
            this.selectClient(id, name);
        };

        return item;
    },

    selectClient(id, name) {
        this.selectedClientId = id;

        if (this.nameSpan) {
            this.nameSpan.innerText = name || 'Без клиента';
        }

        const hiddenInput = document.getElementById('selectedClientId');
        if (hiddenInput) {
            hiddenInput.value = id !== null ? id : '';
        }

        this.closeMenu();
        this.renderList(); // ← перерисовываем список
    },

    setClient(clientId, clientName) {
        this.selectedClientId = clientId;
        if (this.nameSpan) {
            this.nameSpan.innerText = clientName || (clientId ? `Клиент #${clientId}` : 'Без клиента');
        }
        const hiddenInput = document.getElementById('selectedClientId');
        if (hiddenInput) {
            hiddenInput.value = clientId || '';
        }
    },

    reset() {
        this.selectedClientId = null;  // ← это важно для новых задач
        this.clientsList = [];
        this.offset = 0;
        this.hasMore = true;
        this.searchTerm = '';
        if (this.nameSpan) {
            this.nameSpan.innerText = 'Без клиента';
        }
        const hiddenInput = document.getElementById('selectedClientId');
        if (hiddenInput) {
            hiddenInput.value = '';
        }
        if (this.searchInput) {
            this.searchInput.value = '';
        }
    },

    getSelectedClientId() {
        return this.selectedClientId;
    },

    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function (m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
};