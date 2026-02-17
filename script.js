document.addEventListener("DOMContentLoaded", () => {
    const body = document.body;
    const themeBtn = document.getElementById("theme-toggle");
    const langBtn = document.getElementById("lang-toggle");

    initNavMenu();
    initScrollTopButton();

    function updateThemeIcon() {
        if (!themeBtn) {
            return;
        }
        themeBtn.textContent = body.classList.contains("dark-mode") ? "moon" : "sun";
    }

    let savedTheme = null;
    try {
        savedTheme = localStorage.getItem("theme");
    } catch (error) {
        savedTheme = null;
    }

    if (savedTheme === "dark") {
        body.classList.add("dark-mode");
    }
    updateThemeIcon();

    if (themeBtn) {
        themeBtn.addEventListener("click", () => {
            body.classList.toggle("dark-mode");
            try {
                localStorage.setItem(
                    "theme",
                    body.classList.contains("dark-mode") ? "dark" : "light"
                );
            } catch (error) {
                // Ignore storage errors (private mode / disabled storage).
            }
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
        langBtn.textContent = isEnglish ? "en" : "pt";
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
    initContactForm();
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

function initNavMenu() {
    const siteNav = document.querySelector(".site-nav");
    const toggleBtn = siteNav ? siteNav.querySelector(".nav-toggle") : null;
    const navMenu = siteNav ? siteNav.querySelector(".nav-menu") : null;

    if (!siteNav || !toggleBtn || !navMenu) {
        return;
    }

    const openLabel = document.documentElement.lang === "en" ? "Open menu" : "Abrir menu";
    const closeLabel = document.documentElement.lang === "en" ? "Close menu" : "Fechar menu";

    const setMenuState = (isOpen) => {
        siteNav.classList.toggle("nav-open", isOpen);
        toggleBtn.setAttribute("aria-expanded", String(isOpen));
        toggleBtn.textContent = isOpen ? "\u2715" : "\u2630";
        toggleBtn.setAttribute("aria-label", isOpen ? closeLabel : openLabel);
    };

    setMenuState(false);

    toggleBtn.addEventListener("click", () => {
        setMenuState(!siteNav.classList.contains("nav-open"));
    });

    navMenu.querySelectorAll(".nav-link").forEach((link) => {
        link.addEventListener("click", () => {
            setMenuState(false);
        });
    });

    document.addEventListener("click", (event) => {
        if (!siteNav.contains(event.target)) {
            setMenuState(false);
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            setMenuState(false);
        }
    });
}

function initScrollTopButton() {
    let scrollBtn = document.getElementById("scroll-top-btn");

    if (!scrollBtn) {
        scrollBtn = document.createElement("button");
        scrollBtn.id = "scroll-top-btn";
        scrollBtn.className = "scroll-top-btn";
        scrollBtn.type = "button";
        scrollBtn.setAttribute("aria-label", document.documentElement.lang === "en" ? "Back to top" : "Voltar ao topo");
        scrollBtn.textContent = "\u2191";
        document.body.appendChild(scrollBtn);
    }

    const onScroll = () => {
        scrollBtn.classList.toggle("is-visible", window.scrollY > 260);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    scrollBtn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

function initContactForm() {
    const form = document.querySelector(".contact-form");
    if (!form) {
        return;
    }

    const alertBox = document.getElementById("form-alert");
    const submitBtn = form.querySelector("button[type=\"submit\"]");
    const recaptchaKey = (form.dataset.recaptchaSiteKey || "").trim();
    const recaptchaInput = document.getElementById("recaptcha-token");
    let isSubmitting = false;

    const fieldMap = {
        name: {
            input: document.getElementById("full-name"),
            minLength: 3,
            message: "Please enter your full name."
        },
        email: {
            input: document.getElementById("email"),
            minLength: 5,
            message: "Please enter a valid email address."
        },
        subject: {
            input: document.getElementById("subject"),
            minLength: 3,
            message: "Please enter a subject."
        },
        phone: {
            input: document.getElementById("phone"),
            optional: true,
            message: "Please enter a valid phone number."
        },
        message: {
            input: document.getElementById("message"),
            minLength: 10,
            message: "Please write at least 10 characters."
        }
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9\s+().-]{7,20}$/;

    const setAlert = (type, text) => {
        if (!alertBox) {
            return;
        }
        alertBox.textContent = text;
        alertBox.classList.toggle("is-success", type === "success");
        alertBox.classList.toggle("is-error", type === "error");
    };

    const resetAlert = () => {
        if (!alertBox) {
            return;
        }
        alertBox.textContent = "";
        alertBox.classList.remove("is-success", "is-error");
    };

    const setFieldState = (input, isValid, message) => {
        if (!input) {
            return;
        }

        const wrapper = input.closest(".form-field");
        const errorNode = wrapper ? wrapper.querySelector(".field-error") : null;

        if (!wrapper || !errorNode) {
            return;
        }

        wrapper.classList.toggle("is-invalid", !isValid);
        wrapper.classList.toggle("is-valid", isValid);
        errorNode.textContent = isValid ? "" : message;
    };

    const validateField = (key) => {
        const config = fieldMap[key];
        if (!config || !config.input) {
            return true;
        }

        const value = config.input.value.trim();

        if (config.optional && value.length === 0) {
            setFieldState(config.input, true, "");
            return true;
        }

        if (key === "email") {
            const normalizedValue = value.replace(/\s+/g, "");
            if (normalizedValue !== value) {
                config.input.value = normalizedValue;
            }
            const nativeValid = typeof config.input.checkValidity === "function"
                ? config.input.checkValidity()
                : true;
            const isValid = nativeValid && emailRegex.test(config.input.value);
            setFieldState(config.input, isValid, config.message);
            return isValid;
        }

        if (key === "phone") {
            const isValid = phoneRegex.test(value);
            setFieldState(config.input, isValid, config.message);
            return isValid;
        }

        const minLength = config.minLength || 1;
        const isValid = value.length >= minLength;
        setFieldState(config.input, isValid, config.message);
        return isValid;
    };

    const validateForm = () => {
        return Object.keys(fieldMap).every((key) => validateField(key));
    };

    Object.keys(fieldMap).forEach((key) => {
        const input = fieldMap[key].input;
        if (!input) {
            return;
        }
        input.addEventListener("blur", () => validateField(key));
        input.addEventListener("input", () => {
            const wrapper = input.closest(".form-field");
            if (wrapper && wrapper.classList.contains("is-invalid")) {
                validateField(key);
            }
        });
    });

    const setLoading = (isLoading) => {
        if (!submitBtn) {
            return;
        }
        submitBtn.disabled = isLoading;
        submitBtn.classList.toggle("is-loading", isLoading);
        const defaultLabel = submitBtn.dataset.defaultLabel || submitBtn.textContent;
        submitBtn.textContent = isLoading ? "Sending..." : defaultLabel;
    };

    const ensureHttps = () => {
        const isLocalhost = window.location.hostname === "localhost";
        if (window.location.protocol === "https:" || isLocalhost) {
            return true;
        }
        setAlert("error", "This form can only be submitted over HTTPS.");
        return false;
    };

    const sendForm = () => {
        const formData = new FormData(form);
        setLoading(true);

        let actionUrl = form.action;
        let requestOrigin = "";
        try {
            requestOrigin = new URL(actionUrl, window.location.href).origin;
        } catch (error) {
            requestOrigin = "";
        }
        const isSameOrigin = requestOrigin !== "" && requestOrigin === window.location.origin;

        fetch(actionUrl, {
            method: "POST",
            body: formData,
            headers: {
                "Accept": "application/json"
            },
            mode: isSameOrigin ? "same-origin" : "cors",
            credentials: isSameOrigin ? "same-origin" : "omit"
        })
            .then(async (response) => {
                const contentType = response.headers.get("content-type") || "";
                const isJson = contentType.includes("application/json");
                const data = isJson ? await response.json().catch(() => ({})) : {};
                if (!response.ok) {
                    throw data;
                }
                if (isJson && data.ok === false) {
                    throw data;
                }
                return data;
            })
            .then((data) => {
                setAlert("success", data.message || "Message sent successfully.");
                form.reset();
                Object.keys(fieldMap).forEach((key) => {
                    const input = fieldMap[key].input;
                    const wrapper = input ? input.closest(".form-field") : null;
                    if (wrapper) {
                        wrapper.classList.remove("is-valid", "is-invalid");
                    }
                    const errorNode = wrapper ? wrapper.querySelector(".field-error") : null;
                    if (errorNode) {
                        errorNode.textContent = "";
                    }
                });
            })
            .catch((error) => {
                const message = error && error.message ? error.message : "Unable to send your message. Please try again.";
                setAlert("error", message);
                if (error && error.errors) {
                    Object.keys(error.errors).forEach((key) => {
                        if (fieldMap[key] && fieldMap[key].input) {
                            setFieldState(fieldMap[key].input, false, error.errors[key]);
                        }
                    });
                }
            })
            .finally(() => {
                isSubmitting = false;
                setLoading(false);
            });
    };

    const runRecaptcha = () => {
        if (!recaptchaKey || recaptchaKey === "YOUR_SITE_KEY" || !window.grecaptcha || !recaptchaInput) {
            sendForm();
            return;
        }

        window.grecaptcha.ready(() => {
            window.grecaptcha.execute(recaptchaKey, { action: "contact" })
                .then((token) => {
                    recaptchaInput.value = token || "";
                    sendForm();
                })
                .catch(() => {
                    setAlert("error", "reCAPTCHA validation failed. Please try again.");
                    isSubmitting = false;
                    setLoading(false);
                });
        });
    };

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        resetAlert();

        if (!ensureHttps()) {
            return;
        }

        const isValid = validateForm();
        if (!isValid) {
            setAlert("error", "Please review the highlighted fields.");
            return;
        }

        isSubmitting = true;
        runRecaptcha();
    });
}
