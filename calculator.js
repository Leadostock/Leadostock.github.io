/* ===================================================================
   Лидосток — конструктор подписки (калькулятор).
   Цены соответствуют согласованной матрице конструктора.
   =================================================================== */
const CALC_PRICES = {
  base: 3000,            // стартовый пакет (3 канала, инбокс)
  extra_channel: 500,    // доп. канал
  meta_channel: 1000,    // Meta-канал (Instagram/WhatsApp)
  leads_package: 500,    // пакет +1000 лидов/мес
  analytics: 1000,       // аналитика и воронка
  manager_control: 1000, // контроль менеджеров
  priority_support: 500, // приоритетная поддержка (email — бесплатно)
  onboarding: 2000,      // настройка «под ключ» (разово, входит всегда)
  storage: { 1: 0, 3: 500, 6: 1000, 12: 1500 },
};
const CALC_DISCOUNTS = { 1: 0, 3: 0.10, 6: 0.15, 12: 0.30 };

const calcState = {
  extra_channel: 0, meta_channel: 0, leads_package: 0,
  analytics: false, manager_control: false, priority_support: false,
  storage: 1, onboarding: true, period: 1,
};

const rub = (n) => n.toLocaleString("ru-RU") + " ₽";

function calcCompute() {
  const p = CALC_PRICES;
  let monthly = p.base;
  monthly += calcState.extra_channel * p.extra_channel;
  monthly += calcState.meta_channel * p.meta_channel;
  monthly += calcState.leads_package * p.leads_package;
  if (calcState.analytics) monthly += p.analytics;
  if (calcState.manager_control) monthly += p.manager_control;
  if (calcState.priority_support) monthly += p.priority_support;
  monthly += p.storage[calcState.storage] || 0;
  const onetime = p.onboarding; // «под ключ» входит всегда, отключить нельзя
  const d = CALC_DISCOUNTS[calcState.period] || 0;
  const monthlyDisc = Math.round(monthly * (1 - d));
  const periodTotal = monthlyDisc * calcState.period + onetime;
  return { monthly, monthlyDisc, onetime, d, periodTotal };
}

function stepper(id, label, price, hint) {
  return `<div class="calc-row">
    <div class="calc-row-info"><span class="calc-row-label">${label}</span><span class="calc-row-price">+${rub(price)}/мес${hint ? " · " + hint : ""}</span></div>
    <div class="calc-stepper">
      <button type="button" onclick="calcStep('${id}',-1)">−</button>
      <span id="calc-${id}">0</span>
      <button type="button" onclick="calcStep('${id}',1)">+</button>
    </div>
  </div>`;
}
function toggleRow(id, label, price) {
  return `<label class="calc-row calc-row-toggle">
    <div class="calc-row-info"><span class="calc-row-label">${label}</span><span class="calc-row-price">${price ? "+" + rub(price) + "/мес" : "бесплатно"}</span></div>
    <span class="switch"><input type="checkbox" id="calc-${id}" onchange="calcToggle('${id}',this.checked)"><span class="slider"></span></span>
  </label>`;
}

function calcStep(id, delta) {
  calcState[id] = Math.max(0, calcState[id] + delta);
  document.getElementById("calc-" + id).textContent = calcState[id];
  calcRenderSummary();
}
function calcToggle(id, on) { calcState[id] = on; calcRenderSummary(); }
function calcSetStorage(v) { calcState.storage = parseInt(v, 10); calcRenderSummary(); }
function calcSetPeriod(m) {
  calcState.period = m;
  document.querySelectorAll(".calc-period-opt").forEach((b) => b.classList.toggle("active", parseInt(b.dataset.m, 10) === m));
  calcRenderSummary();
}

function calcRenderSummary() {
  const c = calcCompute();
  const items = [];
  items.push(["Базовый пакет", CALC_PRICES.base]);
  if (calcState.extra_channel) items.push([`Доп. каналы × ${calcState.extra_channel}`, calcState.extra_channel * CALC_PRICES.extra_channel]);
  if (calcState.meta_channel) items.push([`Meta-каналы × ${calcState.meta_channel}`, calcState.meta_channel * CALC_PRICES.meta_channel]);
  if (calcState.leads_package) items.push([`Пакеты лидов × ${calcState.leads_package}`, calcState.leads_package * CALC_PRICES.leads_package]);
  if (calcState.analytics) items.push(["Аналитика и воронка", CALC_PRICES.analytics]);
  if (calcState.manager_control) items.push(["Контроль менеджеров", CALC_PRICES.manager_control]);
  if (calcState.priority_support) items.push(["Приоритетная поддержка", CALC_PRICES.priority_support]);
  const st = CALC_PRICES.storage[calcState.storage];
  if (st) items.push([`Хранение истории (${calcState.storage} мес)`, st]);

  const list = items.map(([l, v]) => `<div class="calc-sum-row"><span>${l}</span><span>${rub(v)}</span></div>`).join("");
  const discNote = c.d > 0 ? `<div class="calc-sum-row calc-sum-disc"><span>Скидка за ${calcState.period} мес</span><span>−${Math.round(c.d * 100)}%</span></div>` : "";
  const onetimeNote = c.onetime ? `<div class="calc-sum-row"><span>Настройка «под ключ» (разово)</span><span>${rub(c.onetime)}</span></div>` : "";

  document.getElementById("calcSummary").innerHTML = `
    <h3>Ваша подписка</h3>
    <div class="calc-sum-list">${list}${discNote}</div>
    <div class="calc-sum-total">
      <span>Итого в месяц</span>
      <strong>${rub(c.monthlyDisc)}${c.d > 0 ? `<s>${rub(c.monthly)}</s>` : ""}</strong>
    </div>
    ${onetimeNote}
    <div class="calc-sum-period">К оплате за ${calcState.period} ${calcState.period === 1 ? "месяц" : "мес"}: <strong>${rub(c.periodTotal)}</strong></div>
    <a href="register.html" class="btn btn-primary btn-full btn-lg">Оформить</a>
    <p class="calc-note">CRM-интеграция входит без доплаты. Точная конфигурация уточняется при подключении.</p>`;
}

function initCalculator() {
  const app = document.getElementById("calcApp");
  if (!app) return;
  app.innerHTML = `
    <div class="calc-controls">
      <div class="calc-base">
        <div class="calc-base-badge">Базовый пакет — от ${rub(CALC_PRICES.base)}/мес</div>
        <p>3 канала, единый инбокс, карточки лидов, CRM-интеграция и подключение «под ключ».</p>
      </div>

      <div class="calc-group">
        <h4>Каналы</h4>
        ${stepper("extra_channel", "Дополнительные каналы", CALC_PRICES.extra_channel, "Telegram, VK, почта")}
        ${stepper("meta_channel", "Meta-каналы", CALC_PRICES.meta_channel, "Instagram, WhatsApp")}
      </div>

      <div class="calc-group">
        <h4>Лиды</h4>
        ${stepper("leads_package", "Пакеты лидов", CALC_PRICES.leads_package, "+1000 лидов/мес")}
      </div>

      <div class="calc-group">
        <h4>Возможности</h4>
        ${toggleRow("analytics", "Аналитика и воронка", CALC_PRICES.analytics)}
        ${toggleRow("manager_control", "Контроль менеджеров", CALC_PRICES.manager_control)}
        ${toggleRow("priority_support", "Приоритетная поддержка", CALC_PRICES.priority_support)}
      </div>

      <div class="calc-group">
        <h4>Хранение истории переписок</h4>
        <select class="calc-select" onchange="calcSetStorage(this.value)">
          <option value="1">1 месяц — бесплатно</option>
          <option value="3">3 месяца — +${rub(CALC_PRICES.storage[3])}</option>
          <option value="6">6 месяцев — +${rub(CALC_PRICES.storage[6])}</option>
          <option value="12">12 месяцев — +${rub(CALC_PRICES.storage[12])}</option>
        </select>
      </div>

      <div class="calc-group">
        <h4>Подключение</h4>
        <div class="calc-row calc-row-fixed">
          <div class="calc-row-info"><span class="calc-row-label">Настройка «под ключ» (разово)</span><span class="calc-row-price">входит всегда · ${rub(CALC_PRICES.onboarding)}</span></div>
          <span class="calc-included">Включено</span>
        </div>
      </div>

      <div class="calc-group">
        <h4>Период оплаты</h4>
        <div class="calc-period">
          <button class="calc-period-opt active" data-m="1" onclick="calcSetPeriod(1)">Месяц</button>
          <button class="calc-period-opt" data-m="3" onclick="calcSetPeriod(3)">3 мес −10%</button>
          <button class="calc-period-opt" data-m="6" onclick="calcSetPeriod(6)">6 мес −15%</button>
          <button class="calc-period-opt" data-m="12" onclick="calcSetPeriod(12)">12 мес −30%</button>
        </div>
      </div>
    </div>
    <aside class="calc-summary" id="calcSummary"></aside>`;

  calcRenderSummary();
}

document.addEventListener("DOMContentLoaded", initCalculator);
