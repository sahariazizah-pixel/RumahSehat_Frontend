// CRUD Atlas Titik Terapi (Firestore) + pencarian realtime, filter chips kategori,
// dialog detail layar-penuh, dan lightbox pratinjau foto.
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

const message = (s) => window.message(s);

// ==================== STATE ====================
let atlasItems = [];
let activeCategory = "";   // "" = Semua
let searchTerm = "";

// ==================== ELEMENT REFS ====================
const listEl = document.getElementById("atlas-list");
const chipsEl = document.getElementById("atlas-filter-chips");
const searchEl = document.getElementById("atlas-search");

const atlasDlg = document.getElementById("atlas-dialog");
const atlasForm = document.getElementById("atlas-form");
const atlasDetailDlg = document.getElementById("atlas-detail-dialog");
const lightboxDlg = document.getElementById("atlas-lightbox");

// ==================== UTIL ====================
function formatDate(ts) {
  const d = ts && typeof ts.toDate === "function" ? ts.toDate() : null;
  if (!d) return "";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeStyle: "short" }).format(d);
}

// ==================== LOAD (terurut terbaru) ====================
window.loadAtlas = async function() {
  if (!listEl) return;
  listEl.innerHTML = '<div class="text-center py-8 text-gray-400 text-xs"><i class="fa-solid fa-spinner animate-spin text-base"></i> Memuat data dari Cloud...</div>';
  try {
    const q = query(collection(db, "atlas"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    atlasItems = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAtlasChips();
    renderAtlasList();
  } catch (err) {
    console.error(err);
    if (listEl) listEl.innerHTML = '<div class="text-center py-8 text-rose-500 text-xs">Gagal memuat data dari Cloud.</div>';
  }
};

// ==================== FILTER CHIPS ====================
function renderAtlasChips() {
  if (!chipsEl) return;
  chipsEl.replaceChildren();

  const categories = [...new Set(atlasItems.map(i => i.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "id", { numeric: true }));

  const defs = [{ value: "", label: "Semua" }, ...categories.map(c => ({ value: c, label: c }))];

  defs.forEach(def => {
    const b = document.createElement("button");
    b.type = "button";
    const active = activeCategory === def.value;
    b.className = active
      ? "shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-emerald-600 text-white shadow"
      : "shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white text-gray-600 border border-gray-200 hover:border-emerald-300 hover:text-emerald-700 transition";
    b.textContent = def.label;
    b.onclick = () => {
      activeCategory = def.value;
      renderAtlasChips();
      renderAtlasList();
    };
    chipsEl.append(b);
  });
}

// ==================== PENCARIAN REALTIME ====================
function matchesFilters(item) {
  if (activeCategory && item.category !== activeCategory) return false;
  const term = searchTerm.trim().toLowerCase();
  if (!term) return true;
  return [item.name, item.category, item.indications, item.desc]
    .some(f => (f || "").toLowerCase().includes(term));
}

// ==================== DAFTAR KARTU RINGKAS ====================
function renderAtlasList() {
  if (!listEl) return;
  listEl.replaceChildren();

  const items = atlasItems.filter(matchesFilters);

  if (!atlasItems.length) {
    const e = document.createElement("div");
    e.className = "bg-white border border-gray-200 rounded-2xl p-6 text-center space-y-2";
    e.innerHTML = '<i class="fa-solid fa-book-medical text-2xl text-emerald-600"></i><h3 class="font-bold text-gray-800 text-sm">Belum ada data</h3><p class="text-xs text-gray-500">Tekan Tambah untuk membuat catatan.</p>';
    listEl.append(e);
    return;
  }

  if (!items.length) {
    const e = document.createElement("div");
    e.className = "bg-white border border-gray-200 rounded-2xl p-6 text-center";
    e.innerHTML = `<i class="fa-solid fa-magnifying-glass text-xl text-gray-300"></i><p class="text-xs text-gray-500 pt-2">Tidak ada hasil untuk pencarian ini.</p>`;
    listEl.append(e);
    return;
  }

  items.forEach(item => listEl.append(buildCard(item)));
}

function buildCard(item) {
  const card = document.createElement("article");
  card.className = "bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm cursor-pointer hover:border-emerald-300 hover:shadow-md transition";
  card.onclick = () => openAtlasDetail(item);

  // Thumbnail foto (ringkas)
  if (item.imageUrl) {
    const img = document.createElement("img");
    img.src = item.imageUrl;
    img.alt = item.name || "";
    img.loading = "lazy";
    img.className = "w-full h-40 object-cover";
    // Klik foto => lightbox, bukan detail
    img.onclick = (e) => { e.stopPropagation(); openLightbox(item.imageUrl); };
    card.append(img);
  }

  const body = document.createElement("div");
  body.className = "p-3.5 space-y-1.5";

  // Judul + chip kategori
  const top = document.createElement("div");
  top.className = "flex justify-between items-start gap-2";
  const h = document.createElement("h3");
  h.className = "font-bold text-gray-800 text-sm leading-snug";
  h.textContent = item.name || "Tanpa judul";
  const chip = document.createElement("span");
  chip.className = "shrink-0 text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-100";
  chip.textContent = item.category || "Tanpa kategori";
  top.append(h, chip);

  // Ringkasan indikasi saja (bukan isi penuh)
  const ind = document.createElement("p");
  ind.className = "text-xs text-gray-500 leading-relaxed line-clamp-2";
  ind.textContent = item.indications || "Indikasi belum diisi.";

  const hint = document.createElement("span");
  hint.className = "text-[10px] text-emerald-600 font-semibold inline-flex items-center gap-1 pt-0.5";
  hint.innerHTML = 'Baca detail lengkap <i class="fa-solid fa-chevron-right text-[9px]"></i>';

  body.append(top, ind, hint);
  card.append(body);
  return card;
}

// ==================== MODAL DETAIL LAYAR PENUH ====================
function openAtlasDetail(item) {
  if (!atlasDetailDlg) return;
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || "";
  };
  setText("detail-title", item.name || "Tanpa judul");
  setText("detail-category", item.category || "Tanpa kategori");
  setText("detail-indications-text", item.indications || "Indikasi belum diisi.");
  setText("detail-text", item.desc || "");

  const dateEl = document.getElementById("detail-date");
  if (dateEl) dateEl.textContent = formatDate(item.createdAt);

  const wrap = document.getElementById("detail-image-wrap");
  const imgTag = document.getElementById("detail-image");
  if (item.imageUrl) {
    if (wrap) wrap.classList.remove("hidden");
    if (imgTag) {
      imgTag.src = item.imageUrl;
      imgTag.onclick = () => openLightbox(item.imageUrl);
    }
  } else {
    if (wrap) wrap.classList.add("hidden");
  }

  const editBtn = document.getElementById("detail-edit");
  if (editBtn) editBtn.onclick = () => {
    atlasDetailDlg.close();
    openAtlasDialog(item);
  };

  const delBtn = document.getElementById("detail-delete");
  if (delBtn) delBtn.onclick = () => deleteAtlasItem(item);

  atlasDetailDlg.showModal();
}

async function deleteAtlasItem(item) {
  if (!confirm("Hapus catatan \"" + item.name + "\"?")) return;
  try {
    await deleteDoc(doc(db, "atlas", item.id));
    if (atlasDetailDlg && atlasDetailDlg.open) atlasDetailDlg.close();
    window.loadAtlas();
    message("Catatan dihapus dari Cloud.");
  } catch (err) {
    message("Gagal menghapus.");
  }
}

// ==================== LIGHTBOX FOTO LAYAR PENUH ====================
function openLightbox(src) {
  const img = document.getElementById("lightbox-img");
  if (!img || !lightboxDlg) return;
  img.src = src;
  lightboxDlg.showModal();
}
window.openLightbox = openLightbox;

// ==================== FORM ATLAS (ADAPTIF) ====================
function openAtlasDialog(item = null) {
  if (!atlasForm) return;
  atlasForm.reset();
  document.getElementById("edit-id").value = item ? item.id : "";
  document.getElementById("atlas-image-url").value = item ? (item.imageUrl || "") : "";
  document.getElementById("dialog-title").textContent = item ? "Edit Materi Atlas" : "Tambah Materi Atlas";
  document.getElementById("atlas-name").value = item ? (item.name || "") : "";
  document.getElementById("atlas-category").value = item ? (item.category || "") : "";
  document.getElementById("atlas-indications").value = item ? (item.indications || "") : "";
  document.getElementById("atlas-desc").value = item ? (item.desc || "") : "";
  const uploadStatus = document.getElementById("upload-status");
  if (uploadStatus) uploadStatus.classList.add("hidden");
  if (atlasDlg) atlasDlg.showModal();
}

const addAtlasBtn = document.getElementById("add-atlas");
if (addAtlasBtn) addAtlasBtn.onclick = () => openAtlasDialog();

["close-dialog", "cancel-dialog"].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.onclick = () => { if (atlasDlg) atlasDlg.close(); };
});

const closeDetailBtn = document.getElementById("close-detail");
if (closeDetailBtn) closeDetailBtn.onclick = () => { if (atlasDetailDlg) atlasDetailDlg.close(); };

const closeLightboxBtn = document.getElementById("close-lightbox");
if (closeLightboxBtn) closeLightboxBtn.onclick = () => { if (lightboxDlg) lightboxDlg.close(); };

// Pencarian realtime
if (searchEl) {
  searchEl.oninput = () => {
    searchTerm = searchEl.value;
    renderAtlasList();
  };
}

if (atlasForm) {
  atlasForm.addEventListener("submit", async e => {
    e.preventDefault();
    const id = document.getElementById("edit-id").value;
    const name = document.getElementById("atlas-name").value.trim();
    const category = document.getElementById("atlas-category").value;
    const indications = document.getElementById("atlas-indications").value.trim();
    const desc = document.getElementById("atlas-desc").value.trim();
    let imageUrl = document.getElementById("atlas-image-url").value;

    const fileInput = document.getElementById("atlas-image-file");
    const submitBtn = document.getElementById("submit-btn");
    const uploadStatus = document.getElementById("upload-status");

    if (submitBtn) submitBtn.disabled = true;

    if (fileInput && fileInput.files.length > 0) {
      if (uploadStatus) uploadStatus.classList.remove("hidden");
      const file = fileInput.files[0];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "rumahsehat_asset");

      try {
        const res = await fetch("https://api.cloudinary.com/v1_1/u8fb8blx/image/upload", {
          method: "POST",
          body: formData
        });
        const json = await res.json();
        if (json.secure_url) imageUrl = json.secure_url;
      } catch (err) { console.error(err); }
    }

    try {
      // Data terurut terbaru: createdAt diisi hanya saat membuat dokumen baru
      if (id) {
        await updateDoc(doc(db, "atlas", id), { name, category, desc, indications, imageUrl });
        message("Materi diperbarui.");
      } else {
        await addDoc(collection(db, "atlas"), { name, category, desc, indications, imageUrl, createdAt: serverTimestamp() });
        message("Materi baru disimpan.");
      }
      if (atlasDlg) atlasDlg.close();
      window.loadAtlas();
    } catch (err) {
      console.error(err);
      message("Gagal menyimpan.");
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (uploadStatus) uploadStatus.classList.add("hidden");
    }
  });
}
