/* ==========================================================================
   GT COMPUTERS — app.js
   Landing corporativa · animaciones, scroll y microinteracciones en JS puro
   --------------------------------------------------------------------------
   · Un solo bucle rAF (engine) alimenta todos los efectos ligados al scroll.
   · Cada módulo está aislado con safe(): si uno falla, la página sigue viva.
   · Respeta prefers-reduced-motion y dispositivos táctiles.
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- Utilidades ---------- */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = {
    out: (t) => 1 - Math.pow(1 - t, 3),
    io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  };
  const root = document.documentElement;
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const mqDesk = window.matchMedia('(min-width: 1024px)');
  const REDUCE = mqReduce.matches;
  if (REDUCE) root.classList.add('rm');

  const WA_NUMBER = '526161200149';
  const waLink = (msg) => `https://wa.me/${WA_NUMBER}` + (msg ? `?text=${encodeURIComponent(msg)}` : '');
  const docTop = (el) => el.getBoundingClientRect().top + window.scrollY;
  const safe = (name, fn) => { try { return fn(); } catch (err) { console.error(`[GT] ${name}:`, err); } };

  /* ==========================================================================
     ENGINE — bucle único de scroll
     ========================================================================== */
  const eng = {
    y: 0, vy: 0, vh: window.innerHeight, vw: window.innerWidth, docH: 0,
    tasks: [],
    add(task) { this.tasks.push(task); return task; },
    needsMeasure: false,
    requestMeasure() { this.needsMeasure = true; },
    measure() {
      this.needsMeasure = false;
      this.vh = window.innerHeight;
      this.vw = window.innerWidth;
      for (const t of this.tasks) {
        if (!t.measure) continue;
        try { t.measure(); } catch (e) { console.error('[GT] measure', e); }
      }
      this.docH = root.scrollHeight;
    },
    start() {
      const loop = () => {
        if (this.needsMeasure) this.measure();      // una sola medición por frame, sin reflujos forzados repetidos
        const y = Math.max(0, window.scrollY || window.pageYOffset || 0);
        this.vy = y - this.y;
        this.y = y;
        for (let i = 0; i < this.tasks.length; i++) {
          const t = this.tasks[i];
          if (!t.update) continue;
          try { t.update(y); } catch (e) { if (!t._err) { t._err = true; console.error('[GT] update', e); } }
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },
  };

  /* ==========================================================================
     ENLACES DE WHATSAPP
     ========================================================================== */
  function initLinks() {
    $$('[data-wa-msg]').forEach((a) => {
      const msg = a.getAttribute('data-wa-msg');
      if (msg) a.setAttribute('href', waLink(msg));
    });
    const y = $('#year');
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ==========================================================================
     TEXTO DIVIDIDO (títulos por palabra · manifiesto)
     ========================================================================== */
  function splitWords(el) {
    let idx = 0;
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const walk = (node, grad) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            w.setAttribute('aria-hidden', 'true');
            const s = document.createElement('span');
            s.textContent = part;
            s.style.setProperty('--i', idx++);
            if (grad) s.classList.add('grad');
            w.appendChild(s);
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
          const g = grad || child.classList.contains('grad');
          child.classList.remove('grad');
          walk(child, g);
        }
      });
    };
    walk(el, el.classList.contains('grad'));
    el.classList.remove('grad');
  }

  function splitStatement(el) {
    const words = [];
    const walk = (node, hl) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span');
            s.className = 'sw' + (hl ? ' is-hl' : '');
            s.textContent = part;
            s._k = -1;
            words.push(s);
            frag.appendChild(s);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child, hl || child.tagName === 'MARK');
        }
      });
    };
    walk(el, false);
    return words;
  }

  function initSplit() {
    $$('[data-split]').forEach(splitWords);
  }

  /* ==========================================================================
     LOADER
     ========================================================================== */
  function initLoader() {
    const loader = $('#loader');
    const finishReady = () => {
      root.classList.remove('is-loading');
      root.classList.add('is-ready');
      if (location.hash) {
        const t = $(location.hash);
        if (t) requestAnimationFrame(() => t.scrollIntoView({ behavior: 'instant', block: 'start' }));
      }
    };
    if (!loader) { finishReady(); return; }

    const ring = $('#loaderRing');
    const pctEl = $('#loaderPct');
    const logEl = $('#loaderLog');
    const logs = [
      'Inicializando diagnóstico…',
      'Cargando módulos: CPU · GPU · RAM',
      'Calibrando sensores de seguridad',
      'Verificando garantía escrita',
      'Sistema listo',
    ];
    let seen = false;
    try { seen = sessionStorage.getItem('gt-intro') === '1'; } catch (e) { /* sin storage */ }
    const minTime = REDUCE ? 350 : seen ? 900 : 1700;
    const t0 = performance.now();
    let loaded = document.readyState === 'complete';
    let pct = 0;
    let finished = false;

    window.addEventListener('load', () => { loaded = true; }, { once: true });
    setTimeout(() => { loaded = true; }, 6000);          // red lenta: no bloquear la visita

    const finish = () => {
      finished = true;
      if (ring) ring.style.strokeDashoffset = 0;
      if (pctEl) pctEl.textContent = '100';
      if (logEl) logEl.textContent = logs[logs.length - 1];
      try { sessionStorage.setItem('gt-intro', '1'); } catch (e) { /* sin storage */ }
      setTimeout(() => {
        loader.classList.add('is-done');
        finishReady();
        setTimeout(() => loader.remove(), 1700);
      }, REDUCE ? 0 : 380);
    };

    const step = (now) => {
      if (finished) return;
      const t = clamp((now - t0) / minTime);
      let p = ease.out(t) * 100;
      if (!loaded) p = Math.min(p, 93);
      pct = Math.max(pct, p);
      if (ring) ring.style.strokeDashoffset = String(100 - pct);
      if (pctEl) pctEl.textContent = String(Math.round(pct));
      if (logEl) logEl.textContent = logs[Math.min(logs.length - 1, Math.floor((pct / 100) * logs.length))];
      if (pct >= 99.5 && loaded) { finish(); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ==========================================================================
     REVELADOS · CONTADORES
     ========================================================================== */
  function initReveal() {
    $$('[data-stagger]').forEach((c) => {
      $$(':scope > [data-reveal]', c).forEach((el, i) => el.style.setProperty('--d', (i * 0.09).toFixed(2) + 's'));
    });
    const els = $$('[data-reveal],[data-split]');
    if (REDUCE || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return; }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        io.unobserve(el);
        el.classList.add('is-in');
        // Una vez revelado, quitamos el atributo para devolver el control de transform/transition al componente (hover, tilt…)
        if (el.hasAttribute('data-reveal')) {
          const d = parseFloat(el.style.getPropertyValue('--d')) || 0;
          setTimeout(() => { el.removeAttribute('data-reveal'); el.classList.remove('is-in'); el.style.removeProperty('--d'); }, (d + 1.25) * 1000);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach((e) => io.observe(e));
  }

  function initCounters() {
    const els = $$('[data-count]');
    if (!els.length) return;
    if (REDUCE || !('IntersectionObserver' in window)) { els.forEach((e) => (e.textContent = e.dataset.count)); return; }
    const run = (el) => {
      const end = parseFloat(el.dataset.count);
      const t0 = performance.now();
      const step = (now) => {
        const t = clamp((now - t0) / 1700);
        el.textContent = String(Math.round(end * ease.out(t)));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { io.unobserve(en.target); run(en.target); } });
    }, { threshold: 0.6 });
    els.forEach((e) => io.observe(e));
  }

  /* ==========================================================================
     NAVEGACIÓN · MENÚ MÓVIL
     ========================================================================== */
  function initNav() {
    const burger = $('#burger');
    const menu = $('#menu');
    if (!burger || !menu) return;
    const setOpen = (open) => {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      burger.classList.toggle('is-open', open);
      menu.classList.toggle('is-open', open);
      root.classList.toggle('is-locked', open);
    };
    burger.addEventListener('click', () => setOpen(!menu.classList.contains('is-open')));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setOpen(false)));
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    window.matchMedia('(min-width: 1100px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
  }

  /* ==========================================================================
     CURSOR PERSONALIZADO · EFECTOS DE PUNTERO (solo mouse)
     ========================================================================== */
  function initCursor() {
    if (!mqFine.matches || REDUCE) return;
    const cur = $('#cursor');
    if (!cur) return;
    const dot = $('.cursor__dot', cur);
    const ring = $('.cursor__ring', cur);
    root.classList.add('has-cursor');
    cur.style.opacity = '0';
    let x = window.innerWidth / 2, y = window.innerHeight / 2, rx = x, ry = y, shown = false;
    window.addEventListener('pointermove', (e) => {
      x = e.clientX; y = e.clientY;
      if (!shown) { shown = true; rx = x; ry = y; cur.style.opacity = '1'; }
    }, { passive: true });
    document.addEventListener('mouseleave', () => { cur.style.opacity = '0'; shown = false; });
    const hoverSel = 'a, button, [role="radio"], label, .ba__range';
    document.addEventListener('pointerover', (e) => { cur.classList.toggle('is-hover', !!(e.target.closest && e.target.closest(hoverSel))); });
    const loop = () => {
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
      dot.style.transform = `translate3d(${x}px,${y}px,0)`;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  function initPointerFx() {
    if (!mqFine.matches || REDUCE) return;
    $$('.btn--magnetic').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.setProperty('--tx', ((e.clientX - (r.left + r.width / 2)) * 0.16).toFixed(1) + 'px');
        btn.style.setProperty('--ty', ((e.clientY - (r.top + r.height / 2)) * 0.26).toFixed(1) + 'px');
      });
      btn.addEventListener('pointerleave', () => { btn.style.setProperty('--tx', '0px'); btn.style.setProperty('--ty', '0px'); });
    });
    $$('.spot').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
      });
    });
    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateX(${(-py * 5).toFixed(2)}deg) rotateY(${(px * 7).toFixed(2)}deg)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ==========================================================================
     HERO — HUD en vivo · inclinación 3D · red de partículas
     ========================================================================== */
  function initHeroFx() {
    const cpu = $('[data-tick="cpu"]');
    const rec = $('[data-tick="rec"]');
    const tk = $('[data-tick="ticket"]');
    let temp = 41, secs = 7 * 60 + 23, ticket = 142;
    const fmt = (s) => [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(n).padStart(2, '0')).join(':');
    const tick = () => {
      temp = clamp(temp + (Math.random() - 0.5) * 3, 38, 48);
      secs += 1;
      if (cpu) cpu.textContent = String(Math.round(temp));
      if (rec) rec.textContent = fmt(secs);
      if (secs % 4 === 0) { ticket += 1; if (tk) tk.textContent = String(ticket).padStart(4, '0'); }
    };
    tick();
    if (!REDUCE) setInterval(tick, 1000);

    if (mqFine.matches && !REDUCE) {
      const hero = $('#inicio');
      const core = $('#core');
      if (!hero || !core) return;
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        core.style.setProperty('--ry', (px * 16).toFixed(2) + 'deg');
        core.style.setProperty('--rx', (-py * 12).toFixed(2) + 'deg');
      });
      hero.addEventListener('pointerleave', () => { core.style.setProperty('--ry', '0deg'); core.style.setProperty('--rx', '0deg'); });
    }
  }

  function initNetwork() {
    const cv = $('#net');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const hero = cv.parentElement;
    let W = 0, H = 0, nodes = [], pulses = [], visible = true, raf = 0, lastPulse = 0;
    const mouse = { x: -9999, y: -9999, on: false };

    const size = () => {
      const r = hero.getBoundingClientRect();
      W = r.width; H = r.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(clamp((W * H) / 17000, 24, 92));
      nodes = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.6, blue: Math.random() < 0.22,
      }));
      pulses = [];
      if (REDUCE) draw(0);
    };

    function draw(now) {
      ctx.clearRect(0, 0, W, H);
      const maxD = clamp(W / 8.5, 90, 150);
      const maxD2 = maxD * maxD;
      for (const n of nodes) {
        if (!REDUCE) {
          n.x += n.vx; n.y += n.vy;
          if (n.x < -20) n.x = W + 20; else if (n.x > W + 20) n.x = -20;
          if (n.y < -20) n.y = H + 20; else if (n.y > H + 20) n.y = -20;
          if (mouse.on) {
            const dx = n.x - mouse.x, dy = n.y - mouse.y, d2 = dx * dx + dy * dy;
            if (d2 < 24000) { const d = Math.sqrt(d2) || 1; n.x += (dx / d) * 0.9; n.y += (dy / d) * 0.9; }
          }
        }
      }
      ctx.lineWidth = 1;
      const edges = [];
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < maxD2) {
            const k = 1 - Math.sqrt(d2) / maxD;
            ctx.strokeStyle = a.blue || b.blue ? `rgba(80,145,255,${(k * 0.34).toFixed(3)})` : `rgba(255,194,26,${(k * 0.28).toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            if (k > 0.5) edges.push([a, b]);
          }
        }
        if (mouse.on) {
          const dx = a.x - mouse.x, dy = a.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < 30000) {
            ctx.strokeStyle = `rgba(255,225,130,${((1 - Math.sqrt(d2) / 173) * 0.5).toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        ctx.fillStyle = n.blue ? 'rgba(106,168,255,.9)' : 'rgba(255,214,90,.9)';
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.2832); ctx.fill();
      }
      if (!REDUCE) {
        if (now - lastPulse > 650 && edges.length && pulses.length < 14) {
          const e = edges[(Math.random() * edges.length) | 0];
          pulses.push({ a: e[0], b: e[1], t: 0, s: 0.012 + Math.random() * 0.012 });
          lastPulse = now;
        }
        pulses = pulses.filter((p) => p.t < 1);
        for (const p of pulses) {
          p.t += p.s;
          const x = lerp(p.a.x, p.b.x, p.t), y = lerp(p.a.y, p.b.y, p.t);
          const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
          g.addColorStop(0, 'rgba(255,240,180,.95)'); g.addColorStop(1, 'rgba(255,194,26,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.2832); ctx.fill();
        }
      }
    }

    const loop = (now) => {
      if (visible && !document.hidden) draw(now);
      raf = requestAnimationFrame(loop);
    };

    size();
    let rt = 0;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 200); });
    if (REDUCE) return;
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = e.pointerType === 'mouse';
    });
    hero.addEventListener('pointerleave', () => { mouse.on = false; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(hero);
    }
    raf = requestAnimationFrame(loop);
  }

  /* ==========================================================================
     MARQUEE — la velocidad responde al scroll
     ========================================================================== */
  function initMarquee() {
    const rows = $$('.marquee__row').map((row) => ({ row, set: row.firstElementChild, dir: parseFloat(row.dataset.marquee) || -1, w: 0, x: 0 }));
    if (!rows.length) return;
    eng.add({
      measure() {
        const vw = window.innerWidth;
        rows.forEach((r) => {
          const w = r.set.getBoundingClientRect().width;
          if (r.ready && r.vw === vw && Math.abs(w - r.w) < 1) return;        // nada cambió: no reconstruimos
          $$('.marquee__set', r.row).slice(1).forEach((n) => n.remove());
          r.w = w;
          r.vw = vw;
          r.ready = true;
          if (!r.w) return;
          const copies = Math.ceil((window.innerWidth * 2.2) / r.w) + 1;
          for (let i = 0; i < copies; i++) {
            const c = r.set.cloneNode(true);
            c.setAttribute('aria-hidden', 'true');
            r.row.appendChild(c);
          }
          r.x = r.dir > 0 ? -r.w : 0;
        });
      },
      update() {
        if (REDUCE) return;
        const boost = Math.min(Math.abs(eng.vy) * 0.28, 14);
        rows.forEach((r) => {
          if (!r.w) return;
          r.x += r.dir * (0.55 + boost);
          if (r.dir < 0 && r.x <= -r.w) r.x += r.w;
          if (r.dir > 0 && r.x >= 0) r.x -= r.w;
          r.row.style.transform = `translate3d(${r.x.toFixed(2)}px,0,0)`;
        });
      },
    });
  }

  /* ==========================================================================
     TAREAS DE SCROLL (engine)
     ========================================================================== */

  /* Especialidades · scroll horizontal anclado (se registra primero: cambia la altura del documento) */
  function taskHorizontal() {
    const hs = $('#especialidades');
    const track = $('#hsTrack');
    if (!hs || !track || REDUCE) return;
    const cards = $$('.hcard', track);
    const nowEl = $('#hsNow');
    const barEl = $('#hsBar');
    let hsTop = 0, maxX = 0, cur = 0, lefts = [], widths = [], lastIdx = 0;
    const sticky = $('.hs__sticky', hs);

    // Accesibilidad: al tabular hacia una tarjeta fuera de vista, desplazamos la página (no el contenedor)
    track.addEventListener('focusin', (e) => {
      const card = e.target.closest('.hcard');
      if (!card || maxX <= 0) return;
      const i = cards.indexOf(card);
      const target = clamp((lefts[i] - lefts[0]) / maxX);
      requestAnimationFrame(() => { sticky.scrollLeft = 0; });
      window.scrollTo({ top: hsTop + target * maxX, behavior: REDUCE ? 'auto' : 'smooth' });
    });

    eng.add({
      measure() {
        maxX = Math.max(0, track.scrollWidth - window.innerWidth);
        hsTop = docTop(hs);
        lefts = cards.map((c) => c.offsetLeft);
        widths = cards.map((c) => c.offsetWidth);
        hs.style.setProperty('--hs-h', Math.round(maxX + window.innerHeight) + 'px');   // escritura al final
      },
      update(y) {
        if (y < hsTop - eng.vh * 1.2 || y > hsTop + maxX + eng.vh * 2.2) return;
        const target = maxX > 0 ? clamp((y - hsTop) / maxX) : 0;
        cur += (target - cur) * 0.14;
        if (Math.abs(target - cur) < 0.0004) cur = target;
        const tx = -cur * maxX;
        track.style.transform = `translate3d(${tx.toFixed(2)}px,0,0)`;
        const ref = lerp(eng.vw * 0.28, eng.vw * 0.62, cur);     // punto de referencia que viaja de izquierda a derecha
        let idx = 1, best = Infinity;
        for (let i = 0; i < cards.length; i++) {
          const center = lefts[i] + widths[i] / 2 + tx;
          cards[i].style.setProperty('--px', ((center - eng.vw / 2) * -0.07).toFixed(1) + 'px');
          if (i < 5 && Math.abs(center - ref) < best) { best = Math.abs(center - ref); idx = i + 1; }
        }
        if (idx !== lastIdx) { lastIdx = idx; if (nowEl) nowEl.textContent = '0' + idx; }
        if (barEl) barEl.style.transform = `scaleX(${cur.toFixed(4)})`;
      },
    });
  }

  /* Chrome: barra de progreso, header, progreso del hero, scroll-spy y acento ambiental */
  function taskChrome() {
    const hero = $('#inicio');
    const nav = $('#nav');
    const bar = $('#progressBar');
    const secs = $$('main > section[id]');
    const links = $$('[data-spy]');
    let heroH = 1, docMax = 1, tops = [], active = '', accent = '', lastHp = -1, scrolled = false;
    eng.add({
      measure() {
        heroH = hero ? hero.offsetHeight : 1;
        docMax = Math.max(1, root.scrollHeight - window.innerHeight);
        tops = secs.map((s) => ({ id: s.id, accent: s.dataset.accent || 'gold', top: docTop(s), bottom: docTop(s) + s.offsetHeight }));
      },
      update(y) {
        if (bar) bar.style.transform = `scaleX(${clamp(y / docMax).toFixed(4)})`;
        const sc = y > 30;
        if (sc !== scrolled) { scrolled = sc; nav && nav.classList.toggle('is-scrolled', sc); }
        if (hero) {
          const hp = clamp(y / (heroH * 0.85));
          if (Math.abs(hp - lastHp) > 0.002) { lastHp = hp; hero.style.setProperty('--hp', hp.toFixed(3)); }
        }
        const mid = y + eng.vh * 0.4;
        let cur = null;
        for (const t of tops) if (mid >= t.top && mid < t.bottom) { cur = t; break; }
        const id = cur ? cur.id : '';
        if (id !== active) {
          active = id;
          links.forEach((a) => a.classList.toggle('is-active', a.dataset.spy === id));
        }
        const ac = cur ? cur.accent : 'gold';
        if (ac !== accent) { accent = ac; root.dataset.accent = ac; }
      },
    });
  }

  /* Manifiesto: las palabras se encienden con el scroll */
  function taskStatement() {
    const el = $('#statement');
    if (!el) return;
    const words = splitStatement(el);
    if (REDUCE) { words.forEach((w) => w.style.setProperty('--k', '1')); return; }
    const N = words.length;
    let sTop = 0, sH = 1, cur = 0;
    eng.add({
      measure() { sTop = docTop(el); sH = el.offsetHeight; },
      update(y) {
        const start = sTop - eng.vh * 0.82;
        const end = sTop + sH - eng.vh * 0.4;
        if (y < start - 200 && cur === 0) return;
        const target = clamp((y - start) / (end - start));
        cur += (target - cur) * 0.12;
        if (Math.abs(target - cur) < 0.0005) cur = target;
        for (let i = 0; i < N; i++) {
          const k = clamp((cur * (N + 8) - i) / 8);
          const w = words[i];
          if (Math.abs(k - w._k) > 0.012) { w._k = k; w.style.setProperty('--k', k.toFixed(3)); }
        }
      },
    });
  }

  /* Laboratorio: la imagen se abre a pantalla completa */
  function taskExpand() {
    const ex = $('#laboratorio');
    if (!ex || REDUCE) return;
    const copy = $('.expand__copy', ex);
    let exTop = 0, exH = 1, cur = 0, live = false, last = '';
    eng.add({
      measure() { exTop = docTop(ex); exH = ex.offsetHeight; },
      update(y) {
        if (y < exTop - eng.vh * 1.1 || y > exTop + exH + eng.vh * 0.2) return;
        const target = clamp((y - exTop) / Math.max(1, exH - eng.vh));
        cur += (target - cur) * 0.14;
        if (Math.abs(target - cur) < 0.0004) cur = target;
        const e = ease.io(clamp(cur / 0.62));
        const co = clamp((cur - 0.7) / 0.18);
        const vw = eng.vw, vh = eng.vh, desk = vw >= 900;
        const w0 = desk ? vw * 0.3 : vw * 0.64, h0 = desk ? vh * 0.4 : vh * 0.32;
        const h1 = desk ? vh * 0.82 : vh * 0.76;
        const mw = lerp(w0, vw, e), mh = lerp(h0, h1, e), rr = lerp(28, 0, e), zs = lerp(1.18, 1, e);
        const key = [e.toFixed(4), co.toFixed(3), vw, vh].join('|');
        if (key === last) return;
        last = key;
        const s = ex.style;
        s.setProperty('--e', e.toFixed(4));
        s.setProperty('--co', co.toFixed(3));
        s.setProperty('--mw', mw.toFixed(1) + 'px');
        s.setProperty('--mh', mh.toFixed(1) + 'px');
        s.setProperty('--rr', rr.toFixed(1) + 'px');
        s.setProperty('--zs', zs.toFixed(4));
        const l = co > 0.6;
        if (l !== live) { live = l; copy && copy.classList.toggle('is-live', l); }
      },
    });
  }

  /* Proceso: la línea se dibuja y los pasos se encienden */
  function taskTimeline() {
    const tl = $('#timeline');
    if (!tl) return;
    const steps = $$('.step', tl);
    const fill = $('#tlFill');
    let tlTop = 0, tlH = 1, sTops = [];
    const state = steps.map(() => false);
    eng.add({
      measure() { tlTop = docTop(tl); tlH = tl.offsetHeight; sTops = steps.map((s) => docTop(s) + 36); },
      update(y) {
        const mid = y + eng.vh * 0.58;
        const p = clamp((mid - tlTop - 30) / Math.max(1, tlH - 60));
        if (fill) fill.style.transform = `scaleY(${p.toFixed(4)})`;
        steps.forEach((s, i) => {
          const on = REDUCE ? true : mid > sTops[i];
          if (on !== state[i]) { state[i] = on; s.classList.toggle('is-on', on); }
        });
      },
    });
  }

  /* La diferencia GT: tarjetas apiladas que se hunden */
  function taskStack() {
    const stack = $('#stack');
    if (!stack || REDUCE) return;
    const cards = $$('.scard', stack);
    let sTop = 0, sBottom = 0, st = [], hs = [];
    eng.add({
      measure() {
        sTop = docTop(stack); sBottom = sTop + stack.offsetHeight;
        st = cards.map((c) => parseFloat(getComputedStyle(c).top) || 0);
        hs = cards.map((c) => c.offsetHeight);
      },
      update(y) {
        if (y < sTop - eng.vh || y > sBottom) return;
        const tops = cards.map((c) => c.getBoundingClientRect().top);      // primero todas las lecturas…
        for (let i = 0; i < cards.length; i++) {                           // …y luego las escrituras
          const ov = cards[i + 1] ? clamp(1 - (tops[i + 1] - st[i]) / (hs[i] * 0.85)) : 0;
          cards[i].style.setProperty('--s', (1 - ov * 0.055).toFixed(4));
          cards[i].style.setProperty('--b', (1 - ov * 0.5).toFixed(3));
        }
      },
    });
  }

  /* Paralaje suave en fotos + palabra gigante del footer */
  function taskParallax() {
    const imgs = [...$$('.cams__photo img'), ...$$('.pos__photo img')].map((img) => ({ img, box: img.parentElement, top: 0, h: 1 }));
    const fg = $('.footer__giant span');
    let fgTop = 0, fgH = 1;
    eng.add({
      measure() {
        imgs.forEach((o) => { o.top = docTop(o.box); o.h = o.box.offsetHeight; });
        if (fg) { fgTop = docTop(fg.parentElement); fgH = fg.parentElement.offsetHeight; }
      },
      update(y) {
        if (!REDUCE) {
          for (const o of imgs) {
            const c = o.top + o.h / 2 - y - eng.vh / 2;
            if (Math.abs(c) > eng.vh * 1.2) continue;
            o.img.style.setProperty('--py', (c * -0.06).toFixed(1) + 'px');
          }
        }
        if (fg) fg.style.setProperty('--fp', REDUCE ? '1' : clamp((y + eng.vh - fgTop) / (eng.vh * 0.55)).toFixed(3));
      },
    });
  }

  /* ==========================================================================
     BITÁCORA (mantenimiento) — modos + progreso ligado al scroll
     ========================================================================== */
  function initLog() {
    const list = $('#logList');
    const log = $('#log');
    const cardsEl = $('.maint__cards');
    if (!list || !log || !cardsEl) return;
    const MODES = {
      prev: ['Limpieza', 'Temperaturas', 'Rendimiento', 'Observaciones', 'Recomendaciones'],
      corr: ['Diagnóstico', 'Falla localizada', 'Reparación', 'Pruebas finales', 'Entrega con garantía'],
    };
    const tempEl = $('#tempVal'), perfEl = $('#perfVal'), gT = $('#gTemp'), gP = $('#gPerf');
    const tabs = $$('.log__tabs button', log);
    let mode = 'prev', items = [], progress = 0, top0 = 0, h0 = 1, auto = null;

    const render = () => {
      list.innerHTML = MODES[mode].map((t) => `<li><i><svg class="i" aria-hidden="true"><use href="#i-check"/></svg></i><span>${t}</span></li>`).join('');
      items = $$('li', list);
      apply(progress);
    };
    const apply = (p) => {
      progress = p;
      const done = Math.floor(p * (items.length + 0.4));
      items.forEach((li, i) => li.classList.toggle('is-done', i < done));
      const q = clamp(p * 1.1);
      const temp = Math.round(lerp(92, 54, q)), perf = Math.round(lerp(41, 96, q));
      if (tempEl) tempEl.textContent = String(temp);
      if (perfEl) perfEl.textContent = String(perf);
      if (gT) { gT.style.strokeDashoffset = String(100 - temp); gT.classList.toggle('is-cool', temp < 70); }
      if (gP) gP.style.strokeDashoffset = String(100 - perf);
    };
    const play = () => {
      cancelAnimationFrame(auto);
      const t0 = performance.now();
      const step = (now) => {
        const t = clamp((now - t0) / 3400);
        apply(ease.io(t));
        if (t < 1) auto = requestAnimationFrame(step);
      };
      auto = requestAnimationFrame(step);
    };

    tabs.forEach((b) => b.addEventListener('click', () => {
      mode = b.dataset.mode;
      tabs.forEach((t) => { const on = t === b; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', String(on)); });
      progress = 0;
      render();
      if (!mqDesk.matches || REDUCE) play();
    }));

    render();
    if (REDUCE) { apply(1); return; }

    // Móvil / tablet: se reproduce sola al entrar a la vista
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => {
        if (es[0].isIntersecting && !mqDesk.matches) { io.disconnect(); play(); }
      }, { threshold: 0.35 });
      io.observe(log);
    }
    // Escritorio: avanza con el scroll de las tarjetas
    eng.add({
      measure() { top0 = docTop(cardsEl); h0 = cardsEl.offsetHeight; },
      update(y) {
        if (!mqDesk.matches) return;
        if (y < top0 - eng.vh || y > top0 + h0 + eng.vh) return;
        const p = clamp((y + eng.vh * 0.5 - top0) / (h0 * 0.8));
        if (Math.abs(p - progress) > 0.004) apply(p);
      },
    });
  }

  /* ==========================================================================
     DIAGNÓSTICO INTERACTIVO
     ========================================================================== */
  const DIAG = {
    laptop: {
      msg: (k) => `Hola GT Computers 👋 Tengo una laptop o PC con este problema: "${k}". Quiero mi diagnóstico. ¿Me ayudan?`,
      symptoms: [
        { k: 'No enciende', head: 'No enciende: buscamos la falla en la tarjeta', text: 'Casi nunca es solo el cargador. Medimos voltajes y líneas de alimentación para ubicar el componente dañado.', steps: ['Revisamos cargador, batería y puerto de carga', 'Medimos voltajes en la tarjeta madre', 'Reparamos el circuito o cambiamos el componente correcto'] },
        { k: 'Pantalla rota o sin imagen', head: 'Sin imagen o pantalla dañada', text: 'Primero distinguimos si falla el panel, el cable o la tarjeta de video, antes de cambiar nada.', steps: ['Probamos con un monitor externo', 'Revisamos el cable y la conexión de video', 'Cambiamos la pantalla o reparamos la tarjeta'] },
        { k: 'Muy lenta o con virus', head: 'Lenta, con virus o llena de publicidad', text: 'Limpiamos, optimizamos y dejamos tu equipo protegido. Si hace falta, recuperamos tus datos antes de formatear.', steps: ['Revisamos disco, memoria y arranque', 'Eliminamos virus y malware', 'Optimizamos o reinstalamos Windows cuidando tu información'] },
        { k: 'Se calienta o se apaga sola', head: 'Sobrecalentamiento', text: 'Un equipo que se apaga por calor necesita limpieza y revisión. Si el chip lo requiere, hacemos reballing de GPU/CPU.', steps: ['Medimos temperaturas bajo carga', 'Limpieza interna del equipo', 'Reballing de GPU/CPU si el diagnóstico lo pide'] },
        { k: 'No carga o el puerto está dañado', head: 'Carga y puertos dañados', text: 'Reparamos puertos de carga, USB y video a nivel componente, sin cambiar toda la tarjeta si no hace falta.', steps: ['Revisamos cargador y conector', 'Medimos la línea de carga en la tarjeta', 'Reemplazamos el puerto o reparamos el circuito'] },
        { k: 'Quiero actualizar o formatear', head: 'Actualización y optimización', text: 'Dejamos tu equipo como nuevo: sistema limpio, programas instalados y todo configurado.', steps: ['Respaldamos tu información', 'Instalamos y configuramos Windows y tus programas', 'Entregamos con licencia original y antivirus'] },
      ],
    },
    celular: {
      msg: (k) => `Hola GT Computers 👋 Tengo un celular con este problema: "${k}". Quiero mi diagnóstico gratuito. ¿Me ayudan?`,
      symptoms: [
        { k: 'Pantalla rota o sin táctil', head: 'Cambio de pantalla', text: 'Pantallas originales y de excelente calidad, para que tu celular vuelva a verse y sentirse como nuevo.', steps: ['Diagnóstico gratuito', 'Cambiamos la pantalla', 'Probamos táctil, brillo y color antes de entregarlo'] },
        { k: 'La batería dura muy poco', head: 'Reemplazo de batería', text: 'Más duración y mejor rendimiento. Si notas la tapa levantada o hinchada, deja de usarlo y escríbenos.', steps: ['Revisamos el estado de la batería', 'La reemplazamos por una de calidad', 'Probamos la carga completa'] },
        { k: 'No se escucha (bocinas o altavoz)', head: 'Audio: bocinas y altavoz', text: 'Recuperamos el audio de tu celular: sonido claro y potente.', steps: ['Probamos bocina y altavoz', 'Cambiamos la pieza dañada', 'Verificamos llamadas y multimedia'] },
        { k: 'No me escuchan (micrófono)', head: 'Cambio de micrófono', text: 'Para que hables y escuches sin problemas.', steps: ['Probamos el micrófono en llamadas y notas de voz', 'Cambiamos el micrófono dañado', 'Verificamos que todo suene bien'] },
        { k: 'No enciende o no carga', head: 'No enciende o no carga', text: 'Puede ser el puerto, la batería o la tarjeta. Lo revisamos a nivel electrónico.', steps: ['Revisamos puerto de carga y batería', 'Medimos consumo y líneas de la tarjeta', 'Reparamos o cambiamos lo necesario'] },
        { k: 'Liberación de red o cuenta', head: 'Liberación de red y cuentas', text: 'Ofrecemos liberación de red y cuentas para equipos de tu propiedad.', steps: ['Nos compartes marca y modelo', 'Revisamos si es posible en tu caso', 'Te confirmamos cómo procedemos'] },
      ],
    },
    tableta: {
      msg: (k) => `Hola GT Computers 👋 Tengo una tableta con este problema: "${k}". Quiero mi diagnóstico. ¿Me ayudan?`,
      symptoms: [
        { k: 'Pantalla rota o sin táctil', head: 'Cambio de pantalla en tableta', text: 'Reemplazamos el cristal o el panel completo según lo que tu tableta necesite.', steps: ['Revisamos si falla el cristal, el táctil o el panel', 'Cambiamos la pantalla', 'Probamos táctil, brillo y color'] },
        { k: 'No carga o la batería dura poco', head: 'Carga y batería', text: 'Revisamos el puerto de carga y la batería para devolverle autonomía a tu tableta.', steps: ['Revisamos puerto y cargador', 'Medimos la batería', 'Cambiamos el componente que falle'] },
        { k: 'No enciende', head: 'No enciende', text: 'Diagnóstico a nivel electrónico para encontrar la causa real.', steps: ['Revisamos batería y alimentación', 'Medimos líneas en la tarjeta', 'Reparamos la falla'] },
        { k: 'Está lenta o bloqueada', head: 'Lenta o con fallas de software', text: 'Solucionamos fallas de software y optimizamos tu equipo.', steps: ['Revisamos sistema y almacenamiento', 'Corregimos la falla de software', 'Actualizamos y optimizamos'] },
        { k: 'Liberación de red o cuenta', head: 'Liberación de red y cuentas', text: 'Ofrecemos liberación de red y cuentas para equipos de tu propiedad.', steps: ['Nos compartes marca y modelo', 'Revisamos si es posible en tu caso', 'Te confirmamos cómo procedemos'] },
      ],
    },
    camaras: {
      msg: (k) => `Hola GT Computers 👋 Necesito ayuda con cámaras de seguridad: "${k}". ¿Me orientan?`,
      symptoms: [
        { k: 'Quiero instalar un kit nuevo', head: 'Instalación de tu kit', text: 'Kits de 4, 8 o 16 cámaras con DVR, cables y accesorios, instalados en tu casa o negocio.', steps: ['Revisamos tu espacio y los puntos a vigilar', 'Instalamos cámaras, DVR y cableado', 'Configuramos tu celular para ver en vivo'] },
        { k: 'Mis cámaras no graban o no se ven', head: 'Revisión de tu sistema', text: 'Localizamos si el problema está en las cámaras, el cableado o el grabador.', steps: ['Revisamos cámaras, cableado y DVR', 'Verificamos grabación y almacenamiento', 'Corregimos la falla o cambiamos el equipo dañado'] },
        { k: 'Quiero verlas desde mi celular', head: 'Configuración en el celular', text: 'Ve tu casa o negocio en vivo desde cualquier lugar.', steps: ['Conectamos tu DVR a internet', 'Configuramos la aplicación en tu celular', 'Te enseñamos a revisar las grabaciones'] },
        { k: 'Necesito mantenimiento', head: 'Mantenimiento de cámaras', text: 'Mantén tu sistema en forma para que grabe cuando más lo necesitas.', steps: ['Limpieza de lentes y revisión de cableado', 'Pruebas de grabación y almacenamiento', 'Ajuste de ángulos y recomendaciones'] },
      ],
    },
    pos: {
      msg: (k) => `Hola GT Computers 👋 Necesito ayuda con un punto de venta: "${k}". ¿Me orientan?`,
      symptoms: [
        { k: 'Quiero un punto de venta nuevo', head: 'Tu kit de punto de venta', text: 'Computadora, lector de códigos, caja de dinero e impresora térmica, con instalación gratuita.', steps: ['Elegimos el programa: SICAR, eleventa, SoftRestaurant y más', 'Instalamos y configuramos tu kit sin costo', 'Te damos la clase gratuita de 10 horas'] },
        { k: 'Mi sistema falla o va lento', head: 'Revisión de tu sistema', text: 'Revisamos el equipo y el programa para que tu caja nunca se detenga.', steps: ['Revisamos equipo y programa', 'Optimizamos o reparamos el equipo', 'Dejamos tu caja operando con soporte'] },
        { k: 'La impresora o el lector no funcionan', head: 'Impresora, lector y caja', text: 'Diagnosticamos cada periférico para que cobrar vuelva a ser rápido.', steps: ['Probamos impresora térmica, lector y caja', 'Reinstalamos controladores', 'Cambiamos la pieza que lo requiera'] },
        { k: 'Necesito capacitación', head: 'Capacitación para tu equipo', text: 'Aprende a usar tu programa con alguien que te acompaña.', steps: ['Clase de 10 horas vía remota o 2 días presenciales', 'Uso y manejo básico del programa', 'Soporte para tus dudas posteriores'] },
      ],
    },
  };

  function radioKeys(group) {
    group.addEventListener('keydown', (e) => {
      const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
      if (!keys.includes(e.key)) return;
      const items = $$('[role="radio"]', group);
      const i = items.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      const next = items[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
      next.focus();
      next.click();
    });
  }

  function initDiag() {
    const box = $('#diag');
    if (!box) return;
    const devBtns = $$('.seg__btn', box);
    const symWrap = $('#diagSymptoms');
    const empty = $('#diagEmpty'), scan = $('#diagScan'), result = $('#diagResult');
    const head = $('#diagHead'), text = $('#diagText'), steps = $('#diagSteps'), cta = $('#cta-diag'), status = $('#diagStatus');
    let dev = null, timer = 0;

    const show = (w) => {
      empty.hidden = w !== 'empty';
      scan.hidden = w !== 'scan';
      result.hidden = w !== 'result';
      if (w === 'scan') {
        const b = $('.diag__bar i', scan);
        b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
      }
    };
    const pickSym = (i) => {
      $$('.sym', symWrap).forEach((b, j) => b.setAttribute('aria-checked', String(j === i)));
      show('scan');
      status.textContent = 'Analizando';
      clearTimeout(timer);
      timer = setTimeout(() => {
        const s = DIAG[dev].symptoms[i];
        head.textContent = s.head;
        text.textContent = s.text;
        steps.innerHTML = s.steps.map((t) => `<li>${t}</li>`).join('');
        cta.href = waLink(DIAG[dev].msg(s.k));
        show('result');
        status.textContent = 'Listo';
      }, REDUCE ? 0 : 1050);
    };
    const pickDevice = (key) => {
      dev = key;
      clearTimeout(timer);
      devBtns.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.device === key)));
      symWrap.innerHTML = '';
      DIAG[key].symptoms.forEach((s, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'sym';
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', 'false');
        b.style.setProperty('--n', String(i));
        b.textContent = s.k;
        b.addEventListener('click', () => pickSym(i));
        symWrap.appendChild(b);
      });
      show('empty');
      status.textContent = 'Elige síntoma';
    };
    devBtns.forEach((b) => b.addEventListener('click', () => pickDevice(b.dataset.device)));
    radioKeys($('#diagDevices'));
    radioKeys(symWrap);
    pickDevice('laptop');
    status.textContent = 'Listo';
  }

  /* ==========================================================================
     CELULARES · pines interactivos + comparador antes/después
     ========================================================================== */
  function initPhones() {
    const items = $$('.ritem');
    const pins = $$('.pin');
    const label = $('#pinLabel');
    const wrap = $('#celulares');
    if (!items.length || !wrap) return;
    const names = { bateria: 'Batería', pantalla: 'Pantalla', microfono: 'Micrófono', bocinas: 'Bocinas', altavoz: 'Altavoz' };
    const keys = items.map((i) => i.dataset.pin);
    let idx = 0, auto = true, inView = false;
    const set = (key) => {
      idx = keys.indexOf(key);
      items.forEach((i) => i.classList.toggle('is-on', i.dataset.pin === key));
      pins.forEach((p) => p.classList.toggle('is-on', p.dataset.pin === key));
      if (label) label.textContent = names[key] || key;
    };
    [...items, ...pins].forEach((el) => {
      el.addEventListener('click', () => { auto = false; set(el.dataset.pin); });
      el.addEventListener('mouseenter', () => { if (mqFine.matches) { auto = false; set(el.dataset.pin); } });
    });
    if (!REDUCE) setInterval(() => { if (auto && inView) set(keys[(idx + 1) % keys.length]); }, 3200);
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { inView = es[0].isIntersecting; }, { threshold: 0.2 }).observe(wrap);
  }

  function initCompare() {
    const phone = $('#baPhone');
    const range = $('#baRange');
    if (!phone || !range) return;
    let touched = false;
    const set = (v) => { phone.style.setProperty('--ba', v + '%'); phone.style.setProperty('--bn', String(v)); };
    range.addEventListener('input', () => { touched = true; set(range.value); });
    set(50);
    if (REDUCE || !('IntersectionObserver' in window)) return;
    const seq = [{ to: 16, d: 800 }, { to: 84, d: 1300 }, { to: 50, d: 800 }];
    const demo = () => {
      let from = 50, si = 0, t0 = performance.now();
      const step = (now) => {
        if (touched) return;
        const s = seq[si];
        const t = clamp((now - t0) / s.d);
        set((from + (s.to - from) * ease.io(t)).toFixed(1));
        if (t >= 1) { from = s.to; si += 1; t0 = now; if (si >= seq.length) { range.value = '50'; return; } }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); setTimeout(demo, 600); } }, { threshold: 0.55 });
    io.observe(phone);
  }

  /* ==========================================================================
     CÁMARAS — monitor NVR + selector de kit
     ========================================================================== */
  function initCams() {
    const grid = $('#nvrGrid');
    if (!grid) return;
    const count = $('#nvrCount'), clock = $('#nvrClock'), cta = $('#cta-cam');
    const kits = $$('.kit');
    let n = 4;

    const pad = (v) => String(v).padStart(2, '0');
    const stamp = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };

    const build = (num) => {
      n = num;
      grid.dataset.n = String(num);
      grid.innerHTML = '';
      for (let i = 0; i < num; i++) {
        const el = document.createElement('div');
        el.className = `cam cam--s${i % 4}`;
        el.style.setProperty('--n', String(i));
        el.innerHTML = `<i class="cam__scene"></i><i class="cam__scan"></i><i class="cam__vig"></i><span class="cam__hud"><span class="rec"></span>CAM ${pad(i + 1)}</span><span class="cam__time"></span><i class="cam__det" style="left:${(14 + Math.random() * 40).toFixed(0)}%;top:${(28 + Math.random() * 30).toFixed(0)}%;width:${(16 + Math.random() * 10).toFixed(0)}%;height:${(30 + Math.random() * 14).toFixed(0)}%"></i>`;
        grid.appendChild(el);
      }
      if (count) count.textContent = String(num);
      tickClock();
      if (cta) cta.href = waLink(`Hola GT Computers 👋 Quiero vigilar lo que más me importa. Me interesa el Kit de ${num} cámaras (con DVR, cables y accesorios) con instalación. ¿Me comparten cotización?`);
    };
    const tickClock = () => {
      const s = stamp();
      if (clock) clock.textContent = s;
      $$('.cam__time', grid).forEach((t) => { t.textContent = s; });
    };
    const motion = () => {
      const cams = $$('.cam', grid);
      if (!cams.length) return;
      const c = cams[(Math.random() * cams.length) | 0];
      c.classList.add('has-det');
      setTimeout(() => c.classList.remove('has-det'), 3600);
    };

    kits.forEach((k) => k.addEventListener('click', () => {
      kits.forEach((o) => { const on = o === k; o.classList.toggle('is-on', on); o.setAttribute('aria-checked', String(on)); });
      build(parseInt(k.dataset.kit, 10));
    }));
    radioKeys($('#kits'));
    build(4);
    if (!REDUCE) { setInterval(tickClock, 1000); setInterval(motion, 2600); setTimeout(motion, 900); }
  }

  /* ==========================================================================
     TICKET DEL PUNTO DE VENTA · FAQ · FORMULARIO · WHATSAPP FLOTANTE
     ========================================================================== */
  function initReceipt() {
    const wrap = $('#receiptWrap');
    if (!wrap) return;
    if (REDUCE || !('IntersectionObserver' in window)) { wrap.classList.add('is-in'); return; }
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); wrap.classList.add('is-in'); } }, { threshold: 0.4 });
    io.observe(wrap);
  }

  function initFaq() {
    const items = $$('.acc__item');
    items.forEach((item) => {
      const btn = $('.acc__btn', item);
      btn.addEventListener('click', () => {
        const open = !item.classList.contains('is-open');
        items.forEach((o) => {
          if (o === item) return;
          o.classList.remove('is-open');
          $('.acc__btn', o).setAttribute('aria-expanded', 'false');
        });
        item.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
        setTimeout(() => eng.requestMeasure(), 720);
      });
    });
  }

  function initForm() {
    const form = $('#form');
    if (!form) return;
    const ok = $('#formOk');
    const fallback = $('#formFallback');
    const fields = {
      nombre: form.elements['nombre'],
      servicio: form.elements['servicio'],
      mensaje: form.elements['mensaje'],
    };
    const mark = (el, bad) => { const f = el.closest('.field'); if (f) f.classList.toggle('is-bad', bad); };
    ['nombre', 'servicio'].forEach((k) => {
      fields[k].addEventListener('input', () => mark(fields[k], !fields[k].value.trim()));
      fields[k].addEventListener('change', () => mark(fields[k], !fields[k].value.trim()));
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = fields.nombre.value.trim();
      const svc = fields.servicio.value.trim();
      const msg = fields.mensaje.value.trim();
      mark(fields.nombre, !name);
      mark(fields.servicio, !svc);
      if (!name || !svc) { (!name ? fields.nombre : fields.servicio).focus(); return; }
      const text = `Hola GT Computers 👋 Soy ${name}. Me interesa: ${svc}.` + (msg ? `\n\n${msg}` : '') + '\n\nQuiero mi diagnóstico / cotización. ¿Me ayudan?';
      const url = waLink(text);
      if (fallback) fallback.href = url;
      if (ok) ok.hidden = false;
      window.open(url, '_blank', 'noopener');
    });
  }

  function initWaFloat() {
    const bubble = $('#waBubble');
    const close = $('#waClose');
    if (!bubble) return;
    let dismissed = false;
    try { dismissed = sessionStorage.getItem('gt-wa-bubble') === '1'; } catch (e) { /* sin storage */ }
    if (!dismissed) {
      setTimeout(() => bubble.classList.add('is-show'), 9000);
      setTimeout(() => bubble.classList.remove('is-show'), 17000);
    }
    if (close) close.addEventListener('click', () => {
      bubble.classList.remove('is-show');
      try { sessionStorage.setItem('gt-wa-bubble', '1'); } catch (e) { /* sin storage */ }
    });
  }

  /* ==========================================================================
     ARRANQUE
     ========================================================================== */
  function boot() {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (!location.hash) window.scrollTo(0, 0);

    safe('links', initLinks);
    safe('split', initSplit);
    safe('nav', initNav);
    safe('loader', initLoader);
    safe('reveal', initReveal);
    safe('counters', initCounters);
    safe('cursor', initCursor);
    safe('pointerfx', initPointerFx);
    safe('herofx', initHeroFx);
    safe('network', initNetwork);

    // Orden importa: el scroll horizontal cambia la altura del documento, así que va primero.
    safe('hs', taskHorizontal);
    safe('marquee', initMarquee);
    safe('chrome', taskChrome);
    safe('statement', taskStatement);
    safe('expand', taskExpand);
    safe('timeline', taskTimeline);
    safe('stack', taskStack);
    safe('log', initLog);
    safe('parallax', taskParallax);

    safe('diag', initDiag);
    safe('phones', initPhones);
    safe('compare', initCompare);
    safe('cams', initCams);
    safe('receipt', initReceipt);
    safe('faq', initFaq);
    safe('form', initForm);
    safe('wa', initWaFloat);

    eng.measure();
    eng.start();

    let rt = 0;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => eng.requestMeasure(), 140); });
    window.addEventListener('load', () => eng.requestMeasure());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => eng.requestMeasure());
    if ('ResizeObserver' in window) {
      let lastH = 0, raf = 0;
      new ResizeObserver(() => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const h = document.body.scrollHeight;
          if (Math.abs(h - lastH) > 2) { lastH = h; eng.requestMeasure(); }
        });
      }).observe(document.body);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
