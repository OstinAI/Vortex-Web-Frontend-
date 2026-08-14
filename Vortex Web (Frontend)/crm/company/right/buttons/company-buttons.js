// ============================================
// КНОПКИ ДЛЯ СТРАНИЦЫ COMPANY
// Путь: /crm/company/right/buttons/company-buttons.js
// ============================================

(function () {
    'use strict';

    // ============================================
    // ПОДКЛЮЧЕНИЕ ШРИФТОВ
    // ============================================
    function loadFonts() {
        const existingLink = document.querySelector('link[href*="fonts.css"]');
        if (existingLink) {
            console.log('✅ Шрифты уже подключены');
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/styles/font/fonts.css';
        link.type = 'text/css';
        document.head.appendChild(link);

        console.log('✅ Файл шрифтов подключен: /styles/font/fonts.css');
    }

    // ============================================
    // ПОЛУЧЕНИЕ ID КОМПАНИИ ИЗ LOCALSTORAGE
    // ============================================
    function getCompanyId() {
        const companyId = localStorage.getItem('company_id') || localStorage.getItem('vortex_company_id');
        return companyId ? parseInt(companyId, 10) : null;
    }

    // ============================================
    // ФУНКЦИЯ СОЗДАНИЯ КНОПОК В ПРАВОЙ ЧАСТИ
    // ============================================
    function createCompanyButtons() {
        const rightContent = document.getElementById('rightContent');

        if (!rightContent) {
            console.warn('⚠️ #rightContent не найден, повторная попытка через 500ms...');
            setTimeout(createCompanyButtons, 500);
            return;
        }

        // Проверяем, не созданы ли уже кнопки
        if (rightContent.querySelector('.company-buttons-wrapper')) {
            console.log('ℹ️ Кнопки уже созданы');
            return;
        }

        // Создаем обертку для кнопок
        const wrapper = document.createElement('div');
        wrapper.className = 'company-buttons-wrapper';
        wrapper.style.cssText = `
            display: flex;
            flex-direction: row;
            gap: 10px;
            padding: 20px;
            justify-content: flex-end;
            align-items: flex-start;
            width: 100%;
            height: 100%;
        `;

        // Создаем контейнер для кнопок в правом верхнем углу
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'company-buttons-container';
        buttonsContainer.style.cssText = `
            display: flex;
            flex-direction: row;
            gap: 10px;
            align-items: center;
            margin-left: auto;
            margin-top: -10px;
        `;

        // Получаем ID компании
        const companyId = getCompanyId();
        console.log('🏢 ID компании:', companyId);

        // ---- КНОПКА 1: "Контрагент" ----
        const btn1 = createVortexButton({
            text: 'Контрагент',
            action: 'onCounterparty',
            glass: true,
            shape: 'rounded'
        });

        // ---- КНОПКА 2: "Реквизиты" ----
        const btn2 = createVortexButton({
            text: 'Реквизиты',
            action: 'onRequisites',
            glass: true,
            shape: 'rounded'
        });

        buttonsContainer.appendChild(btn1);
        buttonsContainer.appendChild(btn2);

        // ---- КНОПКА 3: "Дистрибьютор" (только для компании с ID = 1) ----
        if (companyId === 1) {
            console.log('✅ Компания ID=1: показываем кнопку "Дистрибьютор"');

            const btn3 = createVortexButton({
                text: 'Дистрибьютор',
                action: 'onDistributor2',
                glass: true,
                shape: 'rounded'
            });

            buttonsContainer.appendChild(btn3);

            // ---- КНОПКА 4: "Компании" (только для компании с ID = 1) ----
            console.log('✅ Компания ID=1: показываем кнопку "Компании"');

            const btn4 = createVortexButton({
                text: 'Компании',
                action: 'onCompanies',
                glass: true,
                shape: 'rounded'
            });

            buttonsContainer.appendChild(btn4);
        } else {
            console.log(`ℹ️ Компания ID=${companyId}: кнопки "Дистрибьютор" и "Компании" скрыты`);
        }

        wrapper.appendChild(buttonsContainer);
        rightContent.appendChild(wrapper);

        console.log('✅ Компания: кнопки добавлены в правую часть');
    }

    // ============================================
    // ФУНКЦИЯ СОЗДАНИЯ КНОПКИ ЧЕРЕЗ VORTEXBUTTON API
    // ============================================
    function createVortexButton(options) {
        if (typeof window.VortexButton !== 'undefined' && window.VortexButton.create) {
            const btn = window.VortexButton.create(options);

            btn.style.cssText = `
                min-height: 20px !important;
                height: 20px !important;
                min-width: auto !important;
                width: auto !important;
                padding: 2px 12px !important;
                font-size: 10px !important;
                font-weight: 300 !important;
                font-family: var(--vortex-font-family, 'Segoe UI', system-ui, sans-serif) !important;
                letter-spacing: 1px !important;
                line-height: 1 !important;
                white-space: nowrap !important;
                text-transform: uppercase !important;
                border-radius: 4px !important;
                color: rgba(255, 255, 255, 0.8) !important;
                cursor: pointer !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                background: rgba(255, 255, 255, 0.02) !important;
                backdrop-filter: blur(20px) !important;
                -webkit-backdrop-filter: blur(20px) !important;
                transition: all 0.3s ease !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                position: relative !important;
                overflow: hidden !important;
                opacity: 1 !important;
                transform: scale(1) !important;
                flex-shrink: 0 !important;
            `;

            const textEl = btn.querySelector('.btn-text');
            if (textEl) {
                textEl.style.cssText = `
                    font-size: 10px !important;
                    font-weight: 300 !important;
                    letter-spacing: 1px !important;
                    color: rgba(255, 255, 255, 0.8) !important;
                    text-transform: uppercase !important;
                    font-family: var(--vortex-font-family, 'Segoe UI', system-ui, sans-serif) !important;
                `;
            }

            return btn;
        } else {
            console.warn('⚠️ VortexButton API не найден, создаю кнопку вручную');
            return createFallbackButton(options);
        }
    }

    // ============================================
    // ФОЛБЭК-КНОПКА (ЕСЛИ VORTEXBUTTON НЕ ДОСТУПЕН)
    // ============================================
    function createFallbackButton(options) {
        const btn = document.createElement('button');
        btn.className = `vortex-btn animated shape-${options.shape || 'rounded'} glass`;

        btn.style.cssText = `
            min-height: 20px !important;
            height: 20px !important;
            min-width: auto !important;
            width: auto !important;
            padding: 2px 12px !important;
            font-family: var(--vortex-font-family, 'Segoe UI', system-ui, sans-serif) !important;
            font-size: 10px !important;
            font-weight: 300 !important;
            letter-spacing: 1px !important;
            text-transform: uppercase !important;
            color: rgba(255, 255, 255, 0.8) !important;
            cursor: pointer !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            background: rgba(255, 255, 255, 0.02) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
            border-radius: 4px !important;
            transition: all 0.3s ease !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            white-space: nowrap !important;
            line-height: 1 !important;
            position: relative !important;
            overflow: hidden !important;
            opacity: 1 !important;
            transform: scale(1) !important;
            flex-shrink: 0 !important;
        `;

        btn.textContent = options.text || 'Кнопка';

        if (options.action) {
            btn.dataset.action = options.action;
        }
        if (options.href) {
            btn.dataset.href = options.href;
        }

        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const action = this.dataset.action;
            if (action && typeof window[action] === 'function') {
                window[action]();
            } else {
                console.log(`[Button] Action: ${action}`);
            }
        });

        btn.addEventListener('mouseenter', function () {
            this.style.color = '#00E5FF !important';
            this.style.textShadow = '0 0 20px rgba(0, 229, 255, 0.4) !important';
        });

        btn.addEventListener('mouseleave', function () {
            this.style.color = 'rgba(255, 255, 255, 0.8) !important';
            this.style.textShadow = 'none !important';
        });

        return btn;
    }

    // ============================================
    // ГЛОБАЛЬНЫЕ ФУНКЦИИ-ОБРАБОТЧИКИ
    // ============================================

    /**
     * Обработчик кнопки "Контрагент"
     * Открывает модуль управления контрагентами
     */
    window.onCounterparty = function () {
        console.log('📄 Контрагент...');
        if (typeof window.openCounterparty === 'function') {
            window.openCounterparty();
        } else {
            console.warn('⚠️ Модуль контрагентов не загружен, подгружаем...');

            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = '/crm/company/right/counterparty/counterparty.css';
            document.head.appendChild(cssLink);

            const script = document.createElement('script');
            script.src = '/crm/company/right/counterparty/counterparty.js';
            script.onload = function () {
                setTimeout(() => {
                    if (typeof window.openCounterparty === 'function') {
                        window.openCounterparty();
                    } else {
                        alert('Ошибка загрузки модуля контрагентов');
                    }
                }, 200);
            };
            document.body.appendChild(script);
        }
    };

    /**
     * Обработчик кнопки "Реквизиты"
     * Открывает модуль управления реквизитами компании
     */
    window.onRequisites = function () {
        console.log('📋 Реквизиты...');

        if (typeof window.openRequisite === 'function') {
            window.openRequisite();
        } else {
            console.warn('⚠️ Модуль реквизитов не загружен, подгружаем...');

            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = '/crm/company/requisite/requisite.css';
            document.head.appendChild(cssLink);

            const script = document.createElement('script');
            script.src = '/crm/company/requisite/requisite.js';
            script.onload = function () {
                setTimeout(() => {
                    if (typeof window.openRequisite === 'function') {
                        window.openRequisite();
                    }
                }, 100);
            };
            document.body.appendChild(script);
        }
    };

    /**
     * Обработчик кнопки "Дистрибьютор" (новая версия)
     * Открывает модуль управления дистрибьюторами в правой секции
     * Доступен только для компании с ID = 1
     */
    window.onDistributor2 = function () {
        console.log('📦 Дистрибьютор (onDistributor2)...');

        const companyId = getCompanyId();
        if (companyId !== 1) {
            console.warn('⚠️ Доступ к модулю "Дистрибьютор" запрещен для этой компании');
            alert('Доступ запрещен');
            return;
        }

        // Проверяем, загружен ли модуль дистрибьюторов в правой секции
        if (typeof window.openDistributor === 'function') {
            // Открываем в правой секции
            window.openDistributor();
        } else {
            console.warn('⚠️ Модуль дистрибьюторов не загружен, подгружаем...');

            // Загружаем CSS для правой секции
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = '/crm/company/right/distributor/distributor.css';
            document.head.appendChild(cssLink);

            // Загружаем JS для правой секции
            const script = document.createElement('script');
            script.src = '/crm/company/right/distributor/distributor.js';
            script.onload = function () {
                setTimeout(function () {
                    if (typeof window.openDistributor === 'function') {
                        window.openDistributor();
                    } else {
                        console.error('❌ Функция openDistributor не найдена после загрузки');
                        alert('Ошибка загрузки модуля дистрибьюторов');
                    }
                }, 300);
            };
            script.onerror = function () {
                console.error('❌ Ошибка загрузки скрипта дистрибьюторов');
                alert('Ошибка загрузки модуля дистрибьюторов');
            };
            document.body.appendChild(script);
        }
    };

    /**
     * Обработчик кнопки "Компании" (новая версия)
     * Открывает модуль списка всех компаний в правой секции
     * Доступен только для компании с ID = 1
     */
    window.onCompanies = function () {
        console.log('🏢 Компании (onCompanies)...');

        const companyId = getCompanyId();
        if (companyId !== 1) {
            console.warn('⚠️ Доступ к модулю "Компании" запрещен для этой компании');
            alert('Доступ запрещен');
            return;
        }

        // Проверяем, загружен ли модуль списка компаний
        if (typeof window.openCompanies === 'function') {
            // Открываем в правой секции
            window.openCompanies();
        } else {
            console.warn('⚠️ Модуль списка компаний не загружен, подгружаем...');

            // Загружаем CSS
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = '/crm/company/right/List_of_companies/list_of_companies.css';
            document.head.appendChild(cssLink);

            // Загружаем JS
            const script = document.createElement('script');
            script.src = '/crm/company/right/List_of_companies/list_of_companies.js';
            script.onload = function () {
                setTimeout(function () {
                    if (typeof window.openCompanies === 'function') {
                        window.openCompanies();
                    } else {
                        console.error('❌ Функция openCompanies не найдена после загрузки');
                        alert('Ошибка загрузки модуля списка компаний');
                    }
                }, 300);
            };
            script.onerror = function () {
                console.error('❌ Ошибка загрузки скрипта списка компаний');
                alert('Ошибка загрузки модуля списка компаний');
            };
            document.body.appendChild(script);
        }
    };

    // ============================================
    // ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ
    // ============================================
    function init() {
        console.log('🚀 Инициализация кнопок компании...');
        loadFonts();

        if (typeof window.VortexButton === 'undefined') {
            console.warn('⚠️ VortexButton не загружен. Ожидание...');

            let attempts = 0;
            const maxAttempts = 20;

            const waitForVortex = setInterval(function () {
                attempts++;
                if (typeof window.VortexButton !== 'undefined') {
                    clearInterval(waitForVortex);
                    console.log('✅ VortexButton загружен, создаю кнопки...');
                    setTimeout(createCompanyButtons, 300);
                    if (window.VortexButton.init) {
                        setTimeout(window.VortexButton.init, 50);
                    }
                } else if (attempts >= maxAttempts) {
                    clearInterval(waitForVortex);
                    console.warn('⚠️ VortexButton не загружен, создаю кнопки вручную...');
                    setTimeout(createCompanyButtons, 300);
                }
            }, 100);
        } else {
            setTimeout(createCompanyButtons, 300);
            if (window.VortexButton.init) {
                setTimeout(window.VortexButton.init, 50);
            }
        }
    }

    // Запускаем инициализацию при загрузке DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();