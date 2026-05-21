import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, updateDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Edit3, Check, Trash2, Plus, ShoppingCart, Circle, CheckCircle2 } from 'lucide-react';
import { ShoppingList as IShoppingList, ShoppingItem } from '../types';
import Loader from '../components/Loader';

export default function ShoppingListDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [list, setList] = useState<IShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!id || !user) return;

    // Direct real-time listener for the given shopping list
    const docRef = doc(db, 'shoppingLists', id);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Security guard: Ensure it belongs to the active user
        if (data.userId !== user.uid) {
          navigate('/shopping-list');
          return;
        }
        setList({
          id: docSnap.id,
          userId: data.userId || '',
          title: data.title || 'Daftar Belanja Tanpa Nama',
          items: data.items || [],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        } as IShoppingList);
      } else {
        // Doc deleted or non-existent
        navigate('/shopping-list');
      }
      setLoading(false);
    }, (error) => {
      console.error("Error reading shopping list:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, user, navigate]);

  const updateListDoc = async (updates: Partial<IShoppingList>) => {
    if (!id) return;
    try {
      const docRef = doc(db, 'shoppingLists', id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error updating list:", error);
    }
  };

  const startEditingTitle = () => {
    if (!list) return;
    setTempTitle(list.title);
    setEditingTitle(true);
  };

  const handleSaveTitle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tempTitle.trim() || !list) return;

    setEditingTitle(false);
    await updateListDoc({ title: tempTitle.trim() });
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !list) return;

    const newItem: ShoppingItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name: newItemName.trim(),
      checked: false
    };

    setNewItemName('');
    await updateListDoc({
      items: [...list.items, newItem]
    });
  };

  const toggleCheck = async (itemId: string) => {
    if (!list) return;
    const updatedItems = list.items.map(item => 
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    await updateListDoc({ items: updatedItems });
  };

  const removeItem = async (itemId: string) => {
    if (!list) return;
    const updatedItems = list.items.filter(item => item.id !== itemId);
    await updateListDoc({ items: updatedItems });
  };

  const clearCompleted = async () => {
    if (!list) return;
    const updatedItems = list.items.filter(item => !item.checked);
    await updateListDoc({ items: updatedItems });
  };

  const clearAll = async () => {
    if (!list) return;
    await updateListDoc({ items: [] });
  };

  const handleDeleteList = async () => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'shoppingLists', id));
      navigate('/shopping-list');
    } catch (error) {
      console.error("Error deleting shopping list:", error);
    }
  };

  if (loading) return <Loader />;
  if (!list) return null;

  const completedCount = list.items.filter(i => i.checked).length;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFA] relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-emerald-100 rounded-full blur-3xl opacity-35 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-teal-100 rounded-full blur-3xl opacity-35 translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-12 pb-24 relative z-10 w-full">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link to="/shopping-list" className="inline-flex items-center text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 px-4 py-2 rounded-xl transition-all mb-4 -ml-3">
            <ArrowLeft size={16} className="mr-2" />
            Kembali ke Semua Daftar
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {editingTitle ? (
                  <form onSubmit={handleSaveTitle} className="flex items-center gap-2 w-full max-w-lg">
                    <input 
                      type="text"
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      className="text-xl md:text-2xl font-bold text-gray-900 bg-white border border-emerald-250 rounded-2xl px-4 py-2 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 w-full font-serif"
                      autoFocus
                      required
                    />
                    <button 
                      type="submit"
                      className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-md transition-all shrink-0"
                      title="Simpan Judul"
                    >
                      <Check size={20} />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-3 group">
                    <h1 className="text-3xl md:text-4xl font-serif font-black text-gray-900 tracking-tight leading-tight">
                      {list.title}
                    </h1>
                    <button 
                      onClick={startEditingTitle}
                      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all shrink-0"
                      title="Ubah Nama"
                    >
                      <Edit3 size={18} />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-gray-500 text-sm md:text-base">Daftar belanja bahan makanan sehat kustom Anda</p>
            </div>

            <div className="flex items-center gap-3 self-start md:self-end">
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="w-11 h-11 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-colors border border-gray-100"
                title="Hapus Daftar Ini"
              >
                <Trash2 size={18} />
              </button>

              <AnimatePresence>
                {list.items.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="text-xs md:text-sm font-semibold text-gray-600 bg-white/85 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-emerald-100 shadow-sm inline-flex items-center"
                  >
                    <span className="text-emerald-600 font-extrabold text-base mr-1">{completedCount}</span> dari <span className="font-bold text-gray-800 mx-1">{list.items.length}</span> dibeli
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-xl shadow-emerald-950/5 border border-emerald-50 p-6 md:p-8 relative overflow-hidden"
        >
          {/* Top colored indicator line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 opacity-60" />

          <form onSubmit={addItem} className="mb-8 flex flex-col sm:flex-row gap-3 relative z-10 pt-2">
            <div className="relative flex-1 group">
              <input 
                type="text" 
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Tambah bahan kustom (e.g. Dada Ayam 500g)"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-gray-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 focus:bg-white outline-none transition-all placeholder:text-gray-300 font-semibold text-sm"
              />
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={!newItemName.trim()}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl px-6 py-4 font-bold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 group whitespace-nowrap"
            >
              <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
              <span>Tambah Bahan</span>
            </motion.button>
          </form>

          {list.items.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center py-16 px-4 relative z-10"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-200 border border-emerald-100 relative">
                <ShoppingCart size={44} className="text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2 tracking-tight">Daftar Belanja Kosong</h3>
              <p className="text-gray-400 max-w-sm mx-auto text-sm leading-relaxed">Masukkan bahan belanja di atas secara manual atau langsung simpan dari Chat.</p>
            </motion.div>
          ) : (
            <div className="space-y-3 relative z-10">
              <AnimatePresence>
                {list.items.map((item, index) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, height: 0, margin: 0, padding: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`group flex items-center gap-3 sm:gap-4 p-4 rounded-2xl border transition-all duration-300 overflow-hidden ${
                      item.checked 
                      ? 'bg-gray-50/50 border-gray-100 opacity-60' 
                      : 'bg-white border-emerald-100/40 shadow-sm hover:border-emerald-200 hover:shadow-md'
                    }`}
                  >
                    <button 
                      onClick={() => toggleCheck(item.id)}
                      className={`flex-shrink-0 transition-colors ${item.checked ? 'text-emerald-500' : 'text-gray-300 hover:text-emerald-400'}`}
                    >
                      {item.checked ? <CheckCircle2 size={26} className="sm:w-7 sm:h-7" /> : <Circle size={26} className="sm:w-7 sm:h-7" />}
                    </button>
                    <span 
                      onClick={() => toggleCheck(item.id)}
                      className={`flex-1 text-base sm:text-lg cursor-pointer select-none transition-all ${item.checked ? 'line-through text-gray-450 font-medium' : 'text-gray-800 font-extrabold'}`}
                    >
                      {item.name}
                    </span>
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-gray-350 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all sm:opacity-0 sm:scale-95 group-hover:opacity-100 group-hover:scale-100"
                      title="Hapus"
                    >
                      <Trash2 size={18} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {list.items.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 pt-6 border-t border-emerald-100/40 flex flex-wrap gap-4 justify-between items-center relative z-10"
            >
              <button 
                onClick={clearCompleted}
                disabled={completedCount === 0}
                className="text-sm font-semibold text-gray-550 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50 disabled:hover:text-gray-500 transition-colors px-4 py-2.5 rounded-xl border border-transparent hover:border-emerald-100"
              >
                Hapus ({completedCount}) Selesai
              </button>
              <button 
                onClick={clearAll}
                className="text-sm font-semibold text-red-500 bg-red-50 px-4 py-2.5 rounded-xl hover:text-white hover:bg-red-500 transition-all"
              >
                Kosongkan Daftar
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Delete whole list overlay */}
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
              <h3 className="text-xl font-bold font-serif text-gray-900 mb-2">Hapus Daftar Belanja?</h3>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                "{list.title}" akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all font-sans"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    handleDeleteList();
                  }}
                  className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-200 font-sans"
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
