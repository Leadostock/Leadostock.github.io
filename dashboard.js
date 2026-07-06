/* ===================================================================
   ЛИДОСТОК — Панель управления (демо-логика на моковых данных)
   Данные ниже вымышленные. Когда подключим бэкенд, эти массивы заменит
   реальный fetch к API (/api/conversations, /api/channels, /api/analytics).
   =================================================================== */

// ---------- Сессия / доступ ----------
function getSession() {
  try { return JSON.parse(localStorage.getItem("lidostok_session")); }
  catch { return null; }
}
const SESSION = getSession();
if (!SESSION) { window.location.href = "login.html"; }
const IS_ADMIN = SESSION && SESSION.role === "admin";

function logout() {
  localStorage.removeItem("lidostok_session");
  window.location.href = "login.html";
}

// ---------- Моковые данные ----------
// Система ТОЛЬКО принимает сообщения — исходящих ответов нет (все messages: dir "in").
const DATA = {
  business: {
    company: "ООО «СтройМастер»",
    plan: "Бизнес",
    kpi: { leads: 128, conversion: "18%", avgReply: "4 мин", revenue: "₽1,84 млн" },
    channels: [
      { type: "telegram", title: "Бот заявок", status: "active", leads: 61 },
      { type: "email", title: "sales@stroymaster.ru", status: "active", leads: 44 },
      { type: "vk", title: "Сообщество ВК", status: "error", leads: 23 },
    ],
    conversations: [
      { id: 1, name: "Иван Иванович", channel: "telegram", time: "2 мин", status: "new",
        preview: "Хочу записаться на консультацию в пятницу",
        lead: { who: "Иван Иванович", source: "Telegram-бот · реклама «Скидка 20%»", want: "Записаться на консультацию в эту пятницу", contact: "+7 999 123-45-67 · @ivan_ivanovich" },
        messages: [
          { dir: "in", text: "Здравствуйте! Увидел рекламу про скидку 20%", time: "10:02" },
          { dir: "in", text: "Хочу записаться на консультацию в эту пятницу", time: "10:02" },
        ] },
      { id: 2, name: "Мария Смирнова", channel: "email", time: "18 мин", status: "progress",
        preview: "Тема: Запрос коммерческого предложения",
        lead: { who: "Мария Смирнова", source: "Email · тема «Запрос КП»", want: "Коммерческое предложение на остекление балкона", contact: "maria@company.ru" },
        messages: [
          { dir: "in", text: "Добрый день! Пришлите, пожалуйста, КП на остекление балкона 6 м.", time: "09:46" },
        ] },
      { id: 3, name: "VK id20481", channel: "vk", time: "1 ч", status: "new",
        preview: "Сколько стоит выезд замерщика?",
        lead: { who: "Дмитрий (VK)", source: "VK · сообщество", want: "Уточнить стоимость выезда замерщика", contact: "vk.com/id20481" },
        messages: [ { dir: "in", text: "Сколько стоит выезд замерщика на район?", time: "09:10" } ] },
      { id: 4, name: "Анна Кузнецова", channel: "telegram", time: "3 ч", status: "done",
        preview: "Нужны подоконники, 3 шт",
        lead: { who: "Анна Кузнецова", source: "Telegram-бот", want: "Заказ подоконников (3 шт)", contact: "@anna_k" },
        messages: [ { dir: "in", text: "Нужны подоконники, 3 шт", time: "08:20" } ] },
    ],
    leadsBySource: [
      { label: "Telegram", value: 61 },
      { label: "Email", value: 44 },
      { label: "ВКонтакте", value: 23 },
    ],
    leadsByManager: [
      { label: "Алексей П.", value: 52 },
      { label: "Ольга С.", value: 41 },
      { label: "Игорь В.", value: 35 },
    ],
    funnel: [
      { label: "Заявка", value: "100%" },
      { label: "Контакт", value: "62%" },
      { label: "Встреча", value: "38%" },
      { label: "Сделка", value: "18%" },
    ],
    // Накопительная динамика лидов по месяцам (Янв..Дек). На графике покажем только до текущего месяца.
    monthly: [8, 14, 22, 31, 44, 52, 61, 74, 88, 101, 116, 128],
  },
  // Данные для админ-панели (все клиенты системы). Админ может их редактировать.
  clients: [
    { company: "ООО «СтройМастер»", plan: "Бизнес", channels: 3, leads: 128, managers: 3, status: "active", joined: "2025-11-02", email: "info@stroymaster.ru" },
    { company: "Агентство «Медиалайн»", plan: "Премиум", channels: 5, leads: 402, managers: 8, status: "active", joined: "2025-09-14", email: "hello@medialine.ru" },
    { company: "ИП Соколов А.В.", plan: "Бесплатный", channels: 2, leads: 51, managers: 1, status: "active", joined: "2026-01-20", email: "sokolov@mail.ru" },
    { company: "ООО «ТехноПрогресс»", plan: "Корпоративный", channels: 7, leads: 1120, managers: 22, status: "active", joined: "2025-06-03", email: "sales@technoprogress.ru" },
    { company: "Студия «Дизайн77»", plan: "Бизнес", channels: 3, leads: 88, managers: 2, status: "active", joined: "2025-12-11", email: "studio@design77.ru" },
    { company: "ООО «АвтоЛидер»", plan: "Бесплатный", channels: 2, leads: 60, managers: 1, status: "trial", joined: "2026-02-01", email: "avto@leader.ru" },
    { company: "Клиника «Здоровье+»", plan: "Премиум", channels: 4, leads: 265, managers: 6, status: "active", joined: "2025-10-08", email: "info@zdorovie.ru" },
    { company: "ООО «ЛогистикПро»", plan: "Бизнес", channels: 3, leads: 143, managers: 4, status: "suspended", joined: "2025-08-22", email: "op@logisticpro.ru" },
  ],
};

const PLAN_OPTIONS = ["Бесплатный", "Бизнес", "Премиум", "Корпоративный"];
const STATUS_OPTIONS = [["active", "Активен"], ["trial", "Пробный"], ["suspended", "Приостановлен"]];

// Сводка для админа считается из списка клиентов (пересчитывается после правок)
function recomputeAdminKpi() {
  const c = DATA.clients;
  DATA.adminKpi = {
    clients: c.length,
    active: c.filter((x) => x.status === "active").length,
    leads: c.reduce((s, x) => s + Number(x.leads || 0), 0),
    channels: c.reduce((s, x) => s + Number(x.channels || 0), 0),
  };
}
recomputeAdminKpi();

// ---------- Иконки ----------
const IC = {
  overview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
  leads: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  channels: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49M20.07 3.93a10 10 0 0 1 0 16.14M3.93 20.07a10 10 0 0 1 0-16.14"/></svg>',
  analytics: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/></svg>',
  clients: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  who: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  source: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  want: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  contact: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>',
};

const CH_META = {
  telegram: { label: "Telegram", tag: "tag-tg", logo: "ch-tg", letter: "T" },
  email: { label: "Email", tag: "tag-email", logo: "ch-email", letter: "@" },
  vk: { label: "ВКонтакте", tag: "tag-vk", logo: "ch-vk", letter: "VK" },
  whatsapp: { label: "WhatsApp", tag: "tag-wa", logo: "ch-wa", letter: "W" },
};

// ---------- Меню (зависит от роли) ----------
// Админ НЕ видит Инбокс и Лиды — это рабочие инструменты клиента, не администратора.
function buildMenu() {
  if (IS_ADMIN) {
    return [
      { id: "overview", label: "Обзор", icon: IC.overview },
      { id: "clients", label: "Клиенты", icon: IC.clients, badge: DATA.clients.length, amber: true },
      { id: "channels", label: "Каналы", icon: IC.channels },
      { id: "analytics", label: "Аналитика", icon: IC.analytics },
      { id: "settings", label: "Настройки", icon: IC.settings },
    ];
  }
  return [
    { id: "overview", label: "Обзор", icon: IC.overview },
    { id: "inbox", label: "Инбокс", icon: IC.inbox, badge: 2 },
    { id: "leads", label: "Лиды", icon: IC.leads },
    { id: "channels", label: "Каналы", icon: IC.channels },
    { id: "analytics", label: "Аналитика", icon: IC.analytics },
    { id: "settings", label: "Настройки", icon: IC.settings },
  ];
}

// ---------- Утилиты рендера ----------
function planPill() {
  if (IS_ADMIN) return `<span class="plan-pill admin">${IC.lock}Администратор системы</span>`;
  return `<span class="plan-pill">Тариф «${DATA.business.plan}»</span>`;
}
function liveBadge() {
  return `<span class="live-badge"><span class="live-dot"></span>Онлайн · <span id="liveClock"></span></span>`;
}
function barChart(items, max) {
  const m = max || Math.max(...items.map((i) => i.value));
  return items.map((i) => `
    <div class="bar-row">
      <div class="bar-label">${i.label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round((i.value / m) * 100)}%"></div></div>
      <div class="bar-value">${i.value}</div>
    </div>`).join("");
}
// График строится ТОЛЬКО до текущего месяца (реальное время), а не до декабря.
function lineChart(fullSeries) {
  const monthsAll = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];
  const upto = new Date().getMonth(); // 0-based: июль = 6
  const series = fullSeries.slice(0, upto + 1);
  const monthLabels = monthsAll.slice(0, upto + 1);
  const w = 640, h = 200, pad = 24;
  const max = Math.max(...series, 1);
  const step = series.length > 1 ? (w - pad * 2) / (series.length - 1) : 0;
  const pts = series.map((v, i) => [pad + i * step, h - pad - (v / max) * (h - pad * 2)]);
  const path = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = path + ` L ${pts[pts.length - 1][0].toFixed(1)} ${h - pad} L ${pad} ${h - pad} Z`;
  const labels = pts.map((p, i) => `<text x="${p[0]}" y="${h - 6}" fill="#64748B" font-size="10" text-anchor="middle">${monthLabels[i]}</text>`).join("");
  return `<div class="chart-wrap"><svg viewBox="0 0 ${w} ${h}">
    <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2196F3" stop-opacity="0.35"/><stop offset="100%" stop-color="#2196F3" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${area}" fill="url(#lg)"/>
    <path d="${path}" fill="none" stroke="#42A5F5" stroke-width="2.5" stroke-linejoin="round"/>
    ${pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="#0B1220" stroke="#42A5F5" stroke-width="2"/>`).join("")}
    ${labels}
  </svg></div>`;
}
function statusTag(s) {
  const map = { new: ["st-new", "Новый"], progress: ["st-progress", "В работе"], done: ["st-done", "Завершён"] };
  const [cls, label] = map[s] || map.new;
  return `<span class="tag ${cls}">${label}</span>`;
}
function planTag(p) {
  const color = p === "Корпоративный" ? "st-new" : p === "Премиум" ? "st-progress" : p === "Бизнес" ? "tag-tg" : "st-done";
  return `<span class="tag ${color}">${p}</span>`;
}
function esc(s) { return String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

// ---------- Представление: Обзор ----------
function viewOverview() {
  const b = DATA.business;
  const kpis = IS_ADMIN
    ? [
        ["Компаний в системе", DATA.adminKpi.clients, "+3 за месяц", "up"],
        ["Активных клиентов", DATA.adminKpi.active, "стабильно", "up"],
        ["Всего лидов", DATA.adminKpi.leads.toLocaleString("ru-RU"), "+12,4%", "up"],
        ["Подключённых каналов", DATA.adminKpi.channels, "+7 за месяц", "up"],
      ]
    : [
        ["Новые лиды", b.kpi.leads, "+12 за неделю", "up"],
        ["Конверсия", b.kpi.conversion, "+2,1%", "up"],
        ["Среднее время ответа", b.kpi.avgReply, "−1 мин", "up"],
        ["Выручка за месяц", b.kpi.revenue, "+8,3%", "up"],
      ];
  const kpiHtml = kpis.map((k) => `
    <div class="kpi-card">
      <div class="kpi-label"><span class="kpi-icon">${IC.leads}</span>${k[0]}</div>
      <div class="kpi-value">${k[1]}</div>
      <div class="kpi-delta ${k[3]}">${k[2]}</div>
    </div>`).join("");

  const recent = IS_ADMIN ? adminRecentRows() : businessRecentRows();

  return `
    <div class="kpi-grid">${kpiHtml}</div>
    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><div class="panel-title">Динамика лидов<span>по ${new Date().getFullYear()} год</span></div>${liveBadge()}</div>
        ${lineChart(b.monthly)}
      </div>
      <div class="panel">
        <div class="panel-head"><div class="panel-title">Лиды по источникам</div></div>
        ${barChart(b.leadsBySource)}
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><div class="panel-title">${IS_ADMIN ? "Недавно подключённые клиенты" : "Последние лиды"}</div>
        <button class="btn-d btn-d-ghost btn-d-sm" onclick="switchView('${IS_ADMIN ? "clients" : "leads"}')">Смотреть все</button></div>
      <table class="table"><tbody>${recent}</tbody></table>
    </div>`;
}
function businessRecentRows() {
  return DATA.business.conversations.map((c) => {
    const m = CH_META[c.channel];
    return `<tr onclick="openLead(${c.id})" style="cursor:pointer">
      <td class="cell-strong">${esc(c.lead.who)}</td>
      <td><span class="tag ${m.tag}">${m.label}</span></td>
      <td class="cell-muted">${esc(c.lead.want)}</td>
      <td>${statusTag(c.status)}</td>
      <td class="cell-muted">${c.time} назад</td>
    </tr>`;
  }).join("");
}
function adminRecentRows() {
  return DATA.clients.slice(0, 5).map((c, i) => `
    <tr onclick="openClientEditor(${DATA.clients.indexOf(c)})" style="cursor:pointer">
      <td class="cell-strong">${esc(c.company)}</td>
      <td>${planTag(c.plan)}</td>
      <td class="cell-muted">${c.channels} каналов</td>
      <td class="cell-muted">${Number(c.leads).toLocaleString("ru-RU")} лидов</td>
      <td class="cell-muted">${c.joined}</td></tr>`).join("");
}

// ---------- Представление: Инбокс (только приём, без ответов) ----------
function viewInbox() {
  const convs = DATA.business.conversations;
  return `<div class="inbox">
    <div class="inbox-col">
      <div class="inbox-col-head">Диалоги <span class="nav-badge">${convs.length}</span></div>
      <div class="conv-list" id="convList">${convListHtml()}</div>
    </div>
    <div class="inbox-col thread" id="threadCol">
      <div class="thread-body" id="threadBody" style="align-items:center;justify-content:center;color:var(--d-text-muted)">
        Выберите диалог слева
      </div>
    </div>
    <div class="inbox-col">
      <div class="inbox-col-head">Карточка лида</div>
      <div class="lead-card-pane" id="leadPane">
        <div style="color:var(--d-text-muted);font-size:14px">Здесь появится структурированная заявка</div>
      </div>
    </div>
  </div>`;
}
function convListHtml() {
  return DATA.business.conversations.map((c) => {
    const m = CH_META[c.channel];
    return `<div class="conv-item" id="conv-${c.id}" onclick="selectConv(${c.id})">
      <div class="conv-top">
        <span class="conv-name">${esc(c.name)}</span>
        <span class="tag ${m.tag}">${m.label}</span>
      </div>
      <div class="conv-preview">${esc(c.preview)}</div>
      <div class="conv-meta-row"><span class="conv-time">${c.time} назад</span>${statusTag(c.status)}</div>
    </div>`;
  }).join("");
}
function selectConv(id) {
  const c = DATA.business.conversations.find((x) => x.id === id);
  if (!c) return;
  document.querySelectorAll(".conv-item").forEach((el) => el.classList.remove("active"));
  const item = document.getElementById("conv-" + id);
  if (item) item.classList.add("active");

  const m = CH_META[c.channel];
  const thread = document.getElementById("threadCol");
  // Ответов нет — система только принимает сообщения.
  thread.innerHTML = `
    <div class="thread-head">
      <div class="user-avatar" style="width:34px;height:34px;font-size:13px">${esc(c.name[0])}</div>
      <div><div style="font-weight:600">${esc(c.name)}</div><div style="font-size:12px;color:var(--d-text-muted)"><span class="tag ${m.tag}">${m.label}</span></div></div>
    </div>
    <div class="thread-body">${c.messages.map((msg) => `
      <div class="bubble in">${esc(msg.text)}<span class="bubble-time">${msg.time}</span></div>`).join("")}
    </div>
    <div class="thread-note">${IC.lock} Сейчас система только принимает сообщения. Ответы отправляются менеджером напрямую в канале клиента.</div>`;

  const pane = document.getElementById("leadPane");
  const statusBtns = [["new","Новый"],["progress","В работу"],["done","Завершить"]]
    .map(([s,l]) => `<button class="btn-d btn-d-ghost btn-d-sm ${c.status===s?'is-on':''}" onclick="setConvStatus(${c.id},'${s}')">${l}</button>`).join("");
  pane.innerHTML = `
    ${leadField("who", "Кто", c.lead.who)}
    ${leadField("source", "Откуда заявка", c.lead.source)}
    ${leadField("want", "Чего хочет", c.lead.want)}
    ${leadField("contact", "Контакт", c.lead.contact)}
    <div class="lead-field-label" style="margin-top:6px">Статус</div>
    <div class="status-switch">${statusBtns}</div>
    <button class="btn-d btn-d-primary" style="width:100%;justify-content:center;margin-top:14px" onclick="pushToCrm(${c.id})">${IC.check} Передать в Bitrix24</button>`;
}
function leadField(icon, label, value) {
  return `<div class="lead-field">
    <div class="lead-field-label"><span class="lead-icon">${IC[icon]}</span>${label}</div>
    <div class="lead-field-value">${esc(value)}</div>
  </div>`;
}
function setConvStatus(id, status) {
  const c = DATA.business.conversations.find((x) => x.id === id);
  if (!c) return;
  c.status = status;
  const list = document.getElementById("convList");
  if (list) list.innerHTML = convListHtml();
  const item = document.getElementById("conv-" + id);
  if (item) item.classList.add("active");
  selectConv(id);
  toast("Статус обновлён: " + statusText(status));
}
function statusText(s){ return {new:"Новый",progress:"В работе",done:"Завершён"}[s] || s; }
function pushToCrm(id) {
  const c = DATA.business.conversations.find((x) => x.id === id);
  toast("Лид «" + (c ? c.lead.who : "") + "» отправлен в Bitrix24 ✓");
}
function openLead(id) {
  switchView("inbox");
  setTimeout(() => selectConv(id), 60);
}

// ---------- Представление: Лиды ----------
function viewLeads() {
  return `<div class="panel">
    <div class="panel-head"><div class="panel-title">Все лиды<span>${DATA.business.conversations.length} записей</span></div>
      <button class="btn-d btn-d-ghost btn-d-sm" onclick="exportLeadsCSV()">${IC.download} Экспорт CSV</button></div>
    <table class="table" id="leadsTable">
      <thead><tr><th>Кто</th><th>Канал</th><th>Источник</th><th>Запрос</th><th>Статус</th><th>Контакт</th></tr></thead>
      <tbody>${leadsRows()}</tbody>
    </table>
  </div>`;
}
function leadsRows() {
  return DATA.business.conversations.map((c) => {
    const m = CH_META[c.channel];
    return `<tr onclick="openLead(${c.id})" style="cursor:pointer">
      <td class="cell-strong">${esc(c.lead.who)}</td>
      <td><span class="tag ${m.tag}">${m.label}</span></td>
      <td class="cell-muted">${esc(c.lead.source)}</td>
      <td class="cell-muted">${esc(c.lead.want)}</td>
      <td>${statusTag(c.status)}</td>
      <td class="cell-muted">${esc(c.lead.contact)}</td>
    </tr>`;
  }).join("");
}
function exportLeadsCSV() {
  const rows = [["Кто","Канал","Источник","Запрос","Статус","Контакт"]];
  DATA.business.conversations.forEach((c) => {
    rows.push([c.lead.who, CH_META[c.channel].label, c.lead.source, c.lead.want, statusText(c.status), c.lead.contact]);
  });
  const csv = rows.map((r) => r.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "leads_lidostok.csv";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast("Файл leads_lidostok.csv выгружен");
}

// ---------- Представление: Каналы ----------
function viewChannels() {
  const planLimit = IS_ADMIN ? "∞" : "3";
  const cards = DATA.business.channels.map((ch, i) => {
    const m = CH_META[ch.type];
    const st = ch.status === "active" ? ["st-active", "Активен"] : ch.status === "error" ? ["st-error", "Ошибка подключения"] : ["st-pending", "Ожидает"];
    return `<div class="channel-card">
      <div class="channel-card-head">
        <div class="channel-logo ${m.logo}">${m.letter}</div>
        <div><div style="font-weight:600">${m.label}</div><div style="font-size:13px;color:var(--d-text-2)">${esc(ch.title)}</div></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:13px" class="${st[0]}">● ${st[1]}</span>
        <span style="font-size:13px;color:var(--d-text-2)">${ch.leads} лидов</span>
      </div>
      <button class="btn-d btn-d-ghost btn-d-sm" style="justify-content:center" onclick="openChannelConfig(${i})">${IC.edit} Настроить</button>
    </div>`;
  }).join("");
  const addCard = `<div class="channel-card ch-add" onclick="openAddChannel()">
    <div style="font-size:32px;line-height:1">+</div>
    <div style="font-weight:600">Подключить канал</div>
    <div style="font-size:12px">WhatsApp, Instagram и другие</div>
  </div>`;
  return `<div class="panel" style="margin-bottom:16px">
      <div class="panel-head"><div class="panel-title">Каналы<span>использовано ${DATA.business.channels.length} из ${planLimit} по тарифу</span></div>
        <button class="btn-d btn-d-primary btn-d-sm" onclick="openAddChannel()">${IC.plus} Подключить</button></div>
      <p style="color:var(--d-text-2);font-size:14px;margin:0">Все входящие сообщения из подключённых каналов попадают в общий инбокс. Подключение помогаем настроить «под ключ».</p>
    </div>
    <div class="channel-grid">${cards}${addCard}</div>`;
}
function openChannelConfig(i) {
  const ch = DATA.business.channels[i];
  const m = CH_META[ch.type];
  openModal(`Настройка канала · ${m.label}`, `
    ${field("Название", `<input class="inp" id="chTitle" value="${esc(ch.title)}">`)}
    ${field("Статус", selectHtml("chStatus", [["active","Активен"],["error","Ошибка"],["pending","Ожидает"],["disabled","Отключён"]], ch.status))}
    <p class="modal-hint">В демо-режиме изменения сохраняются локально. После подключения бэкенда здесь будут реальные данные канала.</p>
  `, `
    <button class="btn-d btn-d-ghost" onclick="closeModal()">Отмена</button>
    <button class="btn-d btn-d-primary" onclick="saveChannelConfig(${i})">${IC.check} Сохранить</button>
  `);
}
function saveChannelConfig(i) {
  const ch = DATA.business.channels[i];
  ch.title = document.getElementById("chTitle").value.trim() || ch.title;
  ch.status = document.getElementById("chStatus").value;
  closeModal();
  switchView("channels");
  toast("Канал обновлён");
}
function openAddChannel() {
  if (!IS_ADMIN && DATA.business.channels.length >= 3) {
    openModal("Лимит каналов", `
      <p class="modal-hint">На тарифе «Бизнес» доступно до 3 каналов. Чтобы подключить больше, перейдите на «Премиум» или «Корпоративный».</p>`, `
      <button class="btn-d btn-d-ghost" onclick="closeModal()">Закрыть</button>
      <button class="btn-d btn-d-primary" onclick="closeModal(); switchView('settings')">Сменить тариф</button>`);
    return;
  }
  openModal("Подключить канал", `
    ${field("Тип канала", selectHtml("newChType", [["telegram","Telegram"],["email","Email"],["vk","ВКонтакте"],["whatsapp","WhatsApp"]], "telegram"))}
    ${field("Название", `<input class="inp" id="newChTitle" placeholder="Например: Бот заявок">`)}
    <p class="modal-hint">Мы поможем настроить канал «под ключ» — вам не нужно разбираться с API.</p>
  `, `
    <button class="btn-d btn-d-ghost" onclick="closeModal()">Отмена</button>
    <button class="btn-d btn-d-primary" onclick="saveNewChannel()">${IC.plus} Добавить</button>
  `);
}
function saveNewChannel() {
  const type = document.getElementById("newChType").value;
  const title = document.getElementById("newChTitle").value.trim() || CH_META[type].label;
  DATA.business.channels.push({ type, title, status: "pending", leads: 0 });
  closeModal();
  switchView("channels");
  toast("Канал добавлен и ожидает настройки");
}

// ---------- Представление: Аналитика (в реальном времени) ----------
function viewAnalytics() {
  const hasAnalytics = IS_ADMIN; // демо: у Бизнеса аналитика закрыта
  if (!hasAnalytics) {
    return `<div class="locked">
      <div class="locked-icon">${IC.lock}</div>
      <h3>Аналитика доступна на тарифе «Премиум»</h3>
      <p>Расширенные дашборды, воронка продаж и контроль менеджеров открываются на тарифе Премиум и выше.</p>
      <button class="btn-d btn-d-primary" onclick="switchView('settings')">Обновить тариф</button>
    </div>`;
  }
  const b = DATA.business;
  return `
  <div class="panel" style="margin-bottom:16px">
    <div class="panel-head"><div class="panel-title">Динамика лидов<span>обновляется в реальном времени</span></div>${liveBadge()}</div>
    ${lineChart(b.monthly)}
  </div>
  <div class="grid-2">
    <div class="panel"><div class="panel-head"><div class="panel-title">Лиды по источникам</div></div>${barChart(b.leadsBySource)}</div>
    <div class="panel"><div class="panel-head"><div class="panel-title">Нагрузка на менеджеров</div></div>${barChart(b.leadsByManager)}</div>
  </div>
  <div class="panel"><div class="panel-head"><div class="panel-title">Воронка продаж</div></div>
    <div class="funnel">${b.funnel.map((f, i) => `<div class="funnel-step" style="width:${100 - i * 20}%"><span>${f.label}</span><small>${f.value}</small></div>`).join("")}</div>
  </div>`;
}

// ---------- Представление: Клиенты (только админ) ----------
function viewClients() {
  return `
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Всего компаний</div><div class="kpi-value">${DATA.adminKpi.clients}</div></div>
      <div class="kpi-card"><div class="kpi-label">Активных</div><div class="kpi-value">${DATA.adminKpi.active}</div></div>
      <div class="kpi-card"><div class="kpi-label">Лидов всего</div><div class="kpi-value">${DATA.adminKpi.leads.toLocaleString("ru-RU")}</div></div>
      <div class="kpi-card"><div class="kpi-label">Каналов подключено</div><div class="kpi-value">${DATA.adminKpi.channels}</div></div>
    </div>
    <div class="panel">
      <div class="panel-head">
        <div class="panel-title">Все клиенты системы<span>только для администратора</span></div>
        <div class="panel-head-actions">
          <div class="search-box" style="width:220px"><input placeholder="Поиск компании..." oninput="filterClients(this.value)"></div>
          <button class="btn-d btn-d-primary btn-d-sm" onclick="openClientEditor(-1)">${IC.plus} Добавить</button>
        </div>
      </div>
      <div class="table-scroll">
        <table class="table" id="clientsTable">
          <thead><tr><th>Компания</th><th>Тариф</th><th>Каналы</th><th>Лиды</th><th>Менеджеры</th><th>Статус</th><th>С нами с</th><th></th></tr></thead>
          <tbody>${clientRows()}</tbody>
        </table>
      </div>
    </div>`;
}
function clientRows() {
  return DATA.clients.map((c, i) => {
    const st = c.status === "active" ? ["st-active", "Активен"] : c.status === "trial" ? ["st-pending", "Пробный"] : ["st-error", "Приостановлен"];
    return `<tr>
      <td class="cell-strong">${esc(c.company)}</td>
      <td>${planTag(c.plan)}</td>
      <td class="cell-muted">${c.channels}</td>
      <td class="cell-muted">${Number(c.leads).toLocaleString("ru-RU")}</td>
      <td class="cell-muted">${c.managers}</td>
      <td><span class="${st[0]}" style="font-size:13px">● ${st[1]}</span></td>
      <td class="cell-muted">${c.joined}</td>
      <td><button class="btn-d btn-d-ghost btn-d-sm" onclick="openClientEditor(${i})">${IC.edit} Изменить</button></td>
    </tr>`;
  }).join("");
}
function filterClients(q) {
  q = (q || "").toLowerCase();
  document.querySelectorAll("#clientsTable tbody tr").forEach((tr) => {
    tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none";
  });
}
// Редактор аккаунта клиента (i === -1 → создание новой компании)
function openClientEditor(i) {
  const isNew = i < 0;
  const c = isNew
    ? { company: "", plan: "Бесплатный", channels: 2, leads: 0, managers: 1, status: "trial", joined: new Date().toISOString().slice(0,10), email: "" }
    : DATA.clients[i];
  openModal(isNew ? "Новая компания" : "Аккаунт клиента", `
    ${field("Название компании", `<input class="inp" id="clCompany" value="${esc(c.company)}" placeholder="ООО «Компания»">`)}
    ${field("Email для связи", `<input class="inp" id="clEmail" value="${esc(c.email || "")}" placeholder="info@company.ru">`)}
    <div class="form-2col">
      ${field("Тариф", selectHtml("clPlan", PLAN_OPTIONS.map((p) => [p, p]), c.plan))}
      ${field("Статус", selectHtml("clStatus", STATUS_OPTIONS, c.status))}
    </div>
    <div class="form-2col">
      ${field("Каналов", `<input class="inp" id="clChannels" type="number" min="0" value="${c.channels}">`)}
      ${field("Менеджеров", `<input class="inp" id="clManagers" type="number" min="0" value="${c.managers}">`)}
    </div>
    ${field("Лидов всего", `<input class="inp" id="clLeads" type="number" min="0" value="${c.leads}">`)}
  `, `
    ${isNew ? "" : `<button class="btn-d btn-d-danger" onclick="deleteClient(${i})">Удалить</button>`}
    <div style="flex:1"></div>
    <button class="btn-d btn-d-ghost" onclick="closeModal()">Отмена</button>
    <button class="btn-d btn-d-primary" onclick="saveClient(${i})">${IC.check} Сохранить</button>
  `);
}
function saveClient(i) {
  const data = {
    company: document.getElementById("clCompany").value.trim(),
    email: document.getElementById("clEmail").value.trim(),
    plan: document.getElementById("clPlan").value,
    status: document.getElementById("clStatus").value,
    channels: Math.max(0, parseInt(document.getElementById("clChannels").value) || 0),
    managers: Math.max(0, parseInt(document.getElementById("clManagers").value) || 0),
    leads: Math.max(0, parseInt(document.getElementById("clLeads").value) || 0),
  };
  if (!data.company) { toast("Укажите название компании"); return; }
  if (i < 0) {
    DATA.clients.push({ ...data, joined: new Date().toISOString().slice(0, 10) });
    toast("Компания добавлена");
  } else {
    Object.assign(DATA.clients[i], data);
    toast("Аккаунт клиента обновлён");
  }
  recomputeAdminKpi();
  closeModal();
  switchView("clients");
}
function deleteClient(i) {
  const name = DATA.clients[i]?.company || "";
  DATA.clients.splice(i, 1);
  recomputeAdminKpi();
  closeModal();
  switchView("clients");
  toast("Компания удалена: " + name);
}

// ---------- Представление: Настройки ----------
function viewSettings() {
  if (IS_ADMIN) return adminSettings();
  return businessSettings();
}
function adminSettings() {
  const s = getSettings();
  return `<div class="grid-2">
    <div class="panel">
      <div class="panel-head"><div class="panel-title">Системные настройки</div></div>
      ${field("Email поддержки", `<input class="inp" id="setSupport" value="${esc(s.support)}">`)}
      ${field("Тариф по умолчанию для новых клиентов", selectHtml("setDefaultPlan", PLAN_OPTIONS.map((p) => [p, p]), s.defaultPlan))}
      ${toggleHtml("setAutoAssign", "Автораспределение лидов по менеджерам", s.autoAssign)}
      ${toggleHtml("setNotify", "Уведомлять менеджеров в Telegram о новых лидах", s.notify)}
      <button class="btn-d btn-d-primary" style="margin-top:14px" onclick="saveAdminSettings()">${IC.check} Сохранить настройки</button>
    </div>
    <div class="panel">
      <div class="panel-head"><div class="panel-title">Управление клиентами</div></div>
      <p style="color:var(--d-text-2);font-size:14px;margin-top:0">Редактируйте аккаунты, тарифы и статусы клиентов на вкладке «Клиенты».</p>
      <div class="lead-field"><div class="lead-field-label">Компаний в системе</div><div class="lead-field-value">${DATA.adminKpi.clients}</div></div>
      <div class="lead-field"><div class="lead-field-label">Активных</div><div class="lead-field-value">${DATA.adminKpi.active}</div></div>
      <button class="btn-d btn-d-ghost" onclick="switchView('clients')">${IC.clients} Перейти к клиентам</button>
      <button class="btn-d btn-d-primary" style="margin-top:10px" onclick="openClientEditor(-1)">${IC.plus} Добавить компанию</button>
    </div>
  </div>`;
}
function businessSettings() {
  return `<div class="grid-2">
    <div class="panel">
      <div class="panel-head"><div class="panel-title">Профиль</div></div>
      ${field("Аккаунт", `<input class="inp" value="${esc(SESSION.name)}" disabled>`)}
      ${field("Организация", `<input class="inp" id="bizCompany" value="${esc(DATA.business.company)}">`)}
      <button class="btn-d btn-d-primary" style="margin-top:10px" onclick="saveBusinessProfile()">${IC.check} Сохранить</button>
    </div>
    <div class="panel">
      <div class="panel-head"><div class="panel-title">Тариф и лимиты</div></div>
      <div class="lead-field"><div class="lead-field-label">Текущий тариф</div><div class="lead-field-value">«${DATA.business.plan}»</div></div>
      <div class="lead-field"><div class="lead-field-label">Лиды в месяц</div><div class="lead-field-value">Без ограничений</div></div>
      <div class="lead-field"><div class="lead-field-label">Каналы</div><div class="lead-field-value">До 3 каналов</div></div>
      <div class="lead-field"><div class="lead-field-label">Аналитика</div><div class="lead-field-value" style="color:var(--d-amber)">Доступна на «Премиум»</div></div>
      <button class="btn-d btn-d-primary" style="width:100%;justify-content:center;margin-top:8px" onclick="openPlanUpgrade()">Улучшить тариф</button>
    </div>
  </div>`;
}
function saveBusinessProfile() {
  const v = document.getElementById("bizCompany").value.trim();
  if (v) { DATA.business.company = v; document.querySelector(".user-meta span").textContent = v; }
  toast("Профиль сохранён");
}
// Тарифы для оформления. Цены — демонстрационные, настраиваются на бэкенде.
const PLAN_INFO = {
  "Бизнес":        { price: "1 990 ₽ / мес", features: ["Все каналы", "Лиды без ограничений", "Единый инбокс"] },
  "Премиум":       { price: "3 990 ₽ / мес", features: ["Всё из «Бизнес»", "Аналитика и воронка продаж", "Контроль менеджеров"] },
  "Корпоративный": { price: "по договору",   features: ["Всё из «Премиум»", "Настройка «под ключ»", "Приоритетная поддержка", "Подключение всех аккаунтов"] },
};
function openPlanUpgrade() {
  const cards = Object.entries(PLAN_INFO).map(([name, info]) => {
    const current = name === DATA.business.plan;
    return `<div class="plan-choice ${current ? "is-current" : ""}">
      <div class="plan-choice-head">
        <div><div class="plan-choice-name">${name}</div><div class="plan-choice-price">${info.price}</div></div>
        ${current ? '<span class="tag st-done">Текущий</span>' : `<button class="btn-d btn-d-primary btn-d-sm" onclick="goToCheckout('${name}')">Оформить</button>`}
      </div>
      <ul class="plan-choice-list">${info.features.map((f) => `<li>${IC.check} ${f}</li>`).join("")}</ul>
    </div>`;
  }).join("");
  openModal("Выбор тарифа", `<div class="plan-choices">${cards}</div>`, `
    <button class="btn-d btn-d-ghost" onclick="closeModal()">Закрыть</button>
  `);
}
// Оформление: сводка заказа + переход к оплате (тариф НЕ меняется до оплаты)
function goToCheckout(plan) {
  const info = PLAN_INFO[plan];
  openModal(`Оформление тарифа «${plan}»`, `
    <div class="checkout-summary">
      <div class="checkout-row"><span>Тариф</span><strong>${plan}</strong></div>
      <div class="checkout-row"><span>Организация</span><strong>${esc(DATA.business.company)}</strong></div>
      <div class="checkout-row checkout-total"><span>К оплате</span><strong>${info.price}</strong></div>
    </div>
    <ul class="plan-choice-list" style="margin-top:14px">${info.features.map((f) => `<li>${IC.check} ${f}</li>`).join("")}</ul>
    <p class="modal-hint">Демо-стоимость. Оплата подключается через платёжную систему (ЮKassa / CloudPayments); итоговые цены задаются на бэкенде.</p>
  `, `
    <button class="btn-d btn-d-ghost" onclick="openPlanUpgrade()">Назад</button>
    <button class="btn-d btn-d-primary" onclick="startPayment('${plan}')">Перейти к оплате</button>
  `);
}
// Точка интеграции платёжной системы. Тариф меняется ТОЛЬКО после успешной оплаты (на бэкенде).
function startPayment(plan) {
  // Реальный вариант: window.location.href = URL_оплаты_от_ЮKassa;
  openModal("Переход к оплате", `
    <div style="text-align:center;padding:8px 0">
      <div class="pay-spinner"></div>
      <p style="margin-top:14px;color:var(--d-text-2)">Перенаправляем в платёжную систему для оплаты тарифа «${plan}»…</p>
      <p class="modal-hint">Здесь подключается приём платежей (ЮKassa / CloudPayments). После успешной оплаты тариф активируется автоматически.</p>
    </div>
  `, `
    <button class="btn-d btn-d-ghost" onclick="closeModal()">Отмена</button>
    <button class="btn-d btn-d-primary" onclick="closeModal(); toast('Демо: оплата тарифа «${plan}» подключается на бэкенде')">Понятно</button>
  `);
  toast("Переход к оплате тарифа «" + plan + "»");
}

// ---------- Настройки (persist) ----------
function getSettings() {
  const def = { support: "help@lidostok.ru", defaultPlan: "Бесплатный", autoAssign: true, notify: true };
  try { return { ...def, ...(JSON.parse(localStorage.getItem("lidostok_settings")) || {}) }; }
  catch { return def; }
}
function saveAdminSettings() {
  const s = {
    support: document.getElementById("setSupport").value.trim(),
    defaultPlan: document.getElementById("setDefaultPlan").value,
    autoAssign: document.getElementById("setAutoAssign").checked,
    notify: document.getElementById("setNotify").checked,
  };
  localStorage.setItem("lidostok_settings", JSON.stringify(s));
  toast("Настройки сохранены");
}

// ---------- Формы / модалки ----------
function field(label, control) {
  return `<div class="field"><label class="field-label">${label}</label>${control}</div>`;
}
function selectHtml(id, options, current) {
  return `<select class="inp" id="${id}">${options.map(([v, l]) => `<option value="${v}" ${v === current ? "selected" : ""}>${l}</option>`).join("")}</select>`;
}
function toggleHtml(id, label, on) {
  return `<label class="toggle-row"><span>${label}</span>
    <span class="switch"><input type="checkbox" id="${id}" ${on ? "checked" : ""}><span class="slider"></span></span></label>`;
}
function openModal(title, body, footer) {
  closeModal();
  const el = document.createElement("div");
  el.className = "modal-overlay";
  el.id = "modalOverlay";
  el.onclick = (e) => { if (e.target === el) closeModal(); };
  el.innerHTML = `<div class="modal">
    <div class="modal-head"><h3>${title}</h3><button class="modal-close" onclick="closeModal()">${IC.close}</button></div>
    <div class="modal-body">${body}</div>
    <div class="modal-foot">${footer || ""}</div>
  </div>`;
  document.body.appendChild(el);
  document.addEventListener("keydown", escClose);
}
function escClose(e) { if (e.key === "Escape") closeModal(); }
function closeModal() {
  const el = document.getElementById("modalOverlay");
  if (el) el.remove();
  document.removeEventListener("keydown", escClose);
}

// ---------- Глобальный поиск (фильтрует текущий экран) ----------
function globalSearch(query) {
  const q = (query || "").toLowerCase().trim();
  const items = document.querySelectorAll("#content tbody tr, #content .conv-item, #content .channel-card:not(.ch-add)");
  items.forEach((el) => {
    el.style.display = !q || el.textContent.toLowerCase().includes(q) ? "" : "none";
  });
}

// ---------- Реестр представлений ----------
const VIEWS = {
  overview: { title: "Обзор", sub: "Ключевые показатели", render: viewOverview },
  inbox: { title: "Инбокс", sub: "Все сообщения в одном месте", render: viewInbox },
  leads: { title: "Лиды", sub: "Структурированные заявки", render: viewLeads },
  channels: { title: "Каналы", sub: "Подключённые источники", render: viewChannels },
  analytics: { title: "Аналитика", sub: "Источники, менеджеры, воронка", render: viewAnalytics },
  clients: { title: "Клиенты системы", sub: "Все компании на платформе", render: viewClients },
  settings: { title: "Настройки", sub: "Профиль и тариф", render: viewSettings },
};
const ALLOWED = new Set(buildMenu().map((m) => m.id));

// ---------- Каркас и навигация ----------
function switchView(id) {
  if (!ALLOWED.has(id)) id = "overview"; // роль не имеет доступа к разделу
  const v = VIEWS[id];
  if (!v) return;
  closeModal();
  document.getElementById("viewTitle").textContent = v.title;
  document.getElementById("viewSub").textContent = v.sub;
  document.getElementById("content").innerHTML = `<div class="view active">${v.render()}</div>`;
  document.querySelectorAll(".nav-item").forEach((el) => el.classList.toggle("active", el.dataset.view === id));
  document.getElementById("sidebar").classList.remove("open");
  const searchInput = document.getElementById("topSearch");
  if (searchInput) searchInput.value = "";
  location.hash = id;
  startLiveClock();
}

// ---------- Живые часы (реальное время в статистике) ----------
let _liveTimer = null;
function startLiveClock() {
  if (_liveTimer) clearInterval(_liveTimer);
  const tick = () => {
    const t = new Date().toLocaleTimeString("ru-RU");
    document.querySelectorAll("#liveClock").forEach((el) => (el.textContent = t));
  };
  if (document.getElementById("liveClock")) { tick(); _liveTimer = setInterval(tick, 1000); }
}

function toast(msg) {
  let t = document.getElementById("toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window._toastT);
  window._toastT = setTimeout(() => t.classList.remove("show"), 2600);
}

function initDashboard() {
  const initials = (SESSION.name || "U").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const nav = buildMenu().map((m) => `
    <button class="nav-item" data-view="${m.id}" onclick="switchView('${m.id}')">
      ${m.icon}<span>${m.label}</span>
      ${m.badge ? `<span class="nav-badge ${m.amber ? "amber" : ""}">${m.badge}</span>` : ""}
    </button>`).join("");

  document.getElementById("app").innerHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo"><img src="images/logo-dark.png" alt="Лидосток" onerror="this.style.display='none'"><span style="font-weight:800;font-size:17px">Лидосток</span></div>
      <nav class="sidebar-nav">
        <div class="nav-section-label">${IS_ADMIN ? "Администрирование" : "Рабочее место"}</div>
        ${nav}
      </nav>
      <div class="sidebar-user">
        <div class="user-avatar">${initials}</div>
        <div class="user-meta"><strong>${esc(SESSION.name)}</strong><span>${IS_ADMIN ? "admin" : esc(DATA.business.company)}</span></div>
        <button class="logout-btn" onclick="logout()" title="Выйти">${IC.logout}</button>
      </div>
    </aside>
    <div class="main">
      <div class="topbar">
        <button class="mobile-toggle" onclick="document.getElementById('sidebar').classList.toggle('open')">${IC.menu}</button>
        <div><h1 id="viewTitle">Обзор</h1><div class="topbar-sub" id="viewSub">Ключевые показатели</div></div>
        <div class="topbar-spacer"></div>
        <div class="search-box">
          ${IC.search}
          <input id="topSearch" placeholder="Поиск..." oninput="globalSearch(this.value)">
        </div>
        ${planPill()}
      </div>
      <div class="content" id="content"></div>
    </div>`;

  const start = (location.hash || "#overview").slice(1);
  switchView(ALLOWED.has(start) ? start : "overview");
}

document.addEventListener("DOMContentLoaded", initDashboard);
