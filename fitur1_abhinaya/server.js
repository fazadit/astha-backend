// Import library yang dibutuhkan
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

// Inisialisasi server
const app = express();
const PORT = process.env.PORT || 5000;
const API_KEY = process.env.GEMINI_API_KEY;  // API Key disimpan di file .env

// Middleware
app.use(cors());
app.use(express.json());

// Endpoint untuk menerima pesan dari frontend
app.post("/chat", async (req, res) => {
    const userMessage = req.body.message;
    if (!userMessage) return res.status(400).json({ error: "Pesan tidak boleh kosong" });

    console.log("Pesan dari user:", userMessage);

    try {
        // Gunakan model terbaru: gemini-1.5-flash
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
            { contents: [{ parts: [{ text: userMessage }] }] }
        );

        console.log("Gemini Response:", response.data);

        const botReply = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, saya tidak mengerti.";
        res.json({ reply: botReply });
    } catch (error) {
        console.error("Error dari API Gemini:", error.response?.data || error.message);
        res.status(500).json({ error: "Terjadi kesalahan pada server" });
    }
});

// Jalankan server
app.listen(PORT, () => console.log(`Server berjalan di http://localhost:${PORT}`));
