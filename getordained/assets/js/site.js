// Get Ordained · Universal Life Church redesign prototype (shared engine with the ULC.org prototype) — progressive enhancement only. Every page works without JS.
(function () {
  const R = Object.assign({apply: 'get-ordained.html', welcome: 'welcome.html', state: 'officiate-a-wedding-texas.html'}, JSON.parse(document.documentElement.dataset.routes || '{}'));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
  };



  // Layout cache: element boxes are measured once (and on resize), never inside animation frames.
  // Reading layout right after writing styles forces a full style recalc ("layout thrashing").
  const boxCache = new Map(); let boxDirty = true;
  const measure = el => { let x = 0, y = 0, n = el; while (n) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return { x, y, w: el.offsetWidth, h: el.offsetHeight }; };
  const refreshBoxes = () => { for (const el of boxCache.keys()) boxCache.set(el, measure(el)); boxDirty = false; };
  const trackBox = el => { boxCache.set(el, measure(el)); return el; };
  // Page-space box (compare with pointer pageX/pageY, so no scroll position is ever read)
  const rectOf = el => { const b = boxCache.get(el);
    return { left: b.x, top: b.y, width: b.w, height: b.h, right: b.x + b.w, bottom: b.y + b.h }; };
  const markDirty = () => { boxDirty = true; requestAnimationFrame(() => { if (boxDirty) refreshBoxes(); }); };
  addEventListener('resize', markDirty); addEventListener('load', markDirty);
  if (document.fonts) document.fonts.ready.then(markDirty);
  if ('ResizeObserver' in window) new ResizeObserver(markDirty).observe(document.body);

  // State type-ahead: replaces long "Choose a state" dropdowns with an auto-completing text box.
  // The original <select> stays (hidden) as the value holder, so forms and existing code keep working.
  const AB = {"Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA","Colorado":"CO","Connecticut":"CT","Delaware":"DE","District of Columbia":"DC","Florida":"FL","Georgia":"GA","Hawaii":"HI","Idaho":"ID","Illinois":"IL","Indiana":"IN","Iowa":"IA","Kansas":"KS","Kentucky":"KY","Louisiana":"LA","Maine":"ME","Maryland":"MD","Massachusetts":"MA","Michigan":"MI","Minnesota":"MN","Mississippi":"MS","Missouri":"MO","Montana":"MT","Nebraska":"NE","Nevada":"NV","New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM","New York":"NY","North Carolina":"NC","North Dakota":"ND","Ohio":"OH","Oklahoma":"OK","Oregon":"OR","Pennsylvania":"PA","Rhode Island":"RI","South Carolina":"SC","South Dakota":"SD","Tennessee":"TN","Texas":"TX","Utah":"UT","Vermont":"VT","Virginia":"VA","Washington":"WA","West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY"};
  const esc = s => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let comboN = 0;
  $$('select').filter(s => s.options.length > 40 && /choose a state/i.test(s.options[0].text)).forEach(sel => {
    const names = [...sel.options].slice(1).map(o => o.value || o.text);
    const id = sel.id || ('state-' + (++comboN)); sel.id = id + '-select';
    const wrap = document.createElement('div'); wrap.className = 'state-combo';
    const input = document.createElement('input');
    Object.assign(input, { id, type: 'text', autocomplete: 'off', spellcheck: false, placeholder: 'Type your state…' });
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-expanded', 'false');
    const list = document.createElement('ul'); list.className = 'state-list'; list.id = id + '-list'; list.setAttribute('role', 'listbox'); list.hidden = true;
    input.setAttribute('aria-controls', list.id);
    sel.hidden = true; sel.tabIndex = -1; sel.parentNode.insertBefore(wrap, sel); wrap.append(input, sel); document.body.appendChild(list);
    let items = [], hi = 0;
    const rank = q => {
      q = q.trim().toLowerCase(); if (!q) return names.slice();
      const out = [];
      names.forEach(n => { const l = n.toLowerCase(), ab = (AB[n] || '').toLowerCase();
        const s = ab === q ? 0 : l.startsWith(q) ? 1 : l.split(/\s+/).some(w => w.startsWith(q)) ? 2 : l.includes(q) ? 3 : 9;
        if (s < 9) out.push([s, n]); });
      return out.sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1])).map(x => x[1]);
    };
    const place = () => { const r = input.getBoundingClientRect();
      Object.assign(list.style, { left: (r.left + scrollX) + 'px', top: (r.bottom + scrollY + 6) + 'px', width: Math.max(r.width, 240) + 'px' }); };
    const render = () => {
      const q = input.value.trim(); items = rank(q); hi = Math.min(hi, Math.max(0, items.length - 1));
      const re = q ? new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'i') : null;
      list.innerHTML = items.length ? items.map((n, i) => `<li role="option" id="${id}-o${i}" aria-selected="${i === hi}" data-v="${esc(n)}"><span>${re ? esc(n).replace(re, '<mark>$1</mark>') : esc(n)}</span><span class="ab">${AB[n] || ''}</span></li>`).join('')
                                 : '<li class="none">No matching state</li>';
      input.setAttribute('aria-activedescendant', items.length ? `${id}-o${hi}` : '');
      const cur = list.querySelector('[aria-selected="true"]'); if (cur) cur.scrollIntoView({ block: 'nearest' });
    };
    const open = () => { place(); render(); list.hidden = false; input.setAttribute('aria-expanded', 'true'); };
    const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); };
    const sync = () => { const q = input.value.trim().toLowerCase();
      const exact = names.find(n => n.toLowerCase() === q || (AB[n] || '').toLowerCase() === q);
      sel.value = exact || ''; };
    const choose = n => { input.value = n; sel.value = n; sel.dispatchEvent(new Event('change', { bubbles: true })); close(); };
    const autofill = () => { if (!sel.value && input.value.trim()) { const r = rank(input.value); if (r.length) choose(r[0]); } };
    input.addEventListener('focus', () => { if (input.value) input.select(); open(); });
    input.addEventListener('input', () => { hi = 0; sync(); open(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (list.hidden) open();
        hi = (hi + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % Math.max(1, items.length); render(); }
      else if (e.key === 'Enter') { if (!list.hidden && items.length && !(sel.value && items[hi] === sel.value && items.length === 1 && false)) {
          if (sel.value && input.value === sel.value) return;      // already chosen: let the form submit
          e.preventDefault(); choose(items[hi]); } }
      else if (e.key === 'Escape') close();
      else if (e.key === 'Tab') autofill();
    });
    input.addEventListener('blur', () => setTimeout(() => { autofill(); close(); }, 120));
    list.addEventListener('mousedown', e => { const li = e.target.closest('li[data-v]'); if (li) { e.preventDefault(); choose(li.dataset.v); } });
    addEventListener('resize', () => { if (!list.hidden) place(); });
    const form = sel.closest('form'); if (form) form.addEventListener('submit', autofill);
    sel.addEventListener('sync-from-select', () => { input.value = sel.value || ''; });
    wrap.syncFromSelect = () => { input.value = sel.value || ''; };
  });

  // Gentle reveal-on-scroll (content stays visible without JS / with reduced motion)
  const reveals = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(el => io.observe(el));
  } else reveals.forEach(el => el.classList.add('in'));

  // 3D mouse-follow: elements tilt toward the pointer when it comes near (fine pointers only)
  const tilts = $$('[data-tilt]');
  if (tilts.length && matchMedia('(pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let mx = -1e4, my = -1e4, raf = 0;
    const st = tilts.map(el => ({ glareEl: el.querySelector('.px-glare'), el: trackBox(el), rx: 0, ry: 0, i: 0, g: 0, max: +(el.dataset.tiltMax || 9), reach: +(el.dataset.tiltReach || 140), glare: +(el.dataset.glareReach || 90) }));
    const tick = () => {
      raf = 0; let moving = false;
      for (const s of st) {
        const r = rectOf(s.el);
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const ox = Math.max(r.left - mx, 0, mx - r.right), oy = Math.max(r.top - my, 0, my - r.bottom);
        const near = Math.max(0, 1 - Math.hypot(ox, oy) / s.reach), gNear = Math.max(0, 1 - Math.hypot(ox, oy) / s.glare);
        const nx = Math.max(-1, Math.min(1, (mx - cx) / (r.width / 2))), ny = Math.max(-1, Math.min(1, (my - cy) / (r.height / 2)));
        const tx = -ny * s.max * near, ty = nx * s.max * near;
        s.rx += (tx - s.rx) * 0.1; s.ry += (ty - s.ry) * 0.1; s.i += (near - s.i) * 0.1; s.g += (gNear - s.g) * 0.1;
        if (Math.abs(tx - s.rx) > 0.005 || Math.abs(ty - s.ry) > 0.005 || Math.abs(near - s.i) > 0.002 || Math.abs(gNear - s.g) > 0.002) moving = true;
        s.el.style.transform = `perspective(900px) rotateX(${s.rx.toFixed(3)}deg) rotateY(${s.ry.toFixed(3)}deg) scale3d(${(1 + 0.02 * s.i).toFixed(4)}, ${(1 + 0.02 * s.i).toFixed(4)}, 1)`;
        if (s.glareEl) { s.glareEl.style.transform = `translate3d(${(nx * 25).toFixed(2)}%, ${(ny * 25).toFixed(2)}%, 0)`; s.glareEl.style.opacity = s.g.toFixed(3); }
      }
      if (moving) raf = requestAnimationFrame(tick);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    addEventListener('pointermove', e => { mx = e.pageX; my = e.pageY; kick(); }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { mx = my = -1e4; kick(); });
  }


  // Hero: gold ripple where the user clicks
  const ringHost = $('.hero.sanctum');
  if (ringHost && matchMedia('(pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    trackBox(ringHost);
    ringHost.addEventListener('pointerdown', e => { const r = rectOf(ringHost), px = e.pageX - r.left, py = e.pageY - r.top;
      const rp = document.createElement('div'); rp.className = 'cursor-ripple'; rp.style.setProperty('--p', `translate3d(${px}px, ${py}px, 0)`);
      rp.style.transform = `translate3d(${px}px, ${py}px, 0)`; ringHost.appendChild(rp); rp.addEventListener('animationend', () => rp.remove()); });
  }



  // Homepage background: depth of field on scroll + a very slight drift toward the cursor.
  // One eased loop writes a single sub-pixel transform, so the image never snaps to whole pixels.
  const heroBg = $('.hero.sanctum > .bg');
  if (heroBg && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const host = trackBox(heroBg.parentElement), fine = matchMedia('(pointer: fine)').matches, soft = heroBg.querySelector('.bg-soft');
    let gx = 0, gy = 0, bx = 0, by = 0, dof = 0, raf = 0;
    const draw = () => {
      raf = 0;
      bx += (gx - bx) * 0.05; by += (gy - by) * 0.05;
      heroBg.style.transform = `perspective(1000px) translate3d(${bx.toFixed(3)}px, ${by.toFixed(3)}px, 0)`;
      if (Math.abs(gx - bx) > 0.003 || Math.abs(gy - by) > 0.003) raf = requestAnimationFrame(draw);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(draw); };
    if (fine) addEventListener('pointermove', e => { gx = (e.clientX / innerWidth - 0.5) * 18; gy = (e.clientY / innerHeight - 0.5) * 12; kick(); }, { passive: true });
    kick();
  }

  // Header: soft gold glow that follows the cursor
  const hdr = $('.site-header');
  if (hdr && matchMedia('(pointer: fine)').matches) {
    const hg = document.createElement('div'); hg.className = 'hdr-glow'; hg.setAttribute('aria-hidden', 'true'); hdr.prepend(hg);
    let hx = 0, hy = 0, hr = 0;   // header is sticky, full-width at top:0, so client coords are header coords
    const place = () => { hr = 0; hg.style.transform = `translate3d(${hx}px, ${hy}px, 0)`; };
    hdr.addEventListener('pointermove', e => { hx = e.clientX; hy = e.clientY; if (!hr) hr = requestAnimationFrame(place); });
    hdr.addEventListener('pointerenter', () => hdr.classList.add('glow'));
    hdr.addEventListener('pointerleave', () => hdr.classList.remove('glow'));
  }

  // Ordination button: a soft gold glow that leans toward the cursor and grows as it approaches
  const lure = $('[data-lure]'); if (lure) trackBox(lure);
  if (lure && matchMedia('(pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let mx = innerWidth / 2, my = innerHeight / 2 + 0, ox = 0, oy = 0, hx = 50, hy = 50, k = 0.35, lr = 0;
    const halo = document.createElement('span'); halo.className = 'lure-halo'; halo.setAttribute('aria-hidden', 'true');
    const hi = document.createElement('span'); hi.className = 'lure-hi'; hi.setAttribute('aria-hidden', 'true');
    lure.parentElement.classList.add('has-lure'); lure.before(halo); lure.prepend(hi);
    const syncHalo = () => { Object.assign(halo.style, { left: lure.offsetLeft + 'px', top: lure.offsetTop + 'px', width: lure.offsetWidth + 'px', height: lure.offsetHeight + 'px' }); };
    syncHalo(); addEventListener('resize', syncHalo); addEventListener('load', syncHalo);
    const step = () => {
      lr = 0;
      const r = rectOf(lure), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = mx - cx, dy = my - cy, d = Math.hypot(dx, dy) || 1;
      const tox = dx / d * 9, toy = dy / d * 7, tk = Math.max(0.35, Math.min(1, 1 - (d - r.width / 2) / 650));
      const thx = Math.max(0, Math.min(100, (mx - r.left) / r.width * 100)), thy = Math.max(0, Math.min(100, (my - r.top) / r.height * 100));
      ox += (tox - ox) * 0.12; oy += (toy - oy) * 0.12; k += (tk - k) * 0.08; hx += (thx - hx) * 0.15; hy += (thy - hy) * 0.15;
      halo.style.transform = `translate3d(${ox.toFixed(2)}px, ${oy.toFixed(2)}px, 0) scale(${(1 + 0.08 * k).toFixed(4)})`;
      halo.style.opacity = (0.3 + 0.6 * k).toFixed(3);
      hi.style.transform = `translate3d(${(hx / 100 * r.width).toFixed(1)}px, ${(hy / 100 * r.height).toFixed(1)}px, 0)`;
      hi.style.opacity = (0.35 + 0.65 * k).toFixed(3);
      if (Math.abs(tox - ox) > 0.02 || Math.abs(toy - oy) > 0.02 || Math.abs(tk - k) > 0.002 || Math.abs(thx - hx) > 0.1) lr = requestAnimationFrame(step);
    };
    const go = () => { if (!lr) lr = requestAnimationFrame(step); };
    addEventListener('pointermove', e => { mx = e.pageX; my = e.pageY; go(); }, { passive: true });
    go();
  }

  // Mobile menu
  const menuBtn = $('.menu-btn');
  if (menuBtn) menuBtn.addEventListener('click', () => {
    const nav = $('.mobile-nav');
    const open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });

  // Sticky mobile CTA: appears once the in-page CTA scrolls out of view
  const sticky = $('.sticky-cta');
  const heroCta = $('[data-hero-cta]');
  if (sticky) {
    document.body.classList.add('has-sticky');
    if (heroCta && 'IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => sticky.classList.toggle('show', !e.isIntersecting && e.boundingClientRect.top < 0))
        .observe(heroCta);
    } else sticky.classList.add('show');
  }

  // State pickers -> state guide (prototype routes every state to the Texas template)
  $$('form.state-picker').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    const v = f.querySelector('select').value;
    if (!v) { (f.querySelector('.state-combo input') || f.querySelector('select')).focus(); return; }
    store.set('ulc_state', v);
    location.href = R.state + '#' + encodeURIComponent(v.toLowerCase().replace(/\s+/g, '-'));
  }));

  // Quick (2-field) ordination form on home -> hands off to step 2 without putting PII in the URL
  $$('form[data-quick-ordain]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    const name = f.querySelector('[name=name]'), email = f.querySelector('[name=email]');
    if (!name.value.trim()) { name.focus(); return; }
    if (!/^\S+@\S+\.\S+$/.test(email.value)) { email.focus(); return; }
    store.set('ulc_name', name.value.trim());
    store.set('ulc_email', email.value.trim());
    location.href = R.apply + '?step=2';   // query, not #hash: a hash would jump-scroll the page
  }));

  // Two-step ordination application
  const app = $('#ordination-app');
  if (app) {
    const s1 = $('#step-1', app), s2 = $('#step-2', app), bars = $$('.progress span', app), label = $('.step-label', app);
    const show = n => {
      s1.hidden = n !== 1; s2.hidden = n !== 2;
      bars.forEach((b, i) => b.classList.toggle('on', i < n));
      label.textContent = `Step ${n} of 2`;
      if (n === 2) (s2.querySelector('.state-combo input') || s2.querySelector('select') || s2.querySelector('input')).focus({ preventScroll: true });
    };
    const n = store.get('ulc_name'), m = store.get('ulc_email');
    if (n) $('[name=name]', app).value = n;
    if (m) $('[name=email]', app).value = m;
    if ((/[?&]step=2/.test(location.search) || location.hash === '#step-2') && n && m) show(2); else show(1);
    $('#to-step-2', app).addEventListener('click', () => {
      const name = $('[name=name]', app), email = $('[name=email]', app);
      if (!name.value.trim()) return name.focus();
      if (!/^\S+@\S+\.\S+$/.test(email.value)) return email.focus();
      store.set('ulc_name', name.value.trim()); store.set('ulc_email', email.value.trim());
      show(2);
    });
    $('#back-1', app).addEventListener('click', e => { e.preventDefault(); show(1); });
    app.addEventListener('submit', e => {
      e.preventDefault();
      const age = $('[name=age]', app), pw = $('[name=password]', app);
      if (pw.value.length < 8) { pw.focus(); $('#pw-hint', app).style.color = '#b00020'; return; }
      if (!age.checked) { age.focus(); return; }
      const st = $('[name=state]', app).value; if (st) store.set('ulc_state', st);
      location.href = R.welcome;
    });
    const toggle = $('.pw-wrap button', app);
    if (toggle) toggle.addEventListener('click', () => {
      const pw = $('[name=password]', app);
      const show = pw.type === 'password'; pw.type = show ? 'text' : 'password'; toggle.textContent = show ? 'Hide' : 'Show';
    });
  }

  // Welcome page personalisation
  $$('[data-fill=first-name]').forEach(el => { const n = store.get('ulc_name'); if (n) el.textContent = n.split(' ')[0]; });
  $$('[data-fill=first-name-sp]').forEach(el => { const n = store.get('ulc_name'); if (n) el.textContent = ' ' + n.split(' ')[0]; });
  $$('[data-fill=state]').forEach(el => { const s = store.get('ulc_state'); if (s) el.textContent = s; });
  $$('select[data-prefill=state]').forEach(el => { const s = store.get('ulc_state'); if (s) { el.value = s; const w = el.closest('.state-combo'); if (w && w.syncFromSelect) w.syncFromSelect(); } });

  // Product gallery
  $$('.thumbs button').forEach(b => b.addEventListener('click', () => {
    $('.gallery-main img').src = b.dataset.src;
    $$('.thumbs button').forEach(x => x.setAttribute('aria-current', String(x === b)));
  }));

  // Store category filter (client-side for the prototype)
  const grid = $('#product-grid');
  if (grid) {
    const apply = cat => {
      let shown = 0;
      $$('.product', grid).forEach(p => { const on = cat === 'all' || p.dataset.cat.split(' ').includes(cat); p.hidden = !on; if (on) shown++; });
      $$('[data-cat-link]').forEach(a => a.setAttribute('aria-current', String(a.dataset.catLink === cat)));
      const c = $('#result-count'); if (c) c.textContent = shown + ' items';
    };
    $$('[data-cat-link]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); apply(a.dataset.catLink); }));
    const sort = $('#sort');
    if (sort) sort.addEventListener('change', () => {
      const items = $$('.product', grid);
      const key = sort.value;
      items.sort((a, b) => key === 'price-asc' ? a.dataset.price - b.dataset.price : key === 'price-desc' ? b.dataset.price - a.dataset.price : a.dataset.rank - b.dataset.rank);
      items.forEach(i => grid.appendChild(i));
    });
  }
})();
