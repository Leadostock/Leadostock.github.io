/* Карта развития: появление узлов при скролле + заполнение линии прогресса. */
(function () {
  const timeline = document.getElementById("timeline");
  if (!timeline) return;
  const nodes = Array.from(timeline.querySelectorAll(".tl-node"));
  const progress = document.getElementById("tlProgress");

  // Появление карточек
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
  );
  nodes.forEach((n) => io.observe(n));

  // Заполнение вертикальной линии по мере прокрутки
  function updateProgress() {
    const rect = timeline.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = rect.height;
    // насколько центр экрана прошёл вдоль таймлайна
    const passed = Math.min(Math.max(vh * 0.55 - rect.top, 0), total);
    const pct = total > 0 ? (passed / total) * 100 : 0;
    if (progress) progress.style.height = pct + "%";
  }

  let ticking = false;
  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateProgress();
        ticking = false;
      });
      ticking = true;
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", updateProgress);
  updateProgress();
})();
