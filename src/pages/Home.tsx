import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Recipe } from '../types';
import RecipeCard from '../components/RecipeCard';
import SuggestionForm from '../components/SuggestionForm';
import { Search, Loader2, AlertCircle, Filter, X as CloseIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'react-router-dom';

const CATEGORIES = [
  { id: 'semua', label: 'Semua', color: 'bg-stone-200' },
  { id: 'pagi', label: 'Pagi', color: 'bg-emerald-100' },
  { id: 'siang', label: 'Siang', color: 'bg-amber-100' },
  { id: 'sore', label: 'Sore', color: 'bg-orange-100' },
];

const HEALTH_CONDITIONS = [
  'Maag / GERD',
  'Diabetes',
  'Hipertensi',
  'Diet Rendah Kalori',
  'Vegetarian'
];

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  
  const selectedCategory = searchParams.get('category') || 'semua';
  const selectedCondition = searchParams.get('condition');

  useEffect(() => {
    fetchRecipes();
  }, []);

  useEffect(() => {
    if (window.location.hash === '#categories') {
        const element = document.getElementById('categories');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    }
  }, [window.location.hash]);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'recipes'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe));
      setRecipes(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'recipes');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      const matchesSearch = recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           recipe.ingredients.some(ing => ing.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'semua' || recipe.mealTime === selectedCategory;
      const matchesCondition = !selectedCondition || recipe.condition?.toLowerCase() === selectedCondition.toLowerCase();
      
      return matchesSearch && matchesCategory && matchesCondition;
    });
  }, [recipes, searchTerm, selectedCategory, selectedCondition]);

  const totalReviews = useMemo(() => {
    return recipes.reduce((acc, recipe) => acc + (recipe.reviewCount || 0), 0);
  }, [recipes]);

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] overflow-hidden relative">
      <button 
        onClick={() => setIsFilterOpen(!isFilterOpen)}
        className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-orange-600 text-white px-6 py-3.5 rounded-full shadow-xl flex items-center gap-2 font-bold active:scale-95 transition-all"
      >
        {isFilterOpen ? <CloseIcon size={20} /> : <Filter size={20} />}
        <span className="text-sm">Filter</span>
      </button>

      {/* Overlay for mobile filter */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsFilterOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar / Filters */}
      <aside 
        id="categories" 
        className={`fixed inset-y-0 left-0 z-50 md:sticky md:top-0 md:z-0 w-4/5 sm:w-64 border-r border-gray-100 bg-white p-6 flex flex-col gap-8 flex-shrink-0 transition-transform duration-300 ease-in-out ${
          isFilterOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex md:hidden items-center justify-between mb-4">
          <h2 className="text-xl font-bold font-serif">Filter</h2>
          <button onClick={() => setIsFilterOpen(false)} className="p-2 bg-gray-100 rounded-full">
            <CloseIcon size={20} />
          </button>
        </div>
        <section>
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-4">Waktu Makan</h3>
            <div className="flex flex-col gap-2">
              {CATEGORIES.map((cat) => (
                <motion.button
                  key={cat.id}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.set('category', cat.id);
                    setSearchParams(newParams);
                    setIsFilterOpen(false);
                  }}
                  className={`flex items-center gap-3 text-sm p-2.5 rounded-xl font-bold transition-all ${
                    selectedCategory === cat.id 
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-100' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="text-lg">
                    {cat.id === 'pagi' && '🌅'}
                    {cat.id === 'siang' && '☀️'}
                    {cat.id === 'sore' && '🌙'}
                    {cat.id === 'semua' && '🍽️'}
                  </span>
                  {cat.label}
                </motion.button>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-4">Kondisi Kesehatan</h3>
            <div className="flex flex-col gap-2">
              {HEALTH_CONDITIONS.map((cond) => (
                <motion.button
                   key={cond}
                   whileHover={{ x: 4 }}
                   whileTap={{ scale: 0.98 }}
                   onClick={() => {
                     const newParams = new URLSearchParams(searchParams);
                     if (selectedCondition === cond) {
                         newParams.delete('condition');
                     } else {
                         newParams.set('condition', cond);
                     }
                     setSearchParams(newParams);
                     setIsFilterOpen(false);
                   }}
                   className={`flex items-center gap-3 text-sm p-2.5 rounded-xl font-bold transition-all ${
                     selectedCondition === cond
                     ? 'bg-orange-600 text-white shadow-md shadow-orange-100'
                     : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                   }`}
                >
                   {cond}
                </motion.button>
              ))}
            </div>
          </div>
        </section>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto overflow-x-hidden">
        <header className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between lg:items-end mb-8 gap-6">
            <div>
              <h1 className="text-3xl font-serif font-bold text-gray-900 mb-1">Menu Rekomendasi Hari Ini</h1>
              <p className="text-gray-500 text-sm">Resep bergizi seimbang untuk pemulihan kesehatan.</p>
            </div>
          </div>
          
          <div className="relative flex items-center w-full">
            <Search className="absolute left-4 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari bahan makanan (Contoh: Jahe, Ayam, Brokoli...)" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-orange-100 focus:border-orange-200 outline-none text-sm transition-all duration-300"
            />
          </div>
        </header>

        {/* Recipe Grid */}
        <section>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="animate-spin text-orange-600" size={32} />
              <p className="text-gray-400 text-sm font-medium">Sedang menyiapkan dapur...</p>
            </div>
          ) : filteredRecipes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredRecipes.map((recipe: Recipe, idx: number) => (
                  <RecipeCard key={recipe.id} recipe={recipe} index={idx} />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 border-dashed">
                <AlertCircle size={40} className="text-gray-200 mb-4" />
                <h3 className="text-lg font-bold text-gray-700">Resep Tidak Ditemukan</h3>
                <p className="text-gray-400 text-sm max-w-xs text-center">Coba cari dengan kata kunci lain.</p>
            </div>
          )}
        </section>

        {/* Suggestion Section */}
        <section className="mt-16 mb-8 border-t border-gray-100 pt-16">
            <SuggestionForm />
        </section>

        <footer className="mt-12 flex items-center justify-between py-6 border-t border-gray-50">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-blue-400 border-2 border-white shadow-sm"></div>
              <div className="w-6 h-6 rounded-full bg-green-400 border-2 border-white shadow-sm"></div>
              <div className="w-6 h-6 rounded-full bg-yellow-400 border-2 border-white shadow-sm"></div>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
              {totalReviews > 1000 ? `+${(totalReviews / 1000).toFixed(1)}k` : totalReviews} Member telah memberi rating
            </p>
          </div>
          <p className="text-[10px] text-gray-300 font-mono uppercase tracking-tighter">Powered by Gemini AI & Firebase</p>
        </footer>
      </main>
    </div>
  );
}
