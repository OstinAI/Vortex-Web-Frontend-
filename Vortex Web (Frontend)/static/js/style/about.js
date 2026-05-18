document.addEventListener("DOMContentLoaded", function () {
    const footerElement = document.querySelector('.about-footer-text');

    if (footerElement) {
        const footerObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                // Как только верхний край футера коснулся низа экрана
                if (entry.isIntersecting) {
                    // Мгновенно выдаем текст
                    entry.target.classList.add('vortex-reveal');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0, // 0 означает мгновенный триггер при первом же касании экрана
            rootMargin: "0px 0px 50px 0px" // Включаем показ на 50px раньше, чтобы вообще не ждать
        });

        footerObserver.observe(footerElement);
    }
});