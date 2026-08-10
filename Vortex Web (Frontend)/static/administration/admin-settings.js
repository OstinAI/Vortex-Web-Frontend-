/**
 * admin-settings.js
 * Управление админ-панелью на странице настроек
 * Проверка компании Vortex и показ/скрытие кнопки АДМИНИСТРИРОВАНИЕ
 */

(function () {
    'use strict';

    // ============================================================
    // ИНИЦИАЛИЗАЦИЯ
    // ============================================================

    document.addEventListener('DOMContentLoaded', function () {
        console.log('[ADMIN-SETTINGS] DOM загружен');

        // Выводим все данные из localStorage для отладки
        console.log('[ADMIN-SETTINGS] Все данные localStorage:');
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            console.log(`  ${key}: ${localStorage.getItem(key)}`);
        }

        checkAndToggleAdminButton();
    });

    // ============================================================
    // ПРОВЕРКА КОМПАНИИ VORTEX (ПО ID ИЗ localStorage)
    // ============================================================

    function isVortexCompany() {
        // Получаем company_id из localStorage (сохраняется при входе)
        const companyId = localStorage.getItem('company_id') ||
            localStorage.getItem('vortex_company_id') || '';

        // Проверяем только ID=2 (Vortex)
        const VORTEX_COMPANY_ID = 2;
        const parsedId = parseInt(companyId);
        const isVortex = parsedId === VORTEX_COMPANY_ID;

        console.log('[ADMIN-SETTINGS] Проверка компании:', {
            companyId: companyId,
            parsedId: parsedId,
            VORTEX_COMPANY_ID: VORTEX_COMPANY_ID,
            isVortex: isVortex
        });

        return isVortex;
    }

    // ============================================================
    // ПОКАЗ/СКРЫТИЕ КНОПКИ АДМИНИСТРИРОВАНИЕ
    // ============================================================

    function checkAndToggleAdminButton() {
        const btn = document.getElementById('admin-panel-toggle');
        if (!btn) {
            console.error('[ADMIN-SETTINGS] Кнопка admin-panel-toggle не найдена');
            return;
        }

        // Сначала скрываем
        btn.style.display = 'none';

        // Если Vortex (ID=2) - показываем
        if (isVortexCompany()) {
            btn.style.display = 'inline-block';
            console.log('[ADMIN-SETTINGS] ✅ Кнопка АДМИНИСТРИРОВАНИЕ ПОКАЗАНА (Vortex ID=2)');
        } else {
            console.log('[ADMIN-SETTINGS] ❌ Кнопка АДМИНИСТРИРОВАНИЕ СКРЫТА (не Vortex)');
        }
    }

    // ============================================================
    // ОТКРЫТИЕ АДМИН-ПАНЕЛИ
    // ============================================================

    function openVortexAdmin() {
        console.log('[ADMIN-SETTINGS] Открытие админ-панели');

        if (!isVortexCompany()) {
            alert('Доступ запрещен. Только для компании Vortex.');
            return;
        }

        // Проверяем, загружен ли ADMIN_MODAL
        if (typeof ADMIN_MODAL !== 'undefined' && ADMIN_MODAL.open) {
            ADMIN_MODAL.open();
        } else {
            console.warn('[ADMIN-SETTINGS] ADMIN_MODAL не найден, проверяем альтернативы');

            // Альтернативный способ - проверить, есть ли функция openAdminModal
            if (typeof openAdminModal === 'function') {
                openAdminModal();
            } else {
                alert('Админ-панель временно недоступна.');
            }
        }
    }

    // ============================================================
    // ФУНКЦИЯ ДЛЯ ОТЛАДКИ
    // ============================================================

    function debugVortexCheck() {
        console.log('=== DEBUG VORTEX CHECK ===');
        console.log('company_id:', localStorage.getItem('company_id'));
        console.log('vortex_company_id:', localStorage.getItem('vortex_company_id'));
        console.log('isVortexCompany():', isVortexCompany());

        console.log('Все ключи localStorage:');
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            console.log(`  ${key}: ${localStorage.getItem(key)}`);
        }
    }

    // ============================================================
    // ЭКСПОРТ (ГЛОБАЛЬНЫЙ ДОСТУП)
    // ============================================================

    window.isVortexCompany = isVortexCompany;
    window.checkAndToggleAdminButton = checkAndToggleAdminButton;
    window.openVortexAdmin = openVortexAdmin;
    window.debugVortexCheck = debugVortexCheck;

    console.log('[ADMIN-SETTINGS] Инициализация завершена');

})();