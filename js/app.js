// Navigasi tab, toast, dan startup aplikasi.
// Dimuat paling akhir agar fungsi window.load* dari modul lain sudah terdaftar.

const tabIds = ["home", "atlas", "patients", "settings"];

window.showTab = function(id) {
  tabIds.forEach(t => {
    const section = document.getElementById("tab-" + t);
    if (section) {
      if (t === id) {
        section.removeAttribute("hidden");
      } else {
        section.setAttribute("hidden", "true");
      }
    }
  });

  document.querySelectorAll(".nav-item").forEach(b => {
    const active = (b.dataset.tab === id);
    if (active) {
      b.classList.add("text-emerald-600");
      b.classList.remove("text-gray-400");
      b.setAttribute("aria-current", "page");
    } else {
      b.classList.remove("text-emerald-600");
      b.classList.add("text-gray-400");
      b.removeAttribute("aria-current");
    }
  });

  if (id === "home") {
    if (typeof window.loadHomeStats === "function") window.loadHomeStats();
    if (typeof window.loadActivities === "function") window.loadActivities();
  }
  if (id === "atlas" && typeof window.loadAtlas === "function") {
    window.loadAtlas();
  }
  if (id === "patients" && typeof window.loadPatients === "function") {
    window.loadPatients();
  }
  if (id === "settings") {
    if (typeof window.loadProfile === "function") window.loadProfile();
    if (typeof window.loadCategories === "function") window.loadCategories();
    if (typeof window.loadTelegramSettings === "function") window.loadTelegramSettings();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
};

// Satu listener global: tombol nav maupun quick-card home sama-sama memakai data-tab.
document.addEventListener("click", (e) => {
  const trigger = e.target.closest("[data-tab]");
  if (trigger) {
    const targetTab = trigger.dataset.tab;
    if (targetTab) {
      window.showTab(targetTab);
    }
  }
});

window.message = function(s) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = s;
  toast.classList.remove("opacity-0");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toast.classList.add("opacity-0"), 2500);
};

window.showSuccessModal = function(title, desc, onOk = null) {
  const modal = document.getElementById("success-modal");
  const titleEl = document.getElementById("success-modal-title");
  const descEl = document.getElementById("success-modal-desc");
  const okBtn = document.getElementById("success-modal-ok-btn");

  if (titleEl) titleEl.textContent = title || "Berhasil!";
  if (descEl) descEl.textContent = desc || "Data berhasil disimpan ke sistem.";

  if (modal) {
    if (typeof modal.showModal === "function") {
      modal.showModal();
    } else {
      modal.classList.remove("hidden");
    }

    const handleOk = () => {
      if (typeof modal.close === "function") {
        modal.close();
      } else {
        modal.classList.add("hidden");
      }
      okBtn.removeEventListener("click", handleOk);
      if (typeof onOk === "function") onOk();
    };

    okBtn.onclick = handleOk;
  } else if (typeof onOk === "function") {
    onOk();
  }
};

// Initial Startup
if (typeof window.loadProfile === "function") window.loadProfile();
if (typeof window.loadCategories === "function") window.loadCategories();
if (typeof window.loadTelegramSettings === "function") window.loadTelegramSettings();
if (typeof window.loadHomeStats === "function") window.loadHomeStats();
if (typeof window.loadActivities === "function") window.loadActivities();
if (typeof window.loadPatients === "function") window.loadPatients();

// Hide splash screen after startup
setTimeout(() => {
  const splash = document.getElementById("app-splash-screen");
  if (splash) {
    splash.classList.add("opacity-0", "pointer-events-none");
    setTimeout(() => splash.remove(), 500);
  }
}, 1200);
