document.addEventListener("DOMContentLoaded", () => {
    const body = document.body;
    const themeBtn = document.getElementById("theme-toggle");
    const langBtn = document.getElementById("lang-toggle");

    /* =======================
       TEMA (CLARO / ESCURO)
    ======================= */

    function updateThemeIcon() {
        themeBtn.textContent = body.classList.contains("dark-mode") ? "🌙" : "☀️";
    }

    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        body.classList.add("dark-mode");
    }
    updateThemeIcon();

    themeBtn.addEventListener("click", () => {
        body.classList.toggle("dark-mode");
        localStorage.setItem(
            "theme",
            body.classList.contains("dark-mode") ? "dark" : "light"
        );
        updateThemeIcon();
    });

    /* =======================
       IDIOMA
    ======================= */

    const pageMap = {
        "index.html": "index_en.html",
        "index_en.html": "index.html",
        "curriculo.html": "curriculo_en.html",
        "curriculo_en.html": "curriculo.html"
    };

    function updateLangIcon() {
        const isEnglish = window.location.pathname.includes("_en");
        langBtn.textContent = isEnglish ? "🇺🇸" : "🇧🇷";
    }

    updateLangIcon();

    langBtn.addEventListener("click", () => {
        const currentPage = window.location.pathname.split("/").pop();
        const targetPage = pageMap[currentPage];

        if (targetPage) {
            window.location.href = targetPage;
        }
    });
});
