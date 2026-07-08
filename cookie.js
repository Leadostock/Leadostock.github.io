/* ===================================================================
   Лидосток — баннер согласия на cookie (общий для всех страниц).
   Согласие сохраняется в localStorage. При согласии здесь же можно
   инициализировать веб-аналитику (Яндекс.Метрику).
   =================================================================== */
(function () {
  var KEY = "lidostok_cookie_consent";
  try { if (localStorage.getItem(KEY)) { return; } } catch (e) { return; }

  function decide(value) {
    try { localStorage.setItem(KEY, value); } catch (e) {}
    var el = document.getElementById("cookieBanner");
    if (el) el.remove();
    // if (value === "all") initMetrika();  // ← здесь подключается Яндекс.Метрика
  }
  window.__cookieDecide = decide;

  function render() {
    if (document.getElementById("cookieBanner")) return;
    var wrap = document.createElement("div");
    wrap.id = "cookieBanner";
    wrap.className = "cookie-banner";
    wrap.innerHTML =
      '<div class="cookie-inner">' +
      '<p class="cookie-text">Мы используем файлы cookie, чтобы сайт работал корректно и чтобы улучшать сервис. ' +
      'Оставаясь на сайте, вы соглашаетесь с их использованием. ' +
      '<a href="privacy.html">Подробнее</a>.</p>' +
      '<div class="cookie-actions">' +
      '<button class="cookie-btn cookie-btn-ghost" onclick="__cookieDecide(\'necessary\')">Только необходимые</button>' +
      '<button class="cookie-btn cookie-btn-primary" onclick="__cookieDecide(\'all\')">Принять все</button>' +
      "</div></div>";
    document.body.appendChild(wrap);
    requestAnimationFrame(function () { wrap.classList.add("show"); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
