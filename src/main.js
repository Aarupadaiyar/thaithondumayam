// Shared behaviour for every page: language, nav, smooth scroll, reveals,
// photo slots, lightbox, counters and the tagline word reveal.
import './styles.css';
import './sections.css';
import './events.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

// always open at the top, so the hero entrance plays every time (event kiosks reload a lot)
if ('scrollRestoration' in history && !location.hash) { history.scrollRestoration = 'manual'; window.scrollTo(0, 0); }

export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;

/* ---------- language ---------- */
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

function setLang(lang) {
  root.dataset.lang = lang;
  root.lang = lang;
  const title = root.dataset[lang === 'ta' ? 'titleTa' : 'titleEn'];
  if (title) document.title = title;
  document.querySelectorAll('[data-alt-en]').forEach((el) => {
    const alt = el.dataset[lang === 'ta' ? 'altTa' : 'altEn'];
    el.setAttribute('aria-label', alt);
    const img = el.querySelector('img');
    if (img) img.alt = alt;
  });
  document.querySelectorAll('.lang').forEach((b) => b.setAttribute('aria-label', lang === 'ta' ? 'Switch to English' : 'தமிழுக்கு மாறவும்'));
  store.set('ttm-lang', lang);
  requestAnimationFrame(() => ScrollTrigger.refresh());
}
setLang(new URLSearchParams(location.search).get('lang') || store.get('ttm-lang') || 'en');
document.querySelectorAll('.lang').forEach((b) =>
  b.addEventListener('click', () => setLang(root.dataset.lang === 'ta' ? 'en' : 'ta'))
);

/* ---------- smooth scroll ---------- */
export let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

document.querySelectorAll('a[href^="#"]').forEach((a) =>
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(target, { offset: -24, duration: 1.8 });
    else target.scrollIntoView({ behavior: 'smooth' });
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  })
);

/* ---------- nav ---------- */
const nav = document.querySelector('.nav');
const burger = document.querySelector('.burger');
function closeMenu() {
  document.body.classList.remove('menu-open');
  burger?.setAttribute('aria-expanded', 'false');
  lenis?.start();
}
burger?.addEventListener('click', () => {
  const open = document.body.classList.toggle('menu-open');
  burger.setAttribute('aria-expanded', String(open));
  open ? lenis?.stop() : lenis?.start();
});
document.addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu());

let lastY = 0;
ScrollTrigger.create({
  start: 0,
  end: 'max',
  onUpdate: (self) => {
    const y = self.scroll();
    nav?.classList.toggle('is-hidden', y > 240 && y > lastY && !document.body.classList.contains('menu-open'));
    lastY = y;
  },
});

/* ---------- photo slots: real image or a patterned placeholder ---------- */
const glyph = `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M32 60V14M32 6l-5 10h10zM18 10c0 12 4 18 14 18s14-6 14-18M18 10l-3 6M46 10l3 6M26 44h12"/></svg>`;
document.querySelectorAll('.media[data-src]').forEach((slot) => {
  slot.insertAdjacentHTML('beforeend', `<span class="media__glyph">${glyph}</span>`);
  // show the expected filename on empty slots while developing only
  if (import.meta.env.DEV) slot.dataset.hint = slot.dataset.hint || slot.dataset.src.replace(/^\//, 'public/');
  const img = new Image();
  img.decoding = 'async';
  img.loading = 'lazy';
  img.alt = slot.getAttribute('aria-label') || '';
  img.onload = () => slot.classList.add('loaded');
  img.onerror = () => { img.remove(); slot.classList.add('is-empty'); };
  img.src = slot.dataset.src;
  slot.prepend(img);
});

/* ---------- lightbox for galleries ---------- */
const box = document.querySelector('.lightbox');
if (box) {
  const big = box.querySelector('img');
  document.querySelectorAll('.gallery .media, .media--poster').forEach((m) => {
    m.tabIndex = 0;
    const open = () => {
      const img = m.querySelector('img');
      if (!m.classList.contains('loaded') || !img) return;
      big.src = img.src;
      big.alt = img.alt;
      box.classList.add('open');
      lenis?.stop();
    };
    m.addEventListener('click', open);
    m.addEventListener('keydown', (e) => e.key === 'Enter' && open());
  });
  const close = () => { box.classList.remove('open'); lenis?.start(); };
  box.addEventListener('click', close);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && close());
}

/* ---------- copy a number (GPay) to the clipboard ---------- */
document.querySelectorAll('[data-copy-btn]').forEach((btn) => {
  const label = btn.innerHTML;
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copyBtn);
      btn.classList.add('copied');
      btn.innerHTML = '<span lang="en">Copied</span><span lang="ta">நகலெடுக்கப்பட்டது</span>';
    } catch {
      btn.innerHTML = btn.dataset.copyBtn; // clipboard blocked: show the number to copy by hand
    }
    setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = label; }, 2200);
  });
});

/* ---------- scroll reveals ---------- */
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }),
  { rootMargin: '0px 0px -12% 0px' }
);
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

/* ---------- counters ---------- */
document.querySelectorAll('[data-count]').forEach((el) => {
  const end = Number(el.dataset.count);
  const obj = { v: 0 };
  ScrollTrigger.create({
    trigger: el,
    start: 'top 85%',
    once: true,
    onEnter: () => gsap.to(obj, {
      v: end, duration: reduced ? 0 : 2.2, ease: 'expo.out',
      onUpdate: () => (el.textContent = Math.round(obj.v)),
    }),
  });
});

/* ---------- tagline: words light up one by one in reading order ---------- */
document.querySelectorAll('.tagline__text').forEach((block) => {
  block.querySelectorAll('[lang]').forEach((part) => {
    const words = [];
    const walk = (node, hot) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { words.push(document.createTextNode(tok)); return; }
            const s = document.createElement('span');
            s.className = hot ? 'w hot' : 'w';
            s.textContent = tok;
            words.push(s);
          });
        } else if (n.nodeName === 'BR') {
          words.push(document.createElement('br'));
        } else {
          walk(n, hot || n.nodeName === 'MARK');
        }
      });
    };
    walk(part, false);
    part.replaceChildren(...words);
  });
  ScrollTrigger.create({
    trigger: block,
    start: 'top 75%',
    end: 'bottom 45%',
    scrub: true,
    onUpdate: (self) => {
      const list = block.querySelectorAll(`[lang="${root.dataset.lang}"] .w`);
      const lit = Math.round(self.progress * list.length);
      list.forEach((w, i) => w.classList.toggle('on', i < lit));
    },
  });
});

/* ---------- 3D tilt on cards ---------- */
if (!reduced && matchMedia('(hover: hover)').matches) {
  document.querySelectorAll('[data-tilt]').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-6px)`;
    });
    card.addEventListener('pointerleave', () => (card.style.transform = ''));
  });
}

/* ---------- entrance: no blocking loader, headlines rise on first frame ---------- */
export function finishLoading() {
  requestAnimationFrame(() => {
    document.body.classList.add('ready');
    ScrollTrigger.refresh();
  });
}

document.querySelector('#year') && (document.querySelector('#year').textContent = new Date().getFullYear());

export { gsap, ScrollTrigger };
