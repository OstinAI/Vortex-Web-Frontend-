/**
 * QUESTIONS PAGE — VORTEX
 * Путь: static/js/style/questions/questions.js
 */

document.addEventListener("DOMContentLoaded", function () {
    // ===== БУРГЕР-МЕНЮ =====
    const burgerToggle = document.getElementById("burgerToggle");
    const sidePanel = document.getElementById("sidePanel");

    if (burgerToggle && sidePanel) {
        burgerToggle.addEventListener("click", function (event) {
            event.stopPropagation();
            burgerToggle.classList.toggle("active");
            sidePanel.classList.toggle("active");
        });

        document.addEventListener("click", function (event) {
            if (!sidePanel.contains(event.target) && !burgerToggle.contains(event.target)) {
                burgerToggle.classList.remove("active");
                sidePanel.classList.remove("active");
            }
        });
    }

    // ===== ОБРАБОТЧИК ДЛЯ КНОПКИ "ВХОД" =====
    const loginLink = document.querySelector('.nav-link');
    if (loginLink) {
        loginLink.addEventListener('click', function (e) {
            e.preventDefault();
            window.location.href = '/#auth';
        });
    }

    // ===== ПРОВЕРКА ЯКОРЯ #auth =====
    if (window.location.hash === '#auth') {
        setTimeout(() => {
            const authForm = document.getElementById('auth-form');
            if (authForm) {
                authForm.classList.add('active');
                authForm.style.display = 'block';
            }
        }, 300);
    }

    console.log('❓ Страница вопросов VORTEX загружена');
});

// ===== ФУНКЦИЯ ДЛЯ РАСКРЫТИЯ/ЗАКРЫТИЯ ВОПРОСА =====
function toggleQuestion(headerElement) {
    const questionItem = headerElement.closest('.question-item');

    // Если этот вопрос уже активен - закрываем его
    if (questionItem.classList.contains('active')) {
        questionItem.classList.remove('active');
        return;
    }

    // Закрываем все остальные вопросы
    const allQuestions = document.querySelectorAll('.question-item');
    allQuestions.forEach(item => {
        item.classList.remove('active');
    });

    // Открываем текущий вопрос
    questionItem.classList.add('active');
}