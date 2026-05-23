import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, ArrowLeft, Plus, Trash2, FileText, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, addDoc, deleteDoc } from 'firebase/firestore';
import { ShoppingList as IShoppingList } from '../types';
import Loader from '../components/Loader';

export default function ShoppingList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lists, setLists] = useState<IShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [listIdToDelete, setListIdToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // Real-time listener for the user's shopping lists
    const q = query(
      collection(db, 'shoppingLists'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLists: IShoppingList[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedLists.push({
          id: docSnap.id,
          userId: data.userId || '',
          title: data.title || 'Daftar Belanja Tanpa Nama',
          items: data.items || [],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        } as IShoppingList);
      });
      
      // Sort in descending order by updatedAt
      fetchedLists.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      setLists(fetchedLists);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching shopping lists:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newListTitle.trim()) return;

    try {
      const now = new Date().toISOString();
      const newDocRef = await addDoc(collection(db, 'shoppingLists'), {
        userId: user.uid,
        title: newListTitle.trim(),
        items: [],
        createdAt: now,
        updatedAt: now
      });

      setNewListTitle('');
      setShowCreateModal(false);
      navigate(`/shopping-list/${newDocRef.id}`);
    } catch (error) {
      console.error("Error creating shopping list:", error);
      alert("Gagal membuat daftar belanja baru.");
    }
  };

  const handleConfirmDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'shoppingLists', id));
      setListIdToDelete(null);
    } catch (error) {
      console.error("Error deleting shopping list:", error);
      alert("Gagal menghapus daftar belanja.");
    }
  };

  const filteredLists = lists.filter(list => 
    list.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <Loader />;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFA] relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-emerald-100 rounded-full blur-3xl opacity-35 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-teal-100 rounded-full blur-3xl opacity-35 translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 pb-28 relative z-10">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex-1">
            <Link to="/" className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 px-4 py-2 rounded-xl transition-all mb-4">
              <ArrowLeft size={14} className="mr-2" />
              Kembali ke Beranda
            </Link>
            <h1 className="text-3xl md:text-5xl font-black font-serif text-gray-900 tracking-tight flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white rotate-6 shadow-md shadow-emerald-200">
                🛒
              </div>
              Daftar Belanja Sehat
            </h1>
            <p className="text-gray-500 mt-4 text-sm md:text-base max-w-xl">
              Kelola daftar belanja bahan makanan sehat yang kustom untuk resep & menu harianmu.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto shrink-0">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Cari daftar belanja..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-emerald-100 focus:border-emerald-200 outline-none text-sm transition-all"
              />
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-2xl shadow-lg shadow-emerald-200/50 transition-all font-bold w-full sm:w-auto hover:-translate-y-1"
            >
              <Plus size={20} />
              <span className="whitespace-nowrap">Buat Daftar Baru</span>
            </button>
          </div>
        </header>

        {filteredLists.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLists.map((list) => {
              const checkedItems = list.items.filter(i => i.checked).length;
              const totalItems = list.items.length;
              const progressPercentage = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

              return (
                <div key={list.id} className="relative h-full select-none">
                  <Link to={`/shopping-list/${list.id}`} className="block h-full group">
                    <div className="bg-white rounded-[2rem] p-6 h-full border border-gray-100 hover:border-emerald-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col relative overflow-hidden group-hover:-translate-y-1">
                      <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50/50 rounded-full blur-2xl group-hover:bg-emerald-100 transition-colors" />

                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800">
                          <ShoppingCart size={14} />
                          List Belanja
                        </div>
                        
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setListIdToDelete(list.id);
                          }}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors relative z-20"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <h3 className="text-xl font-bold font-serif text-gray-900 group-hover:text-emerald-600 transition-colors line-clamp-2 leading-tight mb-4">
                        {list.title}
                      </h3>

                      <div className="mt-auto space-y-3">
                        <div className="flex justify-between items-center text-xs font-semibold text-gray-500">
                          <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg text-[11px]">
                            <FileText size={14} className="text-gray-400" />
                            {totalItems} Bahan Makanan
                          </span>
                          <span>{checkedItems}/{totalItems} Dibeli</span>
                        </div>
                        
                        {totalItems > 0 && (
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-full transition-all duration-500"
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>

                  <AnimatePresence>
                    {listIdToDelete === list.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute inset-0 bg-red-600/95 rounded-[2rem] p-6 z-30 flex flex-col items-center justify-center text-center text-white border border-red-500 shadow-xl"
                      >
                        <Trash2 size={32} className="mb-2 text-white animate-bounce" />
                        <h4 className="font-bold text-base leading-tight mb-1">Hapus Daftar Ini?</h4>
                        <p className="text-xs text-red-100 mb-4 px-2 max-w-[200px]">Daftar ini akan dihapus secara permanen.</p>
                        <div className="flex gap-3 justify-center">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setListIdToDelete(null);
                            }}
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all"
                          >
                            Batal
                          </button>
                          <button
                            onClick={(e) => handleConfirmDelete(e, list.id)}
                            className="px-4 py-2 bg-white text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-all shadow-md"
                          >
                            Hapus
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm max-w-xl mx-auto"
          >
            <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-400 mx-auto mb-6 text-4xl shadow-inner">
              📝
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2 font-serif">Belum Ada Daftar Belanjaan</h3>
            <p className="text-gray-500 max-w-sm mx-auto text-sm leading-relaxed mb-8">
              Kamu bisa membuat daftar baru secara manual atau langsung menyimpannya dari percakapan Chat dengan Chef AI.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-2xl shadow-lg shadow-emerald-100 font-bold transition-all hover:-translate-y-1"
            >
              <Plus size={18} />
              <span>Buat Daftar Pertama</span>
            </button>
          </motion.div>
        )}
      </div>

      {/* Title creation modal overlay */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-gray-100 relative overflow-hidden"
            >
              <h3 className="text-2xl font-black font-serif text-gray-900 mb-2">Daftar Belanja Barumu</h3>
              <p className="text-gray-500 text-sm mb-6">
                Beri nama daftar belanja ini untuk menaruh bahan sehat kustommu.
              </p>
              
              <form onSubmit={handleCreateList} className="space-y-6">
                <input 
                  type="text" 
                  autoFocus
                  required
                  placeholder="Misal: Bahan Salmon Teriyaki Sehat"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-gray-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 focus:bg-white outline-none transition-all placeholder:text-gray-400 font-medium"
                />

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewListTitle('');
                    }}
                    className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all font-sans"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-100 font-sans"
                  >
                    Buat List
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
