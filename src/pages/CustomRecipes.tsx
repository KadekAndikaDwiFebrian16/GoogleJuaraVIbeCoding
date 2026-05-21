import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { CustomRecipe } from '../types';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Clock, ChefHat, Sparkles, BookOpen, AlertCircle, Search } from 'lucide-react';
import Loader from '../components/Loader';

export default function CustomRecipes() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<CustomRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [recipeIdToDelete, setRecipeIdToDelete] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchRecipes();
    }
  }, [user]);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'customRecipes'),
        where('userId', '==', user?.uid)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomRecipe));
      // Sort in memory because Firestore requires composite index for where + orderBy
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRecipes(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'customRecipes');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'customRecipes', id));
      setRecipes(recipes.filter(r => r.id !== id));
      setRecipeIdToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'customRecipes');
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRecipeIdToDelete(null);
  };

  const handleDeleteTrigger = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setRecipeIdToDelete(id);
  };

  const filteredRecipes = recipes.filter(r => r.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const getSourceConfig = (source: string) => {
    switch (source) {
      case 'chef_ai': return { icon: ChefHat, label: 'Chef AI', color: 'bg-rose-100 text-rose-700' };
      case 'meal_planner': return { icon: BookOpen, label: 'Meal Planner', color: 'bg-emerald-100 text-emerald-700' };
      case 'magic_ingredients': return { icon: Sparkles, label: 'Sulap Bahan', color: 'bg-indigo-100 text-indigo-700' };
      default: return { icon: BookOpen, label: 'Manual', color: 'bg-amber-100 text-amber-700' };
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="min-h-[calc(100vh-64px)] p-6 md:p-12 relative z-10 max-w-7xl mx-auto">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-3xl md:text-5xl font-black font-serif text-gray-900 tracking-tight flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white rotate-6">
              📝
            </div>
            Resep Custom
          </h1>
          <p className="text-gray-500 mt-4 text-sm md:text-base max-w-xl md:mb-0">
            Kumpulan resep personal yang kamu simpan dari AI atau dibuat sendiri.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto shrink-0">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari resep..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-200 outline-none text-sm transition-all"
            />
          </div>

          <button
            onClick={() => navigate('/custom-recipe/new')}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-2xl shadow-lg shadow-indigo-200/50 transition-all font-bold w-full sm:w-auto hover:-translate-y-1"
          >
            <Plus size={20} />
            <span className="whitespace-nowrap">Buat Manual</span>
          </button>
        </div>
      </header>

      {filteredRecipes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe, index) => {
            const SourceIcon = getSourceConfig(recipe.source).icon;
            const sourceColor = getSourceConfig(recipe.source).color;
            
            return (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="relative h-full select-none">
                  <Link to={`/custom-recipe/${recipe.id}`} className="block h-full group">
                    <div className="bg-white rounded-[2rem] p-6 h-full border border-gray-100 hover:border-indigo-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col relative overflow-hidden group-hover:-translate-y-1">
                      <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-50/50 rounded-full blur-2xl group-hover:bg-indigo-100 transition-colors" />
                      
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider ${sourceColor}`}>
                          <SourceIcon size={14} />
                          {getSourceConfig(recipe.source).label}
                        </div>
                        
                        <button 
                          onClick={(e) => handleDeleteTrigger(e, recipe.id)}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors relative z-20"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <h3 className="text-xl font-bold font-serif text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-tight mb-2">
                        {recipe.title}
                      </h3>

                      <div className="mt-auto pt-6 flex items-center gap-4 text-xs font-medium text-gray-500">
                        <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                          <Clock size={14} className="text-gray-400" />
                          {recipe.instructions.length} Langkah
                        </div>
                      </div>
                    </div>
                  </Link>

                  <AnimatePresence>
                    {recipeIdToDelete === recipe.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute inset-0 bg-red-600/95 rounded-[2rem] p-6 z-30 flex flex-col items-center justify-center text-center text-white border border-red-500 shadow-lg"
                      >
                        <Trash2 size={32} className="mb-2 text-white animate-bounce" />
                        <h4 className="font-bold text-base leading-tight mb-1">Hapus Resep ini?</h4>
                        <p className="text-xs text-red-100 mb-4 px-2 max-w-[200px]">Resep custom ini akan dihapus secara permanen.</p>
                        <div className="flex gap-3 justify-center">
                          <button
                            onClick={handleCancelDelete}
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all"
                          >
                            Batal
                          </button>
                          <button
                            onClick={(e) => handleConfirmDelete(e, recipe.id)}
                            className="px-4 py-2 bg-white text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-all shadow-md"
                          >
                            Hapus
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-gray-100 border-dashed max-w-3xl mx-auto">
          <AlertCircle size={48} className="text-gray-200 mb-6" />
          <h3 className="text-xl font-bold font-serif text-gray-700">Belum ada resep</h3>
          <p className="text-gray-400 text-sm max-w-sm text-center mt-2">
            Simpan resep dari AI Assistant atau buat resep manualmu sendiri.
          </p>
          {!searchTerm && (
            <button
              onClick={() => navigate('/custom-recipe/new')}
              className="mt-8 bg-indigo-50 text-indigo-600 font-bold px-6 py-3 rounded-2xl hover:bg-indigo-100 transition-colors"
            >
              Buat Manual Sekarang
            </button>
          )}
        </div>
      )}
    </div>
  );
}
