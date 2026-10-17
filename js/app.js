// js/app.js

const tabIds = ["home", "atlas", "patients", "settings"];

// Definisikan showTab secara global agar bisa diakses darimana saja
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

  // Atur status aktif pada tombol navigasi bawah
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

  // Panggil fungsi pemuat data khusus tab
  if (id === "atlas" && typeof window.loadAtlas === "function") {
    window.loadAtlas();
  }
  if (id === "settings" && typeof window.loadProfile === "function") {
    window.loadProfile();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
};

// Gunakan Event Delegation global untuk menangkap klik pada semua atribut [data-tab]
document.addEventListener("click", (e) => {
  const trigger = e.target.closest("[data-tab]");
  if (trigger) {
    const targetTab = trigger.dataset.tab;
    if (targetTab) {
      window.showTab(targetTab);
    }
  }
});
