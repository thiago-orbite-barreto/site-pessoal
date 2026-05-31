document.addEventListener("DOMContentLoaded", () => {
    const body = document.body;
    const themeBtn = document.getElementById("theme-toggle");
    const langBtn = document.getElementById("lang-toggle");

    initNavMenu();
    initScrollTopButton();

    const themeIcon = themeBtn ? themeBtn.querySelector("img") : null;
    const langIcon = langBtn ? langBtn.querySelector("img") : null;

    // Determine site base: prefer explicit `window.SITE_BASE` set in templates,
    // otherwise derive from stylesheet href as a fallback.
    let siteBase = '';
    try {
        if (typeof window !== 'undefined' && window.SITE_BASE) {
            siteBase = window.SITE_BASE.replace(/\/$/, '');
        } else {
            const stylesheetNode = document.querySelector('link[rel="stylesheet"]');
            if (stylesheetNode && stylesheetNode.href) {
                siteBase = stylesheetNode.href.replace(/\/assets\/css\/.*$/, '');
            }
        }
    } catch (e) {
        siteBase = '';
    }

    function updateThemeIcon() {
        if (!themeBtn) {
            return;
        }
        const isDark = body.classList.contains("dark-mode");
        if (themeIcon) {
            themeIcon.src = (siteBase || '') + "/assets/icons/" + (isDark ? "moon.svg" : "sun.svg");
            themeIcon.alt = isDark ? "Modo escuro" : "Modo claro";
        }
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

    function isPathEnglish(pathname) {
        return pathname.split('/').includes('en');
    }

    function updateLangIcon() {
        if (!langBtn) return;
        const path = window.location.pathname;
        const isEnglish = isPathEnglish(path);
        if (langIcon) {
            langIcon.src = (siteBase || '') + "/assets/icons/" + (isEnglish ? "flag-us.svg" : "flag-br.svg");
            langIcon.alt = isEnglish ? "English" : "Português";
        }
        langBtn.setAttribute("title", isEnglish ? "Switch to Portuguese" : "Switch to English");
    }

    updateLangIcon();

    if (langBtn) {
        langBtn.addEventListener("click", () => {
            const path = window.location.pathname;
            const search = window.location.search || '';
            const hash = window.location.hash || '';

            // If this page exposes an explicit translation URL (per-post), use it.
            const translationUrl = document.body.dataset.translationUrl || (document.querySelector('meta[name="translation"]') ? document.querySelector('meta[name="translation"]').content : null);
            if (translationUrl) {
                window.location.href = translationUrl + search + hash;
                return;
            }

            const segments = path.split('/').filter(Boolean);

            // If there's an 'en' segment anywhere, remove the first occurrence
            const enIndex = segments.indexOf('en');
            if (enIndex !== -1) {
                segments.splice(enIndex, 1);

                // If removing 'en' yields no segments, go to site root
                if (segments.length === 0) {
                    window.location.href = '/' + search + hash;
                    return;
                }

                // Map common English slugs back to Portuguese filenames/paths
                const contactIdx = segments.indexOf('contact');
                const resumeIdx = segments.indexOf('resume');

                if (contactIdx !== -1) {
                    const prefixParts = segments.slice(0, contactIdx).filter((s) => s && s !== 'index.html');
                    const prefix = prefixParts.length > 0 ? '/' + prefixParts.join('/') : '';
                    window.location.href = prefix + '/contato.html' + search + hash;
                    return;
                }

                if (resumeIdx !== -1) {
                    const prefixParts = segments.slice(0, resumeIdx).filter((s) => s && s !== 'index.html');
                    const prefix = prefixParts.length > 0 ? '/' + prefixParts.join('/') : '';
                    window.location.href = prefix + '/curriculo.html' + search + hash;
                    return;
                }

                // Default: preserve segments, add trailing slash only for directory-like paths
                const joined = segments.join('/');
                const newPath = '/' + joined + (joined.endsWith('.html') ? '' : '/');
                window.location.href = newPath + search + hash;
                return;
            }

            // Map common Portuguese pages to their English counterparts
            const last = segments[segments.length - 1] || '';
            const base = segments[0] || '';

            let newSegments = segments.slice();

            if (last === '' || /^index(\.html)?$/.test(last) || segments.length === 1) {
                // root/home page -> /<base>/en/
                if (base) {
                    newSegments = [base, 'en'];
                } else {
                    newSegments = ['en'];
                }
            } else if (/^blog(\/|$)|blog\.html$/.test(last) || last === 'blog') {
                newSegments = base ? [base, 'en', 'blog'] : ['en', 'blog'];
            } else if (/^curriculo(\.html)?$/.test(last) || /curriculo/.test(last)) {
                newSegments = base ? [base, 'en', 'resume'] : ['en', 'resume'];
            } else if (/^contato(\.html)?$/.test(last) || /contato/.test(last)) {
                newSegments = base ? [base, 'en', 'contact'] : ['en', 'contact'];
            } else {
                // Fallback: insert 'en' after the first segment (preserve baseurl when present)
                if (segments.length >= 1) {
                    newSegments.splice(1, 0, 'en');
                } else {
                    newSegments.splice(0, 0, 'en');
                }
            }

            const newPath = '/' + newSegments.join('/') + (path.endsWith('/') ? '/' : '/');
            window.location.href = newPath + search + hash;
        });
    }

    updateFooterYearRange();
    initBlogPage();
    initContactForm();
    formatPostDateOnPage();
});

function formatPostDateOnPage() {
    const pm = document.querySelector('.post-meta[data-date]');
    if (!pm) return;
    const dateText = pm.dataset.date;
    const isEnglish = document.documentElement.lang === 'en';
    pm.textContent = formatDate(dateText, isEnglish);
}

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

    const posts = window.SITE_POSTS || [];

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
            <h3><a href="${post.url}">${post.title}</a></h3>
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
    return currentPath;
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
    const recaptchaVersion = (form.dataset.recaptchaVersion || "").trim().toLowerCase();
    const recaptchaInput = document.getElementById("recaptcha-token");
    let isSubmitting = false;

    form.setAttribute("method", "POST");

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
        const recaptchaToken = getStoredRecaptchaToken();
        if (recaptchaToken) {
            formData.set("g-recaptcha-response", recaptchaToken);
            formData.set("recaptcha_token", recaptchaToken);
        }
        const body = new URLSearchParams();
        formData.forEach((value, key) => {
            if (typeof value === "string") {
                body.append(key, value);
            }
        });
        setLoading(true);

        const actionUrl = form.action;
        const method = (form.getAttribute("method") || "POST").toUpperCase();

        fetch(actionUrl, {
            method: method,
            body: body,
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded"
            }
        })
            .then(async (response) => {
                const contentType = response.headers.get("content-type") || "";
                const isJson = contentType.includes("application/json");
                const data = isJson
                    ? await response.json().catch(() => ({}))
                    : { message: await response.text().catch(() => "") };
                if (!response.ok) {
                    throw Object.assign(data, { status: response.status });
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
                const message = getSubmissionErrorMessage(error);
                setAlert("error", message);
                if (error && error.errors) {
                    Object.keys(error.errors).forEach((key) => {
                        const fieldError = error.errors[key];
                        const fieldName = fieldError && fieldError.field ? fieldError.field : key;
                        const fieldMessage = fieldError && fieldError.message ? fieldError.message : fieldError;
                        if (fieldMap[fieldName] && fieldMap[fieldName].input) {
                            setFieldState(fieldMap[fieldName].input, false, fieldMessage);
                        }
                    });
                }
            })
            .finally(() => {
                isSubmitting = false;
                setLoading(false);
            });
    };

    const loadRecaptchaScript = () => {
        if (!recaptchaKey || recaptchaKey === "YOUR_SITE_KEY") {
            return Promise.resolve(false);
        }

        if (recaptchaVersion === "v2") {
            return Promise.resolve(true);
        }

        if (window.grecaptcha && typeof window.grecaptcha.execute === "function") {
            return Promise.resolve(true);
        }

        return new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-recaptcha="v3"]');
            if (existing) {
                existing.addEventListener("load", () => resolve(true));
                existing.addEventListener("error", () => reject(new Error("reCAPTCHA script failed to load.")));
                return;
            }

            const script = document.createElement("script");
            script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(recaptchaKey)}`;
            script.async = true;
            script.defer = true;
            script.dataset.recaptcha = "v3";
            script.addEventListener("load", () => resolve(true));
            script.addEventListener("error", () => reject(new Error("reCAPTCHA script failed to load.")));
            document.head.appendChild(script);
        });
    };

    const runRecaptcha = () => {
        if (recaptchaVersion === "v2") {
            const token = getRecaptchaV2Token();
            if (!token) {
                setAlert("error", "Please complete the reCAPTCHA.");
                isSubmitting = false;
                setLoading(false);
                return;
            }
            // Ensure backend receives token under `recaptcha_token`
            ensureRecaptchaHidden(token);
            sendForm();
            return;
        }

        if (!recaptchaInput) {
            sendForm();
            return;
        }

        loadRecaptchaScript()
            .then((loaded) => {
                if (!loaded || !window.grecaptcha) {
                    sendForm();
                    return;
                }

                window.grecaptcha.ready(() => {
                    window.grecaptcha.execute(recaptchaKey, { action: "contact" })
                        .then((token) => {
                            // ensure hidden input exists and set token
                            ensureRecaptchaHidden(token || "");
                            sendForm();
                        })
                        .catch(() => {
                            setAlert("error", "reCAPTCHA validation failed. Please try again.");
                            isSubmitting = false;
                            setLoading(false);
                        });
                });
            })
            .catch(() => {
                setAlert("error", "reCAPTCHA could not be loaded. Please try again.");
                isSubmitting = false;
                setLoading(false);
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

    function ensureRecaptchaHidden(value) {
        let hidden = document.getElementById("recaptcha-token");
        if (!hidden) {
            hidden = document.createElement("input");
            hidden.type = "hidden";
            hidden.name = "recaptcha_token";
            hidden.id = "recaptcha-token";
            form.appendChild(hidden);
        }
        hidden.value = value;

        let responseInput = form.querySelector('[name="g-recaptcha-response"]');
        if (!responseInput) {
            responseInput = document.createElement("input");
            responseInput.type = "hidden";
            responseInput.name = "g-recaptcha-response";
            responseInput.id = "g-recaptcha-response";
            form.appendChild(responseInput);
        }
        responseInput.value = value;

        const externalResponseInput = document.querySelector('[name="g-recaptcha-response"]');
        if (externalResponseInput && externalResponseInput !== responseInput) {
            externalResponseInput.value = value;
        }
    }

    function getRecaptchaV2Token() {
        if (window.grecaptcha && typeof window.grecaptcha.getResponse === "function") {
            const token = window.grecaptcha.getResponse();
            if (token) {
                return token;
            }
        }

        const responseInput = form.querySelector('[name="g-recaptcha-response"]')
            || document.querySelector('[name="g-recaptcha-response"]');
        return responseInput ? responseInput.value : "";
    }

    function getStoredRecaptchaToken() {
        const responseInput = form.querySelector('[name="g-recaptcha-response"]')
            || document.querySelector('[name="g-recaptcha-response"]');
        if (responseInput && responseInput.value) {
            return responseInput.value;
        }

        const hidden = document.getElementById("recaptcha-token");
        return hidden ? hidden.value : "";
    }

    function getSubmissionErrorMessage(error) {
        if (error && error.message && error.message.trim()) {
            return error.message;
        }

        if (error && error.error && String(error.error).trim()) {
            return String(error.error);
        }

        if (error && Array.isArray(error.errors)) {
            const messages = error.errors
                .map((item) => item && item.message ? item.message : "")
                .filter(Boolean);
            if (messages.length > 0) {
                return messages.join(" ");
            }
        }

        if (error && error.errors && typeof error.errors === "object") {
            const messages = Object.keys(error.errors)
                .map((key) => {
                    const item = error.errors[key];
                    return item && item.message ? item.message : item;
                })
                .filter(Boolean);
            if (messages.length > 0) {
                return messages.join(" ");
            }
        }

        if (error && error.status) {
            return `Unable to send your message. Formspree returned HTTP ${error.status}.`;
        }

        return "Unable to send your message. Please try again.";
    }
}
