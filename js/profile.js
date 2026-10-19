// Profil terapis, manajemen kategori, dan pengaturan Telegram Bot.
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

const message = (s) => window.message(s);

function showSuccessModal(title, desc, onOk) {
  if (typeof window.showSuccessModal === "function") {
    window.showSuccessModal(title, desc, onOk);
  } else if (typeof onOk === "function") {
    onOk();
  }
}

// ==================== PROFILE FUNCTIONS ====================
const profileDlg = document.getElementById("profile-dialog");
const profileForm = document.getElementById("profile-form");
const skillsContainer = document.getElementById("skills-input-container");
const socialsContainer = document.getElementById("socials-input-container");

const addSkillBtn = document.getElementById("add-skill-btn");
if (addSkillBtn) addSkillBtn.onclick = () => addSkillInput("");

const addSocialBtn = document.getElementById("add-social-btn");
if (addSocialBtn) addSocialBtn.onclick = () => addSocialInput("", "");

function addSkillInput(val = "") {
  if (!skillsContainer) return;
  const div = document.createElement("div");
  div.className = "flex items-center gap-2";
  div.innerHTML = `<input class="skill-input w-full border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500" value="${val}" placeholder="Contoh: Bekam Sunnah"><button type="button" class="text-rose-500 text-xs px-1 font-bold" onclick="this.parentElement.remove()">×</button>`;
  skillsContainer.append(div);
}

function addSocialInput(platform = "", link = "") {
  if (!socialsContainer) return;
  const div = document.createElement("div");
  div.className = "flex items-center gap-2";
  div.innerHTML = `<input class="social-name w-1/3 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500" value="${platform}" placeholder="Instagram"><input class="social-val w-2/3 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500" value="${link}" placeholder="@username/link"><button type="button" class="text-rose-500 text-xs px-1 font-bold" onclick="this.parentElement.remove()">×</button>`;
  socialsContainer.append(div);
}

async function loadProfile() {
  try {
    const docRef = doc(db, "settings", "profile");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const p = docSnap.data();
      const hClinic = document.getElementById("header-clinic-name");
      if (hClinic) hClinic.textContent = p.clinicName || "Rumah Sehat";
      const hTherapist = document.getElementById("header-therapist-name");
      if (hTherapist) hTherapist.textContent = p.therapistName ? `Terapis: ${p.therapistName}` : "Klinik & Atlas Terapis";
      const homeClinic = document.getElementById("home-clinic-title");
      if (homeClinic) homeClinic.textContent = p.clinicName || "Klinik Rumah Sehat";
      const homeAddr = document.getElementById("home-address-desc");
      if (homeAddr) homeAddr.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${p.address || "Bulakamba, Brebes"}`;

      const vTherapist = document.getElementById("view-therapist-name");
      if (vTherapist) vTherapist.textContent = p.therapistName || "Ahmad Rokhmani";
      const vClinic = document.getElementById("view-clinic-name");
      if (vClinic) vClinic.textContent = p.clinicName || "Klinik Rumah Sehat";
      const vLicense = document.getElementById("view-license");
      if (vLicense) vLicense.innerHTML = `<i class="fa-solid fa-id-card"></i> Izin: ${p.license || "Belum Diisi"}`;
      const vAddress = document.getElementById("view-address");
      if (vAddress) vAddress.textContent = p.address || "Bulakamba, Brebes";
      const vPhone = document.getElementById("view-phone");
      if (vPhone) vPhone.textContent = p.phone || "-";
      const vTelegram = document.getElementById("view-telegram");
      if (vTelegram) vTelegram.textContent = p.telegram || "-";
      const vFacebook = document.getElementById("view-facebook");
      if (vFacebook) vFacebook.textContent = p.facebook || "-";

      const vAvatar = document.getElementById("view-profile-avatar");
      if (vAvatar) {
        if (p.avatarUrl) vAvatar.src = p.avatarUrl;
        vAvatar.classList.add("cursor-pointer", "hover:opacity-95", "transition");
        vAvatar.onclick = () => {
          const src = p.avatarUrl || vAvatar.src;
          if (src && typeof window.openLightbox === "function") window.openLightbox(src);
        };
      }

      const vCover = document.getElementById("view-cover-banner");
      if (vCover) {
        if (p.coverUrl) vCover.style.backgroundImage = `url('${p.coverUrl}')`;
        vCover.classList.add("cursor-pointer", "hover:opacity-95", "transition");
        vCover.onclick = () => {
          const src = p.coverUrl;
          if (src && typeof window.openLightbox === "function") window.openLightbox(src);
        };
      }

      const headerLogo = document.getElementById("header-app-logo");
      if (headerLogo && p.logoUrl) headerLogo.src = p.logoUrl;

      const skillsBox = document.getElementById("view-skills-container");
      if (skillsBox) {
        skillsBox.replaceChildren();
        if (p.skills && p.skills.length) {
          p.skills.forEach(s => {
            const span = document.createElement("span");
            span.className = "text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg font-medium border border-emerald-100";
            span.textContent = s;
            skillsBox.append(span);
          });
        } else {
          skillsBox.innerHTML = '<span class="text-xs text-gray-400">Belum ada keahlian diinput</span>';
        }
      }

      const extraSocialsBox = document.getElementById("view-extra-socials");
      if (extraSocialsBox) {
        extraSocialsBox.replaceChildren();
        if (p.extraSocials && p.extraSocials.length) {
          p.extraSocials.forEach(soc => {
            const div = document.createElement("div");
            div.className = "flex items-center space-x-2 text-gray-600";
            div.innerHTML = `<i class="fa-solid fa-globe text-emerald-600 w-4"></i><span><b>${soc.name}:</b> ${soc.val}</span>`;
            extraSocialsBox.append(div);
          });
        }
      }
    }
  } catch (err) {
    console.error("Profile load error:", err);
  }
}
window.loadProfile = loadProfile;

const editProfileBtn = document.getElementById("edit-profile-btn");
if (editProfileBtn) {
  editProfileBtn.onclick = async () => {
    if (profileForm) profileForm.reset();
    if (skillsContainer) skillsContainer.replaceChildren();
    if (socialsContainer) socialsContainer.replaceChildren();

    try {
      const docSnap = await getDoc(doc(db, "settings", "profile"));
      if (docSnap.exists()) {
        const p = docSnap.data();
        document.getElementById("input-therapist-name").value = p.therapistName || "";
        document.getElementById("input-clinic-name").value = p.clinicName || "";
        document.getElementById("input-address").value = p.address || "";
        document.getElementById("input-phone").value = p.phone || "";
        document.getElementById("input-license").value = p.license || "";
        document.getElementById("input-telegram").value = p.telegram || "";
        document.getElementById("input-facebook").value = p.facebook || "";
        document.getElementById("profile-avatar-url").value = p.avatarUrl || "";
        document.getElementById("profile-cover-url").value = p.coverUrl || "";
        document.getElementById("profile-logo-url").value = p.logoUrl || "";

        if (p.skills && p.skills.length) {
          p.skills.forEach(s => addSkillInput(s));
        } else {
          addSkillInput("Akupunktur");
        }

        if (p.extraSocials && p.extraSocials.length) {
          p.extraSocials.forEach(soc => addSocialInput(soc.name, soc.val));
        }
      } else {
        addSkillInput("Akupunktur");
      }
    } catch (e) {
      addSkillInput("Akupunktur");
    }
    if (profileDlg) profileDlg.showModal();
  };
}

["close-profile-dialog", "cancel-profile-dialog"].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.onclick = () => { if (profileDlg) profileDlg.close(); };
});

if (profileForm) {
  profileForm.addEventListener("submit", async e => {
    e.preventDefault();
    const saveBtn = document.getElementById("save-profile-btn");
    const statusText = document.getElementById("profile-upload-status");
    if (saveBtn) saveBtn.disabled = true;

    let coverUrl = document.getElementById("profile-cover-url").value;
    const coverFile = document.getElementById("profile-cover-file").files[0];
    if (coverFile) {
      if (statusText) { statusText.classList.remove("hidden"); statusText.textContent = "Mengupload foto sampul..."; }
      const formData = new FormData();
      formData.append("file", coverFile);
      formData.append("upload_preset", "rumahsehat_asset");
      try {
        const res = await fetch("https://api.cloudinary.com/v1_1/u8fb8blx/image/upload", { method: "POST", body: formData });
        const json = await res.json();
        if (json.secure_url) coverUrl = json.secure_url;
      } catch (err) { console.error(err); }
    }

    let avatarUrl = document.getElementById("profile-avatar-url").value;
    const avatarFile = document.getElementById("profile-avatar-file").files[0];
    if (avatarFile) {
      if (statusText) { statusText.classList.remove("hidden"); statusText.textContent = "Mengupload foto profil..."; }
      const formData = new FormData();
      formData.append("file", avatarFile);
      formData.append("upload_preset", "rumahsehat_asset");
      try {
        const res = await fetch("https://api.cloudinary.com/v1_1/u8fb8blx/image/upload", { method: "POST", body: formData });
        const json = await res.json();
        if (json.secure_url) avatarUrl = json.secure_url;
      } catch (err) { console.error(err); }
    }

    let logoUrl = document.getElementById("profile-logo-url").value;
    const logoFile = document.getElementById("profile-logo-file").files[0];
    if (logoFile) {
      if (statusText) { statusText.classList.remove("hidden"); statusText.textContent = "Mengupload logo aplikasi..."; }
      const formData = new FormData();
      formData.append("file", logoFile);
      formData.append("upload_preset", "rumahsehat_asset");
      try {
        const res = await fetch("https://api.cloudinary.com/v1_1/u8fb8blx/image/upload", { method: "POST", body: formData });
        const json = await res.json();
        if (json.secure_url) logoUrl = json.secure_url;
      } catch (err) { console.error(err); }
    }

    const skills = Array.from(document.querySelectorAll(".skill-input")).map(i => i.value.trim()).filter(Boolean);
    const socialNames = Array.from(document.querySelectorAll(".social-name"));
    const socialVals = Array.from(document.querySelectorAll(".social-val"));
    const extraSocials = [];
    socialNames.forEach((el, idx) => {
      if (el.value.trim() && socialVals[idx].value.trim()) {
        extraSocials.push({ name: el.value.trim(), val: socialVals[idx].value.trim() });
      }
    });

    const profileData = {
      therapistName: document.getElementById("input-therapist-name").value.trim(),
      clinicName: document.getElementById("input-clinic-name").value.trim(),
      address: document.getElementById("input-address").value.trim(),
      phone: document.getElementById("input-phone").value.trim(),
      license: document.getElementById("input-license").value.trim(),
      telegram: document.getElementById("input-telegram").value.trim(),
      facebook: document.getElementById("input-facebook").value.trim(),
      skills,
      extraSocials,
      coverUrl,
      avatarUrl,
      logoUrl,
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, "settings", "profile"), profileData);
      showSuccessModal("Berhasil!", "Profil berhasil diperbarui!", () => {
        if (profileDlg) profileDlg.close();
        loadProfile();
      });
    } catch (err) {
      message("Gagal menyimpan profil.");
      console.error(err);
    } finally {
      if (saveBtn) saveBtn.disabled = false;
      if (statusText) statusText.classList.add("hidden");
    }
  });
}

// ==================== CATEGORIES MANAGEMENT ====================
const categoryDlg = document.getElementById("category-dialog");
const categoryForm = document.getElementById("category-form");
let currentCategories = ["Bekam Sunnah", "Akupunktur", "Akupresur / Pijat", "Ruqyah & Herbal"];

async function loadCategories() {
  try {
    const docRef = doc(db, "settings", "categories");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.categories && Array.isArray(data.categories)) {
        currentCategories = data.categories;
      }
    } else {
      await setDoc(docRef, { categories: currentCategories });
    }
    renderCategoriesList();
    populateCategoryDropdowns();
  } catch (err) {
    console.error("Load categories error:", err);
    renderCategoriesList();
    populateCategoryDropdowns();
  }
}
window.loadCategories = loadCategories;

function populateCategoryDropdowns() {
  const select = document.getElementById("atlas-category");
  if (!select) return;
  const val = select.value;
  select.replaceChildren();
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "Pilih kategori";
  select.append(defaultOpt);

  currentCategories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.append(opt);
  });
  select.value = val;
}

function renderCategoriesList() {
  const box = document.getElementById("settings-categories-list");
  if (!box) return;
  box.replaceChildren();

  if (!currentCategories.length) {
    box.innerHTML = '<div class="text-xs text-gray-400 text-center py-2">Belum ada data</div>';
    return;
  }

  currentCategories.forEach((cat, index) => {
    const row = document.createElement("div");
    row.className = "flex items-center justify-between bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl";

    const span = document.createElement("span");
    span.className = "font-medium text-gray-800 text-xs";
    span.textContent = cat;

    const actions = document.createElement("div");
    actions.className = "flex items-center gap-1.5";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "text-emerald-600 hover:text-emerald-700 px-2 py-1 text-xs font-semibold";
    editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
    editBtn.onclick = () => openCategoryModal(index);

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "text-rose-500 hover:text-rose-600 px-2 py-1 text-xs font-semibold";
    delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    delBtn.onclick = () => deleteCategory(index);

    actions.append(editBtn, delBtn);
    row.append(span, actions);
    box.append(row);
  });
}

function openCategoryModal(index = null) {
  if (!categoryForm) return;
  categoryForm.reset();
  document.getElementById("category-edit-index").value = index !== null ? index : "";
  document.getElementById("category-dialog-title").textContent = index !== null ? "Edit Kategori" : "Tambah Kategori";
  if (index !== null) {
    document.getElementById("category-input").value = currentCategories[index];
  }
  if (categoryDlg) categoryDlg.showModal();
}

const addCategoryBtn = document.getElementById("add-category-btn");
if (addCategoryBtn) addCategoryBtn.onclick = () => openCategoryModal(null);

["close-category-dialog", "cancel-category-dialog"].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.onclick = () => { if (categoryDlg) categoryDlg.close(); };
});

if (categoryForm) {
  categoryForm.addEventListener("submit", async e => {
    e.preventDefault();
    const editIdx = document.getElementById("category-edit-index").value;
    const catName = document.getElementById("category-input").value.trim();
    if (!catName) return;

    if (editIdx === "") {
      if (currentCategories.includes(catName)) {
        message("Kategori sudah ada.");
        return;
      }
      currentCategories.push(catName);
    } else {
      currentCategories[parseInt(editIdx)] = catName;
    }

    try {
      await setDoc(doc(db, "settings", "categories"), { categories: currentCategories });
      showSuccessModal("Berhasil!", "Kategori berhasil disimpan.", () => {
        if (categoryDlg) categoryDlg.close();
        renderCategoriesList();
        populateCategoryDropdowns();
      });
    } catch (err) {
      console.error("Save category error:", err);
      message("Gagal menyimpan kategori.");
    }
  });
}

window.deleteCategory = async function(index) {
  const cat = currentCategories[index];
  if (confirm(`Hapus kategori "${cat}"?`)) {
    currentCategories.splice(index, 1);
    try {
      await setDoc(doc(db, "settings", "categories"), { categories: currentCategories });
      renderCategoriesList();
      populateCategoryDropdowns();
      message("Kategori dihapus.");
    } catch (err) {
      message("Gagal menghapus kategori.");
    }
  }
};

// ==================== TELEGRAM BOT SETTINGS & NOTIFICATIONS ====================
async function loadTelegramSettings() {
  try {
    const docRef = doc(db, "settings", "telegram");
    const docSnap = await getDoc(docRef);
    const tokenInput = document.getElementById("input-telegram-token");
    const chatInput = document.getElementById("input-telegram-chatid");
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (tokenInput) tokenInput.value = data.botToken || "8802888889:AAF7CYk...";
      if (chatInput) chatInput.value = data.chatId || "";
    } else {
      if (tokenInput && !tokenInput.value) tokenInput.value = "8802888889:AAF7CYk...";
    }
  } catch (err) {
    console.error("Load telegram settings error:", err);
  }
}
window.loadTelegramSettings = loadTelegramSettings;

const telegramForm = document.getElementById("telegram-settings-form");
if (telegramForm) {
  telegramForm.addEventListener("submit", async e => {
    e.preventDefault();
    const botToken = document.getElementById("input-telegram-token")?.value.trim() || "8802888889:AAF7CYk...";
    const chatId = document.getElementById("input-telegram-chatid").value.trim();
    try {
      await setDoc(doc(db, "settings", "telegram"), { botToken, chatId, updatedAt: serverTimestamp() });
      showSuccessModal("Berhasil!", "Pengaturan Telegram berhasil disimpan!", () => {});
    } catch (err) {
      console.error("Save telegram error:", err);
      message("Gagal menyimpan pengaturan Telegram.");
    }
  });
}

async function sendTelegramNotification(messageText) {
  let botToken = document.getElementById("input-telegram-token")?.value.trim() || "8802888889:AAF7CYk...";
  let chatId = document.getElementById("input-telegram-chatid")?.value.trim();

  if (!chatId) {
    try {
      const docSnap = await getDoc(doc(db, "settings", "telegram"));
      if (docSnap.exists()) {
        const data = docSnap.data();
        botToken = botToken || data.botToken || "8802888889:AAF7CYk...";
        chatId = chatId || data.chatId;
      }
    } catch (e) { console.error(e); }
  }

  if (!botToken) {
    message("Telegram Bot Token belum diisi.");
    return false;
  }

  if (!chatId) {
    message("Telegram Chat ID belum diisi.");
    return false;
  }

  // Validasi format token: contoh benar 8802888889:AAF7CYk...
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(botToken)) {
    message("Format Bot Token tidak valid. Salin ulang token dari @BotFather (format: 123456789:AA...).");
    return false;
  }

  // Validasi chat id: biasanya angka,
  if (!/^-?\d+$/.test(chatId)) {
    message("Format Chat ID tidak valid. Gunakan angka, contoh: 123456789.");
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: messageText, parse_mode: "HTML" })
    });
    const json = await res.json();
    if (json.ok) {
      return true;
    } else {
      console.error("Telegram API error:", json);
      const desc = json.description || "Tidak diketahui";
      if (json.error_code === 401) {
        message(`Gagal (Token salah): ${desc}. Buat ulang token di @BotFather (mybots > API Token).`);
      } else if (String(desc).includes("chat not found")) {
        message("Gagal (Chat tidak ditemukan): Chat ID salah ATAU Anda belum menekan /start pada bot tersebut.");
      } else if (String(desc).includes("user is deactivated")) {
        message("Gagal: akun bot/token sudah tidak berlaku. Buat bot baru di @BotFather.");
      } else {
        message(`Gagal kirim (${json.error_code}): ${desc}`);
      }
      return false;
    }
  } catch (err) {
    console.error("Telegram send error:", err);
    message("Gagal mengirim notifikasi. Periksa koneksi internet / matikan blokir iklan pada browser (memikat fetch). Error: " + err.message);
    return false;
  }
}
window.sendTelegramNotification = sendTelegramNotification;

const testTelegramBtn = document.getElementById("test-telegram-btn");
if (testTelegramBtn) {
  testTelegramBtn.onclick = async () => {
    const testMsg = "<b>Klinik Rumah Sehat</b>\n\nTes koneksi Bot Telegram berhasil! Aplikasi siap mengirimkan laporan secara real-time.";
    message("Mengirim pesan uji coba ke Telegram...");
    const success = await sendTelegramNotification(testMsg);
    if (success) {
      message("Notifikasi Telegram berhasil dikirim!");
    }
  };
}
