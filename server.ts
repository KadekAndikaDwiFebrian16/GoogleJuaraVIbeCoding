import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Initialize AI client
  let genAI: GoogleGenAI | null = null;
  const getGenAI = () => {
    if (!genAI) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not defined");
      }
      genAI = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' }
        }
      });
    }
    return genAI;
  };

  app.post("/api/chat", async (req, res) => {
    try {
      const { question, mode } = req.body;
      const ai = getGenAI();
      
      let systemInstruction = "";
      if (mode === 'sulap') {
        systemInstruction = `Anda adalah modul AI khusus untuk fitur baru di web kami yang bernama "Sulap Sisa Makanan" (Zero-Waste Chef & Nutritionist). 

Tugas Anda adalah menerima input bahan-bahan makanan sisa yang ada di kulkas pengguna, lalu mendesain satu menu masakan baru yang kreatif, solutif, dan dilengkapi dengan estimasi kandungan gizinya—terutama jika kombinasi bahan tersebut tidak ada di database resep konvensional.

Saat fitur baru ini dipicu oleh pengguna, berikan output dengan format Markdown yang ringan dan rapi seperti di bawah ini:

### 🪄 Hasil Sulap Masakan: [Nama Menu Kreatif]
* **Waktu Memasak:** [Misal: 15 Menit]
* **Tingkat Kesulitan:** [Mudah / Sedang]

---

#### 🛒 Bahan yang Dipakai:
* **Dari Kulkas Anda:** [Sebutkan semua bahan sisa dari input pengguna]
* **Bumbu Dasar Dapur:** [Sebutkan garam, gula, minyak, atau bawang jika diperlukan]

---

#### 🍳 Langkah Memasak Ringkas:
1. [Langkah 1]
2. [Langkah 2]
3. [Langkah 3]

---

#### 📊 Profil Nutrisi Masakan Baru:
* **Kalori:** ± [Jumlah] kkal
* **Protein:** [Jumlah] g
* **Karbohidrat:** [Jumlah] g

---

💡 *Catatan Fitur Baru: Menu di atas diracik secara instan oleh AI berdasarkan sisa bahan Anda agar tidak mubazir dan tetap memenuhi kebutuhan gizi harian.*

Aturan Ketat: Jangan pernah menolak input bahan dari pengguna. Selalu temukan cara logis untuk mengolahnya menjadi hidangan yang aman dimakan. Jaga teks tetap ringkas agar web tidak berat saat memuat data.`;
      } else {
        systemInstruction = `Anda adalah Chef AI untuk aplikasi 'Dapursehat'.
Tugas Anda adalah membantu user dengan memberikan resep makanan sehat, tips memasak, dan informasi nilai gizi secara detail dan ramah.
Jangan pernah memberikan informasi yang membahayakan kesehatan. Berikan takaran bahan yang akurat dan langkah-langkah yang mudah diikuti.`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: question,
        config: {
          systemInstruction: systemInstruction,
        },
      });

      const resultText = response.text;
      res.json({ text: resultText });
    } catch (error: any) {
      console.error("AI Assistant Error Details:", error);
      
      let userFriendlyMessage = "Maaf, AI Sedang tidak menanggapi. Coba lagi dalam beberapa saat.";
      
      const errorMessage = error?.message || "";
      const errorStatus = error?.status || error?.error?.status;
      const errorCode = error?.error?.code || error?.status;

      if (errorMessage.includes("RESOURCE_EXHAUSTED") || errorStatus === 429 || errorCode === 429) {
        userFriendlyMessage = "Maaf, kuota harian AI gratis (Gemini 3.1 Flash Lite) sedang habis. Silakan coba lagi besok atau gunakan API Key berbayar di Settings > Secrets! 🙏";
      } else if (errorMessage.includes("NOT_FOUND") || errorStatus === 404 || errorCode === 404) {
        userFriendlyMessage = "Model AI sedang dalam pemeliharaan. Kami sedang menyiapkannya kembali. Mohon coba beberapa saat lagi.";
      } else if (errorMessage.includes("PERMISSION_DENIED") || errorStatus === 403 || errorCode === 403) {
        userFriendlyMessage = "Akses AI ditolak. Silakan periksa kembali pengaturan API Key Anda di menu Settings.";
      } else if (errorMessage.includes("internal error") || errorStatus === 500) {
        userFriendlyMessage = "Terjadi kesalahan pada server AI. Mohon coba lagi secara berkala.";
      }

      res.status(500).json({ 
        status: "error", 
        ui_message: userFriendlyMessage,
        error: errorMessage
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
