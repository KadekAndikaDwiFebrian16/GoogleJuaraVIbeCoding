import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import webPush from "web-push";
import "dotenv/config";
import helmet from "helmet";
import cors from "cors";

import fs from "fs";

// Permanent VAPID keys for Web Push
const VAPID_KEYS = {
  publicKey: "BJE6mt74G5b1DqLbb3rHc2yVFHWtIrxQK5CfKUpAJpZ26QgU-PdnSfS6suYSNBDJ8mlvtVBJSZ5wZ4f-JcK0pl8",
  privateKey: "8giC_-g4keVSrTRDwMC_qur4d62KGK-IPQ5eoWsvLJg"
};

webPush.setVapidDetails(
  'mailto:febriandwiiiii@gmail.com',
  VAPID_KEYS.publicKey,
  VAPID_KEYS.privateKey
);

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, deleteDoc, getDocs, collection } from "firebase/firestore";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust upstream proxies (Google Cloud Load Balancer, Cloud Run, Firebase Hosting)
  app.set("trust proxy", true);

  // Enable helmet middleware for strong HTTP security headers (Clickjacking, XSS, MIME sniffing, HSTS)
  // We disable CSP (Content Security Policy) to prevent breaking dynamic loading of assets and client-side scripts
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  // Enable CORS with secure options (reflecting request origin and allowing credentials)
  app.use(cors({
    origin: true,
    credentials: true,
  }));

  app.use(express.json());

  // Capture public APP_URL dynamically from first client visits or env injection
  let capturedAppUrl = process.env.APP_URL || "";

  app.use((req, res, next) => {
    if (!capturedAppUrl && req.headers.host) {
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      capturedAppUrl = `${protocol}://${req.headers.host}`;
    }
    next();
  });

  // API routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Initialize Firebase Client SDK in Server Side with Firestore DB
  const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
  let firestoreDb: any = null;

  if (fs.existsSync(firebaseConfigPath)) {
    try {
      const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
      const firebaseApp = initializeApp(firebaseConfig);
      firestoreDb = getFirestore(firebaseApp);
      console.log("[Firebase] Successfully initialized Firestore inside server.ts");
    } catch (error) {
      console.error("[Firebase] Error initializing Firebase inside server.ts:", error);
    }
  } else {
    console.warn("[Firebase] Firebase config file firebase-applet-config.json was not found!");
  }

  interface PushTask {
    subscription: any;
    payload: any;
    targetTime: number;
  }
  
  let scheduledTasks: Record<string, PushTask> = {};
  const scheduledTimeouts: Record<string, NodeJS.Timeout> = {};

  // Save scheduled task to Firestore
  const saveScheduledTaskToFirestore = async (timerId: string, task: PushTask) => {
    if (!firestoreDb) return;
    try {
      const docRef = doc(firestoreDb, "scheduled_pushes", timerId);
      await setDoc(docRef, {
        subscription: task.subscription,
        payload: task.payload,
        targetTime: task.targetTime
      });
      console.log(`[Firestore] Saved task ${timerId} to Firestore`);
    } catch (err) {
      console.error(`[Firestore] Failed to save task ${timerId} to Firestore`, err);
    }
  };

  // Delete scheduled task from Firestore
  const deleteScheduledTaskFromFirestore = async (timerId: string) => {
    if (!firestoreDb) return;
    try {
      const docRef = doc(firestoreDb, "scheduled_pushes", timerId);
      await deleteDoc(docRef);
      console.log(`[Firestore] Deleted task ${timerId} from Firestore`);
    } catch (err) {
      console.error(`[Firestore] Failed to delete task ${timerId} from Firestore`, err);
    }
  };

  // Safe, atomic, and race-free notification dispatcher.
  const sendPushNotificationSafely = (timerId: string, task: PushTask) => {
    if (!scheduledTasks[timerId]) return; // Already sent/handled by another worker or tick

    console.log(`[Push Notification] Starting atomic dispatch for timer ${timerId}`);
    
    // Clear timeout if running
    if (scheduledTimeouts[timerId]) {
      clearTimeout(scheduledTimeouts[timerId]);
      delete scheduledTimeouts[timerId];
    }

    // Save subscription and payload locally
    const { subscription, payload } = task;

    // Delete tasks instantly to prevent any secondary ticks from seeing this task
    delete scheduledTasks[timerId];
    deleteScheduledTaskFromFirestore(timerId);

    // Trigger the real push notification through VAPID protocol
    webPush.sendNotification(subscription, JSON.stringify(payload))
      .then(() => {
        console.log(`[Push Notification] Successfully sent push for timer: ${timerId}`);
      })
      .catch(err => {
        console.error(`[Push Notification] Error sending push for ${timerId}:`, err);
      });
  };

  // Load scheduled tasks from Firestore at server startup
  const loadScheduledTasksFromFirestore = async () => {
    if (!firestoreDb) return;
    try {
      console.log("[Firestore] Loading scheduled tasks from Firestore...");
      const colRef = collection(firestoreDb, "scheduled_pushes");
      const snapshot = await getDocs(colRef);
      const now = Date.now();
      let loadedCount = 0;

      snapshot.forEach((docSnapshot) => {
        const timerId = docSnapshot.id;
        const data = docSnapshot.data() as PushTask;
        if (data && data.targetTime) {
          scheduledTasks[timerId] = {
            subscription: data.subscription,
            payload: data.payload,
            targetTime: data.targetTime
          };
          loadedCount++;

          // If already past due, dispatch immediately
          const delay = data.targetTime - now;
          if (delay <= 0) {
            sendPushNotificationSafely(timerId, data);
          } else {
            // Schedule a fast timeout
            scheduledTimeouts[timerId] = setTimeout(() => {
              if (scheduledTasks[timerId]) {
                sendPushNotificationSafely(timerId, scheduledTasks[timerId]);
              }
            }, delay);
          }
        }
      });
      console.log(`[Firestore] Loaded ${loadedCount} active tasks from Firestore`);
    } catch (err) {
      console.error("[Firestore] Error loading tasks from Firestore:", err);
    }
  };

  // Fire loading on server startup
  loadScheduledTasksFromFirestore();

  // Active fallback scheduler loop: check every 5 seconds for past-due tasks.
  // This behaves as a robust safeguard if setTimeout is delayed, choked by serverless CPU limits,
  // or garbage collected under load, ensuring long-running timers (>= 1 hour) are extremely reliable.
  setInterval(() => {
    const now = Date.now();
    Object.entries(scheduledTasks).forEach(([timerId, task]) => {
      if (task.targetTime <= now) {
        sendPushNotificationSafely(timerId, task);
      }
    });
  }, 5000);

  // Self-keep-alive loop to prevent the container from being frozen or scaled down to 0
  // while there are active scheduled timers running in scheduledTasks.
  setInterval(() => {
    const activeTasksCount = Object.keys(scheduledTasks).length;
    if (activeTasksCount > 0 && capturedAppUrl) {
      console.log(`[Keep-Alive] There are ${activeTasksCount} active timers. Pinging external server ${capturedAppUrl} to avoid scale-down...`);
      fetch(`${capturedAppUrl}/api/health`)
        .then(() => console.log("[Keep-Alive] External ping successful"))
        .catch(err => console.warn("[Keep-Alive] External ping warning:", err.message));
    }
  }, 90000); // Ping every 90 seconds if timers are active

  // Lazy cron / scheduler middleware on every API access.
  // Ensures any incoming request immediately forces a check and flushes due notifications.
  app.use("/api", (req, res, next) => {
    const now = Date.now();
    Object.entries(scheduledTasks).forEach(([timerId, task]) => {
      if (task.targetTime <= now) {
        sendPushNotificationSafely(timerId, task);
      }
    });
    next();
  });

  app.get("/api/vapidPublicKey", (_req, res) => {
    res.json({ publicKey: VAPID_KEYS.publicKey });
  });

  app.post("/api/schedule-push", (req, res) => {
    const { subscription, payload, delayMs, timerId } = req.body;
    
    if (!subscription || !payload || typeof delayMs !== 'number' || !timerId) {
       res.status(400).json({ error: "Invalid payload or subscription data" });
       return;
    }

    if (scheduledTimeouts[timerId]) {
      clearTimeout(scheduledTimeouts[timerId]);
      delete scheduledTimeouts[timerId];
    }

    const targetTime = Date.now() + delayMs;
    const task = { subscription, payload, targetTime };
    scheduledTasks[timerId] = task;
    saveScheduledTaskToFirestore(timerId, task);

    // Schedule the push notification
    scheduledTimeouts[timerId] = setTimeout(() => {
      if (scheduledTasks[timerId]) {
        sendPushNotificationSafely(timerId, scheduledTasks[timerId]);
      }
    }, delayMs);

    res.json({ status: "scheduled", delayMs, timerId });
  });

  app.post("/api/cancel-push", (req, res) => {
    const { timerId } = req.body;
    
    if (timerId) {
      if (scheduledTimeouts[timerId]) {
        clearTimeout(scheduledTimeouts[timerId]);
        delete scheduledTimeouts[timerId];
      }
      if (scheduledTasks[timerId]) {
        delete scheduledTasks[timerId];
        deleteScheduledTaskFromFirestore(timerId);
      }
    }
    res.json({ status: "cancelled" });
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
      
      let systemInstruction = `Anda adalah core engine AI yang terintegrasi di dalam sistem backend website. Tugas utama Anda adalah memberikan jawaban yang super cepat (low latency), sangat akurat, dan langsung ke inti masalah tanpa basa-basi (no fluff).

Ikuti aturan ketat performa berikut untuk mencegah lag pada website:

1. PRINSIP KECEPATAN & STRUKTUR
- Berikan jawaban langsung tanpa salam pembuka (seperti "Halo", "Tentu, ini jawabannya") atau penutup (seperti "Semoga membantu"). Langsung ke poin pertama.
- Gunakan format Markdown yang clean atau JSON (jika diminta oleh sistem) agar frontend web dapat langsung merendernya secara instan tanpa proses parsing yang berat.

2. BATASAN TOKEN (EFEKTIF & PADAT)
- Jawab secara ringkas menggunakan bullet points atau tabel pendek jika memungkinkan. Hindari paragraf teks yang terlalu panjang dan bertele-tele.
- Batasi penjelasan teori. Berikan informasi yang langsung bisa dieksekusi oleh pengguna.
- Gunakan perbandingan kata yang efisien: jika bisa dijelaskan dalam 5 kata, jangan gunakan 10 kata.

3. OPTIMASI STREAMING FRIENDLY
- Susun struktur jawaban dari yang paling penting ke yang kurang penting, sehingga saat teks di-stream kata demi kata ke browser pengguna, pengguna sudah mendapatkan jawaban utama di 2 detik pertama.
- Jika format yang diminta adalah JSON, pastikan struktur JSON sesederhana mungkin untuk mengurangi beban komputasi token.

`;
      if (mode === 'sulap') {
        systemInstruction += `Anda adalah modul AI khusus untuk fitur baru di web kami yang bernama "Sulap Sisa Makanan" (Zero-Waste Chef & Nutritionist). 

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
      } else if (mode === 'meal-planner') {
        systemInstruction += `[DEKLARASI SISTEM]: Anda saat ini berjalan sebagai MODUL FITUR BARU di web DapurSehat bernama "AI Smart Meal Planner". Abaikan fungsi mandiri Anda sebagai kalkulator nutrisi bahan tunggal atau pencari resep sisa makanan, dan fokuslah penuh pada tugas fitur baru ini.

Tugas Anda adalah menyusun rencana menu makan (Meal Plan) kustom selama 3 hari berdasarkan target kalori, kondisi kesehatan, atau preferensi diet yang dimasukkan oleh pengguna, lalu membuatkan daftar belanjaan (Grocery Checklist) yang efisien.

Gunakan format Markdown yang clean, modern, dan ringan agar mudah dirender di halaman web DapurSehat.

Struktur output Anda HARUS persis seperti template di bawah ini:

## 📅 Rencana Makan Sehat Anda (3 Hari)
*Berikut adalah rekomendasi menu makan yang disesuaikan dengan target nutrisi Anda:*

### 🔹 Hari 1
* **Sarapan (Pagi):** [Nama Menu] — *[Jumlah] kkal | P: [Jumlah]g | K: [Jumlah]g*
* **Makan Siang:** [Nama Menu] — *[Jumlah] kkal | P: [Jumlah]g | K: [Jumlah]g*
* **Makan Malam:** [Nama Menu] — *[Jumlah] kkal | P: [Jumlah]g | K: [Jumlah]g*

### 🔹 Hari 2
* **Sarapan (Pagi):** [Nama Menu] — *[Jumlah] kkal | P: [Jumlah]g | K: [Jumlah]g*
* **Makan Siang:** [Nama Menu] — *[Jumlah] kkal | P: [Jumlah]g | K: [Jumlah]g*
* **Makan Malam:** [Nama Menu] — *[Jumlah] kkal | P: [Jumlah]g | K: [Jumlah]g*

### 🔹 Hari 3
* **Sarapan (Pagi):** [Nama Menu] — *[Jumlah] kkal | P: [Jumlah]g | K: [Jumlah]g*
* **Makan Siang:** [Nama Menu] — *[Jumlah] kkal | P: [Jumlah]g | K: [Jumlah]g*
* **Makan Malam:** [Nama Menu] — *[Jumlah] kkal | P: [Jumlah]g | K: [Jumlah]g*

---

## 🛒 Daftar Belanjaan Pintar (Grocery Checklist)
*Kumpulkan bahan-bahan berikut untuk kebutuhan memasak selama 3 hari ke depan (takaran disesuaikan agar pas dan tidak mubazir):*

* **Sumber Protein:**
    * [Nama Bahan, misal: Dada Ayam - 500 gram]
    * [Nama Bahan, misal: Telur - 6 butir]
* **Sayuran & Buah:**
    * [Nama Bahan, misal: Bayam - 2 ikat]
    * [Nama Bahan, misal: Tomat - 4 buah]
* **Karbohidrat & Bumbu Dasar:**
    * [Nama Bahan, misal: Beras Merah - 1 kg]

---

## 👨‍⚕️ Catatan Ahli Gizi DapurSehat:
*[Berikan 1-2 kalimat kesimpulan gizi, contoh: "Rencana makan ini dirancang tinggi protein dan serat untuk mendukung target defisit kalori Anda tanpa membuat tubuh terasa lemas."]*

Aturan Ketat: 
1. Jaga agar nama menu yang direkomendasikan adalah menu makanan sehat yang umum, logis, dan mudah dimasak. 
2. Pastikan perhitungan makronutrisi (Kalori, Protein, Karbohidrat) akurat berdasarkan keahlian AI Nutrients Anda. 
3. Buat penjelasan tetap padat agar loading halaman web tetap cepat!
4. Dilarang keras menggunakan simbol checkbox seperti [ ] atau [x] pada daftar belanjaan (Grocery Checklist). Gunakan format list bullet point biasa (*).`;
      } else {
        systemInstruction += `Anda adalah Chef AI untuk aplikasi 'Dapursehat'.
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
        userFriendlyMessage = "Maaf, kuota harian AI gratis sedang habis. Silakan coba lagi nanti atau gunakan API Key berbayar di Settings > Secrets! 🙏";
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

  app.post("/api/extract-recipe", async (req, res) => {
    try {
      const { text, source } = req.body;
      const ai = getGenAI();
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: `Ekstrak resep dari teks berikut. Berikan format JSON dengan skema:
{
  "title": "Judul Resep",
  "instructions": [
    { "step": 1, "text": "Langkah pertama", "duration": 0 }, // duration in minutes if mentioned, else 0
    { "step": 2, "text": "Langkah kedua", "duration": 15 } 
  ]
}
Hanya kembalikan JSON murni. Abaikan bahan-bahan, hanya ambil langkah-langkah pembuatannya.

Teks:
${text}`,
      });
      const resultText = response.text || "";
      const jsonStrMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonStrMatch) {
         res.json({ result: JSON.parse(jsonStrMatch[0]) });
      } else {
         res.status(400).json({ error: "Failed to extract recipe" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal error" });
    }
  });

  app.post("/api/extract-ingredients", async (req, res) => {
    try {
      const { text } = req.body;
      const ai = getGenAI();
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: `Ekstrak daftar bahan makanan sehat yang perlu dibeli dari teks berikut dalam format JSON murni dengan skema:
{
  "title": "Nama Makanan / Kategori Menu Belanja",
  "ingredients": [
    "Nama Bahan beserta takaran/jumlahnya jika ada (contoh: Dada Ayam 500g)",
    "Bahan kedua"
  ]
}
Aturan Penting:
1. Hanya kembalikan JSON murni. Jangan tambahkan penjelasan lain di luar JSON.
2. Saring bumbu dapur standar seperti garam atau air dari daftar belanjaan agar lebih bersih (fokus bahan utama).
3. Buat judul (title) yang singkat dan bermakna.

Teks:
${text}`,
      });
      const resultText = response.text || "";
      const jsonStrMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonStrMatch) {
         res.json({ result: JSON.parse(jsonStrMatch[0]) });
      } else {
         res.status(400).json({ error: "Failed to extract ingredients" });
      }
    } catch (error) {
      console.error("Extract ingredients error:", error);
      res.status(500).json({ error: "Internal error" });
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
