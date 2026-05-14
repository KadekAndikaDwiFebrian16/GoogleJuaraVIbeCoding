import { collection, addDoc, serverTimestamp, getDocs, query, limit } from 'firebase/firestore';
import { db } from './firebase';

const SAMPLE_RECIPES = [
  {
    title: "Bubur Sayur Sehat (Maag Friendly)",
    description: "Bubur lembut dengan sayuran segar, sangat cocok untuk penderita maag atau gangguan pencernaan.",
    coverImage: "https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=1000&auto=format&fit=crop",
    mealTime: "pagi",
    condition: "Maag / GERD",
    nutrition: { calories: "180", protein: "8g", fat: "2g", carbs: "35g" },
    ingredients: ["Beras 200g", "Wortel potong dadu", "Bayam", "Garam secukupnya", "Air 1 liter"],
    instructions: [
      { step: 1, text: "Cuci beras hingga bersih lalu tiriskan.", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=1000&auto=format&fit=crop" },
      { step: 2, text: "Masak beras dengan air hingga mendidih dan menjadi bubur.", image: "" },
      { step: 3, text: "Masukkan wortel dan masak hingga empuk.", image: "" },
      { step: 4, text: "Masukkan bayam dan garam, aduk rata lalu sajikan selagi hangat.", image: "" }
    ],
    rating: 4.8,
    reviewCount: 12,
    createdBy: "system",
    createdAt: new Date().toISOString()
  },
  {
    title: "Salad Ayam Panggang Lemon",
    description: "Nikmati kesegaran salad dengan protein ayam panggang yang rendah kalori.",
    coverImage: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop",
    mealTime: "siang",
    condition: "Diet Rendah Kalori",
    nutrition: { calories: "320", protein: "25g", fat: "12g", carbs: "15g" },
    ingredients: ["Dada ayam 150g", "Selada air", "Tomat ceri", "Perasan lemon", "Minyak zaitun"],
    instructions: [
      { step: 1, text: "Bumbui ayam dengan garam, lada, dan lemon lalu panggang.", image: "" },
      { step: 2, text: "Potong sayuran segar sesuai selera.", image: "" },
      { step: 3, text: "Campurkan ayam dan sayuran dalam mangkuk besar.", image: "" },
      { step: 4, text: "Siram dengan dressing minyak zaitun dan lemon.", image: "" }
    ],
    rating: 4.9,
    reviewCount: 25,
    createdBy: "system",
    createdAt: new Date().toISOString()
  }
];

export const seedRecipes = async () => {
    const q = query(collection(db, 'recipes'), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
        for (const r of SAMPLE_RECIPES) {
            await addDoc(collection(db, 'recipes'), {
                ...r,
                createdAt: serverTimestamp()
            });
        }
        console.log("Recipes seeded successfully");
    }
};
