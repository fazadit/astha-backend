import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inisialisasi Firebase Admin
const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, "serviceAccountKey.json"))
);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://astha-project-8048f-default-rtdb.asia-southeast1.firebasedatabase.app/"
});
const db = admin.database();

// Inisialisasi Express
const app = express();
app.use(cors());
app.use(express.json());

// Konfigurasi OneSignal
const ONE_SIGNAL_APP_ID = "eaa8e30e-7ab7-4102-be16-c9398cf348a1";
const ONE_SIGNAL_API_KEY = "os_v2_app_5kuogdt2w5aqfpqwze4yz42iuf7jgv6fj6yubyfixuvg6myeptajs5y4kjfrhbgjiky5xx6kb5fjctujwihpnotumhejroskdwu37ya";

// Fungsi kirim notifikasi
async function sendNotification({ title, message, userId }) {
  try {
    const res = await axios.post(
      "https://onesignal.com/api/v1/notifications",
      {
        app_id: ONE_SIGNAL_APP_ID,
        headings: { en: title },
        contents: { en: message },
        filters: [
          {
            field: "tag",
            key: "user_id",
            relation: "=",
            value: userId
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${ONE_SIGNAL_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log("✅ Notifikasi berhasil dikirim:", res.data);
  } catch (err) {
    console.error("❌ Gagal kirim notifikasi:", err.response?.data || err.message);
  }
}

// Endpoint tes database
app.get("/test-db", async (req, res) => {
  try {
    await db.ref("cek_database").set({ status: "aktif", waktu: Date.now() });
    res.send("✅ Realtime Database aktif dan bisa diakses!");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Gagal akses database");
  }
});

// Endpoint tes kirim notifikasi
app.post("/test-notif", async (req, res) => {
  const { userId, title, message } = req.body;
  try {
    await sendNotification({ userId, title, message });
    res.send("✅ Notifikasi terkirim!");
  } catch (err) {
    res.status(500).send("❌ Gagal kirim notifikasi");
  }
});

// Cek deadline dan kirim notifikasi otomatis
async function checkDeadlinesAndNotify() {
  try {
    const snapshot = await db.ref("todolist").once("value");  
    const data = snapshot.val();

    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;

    for (const userId in data) {
      const tasks = data[userId];
      for (const taskId in tasks) {
        const task = tasks[taskId];
        if (
          !task.completed &&
          !task.notifSent &&
          task.deadline &&
          task.deadline - now <= tenMinutes &&
          task.deadline - now > 0
        ) {
          await sendNotification({
            userId,
            title: "⏰ Deadline Dekat!",
            message: `Tugas "${task.task}" akan jatuh tempo sebentar lagi.`
          });

          await db.ref(`todolist/${userId}/${taskId}`).update({
            notifSent: true
          });
        }
      }
    }
  } catch (err) {
    console.error("❌ Gagal cek deadline:", err);
  }
}

// Panggil cek setiap 1 menit
setInterval(checkDeadlinesAndNotify, 60 * 1000);

// Start server
app.listen(3000, () => {
  console.log("🚀 Server aktif di http://localhost:3000");
});
