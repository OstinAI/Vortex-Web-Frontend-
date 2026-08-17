/* ============================================
   ИНДИКАТОР: НАЗВАНИЕ КОМПАНИИ - JavaScript
   Папка: /crm/indicator/company/
   ============================================ */

(function () {
    'use strict';

    let isFetching = false;
    let fetchPromise = null;

    // ✅ Получение токена (как в контрагентах)
    function getToken() {
        return localStorage.getItem('vortex_token') ||
            localStorage.getItem('token') ||
            localStorage.getItem('access_token') ||
            sessionStorage.getItem('vortex_token') ||
            sessionStorage.getItem('token');
    }

    // ✅ Получение базового URL (как в контрагентах)
    function getApiBaseUrl() {
        return typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '';
    }

    // Получение имени компании
    function getCompanyName() {
        let name = localStorage.getItem('company_name') ||
            localStorage.getItem('vortex_company_name') ||
            localStorage.getItem('companyName');
        if (!name) {
            name = 'Vortex';
        }
        return name;
    }

    // Получение логотипа
    function getCompanyLogo() {
        return localStorage.getItem('company_logo') || null;
    }

    // ✅ ЗАПРОС К СЕРВЕРУ (как в контрагентах)
    function fetchCompanyData(force = false) {
        if (fetchPromise && !force) {
            return fetchPromise;
        }

        const token = getToken();
        console.log('[Company Indicator] 🔍 Токен:', token ? '✅ ЕСТЬ' : '❌ НЕТ');

        if (!token) {
            console.warn('[Company Indicator] ⚠️ Нет токена');
            return Promise.resolve(null);
        }

        // Проверяем кеш
        if (!force) {
            const lastUpdate = localStorage.getItem('company_data_updated');
            const now = Date.now();
            const fiveMinutes = 300000;
            if (lastUpdate && (now - parseInt(lastUpdate)) < fiveMinutes) {
                console.log('[Company Indicator] 📦 Используем кеш');
                return Promise.resolve(null);
            }
        }

        const baseUrl = getApiBaseUrl();
        const url = baseUrl + '/api/company/requisite';
        console.log('[Company Indicator] 📡 ЗАПРОС:', url);

        isFetching = true;

        fetchPromise = fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                return response.json();
            })
            .then(data => {
                isFetching = false;
                fetchPromise = null;

                if (data.status === 'ok' && data.data) {
                    console.log('[Company Indicator] ✅ Получены данные:', {
                        name: data.data.name,
                        logo: data.data.logo_path || '❌ НЕТ ЛОГОТИПА'
                    });

                    if (data.data.name) {
                        localStorage.setItem('company_name', data.data.name);
                    }
                    if (data.data.logo_path) {
                        localStorage.setItem('company_logo', data.data.logo_path);
                        console.log('[Company Indicator] ✅ Логотип СОХРАНЕН:', data.data.logo_path);
                    } else {
                        console.log('[Company Indicator] ⚠️ Логотип ОТСУТСТВУЕТ на сервере');
                        localStorage.removeItem('company_logo');
                    }
                    localStorage.setItem('company_data_updated', String(Date.now()));
                    return data.data;
                }
                return null;
            })
            .catch(err => {
                console.error('[Company Indicator] ❌ Ошибка запроса:', err);
                isFetching = false;
                fetchPromise = null;
                return null;
            });

        return fetchPromise;
    }

    // Получение первой буквы
    function getInitials(name) {
        if (!name) return '?';
        return name.charAt(0).toUpperCase();
    }

    // Создание аватара
    function createAvatar(companyName, logoPath) {
        const wrapper = document.createElement('div');
        wrapper.className = 'company-avatar';
        wrapper.innerHTML = '';

        if (logoPath && logoPath.startsWith('/api/files/')) {
            console.log('[Company Indicator] 🖼️ Создаем avatar с логотипом:', logoPath);
            const img = document.createElement('img');
            const timestamp = Date.now();
            // Используем полный URL если есть API_BASE_URL
            const baseUrl = getApiBaseUrl();
            const imgSrc = logoPath.startsWith('http') ? logoPath : baseUrl + logoPath;
            img.src = imgSrc + '?t=' + timestamp;
            img.alt = companyName || 'Company';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '50%';

            img.onload = function () {
                console.log('[Company Indicator] ✅ Логотип ЗАГРУЖЕН:', imgSrc);
                const placeholder = wrapper.querySelector('.avatar-placeholder');
                if (placeholder) placeholder.remove();
            };

            img.onerror = function () {
                console.warn('[Company Indicator] ❌ Ошибка загрузки логотипа:', imgSrc);
                this.style.display = 'none';
                let placeholder = wrapper.querySelector('.avatar-placeholder');
                if (!placeholder) {
                    placeholder = document.createElement('span');
                    placeholder.className = 'avatar-placeholder';
                    placeholder.textContent = getInitials(companyName);
                    wrapper.appendChild(placeholder);
                }
            };

            wrapper.appendChild(img);

            setTimeout(() => {
                if (!img.complete) {
                    const placeholder = document.createElement('span');
                    placeholder.className = 'avatar-placeholder';
                    placeholder.textContent = getInitials(companyName);
                    wrapper.appendChild(placeholder);
                }
            }, 1000);

        } else {
            console.log('[Company Indicator] 📝 Создаем плейсхолдер для:', companyName);
            const placeholder = document.createElement('span');
            placeholder.className = 'avatar-placeholder';
            placeholder.textContent = getInitials(companyName);
            wrapper.appendChild(placeholder);
        }

        return wrapper;
    }

    // Обработчик клика
    function handleCompanyClick(event) {
        const button = event.currentTarget;
        const targetHref = button.getAttribute('data-href') || '/company';
        button.classList.add('clicked');
        setTimeout(function () {
            window.location.href = targetHref;
        }, 150);
    }

    // ✅ ОСНОВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ
    function initCompanyIndicators(forceRefresh = false) {
        const companyButtons = document.querySelectorAll('.crm-indicator.company-button');

        if (companyButtons.length === 0) {
            console.log('[Company Indicator] ⚠️ Кнопки не найдены');
            return;
        }

        console.log('[Company Indicator] 🚀 Инициализация, кнопок:', companyButtons.length);

        const companyName = getCompanyName();
        const companyLogo = getCompanyLogo();
        const token = getToken();

        console.log('[Company Indicator] 📊 Текущие данные:', {
            name: companyName,
            logo: companyLogo || '❌ нет',
            token: token ? '✅ есть' : '❌ нет'
        });

        // Отрисовываем кнопки
        companyButtons.forEach(function (button) {
            let content = button.querySelector('.indicator-content');
            if (!content) {
                content = document.createElement('div');
                content.className = 'indicator-content';
                button.appendChild(content);
            }

            content.innerHTML = '';

            const avatar = createAvatar(companyName, companyLogo);
            content.appendChild(avatar);

            const label = document.createElement('span');
            label.className = 'label';
            label.textContent = companyName;
            content.appendChild(label);

            button.setAttribute('data-value', companyName);
            button.removeEventListener('click', handleCompanyClick);
            button.addEventListener('click', handleCompanyClick);
        });

        // ✅ ВСЕГДА запрашиваем данные с сервера (если есть токен)
        if (token) {
            console.log('[Company Indicator] 📡 Запрашиваем данные с сервера...');
            fetchCompanyData(forceRefresh).then(data => {
                if (data) {
                    const newLogo = data.logo_path;
                    const currentLogo = localStorage.getItem('company_logo');

                    console.log('[Company Indicator] 🔄 Результат запроса:', {
                        newLogo: newLogo || '❌ нет',
                        currentLogo: currentLogo || '❌ нет',
                        changed: newLogo !== currentLogo
                    });

                    if (newLogo && newLogo !== currentLogo) {
                        console.log('[Company Indicator] 🎯 ОБНОВЛЯЕМ логотип:', newLogo);
                        setTimeout(() => {
                            companyButtons.forEach(function (button) {
                                const content = button.querySelector('.indicator-content');
                                if (content) {
                                    const avatar = content.querySelector('.company-avatar');
                                    if (avatar) {
                                        const newAvatar = createAvatar(data.name || companyName, newLogo);
                                        avatar.replaceWith(newAvatar);
                                    }
                                }
                            });
                        }, 100);
                    } else if (newLogo) {
                        console.log('[Company Indicator] ✅ Логотип уже актуален');
                    } else {
                        console.log('[Company Indicator] ⚠️ Логотип отсутствует на сервере');
                    }
                } else {
                    console.log('[Company Indicator] ⚠️ Данные не получены');
                }
            });
        } else {
            console.warn('[Company Indicator] ❌ Нет токена, пропускаем запрос');
        }
    }

    // 🔄 Публичный метод обновления
    function refreshCompanyData() {
        console.log('[Company Indicator] 🔄 ПРИНУДИТЕЛЬНОЕ обновление...');
        localStorage.removeItem('company_data_updated');
        localStorage.removeItem('company_logo');
        fetchPromise = null;
        return fetchCompanyData(true).then((data) => {
            console.log('[Company Indicator] ✅ Данные обновлены:', data);
            initCompanyIndicators(true);
            return data;
        });
    }

    // ============================================
    // ЗАПУСК
    // ============================================

    // Слушаем DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            console.log('[Company Indicator] 📄 DOM загружен');
            setTimeout(initCompanyIndicators, 500);
        });
    } else {
        console.log('[Company Indicator] 📄 DOM уже загружен');
        setTimeout(initCompanyIndicators, 500);
    }

    // MutationObserver
    if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(function (mutations) {
            let needInit = false;
            mutations.forEach(function (mutation) {
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(function (node) {
                        if (node.nodeType === 1) {
                            if (node.matches && node.matches('.crm-indicator.company-button')) {
                                needInit = true;
                            }
                            if (node.querySelectorAll && node.querySelectorAll('.crm-indicator.company-button').length > 0) {
                                needInit = true;
                            }
                        }
                    });
                }
            });
            if (needInit) {
                setTimeout(initCompanyIndicators, 100);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Слушаем событие логина (как в контрагентах)
    window.addEventListener('login-success', function () {
        console.log('[Company Indicator] 🔐 Событие логина - обновляем данные');
        setTimeout(refreshCompanyData, 500);
    });

    // Слушаем событие обновления логотипа
    window.addEventListener('company-logo-updated', function (event) {
        console.log('[Company Indicator] 📡 Событие обновления логотипа');
        if (event.detail && event.detail.logo_path) {
            localStorage.setItem('company_logo', event.detail.logo_path);
            localStorage.setItem('company_data_updated', String(Date.now()));
            fetchPromise = null;
            initCompanyIndicators(true);
        }
    });

    // ✅ Экспорт (как в контрагентах)
    window.CompanyIndicator = {
        init: initCompanyIndicators,
        refresh: refreshCompanyData,
        getName: getCompanyName,
        getLogo: getCompanyLogo,
        getToken: getToken,
        fetchData: fetchCompanyData
    };

    console.log('[Company Indicator] ✅ Загружен v4.1');
    console.log('[Company Indicator] 🔍 Токен при старте:', getToken() ? '✅ ЕСТЬ' : '❌ НЕТ');
    console.log('[Company Indicator] 🔍 API_BASE_URL:', getApiBaseUrl() || '❌ НЕ ОПРЕДЕЛЕН');

    // Если токен есть сразу - делаем запрос
    if (getToken()) {
        console.log('[Company Indicator] 📡 Автоматический запрос данных...');
        setTimeout(() => {
            fetchCompanyData(true).then(() => {
                initCompanyIndicators(true);
            });
        }, 1000);
    }

})();