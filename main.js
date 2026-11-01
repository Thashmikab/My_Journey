import {
  animate, createTimeline, stagger, onScroll, svg, utils,
} from './vendor/anime.esm.min.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const NS = 'http://www.w3.org/2000/svg';

/* ---------- build pieces that are easier to generate ---------- */

// stars in the hero sky
const stars = $('.stars');
const rand = utils.createSeededRandom(7, 0, 1, 4);
for (let i = 0; i < 60; i++) {
  const c = document.createElementNS(NS, 'circle');
  c.setAttribute('cx', (rand() * 1200).toFixed(1));
  c.setAttribute('cy', (rand() * 380).toFixed(1));
  c.setAttribute('r', (0.6 + rand() * 1.2).toFixed(2));
  c.setAttribute('class', 'star');
  c.setAttribute('opacity', (0.2 + rand() * 0.6).toFixed(2));
  stars.appendChild(c);
}

// split the name into letters
const nameEl = $('.name');
nameEl.innerHTML = nameEl.textContent.split(' ').map(word =>
  `<span class="word">${[...word].map(ch => `<span class="ch" aria-hidden="true">${ch}</span>`).join('')}</span>`
).join(' ');

// illustrative Pareto front: convex curve with a clear knee
const front = $('.front');
const pts = [];
const N = 34;
for (let i = 0; i < N; i++) {
  const t = i / (N - 1);
  const x = 62 + 328 * t;                                  // burden, left = low
  const y = 285 - 250 * Math.pow(1 - t, 3.2);              // material, bottom = low
  const jitter = (i % 3 - 1) * 2.2;
  pts.push([x, y + jitter]);
}
// knee: in normalised (low = good) space, the point furthest towards the ideal
// from the line between the two extremes (same rule as paretolens)
const xs = pts.map(p => p[0]), ys = pts.map(p => 290 - p[1]);
const nx = v => (v - Math.min(...xs)) / (Math.max(...xs) - Math.min(...xs));
const ny = v => (v - Math.min(...ys)) / (Math.max(...ys) - Math.min(...ys));
let kneeIdx = 0, best = -Infinity;
pts.forEach((_, i) => {
  const d = 1 - nx(xs[i]) - ny(ys[i]);
  if (d > best) { best = d; kneeIdx = i; }
});
const dots = $('.dots', front);
pts.forEach(([x, y], i) => {
  const c = document.createElementNS(NS, 'circle');
  c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1));
  c.setAttribute('r', i === kneeIdx ? 6 : 4.2);
  if (i === kneeIdx) c.style.fill = 'var(--cu)';
  dots.appendChild(c);
});
$('.front-line', front).setAttribute('d', 'M' + pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L'));
const [kx, ky] = pts[kneeIdx];
const ring = $('.knee-ring', front);
ring.setAttribute('cx', kx); ring.setAttribute('cy', ky);
const kl = $('.knee-lbl', front);
kl.setAttribute('x', kx + 18); kl.setAttribute('y', ky - 14);

/* ---------- reduced motion: show everything, stop here ---------- */
if (reduce) {
  $$('.nodes circle').forEach(c => c.classList.add('on'));
  $$('.num').forEach(n => { n.textContent = n.dataset.to; });
  $('.spark').style.display = 'none';
} else {
  document.documentElement.classList.add('js-anim');
  run();
}

function run() {
  /* ---------- hero ---------- */

  // turbines spin forever, each at its own speed
  $$('.rotor').forEach((r, i) => {
    animate(r, { rotate: [i * 37, 360 + i * 37], duration: [5200, 3900, 4600, 3400][i] ?? 4200,
      ease: 'linear', loop: true });
  });

  // sea swell drifts
  animate('.swell', { x: [0, -80], duration: 6000, ease: 'linear', loop: true });
  animate('.swell.s2', { x: [0, 100], duration: 9000, ease: 'linear', loop: true });

  // stars twinkle
  animate('.star', { opacity: () => [0.15, 0.6 + Math.random() * 0.4], duration: () => 1500 + Math.random() * 2500,
    delay: stagger(60), loop: true, alternate: true, ease: 'inOutSine' });

  // intro timeline: letters -> text -> cable draws -> spark runs
  const cable = svg.createDrawable('.hero-cable');
  const tl = createTimeline({ defaults: { ease: 'outExpo' } });
  tl.add('.name .ch', { y: ['0.6em', 0], opacity: [0, 1], rotate: [8, 0], duration: 1100, delay: stagger(35) })
    .add('.hero .reveal', { y: [18, 0], opacity: [0, 1], duration: 900, delay: stagger(110) }, '-=700')
    .add(cable, { draw: ['0 0', '0 1'], duration: 2200, ease: 'inOutQuad' }, '-=600');

  const { translateX, translateY } = svg.createMotionPath('.hero-cable');
  utils.set('.spark', { opacity: 0 });
  animate('.spark', { translateX, translateY, opacity: [{ to: 1, duration: 200 }, { to: 1, duration: 2200 }, { to: 0, duration: 200 }],
    duration: 2600, ease: 'linear', loop: true, delay: 2600 });

  // scroll hint bobs
  animate('.scroll-hint span', { y: [0, 12], opacity: [1, 0], duration: 1400, loop: true, ease: 'inOutSine' });

  // hero scene drifts up slower than the page (parallax)
  animate('.turbines', {
    y: [0, 60], ease: 'linear',
    autoplay: onScroll({ target: '.hero', enter: 'start start', leave: 'start end', sync: true }),
  });

  /* ---------- story: copper line draws as you scroll ---------- */
  const flow = svg.createDrawable('.flow-line');
  const nodes = $$('.nodes circle');
  animate(flow, {
    draw: ['0 0', '0 1'], ease: 'linear',
    autoplay: onScroll({ target: '.flow', enter: 'end start', leave: 'center center', sync: 0.25 }),
    onUpdate: (self) => {
      const p = self.progress;
      nodes.forEach((n, i) => n.classList.toggle('on', p >= i / (nodes.length - 1) - 0.02));
    },
  });
  revealOnScroll('.stages li', '.stages', { y: [24, 0] }, 90);

  /* ---------- approach: counters + cards ---------- */
  $$('.num').forEach((el) => {
    const counter = { v: 0 };
    animate(counter, {
      v: +el.dataset.to, duration: 1600, ease: 'outExpo', modifier: utils.round(0),
      onUpdate: () => { el.textContent = counter.v; },
      autoplay: onScroll({ target: el, enter: 'end-=10% start' }),
    });
  });
  revealOnScroll('.stat', '.stats', { y: [30, 0] }, 120);
  revealOnScroll('#approach .card', '#approach .cards', { y: [30, 0] }, 120);

  /* ---------- pareto: dots fall into place, knee pulses ---------- */
  const line = svg.createDrawable('.front-line');
  const ptl = createTimeline({ autoplay: onScroll({ target: '.front', enter: 'end-=15% start' }) });
  ptl.add('.dots circle', { opacity: [0, 1], scale: [0, 1], translateY: () => [utils.random(-80, -20), 0],
        duration: 700, delay: stagger(28), ease: 'outBack(1.6)' })
     .add(line, { draw: ['0 0', '0 1'], duration: 900, ease: 'inOutQuad' }, '-=500')
     .add('.knee-ring', { opacity: [0, 1], scale: [2.4, 1], duration: 700, ease: 'outElastic(1, .6)' })
     .add('.knee-lbl', { opacity: [0, 1], translateX: [-6, 0], duration: 500 }, '-=400');
  utils.set(['.knee-ring', '.knee-lbl'], { opacity: 0 });
  utils.set('.knee-ring', { transformOrigin: `${kx}px ${ky}px` });
  animate('.knee-ring', { strokeWidth: [3, 6, 3], duration: 1600, loop: true, ease: 'inOutSine', delay: 3500 });

  /* ---------- tools, papers, teaching ---------- */
  revealOnScroll('#tools .card', '#tools .cards', { y: [40, 0], rotate: [() => utils.random(-2, 2), 0] }, 120);
  revealOnScroll('.timeline li', '.timeline', { x: [-24, 0] }, 120);
  revealOnScroll('.teach-box', '.teach-box', { y: [30, 0] }, 0);
}

function revealOnScroll(targets, trigger, extra, step) {
  animate(targets, {
    opacity: [0, 1], ...extra, duration: 900, ease: 'outExpo', delay: stagger(step),
    autoplay: onScroll({ target: trigger, enter: 'end-=12% start' }),
  });
}
