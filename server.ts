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
  app.get("/api/health", (req, res) => {
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
      const { question } = req.body;
      const ai = getGenAI();
      
      const systemInstruction = `Anda adalah Chef AI untuk aplikasi 'Dapursehat'.
Tugas Anda adalah membantu user dengan memberikan resep makanan sehat, tips memasak, dan informasi nilai gizi secara detail dan ramah.
Jangan pernah memberikan informasi yang membahayakan kesehatan. Berikan takaran bahan yang akurat dan langkah-langkah yang mudah diikuti.`;

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
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
      const errorStatus = error?.status;
      const errorCode = error?.error?.code;

      if (errorMessage.includes("RESOURCE_EXHAUSTED") || errorStatus === 429 || errorStatus === "RESOURCE_EXHAUSTED" || errorCode === 429) {
        userFriendlyMessage = "Maaf, kuota harian AI gratis sudah habis (20 req/hari). Silakan coba lagi besok atau gunakan API Key berbayar di Settings > Secrets! 🙏";
      } else if (errorMessage.includes("NOT_FOUND") || errorStatus === 404 || errorCode === 404) {
        userFriendlyMessage = "Model AI sedang dalam pemeliharaan atau tidak tersedia di region ini. Kami sedang memperbaikinya.";
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
