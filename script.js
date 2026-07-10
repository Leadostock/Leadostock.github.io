// ===== PARTICLES IN HERO =====
function createParticles() {
  const container = document.getElementById('heroParticles');
  if (!container) return;

  const colors = ['#2196F3', '#00BCD4', '#009688', '#42A5F5'];
  const particleCount = window.innerWidth < 768 ? 20 : 40;

  for (let i = 0; i < particleCount; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.top = '-10px';
    p.style.height = (20 + Math.random() * 60) + 'px';
    p.style.width = (1 + Math.random() * 1.5) + 'px';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.opacity = (0.1 + Math.random() * 0.2).toString();
    p.style.animationDuration = (4 + Math.random() * 8) + 's';
    p.style.animationDelay = (Math.random() * 10) + 's';
    container.appendChild(p);
  }
}

// ===== HEADER SCROLL EFFECT =====
function handleHeaderScroll() {
  const header = document.getElementById('header');
  if (!header) return;
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
}

// ===== MOBILE MENU =====
function toggleMenu() {
  const menu = document.getElementById('mobileMenu');
  if (menu) menu.classList.toggle('open');
}

// ===== SCROLL REVEAL =====
function initReveal() {
  const reveals = document.querySelectorAll('.reveal');
  // Add reveal class to main elements
  const sections = document.querySelectorAll('section');
  sections.forEach(sec => {
    const children = sec.querySelectorAll('.feature-card, .step-card, .integration-card, .pricing-card, .testimonial-card, .section-header, .dashboard-text, .dashboard-img-wrapper, .dashboard-full, .cta-box');
    children.forEach((el, i) => {
      el.classList.add('reveal');
      if (i % 3 === 0) el.classList.add('reveal-delay-1');
      if (i % 3 === 1) el.classList.add('reveal-delay-2');
      if (i % 3 === 2) el.classList.add('reveal-delay-3');
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ===== TESTIMONIALS SCROLL =====
function scrollTestimonials(direction) {
  const scroll = document.getElementById('testimonialsScroll');
  if (!scroll) return;
  const amount = 380;
  scroll.scrollBy({ left: direction * amount, behavior: 'smooth' });
}

// ===== FORM SUBMIT =====
function handleSubmit(event) {
  event.preventDefault();
  const email = document.getElementById('emailInput').value;
  const btn = document.getElementById('submitBtn');
  const success = document.getElementById('ctaSuccess');
  const form = document.querySelector('.cta-form');

  if (!email || !email.includes('@')) {
    alert('Пожалуйста, введите корректный email');
    return;
  }

  // Simulate submit
  btn.textContent = 'Отправка...';
  btn.disabled = true;

  setTimeout(() => {
    form.style.display = 'none';
    document.querySelector('.cta-note').style.display = 'none';
    success.style.display = 'block';
  }, 800);

  // Here you can add real API call:
  // fetch('/api/leads', { method: 'POST', body: JSON.stringify({ email, source: 'landing' }) })
}

// ===== SMOOTH SCROLL FOR ANCHOR LINKS =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (href === '#') return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ===== MARQUEE (smooth infinite scroll via JS) =====
function initMarquee() {
  const track = document.querySelector('.marquee-track');
  if (!track) return;

  // Duplicate items until we fill at least 2x viewport width
  const items = Array.from(track.children);
  const sectionWidth = track.parentElement.offsetWidth;
  let totalWidth = track.scrollWidth;
  while (totalWidth < sectionWidth * 3) {
    items.forEach(item => track.appendChild(item.cloneNode(true)));
    totalWidth = track.scrollWidth;
  }

  // Measure one "set" width (first half of duplicated items)
  const setWidth = totalWidth / 2;
  let pos = 0;
  let paused = false;
  const speed = 0.6; // pixels per frame

  function step() {
    if (!paused) {
      pos += speed;
      if (pos >= setWidth) pos -= setWidth;
      track.style.transform = 'translateX(-' + pos + 'px)';
    }
    requestAnimationFrame(step);
  }

  track.parentElement.addEventListener('mouseenter', () => { paused = true; });
  track.parentElement.addEventListener('mouseleave', () => { paused = false; });

  requestAnimationFrame(step);
}

// ===== SHARED FORM HELPERS =====
function showFormError(el, message, isInfo) {
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  el.classList.toggle('info', !!isInfo);
}

function hideFormError(el) {
  if (!el) return;
  el.classList.remove('show');
}

const ICON_EYE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const ICON_EYE_OFF = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

// ===== PASSWORD VISIBILITY TOGGLE =====
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.innerHTML = show ? ICON_EYE_OFF : ICON_EYE;
}

// ===== LOGIN FORM =====
// Единый адрес бэкенда задаётся в api.js (LIDOSTOK.apiBase). Пусто = тот же домен.
const API_BASE = (window.LIDOSTOK && window.LIDOSTOK.apiBase) || '';

// Демо-аккаунты — резервный вход для локального просмотра панели,
// когда бэкенд ещё не запущен. После деплоя бэкенда работает реальная авторизация.
const DEMO_ACCOUNTS = {
  admin:   { password: 'admin',   role: 'admin',    name: 'Администратор системы' },
  bisnes:  { password: 'bisnes',  role: 'business', name: 'Алексей Петров', plan: 'Бизнес',  company: 'ООО «СтройМастер»' },
  premium: { password: 'premium', role: 'business', name: 'Ольга Ветрова', plan: 'Премиум', company: 'Агентство «Медиалайн»' },
  manager: { password: 'manager', role: 'business', member: 'manager', name: 'Дмитрий Менеджер', plan: 'Премиум', company: 'Агентство «Медиалайн»' },
  trial:   { password: 'trial',   role: 'business', name: 'Никита Пробный', plan: 'Бесплатный', company: 'ИП Новиков', trialDays: 9 },
  expired: { password: 'expired', role: 'business', name: 'Роман Истёк',   plan: 'Бесплатный', company: 'ООО «Пробникофф»', trialDays: -1 }
};

async function handleLoginSubmit(event) {
  event.preventDefault();
  const login = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorBox = document.getElementById('loginError');
  const btn = document.getElementById('loginSubmitBtn');

  if (!login || !password) {
    showFormError(errorBox, 'Введите email и пароль');
    return false;
  }
  hideFormError(errorBox);
  btn.textContent = 'Входим...';
  btn.disabled = true;

  // 1) Реальная авторизация через бэкенд (/api/auth/login)
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: login, password })
    });

    if (res.ok) {
      const data = await res.json();
      const token = data.access_token;
      // Профиль пользователя (имя, роль, тариф, компания, признак админа)
      let me = {};
      try {
        const meRes = await fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (meRes.ok) me = await meRes.json();
      } catch (_) {}
      // Суперадмин автоматически попадает в системную панель, остальные — в свой кабинет.
      localStorage.setItem('lidostok_session', JSON.stringify(window.API.sessionFromMe(me, token)));
      window.location.assign('dashboard.html');
      return false;
    }

    if (res.status === 401) {
      btn.textContent = 'Войти'; btn.disabled = false;
      showFormError(errorBox, 'Неверный email или пароль');
      return false;
    }
    // прочие коды — покажем общую ошибку, но попробуем демо-фоллбэк ниже
  } catch (_) {
    // сеть недоступна — бэкенд не запущен, уходим в демо-фоллбэк
  }

  // 2) Демо-фоллбэк (только когда бэкенд недоступен) — для локального просмотра
  const account = DEMO_ACCOUNTS[login.toLowerCase()];
  if (account && account.password === password) {
    const session = {
      role: account.role, name: account.name, login: login.toLowerCase(),
      plan: account.plan || null, company: account.company || null,
      member: account.member || 'owner', at: Date.now()
    };
    // Дата окончания пробного периода (для демо трактуем trialDays как «осталось дней»)
    if (typeof account.trialDays === 'number') {
      session.trial_ends = Date.now() + account.trialDays * 86400000;
    }
    localStorage.setItem('lidostok_session', JSON.stringify(session));
    window.location.assign('dashboard.html');
    return false;
  }

  btn.textContent = 'Войти'; btn.disabled = false;
  showFormError(errorBox, 'Неверный email или пароль, либо сервер недоступен');
  return false;
}

// ===== REGISTER FORM =====
function initPlanBadge() {
  const badgeWrap = document.getElementById('planBadgeWrap');
  if (!badgeWrap) return;
  const params = new URLSearchParams(window.location.search);
  const plan = params.get('plan');
  const plans = {
    free: 'Тариф «Бесплатный»',
    business: 'Тариф «Бизнес»',
    premium: 'Тариф «Премиум»',
    enterprise: 'Тариф «Корпоративный»'
  };
  if (plan && plans[plan]) {
    badgeWrap.innerHTML = '<div class="auth-plan-badge">' +
      '<svg width="14" height="14" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill="#2196F3" fill-opacity="0.15"/><path d="M5 8l2 2 4-4" stroke="#2196F3" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      plans[plan] + '</div>';
  }
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const company = document.getElementById('regCompany').value.trim();
  const password = document.getElementById('regPassword').value;
  const passwordConfirm = document.getElementById('regPasswordConfirm').value;
  const agree = document.getElementById('regAgree').checked;
  const errorBox = document.getElementById('registerError');
  const btn = document.getElementById('registerSubmitBtn');

  if (!name) { showFormError(errorBox, 'Введите ваше имя'); return; }
  if (!company) { showFormError(errorBox, 'Введите название компании'); return; }
  if (!email || !email.includes('@')) { showFormError(errorBox, 'Введите корректный email'); return; }
  if (!password || password.length < 6) { showFormError(errorBox, 'Пароль должен содержать минимум 6 символов'); return; }
  if (password !== passwordConfirm) { showFormError(errorBox, 'Пароли не совпадают'); return; }
  if (!agree) { showFormError(errorBox, 'Нужно согласиться с условиями использования'); return; }
  hideFormError(errorBox);

  btn.textContent = 'Создание аккаунта...';
  btn.disabled = true;
  const selectedPlan = new URLSearchParams(location.search).get('plan'); // тариф, выбранный на лендинге

  // 1) Реальная регистрация через бэкенд (/api/auth/register)
  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_name: company, name, email, password })
    });
    if (res.ok) {
      const { access_token } = await res.json();
      // Сразу логиним: тянем профиль и строим сессию (регистрация даёт 14-дневный пробный период)
      let me = {};
      try {
        const meRes = await fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${access_token}` } });
        if (meRes.ok) me = await meRes.json();
      } catch (_) {}
      localStorage.setItem('lidostok_session', JSON.stringify(window.API.sessionFromMe(me, access_token, { desiredPlan: selectedPlan })));
      window.location.assign('dashboard.html');
      return;
    }
    if (res.status === 409) {
      btn.textContent = 'Создать аккаунт'; btn.disabled = false;
      showFormError(errorBox, 'Пользователь с таким email уже существует'); return;
    }
    // прочие коды — уйдём в демо-фоллбэк ниже
  } catch (_) {
    // сеть недоступна — бэкенд не запущен, демо-фоллбэк
  }

  // 2) Демо-фоллбэк (бэкенд недоступен): создаём локальную пробную сессию
  localStorage.setItem('lidostok_session', JSON.stringify({
    role: 'business', member: 'owner', name, login: email,
    company: company || 'Моя компания', plan: 'Бесплатный',
    trial_ends: Date.now() + 14 * 86400000, desiredPlan: selectedPlan || null,
    real: false, at: Date.now()
  }));
  window.location.assign('dashboard.html');
}

// ===== CONTACT FORM =====
function handleContactSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('contactName').value.trim();
  const email = document.getElementById('contactEmail').value.trim();
  const message = document.getElementById('contactMessage').value.trim();
  const errorBox = document.getElementById('contactError');
  const btn = document.getElementById('contactSubmitBtn');
  const form = document.getElementById('contactForm');
  const success = document.getElementById('contactSuccess');

  if (!name) { showFormError(errorBox, 'Введите ваше имя'); return; }
  if (!email || !email.includes('@')) { showFormError(errorBox, 'Введите корректный email'); return; }
  if (!message || message.length < 10) { showFormError(errorBox, 'Опишите вопрос подробнее (минимум 10 символов)'); return; }
  hideFormError(errorBox);

  btn.textContent = 'Отправка...';
  btn.disabled = true;

  // ===== ЗДЕСЬ ПОДКЛЮЧИТЬ РЕАЛЬНЫЙ API =====
  // fetch('/api/contact', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name, email, message }) })
  //   .then(r => r.json())
  //   .then(() => { form.style.display = 'none'; success.classList.add('show'); })
  //   .catch(() => showFormError(errorBox, 'Ошибка сервера. Попробуйте позже.'))
  //   .finally(() => { btn.textContent = 'Отправить сообщение'; btn.disabled = false; });

  setTimeout(() => {
    form.style.display = 'none';
    success.classList.add('show');
  }, 700);
}

// ===== SOON PAGE (placeholder content) =====
function initSoonPage() {
  const root = document.getElementById('soonContent');
  if (!root) return;
  const params = new URLSearchParams(window.location.search);
  const key = params.get('page') || 'default';
  const pages = {
    about:    { eyebrow: 'О НАС',            title: 'Страница «О нас» готовится',      text: 'Совсем скоро здесь появится история команды Лидостока и наша миссия. А пока — будем рады рассказать о себе лично.' },
    blog:     { eyebrow: 'БЛОГ',             title: 'Блог скоро запустится',            text: 'Мы готовим статьи о продажах, CRM и автоматизации обработки заявок. Подпишитесь на рассылку, чтобы не пропустить запуск.' },
    careers:  { eyebrow: 'КАРЬЕРА',          title: 'Вакансии появятся здесь',          text: 'Мы ещё формируем список открытых позиций. Если хотите присоединиться к команде — напишите нам через страницу контактов.' },
    help:     { eyebrow: 'ПОМОЩЬ',           title: 'Центр помощи в разработке',        text: 'Раздел с ответами на частые вопросы и инструкциями скоро будет доступен. Пока — свяжитесь с поддержкой напрямую.' },
    docs:     { eyebrow: 'ДОКУМЕНТАЦИЯ',     title: 'Документация готовится',           text: 'Техническая документация и описание API появятся здесь в ближайшее время.' },
    status:   { eyebrow: 'СТАТУС СИСТЕМЫ',   title: 'Страница статуса готовится',       text: 'Здесь будет отображаться статус работы сервисов Лидостока в реальном времени.' },
    security: { eyebrow: 'БЕЗОПАСНОСТЬ',     title: 'Раздел о безопасности готовится',  text: 'Подробности о защите данных и инфраструктуре скоро появятся на этой странице.' },
    api:      { eyebrow: 'API',              title: 'API-документация в разработке',    text: 'Мы готовим подробное описание API для кастомных интеграций. Нужен доступ уже сейчас — напишите нам.' },
    default:  { eyebrow: 'СКОРО',            title: 'Страница в разработке',            text: 'Мы уже работаем над этим разделом. Загляните немного позже.' }
  };
  const data = pages[key] || pages.default;
  root.querySelector('.simple-eyebrow').textContent = data.eyebrow;
  root.querySelector('.simple-title').textContent = data.title;
  root.querySelector('.simple-text').textContent = data.text;
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  createParticles();
  initMarquee();
  initReveal();
  handleHeaderScroll();
  initPlanBadge();
  initSoonPage();
  window.addEventListener('scroll', handleHeaderScroll);
});

// ===== ПЕРЕКЛЮЧАТЕЛЬ ПЕРИОДА ОПЛАТЫ НА ЛЕНДИНГЕ =====
function initBillingSwitch() {
  const sw = document.getElementById('billingSwitch');
  if (!sw) return;
  const DISCOUNTS = { 1: 0, 3: 0.10, 6: 0.15, 12: 0.30 };
  const fmt = (n) => n.toLocaleString('ru-RU');
  sw.querySelectorAll('.billing-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      sw.querySelectorAll('.billing-opt').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const months = parseInt(btn.dataset.months, 10);
      const d = DISCOUNTS[months] || 0;
      document.querySelectorAll('.pricing-card .price-num').forEach((el) => {
        const base = parseInt(el.dataset.month, 10);
        el.textContent = fmt(Math.round(base * (1 - d)));
        const sub = el.closest('.pricing-card').querySelector('[data-sub]');
        if (sub) {
          if (months > 1) {
            const total = Math.round(base * months * (1 - d));
            sub.textContent = `${fmt(total)} ₽ за ${months} мес · экономия ${Math.round(d * 100)}%`;
          } else {
            sub.textContent = '';
          }
        }
      });
    });
  });
}
document.addEventListener('DOMContentLoaded', initBillingSwitch);
