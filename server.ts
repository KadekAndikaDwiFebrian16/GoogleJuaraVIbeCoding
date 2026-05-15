import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { question, context } = req.body;
      const ai = new GoogleGenAI({ apiKey: process.env.MY_CUSTOM_API_KEY || process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: question,
        config: {
          systemInstruction: `Anda adalah asisten masak pintar bernama 'Chef AI' untuk aplikasi 'Dapursehat'. 
          Tugas Anda adalah membantu pengguna menjawab pertanyaan seputar resep, gizi, tips memasak, dan saran makanan sehat. 
          Berikan jawaban yang ramah, informatif, dan praktis dalam Bahasa Indonesia.
          Gunakan format Markdown yang bersih dan rapi. Hindari penggunaan tanda bintang (bold) atau tagar (heading) yang berlebihan. 
          Gunakan poin-poin (bullet points) jika menjelaskan daftar.
          ${context ? `Konteks saat ini: ${context}` : ''}`,
        },
      });
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("AI Assistant Error:", error);
      res.status(500).json({ error: error.message || "Kendala teknis" });
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
