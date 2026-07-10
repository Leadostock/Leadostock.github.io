/* ===================================================================
   Лидосток — слой связи с бэкендом (API-клиент).
   Единая точка обращения к API: авторизация, данные кабинета, команда, админ.

   Как включить реальные данные:
   1) поднять бэкенд (см. инструкцию по БД);
   2) указать адрес API ниже в LIDOSTOK.apiBase (пусто = тот же домен);
   3) экраны панели, где подключён API, начнут брать данные из БД,
      а при недоступном бэкенде — мягко откатываются на демо-данные.
   =================================================================== */
window.LIDOSTOK = window.LIDOSTOK || {};
// Базовый адрес API. Пример для локали: "http://localhost:8000". Пусто = тот же домен.
LIDOSTOK.apiBase = LIDOSTOK.apiBase || "";

window.API = (function () {
  function base() {
    return LIDOSTOK.apiBase || "";
  }
  function token() {
    try {
      return (JSON.parse(localStorage.getItem("lidostok_session")) || {}).token || null;
    } catch {
      return null;
    }
  }

  async function req(method, path, body, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    const t = token();
    if (t) headers["Authorization"] = "Bearer " + t;

    let payload;
    if (body instanceof URLSearchParams) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      payload = body;
    } else if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }

    const res = await fetch(base() + path, { method, headers, body: payload });
    if (!res.ok) {
      const err = new Error("HTTP " + res.status);
      err.status = res.status;
      try { err.data = await res.json(); } catch { /* ignore */ }
      throw err;
    }
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : res.text();
  }

  return {
    setBase(url) { LIDOSTOK.apiBase = url || ""; },
    getBase: base,
    hasToken() { return !!token(); },

    // --- Авторизация ---
    login(username, password) { return req("POST", "/api/auth/login", new URLSearchParams({ username, password })); },
    register(data) { return req("POST", "/api/auth/register", data); },
    me() { return req("GET", "/api/auth/me"); },

    // --- Данные кабинета клиента ---
    conversations() { return req("GET", "/api/conversations"); },
    leads(params = {}) {
      const q = new URLSearchParams(params).toString();
      return req("GET", "/api/leads" + (q ? "?" + q : ""));
    },
    exportLeadsUrl(month) { return base() + "/api/leads/export" + (month ? "?month=" + month : ""); },
    channels() { return req("GET", "/api/channels"); },
    addChannel(data) { return req("POST", "/api/channels", data); },
    activateChannel(id) { return req("POST", "/api/channels/" + id + "/activate"); },
    tariffs() { return req("GET", "/api/tariffs"); },

    // --- Команда (менеджеры) ---
    teamMembers() { return req("GET", "/api/team/members"); },
    teamSeats() { return req("GET", "/api/team/seats"); },
    teamActivity() { return req("GET", "/api/team/activity"); },
    addTeamMember(m) { return req("POST", "/api/team/members", m); },
    updateTeamMember(id, patch) { return req("PATCH", "/api/team/members/" + id, patch); },
    removeTeamMember(id) { return req("DELETE", "/api/team/members/" + id); },

    // --- Администрирование (суперадмин) ---
    adminOverview() { return req("GET", "/api/admin/overview"); },
    adminTenants() { return req("GET", "/api/admin/tenants"); },
    createTenant(data) { return req("POST", "/api/admin/tenants", data); },
    updateTenant(id, patch) { return req("PATCH", "/api/admin/tenants/" + id, patch); },
    deleteTenant(id) { return req("DELETE", "/api/admin/tenants/" + id); },
    adminTariffs() { return req("GET", "/api/admin/tariffs"); },
    updateTariff(plan, patch) { return req("PATCH", "/api/admin/tariffs/" + plan, patch); },

    _req: req,
  };
})();

/* Соответствие кодов тарифов бэкенда и отображаемых названий. */
window.API.PLAN_RU = { free: "Бесплатный", business: "Бизнес", premium: "Премиум", enterprise: "Корпоративный" };

/* Строит сессию панели из ответа /api/auth/me.
   Суперадмин → админ-панель; менеджер → субдоступ; остальные → владелец. */
window.API.sessionFromMe = function (me, token, extra) {
  extra = extra || {};
  return {
    real: true,
    token: token,
    role: me.is_superadmin ? "admin" : "business",
    member: me.role === "manager" ? "manager" : "owner",
    name: me.name || me.email,
    login: me.email,
    plan: window.API.PLAN_RU[me.plan] || "Бесплатный",
    company: me.company || "",
    tenant_id: me.tenant_id || null,
    trial_ends: me.trial_ends ? Date.parse(me.trial_ends) : extra.trial_ends || null,
    desiredPlan: extra.desiredPlan || null,
    at: Date.now(),
  };
};

/* Утилита для экранов: попробовать API, при ошибке — фолбэк на демо.
   Использование:
     const data = await withApi(() => API.leads({month:'2026-07'}), demoLeads);
*/
window.withApi = async function (apiCall, fallback) {
  try {
    return await apiCall();
  } catch (e) {
    console.warn("[API] недоступно, использую демо-данные:", e.message);
    return typeof fallback === "function" ? fallback() : fallback;
  }
};
