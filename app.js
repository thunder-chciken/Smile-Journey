/* =========================================================
   ADL Patient Portal — patient app
   Vanilla JS: tab stacks with iOS push/pop, sheets, push banners
   ========================================================= */
(() => {
  const S = STATE;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ic = (n, c = '') => `<i data-lucide="${n}" class="ic ${c}"></i>`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const paint = () => window.lucide && lucide.createIcons();

  const fmt = (d, o) => d.toLocaleDateString('en-US', o);
  const fShort = (d) => fmt(d, { month: 'short', day: 'numeric' });
  const fLong = (d) => fmt(d, { weekday: 'long', month: 'long', day: 'numeric' });
  const fWk = (d) => fmt(d, { weekday: 'short' });
  const fMon = (d) => fmt(d, { month: 'short' }).toUpperCase();
  const money = (n) => '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nowTime = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const relDay = (d) => {
    const n = daysBetween(d, TODAY);
    if (n === 0) return 'Today';
    if (n === 1) return 'Yesterday';
    if (n < 7) return fmt(d, { weekday: 'long' });
    return fShort(d);
  };

  const healing = () => {
    const total = daysBetween(PLACED, ABUTMENT);
    const day = Math.min(total, Math.max(0, daysBetween(PLACED, TODAY)));
    return { day, total, pct: day / total, week: Math.max(1, Math.ceil(day / 7)) };
  };
  const nextAppt = () => S.appts.filter((a) => !a.past && a.date >= TODAY).sort((a, b) => a.date - b.date)[0];
  const unreadTotal = () => S.threads.reduce((n, t) => n + t.unread, 0);
  const shade = (code) => SHADES.find((s) => s.code === code) || SHADES[0];

  /* ---------------------------------------------------------
     Shell
     --------------------------------------------------------- */
  const app = $('#app');
  const TABS = [
    { id: 'home', label: 'Home', icon: 'house', root: 'home' },
    { id: 'schedule', label: 'Schedule', icon: 'calendar-days', root: 'schedule' },
    { id: 'smile', label: 'My Smile', icon: 'smile', root: 'smile' },
    { id: 'messages', label: 'Messages', icon: 'message-circle', root: 'messages' },
    { id: 'account', label: 'Account', icon: 'circle-user', root: 'account' },
  ];
  const stacks = {};
  let currentTab = 'home';
  const ui = { scheduleSeg: 'upcoming', topic: 'Question', draft: '', draftPhoto: false, typing: {}, rs: {}, pay: null, lang: 'English' };

  function buildShell() {
    app.innerHTML = `
      <div class="app-root" id="root">
        ${TABS.map((t) => `<div class="tab-view" data-view="${t.id}"></div>`).join('')}

      </div>
        <nav class="tabbar" id="tabbar">
          ${TABS.map((t) => `<button class="tab" data-tab="${t.id}">${ic(t.icon)}<span>${t.label}</span><span class="badge" data-badge="${t.id}" hidden></span></button>`).join('')}
        </nav>
      <div class="push" id="push"></div>
      <div class="hud" id="hud"></div>
      <div class="login" id="login"></div>`;
    renderLogin();
    showTab('home', true);
  }

  /* ---------------------------------------------------------
     Navigation stacks
     --------------------------------------------------------- */
  const viewEl = (tab) => $(`[data-view="${tab}"]`, app);
  const top = () => stacks[currentTab][stacks[currentTab].length - 1];

  function pageTitle(id, params) {
    const t = PAGES[id].title;
    return typeof t === 'function' ? t(params) : t;
  }

  function pageHTML(id, params, backLabel) {
    const p = PAGES[id];
    const back = backLabel ? `<button class="nav-back" data-back>${ic('chevron-left')}<span>${esc(backLabel)}</span></button>` : '';
    return `
      <div class="navbar ${p.solidNav ? 'solid' : ''}">
        <div class="nav-left">${back}</div>
        <div class="nav-title">${esc(pageTitle(id, params))}</div>
        <div class="nav-right">${p.right ? p.right(params) : ''}</div>
      </div>
      ${p.raw ? p.render(params) : `<div class="page-body">${p.render(params)}</div>`}`;
  }

  function bindScroll(el) {
    const scroller = $('.msg-scroll', el) || el;
    scroller.addEventListener('scroll', () => {
      const nav = $('.navbar', el);
      if (nav) nav.classList.toggle('scrolled', scroller.scrollTop > 34);
    }, { passive: true });
  }

  function makePage(entry) {
    const el = document.createElement('div');
    el.className = 'page ' + (PAGES[entry.id].cls || '');
    el.dataset.page = entry.id;
    entry.el = el;
    return el;
  }

  function fillPage(entry) {
    const el = entry.el;
    const scroller = $('.msg-scroll', el) || el;
    const st = scroller.scrollTop;
    el.innerHTML = pageHTML(entry.id, entry.params, entry.backLabel);
    bindScroll(el);
    paint();
    const sc2 = $('.msg-scroll', el) || el;
    sc2.scrollTop = st;
    const nav = $('.navbar', el);
    if (nav) nav.classList.toggle('scrolled', sc2.scrollTop > 34);
    PAGES[entry.id].mount?.(el, entry.params);
  }

  function push(id, params = {}) {
    const stack = stacks[currentTab];
    const prev = top();
    const entry = { id, params, backLabel: pageTitle(prev.id, prev.params) };
    const el = makePage(entry);
    el.classList.add('from-right');
    viewEl(currentTab).appendChild(el);
    stack.push(entry);
    fillPage(entry);
    el.getBoundingClientRect();
    el.classList.add('anim');
    prev.el.classList.add('anim');
    requestAnimationFrame(() => {
      el.classList.remove('from-right');
      prev.el.classList.add('is-under');
    });
    updateChrome();
  }

  function pop() {
    const stack = stacks[currentTab];
    if (stack.length < 2) return;
    const gone = stack.pop();
    const prev = top();
    fillPage(prev);
    gone.el.classList.add('anim');
    prev.el.classList.add('anim');
    gone.el.style.transform = '';
    prev.el.style.transform = '';
    requestAnimationFrame(() => {
      gone.el.classList.add('from-right');
      prev.el.classList.remove('is-under');
    });
    setTimeout(() => gone.el.remove(), 520);
    updateChrome();
  }

  function showTab(id, initial) {
    if (!initial && id === currentTab) {
      const stack = stacks[id];
      if (stack.length > 1) { while (stack.length > 2) stack.splice(1, 1)[0].el.remove(); pop(); }
      else top().el.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    currentTab = id;
    $$('.tab-view', app).forEach((v) => v.classList.toggle('is-active', v.dataset.view === id));
    if (!stacks[id]) {
      const root = TABS.find((t) => t.id === id).root;
      const entry = { id: root, params: {} };
      stacks[id] = [entry];
      viewEl(id).appendChild(makePage(entry));
      fillPage(entry);
    } else {
      fillPage(top());
    }
    updateChrome();
  }

  function goTo(tab, page, params) {
    closeSheet();
    const stack = stacks[tab];
    if (stack) { while (stack.length > 1) stack.pop().el.remove(); stack[0].el.classList.remove('is-under', 'anim'); }
    showTab(tab, true);
    if (page) setTimeout(() => push(page, params), 40);
  }

  function refresh() {
    if (!stacks[currentTab]) return;
    fillPage(top());
    updateChrome();
    if (openSheetState) refreshSheet();
  }

  function updateChrome() {
    $$('.tab', app).forEach((t) => t.classList.toggle('is-active', t.dataset.tab === currentTab));
    const u = unreadTotal();
    const b = $('[data-badge="messages"]', app);
    b.hidden = !u; b.textContent = u;
    $('#root').classList.toggle('large', S.textLarge);
  }

  /* Edge-swipe back, tracked 1:1 with the pointer */
  function enableEdgeSwipe() {
    let drag = null;
    app.addEventListener('pointerdown', (e) => {
      if (!S.signedIn || openSheetState || stacks[currentTab].length < 2) return;
      if (e.target.closest('button, input, textarea, select')) return;
      const r = app.getBoundingClientRect();
      const scale = r.width / app.offsetWidth;
      const x = (e.clientX - r.left) / scale;
      if (x > 24) return;
      const stack = stacks[currentTab];
      drag = { start: e.clientX, w: app.offsetWidth, scale, cur: stack[stack.length - 1], prev: stack[stack.length - 2], hist: [], dx: 0 };
      drag.cur.el.classList.remove('anim'); drag.prev.el.classList.remove('anim');
      app.setPointerCapture(e.pointerId);
    });
    app.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = Math.max(0, (e.clientX - drag.start) / drag.scale);
      drag.dx = dx;
      drag.hist.push({ x: dx, t: performance.now() }); if (drag.hist.length > 5) drag.hist.shift();
      drag.cur.el.style.transform = `translateX(${dx}px)`;
      drag.prev.el.style.transform = `translateX(${-0.28 * (drag.w - dx)}px)`;
    });
    const end = () => {
      if (!drag) return;
      const h = drag.hist; let v = 0;
      if (h.length > 1) v = (h[h.length - 1].x - h[0].x) / Math.max(1, h[h.length - 1].t - h[0].t);
      const { cur, prev } = drag;
      cur.el.classList.add('anim'); prev.el.classList.add('anim');
      if (drag.dx > drag.w * 0.4 || v > 0.5) {
        cur.el.style.transform = `translateX(${drag.w}px)`;
        prev.el.style.transform = 'translateX(0)';
        stacks[currentTab].pop();
        prev.el.classList.remove('is-under');
        fillPage(prev);
        setTimeout(() => { cur.el.remove(); prev.el.style.transform = ''; }, 500);
        updateChrome();
      } else {
        cur.el.style.transform = ''; prev.el.style.transform = '';
      }
      drag = null;
    };
    app.addEventListener('pointerup', end);
    app.addEventListener('pointercancel', end);
  }

  /* ---------------------------------------------------------
     Shared bits
     --------------------------------------------------------- */
  function ring(pct, size = 64, stroke = 6, color = '#fff', track = 'rgba(255,255,255,.28)') {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r;
    return `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}" style="transition:stroke-dashoffset .8s cubic-bezier(.22,1,.36,1)"/></svg>`;
  }

  function dateTile(d) {
    return `<div class="date-tile"><div class="m">${fMon(d)}</div><div class="d">${d.getDate()}</div><div class="w">${fWk(d)}</div></div>`;
  }

  function apptCard(a) {
    const rs = S.rescheduled[a.id];
    return `
      <div class="card white tap appt-card" data-sheet="appt:${a.id}">
        ${dateTile(a.date)}
        <div class="appt-info">
          <div class="appt-title">${esc(a.title)}</div>
          <div class="appt-sub">Dr. Baha Duraini · ${a.dur}</div>
          ${rs ? `<span class="pill orange" style="margin-top:7px">${ic('clock')}Change requested</span>`
               : `<div class="appt-time">${ic('clock')}${a.time} · ${daysBetween(TODAY, a.date) === 0 ? 'Today' : 'in ' + daysBetween(TODAY, a.date) + ' days'}</div>`}
        </div>
        ${ic('chevron-right', 'chev')}
      </div>`;
  }

  function medRows() {
    const rows = [];
    S.meds.forEach((m) => m.times.forEach((t, i) => rows.push({ m, t, i })));
    return rows.map(({ m, t, i }) => `
      <div class="row med-row ${m.taken[i] ? 'done' : ''}" data-act="med:${m.id}:${i}">
        <div class="row-icon" style="background:${m.color}">${ic(m.icon)}</div>
        <div class="row-main"><div class="row-title">${esc(m.name)}</div><div class="row-sub">${esc(t)}</div></div>
        <span class="check ${m.taken[i] ? 'on' : ''}">${ic('check')}</span>
      </div>`).join('');
  }
  const medCounts = () => {
    let done = 0, total = 0;
    S.meds.forEach((m) => m.taken.forEach((t) => { total++; if (t) done++; }));
    return { done, total };
  };

  function bullets(items, kind = 'check') {
    return `<ul class="bullets">${items.map((t) => `<li><span class="b-ic ${kind === 'x' ? 'no' : ''}">${ic(kind)}</span><span>${esc(t)}</span></li>`).join('')}</ul>`;
  }

  function seg(name, options, value) {
    const i = Math.max(0, options.findIndex((o) => o[0] === value));
    return `<div class="seg seg-app" style="--n:${options.length};--i:${i}">
      ${options.map((o) => `<button class="seg-btn" data-act="seg:${name}:${o[0]}">${o[1]}</button>`).join('')}<span class="seg-thumb"></span></div>`;
  }

  function toggle(on, act) { return `<button class="toggle ${on ? 'on' : ''}" data-act="${act}" aria-pressed="${on}"></button>`; }

  /* Tooth chart: upper #1–16 and lower #32–17, viewed facing the patient */
  function toothMap() {
    const implant = new Set(S.specs.filter((s) => /implant/i.test(s.name)).flatMap((s) => s.teeth));
    const veneer = new Set(S.specs.filter((s) => !/implant/i.test(s.name)).flatMap((s) => s.teeth));
    const W = 320, cx = 160, rx = 124, ry = 84;
    const sizes = [18, 18, 17, 13.5, 13, 12.5, 11, 12.5];
    let out = '';
    const arch = (nums, cy, dir) => nums.forEach((n, i) => {
      const t = i / (nums.length - 1);
      const a = Math.PI * (1 - t);
      const x = cx + rx * Math.cos(a);
      const y = cy - dir * ry * Math.sin(a);
      const k = Math.min(i, nums.length - 1 - i);
      const w = sizes[k], h = w * 1.18;
      const deg = dir === 1 ? (-a * 180 / Math.PI - 90) : (a * 180 / Math.PI - 90);
      const cls = implant.has(n) ? 'implant' : veneer.has(n) ? 'veneer' : '';
      const lx = cx + (rx + 17) * Math.cos(a), ly = cy - dir * (ry + 17) * Math.sin(a);
      out += `<ellipse class="tooth ${cls}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(w / 2).toFixed(1)}" ry="${(h / 2).toFixed(1)}" transform="rotate(${deg.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
      out += `<text class="tooth-num" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" ${cls ? 'style="fill:var(--blue);font-weight:700"' : ''}>${n}</text>`;
    });
    arch([...Array(16)].map((_, i) => i + 1), 108, 1);
    arch([...Array(16)].map((_, i) => 32 - i), 146, -1);
    return `<svg class="tooth-map" viewBox="0 0 ${W} 254" width="100%" style="max-width:320px">
      <text x="${cx}" y="100" text-anchor="middle" style="font-size:9px;fill:var(--label-3);font-weight:600;letter-spacing:.12em">UPPER</text>
      <text x="${cx}" y="160" text-anchor="middle" style="font-size:9px;fill:var(--label-3);font-weight:600;letter-spacing:.12em">LOWER</text>
      <text x="8" y="130" style="font-size:9px;fill:var(--label-3);font-weight:700">R</text>
      <text x="306" y="130" style="font-size:9px;fill:var(--label-3);font-weight:700">L</text>
      ${out}</svg>`;
  }

  /* ---------------------------------------------------------
     Pages
     --------------------------------------------------------- */
  const PAGES = {};

  PAGES.home = {
    title: 'Home',
    render() {
      const P = S.patient, ph = S.phases[S.phase], total = S.phases.length;
      const h = new Date().getHours();
      const hello = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
      const heal = healing();
      const crownIn = daysBetween(TODAY, S.phases[5].date);
      const isHeal = S.phase === 3;
      const nextPh = S.phases[S.phase + 1];
      const barPct = isHeal ? heal.pct : (S.phase + 1) / total;
      const next = nextAppt();
      const mc = medCounts();
      const care = careFor();
      return `
        <div class="date-eyebrow">${fLong(TODAY)}</div>
        <div class="home-head">
          <h1 class="large-title">${hello}, ${esc(P.first)}</h1>
          <button class="avatar" data-tab="account" aria-label="Account">${P.initials}</button>
        </div>

        <div class="hero tap" data-push="journey">
          <div class="hero-top">
            <div>
              <div class="hero-label">Your Smile Journey</div>
              <div class="hero-phase">${esc(ph.title)}</div>
              <div class="hero-meta">${isHeal ? `Day ${heal.day} of ${heal.total} · right on track` : esc(ph.desc)}</div>
            </div>
            <div class="ring">${ring((S.phase + 1) / total)}<div class="ring-num">${S.phase + 1}/${total}<small>steps</small></div></div>
          </div>
          <div class="hero-bar"><span style="width:${Math.round(barPct * 100)}%"></span></div>
          <div class="hero-foot">
            <span>${isHeal ? 'Implant placed ' + fShort(PLACED) : 'Step ' + (S.phase + 1) + ' of ' + total}</span>
            <span>${nextPh ? 'Next: ' + esc(nextPh.short) : 'All steps complete'}</span>
          </div>
          <div class="hero-cta">
            ${crownIn > 0 && S.phase < 5
              ? `<span class="countdown"><b>${crownIn}</b> days until your new smile</span>`
              : `<span class="countdown"><b>Your new smile is complete</b></span>`}
            ${ic('chevron-right')}
          </div>
        </div>

        ${next ? `
        <div class="section">
          <div class="section-head"><h2 class="section-title">Next appointment</h2><button class="section-link" data-tab="schedule">See all</button></div>
          ${apptCard(next)}
        </div>` : ''}

        <div class="section">
          <div class="section-head">
            <h2 class="section-title">Today's medications</h2>
            <span class="mini-ring">${ring(mc.total ? mc.done / mc.total : 0, 22, 3.5, 'var(--blue)', 'var(--fill-2)')}${mc.done} of ${mc.total}</span>
          </div>
          <div class="list">${medRows()}</div>
          <div class="section-foot"><button class="section-link" data-push="meds">All medications & allergies</button></div>
        </div>

        <div class="section">
          <div class="card tap tip" data-push="care">
            <div class="tip-ic">${ic('heart-pulse')}</div>
            <div style="flex:1">
              <h4>${esc(care.title)}</h4>
              <p>${esc(care.tip)}</p>
            </div>
            ${ic('chevron-right', 'chev')}
          </div>
        </div>

        <div class="section">
          <div class="quick">
            <button data-act="goto:messages:thread:care"><span class="q-ic">${ic('message-circle')}</span>Message</button>
            <button data-act="reschedNext"><span class="q-ic">${ic('calendar-clock')}</span>Reschedule</button>
            <button data-push="billing"><span class="q-ic">${ic('credit-card')}</span>Pay bill</button>
            <button data-tab="smile"><span class="q-ic">${ic('palette')}</span>My shade</button>
          </div>
        </div>

        <div class="section">
          <div class="list white">
            <div class="row">
              <div class="row-icon" style="background:#fff;border:.5px solid var(--sep)"><img src="assets/adl-mark-blue.png" alt="" width="24" height="24"></div>
              <div class="row-main"><div class="row-title b">Advanced Dental Lounge</div><div class="row-sub">Dr. Baha Duraini, DDS · Murphy, TX</div></div>
              <button class="nav-icon-btn" data-act="hud:Calling the office…:phone" aria-label="Call">${ic('phone')}</button>
              <button class="nav-icon-btn" data-act="hud:Opening Maps…:map-pin" aria-label="Directions">${ic('map-pin')}</button>
            </div>
          </div>
        </div>`;
    },
  };

  PAGES.journey = {
    title: 'Smile Journey',
    render() {
      const heal = healing();
      const items = S.phases.map((p, i) => {
        const st = i < S.phase ? 'done' : i === S.phase ? 'current' : 'upcoming';
        let when;
        if (st === 'done') when = 'Completed · ' + fShort(p.end || p.date);
        else if (st === 'current') when = i === 3 ? `Now · Day ${heal.day} of ${heal.total}` : 'Now · ' + fShort(p.date);
        else when = (S.appts.some((a) => !a.past && +a.date === +p.date) ? 'Scheduled · ' : 'Estimated · ') + fShort(p.date);
        return `
          <div class="tl-item ${st}" data-sheet="phase:${i}">
            <div class="tl-rail"><div class="tl-node">${st === 'done' ? ic('check') : st === 'upcoming' ? i + 1 : ''}</div></div>
            <div class="tl-body">
              <div class="tl-when">${when}</div>
              <div class="tl-title">${esc(p.title)}</div>
              <div class="tl-desc">${esc(p.desc)}</div>
              ${st === 'current' && i === 3 ? `<div class="tl-progress"><span style="width:${Math.round(heal.pct * 100)}%"></span></div>` : ''}
            </div>
          </div>`;
      }).join('');
      return `
        <h1 class="large-title">Smile Journey</h1>
        <p class="large-sub">Dental implant · Lower left molar (#19)</p>
        <div class="kv" style="margin-bottom:18px">
          <div><span>Progress</span><b>Step ${S.phase + 1} of ${S.phases.length}</b></div>
          <div><span>New smile by</span><b>${fShort(S.phases[5].date)}</b></div>
        </div>
        <div class="timeline">${items}</div>
        <div class="section">
          <div class="caps">Up next</div>
          <div class="card tap tip" data-act="goto:smile">
            <div class="tip-ic" style="background:linear-gradient(150deg,#7fb2ff,#5856d6)">${ic('sparkles')}</div>
            <div style="flex:1"><h4>Porcelain veneers · Upper 8</h4><p>Starts after your crown is placed. Shade BL2, e.max porcelain.</p></div>
            ${ic('chevron-right', 'chev')}
          </div>
        </div>
        <p class="section-foot" style="margin-top:16px">Dates are estimates and can shift slightly depending on how you heal. Tap any step to learn more.</p>`;
    },
  };

  PAGES.schedule = {
    title: 'Appointments',
    right: () => `<button class="nav-icon-btn" data-sheet="request" aria-label="Request appointment">${ic('plus')}</button>`,
    render() {
      const up = S.appts.filter((a) => !a.past).sort((a, b) => a.date - b.date);
      const past = S.appts.filter((a) => a.past).sort((a, b) => b.date - a.date);
      let body;
      if (ui.scheduleSeg === 'upcoming') {
        body = up.map((a) => `<div style="margin-bottom:12px">${apptCard(a)}</div>`).join('') +
          `<p class="section-foot">Need to cancel? Please let us know at least 48 hours ahead.</p>`;
      } else {
        body = `<div class="list">${past.map((a) => `
          <button class="row" data-sheet="appt:${a.id}" style="--inset:16px">
            <div class="row-main"><div class="row-title b">${esc(a.title)}</div><div class="row-sub">${fmt(a.date, { month: 'long', day: 'numeric', year: 'numeric' })} · ${esc(a.notes)}</div></div>
            ${ic('chevron-right', 'chev')}
          </button>`).join('')}</div>`;
      }
      return `
        <h1 class="large-title">Appointments</h1>
        <p class="large-sub">With Dr. Baha Duraini</p>
        ${seg('schedule', [['upcoming', 'Upcoming'], ['past', 'Past']], ui.scheduleSeg)}
        ${body}`;
    },
  };

  PAGES.smile = {
    title: 'My Smile',
    render() {
      const sh = shade(S.specs[0].shade);
      return `
        <h1 class="large-title">My Smile</h1>
        <p class="large-sub">Everything you picked, saved for life.</p>
        <div class="smile-id tap" data-sheet="smileid">
          <img class="mark" src="assets/adl-mark-white.png" alt="">
          <div class="sid-top"><img src="assets/adl-mark-white.png" alt=""><div class="sid-brand">Advanced Dental Lounge<br>Smile ID</div></div>
          <div class="sid-mid"><div class="sid-label">Patient</div><div class="sid-name">${esc(S.patient.first + ' ' + S.patient.last)}</div></div>
          <div class="sid-grid">
            <div><div class="sid-label">Shade</div><b>${sh.code}</b></div>
            <div><div class="sid-label">Restorations</div><b>${S.specs.reduce((n, s) => n + s.teeth.length, 0)} teeth</b></div>
            <div><div class="sid-label">Since</div><b>${S.patient.since}</b></div>
          </div>
        </div>

        <div class="section">
          <div class="section-head"><h2 class="section-title">Your selections</h2></div>
          <div class="list">
            ${S.specs.map((s) => `
              <button class="row" data-sheet="spec:${s.id}" style="--inset:58px">
                <span class="shade-dot" style="background:${shade(s.shade).hex}"></span>
                <div class="row-main"><div class="row-title b">${esc(s.name)}</div><div class="row-sub">${esc(s.where)}<br>${esc(s.material)} · Shade ${s.shade}</div></div>
                <span class="pill ${s.status === 'Planned' ? 'gray' : ''}">${esc(s.status)}</span>
                ${ic('chevron-right', 'chev')}
              </button>`).join('')}
          </div>
        </div>

        <div class="section">
          <div class="section-head"><h2 class="section-title">Tooth map</h2></div>
          <div class="card">
            ${toothMap()}
            <div class="legend"><span><i style="background:var(--blue)"></i>Implant</span><span><i style="background:var(--blue-200)"></i>Veneers</span><span><i style="background:#fff;border:1px solid #c9ced6"></i>Natural</span></div>
          </div>
        </div>

        <div class="section">
          <div class="section-head"><h2 class="section-title">Before &amp; after</h2></div>
          <div class="photo-tiles">
            <div class="photo-tile before"><div class="ph-ic">${ic('image')}</div><div>Before<small>${fShort(S.phases[0].date)}</small></div></div>
            <div class="photo-tile after"><div class="ph-ic">${ic('sparkles')}</div><div>After<small>Coming ${fShort(S.phases[5].date)}</small></div></div>
          </div>
          <p class="section-foot">Your shade and materials stay on file, so any dentist can match them years from now.</p>
        </div>`;
    },
  };

  PAGES.messages = {
    title: 'Messages',
    render() {
      return `
        <h1 class="large-title">Messages</h1>
        <p class="large-sub">Usually answered within a few hours.</p>
        <div class="alert-banner">${ic('info')}<span>Not for emergencies. For severe pain, swelling or bleeding, call the office right away.</span></div>
        <div class="list">
          ${S.threads.map((t) => {
            const last = t.msgs[t.msgs.length - 1];
            return `
            <button class="row thread-row" data-push="thread:${t.id}" style="--inset:74px">
              ${t.id === 'care' ? `<span class="avatar" style="width:46px;height:46px"><img src="assets/adl-mark-white.png" width="30" height="30" alt=""></span>`
                                : `<span class="avatar gray" style="width:46px;height:46px">${ic('receipt-text')}</span>`}
              <div class="row-main">
                <div style="display:flex;justify-content:space-between;gap:8px"><span class="row-title b">${esc(t.name)}</span><span class="row-sub" style="margin:0">${relDay(last.at)}</span></div>
                <div class="row-sub" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${last.from === 'me' ? 'You: ' : ''}${esc(last.photo ? 'Photo' : last.text)}</div>
              </div>
              ${t.unread ? `<span class="badge" style="background:var(--blue)">${t.unread}</span>` : ''}
            </button>`;
          }).join('')}
        </div>`;
    },
  };

  PAGES.thread = {
    title: (p) => S.threads.find((t) => t.id === p.arg).name,
    cls: 'thread-page',
    solidNav: true,
    raw: true,
    right: () => `<button class="nav-icon-btn" data-act="hud:Calling the office…:phone" aria-label="Call">${ic('phone')}</button>`,
    render(p) {
      const t = S.threads.find((x) => x.id === p.arg);
      let lastDay = '';
      const msgs = t.msgs.map((m, idx) => {
        const day = relDay(m.at);
        const head = day !== lastDay ? `<div class="msg-day">${day}${m.time ? ' · ' + m.time : ''}</div>` : '';
        lastDay = day;
        const pm = t.msgs[idx - 1];
        const sameGroup = pm && pm.from === 'me' && pm.topic === m.topic && !head;
        const topic = m.from === 'me' && m.topic && m.topic !== 'Question' && !sameGroup ? `<div class="topic-tag" style="color:${m.topic === 'Urgent' ? 'var(--red)' : 'var(--orange)'}">${m.topic}</div>` : '';
        if (m.photo) return head + topic + `<div class="bubble ${m.from} photo"><div class="ph">${ic('image')}</div></div>`;
        return head + topic + `<div class="bubble ${m.from}">${m.from === 'them' && m.who && m.who !== t.name ? `<span class="who">${esc(m.who)}</span>` : ''}${esc(m.text)}</div>`;
      }).join('');
      const lastMe = [...t.msgs].reverse().find((m) => m.from === 'me');
      const delivered = t.msgs[t.msgs.length - 1].from === 'me' ? `<div class="msg-meta">Delivered</div>` : '';
      return `
        <div class="msg-scroll" style="flex:1;overflow-y:auto;padding-top:calc(var(--safe-top) + 44px)">
          <div class="msg-wrap">
            <div class="msg-day" style="margin-top:6px">${t.id === 'care' ? 'Messages go to Dr. Duraini and the care team.' : 'Questions about payments or insurance.'}</div>
            ${msgs}${delivered}
            ${ui.typing[t.id] ? '<div class="typing"><i></i><i></i><i></i></div>' : ''}
          </div>
        </div>
        <div class="composer" style="position:relative">
          ${t.id === 'care' ? `<div class="topics">
            ${[['Question', 'circle-help'], ['Concern', 'triangle-alert'], ['Urgent', 'siren']].map(([n, i]) =>
              `<button class="topic ${n === 'Urgent' ? 'urgent' : ''} ${ui.topic === n ? 'on' : ''}" data-act="topic:${n}">${ic(i)}${n}</button>`).join('')}
          </div>` : ''}
          ${t.id === 'care' && ui.topic === 'Urgent' ? `<div class="urgent-note">${ic('phone')}<span>For a dental emergency, call us now. We'll still get your message.</span><button class="btn" data-act="hud:Calling the office…:phone">Call</button></div>` : ''}
          ${ui.draftPhoto ? `<div class="urgent-note" style="background:var(--blue-50);color:var(--label)">${ic('image')}<span style="flex:1">Photo attached</span><button class="sheet-close" data-act="unphoto" aria-label="Remove photo">${ic('x')}</button></div>` : ''}
          <div class="compose-row">
            <button class="attach" data-act="photo" aria-label="Attach photo">${ic('camera')}</button>
            <textarea class="field" id="field" rows="1" placeholder="Message">${esc(ui.draft)}</textarea>
            <button class="send" id="sendBtn" data-act="send:${t.id}" ${ui.draft.trim() || ui.draftPhoto ? '' : 'disabled'} aria-label="Send">${ic('arrow-up')}</button>
          </div>
        </div>`;
    },
    mount(el, p) {
      const t = S.threads.find((x) => x.id === p.arg);
      if (t.unread) { t.unread = 0; updateChrome(); window.DASH?.refresh(); }
      el.style.display = 'flex'; el.style.flexDirection = 'column'; el.style.paddingTop = '0'; el.style.paddingBottom = 'var(--tabbar-h)'; el.style.overflow = 'hidden';
      const nav = $('.navbar', el); nav.style.position = 'absolute'; nav.style.marginTop = '0';
      const sc = $('.msg-scroll', el); sc.scrollTop = sc.scrollHeight;
      const f = $('#field', el), btn = $('#sendBtn', el);
      const size = () => { f.style.height = 'auto'; f.style.height = Math.min(110, f.scrollHeight) + 'px'; };
      size();
      f.addEventListener('input', () => { ui.draft = f.value; btn.disabled = !(f.value.trim() || ui.draftPhoto); size(); });
      f.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!btn.disabled) btn.click(); } });
    },
  };

  PAGES.account = {
    title: 'Account',
    render() {
      const P = S.patient;
      const row = (icon, color, title, val, act, sub) => `
        <button class="row" ${act}>
          <div class="row-icon" style="background:${color}">${ic(icon)}</div>
          <div class="row-main"><div class="row-title">${title}</div>${sub ? `<div class="row-sub">${sub}</div>` : ''}</div>
          ${val ? `<span class="row-val">${val}</span>` : ''}${ic('chevron-right', 'chev')}
        </button>`;
      const trow = (icon, color, title, on, act) => `
        <div class="row"><div class="row-icon" style="background:${color}">${ic(icon)}</div>
          <div class="row-main"><div class="row-title">${title}</div></div>${toggle(on, act)}</div>`;
      return `
        <div style="text-align:center;padding:4px 20px 6px">
          <div class="avatar lg" style="margin:0 auto 12px">${P.initials}</div>
          <div style="font-family:var(--font-display);font-size:24px;font-weight:700;letter-spacing:-.02em">${esc(P.first + ' ' + P.last)}</div>
          <div style="color:var(--label-2);font-size:15px;margin-top:2px">${esc(P.email)}</div>
          <div style="margin-top:10px"><span class="pill">${ic('badge-check')}Patient since ${P.since}</span></div>
        </div>

        <div class="section"><div class="caps">My health</div><div class="list">
          ${row('pill', '#ff9500', 'Medications', S.meds.length + ' active', 'data-push="meds"')}
          ${row('heart-pulse', '#ff2d55', 'Aftercare guides', '', 'data-push="care"')}
          ${row('file-text', '#5856d6', 'Documents', '', 'data-push="documents"')}
        </div></div>

        <div class="section"><div class="caps">Billing</div><div class="list">
          ${row('credit-card', '#34c759', 'Balance & payments', money(S.billing.balance).replace('.00', ''), 'data-push="billing"')}
          ${row('shield-check', '#30b0c7', 'Insurance', 'Delta Dental', 'data-sheet="insurance"')}
        </div></div>

        <div class="section"><div class="caps">Family</div><div class="list">
          ${row('users', '#007aff', 'Family members', S.family.length, 'data-push="family"', 'Manage care for your kids or parents')}
        </div></div>

        <div class="section"><div class="caps">Notifications</div><div class="list">
          ${trow('calendar-days', '#ff3b30', 'Appointment reminders', S.notify.appts, 'notify:appts')}
          ${trow('pill', '#ff9500', 'Medication reminders', S.notify.meds, 'notify:meds')}
          ${trow('message-circle', '#34c759', 'Messages', S.notify.messages, 'notify:messages')}
          ${trow('lightbulb', '#ffcc00', 'Healing tips', S.notify.tips, 'notify:tips')}
        </div></div>

        <div class="section"><div class="caps">Privacy &amp; display</div><div class="list">
          ${trow('scan-face', '#34c759', 'Sign in with Face ID', S.faceId, 'faceid')}
          ${trow('a-large-small', '#8e8e93', 'Larger text', S.textLarge, 'textLarge')}
          ${row('globe', '#007aff', 'Language', ui.lang, 'data-sheet="language"')}
        </div></div>

        <div class="section"><div class="list">
          ${row('building-2', '#1d1d1f', 'Advanced Dental Lounge & Implants', '', 'data-act="hud:Opening practice info…:building-2"', 'Dr. Baha Duraini, DDS · Murphy, TX')}
          ${row('layout-dashboard', '#0047b3', 'Open Practice Dashboard', '', 'data-act="mode:practice"', 'Prototype: see the staff side')}
        </div></div>

        <div class="section"><div class="list">
          <button class="row noicon" data-act="signout" style="justify-content:center;color:var(--red);font-size:16.5px">Sign Out</button>
        </div></div>
        <p class="section-foot" style="text-align:center;margin-top:18px">Your health information is encrypted and private.</p>`;
    },
  };

  PAGES.meds = {
    title: 'Medications',
    render() {
      const mc = medCounts();
      return `
        <h1 class="large-title">Medications</h1>
        <p class="large-sub">${mc.done} of ${mc.total} taken today</p>
        <div class="caps">Today</div>
        <div class="list">${medRows()}</div>
        <div class="list" style="margin-top:12px"><div class="row noicon"><div class="row-main"><div class="row-title">Reminders</div><div class="row-sub">We'll nudge you at each dose time</div></div>${toggle(S.medReminders, 'medRem')}</div></div>

        <div class="section"><div class="caps">Active</div><div class="list">
          ${S.meds.map((m) => `<div class="row"><div class="row-icon" style="background:${m.color}">${ic(m.icon)}</div>
            <div class="row-main"><div class="row-title b">${esc(m.name)}</div><div class="row-sub">${esc(m.dose)}<br>${esc(m.times.join(' · '))}</div></div></div>`).join('')}
        </div></div>

        <div class="section"><div class="caps">Completed</div><div class="list">
          ${S.pastMeds.map((m) => `<div class="row"><div class="row-icon" style="background:#c7c7cc">${ic('pill')}</div>
            <div class="row-main"><div class="row-title">${esc(m.name)}</div><div class="row-sub">${esc(m.note)} · finished ${fShort(m.end)}</div></div></div>`).join('')}
        </div></div>

        <div class="section"><div class="caps">Allergies</div><div class="list">
          ${S.allergies.map((a) => `<div class="row"><div class="row-icon" style="background:#ff3b30">${ic('triangle-alert')}</div><div class="row-main"><div class="row-title">${esc(a)}</div></div></div>`).join('')}
        </div></div>

        <div class="section" style="margin:22px 16px 0"><button class="btn btn-tinted btn-block" data-sheet="addmed">${ic('plus')}Add a medication you take</button></div>
        <p class="section-foot" style="margin-top:14px">Always follow Dr. Duraini's instructions. Have a question about a medication? Message the care team.</p>`;
    },
  };

  const GUIDES = [
    { t: 'First 24 hours after surgery', i: 'moon', b: ['Bite gently on gauze for 30–60 minutes', 'Ice 20 min on, 20 min off', 'Rest with your head raised', 'Cool, soft foods only'], x: ['Spitting, straws or rinsing hard', 'Hot drinks', 'Exercise'] },
    { t: 'Days 2–7', i: 'sun', b: ['Start warm salt-water rinses after meals', 'Soft foods, chew on the other side', 'Brush other teeth normally'], x: ['Smoking or vaping', 'Crunchy or spicy food'] },
    { t: 'Weeks 2–12: healing', i: 'activity', b: ['Keep chewing on the other side', 'Brush gently around the site', 'Keep your healing check visit'], x: ['Hard or sticky foods on the implant side', 'Skipping cleanings'] },
    { t: 'Caring for your new crown', i: 'sparkles', b: ['Brush twice a day, floss daily', 'Use a water flosser around the implant', 'Cleanings every 6 months'], x: ['Chewing ice or opening packages with teeth'] },
    { t: 'Soft food ideas', i: 'soup', b: ['Eggs, yogurt, smoothies (no straw!)', 'Mashed potatoes, soup, pasta', 'Fish, oatmeal, ripe bananas, avocado'], x: ['Nuts, chips, popcorn, crusty bread'] },
  ];
  const VIDEOS = [
    { t: 'What is osseointegration?', d: '1:42', s: 'Why healing takes 12 weeks' },
    { t: 'Cleaning around your implant', d: '2:10', s: 'A 2-minute routine' },
    { t: 'Your abutment visit', d: '1:55', s: 'What to expect, step by step' },
    { t: 'Choosing your shade', d: '2:30', s: 'How we match your smile' },
  ];
  function careFor() {
    const heal = healing();
    if (S.phase === 3) return {
      title: `Week ${heal.week} of healing`, tip: 'Your implant is bonding with the bone. Keep chewing on the right side and rinse after meals.',
      do: ['Chew on your right side', 'Brush gently around the implant with a soft brush', 'Salt-water rinse after meals', 'Take Vitamin D3 with breakfast'],
      avoid: ['Hard or sticky foods on the left (nuts, chips, caramel)', 'Smoking or vaping: it slows bone healing', 'Pushing on the area with your tongue'],
    };
    const p = S.phases[S.phase];
    return { title: p.title, tip: p.desc, do: p.prep, avoid: S.phase >= 5 ? ['Chewing ice or hard candy'] : ['Smoking or vaping'] };
  }

  PAGES.care = {
    title: 'Aftercare',
    render() {
      const c = careFor();
      return `
        <h1 class="large-title">Aftercare</h1>
        <p class="large-sub">${esc(c.title)}</p>
        <div class="card"><div class="caps" style="margin:0 0 10px">Do this week</div>${bullets(c.do)}</div>
        <div class="card" style="margin-top:12px"><div class="caps" style="margin:0 0 10px">Avoid</div>${bullets(c.avoid, 'x')}</div>

        <div class="section">
          <div class="section-head"><h2 class="section-title">Videos from Dr. Duraini</h2></div>
          <div class="videos">${VIDEOS.map((v, i) => `
            <button class="video" data-sheet="video:${i}">
              <div class="video-thumb"><span class="video-play">${ic('play')}</span><span class="video-len">${v.d}</span></div>
              <h5>${esc(v.t)}</h5><p>${esc(v.s)}</p>
            </button>`).join('')}</div>
        </div>

        <div class="section">
          <div class="section-head"><h2 class="section-title">Recovery guides</h2></div>
          <div class="list">${GUIDES.map((g, i) => `
            <button class="row" data-sheet="guide:${i}"><div class="row-icon" style="background:var(--blue)">${ic(g.i)}</div>
              <div class="row-main"><div class="row-title">${esc(g.t)}</div></div>${ic('chevron-right', 'chev')}</button>`).join('')}
          </div>
        </div>`;
    },
  };

  PAGES.documents = {
    title: 'Documents',
    render() {
      const docs = [
        ['Treatment plan', 'Implant #19 + veneers · ' + fShort(S.phases[0].date), 'file-text', '#5856d6'],
        ['Implant surgery consent', 'Signed ' + fShort(addDays(-60)), 'pen-line', '#34c759'],
        ['Post-op instructions', 'Implant placement', 'file-heart', '#ff2d55'],
        ['Financial agreement', 'Signed ' + fShort(S.phases[0].date), 'file-check', '#34c759'],
        ['Insurance pre-authorization', 'Delta Dental · Approved', 'shield-check', '#30b0c7'],
      ];
      return `
        <h1 class="large-title">Documents</h1>
        <p class="large-sub">Plans, consents and instructions</p>
        <div class="list">${docs.map(([t, s, i, c]) => `
          <button class="row" data-act="hud:Opening PDF…:file-text"><div class="row-icon" style="background:${c}">${ic(i)}</div>
            <div class="row-main"><div class="row-title">${t}</div><div class="row-sub">${s}</div></div>${ic('chevron-right', 'chev')}</button>`).join('')}
          <div class="row" style="opacity:.5"><div class="row-icon" style="background:#c7c7cc">${ic('award')}</div>
            <div class="row-main"><div class="row-title">Implant warranty certificate</div><div class="row-sub">Available after your crown is placed</div></div>${ic('lock', 'chev')}</div>
        </div>
        <div class="section" style="margin:22px 16px 0"><button class="btn btn-tinted btn-block" data-act="hud:Health history form opened:clipboard-list">${ic('clipboard-list')}Update my health history</button></div>`;
    },
  };

  PAGES.billing = {
    title: 'Billing',
    render() {
      const B = S.billing;
      return `
        <h1 class="large-title">Billing</h1>
        <div class="card white balance" style="margin-top:12px">
          <div style="font-size:14px;color:var(--label-2);font-weight:500">Current balance</div>
          <div class="amt"><small>$</small>${B.balance.toLocaleString('en-US')}<span style="font-size:24px">.00</span></div>
          ${B.left > 0 ? `<div style="margin-top:4px"><span class="pill">${ic('calendar-clock')}${money(B.monthly)}/mo · ${B.left} payment${B.left === 1 ? '' : 's'} left</span></div>
          <div style="color:var(--label-2);font-size:14px;margin-top:10px">Next auto-pay ${fLong(B.next)}</div>` : `<div style="margin-top:6px"><span class="pill green">${ic('circle-check')}Paid in full</span></div>`}
          ${B.balance > 0 ? `<button class="btn btn-primary btn-block" style="margin-top:18px" data-sheet="pay">Make a payment</button>` : ''}
        </div>
        <div class="section"><div class="caps">Activity</div><div class="list">
          ${B.history.map((h) => `<div class="row noicon"><div class="row-main"><div class="row-title">${esc(h.label)}</div><div class="row-sub">${fmt(h.at, { month: 'short', day: 'numeric', year: 'numeric' })}</div></div>
            <span class="row-val" style="color:${h.amt < 0 ? 'var(--green)' : 'var(--label)'};font-weight:600">${h.amt < 0 ? '−' : ''}${money(h.amt)}</span></div>`).join('')}
        </div></div>
        <div class="section"><div class="list">
          <button class="row" data-act="hud:Opening CareCredit…:external-link"><div class="row-icon" style="background:#34c759">${ic('hand-coins')}</div>
            <div class="row-main"><div class="row-title">Financing options</div><div class="row-sub">CareCredit, Cherry and more</div></div>${ic('chevron-right', 'chev')}</button>
        </div></div>`;
    },
  };

  PAGES.family = {
    title: 'Family',
    render() {
      return `
        <h1 class="large-title">Family</h1>
        <p class="large-sub">One login for the whole family</p>
        <div class="list">
          <div class="row" style="--inset:66px"><span class="avatar">${S.patient.initials}</span>
            <div class="row-main"><div class="row-title b">${esc(S.patient.first + ' ' + S.patient.last)} (you)</div><div class="row-sub">Implant #19 · Healing</div></div></div>
          ${S.family.map((f) => `<button class="row" style="--inset:66px" data-act="hud:Switched to ${esc(f.name.split(' ')[0])}'s profile:users"><span class="avatar gray">${f.initials}</span>
            <div class="row-main"><div class="row-title b">${esc(f.name)}</div><div class="row-sub">${esc(f.rel)} · ${esc(f.note)}</div></div>${ic('chevron-right', 'chev')}</button>`).join('')}
        </div>
        <div class="section" style="margin:22px 16px 0"><button class="btn btn-tinted btn-block" data-sheet="addfamily">${ic('user-plus')}Add a family member</button></div>
        <p class="section-foot" style="margin-top:14px">Great for parents managing kids' visits, or adult children helping a parent with dentures.</p>`;
    },
  };

  /* ---------------------------------------------------------
     Sheets
     --------------------------------------------------------- */
  let openSheetState = null;
  const SHEETS = {};

  SHEETS.phase = (i) => {
    i = +i; const p = S.phases[i];
    const st = i < S.phase ? ['Completed', 'green'] : i === S.phase ? ['In progress', ''] : ['Coming up', 'gray'];
    return {
      title: 'Step ' + (i + 1),
      body: `
        <div class="sheet-hero"><span class="pill ${st[1]}">${st[0]}</span><h2>${esc(p.title)}</h2><p>${esc(p.what)}</p></div>
        <div class="kv"><div><span>${i < S.phase ? 'Completed' : 'When'}</span><b>${p.end ? fShort(p.date) + ' – ' + fShort(p.end) : fShort(p.date)}</b></div><div><span>How long</span><b>${esc(p.length)}</b></div></div>
        <div class="section sheet-pad"><div class="caps" style="margin:0 0 12px">${i <= S.phase ? 'What to do' : 'How to prepare'}</div>${bullets(p.prep)}</div>
        <div class="section sheet-pad"><div class="caps" style="margin:0 0 12px">Afterwards</div>${bullets(p.after, 'arrow-right')}</div>
        <div class="section sheet-pad"><button class="btn btn-tinted btn-block" data-act="goto:messages:thread:care">${ic('message-circle')}Ask a question</button></div>`,
    };
  };

  SHEETS.appt = (id) => {
    const a = S.appts.find((x) => x.id === id); const rs = S.rescheduled[id];
    return {
      title: a.past ? 'Past visit' : 'Appointment',
      body: `
        <div class="sheet-hero">
          ${a.past ? '<span class="pill gray">Completed</span>' : rs ? `<span class="pill orange">${ic('clock')}Change requested</span>` : `<span class="pill green">${ic('circle-check')}Confirmed</span>`}
          <h2>${esc(a.title)}</h2><p>${fLong(a.date)} at ${a.time}</p>
        </div>
        ${rs ? `<div class="alert-banner" style="background:#fff7eb">${ic('clock')}<span>You asked to move this to <b>${rs.label}</b>. We'll confirm shortly.</span></div>` : ''}
        <div class="kv">
          <div><span>Duration</span><b>${a.dur}</b></div>
          <div><span>With</span><b>Dr. Duraini</b></div>
          <div><span>Where</span><b>Murphy, TX</b></div>
          <div><span>Type</span><b>${a.past ? 'Visit' : esc(a.kind)}</b></div>
        </div>
        ${a.past ? `<div class="section"><div class="caps">Visit notes</div><div class="note-box">${esc(a.notes)}</div></div>` : `
        <div class="section sheet-pad"><div class="caps" style="margin:0 0 12px">Before your visit</div>${bullets(a.prep)}</div>
        <div class="section sheet-pad" style="display:grid;gap:10px">
          <div class="btn-row" style="margin:0">
            <button class="btn btn-tinted" style="flex:1" data-act="hud:Added to Calendar:calendar-check">${ic('calendar-plus')}Add to Calendar</button>
            <button class="btn btn-tinted" style="flex:1" data-act="hud:Opening Maps…:map-pin">${ic('navigation')}Directions</button>
          </div>
          <button class="btn btn-gray btn-block" data-sheet="resched:${a.id}">Request a different time</button>
        </div>`}`,
    };
  };

  SHEETS.resched = (id) => {
    const a = S.appts.find((x) => x.id === id);
    const r = ui.rs[id] || (ui.rs[id] = { day: null, slot: null });
    const days = []; for (let n = 1; days.length < 10; n++) { const d = addDays(n); if (d.getDay() % 6) days.push(d); }
    const slots = ['8:30 AM', '9:30 AM', '11:00 AM', '1:30 PM', '2:30 PM', '4:00 PM'];
    return {
      title: 'New time',
      body: `
        <div class="sheet-hero"><h2>Pick a new time</h2><p>${esc(a.title)} · currently ${fShort(a.date)} at ${a.time}</p></div>
        <div class="sheet-pad">
          <div class="days">${days.map((d, i) => `<button class="day ${r.day === i ? 'on' : ''}" data-act="rsDay:${id}:${i}">${fWk(d)}<b>${d.getDate()}</b></button>`).join('')}</div>
          <div class="slots">${slots.map((s) => `<button class="slot ${r.slot === s ? 'on' : ''}" data-act="rsSlot:${id}:${s}">${s}</button>`).join('')}</div>
          <button class="btn btn-primary btn-block" style="margin-top:22px" data-act="rsSend:${id}" ${r.day == null || !r.slot ? 'disabled' : ''}>Request this time</button>
          <p class="section-foot" style="margin:12px 0 0;text-align:center">The front desk confirms every change, usually within an hour.</p>
        </div>`,
      days,
    };
  };

  SHEETS.request = () => ({
    title: 'Request',
    body: `
      <div class="sheet-hero"><h2>Request an appointment</h2><p>Tell us what you need and we'll find a time.</p></div>
      <div class="list" style="margin-bottom:16px">
        ${['Cleaning & check-up', 'Something feels wrong', 'Cosmetic consultation', 'Implant consultation', 'Other'].map((t, i) => `
          <button class="row noicon" data-act="reqPick:${i}"><div class="row-main"><div class="row-title">${t}</div></div><span class="check ${ui.req === i ? 'on' : ''}" style="width:24px;height:24px">${ic('check')}</span></button>`).join('')}
      </div>
      <div class="sheet-pad"><button class="btn btn-primary btn-block" data-act="reqSend" ${ui.req == null ? 'disabled' : ''}>Send request</button></div>`,
  });

  SHEETS.spec = (id) => {
    const s = S.specs.find((x) => x.id === id), sh = shade(s.shade);
    return {
      title: s.name,
      body: `
        <div class="sheet-hero"><span class="pill ${s.status === 'Planned' ? 'gray' : ''}">${esc(s.status)}</span><h2>${esc(s.name)}</h2><p>${esc(s.where)}</p></div>
        <div class="card" style="margin-bottom:12px">
          <div class="caps" style="margin:0 0 10px">Your shade</div>
          <div class="shades">${SHADES.map((x) => `<div class="shade-opt ${x.code === s.shade ? 'sel' : ''}"><span class="shade-dot" style="background:${x.hex}"></span>${x.code}</div>`).join('')}</div>
          <div style="font-size:15px;margin-top:6px"><b>${sh.code}</b> · ${esc(sh.note)}</div>
        </div>
        <div class="kv">
          <div><span>Material</span><b>${esc(s.material)}</b></div>
          <div><span>Shape</span><b>${esc(s.shape)}</b></div>
          <div><span>Lab</span><b>${esc(s.lab)}</b></div>
          <div><span>Lab case</span><b>${esc(s.labCase)}</b></div>
        </div>
        <div class="section"><div class="list">
          <div class="row"><div class="row-icon" style="background:var(--green)">${ic('shield-check')}</div>
            <div class="row-main"><div class="row-title">Approved by you</div><div class="row-sub">${fmt(s.approved, { month: 'long', day: 'numeric', year: 'numeric' })} · with Dr. Duraini</div></div></div>
          <div class="row"><div class="row-icon" style="background:#8e8e93">${ic('camera')}</div>
            <div class="row-main"><div class="row-title">Shade photo</div><div class="row-sub">Shade tab next to your natural teeth</div></div>${ic('chevron-right', 'chev')}</div>
        </div></div>
        <div class="section sheet-pad"><button class="btn btn-tinted btn-block" data-act="askShade:${s.id}">${ic('message-circle')}Ask about changing this</button></div>`,
    };
  };

  SHEETS.smileid = () => ({
    title: 'Smile ID',
    body: `
      <div class="sheet-hero"><h2>Your Smile ID</h2><p>Your shade, materials and lab details in one card. Show it to any dentist if you ever need a repair.</p></div>
      <div class="list" style="margin-bottom:16px">
        ${S.specs.map((s) => `<div class="row" style="--inset:58px"><span class="shade-dot" style="background:${shade(s.shade).hex}"></span>
          <div class="row-main"><div class="row-title b">${esc(s.name)}</div><div class="row-sub">${esc(s.where)} · ${esc(s.material)} · ${s.shade} · ${esc(s.labCase)}</div></div></div>`).join('')}
      </div>
      <div class="sheet-pad" style="display:grid;gap:10px">
        <button class="btn btn-block apple-pay" data-act="hud:Added to Wallet:wallet">${ic('wallet')}Add to Apple Wallet</button>
        <button class="btn btn-tinted btn-block" data-act="hud:Share link copied:share">${ic('share')}Share with another dentist</button>
      </div>`,
  });

  SHEETS.video = (i) => {
    const v = VIDEOS[+i];
    return {
      title: 'Video',
      body: `
        <div class="sheet-pad"><div class="video-thumb" style="height:200px;border-radius:20px"><span class="video-play" style="width:60px;height:60px">${ic('play')}</span><span class="video-len">${v.d}</span></div></div>
        <div class="sheet-hero" style="padding-top:16px"><h2>${esc(v.t)}</h2><p>A short video from Dr. Duraini: ${esc(v.s.toLowerCase())}. In the live app, the doctor's own videos play right here.</p></div>`,
    };
  };

  SHEETS.guide = (i) => {
    const g = GUIDES[+i];
    return {
      title: 'Guide',
      body: `
        <div class="sheet-hero"><h2>${esc(g.t)}</h2></div>
        <div class="card" style="margin-bottom:12px"><div class="caps" style="margin:0 0 10px">Do</div>${bullets(g.b)}</div>
        <div class="card"><div class="caps" style="margin:0 0 10px">Avoid</div>${bullets(g.x, 'x')}</div>
        <p class="section-foot" style="margin-top:16px">Call the office if you have bleeding that won't stop, a fever, or pain that gets worse instead of better.</p>`,
    };
  };

  SHEETS.pay = () => {
    const B = S.billing;
    if (ui.pay === 'done') return {
      title: 'Payment',
      body: `<div class="pay-success"><div class="pay-check">${ic('check')}</div>
        <h2 style="margin:6px 0 0;font-family:var(--font-display);letter-spacing:-.02em">Payment received</h2>
        <p style="margin:0;color:var(--label-2)">Thank you, ${esc(S.patient.first)}. A receipt is in your Billing messages.</p></div>
        <div class="sheet-pad" style="margin-top:20px"><button class="btn btn-primary btn-block" data-act="closeSheet">Done</button></div>`,
    };
    const amt = ui.payAmt || 'monthly';
    return {
      title: 'Payment',
      body: `
        <div class="sheet-hero"><h2>Make a payment</h2><p>Balance ${money(B.balance)}</p></div>
        <div class="list" style="margin-bottom:18px">
          <button class="row noicon" data-act="payAmt:monthly"><div class="row-main"><div class="row-title">Monthly payment</div><div class="row-sub">${money(Math.min(B.monthly, B.balance))}</div></div><span class="check ${amt === 'monthly' ? 'on' : ''}" style="width:24px;height:24px">${ic('check')}</span></button>
          <button class="row noicon" data-act="payAmt:full"><div class="row-main"><div class="row-title">Full balance</div><div class="row-sub">${money(B.balance)}</div></div><span class="check ${amt === 'full' ? 'on' : ''}" style="width:24px;height:24px">${ic('check')}</span></button>
        </div>
        <div class="sheet-pad" style="display:grid;gap:10px">
          <button class="btn btn-block apple-pay" data-act="payNow">Pay with Apple Pay</button>
          <button class="btn btn-gray btn-block" data-act="payNow">${ic('credit-card')}Visa •• 4821</button>
          <p class="section-foot" style="margin:6px 0 0;text-align:center">Prototype: no real payment is made.</p>
        </div>`,
    };
  };

  SHEETS.insurance = () => ({
    title: 'Insurance',
    body: `
      <div class="sheet-hero"><h2>Delta Dental PPO</h2><p>Primary insurance on file</p></div>
      <div class="kv"><div><span>Member</span><b>Sarah Mitchell</b></div><div><span>Member ID</span><b>•••• 7781</b></div>
        <div><span>Annual max left</span><b>$450</b></div><div><span>Renews</span><b>Jan 1</b></div></div>
      <div class="section sheet-pad" style="display:grid;gap:10px">
        <button class="btn btn-tinted btn-block" data-act="hud:Camera opened:camera">${ic('camera')}Update insurance card photo</button>
      </div>`,
  });

  SHEETS.language = () => ({
    title: 'Language',
    body: `<div class="list" style="margin-top:8px">${['English', 'Español', 'العربية', 'Tiếng Việt'].map((l) => `
      <button class="row noicon" data-act="lang:${l}"><div class="row-main"><div class="row-title">${l}</div></div>${ui.lang === l ? ic('check', 'chev" style="color:var(--blue)') : ''}</button>`).join('')}</div>
      <p class="section-foot" style="margin-top:12px">Prototype: translations come in a later version.</p>`,
  });

  SHEETS.addmed = () => ({
    title: 'Add medication',
    body: `<div class="sheet-hero"><h2>A medication you take</h2><p>Some medications, like blood thinners, matter for implant care. Dr. Duraini's team will review it.</p></div>
      <div class="sheet-pad"><input class="input" placeholder="Medication name" value="Lisinopril"><input class="input" placeholder="Dose and how often" value="10 mg once daily">
      <button class="btn btn-primary btn-block" style="margin-top:8px" data-act="addMedSend">Send to care team</button></div>`,
  });

  SHEETS.addfamily = () => ({
    title: 'Add family',
    body: `<div class="sheet-hero"><h2>Add a family member</h2><p>They'll get their own record under your login.</p></div>
      <div class="sheet-pad"><input class="input" id="famName" placeholder="Full name" value="Emma Mitchell"><input class="input" id="famRel" placeholder="Relationship" value="Daughter">
      <button class="btn btn-primary btn-block" style="margin-top:8px" data-act="addFamSend">Add</button></div>`,
  });

  function openSheet(name, arg) {
    if (openSheetState) closeSheet(true);
    const def = SHEETS[name](arg);
    const bd = document.createElement('div'); bd.className = 'sheet-backdrop';
    const sh = document.createElement('div'); sh.className = 'sheet';
    sh.innerHTML = `<div class="sheet-head"><div class="grabber"></div><div class="sheet-bar"><span></span><h3>${esc(def.title)}</h3>
      <button class="sheet-close" data-act="closeSheet" aria-label="Close">${ic('x')}</button></div></div><div class="sheet-body">${def.body}</div>`;
    app.append(bd, sh);
    paint();
    openSheetState = { name, arg, bd, sh };
    bd.addEventListener('click', () => closeSheet());
    sh.getBoundingClientRect();
    requestAnimationFrame(() => { bd.classList.add('show'); sh.classList.add('show'); app.classList.add('sheet-open'); });
    sheetDrag(sh);
  }

  function refreshSheet() {
    const o = openSheetState; if (!o) return;
    const def = SHEETS[o.name](o.arg);
    const body = $('.sheet-body', o.sh); const st = body.scrollTop;
    body.innerHTML = def.body; $('h3', o.sh).textContent = def.title;
    paint(); body.scrollTop = st;
  }

  function closeSheet(instant) {
    const o = openSheetState; if (!o) return;
    openSheetState = null;
    app.classList.remove('sheet-open');
    o.bd.classList.remove('show');
    o.sh.classList.remove('dragging');
    o.sh.style.transform = '';
    o.sh.classList.remove('show');
    setTimeout(() => { o.bd.remove(); o.sh.remove(); }, instant ? 0 : 520);
  }

  function sheetDrag(sh) {
    const head = $('.sheet-head', sh);
    let d = null;
    head.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      d = { y: e.clientY, hist: [], dy: 0, scale: app.getBoundingClientRect().height / app.offsetHeight };
      sh.classList.add('dragging'); head.setPointerCapture(e.pointerId);
    });
    head.addEventListener('pointermove', (e) => {
      if (!d) return;
      let dy = (e.clientY - d.y) / d.scale;
      if (dy < 0) dy = -Math.pow(-dy, 0.7); // rubber-band upward
      d.dy = dy; d.hist.push({ y: dy, t: performance.now() }); if (d.hist.length > 5) d.hist.shift();
      sh.style.transform = `translateY(${dy}px)`;
    });
    const end = () => {
      if (!d) return;
      const h = d.hist; const v = h.length > 1 ? (h[h.length - 1].y - h[0].y) / Math.max(1, h[h.length - 1].t - h[0].t) : 0;
      sh.classList.remove('dragging');
      if (d.dy > 140 || v > 0.6) closeSheet(); else sh.style.transform = '';
      d = null;
    };
    head.addEventListener('pointerup', end);
    head.addEventListener('pointercancel', end);
  }

  /* ---------------------------------------------------------
     Feedback: HUD + push banners
     --------------------------------------------------------- */
  let hudT;
  function hud(text, icon = 'circle-check') {
    const h = $('#hud');
    h.innerHTML = `${ic(icon)}<span>${esc(text)}</span>`; paint();
    h.classList.add('show'); clearTimeout(hudT);
    hudT = setTimeout(() => h.classList.remove('show'), 1800);
  }

  let pushT, pushQueue = [], pushing = false;
  function showPush(n) { pushQueue.push(n); if (!pushing) nextPush(); }
  function nextPush() {
    const n = pushQueue.shift(); const el = $('#push');
    if (!n) { pushing = false; return; }
    pushing = true;
    el.innerHTML = `<img src="assets/app-icon-180.png" alt=""><div class="push-main"><div class="push-app"><span>ADL Smile</span><span>now</span></div>
      <div class="push-title">${esc(n.title)}</div><div class="push-body">${esc(n.body)}</div></div>`;
    el.onclick = () => { el.classList.remove('show'); clearTimeout(pushT); if (n.go) n.go(); setTimeout(nextPush, 500); };
    requestAnimationFrame(() => el.classList.add('show'));
    pushT = setTimeout(() => { el.classList.remove('show'); setTimeout(nextPush, 700); }, 4600);
  }
  function flushPending() {
    if (!S.signedIn) return;
    const list = S.pendingPush.splice(0);
    list.forEach((n, i) => setTimeout(() => showPush(n), 500 + i * 120));
  }

  /* ---------------------------------------------------------
     Actions
     --------------------------------------------------------- */
  const ACTIONS = {
    med(el, id, i) {
      const m = S.meds.find((x) => x.id === id); i = +i;
      m.taken[i] = !m.taken[i];
      refresh();
      const c = $(`[data-act="med:${id}:${i}"] .check`, top().el);
      if (c && m.taken[i]) { c.classList.add('pop'); navigator.vibrate?.(10); }
      const mc = medCounts();
      if (m.taken[i] && mc.done === mc.total) hud('All done for today');
      window.DASH?.refresh();
    },
    seg(el, name, val) { if (name === 'schedule') ui.scheduleSeg = val; refresh(); },
    goto(el, tab, page, arg) { goTo(tab, page, arg ? { arg } : {}); },
    reschedNext() { const a = nextAppt(); if (a) openSheet('resched', a.id); },
    hud(el, text, icon) { hud(text, icon); },
    closeSheet() { closeSheet(); if (ui.pay === 'done') { ui.pay = null; ui.payAmt = null; } },
    topic(el, t) { ui.topic = t; refresh(); },
    photo() { ui.draftPhoto = true; refresh(); },
    unphoto() { ui.draftPhoto = false; refresh(); },
    send(el, id) {
      const t = S.threads.find((x) => x.id === id);
      const text = ui.draft.trim();
      if (!text && !ui.draftPhoto) return;
      const topic = id === 'care' ? ui.topic : null;
      if (ui.draftPhoto) t.msgs.push({ from: 'me', photo: true, at: TODAY, time: nowTime(), topic });
      if (text) t.msgs.push({ from: 'me', text, at: TODAY, time: nowTime(), topic });
      const hadPhoto = ui.draftPhoto;
      ui.draft = ''; ui.draftPhoto = false;
      refresh(); scrollThread();
      window.DASH?.onPatientMessage(id);
      if (id !== 'care') return;
      setTimeout(() => { ui.typing[id] = true; if (onThread(id)) { refresh(); scrollThread(); } }, 900);
      setTimeout(() => {
        ui.typing[id] = false;
        const reply = topic === 'Urgent' ? 'We got your urgent message, Sarah. Someone from the team is calling you right now.'
          : topic === 'Concern' ? `Thanks for letting us know${hadPhoto ? ' and for the photo, it really helps' : ''}. A team member will review this and reach out today.`
          : `Thanks, Sarah! ${hadPhoto ? 'Got your photo. ' : ''}Dr. Duraini's team will reply by the end of the day.`;
        t.msgs.push({ from: 'them', who: 'Care Team', text: reply, at: TODAY, time: nowTime(), auto: true });
        if (onThread(id)) { refresh(); scrollThread(); } else { t.unread++; updateChrome(); }
        window.DASH?.refresh();
      }, 2600);
    },
    notify(el, k) { S.notify[k] = !S.notify[k]; refresh(); },
    faceid() { S.faceId = !S.faceId; refresh(); },
    textLarge() { S.textLarge = !S.textLarge; refresh(); },
    medRem() { S.medReminders = !S.medReminders; refresh(); },
    mode(el, m) { setMode(m); },
    signout() { S.signedIn = false; renderLogin(); },
    rsDay(el, id, i) { ui.rs[id].day = +i; refreshSheet(); },
    rsSlot(el, id, ...s) { ui.rs[id].slot = s.join(':'); refreshSheet(); },
    rsSend(el, id) {
      const r = ui.rs[id]; const def = SHEETS.resched(id); const d = def.days[r.day];
      const label = `${fmt(d, { weekday: 'short', month: 'short', day: 'numeric' })} at ${r.slot}`;
      S.rescheduled[id] = { label, date: d, time: r.slot };
      delete ui.rs[id];
      closeSheet(); refresh(); hud('Request sent', 'send');
      window.DASH?.onReschedule(id, label);
      setTimeout(() => {
        if (!S.rescheduled[id]) return;
        const a = S.appts.find((x) => x.id === id);
        a.date = d; a.time = S.rescheduled[id].time; delete S.rescheduled[id];
        if (document.body.dataset.mode === 'patient') {
          showPush({ title: 'Appointment confirmed', body: `${a.title} moved to ${label}. See you then!`, go: () => goTo('schedule') });
        } else S.pendingPush.push({ title: 'Appointment confirmed', body: `${a.title} moved to ${label}.` });
        refresh(); window.DASH?.refresh();
      }, 4200);
    },
    reqPick(el, i) { ui.req = +i; refreshSheet(); },
    reqSend() { ui.req = null; closeSheet(); hud('Request sent', 'send'); },
    askShade(el, id) {
      const s = S.specs.find((x) => x.id === id);
      ui.draft = `Hi! I'd like to talk about the shade for my ${s.name.toLowerCase()}. Could we look at a slightly different option?`;
      ui.topic = 'Question';
      goTo('messages', 'thread', { arg: 'care' });
    },
    payAmt(el, a) { ui.payAmt = a; refreshSheet(); },
    payNow() {
      const B = S.billing; const amt = (ui.payAmt || 'monthly') === 'full' ? B.balance : Math.min(B.monthly, B.balance);
      B.balance -= amt; B.left = B.balance > 0 ? Math.ceil(B.balance / B.monthly) : 0;
      B.history.unshift({ label: 'Payment · ' + (ui.payAmt === 'full' ? 'Full balance' : 'Monthly'), amt: -amt, at: TODAY });
      S.threads[1].msgs.push({ from: 'them', who: 'Billing', text: `We received your payment of ${money(amt)}. Thank you, Sarah!`, at: TODAY, time: nowTime() });
      ui.pay = 'done'; refreshSheet(); refresh(); navigator.vibrate?.(20);
    },
    lang(el, l) { ui.lang = l; refreshSheet(); refresh(); },
    addMedSend() { closeSheet(); hud('Sent to your care team', 'send'); },
    addFamSend() {
      const n = $('#famName').value.trim() || 'Family member', r = $('#famRel').value.trim() || 'Family';
      S.family.push({ name: n, rel: r, initials: n.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase(), note: 'New patient' });
      closeSheet(); refresh(); hud('Family member added', 'user-plus');
    },
  };

  const onThread = (id) => top().id === 'thread' && top().params.arg === id && document.body.dataset.mode === 'patient';
  function scrollThread() { const sc = $('.msg-scroll', top().el); if (sc) sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' }); }

  app.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab],[data-back],[data-push],[data-sheet],[data-act]');
    if (!t || !app.contains(t)) return;
    if (t.dataset.tab) { closeSheet(); return showTab(t.dataset.tab); }
    if (t.hasAttribute('data-back')) return pop();
    if (t.dataset.push) { const [id, arg] = t.dataset.push.split(':'); return push(id, { arg }); }
    if (t.dataset.sheet) { const [id, arg] = t.dataset.sheet.split(':'); return openSheet(id, arg); }
    if (t.dataset.act) { const [name, ...args] = t.dataset.act.split(':'); ACTIONS[name]?.(t, ...args); }
  });

  /* ---------------------------------------------------------
     Login
     --------------------------------------------------------- */
  function renderLogin() {
    const L = $('#login');
    L.className = 'login';
    L.innerHTML = `
      <img class="login-mark" src="assets/adl-mark-blue.png" alt="Advanced Dental Lounge">
      <h1>Advanced Dental Lounge</h1>
      <p>Your smile, every step of the way.</p>
      <div class="login-form">
        <input class="input" type="email" value="${esc(S.patient.email)}" aria-label="Email">
        <input class="input" type="password" value="prototype" aria-label="Password">
      </div>
      <div class="login-spacer"></div>
      <button class="btn btn-primary btn-block" id="loginFace">${ic('scan-face')}Sign in with Face ID</button>
      <button class="btn btn-tinted btn-block" id="loginEmail">Sign in with email</button>
      <div class="login-fine">Prototype for Advanced Dental Lounge &amp; Implants.<br>Sample patient, no real health data.</div>
      <div class="faceid" id="faceid"><div class="faceid-box">${ic('scan-face')}</div></div>`;
    paint();
    const enter = () => {
      L.classList.add('out'); S.signedIn = true;
      setTimeout(() => { showTab('home', true); flushPending(); }, 300);
      setTimeout(() => {
        if (!S._welcomed) { S._welcomed = true; showPush({ title: 'Healing check in ' + daysBetween(TODAY, S.appts[0].date) + ' days', body: `${fLong(S.appts[0].date)} at ${S.appts[0].time}. Tap to view.`, go: () => goTo('schedule') }); }
      }, 1400);
    };
    $('#loginFace').onclick = () => {
      const f = $('#faceid'); f.classList.add('show');
      setTimeout(() => { const b = $('.faceid-box', f); b.classList.add('ok'); b.innerHTML = ic('circle-check'); paint(); }, 900);
      setTimeout(() => { f.classList.remove('show'); enter(); }, 1400);
    };
    $('#loginEmail').onclick = () => {
      if (!L.classList.contains('email')) { L.classList.add('email'); $('#loginEmail').textContent = 'Sign in'; $('#loginEmail').className = 'btn btn-primary btn-block'; $('#loginFace').style.display = 'none'; return; }
      enter();
    };
  }

  /* ---------------------------------------------------------
     Stage: mode switch, phone scaling, clock
     --------------------------------------------------------- */
  function setMode(m) {
    document.body.dataset.mode = m;
    const segEl = $('.seg-stage');
    segEl.style.setProperty('--i', m === 'patient' ? 0 : 1);
    $$('[data-mode-btn]').forEach((b) => b.classList.toggle('is-on', b.dataset.modeBtn === m));
    if (m === 'patient') { refresh(); setTimeout(flushPending, 350); }
    else window.DASH?.render();
    fit();
  }
  $$('[data-mode-btn]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.modeBtn)));

  function fit() {
    if (innerWidth <= 600) { document.documentElement.style.setProperty('--phone-scale', 1); return; }
    const s = Math.min(1, (innerHeight - 68 - 40) / 868);
    document.documentElement.style.setProperty('--phone-scale', s.toFixed(3));
  }
  addEventListener('resize', fit);
  const tick = () => { $('#sbTime').textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M/, ''); };
  setInterval(tick, 15000);

  window.ADL = { refresh, setMode, hud, showPush, goTo, ic, esc, fShort, fLong, money, nowTime, relDay, shade, healing, paint };

  buildShell();
  enableEdgeSwipe();
  fit(); tick();
})();
