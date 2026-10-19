// Modul Manajemen Pasien & Rekam Medis + Integrasi Feed Beranda (Kegiatan)
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

const message = (s) => window.message(s);

// ==================== STATE ====================
let patientsList = [];
let currentPatient = null; // Pasien yang sedang dibuka rekam medisnya
let searchTerm = "";

// ==================== ELEMENT REFS ====================
const patientsListEl = document.getElementById("patients-list");
const patientsSearchEl = document.getElementById("patients-search");

const patientDlg = document.getElementById("patient-dialog");
const patientForm = document.getElementById("patient-form");
const patientDetailDlg = document.getElementById("patient-detail-dialog");

const sessionDlg = document.getElementById("session-dialog");
const sessionForm = document.getElementById("session-form");

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

// ==================== LOAD PATIENTS ====================
export async function loadPatients() {
  if (!patientsListEl) return;
  patientsListEl.innerHTML = '<div class="text-center py-8 text-gray-400 text-xs"><i class="fa-solid fa-spinner animate-spin text-base"></i> Memuat data pasien...</div>';

  try {
    const q = query(collection(db, "patients"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const items = [];
    snap.forEach((d) => {
      items.push({ id: d.id, ...d.data() });
    });
    patientsList = items;
    renderPatientsList();
  } catch (err) {
    console.error("Gagal memuat pasien:", err);
    if (patientsListEl) {
      patientsListEl.innerHTML = '<div class="text-center py-8 text-rose-500 text-xs">Gagal memuat data pasien dari Cloud.</div>';
    }
  }
}
window.loadPatients = loadPatients;

// ==================== RENDER PATIENTS LIST ====================
function matchesSearch(p) {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return true;
  return [p.regId, p.name, p.phone, p.address, p.complaint]
    .some(f => (f || "").toLowerCase().includes(term));
}

function renderPatientsList() {
  if (!patientsListEl) return;
  patientsListEl.replaceChildren();

  const filtered = patientsList.filter(matchesSearch);

  if (!patientsList.length) {
    const empty = document.createElement("div");
    empty.className = "bg-white border border-gray-200 rounded-2xl p-6 text-center space-y-2.5 shadow-sm";
    empty.innerHTML = `
      <div class="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl">
        <i class="fa-solid fa-clipboard-user"></i>
      </div>
      <h3 class="font-bold text-gray-800 text-sm">Belum Ada Data Pasien</h3>
      <p class="text-xs text-gray-500">Mulai catat rekam medis dan riwayat kunjungan pasien klinik.</p>
      <button type="button" class="mt-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow inline-flex items-center gap-1.5 transition" onclick="document.getElementById('add-patient-btn').click()">
        <i class="fa-solid fa-plus"></i> Tambah Pasien Pertama
      </button>
    `;
    patientsListEl.append(empty);
    return;
  }

  if (!filtered.length) {
    const noResult = document.createElement("div");
    noResult.className = "bg-white border border-gray-200 rounded-2xl p-6 text-center";
    noResult.innerHTML = '<i class="fa-solid fa-magnifying-glass text-xl text-gray-300"></i><p class="text-xs text-gray-500 pt-2">Tidak ada pasien yang sesuai dengan pencarian.</p>';
    patientsListEl.append(noResult);
    return;
  }

  filtered.forEach((patient) => {
    patientsListEl.append(buildPatientCard(patient));
  });
}

function buildPatientCard(patient) {
  const card = document.createElement("div");
  card.className = "bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-2.5 hover:border-emerald-300 hover:shadow-md transition cursor-pointer";
  card.onclick = () => openPatientDetail(patient);

  const top = document.createElement("div");
  top.className = "flex justify-between items-start gap-2";

  const info = document.createElement("div");
  info.className = "space-y-0.5";
  
  const regBadge = document.createElement("span");
  regBadge.className = "text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-100";
  regBadge.textContent = patient.regId || "REG-001";

  const name = document.createElement("h3");
  name.className = "font-bold text-gray-900 text-sm leading-snug pt-1";
  name.textContent = patient.name || "Tanpa Nama";

  info.append(regBadge, name);

  const stats = document.createElement("div");
  stats.className = "text-right shrink-0";
  const sessionsCount = Array.isArray(patient.sessions) ? patient.sessions.length : 0;
  stats.innerHTML = `
    <span class="text-[11px] font-semibold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-xl block">${sessionsCount} Sesi</span>
    <span class="text-[10px] text-gray-400 mt-0.5 block">${patient.age || "-"}</span>
  `;

  top.append(info, stats);
  card.append(top);

  if (patient.complaint) {
    const comp = document.createElement("p");
    comp.className = "text-xs text-gray-600 line-clamp-1 italic";
    comp.textContent = `Keluhan: ${patient.complaint}`;
    card.append(comp);
  }

  const footer = document.createElement("div");
  footer.className = "flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-400";
  footer.innerHTML = `
    <span><i class="fa-solid fa-phone text-emerald-600"></i> ${patient.phone || "-"}</span>
    <span class="text-emerald-600 font-semibold inline-flex items-center gap-1">Rekam Medis <i class="fa-solid fa-chevron-right text-[9px]"></i></span>
  `;
  card.append(footer);

  return card;
}

// Search input listener
if (patientsSearchEl) {
  patientsSearchEl.addEventListener("input", (e) => {
    searchTerm = e.target.value;
    renderPatientsList();
  });
}

// ==================== PATIENT DIALOG (ADD / EDIT) ====================
function openPatientDialog(patient = null) {
  if (!patientForm) return;
  patientForm.reset();

  const idInput = document.getElementById("patient-id");
  const nameInput = document.getElementById("patient-name");
  const phoneInput = document.getElementById("patient-phone");
  const ageInput = document.getElementById("patient-age");
  const addressInput = document.getElementById("patient-address");
  const complaintInput = document.getElementById("patient-complaint");
  const dialogTitle = document.getElementById("patient-dialog-title");

  if (idInput) idInput.value = patient ? patient.id : "";
  if (nameInput) nameInput.value = patient ? (patient.name || "") : "";
  if (phoneInput) phoneInput.value = patient ? (patient.phone || "") : "";
  if (ageInput) ageInput.value = patient ? (patient.age || "") : "";
  if (addressInput) addressInput.value = patient ? (patient.address || "") : "";
  if (complaintInput) complaintInput.value = patient ? (patient.complaint || "") : "";
  if (dialogTitle) dialogTitle.textContent = patient ? "Edit Data Pasien" : "Tambah Pasien";

  if (patientDlg) patientDlg.showModal();
}

const addPatientBtn = document.getElementById("add-patient-btn");
if (addPatientBtn) {
  addPatientBtn.onclick = () => openPatientDialog();
}

["close-patient-dialog", "cancel-patient-dialog"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) {
    el.onclick = () => { if (patientDlg) patientDlg.close(); };
  }
});

// Submit Patient Form
if (patientForm) {
  patientForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("patient-id")?.value;
    const name = document.getElementById("patient-name")?.value.trim();
    const phone = document.getElementById("patient-phone")?.value.trim();
    const age = document.getElementById("patient-age")?.value.trim();
    const address = document.getElementById("patient-address")?.value.trim();
    const complaint = document.getElementById("patient-complaint")?.value.trim();

    if (!name) {
      message("Nama pasien wajib diisi.");
      return;
    }

    try {
      if (id) {
        // Edit
        await updateDoc(doc(db, "patients", id), {
          name,
          phone,
          age,
          address,
          complaint,
          updatedAt: serverTimestamp()
        });
        message("Data pasien berhasil diperbarui!");
      } else {
        // Tambah baru dengan regId otomatis (e.g. REG- + timestamp/random or count)
        const regId = `REG-${String(patientsList.length + 1).padStart(3, "0")}`;
        await addDoc(collection(db, "patients"), {
          regId,
          name,
          phone,
          age,
          address,
          complaint,
          sessions: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        message("Pasien baru berhasil didaftarkan!");
      }

      if (patientDlg) patientDlg.close();
      loadPatients();
      if (currentPatient && id === currentPatient.id) {
        // Refresh detail jika sedang dibuka
        const updatedSnap = await getDocs(query(collection(db, "patients"), orderBy("createdAt", "desc")));
        const found = updatedSnap.docs.find(d => d.id === id);
        if (found) {
          openPatientDetail({ id: found.id, ...found.data() });
        }
      }
    } catch (err) {
      console.error("Gagal menyimpan pasien:", err);
      message("Gagal menyimpan data pasien.");
    }
  });
}

// ==================== PATIENT DETAIL & SESSIONS ====================
function openPatientDetail(patient) {
  currentPatient = patient;
  if (!patientDetailDlg) return;

  document.getElementById("detail-patient-id").textContent = patient.regId || "REG-001";
  document.getElementById("detail-patient-name").textContent = patient.name || "Tanpa Nama";
  document.getElementById("detail-patient-age").textContent = patient.age || "-";
  document.getElementById("detail-patient-phone").textContent = patient.phone || "-";
  document.getElementById("detail-patient-address").textContent = patient.address || "-";
  document.getElementById("detail-patient-complaint").textContent = patient.complaint || "Belum ada keluhan utama.";

  renderPatientSessions();
  patientDetailDlg.showModal();
}

const closePatientDetailBtn = document.getElementById("close-patient-detail");
if (closePatientDetailBtn) {
  closePatientDetailBtn.onclick = () => {
    if (patientDetailDlg) patientDetailDlg.close();
  };
}

const editPatientBtn = document.getElementById("edit-patient-btn");
if (editPatientBtn) {
  editPatientBtn.onclick = () => {
    if (currentPatient) openPatientDialog(currentPatient);
  };
}

const deletePatientBtn = document.getElementById("delete-patient-btn");
if (deletePatientBtn) {
  deletePatientBtn.onclick = async () => {
    if (!currentPatient) return;
    if (!confirm(`Hapus data rekam medis pasien "${currentPatient.name}" secara permanen?`)) return;

    try {
      await deleteDoc(doc(db, "patients", currentPatient.id));
      message("Data pasien berhasil dihapus.");
      if (patientDetailDlg) patientDetailDlg.close();
      loadPatients();
    } catch (err) {
      console.error("Gagal menghapus pasien:", err);
      message("Gagal menghapus pasien.");
    }
  };
}

function renderPatientSessions() {
  const container = document.getElementById("patient-sessions-list");
  if (!container) return;
  container.replaceChildren();

  const sessions = Array.isArray(currentPatient?.sessions) ? currentPatient.sessions : [];

  if (!sessions.length) {
    const empty = document.createElement("div");
    empty.className = "bg-white border border-gray-200 rounded-2xl p-5 text-center space-y-2 shadow-sm";
    empty.innerHTML = `
      <div class="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-base">
        <i class="fa-solid fa-stethoscope"></i>
      </div>
      <h4 class="font-bold text-gray-800 text-xs">Belum Ada Sesi Penanganan</h4>
      <p class="text-xs text-gray-500">Tekan tombol Tambah Sesi untuk mencatat tahap terapi baru.</p>
    `;
    container.append(empty);
    return;
  }

  sessions.forEach((session, index) => {
    const card = document.createElement("div");
    card.className = "bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-2.5";

    const header = document.createElement("div");
    header.className = "flex justify-between items-start gap-2";

    const titleArea = document.createElement("div");
    titleArea.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">${escapeHtml(session.stage || "Sesi")}</span>
        <span class="text-[11px] font-semibold text-emerald-700">${escapeHtml(session.method || "Terapi")}</span>
      </div>
      <p class="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
        <i class="fa-regular fa-calendar-days text-emerald-600"></i> ${formatDateIndo(session.date)}
      </p>
    `;

    const btnGroup = document.createElement("div");
    btnGroup.className = "flex items-center gap-1 shrink-0";

    const delSessionBtn = document.createElement("button");
    delSessionBtn.type = "button";
    delSessionBtn.className = "p-1.5 text-xs text-rose-500 hover:bg-rose-50 rounded-lg transition";
    delSessionBtn.title = "Hapus Sesi";
    delSessionBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    delSessionBtn.onclick = () => deleteSession(index);

    btnGroup.append(delSessionBtn);
    header.append(titleArea, btnGroup);
    card.append(header);

    if (session.notes) {
      const notes = document.createElement("p");
      notes.className = "text-xs text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 p-2.5 rounded-xl border border-gray-100";
      notes.textContent = session.notes;
      card.append(notes);
    }

    if (session.photoUrl) {
      const img = document.createElement("img");
      img.src = session.photoUrl;
      img.alt = session.stage || "Foto penanganan";
      img.loading = "lazy";
      img.className = "w-full h-44 object-cover rounded-xl cursor-pointer hover:opacity-95 transition border border-gray-100";
      img.onclick = () => openLightboxImage(session.photoUrl);
      card.append(img);
    }

    container.append(card);
  });
}

// ==================== TREATMENT SESSION FORM & BERANDA INTEGRATION ====================
let currentSessionPhotoFile = null;

function openSessionDialog() {
  if (!sessionForm) return;
  sessionForm.reset();
  currentSessionPhotoFile = null;

  document.getElementById("session-patient-id").value = currentPatient ? currentPatient.id : "";
  document.getElementById("session-index").value = "";
  document.getElementById("session-photo-url").value = "";
  document.getElementById("session-date").value = getTodayString();
  document.getElementById("session-stage").value = `Sesi ${(currentPatient?.sessions?.length || 0) + 1}`;
  document.getElementById("session-post-home").checked = true; // Default dicentang sesuai kenyamanan

  const previewWrap = document.getElementById("session-photo-preview-wrap");
  if (previewWrap) previewWrap.classList.add("hidden");

  const statusEl = document.getElementById("session-upload-status");
  if (statusEl) statusEl.classList.add("hidden");

  if (sessionDlg) sessionDlg.showModal();
}

const addSessionBtn = document.getElementById("add-session-btn");
if (addSessionBtn) {
  addSessionBtn.onclick = () => openSessionDialog();
}

["close-session-dialog", "cancel-session-dialog"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) {
    el.onclick = () => { if (sessionDlg) sessionDlg.close(); };
  }
});

// Session photo input preview & handler
const sessionPhotoFileEl = document.getElementById("session-photo-file");
if (sessionPhotoFileEl) {
  sessionPhotoFileEl.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    currentSessionPhotoFile = file;
    const preview = document.getElementById("session-photo-preview");
    const previewWrap = document.getElementById("session-photo-preview-wrap");
    if (preview && previewWrap) {
      preview.src = URL.createObjectURL(file);
      previewWrap.classList.remove("hidden");
    }
  });
}

// Submit Session Form (Simpan ke rekam medis pasien & opsional Post ke Beranda)
if (sessionForm) {
  sessionForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentPatient) return;

    const stage = document.getElementById("session-stage")?.value.trim() || "Sesi";
    const date = document.getElementById("session-date")?.value || getTodayString();
    const method = document.getElementById("session-method")?.value || "Terapi";
    const notes = document.getElementById("session-notes")?.value.trim() || "";
    const postToHome = document.getElementById("session-post-home")?.checked || false;

    const saveBtn = document.getElementById("save-session-btn");
    const uploadStatus = document.getElementById("session-upload-status");

    if (saveBtn) saveBtn.disabled = true;
    if (uploadStatus) uploadStatus.classList.remove("hidden");

    try {
      let photoUrl = document.getElementById("session-photo-url")?.value || "";

      // 1. Upload foto penanganan ke Cloudinary jika ada file baru
      if (currentSessionPhotoFile) {
        if (uploadStatus) uploadStatus.textContent = "Mengunggah foto penanganan ke Cloudinary...";
        const formData = new FormData();
        formData.append("file", currentSessionPhotoFile);
        formData.append("upload_preset", "rumahsehat_asset");

        const res = await fetch("https://api.cloudinary.com/v1_1/u8fb8blx/image/upload", {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        if (data && data.secure_url) {
          photoUrl = data.secure_url;
        } else {
          console.error("Gagal upload foto ke Cloudinary:", data);
        }
      }

      const newSession = {
        stage,
        date,
        method,
        photoUrl,
        notes,
        createdAt: new Date().toISOString()
      };

      // 2. Simpan ke rekam medis pasien di koleksi "patients"
      const updatedSessions = Array.isArray(currentPatient.sessions) ? [...currentPatient.sessions, newSession] : [newSession];

      await updateDoc(doc(db, "patients", currentPatient.id), {
        sessions: updatedSessions,
        updatedAt: serverTimestamp()
      });

      // Update currentPatient local state
      currentPatient.sessions = updatedSessions;

      // 3. Jika opsi 'Posting ke Beranda' dicentang, buat dokumen baru di koleksi "activities"
      if (postToHome) {
        if (uploadStatus) uploadStatus.textContent = "Memposting ke Beranda...";
        await addDoc(collection(db, "activities"), {
          title: `Penanganan Pasien: ${currentPatient.name} (${method})`,
          date: date,
          desc: notes || `Sesi penanganan ${stage} untuk pasien ${currentPatient.name} menggunakan metode ${method}.`,
          photos: photoUrl ? [photoUrl] : [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Sinkronisasi otomatis feed Beranda tanpa refresh halaman
        if (typeof window.loadActivities === "function") {
          window.loadActivities();
        }
        if (typeof window.loadHomeStats === "function") {
          window.loadHomeStats();
        }
      }

      message("Sesi penanganan berhasil disimpan!");
      if (sessionDlg) sessionDlg.close();

      // Refresh tampilan rekam medis & daftar pasien
      openPatientDetail(currentPatient);
      loadPatients();

    } catch (err) {
      console.error("Gagal menyimpan sesi penanganan:", err);
      message("Gagal menyimpan sesi penanganan. Periksa koneksi.");
    } finally {
      if (saveBtn) saveBtn.disabled = false;
      if (uploadStatus) uploadStatus.classList.add("hidden");
    }
  });
}

// Hapus sesi penanganan
async function deleteSession(index) {
  if (!currentPatient || !Array.isArray(currentPatient.sessions)) return;
  if (!confirm("Hapus sesi penanganan ini dari rekam medis?")) return;

  try {
    const updatedSessions = [...currentPatient.sessions];
    updatedSessions.splice(index, 1);

    await updateDoc(doc(db, "patients", currentPatient.id), {
      sessions: updatedSessions,
      updatedAt: serverTimestamp()
    });

    currentPatient.sessions = updatedSessions;
    message("Sesi penanganan berhasil dihapus.");
    openPatientDetail(currentPatient);
    loadPatients();
  } catch (err) {
    console.error("Gagal menghapus sesi:", err);
    message("Gagal menghapus sesi penanganan.");
  }
}

// Helper XSS escape
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
