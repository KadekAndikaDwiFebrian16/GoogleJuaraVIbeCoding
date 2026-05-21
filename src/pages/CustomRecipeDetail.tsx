import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, setDoc, deleteDoc, collection } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { CustomRecipe, CustomRecipeInstruction } from '../types';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Clock, Save, Trash2, Plus, PenLine, ChefHat, PlayCircle } from 'lucide-react';
import Loader from '../components/Loader';

export default function CustomRecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setActiveComponent } = useUI();
  
  const isNew = id === 'new';
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [recipe, setRecipe] = useState<Partial<CustomRecipe>>(
    isNew ? {
      title: '',
      source: 'manual',
      instructions: [{ step: 1, text: '', duration: 0 }]
    } : {}
  );
  
  const [isEditingTitle, setIsEditingTitle] = useState(isNew);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!isNew && id && user) {
      fetchRecipe(id);
    }
  }, [id, isNew, user]);

  const fetchRecipe = async (recipeId: string) => {
    try {
      const docRef = doc(db, 'customRecipes', recipeId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().userId === user?.uid) {
        setRecipe({ id: docSnap.id, ...docSnap.data() } as CustomRecipe);
      } else {
        navigate('/custom-recipes');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'customRecipes');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !recipe.title?.trim() || recipe.instructions?.length === 0) return;
    
    setSaving(true);
    try {
      const recipeData = {
        userId: user.uid,
        title: recipe.title,
        source: recipe.source || 'manual',
        instructions: recipe.instructions?.map((inst, i) => ({
          step: i + 1,
          text: inst.text,
          duration: inst.duration ? Number(inst.duration) : 0
        })) || [],
        updatedAt: new Date().toISOString()
      };

      if (isNew) {
        const newId = doc(collection(db, 'customRecipes')).id;
        await setDoc(doc(db, 'customRecipes', newId), {
          ...recipeData,
          id: newId,
          createdAt: new Date().toISOString()
        });
        navigate(`/custom-recipe/${newId}`, { replace: true });
      } else {
        await updateDoc(doc(db, 'customRecipes', recipe.id as string), recipeData);
        setIsEditingTitle(false);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'customRecipes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      if (!isNew && recipe.id) {
        await deleteDoc(doc(db, 'customRecipes', recipe.id));
      }
      navigate('/custom-recipes');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'customRecipes');
    }
  };

  const updateInstruction = (index: number, field: keyof CustomRecipeInstruction, value: string | number) => {
    const newInstructions = [...(recipe.instructions || [])];
    newInstructions[index] = { ...newInstructions[index], [field]: value };
    setRecipe({ ...recipe, instructions: newInstructions });
  };

  const addInstruction = () => {
    const newInstructions = [...(recipe.instructions || [])];
    newInstructions.push({ step: newInstructions.length + 1, text: '', duration: 0 });
    setRecipe({ ...recipe, instructions: newInstructions });
  };

  const removeInstruction = (index: number) => {
    const newInstructions = [...(recipe.instructions || [])];
    newInstructions.splice(index, 1);
    // Re-index
    newInstructions.forEach((inst, i) => inst.step = i + 1);
    setRecipe({ ...recipe, instructions: newInstructions });
  };

  const startTimer = (minutes: number) => {
    if (!minutes || minutes <= 0) return;
    window.dispatchEvent(new CustomEvent('start-cooking-timer', { 
      detail: { duration: minutes } 
    }));
  };

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-gray-50/50 pb-24">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Navigation */}
        <button 
          onClick={() => navigate('/custom-recipes')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 font-medium transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center">
            <ArrowLeft size={16} />
          </div>
          Kembali ke Daftar
        </button>

        {/* Header Section */}
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-gray-100 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <ChefHat size={14} />
                  {isNew ? 'Resep Baru' : 'Resep Custom'}
                </span>
                {!isNew && (
                  <span className="text-gray-400 text-xs font-medium bg-gray-50 px-3 py-1 rounded-full">
                    {recipe.instructions?.length || 0} Langkah
                  </span>
                )}
              </div>

              {isEditingTitle ? (
                <textarea
                  value={recipe.title}
                  onChange={(e) => setRecipe({ ...recipe, title: e.target.value })}
                  placeholder="Masukkan Judul Resep..."
                  className="w-full text-3xl md:text-5xl font-black font-serif text-gray-900 bg-gray-50/50 border-none rounded-2xl p-4 focus:ring-4 focus:ring-indigo-100 outline-none resize-none leading-tight"
                  rows={2}
                  autoFocus
                />
              ) : (
                <div className="group flex items-start gap-4">
                  <h1 className="text-3xl md:text-5xl font-black font-serif text-gray-900 leading-tight">
                    {recipe.title}
                  </h1>
                  <button 
                    onClick={() => setIsEditingTitle(true)}
                    className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <PenLine size={20} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="w-12 h-12 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-colors border border-gray-100"
              >
                <Trash2 size={20} />
              </button>
              <button 
                onClick={handleSave}
                disabled={saving || !recipe.title?.trim() || recipe.instructions?.length === 0}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200/50"
              >
                {saving ? 'Menyimpan...' : (
                  <>
                    <Save size={18} />
                    {isNew ? 'Simpan Baru' : 'Simpan Perubahan'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal Overlay */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl border border-gray-100"
              >
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl animate-bounce">
                  🗑️
                </div>
                <h3 className="text-xl font-bold font-serif text-gray-900 mb-2">Hapus Resep Custom?</h3>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                  Resep ini akan dihapus secara permanen dari akun personal Anda. Tindakan ini tidak dapat dibatalkan.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      handleDelete();
                    }}
                    className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-200"
                  >
                    Hapus
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Instructions */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold font-serif px-2 mb-6">Tahap Pembuatan</h2>
          
          <AnimatePresence>
            {recipe.instructions?.map((inst, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex gap-4 md:gap-6 relative group"
              >
                <div className="shrink-0 flex flex-col items-center gap-2">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold font-serif text-sm md:text-base">
                    {inst.step}
                  </div>
                  {index !== (recipe.instructions?.length || 0) - 1 && (
                    <div className="w-px h-full bg-gray-100" />
                  )}
                </div>
                
                <div className="flex-1 space-y-4">
                  <textarea
                    value={inst.text}
                    onChange={(e) => updateInstruction(index, 'text', e.target.value)}
                    placeholder={`Langkah ${inst.step}...`}
                    className="w-full bg-transparent border-none text-gray-700 leading-relaxed focus:ring-0 p-0 resize-none min-h-[60px] outline-none placeholder:text-gray-300"
                  />
                  
                  <div className="flex items-center gap-4 bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50">
                    <div className="flex items-center gap-2 flex-1">
                      <Clock size={16} className="text-gray-400" />
                      <input
                        type="number"
                        min="0"
                        value={inst.duration || ''}
                        onChange={(e) => updateInstruction(index, 'duration', parseInt(e.target.value) || 0)}
                        placeholder="Menit"
                        className="w-20 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                      />
                      <span className="text-xs text-gray-500 font-medium">Timer (opsional)</span>
                    </div>
                    
                    {inst.duration ? (
                      <button 
                        onClick={() => startTimer(inst.duration || 0)}
                        className="flex items-center gap-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0"
                      >
                        <PlayCircle size={14} />
                        Mulai Timer
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="absolute right-4 top-4">
                  <button 
                    onClick={() => removeInstruction(index)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <button 
            onClick={addInstruction}
            className="w-full py-6 rounded-[2rem] border-2 border-dashed border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/10 font-bold transition-all flex items-center justify-center gap-2 group mt-6"
          >
            <Plus size={20} className="group-hover:scale-110 transition-transform" />
            Tambah Langkah Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}
