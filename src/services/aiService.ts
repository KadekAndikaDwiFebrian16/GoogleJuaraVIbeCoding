import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function askAssistant(question: string, context?: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    return response.text;
  } catch (error) {
    console.error("AI Assistant Error:", error);
    return "Maaf, saya sedang mengalami kendala teknis. Silakan coba lagi nanti.";
  }
}
