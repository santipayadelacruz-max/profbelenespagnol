
// Menu mobile
const burger = document.getElementById('burger'), menu = document.getElementById('menu');
burger.addEventListener('click', () => burger.setAttribute('aria-expanded', menu.classList.toggle('open')));
menu.addEventListener('click', e => { if (e.target.tagName === 'A' && !e.target.closest('.sub-toggle')) { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); } });

// Mot qui change dans le titre
const words = ['avec ta belle-famille.', 'en voyage.', 'au restaurant.', 'au travail.', 'sans traducteur.'];
let swapEl = document.getElementById('swap'), w = 0;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduce && swapEl) setInterval(() => {
  w = (w + 1) % words.length;
  const s = swapEl.cloneNode(); s.textContent = words[w];
  swapEl.replaceWith(s); swapEl = s;
}, 2600);

// Carrousel de témoignages
if (document.getElementById('track')) {
const track = document.getElementById('track'), cards = [...track.children], dots = document.getElementById('dots');
cards.forEach(() => dots.appendChild(document.createElement('i')));
const step = () => cards[0].getBoundingClientRect().width + 22;
document.getElementById('prev').onclick = () => track.scrollBy({ left: -step() });
document.getElementById('next').onclick = () => go(1);
function go(d) { const end = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8; if (d > 0 && end) track.scrollTo({ left: 0 }); else track.scrollBy({ left: d * step() }); }
function mark() { const i = Math.round(track.scrollLeft / step()); [...dots.children].forEach((d, k) => d.classList.toggle('on', k === Math.min(i, cards.length - 1))); }
track.addEventListener('scroll', mark, { passive: true }); mark();
let paused = false;
['mouseenter', 'focusin', 'touchstart'].forEach(ev => track.addEventListener(ev, () => paused = true, { passive: true }));
['mouseleave', 'focusout'].forEach(ev => track.addEventListener(ev, () => paused = false));
if (!reduce) setInterval(() => { if (!paused && !document.hidden) go(1); }, 4200);

}

// Vidéos : lecture au clic
document.querySelectorAll('.vcard').forEach(card => {
  const v = card.querySelector('video');
  card.querySelector('.play').addEventListener('click', () => {
    document.querySelectorAll('.vcard video').forEach(o => { if (o !== v) { o.pause(); } });
    v.controls = true; card.classList.add('playing');
    v.play().catch(() => {});
  });
});

// ====== Instagram en temps réel (Behold) ======
// 1. Créer un compte gratuit sur behold.so et connecter @profbelenespagnol
// 2. Créer un flux « JSON » et coller son URL ci-dessous (ex. https://feeds.behold.so/AbC123)
const BEHOLD_FEED_URL = '';
// Valeur de secours tant que le flux n'est pas connecté (ex. 48200)
const INSTAGRAM_ABONNES_SECOURS = 12000;

const fmtFollowers = n => n >= 1e6 ? (n / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' M'
  : n >= 1e4 ? (n / 1e3).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' k'
  : n.toLocaleString('fr-FR');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function paintFollowers(n, live) {
  document.querySelectorAll('.ig-count').forEach(el => {
    el.classList.remove('todo');
    if (reduceMotion || !live) { el.textContent = fmtFollowers(n); return; }
    const t0 = performance.now(), from = Math.round(n * 0.6), dur = 1400;
    const tick = t => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmtFollowers(Math.round(from + (n - from) * e)); if (p < 1) requestAnimationFrame(tick); else el.classList.add('live'); };
    requestAnimationFrame(tick);
  });
  document.querySelectorAll('.ig-live').forEach(el => el.hidden = !live);
}
function paintPosts(posts) {
  const grid = document.querySelector('.ig-grid'); if (!grid || !posts?.length) return;
  grid.innerHTML = posts.slice(0, 6).map(p => {
    const img = p.sizes?.medium?.mediaUrl || p.thumbnailUrl || p.mediaUrl;
    const cap = (p.prunedCaption || '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
    return `<a class="post" href="${p.permalink}" rel="noopener"><img src="${img}" alt="${cap.slice(0, 120) || 'Publication Instagram de profbelenespagnol'}" loading="lazy"><span>${cap.slice(0, 60) || 'Voir sur Instagram'}</span></a>`;
  }).join('');
}
(async () => {
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem('pbe_ig') || 'null'); } catch {}
  if (cached?.n) paintFollowers(cached.n, false);
  else if (INSTAGRAM_ABONNES_SECOURS) paintFollowers(INSTAGRAM_ABONNES_SECOURS, false);
  else document.querySelectorAll('.ig-count').forEach(el => el.classList.add('todo'));
  if (!BEHOLD_FEED_URL) return;
  try {
    const r = await fetch(BEHOLD_FEED_URL, { cache: 'no-store' }); if (!r.ok) throw 0;
    const feed = await r.json();
    if (typeof feed.followersCount === 'number') {
      paintFollowers(feed.followersCount, true);
      try { localStorage.setItem('pbe_ig', JSON.stringify({ n: feed.followersCount, t: Date.now() })); } catch {}
    }
    paintPosts(feed.posts);
  } catch { /* on garde la valeur affichée */ }
})();

// ====== Effets interactifs ======
if (!reduceMotion) {
  // Parallax du héros et des taches de couleur
  const photo = document.querySelector('.hero-photo'), hero = document.querySelector('.hero');
  hero?.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    photo.style.setProperty('--mx', x.toFixed(3)); photo.style.setProperty('--my', y.toFixed(3));
    hero.style.setProperty('--px', x.toFixed(3)); hero.style.setProperty('--py', y.toFixed(3));
  });
  // Inclinaison 3D des cartes
  const fine = matchMedia('(pointer: fine)').matches;
  if (fine) document.querySelectorAll('.profile, .program, .aval, .note, .step, .ig-card').forEach(c => {
    c.classList.add('tilt');
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      c.classList.add('tilting'); c.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-6px)`;
    });
    c.addEventListener('pointerleave', () => { c.classList.remove('tilting'); c.style.transform = ''; });
  });
  // Boutons magnétiques
  if (fine) document.querySelectorAll('.btn-main, .btn-ig').forEach(b => {
    b.classList.add('magnet');
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect();
      b.style.translate = `${(e.clientX - r.left - r.width / 2) * .18}px ${(e.clientY - r.top - r.height / 2) * .3}px`; });
    b.addEventListener('pointerleave', () => { b.style.translate = ''; });
  });
  // Bandeau géant lié au scroll
  const mega = document.querySelector('.mega-track');
  if (mega) { let ticking = false;
    const move = () => { const r = mega.parentElement.getBoundingClientRect();
      mega.style.transform = `translateX(${(r.top - innerHeight) * .35}px)`; ticking = false; };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(move); } }, { passive: true }); move(); }
}

if (document.getElementById('form')) {
// ====== Formulaire par étapes (Formspree) ======
const form = document.getElementById('form');
const steps = [...form.querySelectorAll('.wz-step')];
const err = document.getElementById('err');
const prev = document.getElementById('wzPrev'), next = document.getElementById('wzNext'), send = document.getElementById('wzSend');
let cur = 0;
function show(i) {
  steps.forEach((s, k) => s.classList.toggle('active', k === i));
  cur = i; err.textContent = '';
  document.getElementById('wzCount').textContent = `Étape ${i + 1} sur ${steps.length}`;
  document.getElementById('wzBar').style.width = ((i + 1) / steps.length * 100) + '%';
  prev.hidden = i === 0; next.hidden = i === steps.length - 1; send.hidden = i !== steps.length - 1;
}
function valid(i) {
  const s = steps[i];
  if (i === 0 && !s.querySelector('input:checked')) return 'Choisis au moins une raison, même si c\'est « je l\'ai toujours voulu » 😉';
  if (i === 1 && !s.querySelector('input:checked')) return 'Indique ton niveau actuel, ça m\'aide à préparer l\'appel.';
  if (i === 2 && !s.querySelector('input[type=checkbox]:checked')) return 'Choisis au moins un moment de la journée.';
  if (i === 3) {
    if (!form.prenom.value.trim()) return 'Indique ton prénom.';
    if (!/^\S+@\S+\.\S+$/.test(form.email.value.trim())) return 'Ton e-mail semble incomplet : vérifie-le pour que Belén puisse te répondre.';
    if (!document.getElementById('f-ok').checked) return 'Coche la case pour que Belén puisse te recontacter.';
  }
  return '';
}
next.addEventListener('click', () => { const m = valid(cur); if (m) { err.textContent = m; return; } dataLayer.push({ event: 'formulaire_etape', etape: cur + 2 }); show(cur + 1); });
prev.addEventListener('click', () => show(cur - 1));
steps.forEach(s => s.addEventListener('change', () => { err.textContent = ''; }));
let sending = false;
function finish() {
  steps.forEach(st => st.classList.remove('active'));
  document.getElementById('wzNav').hidden = true; document.querySelector('.wz-top').hidden = true;
  document.getElementById('wzDone').hidden = false; err.textContent = '';
  form.querySelectorAll('input, select, textarea, button').forEach(el => el.disabled = true);
  form.classList.add('sent');
  const cta = document.getElementById('ctaFloat');
  if (cta) cta.querySelector('span').innerHTML = '<b>Demande envoyée ✓</b><small>Belén te contacte très bientôt</small>';
}
form.addEventListener('submit', async e => {
  e.preventDefault();
  if (sending || form.classList.contains('sent')) return;
  const m = valid(3); if (m) { err.textContent = m; return; }
  sending = true; send.disabled = true; send.firstChild.textContent = 'Envoi en cours… ';
  try {
    const r = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error();
    try { localStorage.setItem('pbe_lead_sent', String(Date.now())); } catch {}
    finish();
    dataLayer.push({ event: 'generate_lead', form_name: 'appel_decouverte', niveau: form.niveau.value, pays: form.pays.value });
  } catch {
    sending = false; send.disabled = false; send.firstChild.textContent = 'Envoyer ma demande ';
    err.textContent = 'L\'envoi n\'a pas fonctionné. Réessaie dans un instant, ou écris directement à Belén sur Instagram.';
  }
});
show(0);
try { if (localStorage.getItem('pbe_lead_sent')) finish(); } catch {}

// ====== Formulaire en fenêtre (bouton flottant) ======
(function () {
  const modal = document.getElementById('formModal'), body = document.getElementById('fmBody');
  const formEl = document.getElementById('form'), home = formEl.parentElement;
  const ph = document.createElement('div'); ph.className = 'form-placeholder';
  ph.innerHTML = '<p>Le formulaire est ouvert dans la fenêtre.</p>';
  const cta = document.getElementById('ctaFloat');
  function open(src) {
    home.replaceChild(ph, formEl); body.appendChild(formEl);
    if (modal.showModal) modal.showModal(); else modal.setAttribute('open', '');
    formEl.querySelector('input, button')?.focus();
    window.dataLayer && dataLayer.push({ event: 'ouverture_formulaire', source: src });
  }
  function close() { if (modal.open) modal.close(); }
  modal.addEventListener('close', () => { if (ph.parentElement) home.replaceChild(formEl, ph); });
  cta.addEventListener('click', () => open('bouton_flottant'));
  document.getElementById('fmClose').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  // Les boutons « Réserver mon appel découverte » ouvrent aussi la fenêtre
  document.querySelectorAll('a[href="#contact"].btn').forEach(a => a.addEventListener('click', e => { e.preventDefault(); open('bouton_' + (a.closest('header') ? 'menu' : (a.closest('section')?.id || 'page'))); }));
  // On cache le bouton flottant quand la section contact est visible
  const sec = document.getElementById('contact');
  if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => cta.classList.toggle('hide', en.isIntersecting), { threshold: .2 }).observe(sec);
})();

}

// ====== Consentement cookies + événements de mesure ======
(function () {
  const box = document.getElementById('cookies');
  let saved = null; try { saved = localStorage.getItem('pbe_consent'); } catch (e) {}
  if (!saved) box.hidden = false;
  const set = ok => {
    const v = ok ? 'granted' : 'denied';
    const c = { analytics_storage: v, ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };
    gtag('consent', 'update', c);
    try { localStorage.setItem('pbe_consent', JSON.stringify(c)); } catch (e) {}
    dataLayer.push({ event: ok ? 'consent_granted' : 'consent_denied' });
    box.hidden = true;
  };
  document.getElementById('ckYes').onclick = () => set(true);
  document.getElementById('ckNo').onclick = () => set(false);
  document.getElementById('ckOpen').onclick = () => { box.hidden = false; };
  const pcY = document.getElementById('pcYes'), pcN = document.getElementById('pcNo'), st = document.getElementById('ckState');
  const paint = () => { if (!st) return; let c = null; try { c = JSON.parse(localStorage.getItem('pbe_consent') || 'null'); } catch (e) {} st.innerHTML = 'Mesure d\'audience : <b>' + (!c ? 'non choisie' : c.analytics_storage === 'granted' ? 'acceptée' : 'refusée') + '</b>.'; };
  if (pcY) pcY.onclick = () => { set(true); paint(); };
  if (pcN) pcN.onclick = () => { set(false); paint(); };
  ['ckYes', 'ckNo'].forEach(id => document.getElementById(id).addEventListener('click', paint));
  paint();
  // Clics sur les appels à l'action et sur Instagram
  document.addEventListener('click', e => {
    const a = e.target.closest('a'); if (!a) return;
    if (a.href.includes('instagram.com')) dataLayer.push({ event: 'clic_instagram', link_url: a.href });
    else if (a.getAttribute('href') === '#contact') dataLayer.push({ event: 'clic_appel_decouverte', link_text: a.textContent.trim().slice(0, 60) });
  });
  // Lecture des témoignages vidéo
  document.querySelectorAll('.vcard .play').forEach(b => b.addEventListener('click', () => dataLayer.push({ event: 'video_temoignage', video_title: b.getAttribute('aria-label') })));
})();

// ====== Sous-menu « Cours » ======
document.querySelectorAll('.has-sub > .sub-toggle').forEach(t => t.addEventListener('click', e => {
  e.preventDefault(); const li = t.parentElement; const open = li.classList.toggle('open'); t.setAttribute('aria-expanded', open);
}));
document.addEventListener('click', e => { document.querySelectorAll('.has-sub.open').forEach(li => { if (!li.contains(e.target)) { li.classList.remove('open'); li.querySelector('.sub-toggle').setAttribute('aria-expanded', 'false'); } }); });

// ====== Barre « tu es ici » (sections) ======
(function () {
  const bar = document.querySelector('.chapters'); if (!bar) return;
  const links = [...bar.querySelectorAll('a')];
  const secs = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const label = bar.querySelector('.ch-current'), fill = bar.querySelector('.ch-fill');
  let ticking = false;
  function update() {
    const y = innerHeight * 0.35; let idx = 0;
    secs.forEach((s, i) => { if (s.getBoundingClientRect().top <= y) idx = i; });
    links.forEach((a, i) => { a.classList.toggle('on', i === idx); a.classList.toggle('done', i < idx); if (i === idx) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    if (label && links[idx]) label.textContent = links[idx].dataset.label || links[idx].textContent;
    const first = secs[0].getBoundingClientRect().top + scrollY - innerHeight * .5;
    const last = document.documentElement.scrollHeight - innerHeight;
    const p = Math.min(1, Math.max(0, (scrollY - first) / Math.max(1, last - first)));
    if (fill) fill.style.transform = `scaleX(${p})`;
    bar.classList.toggle('show', scrollY > first - innerHeight * .2);
    const on = links[idx]; if (on && bar.scrollWidth > bar.clientWidth) { const nav = bar.querySelector('.ch-list'); nav && nav.scrollTo({ left: on.offsetLeft - 40, behavior: reduce ? 'auto' : 'smooth' }); }
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update); update();
})();
