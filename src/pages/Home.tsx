import { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Recipe } from '../types';
import SuggestionForm from '../components/SuggestionForm';
import RecipeCarousel from '../components/RecipeCarousel';
import RecipeSlideGroup from '../components/RecipeSlideGroup';
import { Search, AlertCircle, Filter, X as CloseIcon, Leaf, Coffee, Carrot, Sparkles, Salad } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { useSearchParams, Link } from 'react-router-dom';
import { useUI } from '../context/UIContext';

const FloatingElement = ({ children, delay = 0, x = 0, y = 0, rotate = 0 }: { children: React.ReactNode, delay?: number, x?: number, y?: number, rotate?: number }) => (
  <motion.div
    animate={{
      y: [y, y + 20, y],
      x: [x, x + 10, x],
      rotate: [rotate, rotate + 10, rotate],
    }}
    transition={{
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut",
      delay
    }}
    className="absolute pointer-events-none opacity-[0.07] md:opacity-10 will-change-transform"
    style={{ left: `${x}%`, top: `${y}%`, zIndex: 0 }}
  >
    {children}
  </motion.div>
);

const CATEGORIES = [
  { id: 'semua', label: 'Semua', color: 'bg-stone-200' },
  { id: 'pagi', label: 'Pagi', color: 'bg-emerald-100' },
  { id: 'siang', label: 'Siang', color: 'bg-amber-100' },
  { id: 'sore', label: 'Sore', color: 'bg-amber-100' },
  { id: 'malam', label: 'Malam', color: 'bg-indigo-100' },
];

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { activeComponent, setActiveComponent } = useUI();
  const isFilterOpen = activeComponent === 'filter';
  const setIsFilterOpen = (open: boolean) => setActiveComponent(open ? 'filter' : null);

  const [currentMealTime, setCurrentMealTime] = useState<'pagi' | 'siang' | 'sore' | 'malam'>('pagi');
  const [searchParams, setSearchParams] = useSearchParams();
  
  const selectedCategory = searchParams.get('category') || 'semua';
  const selectedCondition = searchParams.get('condition');

  useEffect(() => {
    fetchRecipes();
    
    // Determine time of day based on user's local time
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 11) {
      setCurrentMealTime('pagi');
    } else if (hour >= 11 && hour < 16) {
      setCurrentMealTime('siang');
    } else if (hour >= 16 && hour < 19) {
      setCurrentMealTime('sore');
    } else {
      setCurrentMealTime('malam');
    }
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

  const recommendedRecipes = useMemo(() => {
    return recipes.filter(r => r.mealTime === currentMealTime);
  }, [recipes, currentMealTime]);

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

  const dynamicHealthConditions = useMemo(() => {
    const conditionMap = new Map<string, string>(); // lowercase -> display string
    
    // Add default conditions
    const defaults = ['Maag / GERD', 'Diabetes', 'Hipertensi', 'Diet Rendah Kalori', 'Vegetarian'];
    defaults.forEach(c => conditionMap.set(c.toLowerCase(), c));
    
    // Add unique conditions from recipes
    recipes.forEach(recipe => {
      if (recipe.condition && recipe.condition.trim()) {
        const lower = recipe.condition.toLowerCase();
        if (!conditionMap.has(lower)) {
          conditionMap.set(lower, recipe.condition);
        }
      }
    });
    
    return Array.from(conditionMap.values()).sort();
  }, [recipes]);

  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [0, 100], [0, 1]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] relative">
      {/* Minimal Floating Elements Background */}
      <div className="hidden md:block">
        <FloatingElement x={5} y={15} rotate={15} delay={0}><Leaf size={56} className="text-emerald-500" /></FloatingElement>
        <FloatingElement x={85} y={25} rotate={-20} delay={1}><Carrot size={64} className="text-amber-500" /></FloatingElement>
        <FloatingElement x={15} y={65} rotate={10} delay={2}><Coffee size={48} className="text-amber-500" /></FloatingElement>
        <FloatingElement x={80} y={75} rotate={-15} delay={1.5}><Sparkles size={44} className="text-yellow-400" /></FloatingElement>
      </div>

      {/* Permanent Toggle Button (PC & Mobile) */}
      <motion.button 
        whileHover={{ scale: 1.05, x: 5 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsFilterOpen(true)}
        className="fixed bottom-24 md:bottom-6 left-4 md:left-6 z-[100] bg-amber-500 text-white px-4 md:px-6 h-12 md:h-16 rounded-full md:rounded-[2rem] shadow-lg shadow-amber-500/20 flex items-center gap-2 md:gap-3 border-4 border-white transition-all group"
      >
        <Filter size={18} className="md:size-[20px] group-hover:rotate-12 transition-transform" />
        <span className="font-black uppercase tracking-widest text-[10px] md:text-sm">Filter</span>
      </motion.button>

      {/* Fullscreen Filter Overlay */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10"
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-md cursor-pointer"
              onClick={() => setIsFilterOpen(false)}
            />
            
            <motion.aside
              initial={{ opacity: 0, y: "20%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "20%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
              className="relative w-full max-w-4xl max-h-[90vh] md:max-h-[85vh] bg-white rounded-[2.5rem] md:rounded-[4rem] shadow-2xl p-6 md:p-14 flex flex-col gap-6 md:gap-12 overflow-hidden will-change-transform"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 md:gap-5">
                  <div className="w-10 h-10 md:w-14 md:h-14 bg-amber-500 rounded-2xl md:rounded-3xl flex items-center justify-center text-white rotate-6 transition-transform hover:rotate-0">
                    <Filter size={20} className="md:size-[28px]" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-3xl font-black font-serif text-gray-900 tracking-tight leading-none">Cari Resep</h2>
                    <p className="text-[9px] md:text-xs text-gray-400 font-bold uppercase tracking-[0.15em] mt-1 opacity-60">Saring menu sesuai seleramu</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsFilterOpen(false)} 
                  className="p-3 md:p-5 bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-2xl md:rounded-3xl transition-all hover:rotate-90 group"
                >
                  <CloseIcon size={20} className="md:size-[24px] group-hover:scale-110 transition-transform" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 md:pr-6 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
                <section>
                  <div className="flex items-center gap-3 mb-6 md:mb-8">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 opacity-80">Makan/Minum Kapan?</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    {CATEGORIES.map((cat) => (
                      <motion.button
                        key={cat.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const newParams = new URLSearchParams(searchParams);
                          newParams.set('category', cat.id);
                          setSearchParams(newParams);
                          setIsFilterOpen(false);
                        }}
                        className={`relative flex items-center gap-5 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] font-bold transition-all duration-300 md:hover:-translate-y-1 md:hover:shadow-lg border-2 ${
                          selectedCategory === cat.id 
                          ? 'bg-amber-500 text-white border-amber-500 shadow-amber-200/50' 
                          : 'bg-white md:bg-gray-50/50 text-gray-800 border-gray-100 md:border-transparent md:hover:bg-white md:hover:border-amber-100 shadow-sm'
                        }`}
                      >
                        <span className="text-2xl md:text-3xl drop-shadow-sm">
                          {cat.id === 'pagi' && '🍳'}
                          {cat.id === 'siang' && '🍲'}
                          {cat.id === 'sore' && '☕'}
                          {cat.id === 'malam' && '🌙'}
                          {cat.id === 'semua' && '🥗'}
                        </span>
                        <span className="text-sm md:text-base tracking-tight font-extrabold">{cat.label}</span>
                        {selectedCategory === cat.id && (
                          <div 
                            className="ml-auto w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.9)]" 
                          />
                        )}
                      </motion.button>
                    ))}
                  </div>
                </section>

                <section className="flex flex-col">
                  <div className="flex items-center gap-3 mb-6 md:mb-8">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 opacity-80">Kebutuhan Spesial</h3>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {dynamicHealthConditions.map((cond) => (
                      <motion.button
                        key={cond}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                        whileHover={{ x: 6, backgroundColor: selectedCondition === cond ? "" : "rgba(245, 158, 11, 0.05)" }}
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
                        className={`relative flex items-center justify-between gap-4 text-xs md:text-sm p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] font-bold transition-all duration-300 md:hover:translate-x-2 border-2 ${
                          selectedCondition === cond
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xl shadow-amber-100/50'
                          : 'bg-white md:bg-gray-50/50 text-gray-500 hover:text-gray-900 border-gray-100 md:border-transparent md:hover:bg-amber-50/30'
                        }`}
                      >
                        <span className="tracking-tight text-sm md:text-lg font-black">{cond}</span>
                        {selectedCondition === cond && (
                          <div 
                            className="bg-white w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" 
                          />
                        )}
                      </motion.button>
                    ))}
                  </div>

                  <div className="mt-auto pt-10">
                    <div className="p-5 md:p-8 rounded-[2.5rem] md:rounded-[3.5rem] bg-gradient-to-br from-amber-50 to-yellow-100/50 border border-amber-200/20 text-amber-900 relative overflow-hidden group">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                        className="absolute -right-10 -bottom-10 opacity-10"
                      >
                        <Sparkles size={120} />
                      </motion.div>
                      <h4 className="font-serif font-black text-base md:text-xl mb-1 flex items-center gap-2">
                        <Salad size={20} className="text-amber-600" />
                        Bingung pilih menu?
                      </h4>
                      <p className="text-[9px] md:text-xs text-amber-800/60 font-bold leading-relaxed uppercase tracking-widest">
                        Tanyakan AI Asisten untuk rekomendasi personal yang sehat.
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 pb-28 min-h-screen overflow-y-auto overflow-x-hidden relative z-10">
        {recommendedRecipes.length > 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <RecipeCarousel 
              recipes={recommendedRecipes} 
              timeLabel={currentMealTime} 
            />
          </motion.div>
        )}

        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 sticky top-0 md:relative z-20 py-2 md:py-0 w-full"
        >
          <motion.div 
            style={{ 
              backgroundColor: "rgba(250, 250, 248, 0.95)",
              opacity: headerOpacity 
            }}
            className="absolute inset-0 -mx-4 rounded-3xl md:hidden"
          />
          <div className="relative flex flex-col md:flex-row items-center w-full gap-4">
            <div className="relative flex items-center w-full flex-1">
              <Search className="absolute left-4 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Cari bahan makanan (Contoh: Jahe, Ayam, Brokoli...)" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-amber-100 focus:border-amber-200 outline-none text-sm transition-all duration-300"
              />
            </div>
          </div>
        </motion.header>

        {/* Recipe Grid replaced by Adaptive Slide Group */}
        <section className="relative z-10">
          {loading ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-32 gap-6"
            >
              <div className="relative">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 border-4 border-amber-100 border-t-amber-500 rounded-full"
                />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                </motion.div>
              </div>
              <motion.p 
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-gray-400 text-sm font-bold uppercase tracking-widest"
              >
                Menyiapkan Menu Sehat...
              </motion.p>
            </motion.div>
          ) : filteredRecipes.length > 0 ? (
            <RecipeSlideGroup 
              recipes={filteredRecipes} 
              title={searchTerm || selectedCondition ? "Hasil Pencarian" : "Jelajahi Menu Sehat"} 
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-gray-100 border-dashed">
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
