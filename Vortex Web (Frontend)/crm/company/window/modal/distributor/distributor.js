/**
 * Модуль Дистрибьютор
 * Путь: /crm/company/window/modal/distributor/distributor.js
 */

(function () {
    'use strict';

    // ============================================
    // ПРОВЕРКА СТАТУСА ЗАЯВКИ
    // ============================================
    async function checkApplicationStatus() {
        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                console.warn('[Distributor] ⚠️ Токен не найден');
                return null;
            }

            if (typeof API_BASE_URL === 'undefined') {
                console.error('[Distributor] ❌ API_BASE_URL не определён');
                return null;
            }

            const response = await fetch(API_BASE_URL + '/api/company/distributor/application/status', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            console.log('[Distributor] 📦 Статус заявки:', result);

            if (result.status === 'ok' && result.data) {
                return result.data;
            }
            return null;
        } catch (error) {
            console.error('[Distributor] ❌ Ошибка проверки статуса:', error);
            return null;
        }
    }

    // ============================================
    // ЗАГРУЗКА ДАННЫХ КОМПАНИИ ДЛЯ ФОРМЫ
    // ============================================
    async function loadCompanyDataForForm() {
        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                console.warn('[Distributor] ⚠️ Токен не найден');
                return;
            }

            if (typeof API_BASE_URL === 'undefined') {
                console.error('[Distributor] ❌ API_BASE_URL не определён');
                return;
            }

            // Проверяем статус заявки
            const statusData = await checkApplicationStatus();

            // Если заявка уже есть
            if (statusData && statusData.has_application) {
                const statusMap = {
                    'pending': 'На рассмотрении',
                    'approved': 'Одобрена',
                    'rejected': 'Отклонена'
                };
                const statusText = statusMap[statusData.status] || statusData.status;

                // Пути к GIF-анимациям
                const gifPaths = {
                    'pending': '/crm/company/images/duration.gif',
                    'approved': '/crm/company/images/verified.gif',
                    'rejected': '/crm/company/images/letter-x.gif'
                };

                const gifSrc = gifPaths[statusData.status] || gifPaths['pending'];

                // Показываем статус вместо формы
                const applyForm = document.querySelector('.distributor-apply-form');
                if (applyForm) {
                    applyForm.innerHTML = `
                    <div class="distributor-status-container">
                        <div class="distributor-status-icon">
                            <img src="${gifSrc}" 
                                 alt="${statusText}" 
                                 class="distributor-status-gif"
                                 loading="lazy"
                                 data-gif="true">
                        </div>
                        <h3 class="distributor-status-title">Статус заявки</h3>
                        <div class="distributor-status-badge ${statusData.status}">${statusText}</div>
                        <p class="distributor-status-date">
                            Подана: ${new Date(statusData.created_ts_ms).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                        </p>
                        ${statusData.status === 'rejected' && statusData.review_comment ? `
                            <div class="distributor-status-comment">
                                <strong>Причина отказа:</strong>
                                <p>${statusData.review_comment}</p>
                            </div>
                        ` : ''}
                        ${statusData.status === 'pending' ? `
                            <p class="distributor-status-hint">Ваша заявка рассматривается. Мы свяжемся с вами в ближайшее время.</p>
                        ` : ''}
                        ${statusData.status === 'approved' ? `
    <div class="distributor-status-hint success">
        <p>Поздравляем! Вы стали дистрибьютором Vortex.</p>
        <p style="margin-top: 6px; color: #4b5563;">
            В странице компаний можете перейти в кабинет.
        </p>
    </div>
` : ''}
                        ${statusData.status === 'rejected' ? `
                            <p class="distributor-status-hint error">Вы можете подать новую заявку позже.</p>
                        ` : ''}
                    </div>
                `;
                }
                return;
            }

            // Если заявки нет - загружаем данные компании для формы
            const response = await fetch(API_BASE_URL + '/api/company/requisite', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            console.log('[Distributor] 📦 Данные компании:', result);

            if (result.status === 'ok' && result.data) {
                const data = result.data;

                const fieldMappings = {
                    'dfCompanyName': data.name || '',
                    'dfCompanyNameDisplay': data.name || '—',
                    'dfBin': data.bin || '',
                    'dfPresident': data.president || '',
                    'dfPhone': data.phone || '',
                    'dfEmail': data.company_email || data.contact_person_email || '',
                    'dfAddress': data.address || '',
                    'dfActualAddress': data.actual_address || '',
                    'dfWebsite': data.website || '',
                    'dfOwnershipForm': data.ownership_form || ''
                };

                for (const [fieldId, value] of Object.entries(fieldMappings)) {
                    const el = document.getElementById(fieldId);
                    if (el) {
                        if (fieldId === 'dfCompanyNameDisplay') {
                            el.textContent = value || '—';
                        } else {
                            el.value = value || '';
                        }
                    }
                }

                console.log('[Distributor] ✅ Форма заполнена данными компании');
            }
        } catch (error) {
            console.error('[Distributor] ❌ Ошибка загрузки данных компании:', error);
        }
    }

    // ============================================
    // ОТКРЫТЬ МОДАЛЬНОЕ ОКНО
    // ============================================
    window.openDistributorModal = function () {
        if (document.getElementById('distributorModal')) {
            return;
        }

        fetch('/crm/company/window/modal/distributor/distributor.html')
            .then(response => {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.text();
            })
            .then(html => {
                const oldModal = document.getElementById('distributorModal');
                if (oldModal) oldModal.remove();

                document.body.insertAdjacentHTML('beforeend', html);

                // Подключаем CSS
                if (!document.querySelector('link[href*="distributor.css"]')) {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = '/crm/company/window/modal/distributor/distributor.css';
                    document.head.appendChild(link);
                }

                // Устанавливаем текущую дату
                const dateEl = document.getElementById('currentDate');
                if (dateEl) {
                    const now = new Date();
                    dateEl.textContent = now.toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                }

                // Загружаем данные компании и проверяем статус
                setTimeout(loadCompanyDataForForm, 100);

                // Закрытие по клику на оверлей
                const overlay = document.getElementById('distributorModal');
                if (overlay) {
                    overlay.addEventListener('click', function (e) {
                        if (e.target === this) {
                            window.closeDistributorModal();
                        }
                    });
                }

                console.log('[Distributor] ✅ Модальное окно открыто');
            })
            .catch(error => {
                console.error('[Distributor] ❌ Ошибка:', error);
                alert('Не удалось загрузить форму дистрибьютора');
            });
    };

    // ============================================
    // ЗАКРЫТЬ МОДАЛЬНОЕ ОКНО
    // ============================================
    window.closeDistributorModal = function () {
        const modal = document.getElementById('distributorModal');
        if (modal) {
            modal.style.opacity = '0';
            modal.style.transform = 'scale(0.95)';
            modal.style.transition = 'all 0.3s ease';
            setTimeout(() => modal.remove(), 300);
        }
        console.log('[Distributor] 📴 Модальное окно закрыто');
    };

    // ============================================
    // ПЕРЕКЛЮЧЕНИЕ ТАБОВ
    // ============================================
    window.switchDistributorTab = function (tabId) {
        document.querySelectorAll('.distributor-tab-content').forEach(el => {
            el.classList.remove('active');
        });

        document.querySelectorAll('.distributor-tab').forEach(el => {
            el.classList.remove('active');
        });

        const targetTab = document.getElementById('tab-' + tabId);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        const targetBtn = document.querySelector(`.distributor-tab[data-tab="${tabId}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }

        console.log('[Distributor] 📑 Переключено на вкладку:', tabId);
    };

    // ============================================
    // ОТПРАВКА ЗАЯВКИ
    // ============================================
    window.submitDistributorApplication = async function () {
        // Собираем данные
        const companyName = document.getElementById('dfCompanyName')?.value?.trim();
        const bin = document.getElementById('dfBin')?.value?.trim();
        const president = document.getElementById('dfPresident')?.value?.trim();
        const phone = document.getElementById('dfPhone')?.value?.trim();
        const email = document.getElementById('dfEmail')?.value?.trim();
        const address = document.getElementById('dfAddress')?.value?.trim();
        const actualAddress = document.getElementById('dfActualAddress')?.value?.trim() || '';
        const website = document.getElementById('dfWebsite')?.value?.trim() || '';
        const ownershipForm = document.getElementById('dfOwnershipForm')?.value?.trim() || '';
        const paypalEmail = document.getElementById('dfPaypalEmail')?.value?.trim();
        const notes = document.getElementById('dfNotes')?.value?.trim() || '';
        const agreement = document.getElementById('dfAgreement')?.checked || false;

        // Валидация
        if (!companyName) {
            showDistributorNotification('Название компании не найдено', 'warning');
            return;
        }

        if (!bin) {
            showDistributorNotification('Введите БИН/ИИН', 'warning');
            document.getElementById('dfBin')?.focus();
            return;
        }

        if (!president) {
            showDistributorNotification('Введите ФИО президента', 'warning');
            document.getElementById('dfPresident')?.focus();
            return;
        }

        if (!phone) {
            showDistributorNotification('Введите номер телефона', 'warning');
            document.getElementById('dfPhone')?.focus();
            return;
        }

        if (!email) {
            showDistributorNotification('Введите Email', 'warning');
            document.getElementById('dfEmail')?.focus();
            return;
        }

        if (!address) {
            showDistributorNotification('Введите юридический адрес', 'warning');
            document.getElementById('dfAddress')?.focus();
            return;
        }

        if (!paypalEmail) {
            showDistributorNotification('Введите PayPal Email', 'warning');
            document.getElementById('dfPaypalEmail')?.focus();
            return;
        }

        if (!agreement) {
            showDistributorNotification('Необходимо согласиться с условиями оферты', 'warning');
            document.getElementById('dfAgreement')?.focus();
            return;
        }

        // Подготовка данных для отправки
        const data = {
            company_name: companyName,
            bin: bin,
            president: president,
            phone: phone,
            email: email,
            address: address,
            actual_address: actualAddress,
            website: website,
            ownership_form: ownershipForm,
            paypal_email: paypalEmail,
            notes: notes
        };

        console.log('[Distributor] 📤 Отправка заявки:', data);

        try {
            const token = localStorage.getItem('vortex_token');
            if (!token) {
                showDistributorNotification('Токен не найден. Авторизуйтесь.', 'error');
                return;
            }

            if (typeof API_BASE_URL === 'undefined') {
                showDistributorNotification('API_BASE_URL не определён', 'error');
                return;
            }

            const response = await fetch(API_BASE_URL + '/api/company/distributor/apply', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            console.log('[Distributor] 📦 Результат:', result);

            if (result.status === 'ok') {
                showDistributorNotification('✅ Заявка успешно отправлена! Мы свяжемся с вами в ближайшее время.', 'success');

                // Обновляем форму - показываем статус вместо формы
                setTimeout(() => {
                    loadCompanyDataForForm();
                }, 500);

                // Не закрываем модал, чтобы пользователь видел статус
            } else {
                showDistributorNotification('Ошибка: ' + (result.message || 'Неизвестная ошибка'), 'error');
            }

        } catch (error) {
            console.error('[Distributor] ❌ Ошибка:', error);
            showDistributorNotification('Ошибка отправки: ' + error.message, 'error');
        }
    };

    // ============================================
    // УВЕДОМЛЕНИЯ
    // ============================================
    function showDistributorNotification(message, type = 'info') {
        document.querySelectorAll('.distributor-notification').forEach(el => el.remove());

        const notification = document.createElement('div');
        notification.className = `distributor-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(40px)';
            notification.style.transition = 'all 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    // ============================================
    // ГЛОБАЛЬНЫЙ ОБРАБОТЧИК ДЛЯ КНОПКИ "СТАТЬ ДИСТРИБЬЮТОРОМ"
    // ============================================
    window.onDistributor = function () {
        console.log('[Distributor] 🔘 Клик по кнопке "Стать дистрибьютором"');
        window.openDistributorModal();
    };

    console.log('[Distributor] ✅ Модуль загружен');

    // ============================================
    // ПЕРЕХВАТ КЛИКА ПО ИНДИКАТОРУ
    // ============================================
    document.addEventListener('DOMContentLoaded', function () {
        const distributorBtn = document.querySelector('.crm-indicator.distributor-button');
        if (distributorBtn) {
            const newBtn = distributorBtn.cloneNode(true);
            distributorBtn.parentNode.replaceChild(newBtn, distributorBtn);

            newBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                window.openDistributorModal();
            });

            console.log('[Distributor] ✅ Индикатор "Стать дистрибьютором" настроен');
        } else {
            console.warn('[Distributor] ⚠️ Индикатор "Стать дистрибьютором" не найден');
        }
    });

})();