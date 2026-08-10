document.addEventListener("DOMContentLoaded", () => {
    // 1. Анимация поочередного появления карточек тарифов
    const tariffCards = document.querySelectorAll(".tariff-card");
    tariffCards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add("reveal");
        }, index * 150);
    });

    // 2. Плавное появление для модулей (выезжают снизу вверх)
    const moduleCards = document.querySelectorAll(".module-card");
    moduleCards.forEach((card, index) => {
        card.style.opacity = "0";
        card.style.transform = "translateY(30px)";
        card.style.transition = "all 0.5s cubic-bezier(0.25, 1, 0.5, 1)";

        setTimeout(() => {
            card.style.opacity = "1";
            card.style.transform = "translateY(0)";
        }, (tariffCards.length * 150) + (index * 120));
    });

    // 3. Код клика по кнопкам для открытия формы авторизации
    const authButtons = document.querySelectorAll(".open-auth-btn");
    authButtons.forEach(button => {
        button.addEventListener("click", (e) => {
            e.preventDefault();
            window.location.href = "/#auth";
        });
    });
});