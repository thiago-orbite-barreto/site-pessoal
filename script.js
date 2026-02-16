document.addEventListener("DOMContentLoaded", () => {
    const body = document.body;
    const themeBtn = document.getElementById("theme-toggle");
    const langBtn = document.getElementById("lang-toggle");

    initMobileNav();

    function updateThemeIcon() {
        if (!themeBtn) {
            return;
        }
        themeBtn.textContent = body.classList.contains("dark-mode") ? "🌙" : "☀️";
    }

    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        body.classList.add("dark-mode");
    }
    updateThemeIcon();

    if (themeBtn) {
        themeBtn.addEventListener("click", () => {
            body.classList.toggle("dark-mode");
            localStorage.setItem(
                "theme",
                body.classList.contains("dark-mode") ? "dark" : "light"
            );
            updateThemeIcon();
        });
    }

    const pageMap = {
        "index.html": "index_en.html",
        "index_en.html": "index.html",
        "curriculo.html": "curriculo_en.html",
        "curriculo_en.html": "curriculo.html",
        "blog.html": "blog_en.html",
        "blog_en.html": "blog.html",
        "contato.html": "contact_en.html",
        "contact_en.html": "contato.html"
    };

    function updateLangIcon() {
        if (!langBtn) {
            return;
        }

        const path = window.location.pathname;
        const isEnglish = path.includes("_en") || path.includes("contact_en");
        langBtn.textContent = isEnglish ? "🇺🇸" : "🇧🇷";
    }

    updateLangIcon();

    if (langBtn) {
        langBtn.addEventListener("click", () => {
            const currentPage = getCurrentPageName();
            const targetPage = pageMap[currentPage];

            if (targetPage) {
                window.location.href = targetPage;
            }
        });
    }

    updateFooterYearRange();
    initBlogPage();
});

function updateFooterYearRange() {
    const yearNodes = document.querySelectorAll(".footer-year-range[data-start-year]");
    const currentYear = new Date().getFullYear();

    yearNodes.forEach((node) => {
        const startYear = Number.parseInt(node.dataset.startYear || "", 10);

        if (!Number.isInteger(startYear)) {
            return;
        }

        node.textContent = currentYear > startYear ? `${startYear}-${currentYear}` : `${startYear}`;
    });
}

function initBlogPage() {
    const postsContainer = document.getElementById("blog-posts");
    const indexContainer = document.getElementById("blog-index");
    const searchInput = document.getElementById("blog-search");
    const feedback = document.getElementById("blog-search-feedback");

    if (!postsContainer || !indexContainer || !searchInput) {
        return;
    }

    const isEnglish = document.documentElement.lang === "en";

    const posts = [];

    const normalizedPosts = posts
        .slice()
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map((post, index) => ({
            ...post,
            id: `post-${slugify(post.title)}-${index}`
        }));

    searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim().toLowerCase();
        const terms = query.split(/\s+/).filter(Boolean);

        const filtered = normalizedPosts.filter((post) => {
            if (terms.length === 0) {
                return true;
            }

            const searchableText = [post.title, post.summary, post.tags.join(" ")].join(" ").toLowerCase();
            return terms.every((term) => searchableText.includes(term));
        });

        renderBlog(postsContainer, indexContainer, feedback, filtered, query, isEnglish);
    });

    renderBlog(postsContainer, indexContainer, feedback, normalizedPosts, "", isEnglish);
}

function renderBlog(postsContainer, indexContainer, feedback, posts, query, isEnglish) {
    postsContainer.innerHTML = "";
    indexContainer.innerHTML = "";

    if (posts.length === 0) {
        postsContainer.innerHTML = `<div class="glass-box no-results">${
            isEnglish ? "No posts published yet." : "Nenhum post publicado ainda."
        }</div>`;
        indexContainer.innerHTML = `<p class="index-empty">${
            isEnglish ? "No dates available yet." : "Sem datas cadastradas ainda."
        }</p>`;
        if (feedback) {
            feedback.textContent = isEnglish ? "0 posts listed" : "0 posts listados";
        }
        return;
    }

    const groups = new Map();

    posts.forEach((post) => {
        const key = post.date.slice(0, 7);
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key).push(post);

        const article = document.createElement("article");
        article.className = "glass-box post-card";
        article.id = post.id;
        article.innerHTML = `
            <p class="post-date">${formatDate(post.date, isEnglish)}</p>
            <h3>${post.title}</h3>
            <p>${post.summary}</p>
            <p class="post-tags">${post.tags.map((tag) => `<span>${tag}</span>`).join("")}</p>
        `;
        postsContainer.appendChild(article);
    });

    groups.forEach((groupPosts, monthKey) => {
        const monthTitle = document.createElement("h3");
        monthTitle.className = "index-month";
        monthTitle.textContent = formatMonth(monthKey, isEnglish);

        const list = document.createElement("ul");
        list.className = "index-list";

        groupPosts.forEach((post) => {
            const item = document.createElement("li");
            item.innerHTML = `<a href="#${post.id}">${post.title}</a>`;
            list.appendChild(item);
        });

        indexContainer.appendChild(monthTitle);
        indexContainer.appendChild(list);
    });

    if (feedback) {
        const label = posts.length === 1 ? (isEnglish ? "post" : "post") : (isEnglish ? "posts" : "posts");
        const queryText = query ? ` - "${query}"` : "";
        feedback.textContent = `${posts.length} ${label}${queryText}`;
    }
}

function formatDate(dateText, isEnglish) {
    const locale = isEnglish ? "en-US" : "pt-BR";
    return new Date(`${dateText}T00:00:00`).toLocaleDateString(locale, {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

function formatMonth(monthKey, isEnglish) {
    const locale = isEnglish ? "en-US" : "pt-BR";
    return new Date(`${monthKey}-01T00:00:00`).toLocaleDateString(locale, {
        month: "long",
        year: "numeric"
    });
}

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
}

function getCurrentPageName() {
    const pathSegments = window.location.pathname.split("/").filter(Boolean);
    const currentPath = pathSegments[pathSegments.length - 1] || "";

    if (currentPath.endsWith(".html")) {
        return currentPath;
    }

    return document.documentElement.lang === "en" ? "index_en.html" : "index.html";
}

function initMobileNav() {
    const siteNav = document.querySelector(".site-nav");
    const navLeft = siteNav?.querySelector(".nav-left");
    const navCenter = siteNav?.querySelector(".nav-center");
    const navRight = siteNav?.querySelector(".nav-right");

    if (!siteNav || !navLeft || !navCenter || !navRight || siteNav.querySelector(".nav-toggle")) {
        return;
    }

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "nav-toggle";
    toggleBtn.setAttribute("aria-label", "Abrir menu");
    toggleBtn.setAttribute("aria-expanded", "false");
    toggleBtn.textContent = "☰";

    const navMenu = document.createElement("div");
    navMenu.className = "nav-menu";

    navMenu.appendChild(navCenter);
    navMenu.appendChild(navRight);
    siteNav.appendChild(toggleBtn);
    siteNav.appendChild(navMenu);

    const setMenuState = (isOpen) => {
        siteNav.classList.toggle("nav-open", isOpen);
        document.body.classList.toggle("mobile-nav-open", isOpen);
        toggleBtn.setAttribute("aria-expanded", String(isOpen));
        toggleBtn.textContent = isOpen ? "✕" : "☰";
        toggleBtn.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
    };

    setMenuState(false);

    toggleBtn.addEventListener("click", () => {
        setMenuState(!siteNav.classList.contains("nav-open"));
    });

    navMenu.querySelectorAll(".nav-link").forEach((link) => {
        link.addEventListener("click", () => {
            if (window.innerWidth <= 640) {
                setMenuState(false);
            }
        });
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 640) {
            setMenuState(false);
        }
    });
}

