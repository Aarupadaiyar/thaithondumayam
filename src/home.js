// Home page: the Shiva + fire hero, the trident flying through the journey,
// and the lingam in the sanctum. Text paints first; three.js and the models
// stream in behind it.
import { gsap, ScrollTrigger, reduced, finishLoading } from './main.js';
import { state } from './scene/state.js';

if (import.meta.env.DEV) window.__ttm = state;

finishLoading();

import('./scene/world.js').then(({ createWorld }) => {
  createWorld(document.querySelector('.stage canvas'), {
    mode: 'home',
    state,
    templeAnchor: document.querySelector('.temple__stage'),
    onModel: (name) => {
      if (name !== 'shiva') return;
      document.body.classList.add('shiva-in');
      // Shiva rises into the flames
      gsap.to(state, { shivaIn: 1, duration: reduced ? 0 : 2.2, ease: 'expo.out' });
    },
  });
});

/* ---------- scroll choreography ---------- */
// 1. hero → Shiva ascends and the fire settles
gsap.timeline({
  scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 },
})
  .to(state.shiva, { y: 4.8, s: 0.55, xf: 0.36, ease: 'none' }, 0)
  .to(state, { fire: 0, ease: 'none' }, 0)
  .to(state, { dustScroll: 2, ease: 'none' }, 0);

// 2. trident descends as the journey arrives
gsap.timeline({
  scrollTrigger: { trigger: '.journey', start: 'top bottom', end: 'top top', scrub: 1 },
})
  .fromTo(state.trident, { y: 8, rz: 0.6 }, { y: -0.2, rz: 0.22, ease: 'power2.out' });

// 3. pinned horizontal journey; trident sweeps across and spins
const track = document.querySelector('.journey__track');
const pin = document.querySelector('.journey__pin');
ScrollTrigger.matchMedia({
  '(min-width: 761px) and (prefers-reduced-motion: no-preference)': () => {
    const distance = () => track.scrollWidth - window.innerWidth + 48;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });
    tl.to(track, { x: () => -distance(), ease: 'none' }, 0)
      .to('.journey__progress i', { scaleX: 1, ease: 'none' }, 0)
      .fromTo(state.trident, { xf: 0.62 }, { xf: -0.62, ry: Math.PI * 4, ease: 'none' }, 0)
      .to(state, { dustScroll: 6, ease: 'none' }, 0);
    return () => tl.kill();
  },
  '(max-width: 760px)': () => {
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '.journey', start: 'top top', end: 'bottom bottom', scrub: 1 },
    });
    tl.fromTo(state.trident, { xf: 1.6, ry: 0 }, { xf: 1.6, ry: Math.PI * 4, ease: 'none' });
    return () => tl.kill();
  },
});

// 4. trident leaves before the sanctum, where the lingam takes over
gsap.timeline({
  scrollTrigger: { trigger: '.temple', start: 'top bottom', end: 'top 30%', scrub: 1 },
}).to(state.trident, { y: -9, ry: `+=${Math.PI * 2}`, ease: 'power2.in' });

// 5. Shiva returns quietly beside the invitation (wide screens only: on
//    phones it would sit on top of the text)
ScrollTrigger.matchMedia({
  '(min-width: 961px)': () => {
    gsap.timeline({
      scrollTrigger: { trigger: '#support', start: 'top bottom', end: 'top 20%', scrub: 1 },
    })
      .fromTo(state.shiva, { y: -6, s: 0.5, xf: 0 }, { y: -0.2, s: 0.8, xf: 0.4, ease: 'power2.out', immediateRender: false }, 0)
      .fromTo(state, { fire: 0 }, { fire: 0.6, ease: 'none', immediateRender: false }, 0);
    gsap.timeline({
      scrollTrigger: { trigger: '.support', start: 'top 70%', end: 'top 10%', scrub: 1 },
    }).to(state, { fire: 0, ease: 'none' }).to(state.shiva, { s: 0, ease: 'none' }, 0);
  },
});

/* ---------- FAQ: keep pinned sections measured correctly ---------- */
document.querySelectorAll('.faq details').forEach((d) => {
  d.addEventListener('toggle', () => ScrollTrigger.refresh());
});
