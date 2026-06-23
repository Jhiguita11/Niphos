/* ============================================
   NIPHOS — Hero interacciones
   ============================================ */

/* ---- 1. Preloader + reveal escalonado de entrada ---- */
(() => {
  const preloader = document.getElementById('preloader');
  const progress = document.querySelector('.preloader__progress');
  let done = false;
  let pageLoaded = false;
  let ringDone = false;

  function reveal() {
    document.body.classList.add('ready');
    document.querySelectorAll('.reveal').forEach((el) => {
      const delay = parseInt(el.dataset.delay || '0', 10) * 120;
      setTimeout(() => el.classList.add('in'), 120 + delay);
    });
  }

  function finish() {
    if (done) return;
    done = true;
    if (preloader) {
      preloader.classList.add('preloader--hide');
      setTimeout(() => { preloader.style.display = 'none'; }, 850);
    }
    reveal();
  }

  // se cierra cuando el anillo terminó Y la página cargó
  const maybeFinish = () => { if (ringDone && pageLoaded) finish(); };

  window.addEventListener('load', () => { pageLoaded = true; maybeFinish(); });
  if (progress) {
    progress.addEventListener('animationend', () => { ringDone = true; maybeFinish(); });
  } else {
    ringDone = true;
  }

  // red de seguridad: nunca dejar la página atascada en el preloader
  setTimeout(finish, 4500);
})();

/* ---- 2. Menú móvil (pestañas orbitales -> overlay a pantalla completa) ---- */
const nav = document.getElementById('nav');
const burger = document.getElementById('burger');
burger?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  burger.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', open ? 'true' : 'false');
});
/* ---- 2c. Transición al seleccionar pestaña (las partículas convergen y la escena se aleja) ---- */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const views = document.getElementById('views');
  const flash = document.getElementById('flash');
  const items = document.querySelectorAll('.orbit__item');
  if (!views || !items.length) return;

  // recuerda el punto de origen para hacer la reversa desde el mismo lugar
  let last = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  function fireFlash(x, y, delay) {
    if (!flash) return;
    flash.style.setProperty('--tx', x + 'px');
    flash.style.setProperty('--ty', y + 'px');
    setTimeout(() => {
      flash.classList.add('burst');
      setTimeout(() => flash.classList.remove('burst'), 650);
    }, delay);
  }

  function showView(name) {
    views.querySelectorAll('.view').forEach((v) =>
      v.classList.toggle('active', v.dataset.view === name)
    );
    views.classList.add('active');
    views.setAttribute('aria-hidden', 'false');
    document.body.classList.add('view-open');
  }

  function clearViews() {
    views.setAttribute('aria-hidden', 'true');
    views.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  }

  function goToView(name, x, y) {
    last = { x, y };
    document.body.classList.add('transitioning');           // el hero se aleja (zoom out + fade)
    if (reduce) { showView(name); return; }

    window.dispatchEvent(new CustomEvent('niphos:converge', { detail: { x, y } }));
    fireFlash(x, y, 620);   // destello cuando las partículas están convergidas
    setTimeout(() => showView(name), 820);                  // del destello emerge la sección
    setTimeout(() => window.dispatchEvent(new Event('niphos:reset')), 1480);
  }

  function goHome() {
    if (reduce) {
      views.classList.remove('active');
      document.body.classList.remove('view-open', 'transitioning');
      clearViews();
      return;
    }
    const { x, y } = last;
    fireFlash(x, y, 40);    // destello casi inmediato (reversa del de ida)

    // 1) la sección se desvanece y las partículas estallan casi enseguida
    setTimeout(() => {
      views.classList.remove('active');
      window.dispatchEvent(new CustomEvent('niphos:diverge', { detail: { x, y } }));
    }, 160);

    // 2) el hero regresa (con animación de entrada) cuando la explosión ya está en marcha
    setTimeout(() => {
      document.body.classList.remove('view-open', 'transitioning');
      document.body.classList.add('returning');
    }, 620);
    setTimeout(() => document.body.classList.remove('returning'), 1720);

    setTimeout(clearViews, 820);
  }

  items.forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      // cerrar menú móvil si estaba abierto
      nav?.classList.remove('open');
      burger?.classList.remove('open');
      burger?.setAttribute('aria-expanded', 'false');

      const name = (a.getAttribute('href') || '').replace('#', '');
      const dot = a.querySelector('.orbit__dot');
      const r = dot.getBoundingClientRect();
      const cx = r.width ? r.left + r.width / 2 : window.innerWidth / 2;
      const cy = r.height ? r.top + r.height / 2 : window.innerHeight / 2;
      goToView(name, cx, cy);
    });
  });

  document.querySelectorAll('.view__back').forEach((b) =>
    b.addEventListener('click', goHome)
  );
})();

/* ---- 2b. Selector de idioma ES / EN ---- */
(() => {
  const STORAGE = 'niphos-lang';
  const btns = document.querySelectorAll('.lang__btn');
  if (!btns.length) return;

  function applyLang(lang) {
    document.documentElement.lang = lang;
    // textos
    document.querySelectorAll('[data-es]').forEach((el) => {
      const val = el.getAttribute('data-' + lang);
      if (val !== null) el.textContent = val;
    });
    // atributos (ej. aria-label, placeholder) marcados con data-es-aria, etc.
    document.querySelectorAll('[data-es-aria]').forEach((el) => {
      const val = el.getAttribute('data-' + lang + '-aria');
      if (val !== null) el.setAttribute('aria-label', val);
    });
    // estado del botón
    btns.forEach((b) => {
      const active = b.dataset.lang === lang;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    try { localStorage.setItem(STORAGE, lang); } catch (e) { /* file:// sin storage */ }
    window.dispatchEvent(new CustomEvent('niphos:lang', { detail: { lang } }));
  }

  btns.forEach((b) => b.addEventListener('click', () => applyLang(b.dataset.lang)));

  let saved = 'es';
  try { saved = localStorage.getItem(STORAGE) || 'es'; } catch (e) { /* ignore */ }
  applyLang(saved);
})();

/* ---- 4. Partículas glaciales en canvas ---- */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let w, h, particles, raf;
  const mouse = { x: -999, y: -999 };

  const DENSITY = 0.00009;   // partículas por píxel
  const ACCENT = [122, 196, 198];
  const navDots = Array.from(document.querySelectorAll('.orbit__dot'));

  let converge = null;   // { x, y, start } — partículas se agrupan en el punto
  let diverge = null;    // { start } — partículas estallan desde el punto a su sitio
  window.addEventListener('niphos:converge', (e) => {
    converge = { x: e.detail.x, y: e.detail.y, start: performance.now() };
    diverge = null;
  });
  window.addEventListener('niphos:diverge', (e) => {
    const cx = e.detail.x, cy = e.detail.y;
    for (const p of particles) {
      p.x = cx + (Math.random() - 0.5) * 16;   // arrancan agrupadas en el punto
      p.y = cy + (Math.random() - 0.5) * 16;
      p.hx = Math.random() * w;                // destino: posición dispersa
      p.hy = Math.random() * h;
      p.a = 1;
    }
    diverge = { start: performance.now() };
    converge = null;
  });
  window.addEventListener('niphos:reset', () => { converge = null; diverge = null; resize(); });

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    const count = Math.min(160, Math.floor(w * h * DENSITY));
    particles = Array.from({ length: count }, makeParticle);
  }

  function makeParticle() {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.6 + 0.4,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25 - 0.08, // leve deriva hacia arriba
      a: Math.random() * 0.5 + 0.15,
      tw: Math.random() * 0.02 + 0.005,        // parpadeo
      tint: Math.random() < 0.22,              // algunas con tinte cian
    };
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);

    // factores (0 → 1) de convergencia / divergencia
    const now = performance.now();
    const k = converge ? Math.min((now - converge.start) / 750, 1) : 0;
    const dk = diverge ? Math.min((now - diverge.start) / 950, 1) : 0;
    if (diverge && dk >= 1) diverge = null;   // terminó: vuelve a normal

    for (const p of particles) {
      if (converge) {
        // las partículas se aceleran hacia el punto seleccionado
        const pull = 0.03 + k * 0.20;
        p.x += (converge.x - p.x) * pull;
        p.y += (converge.y - p.y) * pull;
        p.a = Math.min(1, p.a + 0.025);     // se encienden al converger
      } else if (diverge) {
        // se mantienen agrupadas un instante y luego estallan hacia su posición dispersa
        let pull;
        if (dk < 0.12) {
          pull = 0;                              // breve agrupado mientras la sección se va
          p.a = Math.min(1, p.a + 0.05);         // bien encendidas
        } else {
          const e = (dk - 0.12) / 0.88;          // 0 → 1 en la fase de estallido
          pull = 0.30 - e * 0.25;                // estallido rápido, asentado suave
          p.x += (p.hx - p.x) * pull;
          p.y += (p.hy - p.y) * pull;
          p.a += p.tw;
          if (p.a > 0.7 || p.a < 0.12) p.tw *= -1;
        }
      } else {
        // movimiento normal
        p.x += p.vx;
        p.y += p.vy;
        p.a += p.tw;
        if (p.a > 0.7 || p.a < 0.12) p.tw *= -1;

        // repulsión sutil del cursor
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = dx * dx + dy * dy;
        if (dist < 14000) {
          const f = (14000 - dist) / 14000;
          p.x += (dx / Math.sqrt(dist + 0.01)) * f * 1.4;
          p.y += (dy / Math.sqrt(dist + 0.01)) * f * 1.4;
        }

        // wrap en bordes
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
      }

      // dibujo
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + (converge ? k * 0.8 : 0), 0, Math.PI * 2);
      if (p.tint || converge || diverge) {
        ctx.fillStyle = `rgba(${ACCENT[0]},${ACCENT[1]},${ACCENT[2]},${p.a})`;
      } else {
        ctx.fillStyle = `rgba(235,240,245,${p.a * 0.7})`;
      }
      ctx.fill();
    }

    // líneas de conexión entre partículas cercanas
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = dx * dx + dy * dy;
        if (d < 9000) {
          ctx.strokeStyle = `rgba(122,196,198,${(1 - d / 9000) * 0.10})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // las pestañas (nodos) tejidas a la constelación: líneas hacia partículas cercanas
    const navHidden = converge || diverge || document.body.classList.contains('view-open');
    const nodes = navHidden ? [] : navDots
      .map((d) => {
        const r = d.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, vis: r.width > 0 };
      })
      .filter((n) => n.vis);

    for (const node of nodes) {
      // pequeño halo en el nodo para integrarlo a la red
      ctx.beginPath();
      ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(122,196,198,0.85)';
      ctx.fill();

      for (const p of particles) {
        const dx = node.x - p.x, dy = node.y - p.y;
        const d = dx * dx + dy * dy;
        if (d < 17000) {
          ctx.strokeStyle = `rgba(122,196,198,${(1 - d / 17000) * 0.22})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      }
    }

    raf = requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('mouseout', () => { mouse.x = -999; mouse.y = -999; });

  resize();
  tick();
})();

/* ---- 5. Efecto "dos caminos": Software / Videojuegos ---- */
(() => {
  const hero = document.getElementById('hero');
  if (!hero) return;
  let active = '';
  hero.addEventListener('mousemove', (e) => {
    const side = e.clientX < window.innerWidth / 2 ? 'soft' : 'game';
    if (side === active) return;
    active = side;
    hero.classList.toggle('path-soft', side === 'soft');
    hero.classList.toggle('path-game', side === 'game');
  });
  hero.addEventListener('mouseleave', () => {
    active = '';
    hero.classList.remove('path-soft', 'path-game');
  });

  // los paneles también fijan el camino del fondo
  document.querySelectorAll('.panel[data-path]').forEach((panel) => {
    panel.addEventListener('mouseenter', () => {
      const side = panel.dataset.path;
      active = side;
      hero.classList.toggle('path-soft', side === 'soft');
      hero.classList.toggle('path-game', side === 'game');
    });
  });
})();

/* ---- 7. Showcase: baraja de proyectos con dos niveles (productos → proyectos) ---- */
(() => {
  const lang = () => (document.documentElement.lang === 'en' ? 'en' : 'es');
  const t = (o) => (o ? (o[lang()] || o.es || '') : '');

  const PLAY = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  const ARROW = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  // gradientes de fondo de sección reutilizables
  const BG = {
    nexarq:  'radial-gradient(ellipse 75% 80% at 76% 16%, rgba(212,175,90,.45), transparent 60%), linear-gradient(135deg,#171206,#241a08 45%,#120d04)',
    tour:    'radial-gradient(ellipse 75% 80% at 76% 16%, rgba(122,196,198,.5), transparent 60%), linear-gradient(135deg,#0a1418,#0e2228 45%,#08171f)',
    reserva: 'radial-gradient(ellipse 75% 80% at 76% 16%, rgba(96,160,190,.5), transparent 60%), linear-gradient(135deg,#0a131a,#0d2030 45%,#081420)',
    righttalent: 'radial-gradient(ellipse 75% 80% at 76% 16%, rgba(58,166,224,.45), transparent 60%), linear-gradient(135deg,#08131a,#0d2230 45%,#07151f)',
    soonSW:  'radial-gradient(ellipse 75% 80% at 76% 16%, rgba(80,150,150,.38), transparent 60%), linear-gradient(135deg,#091215,#0b1a1d 45%,#06141a)',
    cubexus: 'radial-gradient(ellipse 75% 80% at 76% 16%, rgba(176,107,255,.5), transparent 60%), linear-gradient(135deg,#100a1a,#1c0f30 45%,#120822)',
    proto:   'radial-gradient(ellipse 75% 80% at 76% 16%, rgba(224,90,170,.45), transparent 60%), linear-gradient(135deg,#170a14,#2a0d24 45%,#160819)',
    soonGM:  'radial-gradient(ellipse 75% 80% at 76% 16%, rgba(90,120,224,.42), transparent 60%), linear-gradient(135deg,#080a18,#0d1230 45%,#070920)',
  };

  const DATA = {
    software: [
      {
        title:   { es: 'Nexarq 360', en: 'Nexarq 360' },
        eyebrow: { es: 'SOFTWARE DE RECORRIDOS 360° Y VR', en: '360° & VR TOUR SOFTWARE' },
        text:    { es: 'Recorridos inmersivos 360° para constructoras. Camina cada proyecto antes de construirlo, en pantalla o en Oculus Quest.',
                   en: 'Immersive 360° tours for construction companies. Walk every project before it’s built, on screen or on Oculus Quest.' },
        sub:     { es: 'Recorridos 360° y VR', en: '360° & VR tours' },
        cta:     { es: 'Explorar proyectos', en: 'Explore projects' },
        media:   'url("assets/Software/Nexarq/NexarqCard.png")',
        logo:    'assets/Software/Nexarq/NexarqLogo.png',
        bg:      BG.nexarq,
        accent:  '#e0b860',
        site:    '#',   // TODO: URL del sitio web de Nexarq 360
        children: [
          {
            title:   { es: 'Valle Alto', en: 'Valle Alto' },
            eyebrow: { es: 'NEXARQ 360 · CONSTRUCTORA MELÉNDEZ', en: 'NEXARQ 360 · CONSTRUCTORA MELÉNDEZ' },
            text:    { es: 'MIESGROUP 3D STUDIO confió en Nexarq 360 para transformar el proyecto Valle Alto, de Constructora Meléndez, en un recorrido inmersivo 360°. Se explora desde el computador, con vista móvil optimizada o con gafas Oculus Quest, para vivir cada espacio como si ya estuviera construido.',
                       en: 'MIESGROUP 3D STUDIO trusted Nexarq 360 to turn Constructora Meléndez’s Valle Alto project into an immersive 360° tour. Explore it on desktop, with an optimized mobile view, or through Oculus Quest VR headsets to experience every space as if it were already built.' },
            sub:     { es: 'Recorrido 360°', en: '360° tour' },
            media:   'linear-gradient(160deg,#2e6f6b,#0c2b2e)',
            bg:      BG.tour,
            accent:  '#7ac4c6',
            url:     'https://jhiguita11.github.io/NEXARQ/',
          },
          {
            title:   { es: 'Reserva de Mirriñao', en: 'Reserva de Mirriñao' },
            eyebrow: { es: 'NEXARQ 360 · CONSTRUCTORA MELÉNDEZ', en: 'NEXARQ 360 · CONSTRUCTORA MELÉNDEZ' },
            text:    { es: 'MIESGROUP 3D STUDIO confió en Nexarq 360 para recrear el proyecto Reserva de Mirriñao, de Constructora Meléndez, en un recorrido inmersivo 360°. Disponible en computador, con vista móvil optimizada y en gafas Oculus Quest, permite caminar todo el conjunto antes de la primera piedra.',
                       en: 'MIESGROUP 3D STUDIO trusted Nexarq 360 to recreate Constructora Meléndez’s Reserva de Mirriñao project as an immersive 360° tour. Available on desktop, with an optimized mobile view and on Oculus Quest headsets, it lets you walk the entire complex before the first stone is laid.' },
            sub:     { es: 'Recorrido 360°', en: '360° tour' },
            media:   'linear-gradient(160deg,#3a7d8a,#0f2330)',
            bg:      BG.reserva,
            accent:  '#6aa6c8',
            url:     'https://jhiguita11.github.io/Reserva_Mirrinao/',
          },
        ],
      },
      {
        title:   { es: 'Right Talent', en: 'Right Talent' },
        eyebrow: { es: 'SOFTWARE · PLATAFORMA WEB', en: 'SOFTWARE · WEB PLATFORM' },
        text:    { es: 'Plataforma web para encontrar y conectar personal para hoteles. Reclutamiento hotelero, simple y rápido.',
                   en: 'Web platform to find and connect hospitality staff for hotels. Hotel recruitment, made simple and fast.' },
        sub:     { es: 'Plataforma web', en: 'Web platform' },
        cta:     { es: 'Visitar sitio', en: 'Visit site' },
        media:   'url("assets/Software/Right%20Talent/Right_Talent_Card.png")',
        bg:      BG.righttalent,
        accent:  '#3aa6e0',
        site:    'https://rtproservices.co',
      },
      {
        title:   { es: 'Próximamente', en: 'Coming soon' },
        eyebrow: { es: 'SOFTWARE · PRÓXIMAMENTE', en: 'SOFTWARE · COMING SOON' },
        text:    { es: 'Nuevos productos de software en camino. Estamos construyendo lo siguiente.',
                   en: 'New software products on the way. We’re building what’s next.' },
        sub:     { es: 'Próximamente', en: 'Coming soon' },
        media:   'linear-gradient(160deg,#1c4a4d,#081b1f)',
        bg:      BG.soonSW,
        accent:  '#5fb0a6',
        placeholder: true,
      },
    ],
    videojuegos: [
      {
        title:   { es: 'Cubexus', en: 'Cubexus' },
        eyebrow: { es: 'VIDEOJUEGOS · NIPHOS STUDIO', en: 'GAMES · NIPHOS STUDIO' },
        text:    { es: 'Universos de juego que se sienten reales. Construimos mundos donde cada bloque cuenta una historia.',
                   en: 'Game worlds that feel real. We build worlds where every block tells a story.' },
        sub:     { es: 'En desarrollo', en: 'In development' },
        media:   'linear-gradient(160deg,#6b3fb0,#1a0d2a)',
        bg:      BG.cubexus,
        accent:  '#b06bff',
        placeholder: true,
      },
      {
        title:   { es: 'Prototipo', en: 'Prototype' },
        eyebrow: { es: 'NIPHOS STUDIO · PRÓXIMAMENTE', en: 'NIPHOS STUDIO · COMING SOON' },
        text:    { es: 'Un prototipo en cocción. Mecánicas nuevas, mundo nuevo. Pronto contaremos más.',
                   en: 'A prototype in the works. New mechanics, new world. More to come soon.' },
        sub:     { es: 'Próximamente', en: 'Coming soon' },
        media:   'linear-gradient(160deg,#e05aaa,#7a1f5a 45%,#2a0d24)',
        bg:      BG.proto,
        accent:  '#e05aaa',
        placeholder: true,
      },
      {
        title:   { es: 'Nuevo mundo', en: 'New world' },
        eyebrow: { es: 'NIPHOS STUDIO · PRÓXIMAMENTE', en: 'NIPHOS STUDIO · COMING SOON' },
        text:    { es: 'El próximo universo NIPHOS aún no tiene nombre. Pero ya lo estamos imaginando.',
                   en: 'The next NIPHOS universe has no name yet. But we’re already imagining it.' },
        sub:     { es: 'Próximamente', en: 'Coming soon' },
        media:   'linear-gradient(160deg,#5a78e0,#1f2f7a 45%,#0d1230)',
        bg:      BG.soonGM,
        accent:  '#5a78e0',
        placeholder: true,
      },
    ],
  };

  document.querySelectorAll('.view--showcase').forEach((view) => {
    const root = DATA[view.dataset.view];
    if (!root) return;

    const eyebrow = view.querySelector('.show__eyebrow');
    const title = view.querySelector('.show__title');
    const text = view.querySelector('.show__text');
    const bg = view.querySelector('.show__bg');
    const cta = view.querySelector('.show__cta');
    const cardsWrap = view.querySelector('.show__cards');
    const dotsWrap = view.querySelector('.show__dots');
    const backBtn = view.querySelector('.show__back');

    let stack = root;      // arreglo de items que se muestran ahora
    let active = 0;
    let parentIndex = null; // null = nivel raíz; nº = índice del producto en el sub-nivel
    let cards = [];
    let dots = [];

    // dos capas de fondo para fundir el color al cambiar de tarjeta
    let bgLayers = [];
    let bgCur = 0;
    if (bg) {
      for (let i = 0; i < 2; i++) {
        const l = document.createElement('div');
        l.className = 'show__bg-layer';
        bg.appendChild(l);
        bgLayers.push(l);
      }
    }
    function setBg(grad) {
      if (!bgLayers.length || !grad) return;
      const next = bgLayers[bgCur ^ 1];
      if (next.style.backgroundImage === grad && bgLayers[bgCur].classList.contains('is-on')) return;
      next.style.backgroundImage = grad;
      next.classList.add('is-on');
      bgLayers[bgCur].classList.remove('is-on');
      bgCur ^= 1;
    }

    const detailWrap = view.querySelector('.show__detail');
    let mode = 'root';      // 'root' = baraja de productos | 'detail' = lista + preview
    let detailRefs = null;

    /* ---------- nivel raíz: baraja de tarjetas ---------- */
    function buildRoot() {
      cardsWrap.innerHTML = '';
      dotsWrap.innerHTML = '';

      cards = stack.map((item, i) => {
        const el = document.createElement('article');
        el.className = 'scard';

        const media = document.createElement('div');
        media.className = 'scard__media';
        media.style.backgroundImage = item.media || '';
        el.appendChild(media);

        if (!item.placeholder) {
          const badge = document.createElement('span');
          badge.className = 'scard__badge';
          badge.innerHTML = PLAY;
          el.appendChild(badge);
        }

        const meta = document.createElement('div');
        meta.className = 'scard__meta';
        const name = document.createElement('span');
        name.className = 'scard__name';
        const sub = document.createElement('span');
        sub.className = 'scard__sub';
        meta.append(name, sub);
        el.appendChild(meta);

        el.addEventListener('click', () => { if (i !== active) { active = i; render(); } });
        cardsWrap.appendChild(el);
        return { el, name, sub };
      });

      dots = stack.map((item, i) => {
        const d = document.createElement('button');
        d.type = 'button';
        d.className = 'show__dot';
        d.setAttribute('aria-label', String(i + 1));
        d.addEventListener('click', () => { active = i; render(); });
        dotsWrap.appendChild(d);
        return d;
      });
    }

    function renderRoot() {
      const item = stack[active];
      if (item.accent) view.style.setProperty('--vc', item.accent);
      if (eyebrow) eyebrow.textContent = t(item.eyebrow);
      if (title) title.textContent = t(item.title);
      if (text) text.textContent = t(item.text);
      if (item.bg) setBg(item.bg);

      if (cta) {
        const canDrill = Array.isArray(item.children) && item.children.length > 0;
        const url = item.site || item.url;
        const hasLink = url && url !== '#';
        let label;
        if (canDrill) {
          cta.href = '#';
          cta.removeAttribute('target');
          cta.dataset.act = 'drill';
          label = t(item.cta) || (lang() === 'en' ? 'Explore' : 'Explorar');
        } else if (hasLink) {
          cta.href = url;
          cta.target = '_blank';
          cta.rel = 'noopener';
          cta.dataset.act = 'link';
          label = t(item.cta) || (lang() === 'en' ? 'Visit site' : 'Visitar sitio');
        } else {
          cta.href = '#';
          cta.removeAttribute('target');
          cta.dataset.act = '';
          label = t(item.cta) || (lang() === 'en' ? 'Explore' : 'Explorar');
        }
        cta.innerHTML = label + ' ' + ARROW;
        cta.classList.toggle('is-disabled', !canDrill && !hasLink);
      }

      cards.forEach((c, i) => {
        const it = stack[i];
        c.name.textContent = t(it.title);
        c.sub.textContent = t(it.sub);
        let rank = i - active;
        if (rank < 0) rank += stack.length;
        c.el.style.setProperty('--rank', rank);
        c.el.style.zIndex = String(stack.length - rank);
        c.el.classList.toggle('is-front', rank === 0);
        c.el.setAttribute('aria-current', rank === 0 ? 'true' : 'false');
      });

      dots.forEach((d, i) => d.classList.toggle('is-active', i === active));
    }

    /* ---------- sub-nivel: lista + preview grande ---------- */
    const HEADING = { es: 'Proyectos destacados', en: 'Featured projects' };
    const MORE = { es: 'Ver más en la página', en: 'See more on the site' };
    const TOUR = { es: 'Ver recorrido', en: 'View tour' };

    // abre el enlace en otra pestaña; si es marcador '#', no hace nada
    const linkGuard = (e) => {
      const href = e.currentTarget.getAttribute('href');
      if (!href || href === '#') e.preventDefault();
    };

    function buildDetail() {
      if (!detailWrap) return;
      detailWrap.innerHTML = '';

      const left = document.createElement('div');
      left.className = 'detail__left';
      const eb = document.createElement('span');
      eb.className = 'detail__eyebrow';
      const head = document.createElement('h2');
      head.className = 'detail__heading';
      const list = document.createElement('div');
      list.className = 'detail__list';

      const items = stack.map((it, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'detail__item';
        b.innerHTML = '<span class="detail__item-bar"></span>'
          + '<span class="detail__item-name"></span>'
          + '<span class="detail__item-sub"></span>';
        b.addEventListener('click', () => { active = i; renderDetail(); });
        list.appendChild(b);
        return { b, name: b.querySelector('.detail__item-name'), sub: b.querySelector('.detail__item-sub') };
      });

      const more = document.createElement('a');
      more.className = 'detail__more';
      more.target = '_blank';
      more.rel = 'noopener';
      more.addEventListener('click', linkGuard);
      left.append(eb, head, list, more);

      const prev = document.createElement('div');
      prev.className = 'detail__preview';
      const media = document.createElement('div');
      media.className = 'detail__media';
      const badge = document.createElement('span');
      badge.className = 'detail__badge';
      badge.innerHTML = PLAY;
      const ov = document.createElement('div');
      ov.className = 'detail__overlay';
      const tt = document.createElement('h3');
      tt.className = 'detail__title';
      const sb = document.createElement('p');
      sb.className = 'detail__text';
      const dcta = document.createElement('a');
      dcta.className = 'detail__cta';
      dcta.target = '_blank';
      dcta.rel = 'noopener';
      dcta.addEventListener('click', linkGuard);
      ov.append(tt, sb, dcta);
      prev.append(media, badge, ov);

      detailWrap.append(left, prev);
      detailRefs = { eb, head, items, media, tt, sb, cta: dcta, more };
    }

    function renderDetail() {
      if (!detailRefs) return;
      const item = stack[active];
      const product = (parentIndex !== null) ? root[parentIndex] : null;
      if (item.accent) view.style.setProperty('--vc', item.accent);
      if (item.bg) setBg(item.bg);

      if (product && product.logo) {
        detailRefs.eb.innerHTML = '<img src="' + product.logo + '" alt="' + t(product.title) + '">';
      } else {
        detailRefs.eb.textContent = product ? t(product.title) : t(item.title);
      }
      detailRefs.head.textContent = t(HEADING);
      detailRefs.media.style.backgroundImage = item.preview || item.media || '';
      detailRefs.tt.textContent = t(item.title);
      detailRefs.sb.textContent = t(item.text);

      detailRefs.cta.href = item.url || '#';
      detailRefs.cta.innerHTML = (t(item.cta) || t(TOUR)) + ' ' + ARROW;
      detailRefs.cta.classList.toggle('is-disabled', !item.url || item.url === '#');

      detailRefs.more.href = (product && product.site) || '#';
      detailRefs.more.innerHTML = t(MORE) + ' ' + ARROW;

      detailRefs.items.forEach((it, i) => {
        it.name.textContent = t(stack[i].title);
        it.sub.textContent = t(stack[i].sub);
        it.b.classList.toggle('is-active', i === active);
      });
    }

    /* ---------- despachadores ---------- */
    function build() { if (mode === 'detail') buildDetail(); else buildRoot(); }
    function render() { if (mode === 'detail') renderDetail(); else renderRoot(); }

    const go = (dir) => { active = (active + dir + stack.length) % stack.length; render(); };
    view.querySelector('.show__navbtn--next')?.addEventListener('click', () => go(1));
    view.querySelector('.show__navbtn--prev')?.addEventListener('click', () => go(-1));

    // CTA: baja al sub-nivel si hay proyectos; si es un sitio web, deja que el enlace abra
    cta?.addEventListener('click', (e) => {
      const item = stack[active];
      if (Array.isArray(item.children) && item.children.length) {
        e.preventDefault();
        parentIndex = active;
        stack = item.children;
        active = 0;
        mode = 'detail';
        view.classList.add('is-sub');
        build();
        render();
      } else if (cta.getAttribute('href') === '#') {
        e.preventDefault();   // marcador sin URL real: no hace nada
      }
      // si tiene href real, se abre normalmente en otra pestaña
    });

    // Volver: si estamos en sub-nivel, sube; si no, deja que se cierre la sección
    view.addEventListener('click', (e) => {
      if (!e.target.closest('.show__back')) return;
      if (parentIndex !== null) {
        e.stopPropagation();   // evita que el handler global cierre la sección
        stack = root;
        active = parentIndex;
        parentIndex = null;
        mode = 'root';
        view.classList.remove('is-sub');
        build();
        render();
      }
    }, true);  // captura: corre antes del listener que cierra la vista

    document.addEventListener('keydown', (e) => {
      if (!view.classList.contains('active')) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); go(-1); }
    });

    window.addEventListener('niphos:lang', render);
    build();
    render();
  });
})();

/* ---- 6. Parallax suave del logo con el cursor ---- */
(() => {
  const logo = document.querySelector('.hero__logo-img');
  if (!logo || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  window.addEventListener('mousemove', (e) => {
    const dx = (e.clientX / window.innerWidth - 0.5) * 14;
    const dy = (e.clientY / window.innerHeight - 0.5) * 14;
    logo.style.transform = `translate(${dx}px, ${dy}px)`;
  });
})();
