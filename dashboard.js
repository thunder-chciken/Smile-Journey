/* =========================================================
   ADL Practice Dashboard — the staff side
   Shares STATE with the patient app, so edits here show up
   on Sarah's phone (as push banners when you switch back).
   ========================================================= */
(() => {
  const S = STATE;
  const A = window.ADL;
  const { ic, esc, fShort, fLong, money, nowTime, relDay, shade, healing } = A;
  const $ = (s, r = document) => r.querySelector(s);
  const dash = $('#dash');

  const ui = { view: 'today', inbox: 'sarah', staffSeen: S.threads[0].msgs.length };

  const PHASE_SHORT = S.phases.map((p) => p.short);
  const CASES = [
    { id: 'mb', name: 'Michael Brennan', proc: 'Implant #14', phase: 0, days: 3 },
    { id: 'ar', name: 'Aisha Rahman', proc: 'All-on-4 · upper', phase: 0, days: 6 },
    { id: 'tk', name: 'Tom Keller', proc: 'Implant #3', phase: 1, days: 12 },
    { id: 'lp', name: 'Linda Park', proc: 'Implant #30', phase: 2, days: 5, flag: ['Pain 4/5', 'red'] },
    { id: 'sarah', name: 'Sarah Mitchell', proc: 'Implant #19 + veneers', phase: null },
    { id: 'do', name: 'Daniel Ortiz', proc: 'Implant #30', phase: 3, days: 88, total: 84, flag: ['Ready', 'orange'] },
    { id: 'gl', name: 'Grace Liu', proc: 'Implant #8', phase: 3, days: 30, total: 84 },
    { id: 'jw', name: 'James Whitaker', proc: 'Implant #19', phase: 4, days: 9, flag: ['Lab', 'gray'] },
    { id: 'mg', name: 'Maria Gonzalez', proc: 'Implant #13', phase: 4, days: 4 },
    { id: 'kb', name: 'Kevin Brooks', proc: 'Implant #18', phase: 5, days: 0, flag: ['Seated today', 'green'] },
    { id: 'en', name: 'Emily Novak', proc: 'Implant #9', phase: 5, days: 11 },
    { id: 'hj', name: 'Harold Jensen', proc: 'All-on-4 · lower', phase: 6, days: 140 },
    { id: 'np', name: 'Nina Patel', proc: 'Implant #29', phase: 6, days: 182 },
  ];
  const initials = (n) => n.split(' ').map((x) => x[0]).join('');

  const TODAY_SCHED = [
    ['8:00 AM', 'Kevin Brooks', 'Crown seat #18', 'Op 1', ['Done', 'green']],
    ['8:45 AM', 'Grace Liu', 'Healing check #8', 'Op 2', ['Done', 'green']],
    ['9:30 AM', 'Aisha Rahman', 'All-on-4 consult + CBCT', 'Op 3', ['In chair', '']],
    ['10:30 AM', 'Linda Park', 'Post-op check #30', 'Op 1', ['Checked in', 'orange']],
    ['11:15 AM', 'Daniel Ortiz', 'Healing check #30', 'Op 2', ['Confirmed', 'gray']],
    ['1:00 PM', 'Michael Brennan', 'Treatment plan review', 'Consult', ['Confirmed', 'gray']],
    ['2:00 PM', 'Tom Keller', 'Bone graft follow-up', 'Op 1', ['Confirmed', 'gray']],
    ['3:30 PM', 'Nina Patel', '6-month implant check', 'Op 2', ['Unconfirmed', 'red']],
  ];

  const OTHER_THREADS = [
    { id: 'lp', name: 'Linda Park', when: 'Today', text: 'Is this much swelling normal on day 5? I attached a photo.', unread: true },
    { id: 'do', name: 'Daniel Ortiz', when: 'Yesterday', text: 'Any chance I can come in earlier for my abutment? Mornings are best.', unread: true },
    { id: 'gl', name: 'Grace Liu', when: 'Mon', text: 'Thank you so much, everyone was wonderful today!' },
  ];

  const staffUnread = () => {
    const t = S.threads[0];
    return t.msgs.slice(ui.staffSeen).filter((m) => m.from === 'me').length + OTHER_THREADS.filter((o) => o.unread).length;
  };
  const sarahNew = () => S.threads[0].msgs.slice(ui.staffSeen).filter((m) => m.from === 'me');

  /* ---------- shell ---------- */
  function render() {
    const nav = [
      ['today', 'Today', 'layout-dashboard'],
      ['cases', 'Implant cases', 'kanban'],
      ['patients', 'Patients', 'users'],
      ['inbox', 'Inbox', 'inbox', staffUnread()],
      ['lab', 'Lab cases', 'flask-conical'],
    ];
    const sidebarSel = ui.view === 'record' ? 'patients' : ui.view;
    dash.innerHTML = `
      <aside class="d-side">
        <div class="traffic"><i></i><i></i><i></i></div>
        <div class="d-brand"><img src="assets/app-icon-180.png" alt=""><div><b>ADL Practice</b><span>Murphy, TX</span></div></div>
        ${nav.map(([id, label, icon, badge]) => `<button class="d-nav ${sidebarSel === id ? 'on' : ''}" data-d="view:${id}">${ic(icon)}${label}${badge ? `<span class="badge">${badge}</span>` : ''}</button>`).join('')}
        <div class="d-side-label">Quick open</div>
        <button class="d-nav ${ui.view === 'record' ? 'on' : ''}" data-d="record:sarah">${ic('user')}Sarah Mitchell</button>
        <div class="d-side-foot"><span class="avatar">BD</span><div><b>Dr. Baha Duraini</b><span>Dentist · Owner</span></div></div>
      </aside>
      <section class="d-main">
        <div class="d-top">
          <label class="d-search">${ic('search')}<input placeholder="Search patients, appointments, lab cases"></label>
          <div class="d-top-actions">
            <button class="btn btn-tinted btn-sm" data-d="toast:New appointment form opened">${ic('plus')}New appointment</button>
            <button class="btn btn-primary btn-sm" data-d="mode:patient">${ic('smartphone')}View as Sarah</button>
          </div>
        </div>
        <div class="d-body">${VIEWS[ui.view]()}</div>
      </section>
      <div class="d-toast" id="dToast"></div>`;
    A.paint();
    const th = $('.d-thread', dash); if (th) th.scrollTop = th.scrollHeight;
  }

  /* ---------- views ---------- */
  const VIEWS = {};

  VIEWS.today = () => {
    const attn = [];
    sarahNew().forEach((m) => attn.push(['message-circle', 'var(--blue)', 'Sarah Mitchell sent a message', (m.topic && m.topic !== 'Question' ? m.topic + ': ' : '') + (m.photo ? 'Photo attached' : m.text), 'inbox:sarah']));
    Object.entries(S.rescheduled).forEach(([id, r]) => {
      const a = S.appts.find((x) => x.id === id);
      attn.push(['calendar-clock', 'var(--orange)', 'Reschedule request · Sarah Mitchell', `${a.title}: wants ${r.label}`, 'record:sarah']);
    });
    attn.push(
      ['triangle-alert', 'var(--red)', 'Linda Park reported pain 4/5', 'Day-5 check-in after implant #30, photo attached', 'inbox:lp'],
      ['clock', 'var(--orange)', 'Daniel Ortiz is past his healing window', 'Day 88 of 84. Book abutment & impression', 'toast:Opening Daniel Ortiz'],
      ['flask-conical', 'var(--indigo)', 'Lab: abutment due tomorrow', 'James Whitaker · Precision Smile Lab', 'view:lab'],
    );
    return `
      <h1 class="d-h1">${fLong(TODAY)}</h1>
      <p class="d-h1-sub">Good morning, Dr. Duraini. Here's the day at a glance.</p>
      <div class="d-stats">
        <div class="d-stat"><div class="lbl">${ic('calendar-days')}Patients today</div><div class="val">${TODAY_SCHED.length}<small>2 done</small></div></div>
        <div class="d-stat"><div class="lbl">${ic('activity')}Active implant cases</div><div class="val">${CASES.filter((c) => (c.phase ?? S.phase) < 6).length}</div></div>
        <div class="d-stat"><div class="lbl">${ic('inbox')}Unread messages</div><div class="val">${staffUnread()}</div></div>
        <div class="d-stat"><div class="lbl">${ic('flask-conical')}Due back from lab</div><div class="val">3<small>this week</small></div></div>
      </div>
      <div class="d-cols">
        <div class="d-panel">
          <div class="d-panel-head"><h3>Schedule</h3><span>Dr. Duraini · 3 operatories</span></div>
          ${TODAY_SCHED.map(([t, n, p, op, st]) => `
            <div class="sched-row" data-d="toast:Opening ${esc(n)}">
              <span class="sched-time">${t}</span>
              <span class="sched-who"><b>${esc(n)}</b><span>${esc(p)}</span></span>
              <span class="sched-op">${op}</span>
              <span class="pill ${st[1]}">${st[0]}</span>
            </div>`).join('')}
        </div>
        <div class="d-panel">
          <div class="d-panel-head"><h3>Needs attention</h3><span>${attn.length} items</span></div>
          ${attn.map(([i, c, t, s, act]) => `
            <div class="attn-row" data-d="${act}"><span class="attn-ic" style="background:${c}">${ic(i)}</span><div><b>${esc(t)}</b><p>${esc(s)}</p></div></div>`).join('')}
        </div>
      </div>`;
  };

  VIEWS.cases = () => {
    const heal = healing();
    const cols = PHASE_SHORT.map((label, pi) => {
      const items = CASES.filter((c) => (c.id === 'sarah' ? S.phase : c.phase) === pi);
      return `
        <div class="col">
          <div class="col-head">${esc(label)}<span>${items.length}</span></div>
          ${items.map((c) => {
            const me = c.id === 'sarah';
            const days = me ? (S.phase === 3 ? heal.day : 1) : c.days;
            const total = me ? (S.phase === 3 ? heal.total : null) : c.total;
            const flag = me ? (Object.keys(S.rescheduled).length ? ['Resched.', 'orange'] : sarahNew().length ? ['Message', ''] : null) : c.flag;
            return `
              <button class="kcard ${me ? 'me' : ''}" data-d="record:${c.id}">
                <b>${esc(c.name)}</b><div class="k-sub">${esc(c.proc)}</div>
                ${total ? `<div class="k-bar"><span style="width:${Math.min(100, Math.round(days / total * 100))}%;${days > total ? 'background:var(--orange)' : ''}"></span></div>` : ''}
                <div class="k-foot"><span class="k-days">${total ? `Day ${days} of ${total}` : `${days} day${days === 1 ? '' : 's'} in step`}</span>${flag ? `<span class="pill ${flag[1]}">${flag[0]}</span>` : ''}</div>
              </button>`;
          }).join('')}
        </div>`;
    }).join('');
    return `
      <h1 class="d-h1">Implant cases</h1>
      <p class="d-h1-sub">Every active case by step. Click Sarah Mitchell to open her record.</p>
      <div class="board">${cols}</div>`;
  };

  VIEWS.record = () => {
    const P = S.patient, heal = healing();
    const t = S.threads[0];
    ui.staffSeen = t.msgs.length;
    const mc = (() => { let d = 0, n = 0; S.meds.forEach((m) => m.taken.forEach((x) => { n++; if (x) d++; })); return { d, n }; })();
    const up = S.appts.filter((a) => !a.past).sort((a, b) => a.date - b.date);
    return `
      <div class="rec-head">
        <span class="avatar lg">${P.initials}</span>
        <div><h2>${esc(P.first + ' ' + P.last)}</h2><p>Implant #19 + upper veneers · Step ${S.phase + 1} of ${S.phases.length}: ${esc(S.phases[S.phase].title)}</p></div>
        <div class="actions">
          <button class="btn btn-tinted btn-sm" data-d="toast:Opening chart in Eaglesoft">${ic('external-link')}Open in Eaglesoft</button>
          <button class="btn btn-primary btn-sm" data-d="mode:patient">${ic('smartphone')}See her app</button>
        </div>
      </div>

      <div class="rec-grid">
        <div>
          <div class="d-panel">
            <div class="d-panel-head"><h3>Smile Journey</h3><span>Click a step to move her case</span></div>
            <div class="stepper">
              <div class="steps">${S.phases.map((p, i) => `
                <button class="step ${i < S.phase ? 'done' : i === S.phase ? 'cur' : ''}" data-d="phase:${i}"><b>STEP ${i + 1}</b>${esc(p.short)}</button>`).join('')}</div>
              <div class="stepper-foot">
                <span>${S.phase === 3 ? `Healing day ${heal.day} of ${heal.total}` : 'Current: ' + esc(S.phases[S.phase].title)} · Sarah sees every change instantly.</span>
                ${S.phase < S.phases.length - 1 ? `<button class="btn btn-primary btn-sm" data-d="phase:${S.phase + 1}">Move to ${esc(S.phases[S.phase + 1].short)}${ic('arrow-right')}</button>` : ''}
              </div>
            </div>
          </div>

          <div class="d-panel">
            <div class="d-panel-head"><h3>Smile Specs</h3><span>What Sarah sees under My Smile</span></div>
            ${S.specs.map((s) => `
              <div class="form-grid" style="border-bottom:.5px solid var(--sep)">
                <div style="grid-column:1/-1;display:flex;justify-content:space-between;align-items:center"><b style="font-size:15px">${esc(s.name)} <span style="color:var(--label-2);font-weight:500">· ${esc(s.where)}</span></b><span class="pill ${s.status === 'Planned' ? 'gray' : ''}">${esc(s.status)}</span></div>
                <label>Material<select class="select" data-d-change="material:${s.id}">${['Zirconia', 'e.max porcelain', 'PFM', 'Composite'].map((m) => `<option ${m === s.material ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
                <label>Status<select class="select" data-d-change="status:${s.id}">${['Planned', 'In design', 'At lab', 'Ready to seat', 'Placed'].map((m) => `<option ${m === s.status ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
                <div class="shade-pick"><label>Shade</label>
                  <div class="shades">${SHADES.map((x) => `<button class="shade-opt ${x.code === s.shade ? 'sel' : ''}" data-d="shade:${s.id}:${x.code}"><span class="shade-dot" style="background:${x.hex}"></span>${x.code}</button>`).join('')}</div>
                </div>
              </div>`).join('')}
          </div>
        </div>

        <div>
          <div class="d-panel">
            <div class="d-panel-head"><h3>Messages</h3><span>Secure · HIPAA</span></div>
            ${threadHTML(t)}
          </div>

          <div class="d-panel">
            <div class="d-panel-head"><h3>At a glance</h3></div>
            <div class="mini-kv">
              <div><span>Meds today</span><b>${mc.d}/${mc.n}</b></div>
              <div><span>Balance</span><b>${money(S.billing.balance).replace('.00', '')}</b></div>
              <div><span>Allergies</span><b style="font-size:14px">${esc(S.allergies[0].split(' ')[0])}</b></div>
            </div>
            ${up.map((a) => {
              const rs = S.rescheduled[a.id];
              return `<div class="sched-row" style="grid-template-columns:90px 1fr auto">
                <span class="sched-time">${fShort(a.date)}</span><span class="sched-who"><b>${esc(a.title)}</b><span>${a.time} · ${a.dur}</span></span>
                ${rs ? `<button class="btn btn-sm btn-primary" data-d="approve:${a.id}">Approve ${esc(rs.label.replace(/^\w+, /, ''))}</button>` : '<span class="pill gray">Confirmed</span>'}
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>`;
  };

  function threadHTML(t) {
    let last = '';
    const body = t.msgs.map((m) => {
      const day = relDay(m.at);
      const head = day !== last ? `<div class="msg-day">${day}</div>` : ''; last = day;
      const tag = m.from === 'me' && m.topic && m.topic !== 'Question' ? `<div class="msg-meta" style="color:${m.topic === 'Urgent' ? 'var(--red)' : 'var(--orange)'};font-weight:600">${m.topic}</div>` : '';
      if (m.photo) return head + tag + `<div class="bubble me photo"><div class="ph" style="width:150px;height:110px">${ic('image')}</div></div>`;
      return head + tag + `<div class="bubble ${m.from}">${esc(m.text)}</div>${m.auto ? '<div class="msg-meta right">Auto-reply</div>' : ''}`;
    }).join('');
    return `
      <div class="d-thread">${body}</div>
      <div class="quick-replies">
        ${['Looks normal, keep doing what you’re doing.', 'Can you send a photo?', 'Please call the office today.'].map((q) => `<button data-d="quick:${esc(q)}">${esc(q)}</button>`).join('')}
      </div>
      <form class="d-reply" data-d-submit="reply">
        <input id="dReply" placeholder="Reply to Sarah…" autocomplete="off">
        <button class="send" aria-label="Send">${ic('arrow-up')}</button>
      </form>`;
  }

  VIEWS.inbox = () => {
    const t = S.threads[0];
    const sarahLast = t.msgs[t.msgs.length - 1];
    if (ui.inbox === 'sarah') ui.staffSeen = t.msgs.length;
    const other = OTHER_THREADS.find((o) => o.id === ui.inbox);
    if (other) other.unread = false;
    return `
      <h1 class="d-h1">Inbox</h1>
      <p class="d-h1-sub">Patient messages, sorted by newest.</p>
      <div class="d-panel inbox">
        <div class="inbox-list">
          <button class="inbox-item ${ui.inbox === 'sarah' ? 'on' : ''}" data-d="inbox:sarah">${sarahNew().length ? '<span class="unread-dot"></span>' : ''}
            <span class="avatar">SM</span><div style="flex:1;min-width:0"><b>Sarah Mitchell<small>${relDay(sarahLast.at)}</small></b><p>${esc(sarahLast.photo ? 'Photo' : sarahLast.text)}</p></div></button>
          ${OTHER_THREADS.map((o) => `
            <button class="inbox-item ${ui.inbox === o.id ? 'on' : ''}" data-d="inbox:${o.id}">${o.unread ? '<span class="unread-dot"></span>' : ''}
              <span class="avatar gray">${initials(o.name)}</span><div style="flex:1;min-width:0"><b>${esc(o.name)}<small>${o.when}</small></b><p>${esc(o.text)}</p></div></button>`).join('')}
        </div>
        <div class="inbox-thread">
          ${ui.inbox === 'sarah' ? `<div class="d-panel-head"><h3>Sarah Mitchell</h3><button class="btn btn-tinted btn-sm" data-d="record:sarah">Open record</button></div>${threadHTML(t)}`
            : `<div class="d-panel-head"><h3>${esc(other.name)}</h3></div><div class="d-thread"><div class="msg-day">${other.when}</div><div class="bubble me">${esc(other.text)}</div></div>
               <div class="empty">In this prototype, replies are wired up for Sarah Mitchell.</div>`}
        </div>
      </div>`;
  };

  VIEWS.lab = () => {
    const s = S.specs[0];
    const rows = [
      ['James Whitaker', 'Custom abutment #19', 'A2', 'Precision Smile Lab', -9, 1, ['Due tomorrow', 'orange']],
      ['Emily Novak', 'Zirconia crown #9', 'BL3', 'Precision Smile Lab', -11, 3, ['In production', '']],
      ['Maria Gonzalez', 'Zirconia crown #13', 'A1', 'Precision Smile Lab', -4, 6, ['In production', '']],
      ['Sarah Mitchell', 'Zirconia crown #19', s.shade, 'Precision Smile Lab', null, null, [s.status, 'gray']],
      ['Kevin Brooks', 'Zirconia crown #18', 'A2', 'Precision Smile Lab', -16, -1, ['Seated', 'green']],
    ];
    const d = (n) => (n == null ? '—' : fShort(new Date(TODAY.getTime() + n * 864e5)));
    return `
      <h1 class="d-h1">Lab cases</h1>
      <p class="d-h1-sub">Track what's at the lab so nobody gets booked before their crown is back.</p>
      <div class="d-panel"><table class="table">
        <thead><tr><th>Patient</th><th>Item</th><th>Shade</th><th>Lab</th><th>Sent</th><th>Due</th><th>Status</th></tr></thead>
        <tbody>${rows.map(([n, item, sh, lab, sent, due, st]) => `
          <tr data-d="${n === 'Sarah Mitchell' ? 'record:sarah' : 'toast:Opening ' + esc(n)}"><td><span class="t-name"><span class="avatar ${n === 'Sarah Mitchell' ? '' : 'gray'}">${initials(n)}</span>${esc(n)}</span></td>
            <td>${esc(item)}</td><td><span style="display:inline-flex;align-items:center;gap:8px"><span class="shade-dot" style="width:16px;height:20px;border-radius:5px 5px 7px 7px;background:${shade(sh).hex}"></span>${sh}</span></td>
            <td>${esc(lab)}</td><td>${d(sent)}</td><td>${d(due)}</td><td><span class="pill ${st[1]}">${esc(st[0])}</span></td></tr>`).join('')}
        </tbody></table></div>`;
  };

  VIEWS.patients = () => {
    const next = (c) => {
      if (c.id === 'sarah') { const a = S.appts.filter((x) => !x.past).sort((a, b) => a.date - b.date)[0]; return a ? fShort(a.date) : '—'; }
      return fShort(new Date(TODAY.getTime() + ((c.name.length * 7) % 40 + 1) * 864e5));
    };
    return `
      <h1 class="d-h1">Patients</h1>
      <p class="d-h1-sub">${CASES.length} patients with active treatment</p>
      <div class="d-panel"><table class="table">
        <thead><tr><th>Name</th><th>Treatment</th><th>Step</th><th>Next visit</th><th>Portal</th></tr></thead>
        <tbody>${CASES.map((c) => {
          const ph = c.id === 'sarah' ? S.phase : c.phase;
          return `<tr data-d="record:${c.id}"><td><span class="t-name"><span class="avatar ${c.id === 'sarah' ? '' : 'gray'}">${initials(c.name)}</span>${esc(c.name)}</span></td>
            <td>${esc(c.proc)}</td><td>${esc(PHASE_SHORT[ph])}</td><td>${next(c)}</td>
            <td>${c.id === 'sarah' || c.name.length % 3 ? '<span class="pill green">Active</span>' : '<span class="pill gray">Invited</span>'}</td></tr>`;
        }).join('')}</tbody></table></div>`;
  };

  /* ---------- actions ---------- */
  let toastT;
  function toast(text, withView) {
    const t = $('#dToast');
    t.innerHTML = `${ic('circle-check')}<span>${esc(text)}</span>${withView ? '<button data-d="mode:patient">View as Sarah</button>' : ''}`;
    A.paint();
    t.classList.add('show'); clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 4200);
  }
  const queue = (n) => S.pendingPush.push(n);

  function sendReply(text) {
    text = text.trim(); if (!text) return;
    const t = S.threads[0];
    t.msgs.push({ from: 'them', who: 'Dr. Duraini', text, at: TODAY, time: nowTime() });
    t.unread++;
    ui.staffSeen = t.msgs.length;
    queue({ title: 'Dr. Duraini', body: text, go: () => A.goTo('messages', 'thread', { arg: 'care' }) });
    render(); toast('Sent. Sarah gets a notification on her phone.', true);
  }

  const ACT = {
    view(v) { ui.view = v; render(); },
    record(id) {
      if (id !== 'sarah') { toast('In this prototype, open Sarah Mitchell to see a full record.'); return; }
      ui.view = 'record'; render(); $('.d-main', dash).scrollTop = 0;
    },
    inbox(id) { ui.view = 'inbox'; ui.inbox = id; render(); },
    toast(text) { toast(text); },
    mode(m) { A.setMode(m); },
    phase(i) {
      i = +i; if (i === S.phase) return;
      S.phase = i;
      queue({ title: 'Your Smile Journey', body: `You're now on step ${i + 1}: ${S.phases[i].title}.`, go: () => A.goTo('home', 'journey') });
      render(); toast(`Moved to "${S.phases[i].title}". Sarah's timeline updated.`, true);
    },
    shade(id, code) {
      const s = S.specs.find((x) => x.id === id); if (s.shade === code) return;
      s.shade = code;
      queue({ title: 'Smile Specs updated', body: `${s.name} shade set to ${code} (${shade(code).note.toLowerCase()}).`, go: () => A.goTo('smile') });
      render(); toast(`${s.name} shade set to ${code}.`, true);
    },
    quick(text) { const inp = $('#dReply'); inp.value = text; inp.focus(); },
    approve(id) {
      const r = S.rescheduled[id]; const a = S.appts.find((x) => x.id === id);
      a.date = r.date; a.time = r.time; delete S.rescheduled[id];
      queue({ title: 'Appointment confirmed', body: `${a.title} moved to ${r.label}. See you then!`, go: () => A.goTo('schedule') });
      render(); toast('Approved. Sarah has been notified.', true);
    },
  };

  dash.addEventListener('click', (e) => {
    const el = e.target.closest('[data-d]'); if (!el) return;
    const [name, ...args] = el.dataset.d.split(':');
    ACT[name]?.(...(name === 'quick' || name === 'toast' ? [args.join(':')] : args));
  });
  dash.addEventListener('change', (e) => {
    const el = e.target.closest('[data-d-change]'); if (!el) return;
    const [field, id] = el.dataset.dChange.split(':');
    const s = S.specs.find((x) => x.id === id); s[field] = el.value;
    queue({ title: 'Smile Specs updated', body: `${s.name}: ${field} is now ${el.value}.`, go: () => A.goTo('smile') });
    render(); toast(`${s.name} ${field} updated.`, true);
  });
  dash.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-d-submit]'); if (!f) return;
    e.preventDefault(); sendReply($('#dReply').value);
  });

  window.DASH = {
    render,
    refresh() { if (document.body.dataset.mode === 'practice') render(); },
    onPatientMessage() { if (document.body.dataset.mode === 'practice') render(); },
    onReschedule() { if (document.body.dataset.mode === 'practice') render(); },
  };
})();
