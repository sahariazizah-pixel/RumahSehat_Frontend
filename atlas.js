import { db } from "./firebase-config.js";
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { message } from "./app.js";

const dlg = document.getElementById("atlas-dialog");
const form = document.getElementById("atlas-form");
const list = document.getElementById("atlas-list");

export async function loadAtlas() {
  if(!list) return;
  list.innerHTML = '<div class="text-center py-8 text-gray-400 text-xs"><i class="fa-solid fa-spinner animate-spin text-base"></i> Memuat data dari Cloud...</div>';
  try {
    const q = query(collection(db, "atlas"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    list.replaceChildren();
    
    if(querySnapshot.empty){
      const e = document.createElement("div");
      e.className = "bg-white border border-gray-200 rounded-2xl p-6 text-center space-y-2";
      e.innerHTML = '<i class="fa-solid fa-book-medical text-2xl text-emerald-600"></i><h3 class="font-bold text-gray-800 text-sm">Belum ada data</h3><p class="text-xs text-gray-500">Tekan Tambah untuk membuat catatan.</p>';
      list.append(e);
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const item = { id: docSnap.id, ...docSnap.data() };
      const card = document.createElement("article");
      card.className = "bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-sm";
      
      if(item.imageUrl){
        const img = document.createElement("img");
        img.src = item.imageUrl;
        img.className = "w-full h-36 object-cover rounded-xl border border-gray-100";
        card.append(img);
      }

      const top = document.createElement("div");
      top.className = "flex justify-between items-start";
      const h = document.createElement("h3");
      h.className = "font-bold text-gray-800 text-sm";
      h.textContent = item.name;
      const chip = document.createElement("span");
      chip.className = "text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-100";
      chip.textContent = item.category || "Tanpa kategori";
      top.append(h, chip);
      
      const p = document.createElement("p");
      p.className = "text-xs text-gray-600 leading-relaxed whitespace-pre-wrap";
      p.textContent = item.desc;
      
      const actions = document.createElement("div");
      actions.className = "flex justify-end space-x-3 pt-2 border-t border-gray-50 text-xs font-semibold";
      const edit = document.createElement("button");
      edit.className = "text-emerald-600 hover:text-emerald-700";
      edit.textContent = "Edit";
      edit.onclick = () => openDialog(item);
      const del = document.createElement("button");
      del.className = "text-rose-500 hover:text-rose-600";
      del.textContent = "Hapus";
      del.onclick = async () => {
        if(confirm("Hapus catatan " + item.name + "?")){
          try {
            await deleteDoc(doc(db, "atlas", item.id));
            loadAtlas();
            message("Catatan dihapus dari Cloud.");
          } catch(err) { message("Gagal menghapus."); }
        }
      };
      actions.append(edit, del);
      card.append(top, p, actions);
      list.append(card);
    });
  } catch(err) {
    console.error(err);
    if(list) list.innerHTML = '<div class="text-center py-8 text-rose-500 text-xs">Gagal memuat data dari Cloud.</div>';
  }
}

window.loadAtlas = loadAtlas;

function openDialog(item = null){
  if(!form) return;
  form.reset();
  const editId = document.getElementById("edit-id");
  if(editId) editId.value = item ? item.id : "";
  const atlasImageUrl = document.getElementById("atlas-image-url");
  if(atlasImageUrl) atlasImageUrl.value = item ? (item.imageUrl || "") : "";
  const dlgTitle = document.getElementById("dialog-title");
  if(dlgTitle) dlgTitle.textContent = item ? "Edit Titik Atlas" : "Tambah Titik Atlas";
  const atlasName = document.getElementById("atlas-name");
  if(atlasName) atlasName.value = item ? item.name : "";
  const atlasCat = document.getElementById("atlas-category");
  if(atlasCat) atlasCat.value = item ? (item.category || "") : "";
  const atlasDesc = document.getElementById("atlas-desc");
  if(atlasDesc) atlasDesc.value = item ? item.desc : "";
  const uploadStatus = document.getElementById("upload-status");
  if(uploadStatus) uploadStatus.classList.add("hidden");
  if(dlg) dlg.showModal();
}

const addAtlasBtn = document.getElementById("add-atlas");
if(addAtlasBtn) addAtlasBtn.onclick = () => openDialog();

["close-dialog", "cancel-dialog"].forEach(id => {
  const el = document.getElementById(id);
  if(el) el.onclick = () => { if(dlg) dlg.close(); };
});

if(form) {
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const idEl = document.getElementById("edit-id");
    const id = idEl ? idEl.value : "";
    const nameEl = document.getElementById("atlas-name");
    const name = nameEl ? nameEl.value.trim() : "";
    const catEl = document.getElementById("atlas-category");
    const category = catEl ? catEl.value : "";
    const descEl = document.getElementById("atlas-desc");
    const desc = descEl ? descEl.value.trim() : "";
    const imgUrlEl = document.getElementById("atlas-image-url");
    let imageUrl = imgUrlEl ? imgUrlEl.value : "";

    const fileInput = document.getElementById("atlas-image-file");
    const submitBtn = document.getElementById("submit-btn");
    const uploadStatus = document.getElementById("upload-status");

    if(submitBtn) submitBtn.disabled = true;

    if(fileInput && fileInput.files.length > 0){
      if(uploadStatus) uploadStatus.classList.remove("hidden");
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
        if(json.secure_url) imageUrl = json.secure_url;
      } catch(err) { console.error(err); }
    }

    try {
      const record = { name, category, desc, imageUrl, createdAt: serverTimestamp() };
      if(id){
        await updateDoc(doc(db, "atlas", id), { name, category, desc, imageUrl });
        message("Catatan diperbarui.");
      } else {
        await addDoc(collection(db, "atlas"), record);
        message("Catatan baru disimpan.");
      }
      if(dlg) dlg.close();
      loadAtlas();
    } catch(err) {
      message("Gagal menyimpan.");
    } finally {
      if(submitBtn) submitBtn.disabled = false;
      if(uploadStatus) uploadStatus.classList.add("hidden");
    }
  });
}
