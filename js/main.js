/**
 * LIFEHOUSE CASA DE VIDA — v4
 * Main Interactive Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    initScrollProgress();
    initHeaderAndNav();
    initUnifiedFooter();
    initPageContent();
    initFastNavigation();
});

function initPageContent() {
    initRevealAnimations();
    initGalleryLoading();
    initHeroSlides();
    initSirveMosaic();
    initCarousel();
    initTabs();
    initProgressBars();
    initContactForm();

    const todayCard = document.querySelector('.lec-day-card.active-day');
    if (todayCard) todayCard.classList.add('open');
}

// Navegación progresiva para las páginas de contenido. Home, Sirve y los
// formularios conservan la recarga tradicional porque manejan intervalos o
// dependencias propias que deben iniciar desde un documento limpio.
function initFastNavigation() {
    if (!window.fetch || !window.history?.pushState || !window.DOMParser) return;

    const fastPages = new Set([
        '/casas.html',
        '/clay.html',
        '/conpasion.html',
        '/dar.html',
        '/eventos.html',
        '/lectura.html',
        '/nosotros.html',
        '/reuniones.html',
    ]);
    const pageCache = new Map();
    let navigating = false;

    const normalizedPath = (url) => {
        const path = url.pathname.replace(/\/{2,}/g, '/');
        return path === '/' ? '/index.html' : path;
    };

    const canNavigateFast = (url) => (
        url.origin === window.location.origin &&
        fastPages.has(normalizedPath(url)) &&
        fastPages.has(normalizedPath(window.location))
    );

    const ensureContentContainer = (doc) => {
        let container = doc.getElementById('pjax-content');
        if (container) return container;

        const header = doc.querySelector('header.site-header');
        const footer = doc.querySelector('footer.site-footer');
        if (!header || !footer) return null;

        container = doc.createElement('div');
        container.id = 'pjax-content';
        header.after(container);

        let node = container.nextSibling;
        while (node && node !== footer) {
            const next = node.nextSibling;
            container.appendChild(node);
            node = next;
        }
        return container;
    };

    const fetchPage = async (url) => {
        const key = url.origin + url.pathname + url.search;
        if (pageCache.has(key)) return pageCache.get(key);

        const request = fetch(key, {
            headers: { 'X-Requested-With': 'LifeHouse-PJAX' },
            credentials: 'same-origin',
        }).then(async (response) => {
            if (!response.ok) throw new Error(`No se pudo cargar ${response.status}`);
            const html = await response.text();
            return new DOMParser().parseFromString(html, 'text/html');
        }).catch((error) => {
            pageCache.delete(key);
            throw error;
        });

        pageCache.set(key, request);
        if (pageCache.size > 8) pageCache.delete(pageCache.keys().next().value);
        return request;
    };

    const syncPageStyles = async (nextDocument, targetUrl) => {
        const resolveHref = (link, base) => new URL(link.getAttribute('href'), base).href;
        const isPageStyle = (href) => href.includes('/css/pages/');
        const targetStyles = Array.from(nextDocument.querySelectorAll('link[rel="stylesheet"][href]'))
            .map((link) => resolveHref(link, targetUrl))
            .filter(isPageStyle);
        const currentStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'))
            .filter((link) => isPageStyle(link.href));

        await Promise.all(targetStyles.map((href) => {
            if (currentStyles.some((link) => link.href === href)) return Promise.resolve();
            return new Promise((resolve, reject) => {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = href;
                link.dataset.pjaxPageStyle = '';
                link.onload = resolve;
                link.onerror = reject;
                document.head.appendChild(link);
            });
        }));

        currentStyles.forEach((link) => {
            if (!targetStyles.includes(link.href)) link.remove();
        });
    };

    const updateHead = (nextDocument) => {
        document.title = nextDocument.title;
        const nextDescription = nextDocument.querySelector('meta[name="description"]')?.content;
        const currentDescription = document.querySelector('meta[name="description"]');
        if (nextDescription && currentDescription) currentDescription.content = nextDescription;
    };

    const restoreScroll = (url, savedScroll) => {
        requestAnimationFrame(() => {
            if (url.hash) {
                const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
                if (target) {
                    target.scrollIntoView();
                    return;
                }
            }
            window.scrollTo(0, Number.isFinite(savedScroll) ? savedScroll : 0);
        });
    };

    const navigate = async (url, { push = true, savedScroll = 0 } = {}) => {
        if (navigating) return;
        navigating = true;
        document.documentElement.classList.add('is-page-loading');
        document.body.setAttribute('aria-busy', 'true');

        try {
            const nextDocument = await fetchPage(url);
            const currentContent = ensureContentContainer(document);
            const nextContent = ensureContentContainer(nextDocument);
            if (!currentContent || !nextContent) throw new Error('La página no tiene contenedor navegable');

            await syncPageStyles(nextDocument, url);
            const nextNodes = Array.from(nextContent.childNodes).map((node) => document.importNode(node, true));

            const swap = () => {
                currentContent.replaceChildren(...nextNodes);
                document.body.className = nextDocument.body.className;
                updateHead(nextDocument);
                initPageContent();
            };

            if (push) {
                history.replaceState({ ...(history.state || {}), pjax: true, scrollY: window.scrollY }, '', window.location.href);
                history.pushState({ pjax: true, scrollY: 0 }, '', url.href);
            }

            if (document.startViewTransition) {
                const transition = document.startViewTransition(swap);
                await transition.updateCallbackDone;
            } else {
                swap();
            }
            restoreScroll(url, savedScroll);
        } catch (error) {
            console.warn('Navegación rápida no disponible; se usará la carga normal.', error);
            window.location.href = url.href;
        } finally {
            navigating = false;
            document.documentElement.classList.remove('is-page-loading');
            document.body.removeAttribute('aria-busy');
        }
    };

    ensureContentContainer(document);
    history.scrollRestoration = 'manual';
    history.replaceState({ ...(history.state || {}), pjax: true, scrollY: window.scrollY }, '', window.location.href);

    document.addEventListener('click', (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest('a[href]');
        if (!link || link.target === '_blank' || link.hasAttribute('download') || link.dataset.noPjax !== undefined) return;

        const url = new URL(link.href, window.location.href);
        if (!canNavigateFast(url)) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;

        event.preventDefault();
        navigate(url);
    });

    const prefetchLink = (event) => {
        const link = event.target.closest?.('a[href]');
        if (!link) return;
        const url = new URL(link.href, window.location.href);
        if (canNavigateFast(url)) fetchPage(url).catch(() => {});
    };
    document.addEventListener('pointerover', prefetchLink, { passive: true });
    document.addEventListener('focusin', prefetchLink);

    window.addEventListener('popstate', (event) => {
        const url = new URL(window.location.href);
        if (!fastPages.has(normalizedPath(url))) {
            window.location.reload();
            return;
        }
        navigate(url, { push: false, savedScroll: event.state?.scrollY || 0 });
    });
}

// Mantiene el footer completo del home en todas las paginas internas que ya
// cuentan con footer, sin alterar el markup del home.
function initUnifiedFooter() {
    const footer = document.querySelector('footer.site-footer');
    if (!footer || footer.querySelector('.footer-col--cta')) return;

    footer.innerHTML = `
      <div class="container">
        <div class="footer-top">
          <div class="footer-brand">
            <div class="footer-brand-logo">
              <img src="assets/logo.jpeg" alt="Logo">
              <div>
                <div class="footer-brand-name">LifeHouse</div>
                <div class="footer-brand-sub">Casa de Vida</div>
              </div>
            </div>
            <p>Somos una iglesia en La Paz enfocada en construir familias sanas y compartir el amor de Jesús con nuestra ciudad.</p>
            <div class="footer-info">
              <div class="f-info-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>Av. Ecuador 2211, subsuelo · La Paz, Bolivia</span>
              </div>
              <a href="tel:73501744" class="f-info-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.61a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.7 16l.22.92z"/></svg>
                <span>73501744</span>
              </a>
              <a href="mailto:lifehouse01@gmail.com" class="f-info-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <span>lifehouse01@gmail.com</span>
              </a>
            </div>
          </div>

          <div class="footer-col">
            <h4>Horarios</h4>
            <div class="f-schedule">
              <div class="f-sched-item">
                <span class="f-sched-day">Domingo</span>
                <div class="f-sched-times"><span class="f-sched-time">9:00 AM</span><span class="f-sched-time">11:00 AM</span></div>
              </div>
              <div class="f-sched-item"><span class="f-sched-day">Online</span><span class="f-sched-time">12:00 PM</span></div>
            </div>
          </div>

          <div class="footer-col">
            <h4>Explora</h4>
            <a href="nosotros.html">Nosotros</a>
            <a href="casas.html">Conecta</a>
            <a href="lectura.html">Crece</a>
            <a href="sirve.html">Sirve</a>
            <a href="eventos.html">Eventos</a>
            <a href="registro.html">Planea tu visita</a>
          </div>

          <div class="footer-col">
            <h4>Síguenos</h4>
            <a href="https://www.instagram.com/lifehouse_casadevida/" target="_blank" class="f-social-row">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              <span>@lifehouse_casadevida</span>
            </a>
            <a href="https://www.facebook.com/LifeHouseCasadeVidaMinisterio/" target="_blank" class="f-social-row">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              <span>LifeHouse Casa de Vida</span>
            </a>
            <a href="https://www.youtube.com/@lifehouseiglesia" target="_blank" class="f-social-row">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>
              <span>@lifehouseiglesia</span>
            </a>
            <a href="https://wa.me/59173501744" target="_blank" class="f-social-row">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
              <span>WhatsApp</span>
            </a>
          </div>

          <div class="footer-col footer-col--cta">
            <h4>Contacto</h4>
            <p class="f-cta-text">¿Tienes preguntas o necesitas ayuda? Estamos aquí para ti.</p>
            <a href="index.html#contacto" class="btn btn-gold f-btn">
              <span>Contáctanos</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
            <a href="https://wa.me/59173501744?text=Hola%2C%20quisiera%20pedir%20oraci%C3%B3n%20por" target="_blank" class="f-prayer-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              Pedir Oración
            </a>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© 2026 LifeHouse Casa de Vida. Todos los derechos reservados.</span>
          <span>La Paz, Bolivia</span>
        </div>
      </div>`;
}

// Mantiene el espacio del carrusel desde el primer render y retira el estado
// de carga de cada foto apenas termina de decodificarse.
function initGalleryLoading() {
    const gallery = document.querySelector('.gallery-2rows');
    if (!gallery || gallery.dataset.galleryInitialized === 'true') return;

    const galleryImages = Array.from({ length: 30 }, (_, index) => {
        const frame = String(index + 5).padStart(2, '0');
        const sequence = index + 1;
        return `assets/Home/carrusel webp/PICS FRAME 4 -${frame}_${sequence}_11zon.webp`;
    });

    const buildGallery = () => {
      if (gallery.dataset.galleryInitialized === 'true') return;
      gallery.dataset.galleryInitialized = 'true';

      gallery.querySelectorAll('[data-gallery-row]').forEach((row, rowIndex) => {
        const track = row.querySelector('.g-track');
        if (!track || track.children.length) return;

        const rowImages = galleryImages.filter((_, index) => index % 2 === rowIndex);
        const inner = document.createElement('div');
        inner.className = 'g-inner';

        rowImages.forEach((src, index) => {
            const img = document.createElement('img');
            if (index < 5) img.src = src;
            else img.dataset.src = src;
            img.alt = '';
            img.decoding = 'async';
            img.loading = 'lazy';
            inner.appendChild(img);
        });

        track.append(inner, inner.cloneNode(true));
      });

      gallery.querySelectorAll('img').forEach(img => {
        const markLoaded = () => img.classList.add('is-loaded');
        if (img.complete && img.naturalWidth > 0) markLoaded();
        else img.addEventListener('load', markLoaded, { once: true });
      });

      const hydrateRemaining = () => {
        gallery.querySelectorAll('img[data-src]').forEach(img => {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        });
      };
      window.addEventListener('scroll', hydrateRemaining, { once: true, passive: true });
      window.setTimeout(hydrateRemaining, 6000);
    };

    if (!('IntersectionObserver' in window)) {
      buildGallery();
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      buildGallery();
    }, { rootMargin: '150px 0px' });
    observer.observe(gallery);
}

// ── SCROLL PROGRESS BAR
function initScrollProgress() {
    const progressBar = document.getElementById('scroll-progress');
    if (!progressBar) return;

    window.addEventListener('scroll', () => {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        progressBar.style.width = scrolled + '%';
    }, { passive: true });
}

// ── HEADER STATE & MOBILE MENU
function initHeaderAndNav() {
    const header = document.getElementById('header');
    const toggle = document.getElementById('mobileToggle');
    const mobNav = document.getElementById('mobileNav');

    if (header) {
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 50);
        }, { passive: true });
    }

    if (toggle && mobNav) {
        toggle.addEventListener('click', () => {
            const isOpen = toggle.classList.toggle('open');
            mobNav.classList.toggle('open');
            toggle.setAttribute('aria-expanded', isOpen);
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });

        document.querySelectorAll('.mobile-nav-link').forEach(l => {
            l.addEventListener('click', () => {
                toggle.classList.remove('open');
                mobNav.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            });
        });
    }
}

// ── REVEAL ON SCROLL ANIMATIONS
function initRevealAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('visible');
                observer.unobserve(e.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ── CAROUSEL INTERACTION (CLAY/GALLERY)
function initCarousel() {
    const carousel = document.getElementById('clayCarousel');
    const btnNext = document.getElementById('cNext');
    const btnPrev = document.getElementById('cPrev');
    
    if (!carousel) return;

    const items = carousel.querySelectorAll('.carousel-item');
    if (items.length === 0) return;

    let currentIndex = 0;
    const totalItems = items.length;

    function getItemWidth() {
        const gap = parseFloat(getComputedStyle(carousel).gap) || 16;
        return items[0].offsetWidth + gap;
    }

    function getVisibleCount() {
        return Math.max(1, Math.round(carousel.offsetWidth / getItemWidth()));
    }

    function snapToIndex(index) {
        const visible = getVisibleCount();
        const maxIndex = Math.max(0, totalItems - visible);
        currentIndex = Math.max(0, Math.min(index, maxIndex));
        const itemW = getItemWidth();
        carousel.scrollTo({ left: currentIndex * itemW, behavior: 'smooth' });
    }

    if (btnNext) {
        btnNext.addEventListener('click', () => snapToIndex(currentIndex + 1));
    }
    if (btnPrev) {
        btnPrev.addEventListener('click', () => snapToIndex(currentIndex - 1));
    }

    let isDown = false, startX, scrollLeft;

    carousel.addEventListener('mousedown', e => {
        isDown = true;
        startX = e.pageX - carousel.offsetLeft;
        scrollLeft = carousel.scrollLeft;
    });
    carousel.addEventListener('mouseleave', () => isDown = false);
    carousel.addEventListener('mouseup', () => {
        isDown = false;
        currentIndex = Math.round(carousel.scrollLeft / getItemWidth());
    });
    carousel.addEventListener('mousemove', e => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - carousel.offsetLeft;
        const walk = (x - startX) * 2;
        carousel.scrollLeft = scrollLeft - walk;
    });

    carousel.addEventListener('touchstart', e => {
        startX = e.touches[0].pageX - carousel.offsetLeft;
        scrollLeft = carousel.scrollLeft;
    }, { passive: true });
    carousel.addEventListener('touchmove', e => {
        const x = e.touches[0].pageX - carousel.offsetLeft;
        const walk = (x - startX) * 2;
        carousel.scrollLeft = scrollLeft - walk;
    }, { passive: true });
    carousel.addEventListener('touchend', () => {
        currentIndex = Math.round(carousel.scrollLeft / getItemWidth());
    });
}

// ── HERO SLIDESHOW
function initHeroSlides() {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    const hero = document.getElementById('hero');
    const word = document.getElementById('heroCycleWord');
    if (slides.length === 0) return;

    let current = 0;
    let interval;
    const delay = 4000;
    const compactHero = window.matchMedia('(max-width: 768px)');
    const states = [
        { key: 'familia', word: 'FAMILIA' },
        { key: 'comunidad', word: 'COMUNIDAD' },
        { key: 'lifehouse', word: 'LIFEHOUSE' }
    ];

    function hydrateSlide(slide) {
        slide?.querySelectorAll('img[data-src]').forEach(img => {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        });
    }

    function goTo(index) {
        current = (index + slides.length) % slides.length;
        hydrateSlide(slides[compactHero.matches ? 1 : current]);
        if (word) word.classList.add('hero-cycle--switching');

        window.setTimeout(() => {
            slides.forEach(s => s.classList.remove('active'));
            dots.forEach(d => d.classList.remove('active'));
            slides[compactHero.matches ? 1 : current].classList.add('active');
            dots[current]?.classList.add('active');
            const visualState = compactHero.matches ? states[1].key : states[current].key;
            hero.dataset.heroState = visualState;
            document.body.dataset.heroState = visualState;
            if (word) {
                word.textContent = states[current].word;
                word.classList.remove('hero-cycle--switching');
            }
        }, 450);
    }

    function next() { goTo(current + 1); }
    function start() { stop(); interval = setInterval(next, delay); }
    function stop() { clearInterval(interval); }

    dots.forEach((dot, i) => {
        dot.addEventListener('click', () => { goTo(i); start(); });
    });

    if (hero) {
        hero.addEventListener('mouseenter', stop);
        hero.addEventListener('mouseleave', start);
    }

    function syncVisualMode() {
        hydrateSlide(slides[compactHero.matches ? 1 : current]);
        slides.forEach(s => s.classList.remove('active'));
        slides[compactHero.matches ? 1 : current].classList.add('active');
        const visualState = compactHero.matches ? states[1].key : states[current].key;
        hero.dataset.heroState = visualState;
        document.body.dataset.heroState = visualState;
    }

    compactHero.addEventListener('change', syncVisualMode);
    syncVisualMode();
    const preloadSlides = () => window.setTimeout(() => slides.forEach(hydrateSlide), 200);
    if (document.readyState === 'complete') preloadSlides();
    else window.addEventListener('load', preloadSlides, { once: true });
    start();
}

// ── SIRVE: MOSAICO ESTILO brand.dropbox.com (pagina sirve.html)
// La tarjeta central (intro + isotipo) arranca grande; las tarjetas de
// servicio arrancan invisibles y "adentro" de esa tarjeta central. Segun
// se hace scroll dentro de la seccion, la central se encoge hasta quedar
// solo el isotipo, y las demas se separan/agrandan hasta formar el mosaico.
function initSirveMosaic() {
    const section = document.getElementById('sirveMosaicSection');
    if (!section) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return; // el CSS ya deja todo visible y estatico

    const center = document.getElementById('mosaicCenter');
    const centerIntro = document.getElementById('mosaicCenterIntro');
    const centerLogo = document.getElementById('mosaicCenterLogo');
    const cards = Array.from(section.querySelectorAll('.mosaic-tile.sirve-card'));

    if (!center || cards.length === 0) return;
    initSirveCardToggles(cards);

    const clamp01 = value => Math.max(0, Math.min(1, value));
    const easeOutCubic = value => 1 - Math.pow(1 - clamp01(value), 3);
    const easeInOutCubic = value => {
        const t = clamp01(value);
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };
    const easeOutQuad = value => {
        const t = clamp01(value);
        return 1 - (1 - t) * (1 - t);
    };

    // Guardamos toda la geometria fuera del ciclo de scroll. Mezclar lecturas
    // de layout con escrituras de transform en cada frame provoca tirones,
    // especialmente en navegadores moviles cuando aparece/desaparece su barra.
    const geometry = {
        sectionTop: 0,
        scrollDistance: 1,
        centerStartScale: 1
    };
    let measuredViewportWidth = document.documentElement.clientWidth;
    let currentProgress = 0;
    let targetProgress = 0;
    let smoothingFrame = null;

    // Calcula, para cada tarjeta, cuanto tiene que moverse desde el centro
    // de la tarjeta central hasta su propia posicion final en la grilla.
    function measure() {
        center.style.transform = 'none';
        cards.forEach(card => { card.style.transform = 'none'; });

        const viewportHeight = document.documentElement.clientHeight;
        const sectionRect = section.getBoundingClientRect();
        const centerRect = center.getBoundingClientRect();
        const centerX = centerRect.left + centerRect.width / 2;
        const centerY = centerRect.top + centerRect.height / 2;

        geometry.sectionTop = sectionRect.top + window.scrollY;
        geometry.scrollDistance = Math.max(1, section.offsetHeight - viewportHeight);

        cards.forEach(card => {
            const r = card.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            card.__dx = centerX - cx;
            card.__dy = centerY - cy;
        });

        const viewportWidth = document.documentElement.clientWidth;
        const requestedStartScale = viewportWidth < 700 ? 1.48 : viewportWidth < 1024 ? 1.82 : 3.25;

        if (viewportWidth >= 1024) {
            const headerBottom = document.getElementById('header')?.getBoundingClientRect().bottom || 0;
            const baseHalfHeight = Math.max(1, centerRect.height / 2);
            const maxScaleTop = (centerY - headerBottom - 18) / baseHalfHeight;
            const maxScaleBottom = (viewportHeight - 18 - centerY) / baseHalfHeight;
            geometry.centerStartScale = Math.max(1, Math.min(requestedStartScale, maxScaleTop, maxScaleBottom));
        } else {
            geometry.centerStartScale = requestedStartScale;
        }

        measuredViewportWidth = viewportWidth;

        currentProgress = getTargetProgress();
        targetProgress = currentProgress;
        update(currentProgress);
    }

    function getTargetProgress() {
        return clamp01((window.scrollY - geometry.sectionTop) / geometry.scrollDistance);
    }

    function update(progress) {
        const viewportWidth = document.documentElement.clientWidth;
        const isMobileMosaic = viewportWidth < 700;
        const travel = isMobileMosaic ? easeOutQuad(progress) : easeInOutCubic(progress);
        const centerTravel = isMobileMosaic ? easeOutCubic(progress / 0.68) : travel;
        const cardProgress = easeOutCubic((progress - (isMobileMosaic ? 0.025 : 0.08)) / (isMobileMosaic ? 0.82 : 0.82));

        cards.forEach((card, index) => {
            const stagger = isMobileMosaic ? index * 0.012 : index * 0.025;
            const localProgress = easeOutCubic((progress - (isMobileMosaic ? 0.02 : 0.06) - stagger) / (isMobileMosaic ? 0.78 : 0.72));
            const dx = (card.__dx || 0) * (1 - localProgress);
            const dy = (card.__dy || 0) * (1 - localProgress);
            const scale = 0.16 + 0.84 * localProgress;
            const rotateAmount = isMobileMosaic ? 1.25 : 3.5;
            const rotate = (1 - localProgress) * ((index % 2 === 0 ? -1 : 1) * rotateAmount);
            card.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${scale}) rotate(${rotate}deg)`;
            card.style.opacity = String(clamp01((cardProgress - stagger) / (isMobileMosaic ? 0.68 : 0.7)));
        });

        const centerScale = geometry.centerStartScale - (geometry.centerStartScale - 1) * centerTravel;
        center.style.transform = `scale(${centerScale})`;

        const textFade = isMobileMosaic
            ? 1 - easeInOutCubic(progress / 0.56)
            : 1 - easeOutCubic(progress / 0.48);
        if (centerIntro) {
            centerIntro.style.opacity = String(textFade);
            centerIntro.style.transform = `scale(${0.96 + 0.04 * textFade})`;
            centerIntro.style.pointerEvents = progress > (isMobileMosaic ? 0.62 : 0.52) ? 'none' : '';
        }
        if (centerLogo) {
            // El isotipo arranca oculto (para no superponerse al texto) y va
            // apareciendo/creciendo a medida que el texto se desvanece, hasta
            // quedar como unico contenido de la tarjeta central.
            const logoAppear = easeOutCubic((progress - (isMobileMosaic ? 0.2 : 0.3)) / (isMobileMosaic ? 0.44 : 0.45));
            centerLogo.style.opacity = String(logoAppear);
            const logoScale = 0.72 + 0.28 * logoAppear;
            centerLogo.style.transform = `scale(${logoScale})`;
        }
    }

    let ticking = false;
    function animateMobileProgress() {
        smoothingFrame = null;
        const delta = targetProgress - currentProgress;

        if (Math.abs(delta) < 0.002) {
            currentProgress = targetProgress;
            update(currentProgress);
            return;
        }

        currentProgress += delta * 0.32;
        update(currentProgress);
        smoothingFrame = requestAnimationFrame(animateMobileProgress);
    }

    function onScroll() {
        const viewportWidth = document.documentElement.clientWidth;
        targetProgress = getTargetProgress();

        if (viewportWidth < 700) {
            if (!smoothingFrame) smoothingFrame = requestAnimationFrame(animateMobileProgress);
            return;
        }

        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            currentProgress = targetProgress;
            update(currentProgress);
            ticking = false;
        });
    }

    let resizeTimer;
    function onResize() {
        const currentWidth = document.documentElement.clientWidth;

        // En movil la interfaz del navegador cambia solo la altura del viewport
        // mientras se hace scroll. El mosaico usa svh, asi que no necesita una
        // medicion nueva hasta que cambie el ancho (rotacion o resize real).
        if (currentWidth === measuredViewportWidth && currentWidth < 1025) return;

        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(measure, 150);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(measure, 250);
    });
    measure();
}

function initSirveCardToggles(cards) {
    const modal = document.createElement('div');
    modal.className = 'sirve-card-modal';
    modal.innerHTML = `
        <div class="sirve-card-modal-panel" role="dialog" aria-modal="true" aria-labelledby="sirveCardModalTitle">
            <div class="sirve-card-modal-head">
                <h3 class="sirve-card-modal-title" id="sirveCardModalTitle"></h3>
                <button class="sirve-card-modal-close" type="button" aria-label="Cerrar">×</button>
            </div>
            <div class="sirve-card-modal-body"></div>
        </div>
    `;
    document.body.appendChild(modal);

    const modalTitle = modal.querySelector('.sirve-card-modal-title');
    const modalBody = modal.querySelector('.sirve-card-modal-body');
    const modalClose = modal.querySelector('.sirve-card-modal-close');

    function closeModal() {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }

    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', event => {
        if (event.target === modal) closeModal();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && modal.classList.contains('open')) closeModal();
    });

    cards.forEach(card => {
        if (card.querySelector('.sirve-card-toggle')) return;

        card.classList.add('is-collapsed');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sirve-card-toggle';
        button.textContent = 'Ver más';
        button.setAttribute('aria-expanded', 'false');

        button.addEventListener('click', () => {
            const title = card.querySelector('h3')?.textContent || 'Área de servicio';
            const description = card.querySelector('p:not(.sirve-card-meta)')?.cloneNode(true);
            const meta = card.querySelector('.sirve-card-meta')?.cloneNode(true);
            const actions = card.querySelector('.sirve-card-actions')?.cloneNode(true);
            const singleAction = card.querySelector(':scope > .btn')?.cloneNode(true);

            modalTitle.textContent = title;
            modalBody.innerHTML = '';
            if (description) modalBody.appendChild(description);
            if (meta) modalBody.appendChild(meta);
            if (actions) {
                actions.classList.add('sirve-card-modal-actions');
                modalBody.appendChild(actions);
            } else if (singleAction) {
                const actionWrap = document.createElement('div');
                actionWrap.className = 'sirve-card-modal-actions';
                actionWrap.appendChild(singleAction);
                modalBody.appendChild(actionWrap);
            }

            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
        });

        const action = card.querySelector('.sirve-card-actions, .btn');
        card.insertBefore(button, action || null);
    });
}

// ── TAB SYSTEM (EVENTS/GENERAL)
function initTabs() {
    const tabs = document.querySelectorAll('.e-tab');
    const panels = document.querySelectorAll('.e-panel');
    
    if (tabs.length === 0) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.tab;
            if (!targetId) return;

            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            
            tab.classList.add('active');
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) targetPanel.classList.add('active');
        });
    });
}

/**
 * LECTURA PAGE HELPERS
 */
function toggleDay(card) {
    const isOpen = card.classList.contains('open');
    document.querySelectorAll('.lec-day-card').forEach(c => c.classList.remove('open'));
    if (!isOpen) card.classList.add('open');
}
window.toggleDay = toggleDay;

// ── CONTACT FORM (index.html)
function loadScriptOnce(src) {
    const absoluteSrc = new URL(src, window.location.href).href;
    const existing = Array.from(document.scripts).find(script => script.src === absoluteSrc);
    if (existing?.dataset.loaded === 'true') return Promise.resolve();

    return new Promise((resolve, reject) => {
        const script = existing || document.createElement('script');
        script.addEventListener('load', () => {
            script.dataset.loaded = 'true';
            resolve();
        }, { once: true });
        script.addEventListener('error', reject, { once: true });
        if (!existing) {
            script.src = src;
            document.head.appendChild(script);
        }
    });
}

function loadStyleOnce(href) {
    const absoluteHref = new URL(href, window.location.href).href;
    if (Array.from(document.styleSheets).some(sheet => sheet.href === absoluteHref)) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = resolve;
        link.onerror = reject;
        document.head.appendChild(link);
    });
}

function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form || form.dataset.contactInitialized === 'true') return;
    form.dataset.contactInitialized = 'true';

    const phoneInput = document.getElementById('conPhone');
    let iti;
    let dependenciesPromise;
    const prepareDependencies = () => {
        if (dependenciesPromise) return dependenciesPromise;
        dependenciesPromise = Promise.all([
            loadStyleOnce('assets/vendor/intl-tel-input/intlTelInput.css'),
            loadScriptOnce('assets/vendor/supabase/supabase.js'),
            loadScriptOnce('assets/vendor/intl-tel-input/intlTelInput.min.js'),
        ]).then(() => loadScriptOnce('js/supabase.js?v=2')).then(() => {
            if (phoneInput && !iti && typeof window.intlTelInput !== 'undefined') {
                iti = window.intlTelInput(phoneInput, {
                    initialCountry: 'bo',
                    separateDialCode: true,
                    loadUtilsOnInit: 'assets/vendor/intl-tel-input/utils.js',
                });
            }
        });
        return dependenciesPromise;
    };

    form.addEventListener('focusin', () => prepareDependencies().catch(console.error), { once: true });

    const msg = document.getElementById('conMsg');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
            await prepareDependencies();
        } catch (error) {
            msg.textContent = 'No se pudo preparar el formulario. Revisa tu conexión e intenta de nuevo.';
            msg.style.color = '#e74c3c';
            console.error(error);
            return;
        }

        const nombre = document.getElementById('conNombre').value.trim();
        const apellido = document.getElementById('conApellido').value.trim();
        const email = document.getElementById('conEmail').value.trim();
        const mensaje = document.getElementById('conMensaje').value.trim();
        const phone = iti ? iti.getNumber() : (phoneInput ? phoneInput.value.trim() : '');

        if (!nombre || !apellido || !email || !mensaje) {
            msg.textContent = 'Llena todos los campos obligatorios (*).';
            msg.style.color = '#e74c3c';
            return;
        }

        msg.textContent = 'Enviando...';
        msg.style.color = '';

        try {
            const { error } = await supabase.from('members').insert({
                first_name: nombre,
                last_name: apellido,
                email: email,
                phone: phone || null,
                notes: mensaje,
                registered_by: 'website',
            });

            if (error) throw error;

            msg.textContent = '¡Gracias! Te contactaremos pronto.';
            msg.style.color = '#2ecc71';
            form.reset();
            if (iti) iti.setNumber('');
        } catch (err) {
            msg.textContent = 'Error al enviar. Intenta de nuevo.';
            msg.style.color = '#e74c3c';
            console.error(err);
        }
    });
}

function filterDays(btn, status) {
    document.querySelectorAll('.lec-filter-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const cards = document.querySelectorAll('.lec-day-card');
    cards.forEach(c => {
        if (status === 'all' || c.dataset.status === status) {
            c.style.display = 'block';
        } else {
            c.style.display = 'none';
        }
    });
}
window.filterDays = filterDays;

function filterCasas(btn, type) {
    document.querySelectorAll('.casa-filter-btn').forEach(button => button.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.casa-full-card').forEach(card => {
        const visible = type === 'all' || card.dataset.type === type;
        card.style.display = visible ? 'flex' : 'none';
        if (visible) card.classList.add('visible');
    });
}
window.filterCasas = filterCasas;

/**
 * PROGRESS BARS ANIMATION
 */
function initProgressBars() {
    const progressObserver = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                const target = e.target.dataset.target || e.target.style.width;
                e.target.style.width = target;
                progressObserver.unobserve(e.target);
            }
        });
    }, { threshold: 0.3 });

    document.querySelectorAll('.lec-progress-fill, .lec-mini-bar, .lec-book-thumb-bar').forEach(bar => {
        const target = bar.style.width;
        bar.dataset.target = target;
        bar.style.width = '0';
        progressObserver.observe(bar);
    });
}
