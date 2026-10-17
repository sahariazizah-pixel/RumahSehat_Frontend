import { loadProfile, loadCategories } from "./profile.js";
import { loadAtlas } from "./atlas.js";
import { loadPatients } from "./patients.js";

const tabIds = ["home", "atlas", "patients", "settings"];

export function showTab(id) {
  tabIds.forEach(t => {
    const el = document.getElementById("tab-" + t);
    if(el) el.hidden = t !== id;
  });
  document.querySelectorAll(".nav-item").forEach(b => {
    const active = b.dataset.tab === id;
    b.classList.toggle("text-emerald-600", active);
    b.classList.toggle("text-gray-400", !active);
    if(active) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  if(id === "atlas") loadAtlas();
  if(id === "patients") loadPatients();
  if(id === "settings") {
    loadProfile();
    loadCategories();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function message(s) {
  const toast = document.getElementById("toast");
  if(!toast) return;
  toast.textContent = s;
  toast.classList.remove("opacity-0");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toast.classList.add("opacity-0"), 2500);
}

// Expose to window for inline handlers or global debugging
window.showTab = showTab;
window.message = message;

// Robust Event Delegation for all [data-tab] elements
function initNavigation() {
  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-tab]");
    if (target && target.dataset.tab) {
      e.preventDefault();
      showTab(target.dataset.tab);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initNavigation);
} else {
  initNavigation();
}

// Initial startup load
loadProfile();
loadCategories();
