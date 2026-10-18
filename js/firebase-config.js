// Konfigurasi & inisialisasi Firebase.
// Modul lain memakai: import { db } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDmsO4vPpT0A-D4CLzUvBSy6G0skT9pldY",
  authDomain: "rumahsehat-dd146.firebaseapp.com",
  projectId: "rumahsehat-dd146",
  storageBucket: "rumahsehat-dd146.firebasestorage.app",
  messagingSenderId: "854107516539",
  appId: "1:854107516539:web:7019a0162ae50015573cde",
  measurementId: "G-7WW82H0KXK"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
