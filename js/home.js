// Modul Beranda: Widget Statistik Ringkas (Pasien Hari Ini & Total Catatan Atlas)
// serta Feed Dokumentasi & Kegiatan (Gaya Status/Postingan) + Multi-upload Cloudinary.
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

const message = (s) => window.message(s);

// ==================== UTILS ====================
function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateIndo(dateStr) {
  if (!dateStr) return "";
  if (typeof dateStr === "string" && dateStr.includes("-")) {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
    }
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
  }
  return String(dateStr);
}

function openLightboxImage(src) {
  if (typeof window.openLightbox === "function") {
    window.openLightbox(src);
    return;
  }
  const dlg = document.getElementById("atlas-lightbox");
  const img = document.getElementById("lightbox-img");
  if (dlg && img) {
    img.src = src;
    dlg.showModal();
  }
}

// ==================== WIDGET STATISTIK RINGKAS ====================
export async function loadHomeStats() {
  const statPatientsEl = document.getElementById("stat-patients-today");
  const statAtlasEl = document.getElementById("stat-total-atlas");

  // 1. Hitung Jumlah Pasien Hari Ini dari Firestore
  if (statPatientsEl) {
    try {
      const todayStr = getTodayString();
      const patientsSnap = await getDocs(collection(db, "patients"));
      let todayCount = 0;

      patientsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data) return;

        // Cek kecocokan string tanggal (date, visitDate, sessionDate)
        if (data.date === todayStr || data.visitDate === todayStr || data.sessionDate === todayStr) {
          todayCount++;
          return;
        }

        // Cek timestamp createdAt atau visitDate
        const ts = data.createdAt || data.visitDate || data.date;
        if (ts && typeof ts.toDate === "function") {
          const d = ts.toDate();
          const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          if (ymd === todayStr) {
            todayCount++;
            return;
          }
        }

        // Cek array sessions jika ada riwayat kunjungan
        if (Array.isArray(data.sessions)) {
          const hadSessionToday = data.sessions.some((s) => {
            if (s.date === todayStr) return true;
            if (s.createdAt && typeof s.createdAt.toDate === "function") {
              const d = s.createdAt.toDate();
              const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              return ymd === todayStr;
            }
            return false;
          });
          if (hadSessionToday) todayCount++;
        }
      });

      statPatientsEl.textContent = String(todayCount);
    } catch (err) {
      console.error("Gagal menghitung pasien hari ini:", err);
      statPatientsEl.textContent = "0";
    }
  }

  // 2. Hitung Total Catatan Atlas dari Firestore
  if (statAtlasEl) {
    try {
      const atlasSnap = await getDocs(collection(db, "atlas"));
      statAtlasEl.textContent = String(atlasSnap.size);
    } catch (err) {
      console.error("Gagal menghitung total atlas:", err);
      statAtlasEl.textContent = "0";
    }
  }
}
window.loadHomeStats = loadHomeStats;

// ==================== FEED DOKUMENTASI & KEGIATAN ====================
let activitiesList = [];
// State foto modal form: array berisi item { type: 'existing' | 'new', url?: string, file?: File, previewUrl?: string }
let currentFormPhotos = [];

const feedEl = document.getElementById("activities-feed-list");
const activityDlg = document.getElementById("activity-dialog");
const activityForm = document.getElementById("activity-form");
const photoInput = document.getElementById("activity-photo-input");
const previewContainer = document.getElementById("activity-photos-preview");
const uploadStatusEl = document.getElementById("activity-upload-status");
const saveBtn = document.getElementById("save-activity-btn");

export async function loadActivities() {
  if (!feedEl) return;
  feedEl.innerHTML = '<div class="text-center py-6 text-gray-400 text-xs"><i class="fa-solid fa-spinner animate-spin text-base"></i> Memuat kegiatan...</div>';

  try {
    const snap = await getDocs(collection(db, "activities"));
    const items = [];
    snap.forEach((d) => {
      items.push({ id: d.id, ...d.data() });
    });

    // Urutkan berdasarkan tanggal kegiatan (terbaru lebih dulu), fallback ke createdAt
    items.sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      const timeA = a.createdAt && typeof a.createdAt.toMillis === "function" ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt && typeof b.createdAt.toMillis === "function" ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });

    activitiesList = items;
    renderActivitiesFeed();
  } catch (err) {
    console.error("Gagal memuat feed kegiatan:", err);
    feedEl.innerHTML = '<div class="text-center py-6 text-rose-500 text-xs">Gagal memuat dokumentasi kegiatan.</div>';
  }
}
window.loadActivities = loadActivities;

function renderActivitiesFeed() {
  if (!feedEl) return;
  feedEl.replaceChildren();

  if (!activitiesList.length) {
    const emptyCard = document.createElement("div");
    emptyCard.className = "bg-white border border-gray-200 rounded-2xl p-6 text-center space-y-2.5 shadow-sm";
    emptyCard.innerHTML = `
      <div class="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl">
        <i class="fa-solid fa-camera-retro"></i>
      </div>
      <h3 class="font-bold text-gray-800 text-sm">Belum Ada Dokumentasi Kegiatan</h3>
      <p class="text-xs text-gray-500">Mulai catat dan abadikan aktivitas terapi atau kegiatan klinik hari ini.</p>
      <button type="button" class="mt-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow inline-flex items-center gap-1.5 transition" onclick="document.getElementById('add-activity-btn').click()">
        <i class="fa-solid fa-plus"></i> Tambah Kegiatan Pertama
      </button>
    `;
    feedEl.append(emptyCard);
    return;
  }

  activitiesList.forEach((item) => {
    feedEl.append(buildActivityCard(item));
  });
}

function buildActivityCard(item) {
  const card = document.createElement("article");
  card.className = "bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3 transition hover:shadow-md hover:border-emerald-200";

  // HEADER KARTU (Gaya Postingan/Status Medsos)
  const header = document.createElement("div");
  header.className = "flex items-start justify-between gap-2";

  const userBlock = document.createElement("div");
  userBlock.className = "flex items-center gap-2.5";
  userBlock.innerHTML = `
    <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white flex items-center justify-center text-sm shadow font-bold shrink-0">
      <i class="fa-solid fa-stethoscope"></i>
    </div>
    <div>
      <h3 class="font-bold text-gray-900 text-sm leading-snug">${escapeHtml(item.title || "Tanpa Judul")}</h3>
      <p class="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
        <i class="fa-regular fa-calendar-days text-emerald-600"></i>
        <span>${formatDateIndo(item.date)}</span>
      </p>
    </div>
  `;

  // TOMBOL EDIT & HAPUS
  const actions = document.createElement("div");
  actions.className = "flex items-center gap-1 shrink-0";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "p-1.5 text-xs text-emerald-700 hover:bg-emerald-50 rounded-lg font-semibold flex items-center gap-1 transition";
  editBtn.title = "Edit Kegiatan";
  editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
  editBtn.onclick = () => openActivityDialog(item);

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "p-1.5 text-xs text-rose-500 hover:bg-rose-50 rounded-lg font-semibold flex items-center gap-1 transition";
  delBtn.title = "Hapus Kegiatan";
  delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
  delBtn.onclick = () => deleteActivityItem(item);

  actions.append(editBtn, delBtn);
  header.append(userBlock, actions);
  card.append(header);

  // KETERANGAN / DESKRIPSI KEGIATAN
  if (item.desc) {
    const descEl = document.createElement("p");
    descEl.className = "text-xs text-gray-700 leading-relaxed whitespace-pre-wrap";
    descEl.textContent = item.desc;
    card.append(descEl);
  }

  // GALERI FOTO GRID (1 - 4 FOTO)
  const photos = Array.isArray(item.photos) ? item.photos.filter(Boolean) : [];
  if (photos.length > 0) {
    const gallery = buildPhotoGallery(photos, item.title || "Foto Kegiatan");
    card.append(gallery);
  }

  return card;
}

function buildPhotoGallery(photos, title) {
  const container = document.createElement("div");
  container.className = "overflow-hidden rounded-xl border border-gray-100 bg-gray-50";

  const count = Math.min(photos.length, 4);

  if (count === 1) {
    // 1 Foto: Layar Penuh / Banner
    const img = document.createElement("img");
    img.src = photos[0];
    img.alt = title;
    img.loading = "lazy";
    img.className = "w-full max-h-72 h-56 object-cover cursor-pointer hover:opacity-95 transition";
    img.onclick = () => openLightboxImage(photos[0]);
    container.append(img);
  } else if (count === 2) {
    // 2 Foto: 2 Kolom Sejajar
    const grid = document.createElement("div");
    grid.className = "grid grid-cols-2 gap-1.5";
    photos.slice(0, 2).forEach((src) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = title;
      img.loading = "lazy";
      img.className = "w-full h-44 object-cover cursor-pointer hover:opacity-95 transition";
      img.onclick = () => openLightboxImage(src);
      grid.append(img);
    });
    container.append(grid);
  } else if (count === 3) {
    // 3 Foto: 1 Foto Atas Penuh + 2 Foto Bawah Berdampingan
    const grid = document.createElement("div");
    grid.className = "grid grid-cols-2 gap-1.5";

    const topImg = document.createElement("img");
    topImg.src = photos[0];
    topImg.alt = title;
    topImg.loading = "lazy";
    topImg.className = "col-span-2 w-full h-44 object-cover cursor-pointer hover:opacity-95 transition";
    topImg.onclick = () => openLightboxImage(photos[0]);
    grid.append(topImg);

    photos.slice(1, 3).forEach((src) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = title;
      img.loading = "lazy";
      img.className = "w-full h-32 object-cover cursor-pointer hover:opacity-95 transition";
      img.onclick = () => openLightboxImage(src);
      grid.append(img);
    });
    container.append(grid);
  } else {
    // 4 Foto: Grid 2x2 Simetris
    const grid = document.createElement("div");
    grid.className = "grid grid-cols-2 gap-1.5";
    photos.slice(0, 4).forEach((src) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = title;
      img.loading = "lazy";
      img.className = "w-full h-36 object-cover cursor-pointer hover:opacity-95 transition";
      img.onclick = () => openLightboxImage(src);
      grid.append(img);
    });
    container.append(grid);
  }

  return container;
}

// ==================== DIALOG FORM TAMBAH / EDIT KEGIATAN ====================
function openActivityDialog(item = null) {
  if (!activityForm) return;
  activityForm.reset();
  currentFormPhotos = [];

  const idInput = document.getElementById("activity-id");
  const titleInput = document.getElementById("activity-title");
  const dateInput = document.getElementById("activity-date");
  const descInput = document.getElementById("activity-desc");
  const dialogTitle = document.getElementById("activity-dialog-title");

  if (idInput) idInput.value = item ? item.id : "";
  if (titleInput) titleInput.value = item ? (item.title || "") : "";
  if (dateInput) dateInput.value = item ? (item.date || getTodayString()) : getTodayString();
  if (descInput) descInput.value = item ? (item.desc || "") : "";
  if (dialogTitle) dialogTitle.textContent = item ? "Edit Kegiatan" : "Tambah Kegiatan";

  // Muat foto existing jika sedang mengedit
  if (item && Array.isArray(item.photos)) {
    item.photos.slice(0, 4).forEach((url) => {
      if (url) currentFormPhotos.push({ type: "existing", url });
    });
  }

  renderPhotosPreview();

  if (uploadStatusEl) uploadStatusEl.classList.add("hidden");
  if (saveBtn) saveBtn.disabled = false;
  if (activityDlg) activityDlg.showModal();
}

function renderPhotosPreview() {
  if (!previewContainer) return;
  previewContainer.replaceChildren();

  if (!currentFormPhotos.length) {
    previewContainer.classList.add("hidden");
    return;
  }

  previewContainer.classList.remove("hidden");

  currentFormPhotos.forEach((p, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "relative group rounded-xl overflow-hidden border border-gray-200 aspect-square bg-gray-100 shadow-sm";

    const img = document.createElement("img");
    img.src = p.type === "existing" ? p.url : p.previewUrl;
    img.alt = `Preview ${idx + 1}`;
    img.className = "w-full h-full object-cover";

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs shadow hover:bg-rose-700 transition";
    delBtn.innerHTML = "×";
    delBtn.title = "Hapus foto";
    delBtn.onclick = () => {
      // Cabut Object URL jika bertipe file baru untuk hemat memori
      if (p.type === "new" && p.previewUrl) {
        URL.revokeObjectURL(p.previewUrl);
      }
      currentFormPhotos.splice(idx, 1);
      renderPhotosPreview();
    };

    wrap.append(img, delBtn);
    previewContainer.append(wrap);
  });
}

// Event handler pemilihan file foto (maksimal 4)
if (photoInput) {
  photoInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = 4 - currentFormPhotos.length;
    if (remainingSlots <= 0) {
      message("Maksimal 4 foto per kegiatan.");
      photoInput.value = "";
      return;
    }

    if (files.length > remainingSlots) {
      message(`Hanya ${remainingSlots} foto lagi yang dapat ditambahkan (maks. 4 foto).`);
    }

    const toAdd = files.slice(0, remainingSlots);
    toAdd.forEach((file) => {
      const previewUrl = URL.createObjectURL(file);
      currentFormPhotos.push({
        type: "new",
        file,
        previewUrl
      });
    });

    renderPhotosPreview();
    photoInput.value = "";
  });
}

// Submit form kegiatan (upload ke Cloudinary + simpan ke Firestore)
if (activityForm) {
  activityForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("activity-id")?.value;
    const title = document.getElementById("activity-title")?.value.trim();
    const date = document.getElementById("activity-date")?.value;
    const desc = document.getElementById("activity-desc")?.value.trim();

    if (!title) {
      message("Judul kegiatan wajib diisi.");
      return;
    }

    if (saveBtn) saveBtn.disabled = true;
    if (uploadStatusEl) uploadStatusEl.classList.remove("hidden");

    try {
      const finalPhotoUrls = [];

      // 1. Proses foto: unggah file baru ke Cloudinary, pertahankan URL foto lama
      for (let i = 0; i < currentFormPhotos.length; i++) {
        const item = currentFormPhotos[i];
        if (item.type === "existing") {
          finalPhotoUrls.push(item.url);
        } else if (item.type === "new" && item.file) {
          const statusText = document.getElementById("activity-upload-text");
          if (statusText) {
            statusText.textContent = `Mengunggah foto ${i + 1} dari ${currentFormPhotos.length}...`;
          }

          const formData = new FormData();
          formData.append("file", item.file);
          formData.append("upload_preset", "rumahsehat_asset");

          const res = await fetch("https://api.cloudinary.com/v1_1/u8fb8blx/image/upload", {
            method: "POST",
            body: formData
          });

          const data = await res.json();
          if (data && data.secure_url) {
            finalPhotoUrls.push(data.secure_url);
          } else {
            console.error("Gagal upload foto Cloudinary:", data);
          }
        }
      }

      // 2. Simpan ke koleksi Firestore "activities"
      if (id) {
        await updateDoc(doc(db, "activities", id), {
          title,
          date,
          desc,
          photos: finalPhotoUrls,
          updatedAt: serverTimestamp()
        });
        message("Kegiatan berhasil diperbarui!");
      } else {
        await addDoc(collection(db, "activities"), {
          title,
          date,
          desc,
          photos: finalPhotoUrls,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        message("Kegiatan berhasil diposting!");
      }

      if (activityDlg) activityDlg.close();
      loadActivities();
    } catch (err) {
      console.error("Gagal menyimpan kegiatan:", err);
      message("Gagal menyimpan kegiatan. Periksa koneksi.");
    } finally {
      if (saveBtn) saveBtn.disabled = false;
      if (uploadStatusEl) uploadStatusEl.classList.add("hidden");
    }
  });
}

// Hapus kegiatan
async function deleteActivityItem(item) {
  if (!confirm(`Hapus dokumentasi kegiatan "${item.title || "kegiatan ini"}"?`)) return;

  try {
    await deleteDoc(doc(db, "activities", item.id));
    message("Dokumentasi kegiatan berhasil dihapus.");
    loadActivities();
  } catch (err) {
    console.error("Gagal menghapus kegiatan:", err);
    message("Gagal menghapus kegiatan.");
  }
}

// ==================== EVENT LISTENER TOMBOL DIALOG ====================
const addActivityBtn = document.getElementById("add-activity-btn");
if (addActivityBtn) {
  addActivityBtn.onclick = () => openActivityDialog();
}

["close-activity-dialog", "cancel-activity-dialog"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) {
    el.onclick = () => {
      if (activityDlg) activityDlg.close();
    };
  }
});

// Helper XSS escape
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
