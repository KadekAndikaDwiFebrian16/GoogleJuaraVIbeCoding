import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { Recipe, Suggestion, InstructionStep } from '../types';
import { Plus, Trash2, MessageSquare, Save, X, Loader2, ChefHat, Upload, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'add' | 'list' | 'suggestions'>('add');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [mealTime, setMealTime] = useState<'pagi' | 'siang' | 'sore'>('pagi');
  const [condition, setCondition] = useState('');
  const [ingredients, setIngredients] = useState<string[]>(['']);
  const [nutrition, setNutrition] = useState({ calories: '', protein: '', fat: '', carbs: '' });
  const [instructions, setInstructions] = useState<InstructionStep[]>([{ step: 1, text: '', image: '' }]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const rSnap = await getDocs(query(collection(db, 'recipes'), orderBy('createdAt', 'desc')));
      setRecipes(rSnap.docs.map(d => ({ id: d.id, ...d.data() } as Recipe)));

      const sSnap = await getDocs(query(collection(db, 'suggestions'), orderBy('createdAt', 'desc')));
      setSuggestions(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Suggestion)));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'admin-data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddIngredient = () => setIngredients([...ingredients, '']);
  const handleIngredientChange = (idx: number, val: string) => {
    const newIng = [...ingredients];
    newIng[idx] = val;
    setIngredients(newIng);
  };
  const handleRemoveIngredient = (idx: number) => setIngredients(ingredients.filter((_, i) => i !== idx));

  const handleAddInstruction = () => setInstructions([...instructions, { step: instructions.length + 1, text: '', image: '' }]);
  const handleInstructionChange = (idx: number, field: keyof InstructionStep, val: any) => {
    const newInst = [...instructions];
    newInst[idx] = { ...newInst[idx], [field]: val };
    setInstructions(newInst);
  };
  const handleRemoveInstruction = (idx: number) => {
      const newInst = instructions.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 }));
      setInstructions(newInst);
  };

  const handleAddRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const filteredIngredients = ingredients.filter(i => i.trim() !== '');
      const filteredInstructions = instructions.filter(i => i.text.trim() !== '');
      
      const newRecipe = {
        title,
        description,
        coverImage: coverImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop',
        mealTime,
        condition,
        nutrition,
        ingredients: filteredIngredients,
        instructions: filteredInstructions,
        rating: 5,
        reviewCount: 0,
        createdBy: profile?.uid || 'admin',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'recipes'), newRecipe);
      
      // Reset Form
      setTitle('');
      setDescription('');
      setCoverImage('');
      setIngredients(['']);
      setInstructions([{ step: 1, text: '', image: '' }]);
      setCondition('');
      setNutrition({ calories: '', protein: '', fat: '', carbs: '' });
      
      alert('Resep berhasil ditambahkan!');
      fetchData();
      setActiveTab('list');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'recipes');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (window.confirm('Hapus resep ini?')) {
      try {
        await deleteDoc(doc(db, 'recipes', id));
        fetchData();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `recipes/${id}`);
      }
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
            <ChefHat size={40} className="text-gray-900" />
        </motion.div>
    </div>
  );

  if (profile?.role !== 'admin') {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4 text-center">
        <ChefHat size={60} className="text-gray-200 mb-6" />
        <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">Akses Terbatas</h2>
        <p className="text-gray-500 max-w-xs">Halaman ini hanya dapat diakses oleh admin Dapursehat.</p>
        <Link to="/" className="mt-8 text-orange-600 font-bold uppercase text-xs tracking-widest hover:underline">Kembali ke Beranda</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 font-sans min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-8">
        <div>
           <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2 tracking-tight">Admin Console</h1>
           <p className="text-gray-500 text-sm font-medium">Manage your kitchen operations and community feedback.</p>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 gap-1">
            <TabBtn active={activeTab === 'add'} onClick={() => setActiveTab('add')} label="Tambah" />
            <TabBtn active={activeTab === 'list'} onClick={() => setActiveTab('list')} label="Resep" />
            <TabBtn active={activeTab === 'suggestions'} onClick={() => setActiveTab('suggestions')} label="Saran" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'add' && (
          <motion.div 
            key="add"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100"
          >
            <form onSubmit={handleAddRecipe} className="space-y-12">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <FormInput label="Judul Resep" value={title} onChange={setTitle} placeholder="Contoh: Bubur Ayam Jahe" required />
                  <FormInput label="Deskripsi" value={description} onChange={setDescription} placeholder="Kenapa resep ini unik?" required />
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Waktu Makan</label>
                    <select 
                        value={mealTime} 
                        onChange={(e: any) => setMealTime(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-100 text-sm text-gray-700 transition-all cursor-pointer"
                    >
                      <option value="pagi">🌅 Pagi</option>
                      <option value="siang">☀️ Siang</option>
                      <option value="sore">🌙 Sore</option>
                    </select>
                  </div>
                </div>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Gambar Sampul</label>
                      <ImageUpload value={coverImage} onChange={setCoverImage} folder="recipes" />
                    </div>
                    <FormInput label="Kategori Kondisi" value={condition} onChange={setCondition} placeholder="Contoh: Maag Safe" />
                  </div>
              </div>

              {/* Nutrition */}
              <div className="pt-10 border-t border-gray-50">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Informasi Gizi</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormInput label="Kalori" value={nutrition.calories} onChange={(v) => setNutrition({...nutrition, calories: v})} placeholder="320" />
                  <FormInput label="Protein" value={nutrition.protein} onChange={(v) => setNutrition({...nutrition, protein: v})} placeholder="18g" />
                  <FormInput label="Lemak" value={nutrition.fat} onChange={(v) => setNutrition({...nutrition, fat: v})} placeholder="12g" />
                  <FormInput label="Karbo" value={nutrition.carbs} onChange={(v) => setNutrition({...nutrition, carbs: v})} placeholder="45g" />
                </div>
              </div>

              {/* Ingredients */}
              <div className="pt-10 border-t border-gray-50">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Bahan-bahan</h3>
                  <motion.button 
                    type="button" 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleAddIngredient} 
                    className="text-orange-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 hover:opacity-70 transition-all"
                  >
                    <Plus size={14}/> Tambah
                  </motion.button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ingredients.map((ing, i) => (
                    <div key={i} className="flex gap-2 group">
                      <input 
                        value={ing} 
                        onChange={(e) => handleIngredientChange(i, e.target.value)} 
                        placeholder={`Bahan ${i+1}`}
                        className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-100"
                      />
                      {ingredients.length > 1 && (
                        <button type="button" onClick={() => handleRemoveIngredient(i)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><X size={18}/></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div className="pt-10 border-t border-gray-50">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Langkah Memasak</h3>
                  <motion.button 
                    type="button" 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleAddInstruction} 
                    className="text-orange-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 hover:opacity-70 transition-all"
                  >
                    <Plus size={14}/> Tambah
                  </motion.button>
                </div>
                <div className="space-y-6">
                  {instructions.map((step, i) => (
                    <div key={i} className="bg-gray-50 p-8 rounded-3xl border border-gray-100 relative group transition-all hover:border-orange-200">
                      <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-900 text-white rounded-2xl flex items-center justify-center font-black shadow-lg">
                              {step.step}
                            </div>
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Langkah {step.step}</h4>
                          </div>
                          {instructions.length > 1 && (
                            <button type="button" onClick={() => handleRemoveInstruction(i)} className="text-gray-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-all">
                              <Trash2 size={18}/>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                          <div className="lg:col-span-8 space-y-4">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Deskripsi Langkah</label>
                            <textarea 
                              value={step.text} 
                              onChange={(e) => handleInstructionChange(i, 'text', e.target.value)}
                              placeholder={`Jelaskan secara detail langkah ke-${step.step} ini...`}
                              className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-5 outline-none focus:ring-2 focus:ring-orange-100 text-base leading-relaxed min-h-[160px] shadow-sm transition-all"
                              required
                            />
                          </div>

                          <div className="lg:col-span-4 space-y-4">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Visual Pendukung</label>
                            <ImageUpload 
                              value={step.image || ''} 
                              onChange={(url) => handleInstructionChange(i, 'image', url)} 
                              folder="instructions"
                              compact
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-10 flex justify-end">
                <motion.button 
                  type="submit" 
                  disabled={submitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-10 py-4 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-orange-600 transition-all shadow-md disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : 'Simpan Resep'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}

        {activeTab === 'list' && (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {recipes.map((recipe) => (
              <div key={recipe.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex gap-4 items-center shadow-sm hover:border-orange-200 transition-colors">
                <img src={recipe.coverImage} className="w-20 h-20 rounded-xl object-cover grayscale brightness-95" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 mb-1 truncate text-sm">{recipe.title}</h4>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-3">{recipe.mealTime}</p>
                  <button onClick={() => handleDeleteRecipe(recipe.id)} className="text-[10px] font-bold text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors">
                      Hapus
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'suggestions' && (
          <motion.div 
            key="suggestions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-6"
          >
            {suggestions.length > 0 ? suggestions.map((s) => (
              <div key={s.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h4 className="text-xl font-serif font-bold text-gray-900 mb-1">{s.title}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Dari: {s.userName} • {formatDate(s.createdAt)}</p>
                    </div>
                    <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">{s.status}</span>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                    <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Deskripsi</span>
                        <p className="text-sm text-gray-600 leading-relaxed italic pr-4">"{s.description}"</p>
                    </div>
                    {s.ingredients && (
                      <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Bahan-bahan</span>
                          <p className="text-sm text-gray-600 leading-relaxed">{s.ingredients}</p>
                      </div>
                    )}
                </div>
              </div>
            )) : (
              <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-200">
                <MessageSquare size={40} className="mx-auto text-gray-100 mb-4" />
                <p className="text-gray-400 text-sm font-medium">Belum ada saran dari komunitas.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ImageUpload({ value, onChange, folder, compact = false }: { value: string, onChange: (url: string) => void, folder: string, compact?: boolean }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      alert('Tolong unggah file gambar yang valid (JPG, PNG, etc).');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran gambar maksimal adalah 5MB.');
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `${folder}/${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      onChange(url);
    } catch (error) {
      console.error("Upload error:", error);
      alert('Gagal mengunggah gambar. Silakan coba lagi.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div 
        className={`relative group cursor-pointer border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden bg-gray-50 flex flex-col items-center justify-center transition-all hover:border-orange-200 ${compact ? 'aspect-video' : 'aspect-[16/9]'}`}
        onClick={() => fileInputRef.current?.click()}
      >
        {value ? (
          <>
            <img src={value} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Preview" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Upload size={12} /> Ganti Gambar
              </span>
            </div>
          </>
        ) : (
          <div className="text-center p-6">
            <Upload size={compact ? 20 : 32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {uploading ? 'Sedang Mengunggah...' : 'Klik untuk Unggah'}
            </p>
            {!compact && <p className="text-[9px] text-gray-300 mt-1 uppercase tracking-tighter font-medium">JPG, PNG up to 5MB</p>}
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in">
            <Loader2 className="animate-spin text-orange-600 mb-2" size={24} />
            <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Uploading...</span>
          </div>
        )}
      </div>
      
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*"
      />

      {value && (
        <div className="flex items-center gap-3 bg-green-50 p-3 rounded-xl border border-green-100">
          <ImageIcon size={14} className="text-green-600" />
          <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest flex-1 truncate">Gambar Terunggah</span>
          <button 
            type="button"
            onClick={() => onChange('')}
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <motion.button
      whileHover={{ scale: active ? 1 : 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
        active 
        ? 'bg-gray-900 text-white shadow-sm' 
        : 'text-gray-400 hover:text-gray-900'
      }`}
    >
      <span>{label}</span>
    </motion.button>
  );
}

function FormInput({ label, value, onChange, placeholder, type = 'text', required = false }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string, type?: string, required?: boolean }) {
  return (
    <div className="space-y-3">
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 font-sans">{label}</label>
      <input 
        type={type} 
        required={required}
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={placeholder}
        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-100 outline-none text-gray-700 transition-all placeholder:text-gray-300"
      />
    </div>
  );
}
