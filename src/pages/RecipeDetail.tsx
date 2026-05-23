import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, getDocs, addDoc, serverTimestamp, orderBy, updateDoc, increment, deleteDoc, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Recipe, Comment, ShoppingList as IShoppingList, ShoppingItem } from '../types';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, ChevronRight, Clock, Users, Star, Salad, 
  MessageCircle, Info, Timer, Trash2, ChefHat, ShoppingCart, Plus, Check, Loader2
} from 'lucide-react';
import CookingTimer from '../components/CookingTimer';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { formatDate } from '../lib/utils';

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { showToast } = useUI();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // States for Healthy Menu Shopping List integration
  const [userLists, setUserLists] = useState<IShoppingList[]>([]);
  const [fetchingLists, setFetchingLists] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string>('new');
  const [newListName, setNewListName] = useState('');
  const [addingToShoppingList, setAddingToShoppingList] = useState(false);

  useEffect(() => {
    if (showListModal && user) {
      fetchUserLists();
    }
  }, [showListModal, user]);

  const fetchUserLists = async () => {
    setFetchingLists(true);
    try {
      const q = query(
        collection(db, 'shoppingLists'),
        where('userId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const lists: any[] = [];
      querySnapshot.forEach((doc) => {
        lists.push({ id: doc.id, ...doc.data() });
      });
      lists.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setUserLists(lists);
      if (lists.length > 0) {
        setSelectedListId(lists[0].id);
      } else {
        setSelectedListId('new');
      }
    } catch (error) {
      console.error("Error fetching user lists:", error);
    } finally {
      setFetchingLists(false);
    }
  };

  const handleAddToShoppingList = async () => {
    if (!user || !recipe) return;

    setAddingToShoppingList(true);
    try {
      const now = new Date().toISOString();
      const newItems: ShoppingItem[] = recipe.ingredients.map(ing => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5) + '_' + Math.random().toString(36).substr(2, 5),
        name: ing.trim(),
        checked: false
      }));

      let targetListId = selectedListId;
      let finalTitle = '';

      if (selectedListId === 'new') {
        const titleText = newListName.trim() || `Bahan ${recipe.title}`;
        finalTitle = titleText;
        const newDocRef = await addDoc(collection(db, 'shoppingLists'), {
          userId: user.uid,
          title: titleText,
          items: newItems,
          createdAt: now,
          updatedAt: now
        });
        targetListId = newDocRef.id;
      } else {
        const existingList = userLists.find(l => l.id === selectedListId);
        if (existingList) {
          finalTitle = existingList.title;
          const mergedItems = [...existingList.items, ...newItems];
          const docRef = doc(db, 'shoppingLists', selectedListId);
          await updateDoc(docRef, {
            items: mergedItems,
            updatedAt: now
          });
        }
      }

      showToast(`Berhasil menambahkan ${recipe.ingredients.length} bahan ke '${finalTitle}'! 🛒`, 'success');
      setShowListModal(false);
    } catch (error) {
      console.error("Error adding to shopping list:", error);
      showToast('Gagal menambahkan bahan ke daftar belanja.', 'error');
    } finally {
      setAddingToShoppingList(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchRecipeData();
    }
  }, [id]);

  const fetchRecipeData = async () => {
    setLoading(true);
    try {
      const recipeDoc = await getDoc(doc(db, 'recipes', id!));
      if (recipeDoc.exists()) {
        setRecipe({ id: recipeDoc.id, ...recipeDoc.data() } as Recipe);
        
        const commentsQuery = query(
          collection(db, 'recipes', id!, 'comments'),
          orderBy('createdAt', 'desc')
        );
        const commentsSnapshot = await getDocs(commentsQuery);
        setComments(commentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `recipes/${id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      showToast('Silakan login terlebih dahulu untuk memberikan ulasan.', 'info');
      return;
    }
    if (!commentText.trim()) {
      showToast('Komentar tidak boleh kosong.', 'info');
      return;
    }

    setSubmitting(true);
    try {
      const newComment = {
        recipeId: id!,
        userId: profile.uid,
        userName: profile.displayName,
        userPhoto: profile.photoURL,
        text: commentText,
        rating: rating,
      };

      await addDoc(collection(db, 'recipes', id!, 'comments'), {
        ...newComment,
        createdAt: serverTimestamp()
      });

      // Update recipe rating average
      const currentReviewCount = recipe?.reviewCount || 0;
      const currentRating = recipe?.rating || 0;
      const newReviewCount = currentReviewCount + 1;
      const newRating = ((currentRating * currentReviewCount) + rating) / newReviewCount;
      
      try {
        await updateDoc(doc(db, 'recipes', id!), {
          rating: Number(newRating.toFixed(1)),
          reviewCount: increment(1)
        });
      } catch (updateError) {
        console.warn("Failed to update recipe totals, but comment was added:", updateError);
      }

      setCommentText('');
      setRating(5);
      fetchRecipeData();
      showToast('Ulasan Anda berhasil dikirim! ✨', 'success');
    } catch (error) {
      console.error(error);
      showToast('Gagal mengirim ulasan. Silakan coba kembali.', 'error');
      handleFirestoreError(error, OperationType.CREATE, `recipes/${id}/comments`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!profile || !id) return;
    
    // Simpler check or just execute if confirm is problematic in this env
    try {
      await deleteDoc(doc(db, 'recipes', id, 'comments', commentId));
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `recipes/${id}/comments/${commentId}`);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
            <Salad size={40} className="text-[#5A5A40]" />
        </motion.div>
    </div>
  );
  
  if (!recipe) return <div className="text-center py-20">Resep tidak ditemukan.</div>;

  const isNoImage = !recipe.coverImage || recipe.coverImage === '' || recipe.coverImage.includes('unsplash.com/photo-1546069901-ba9599a7e63c');

  return (
    <div className="bg-[#FAFAF8] min-h-screen pb-20 relative">
      {/* Hero Section */}
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        {isNoImage ? (
          <div className="w-full h-full bg-gradient-to-br from-[#FAFAF8] via-[#E8E8D5] to-[#D9D9C3] flex flex-col items-center justify-center p-6 relative">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-40" />
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="flex flex-col items-center gap-3 text-center max-w-sm relative z-10"
            >
              <div className="w-16 h-16 rounded-full bg-white/90 shadow-md flex items-center justify-center text-orange-600 border border-orange-105">
                <ChefHat size={32} className="stroke-[1.5]" />
              </div>
              <h3 className="font-serif font-bold text-gray-800 text-lg tracking-wider uppercase">No Cover Picture</h3>
              <p className="text-xs text-gray-500 leading-relaxed max-w-xs font-sans tracking-tight">Setiap suapan kaya akan cerita. Coba kreasikan langkah-langkah di bawah untuk menghidupkan hidangan ini!</p>
            </motion.div>
          </div>
        ) : (
          <motion.img 
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.5 }}
            src={recipe.coverImage} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="absolute inset-0 bg-black/10 mix-blend-multiply pointer-events-none" />
        
        {!isNoImage && recipe.imageCredit && (
          <div className="absolute bottom-28 right-6 bg-black/45 backdrop-blur-sm text-white text-[10px] font-bold tracking-widest uppercase px-3.5 py-1.5 rounded-full border border-white/10 select-none z-10 font-sans shadow-sm">
            📸 foto: {recipe.imageCredit}
          </div>
        )}
        
        <Link 
          to="/" 
          className="absolute top-6 left-6 w-10 h-10 bg-white md:bg-white/90 md:backdrop-blur-md rounded-full flex items-center justify-center text-gray-900 shadow-sm hover:bg-white transition-all z-10"
        >
          <ChevronLeft size={20} />
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-24 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100"
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
            <div className="flex-1">
              <div className="flex gap-2 mb-6">
                <span className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold px-3 py-1 rounded-full border border-gray-100 tracking-widest">{recipe.mealTime}</span>
                {recipe.condition && (
                  <span className="bg-orange-600 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full tracking-widest">{recipe.condition}</span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-6 leading-tight">{recipe.title}</h1>
              <p className="text-gray-500 leading-relaxed text-base max-w-2xl border-l-2 border-orange-600 pl-6">
                {recipe.description}
              </p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 min-w-[220px]">
                <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rating</span>
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1 text-orange-600">
                          <Star size={16} fill="currentColor" />
                          <span className="font-bold text-lg">{recipe.rating.toFixed(1)}</span>
                      </div>
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">{recipe.reviewCount || 0} Ulasan</span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Waktu</span>
                        <div className="flex items-center gap-1.5 text-gray-700">
                            <Clock size={12} />
                            <span className="text-xs font-bold">{recipe.prepTime || '30 Mnt'}</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Porsi</span>
                        <div className="flex items-center gap-1.5 text-gray-700">
                            <Users size={12} />
                            <span className="text-xs font-bold">{recipe.servings || '2-3 Org'}</span>
                        </div>
                    </div>
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            {/* Ingredients & Nutrition */}
            <div className="md:col-span-4 lg:col-span-3">
              <div className="mb-12">
                <h3 className="text-[11px] uppercase tracking-widest font-bold text-gray-400 mb-6 px-1">Gizi Lengkap</h3>
                <div className="space-y-2">
                  <NutritionRow label="Kalori" value={recipe.nutrition.calories} unit="kkal" color="bg-orange-600" />
                  <NutritionRow label="Protein" value={recipe.nutrition.protein} unit="g" color="bg-gray-900" />
                  <NutritionRow label="Lemak" value={recipe.nutrition.fat} unit="g" color="bg-gray-400" />
                  <NutritionRow label="Karbo" value={recipe.nutrition.carbs} unit="g" color="bg-gray-200" />
                </div>
              </div>

              <div>
                <h3 className="text-[11px] uppercase tracking-widest font-bold text-gray-400 mb-6 px-1">Bahan-bahan</h3>
                <ul className="space-y-4">
                  {recipe.ingredients.map((ing, i) => (
                    <motion.li 
                      key={i} 
                      whileHover={{ x: 6 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="flex items-start gap-3 group cursor-default"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-600 mt-1.5 shrink-0 transition-transform duration-200 group-hover:scale-130" />
                      <span className="text-gray-600 text-sm leading-relaxed group-hover:text-gray-900 transition-colors duration-200 uppercase font-bold tracking-tighter">{ing}</span>
                    </motion.li>
                  ))}
                </ul>

                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (!user) {
                      showToast('Silakan login terlebih dahulu untuk mengelola daftar belanja sehat Anda.', 'info');
                      return;
                    }
                    setNewListName(`Belanja: ${recipe.title}`);
                    setShowListModal(true);
                  }}
                  className="w-full mt-8 bg-emerald-600 hover:bg-emerald-700 text-white py-4 px-5 rounded-2xl font-bold text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2.5 shadow-md shadow-emerald-100 hover:shadow-xl hover:shadow-emerald-200/40 transition-all duration-300"
                >
                  <ShoppingCart size={15} />
                  <span>Masukkan List Belanja</span>
                </motion.button>
              </div>
            </div>

            {/* Step by Step Slider */}
            <div className="md:col-span-8 lg:col-span-9">
              <h3 className="text-[11px] uppercase tracking-widest font-bold text-gray-400 mb-6 px-1">Step-by-Step Pembuatan</h3>
              
              <div className="relative group/swiper">
                <Swiper
                  modules={[Navigation]}
                  navigation={{
                    prevEl: '.swiper-nav-prev',
                    nextEl: '.swiper-nav-next',
                  }}
                  onSlideChange={(swiper) => setActiveStep(swiper.activeIndex)}
                  autoHeight={true}
                  className="rounded-3xl bg-gray-50 border border-gray-100 overflow-hidden"
                >
                  {recipe.instructions.map((step, idx) => (
                    <SwiperSlide key={idx} className="p-5 md:p-12 pb-40 md:pb-32">
                      <div className={`grid grid-cols-1 ${step.image ? 'lg:grid-cols-2' : ''} gap-8 lg:gap-16 items-start max-w-5xl mx-auto`}>
                        <div className={`${step.image ? 'order-2 lg:order-1' : ''} pt-4`}>
                          <div className="flex items-center gap-4 mb-6">
                            <div className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center text-sm font-black shadow-lg">
                              {idx + 1}
                            </div>
                            <span className="text-[9px] font-bold text-orange-600 uppercase tracking-[0.3em]">Langkah Persiapan</span>
                          </div>
                          
                          <div className="prose prose-orange max-w-none">
                             <p className="text-gray-800 text-base md:text-lg font-medium leading-relaxed">
                              {step.text}
                            </p>
                          </div>

                          {step.duration > 0 && (
                            <motion.button 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                // Unlock audio on iOS strictly during direct user interaction
                                const dummyAudio = new Audio("data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq==");
                                dummyAudio.loop = true;
                                dummyAudio.play().catch(() => {});
                                (window as any).backgroundSilentAudio = dummyAudio;

                                if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                                  Notification.requestPermission();
                                }
                                window.dispatchEvent(new CustomEvent('start-cooking-timer', { 
                                  detail: { duration: step.duration } 
                                }));
                              }}
                              className="mt-6 flex items-center gap-3 bg-orange-50 text-orange-600 px-5 py-3 rounded-2xl hover:bg-orange-600 hover:text-white transition-all shadow-sm border border-orange-100 group/timer"
                            >
                              <Timer size={18} className="group-hover/timer:animate-pulse" />
                              <div className="text-left">
                                <p className="text-[10px] font-bold uppercase tracking-widest leading-none mb-1">Mulai Hitung Mundur</p>
                                <p className="text-xs font-black tracking-tight">{step.duration} MENIT</p>
                              </div>
                            </motion.button>
                          )}
                          
                          <div className="mt-8 flex items-center gap-3 text-gray-400">
                            <Info size={14} />
                            <span className="text-[9px] font-bold uppercase tracking-widest">Pastikan bahan sudah dicuci bersih</span>
                          </div>
                        </div>
                        
                        {step.image && (
                          <div className="order-1 lg:order-2 w-full aspect-video lg:aspect-[4/3] rounded-3xl overflow-hidden border-4 border-white shadow-lg shadow-orange-100/50 relative group">
                            <img 
                              src={step.image} 
                              alt={`Langkah ${step.step}`} 
                              className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" 
                            />
                            {step.imageCredit && (
                              <div className="absolute bottom-3 right-3 bg-black/45 backdrop-blur-sm text-white text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full border border-white/10 select-none font-sans z-10 transition-opacity duration-300">
                                📸 {step.imageCredit}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>

                {/* Custom Navigation Stepper - Unified floating pill */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center z-10 pointer-events-none">
                  <div className="flex items-center gap-4 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-gray-100/80 shadow-xl shadow-orange-950/5 pointer-events-auto">
                    <button className="swiper-nav-prev w-9 h-9 bg-gray-50 hover:bg-orange-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-700 hover:text-orange-600 transition-all duration-300 disabled:opacity-30 cursor-pointer shadow-sm">
                      <ChevronLeft size={18} strokeWidth={2.5} />
                    </button>
                    
                    <div className="flex items-center gap-1.5 px-3 select-none min-w-[64px] justify-center">
                      <span className="font-sans text-sm font-black text-orange-600 tracking-tight">
                        {activeStep + 1}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest font-black text-gray-300">
                        /
                      </span>
                      <span className="font-sans text-sm font-bold text-gray-500 tracking-tight">
                        {recipe.instructions.length}
                      </span>
                    </div>

                    <button className="swiper-nav-next w-9 h-9 bg-gray-50 hover:bg-orange-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-700 hover:text-orange-600 transition-all duration-300 disabled:opacity-30 cursor-pointer shadow-sm">
                      <ChevronRight size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
              

            </div>
          </div>
        </motion.div>

        {/* Comments Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-12 gap-12">
            <div className="md:col-span-4 lg:col-span-4">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 sticky top-24">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Beri Ulasan</h3>
                    <p className="text-[10px] text-gray-400 mb-8 font-bold uppercase tracking-widest">Bagikan pengalaman memasak Anda</p>
                    
                    <form onSubmit={handleCommentSubmit} className="space-y-6">
                        <div>
                            <div className="flex justify-between items-center mb-4">
                               <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rating</label>
                               <span className="text-xs font-bold text-orange-600">{rating} / 5</span>
                            </div>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        className={`transition-all ${rating >= star ? 'text-orange-500 scale-110' : 'text-gray-200'}`}
                                    >
                                        <Star size={24} fill={rating >= star ? "currentColor" : "none"} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Komentar</label>
                            <textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Tuliskan pengalaman Anda..."
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-orange-100 min-h-[120px] transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-600 transition-all disabled:opacity-50"
                        >
                            {submitting ? 'Mengirim...' : 'Kirim Ulasan'}
                        </button>
                    </form>
                </div>
            </div>

            <div className="md:col-span-8 lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-3xl font-serif font-bold text-gray-900">Ulasan</h3>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {comments.length} Respon
                    </div>
                </div>

                {comments.length > 0 ? (
                    <div className="grid gap-6">
                        {comments.map((comment) => (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={comment.id} 
                                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
                            >
                                <div className="flex items-start gap-4">
                                    <img src={comment.userPhoto} alt={comment.userName} className="w-10 h-10 rounded-xl object-cover grayscale" />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-sm tracking-tight">{comment.userName}</h4>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">{formatDate(comment.createdAt)}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1 text-orange-500 px-2 py-0.5 rounded-lg border border-orange-100 bg-orange-50">
                                                    <Star size={10} fill="currentColor" />
                                                    <span className="text-[10px] font-bold">{comment.rating}</span>
                                                </div>
                                                {(profile?.uid === comment.userId || profile?.role === 'admin') && (
                                                    <button 
                                                        onClick={() => handleDeleteComment(comment.id)}
                                                        className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                                        title="Hapus Komentar"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-gray-600 text-sm leading-relaxed">
                                            "{comment.text}"
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <MessageCircle size={40} className="mx-auto text-gray-100 mb-4" />
                        <p className="text-gray-400 text-sm font-medium">Beri ulasan pertama untuk resep ini.</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Shopping List Integration Modal */}
      <AnimatePresence>
        {showListModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-gray-100 relative overflow-hidden"
            >
              <div className="flex items-center gap-3.5 mb-2">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <ShoppingCart size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black font-serif text-gray-900 leading-tight">Daftar Belanja Sehat</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Masukkan Bahan Ke Daftar Belanja</p>
                </div>
              </div>

              <p className="text-gray-500 text-xs leading-relaxed mb-6">
                Masukkan bahan makanan dari <span className="font-bold text-gray-800">"{recipe.title}"</span> ke dalam list belanja sehat Anda.
              </p>

              {fetchingLists ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                    <Loader2 size={24} className="text-emerald-650 animate-spin" />
                  </motion.div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Memuat daftar belanja...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Select Destination */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pilih Daftar Belanja</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {userLists.map((list) => (
                        <label
                          key={list.id}
                          className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                            selectedListId === list.id
                              ? 'border-emerald-500 bg-emerald-50/40 text-emerald-990 shadow-sm'
                              : 'border-gray-50 hover:border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="shoppingListSelect"
                              checked={selectedListId === list.id}
                              onChange={() => setSelectedListId(list.id)}
                              className="accent-emerald-600 w-4 h-4 cursor-pointer"
                            />
                            <div className="text-left">
                              <span className="text-sm font-bold block leading-tight text-gray-800">{list.title}</span>
                              <span className="text-[9px] font-bold text-gray-400 uppercase">{list.items.length} bahan saat ini</span>
                            </div>
                          </div>
                        </label>
                      ))}

                      {/* Option for New List */}
                      <label
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          selectedListId === 'new'
                            ? 'border-emerald-500 bg-emerald-50/40 text-emerald-990 shadow-sm'
                            : 'border-gray-50 hover:border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <input
                            type="radio"
                            name="shoppingListSelect"
                            checked={selectedListId === 'new'}
                            onChange={() => setSelectedListId('new')}
                            className="accent-emerald-600 w-4 h-4 cursor-pointer"
                          />
                          <div className="text-left flex-1">
                            <span className="text-sm font-bold block leading-tight text-gray-900 flex items-center gap-1.5">
                              <Plus size={14} className="text-emerald-600" strokeWidth={3} />
                              Buat List Belanja Baru
                            </span>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Input details for New List if selected */}
                  <AnimatePresence>
                    {selectedListId === 'new' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden space-y-2 text-left"
                      >
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Nama Daftar Belanja Baru</label>
                        <input
                          type="text"
                          required
                          placeholder="Misal: Bahan Salmon Teriyaki Sehat"
                          value={newListName}
                          onChange={(e) => setNewListName(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm text-gray-850 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 focus:bg-white outline-none transition-all placeholder:text-gray-400 font-medium"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit state */}
                  <div className="flex gap-4 pt-2">
                    <button
                      type="button"
                      disabled={addingToShoppingList}
                      onClick={() => {
                        setShowListModal(false);
                      }}
                      className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all font-sans text-xs uppercase tracking-widest disabled:opacity-50"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={addingToShoppingList || (selectedListId === 'new' && !newListName.trim())}
                      onClick={handleAddToShoppingList}
                      className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-100 font-sans text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      {addingToShoppingList ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <Check size={14} strokeWidth={3} />
                          <span>Tambahkan</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NutritionRow({ label, value, unit, color }: { label: string, value: string, unit: string, color: string }) {
    return (
        <motion.div 
            whileHover={{ x: 6 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 group hover:border-orange-200 transition-all duration-200 cursor-default shadow-sm hover:shadow-md"
        >
            <div className="flex items-center gap-3">
               <div className={`w-2 h-2 rounded-full ${color} shrink-0 transition-transform duration-200 group-hover:scale-130`} />
               <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter transition-colors duration-200 group-hover:text-gray-900">{label}</span>
            </div>
            <div className="flex items-baseline gap-0.5">
                <span className="text-sm font-bold text-gray-900">{value}</span>
                <span className="text-[9px] font-bold text-gray-400 uppercase">{unit}</span>
            </div>
        </motion.div>
    );
}
