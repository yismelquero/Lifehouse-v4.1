/**
 * LIFEHOUSE CASA DE VIDA — v4
 * Main Interactive Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    initScrollProgress();
    initHeaderAndNav();
    initRevealAnimations();
    initGalleryLoading();
    initHeroSlides();
    initHeroWordCycle();
    initSirveMosaic();
    initCarousel();
    initTabs();
    initProgressBars();
    initContactForm();

    // Auto-open today's card if on lectura page
    const todayCard = document.querySelector('.lec-day-card.active-day');
    if (todayCard) todayCard.classList.add('open');
});

// Mantiene el espacio del carrusel desde el primer render y retira el estado
// de carga de cada foto apenas termina de decodificarse.
function initGalleryLoading() {
    document.querySelectorAll('.gallery-2rows img').forEach(img => {
        const markLoaded = () => img.classList.add('is-loaded');
        if (img.complete && img.naturalWidth > 0) markLoaded();
        else img.addEventListener('load', markLoaded, { once: true });
    });
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
    if (slides.length === 0) return;

    let current = 0;
    let interval;
    const delay = 5000;

    function goTo(index) {
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        current = (index + slides.length) % slides.length;
        slides[current].classList.add('active');
        dots[current].classList.add('active');
    }

    function next() { goTo(current + 1); }
    function start() { stop(); interval = setInterval(next, delay); }
    function stop() { clearInterval(interval); }

    dots.forEach((dot, i) => {
        dot.addEventListener('click', () => { goTo(i); start(); });
    });

    const hero = document.getElementById('hero');
    if (hero) {
        hero.addEventListener('mouseenter', stop);
        hero.addEventListener('mouseleave', start);
    }

    start();
}

// ── HERO WORD CYCLE ("Somos" + una familia / una iglesia / LifeHouse)
// Pasa una sola vez por las 3 frases y se queda fija en la ultima
// (LifeHouse) el resto del tiempo que la persona navegue la pagina.
function initHeroWordCycle() {
    const el = document.getElementById('heroCycleWord');
    if (!el) return;

    const words = ['Una familia', 'Una iglesia', 'LifeHouse'];
    const holdTime = 1900;       // cuanto tiempo se queda visible cada palabra (ms)
    const transitionTime = 450;  // debe coincidir con el CSS de .hero-cycle (ms)
    let i = 0;

    function next() {
        if (i >= words.length - 1) return; // ya llegamos a "LifeHouse": quedarse ahi

        setTimeout(() => {
            el.classList.add('hero-cycle--switching');
            setTimeout(() => {
                i++;
                el.textContent = words[i];
                el.classList.remove('hero-cycle--switching');
                next();
            }, transitionTime);
        }, holdTime);
    }

    next();
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
function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const phoneInput = document.getElementById('conPhone');
    let iti;
    if (phoneInput && typeof intlTelInput !== 'undefined') {
        iti = window.intlTelInput(phoneInput, {
            initialCountry: 'bo',
            separateDialCode: true,
            loadUtilsOnInit: 'https://cdn.jsdelivr.net/npm/intl-tel-input@24/build/js/utils.js',
        });
    }

    const msg = document.getElementById('conMsg');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

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
