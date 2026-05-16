document.addEventListener("DOMContentLoaded", function () {
    const burgerToggle = document.getElementById("burgerToggle");
    const sidePanel = document.getElementById("sidePanel");

    if (burgerToggle && sidePanel) {
        burgerToggle.addEventListener("click", function (event) {
            event.stopPropagation();

            // При первом клике включаем плавную анимацию для панели
            if (!sidePanel.classList.contains("animated")) {
                sidePanel.classList.add("animated");
            }

            // Переключаем классы видимости
            burgerToggle.classList.toggle("active");
            sidePanel.classList.toggle("active");
        });

        // Закрываем панель при клике в любое другое место
        document.addEventListener("click", function (event) {
            if (!sidePanel.contains(event.target) && !burgerToggle.contains(event.target)) {
                burgerToggle.classList.remove("active");
                sidePanel.classList.remove("active");
            }
        });
    }
});