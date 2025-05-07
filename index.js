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
app.use(cors({
  origin: 'https://astha-project-nine.vercel.app',
  methods: ['GET', 'POST']
}));
app.use(express.json());

// Konfigurasi OneSignal
const ONE_SIGNAL_APP_ID = "eaa8e30e-7ab7-4102-be16-c9398cf348a1";
const ONE_SIGNAL_API_KEY = "os_v2_app_5kuogdt2w5aqfpqwze4yz42iuf7jgv6fj6yubyfixuvg6myeptajs5y4kjfrhbgjiky5xx6kb5fjctujwihpnotumhejroskdwu37ya";

// Fungsi kirim notifikasi
async function sendNotification({ title, message, userId }) {
  try {
    console.log(`Mencoba kirim notifikasi ke user_id: ${userId}`);
    
    const payload = {
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
    };
    
    console.log("Payload notifikasi:", JSON.stringify(payload, null, 2));
    
    const res = await axios.post(
      "https://onesignal.com/api/v1/notifications",
      payload,
      {
        headers: {
          // Format yang benar untuk OneSignal API v2
          Authorization: `Basic ${ONE_SIGNAL_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    
    console.log("✅ Notifikasi berhasil dikirim:", res.data);
    return res.data;
  } catch (err) {
    console.error("❌ Gagal kirim notifikasi:", err.response?.data || err.message);
    throw err;
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

// Endpoint tes kirim notifikasi dengan logging lebih detail
app.post("/test-notif", async (req, res) => {
  const { userId, title, message } = req.body;
  
  if (!userId) {
    return res.status(400).send("❌ userId diperlukan");
  }
  
  console.log(`📤 Mencoba kirim notifikasi ke user ${userId}`);
  
  try {
    const result = await sendNotification({ 
      userId, 
      title: title || "Tes Notifikasi", 
      message: message || "Ini adalah pesan tes notifikasi" 
    });
    res.json({
      status: "success",
      message: "✅ Notifikasi terkirim!",
      result
    });
  } catch (err) {
    console.error("Detail error:", err);
    res.status(500).json({
      status: "error",
      message: "❌ Gagal kirim notifikasi",
      error: err.response?.data || err.message
    });
  }
});

// Cek deadline dan kirim notifikasi otomatis
async function checkDeadlinesAndNotify() {
  try {
    console.log("🔍 Memeriksa deadline tugas...");
    const snapshot = await db.ref("todolist").once("value");  
    const data = snapshot.val();
    
    if (!data) {
      console.log("Tidak ada data tugas");
      return;
    }
    
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
          console.log(`📅 Deadline dekat untuk tugas "${task.task}" - user ${userId}`);
          try {
            await sendNotification({
              userId,
              title: "⏰ Deadline Dekat!",
              message: `Tugas "${task.task}" akan jatuh tempo sebentar lagi.`
            });
            
            await db.ref(`todolist/${userId}/${taskId}`).update({
              notifSent: true
            });
            console.log(`✅ Notifikasi terkirim dan status diupdate`);
          } catch (err) {
            console.error(`❌ Gagal kirim notifikasi untuk tugas ${taskId}:`, err.message);
          }
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server aktif di http://localhost:${PORT}`);
  console.log(`🔔 OneSignal App ID: ${ONE_SIGNAL_APP_ID}`);
});
