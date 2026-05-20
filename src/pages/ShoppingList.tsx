import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle, Trash2, Plus, ShoppingCart, ArrowLeft, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

interface ShoppingItem {
  id: string;
  name: string;
  checked: boolean;
}

export default function ShoppingList() {
  const { user } = useAuth();
  
  const [items, setItems] = useState<ShoppingItem[]>(() => {
    const saved = localStorage.getItem('dapursehat_shopping_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [newItem, setNewItem] = useState('');

  // Sync with Firebase or Local Storage
  useEffect(() => {
    if (user) {
      // Sync from Firebase
      const unsubscribe = onSnapshot(doc(db, 'shoppingLists', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const firebaseItems = data.items || [];
          setItems(firebaseItems);
          localStorage.setItem('dapursehat_shopping_list', JSON.stringify(firebaseItems));
        } else {
          // If no doc in firebase, you might want to push existing localstorage to firebase one time
          // Or just leave it blank. We can sync existing local storage to firebase.
          const saved = localStorage.getItem('dapursehat_shopping_list');
          if (saved) {
            try {
              const localItems = JSON.parse(saved);
              if (localItems.length > 0) {
                 setDoc(doc(db, 'shoppingLists', user.uid), { items: localItems });
              }
            } catch (e) {
                console.error(e);
            }
          }
        }
      });
      return () => unsubscribe();
    } else {
      // Load from local storage if not logged in
      const saved = localStorage.getItem('dapursehat_shopping_list');
      if (saved) {
        try {
          setItems(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse local storage", e);
        }
      }
    }
  }, [user]);

  // Listen for external updates (e.g., from MealPlannerChat)
  useEffect(() => {
    const handleUpdate = () => {
      // We only read from local source if not using user sync
      // If we have user, onSnapshot will handle it.
      if (!user) {
          const saved = localStorage.getItem('dapursehat_shopping_list');
          if (saved) {
            try {
              setItems(JSON.parse(saved));
            } catch (e) {
              console.error("Failed to parse shopping list on external update", e);
            }
          }
      }
    };
    
    window.addEventListener('shopping_list_updated', handleUpdate);
    return () => window.removeEventListener('shopping_list_updated', handleUpdate);
  }, [user]);

  const updateItems = (newItems: ShoppingItem[]) => {
    setItems(newItems);
    localStorage.setItem('dapursehat_shopping_list', JSON.stringify(newItems));
    if (user) {
      setDoc(doc(db, 'shoppingLists', user.uid), { items: newItems }).catch(e => {
        console.error("Error saving to Firebase", e);
      });
    }
  };

  const toggleCheck = (id: string) => {
    updateItems(items.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const removeItem = (id: string) => {
    updateItems(items.filter(item => item.id !== id));
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    updateItems([...items, { id: Date.now().toString(), name: newItem.trim(), checked: false }]);
    setNewItem('');
  };

  const clearCompleted = () => {
    updateItems(items.filter(item => !item.checked));
  };
  
  const clearAll = () => {
    updateItems([]);
  }

  const completedCount = items.filter(i => i.checked).length;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFA] relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-emerald-100 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-teal-100 rounded-full blur-3xl opacity-30 translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-12 pb-24 relative z-10 w-full">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link to="/" className="inline-flex items-center text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition-all mb-4 -ml-3">
            <ArrowLeft size={16} className="mr-2" />
            Kembali ke Beranda
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight flex items-center gap-3 drop-shadow-sm">
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-200 rounded-full blur-md opacity-50" />
                  <ShoppingCart size={36} className="text-emerald-600 relative z-10 md:w-10 w-9 md:h-10 h-9" />
                </div>
                Daftar Belanjaan
              </h1>
              <p className="text-gray-500 mt-2 text-sm md:text-lg">Catat bahan makanan sehat yang perlu dibeli</p>
            </div>
            <AnimatePresence>
              {items.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-xs md:text-sm font-medium text-gray-600 bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-full border border-emerald-100 shadow-sm inline-flex items-center self-start md:self-end"
                >
                  <span className="text-emerald-600 font-black text-base mr-1">{completedCount}</span> dari <span className="font-bold text-gray-800 mx-1.5">{items.length}</span> dibeli
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-emerald-900/5 border border-emerald-50 p-5 md:p-8 relative overflow-hidden"
        >
          {/* Subtle gradient border top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 opacity-50" />

          <form onSubmit={addItem} className="mb-8 flex flex-col sm:flex-row gap-3 relative z-10">
            <div className="relative flex-1 group">
              <input 
                type="text" 
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Tambah bahan (e.g. Dada Ayam 500g)"
                className="w-full bg-gray-50/80 border border-gray-200 rounded-2xl px-5 py-4 text-gray-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 focus:bg-white outline-none transition-all placeholder:text-gray-400 font-medium"
              />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-emerald-500/20 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity" />
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={!newItem.trim()}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl px-6 py-4 font-bold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 group whitespace-nowrap"
            >
              <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
              <span>Tambah</span>
            </motion.button>
          </form>

          {items.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center py-16 px-4 relative z-10"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-200 border border-emerald-100 relative">
                <ShoppingCart size={48} className="text-emerald-400" />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full border-2 border-emerald-300"
                />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3 tracking-tight">Belum ada daftar belanjaan</h3>
              <p className="text-gray-500 max-w-sm mx-auto leading-relaxed">Tambah bahan makanan secara manual atau gunakan AI Smart Meal Planner untuk daftar otomatis.</p>
            </motion.div>
          ) : (
            <div className="space-y-3 relative z-10">
              <AnimatePresence>
                {items.map((item, index) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, height: 0, margin: 0, padding: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition-all duration-300 overflow-hidden ${
                      item.checked 
                      ? 'bg-gray-50/50 border-gray-100 opacity-60' 
                      : 'bg-white border-emerald-100/50 shadow-sm hover:border-emerald-200 hover:shadow-md'
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
                      className={`flex-1 text-base sm:text-lg cursor-pointer select-none transition-all ${item.checked ? 'line-through text-gray-500' : 'text-gray-800 font-semibold'}`}
                    >
                      {item.name}
                    </span>
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 focus:bg-red-50 focus:text-red-500 rounded-xl transition-all sm:opacity-0 sm:scale-95 group-hover:opacity-100 group-hover:scale-100 hover:rotate-12"
                      title="Hapus"
                    >
                      <Trash2 size={18} className="sm:w-5 sm:h-5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {items.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 pt-6 border-t border-emerald-100/50 flex flex-wrap gap-4 justify-between items-center relative z-10"
            >
              <button 
                onClick={clearCompleted}
                disabled={completedCount === 0}
                className="text-sm font-semibold text-gray-500 hover:text-emerald-700 disabled:opacity-50 disabled:hover:text-gray-500 transition-colors bg-gray-50/80 hover:bg-emerald-50 px-4 py-2.5 rounded-xl border border-transparent disabled:hover:border-transparent hover:border-emerald-200"
              >
                Hapus ({completedCount}) Selesai
              </button>
              <button 
                onClick={clearAll}
                className="text-sm font-semibold text-red-500 hover:text-white bg-red-50 hover:bg-red-500 px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 group w-full sm:w-auto justify-center"
              >
                <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                Kosongkan Semua
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
