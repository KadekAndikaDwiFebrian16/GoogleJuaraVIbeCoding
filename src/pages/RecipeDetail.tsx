import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, getDocs, addDoc, serverTimestamp, orderBy, updateDoc, increment } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Recipe, Comment, Nutrition } from '../types';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { motion } from 'motion/react';
import { 
  ChevronLeft, Clock, Users, Star, ChefHat, 
  Flame, Salad, Droplets, Beef, Send,
  MessageCircle, Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../lib/utils';

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

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
    if (!profile || !commentText.trim()) return;

    setSubmitting(true);
    try {
      const newComment = {
        recipeId: id!,
        userId: profile.uid,
        userName: profile.displayName,
        userPhoto: profile.photoURL,
        text: commentText,
        rating: rating,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'recipes', id!, 'comments'), {
        ...newComment,
        createdAt: serverTimestamp()
      });

      // Update recipe rating average (simplified)
      const newReviewCount = (recipe?.reviewCount || 0) + 1;
      const newRating = ((recipe?.rating || 0) * (recipe?.reviewCount || 0) + rating) / newReviewCount;
      
      await updateDoc(doc(db, 'recipes', id!), {
        rating: newRating,
        reviewCount: increment(1)
      });

      setCommentText('');
      setRating(5);
      fetchRecipeData();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `recipes/${id}/comments`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
            <ChefHat size={40} className="text-[#5A5A40]" />
        </motion.div>
    </div>
  );
  
  if (!recipe) return <div className="text-center py-20">Resep tidak ditemukan.</div>;

  return (
    <div className="bg-[#FAFAF8] min-h-screen pb-20">
      {/* Hero Section */}
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        <motion.img 
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5 }}
          src={recipe.coverImage} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/30" />
        
        <Link 
          to="/" 
          className="absolute top-6 left-6 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-gray-900 shadow-sm hover:bg-white transition-all z-10"
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
                            <span className="text-xs font-bold">30 Mnt</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Porsi</span>
                        <div className="flex items-center gap-1.5 text-gray-700">
                            <Users size={12} />
                            <span className="text-xs font-bold">2-3 Org</span>
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
                      whileHover={{ x: 5 }}
                      className="flex items-start gap-3 group cursor-default"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-600 mt-1.5" />
                      <span className="text-gray-600 text-sm leading-relaxed group-hover:text-gray-900 transition-colors uppercase font-bold tracking-tighter">{ing}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Step by Step Slider */}
            <div className="md:col-span-8 lg:col-span-9">
              <h3 className="text-[11px] uppercase tracking-widest font-bold text-gray-400 mb-6 px-1">Step-by-Step Pembuatan</h3>
              
              <Swiper
                modules={[Navigation, Pagination]}
                navigation
                pagination={{ clickable: true }}
                className="rounded-3xl bg-gray-50 border border-gray-100 overflow-hidden"
              >
                {recipe.instructions.map((step, idx) => (
                  <SwiperSlide key={idx} className="p-8 md:p-16 pb-24">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
                      <div className="order-2 lg:order-1">
                        <div className="flex items-center gap-4 mb-8">
                          <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center text-lg font-black shadow-lg">
                            {idx + 1}
                          </div>
                          <span className="text-[10px] font-bold text-orange-600 uppercase tracking-[0.3em]">Langkah Persiapan</span>
                        </div>
                        
                        <div className="prose prose-orange max-w-none">
                           <p className="text-gray-800 text-lg md:text-xl font-medium leading-relaxed">
                            {step.text}
                          </p>
                        </div>
                        
                        <div className="mt-10 flex items-center gap-3 text-gray-400">
                          <Info size={16} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Pastikan bahan sudah dicuci bersih</span>
                        </div>
                      </div>
                      
                      {step.image ? (
                        <div className="order-1 lg:order-2 w-full aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white">
                          <img 
                            src={step.image} 
                            alt={`Langkah ${step.step}`} 
                            className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" 
                          />
                        </div>
                      ) : (
                        <div className="order-1 lg:order-2 w-full aspect-[4/3] bg-gray-100 rounded-[2.5rem] flex flex-col items-center justify-center border-2 border-dashed border-gray-200">
                          <ChefHat size={48} className="text-gray-200 mb-4" />
                          <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">Visual tidak tersedia</p>
                        </div>
                      )}
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
              
              <div className="mt-8 flex items-center justify-center gap-4 py-4 border-t border-gray-100">
                <div className="w-12 h-1 bg-orange-600 rounded-full"></div>
                <div className="w-12 h-1 bg-gray-100 rounded-full"></div>
                <div className="w-12 h-1 bg-gray-100 rounded-full"></div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Comments Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-12 gap-12">
            <div className="md:col-span-4 lg:col-span-4">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 sticky top-24">
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
                                            <div className="flex items-center gap-1 text-orange-500 px-2 py-0.5 rounded-lg border border-orange-100 bg-orange-50">
                                                <Star size={10} fill="currentColor" />
                                                <span className="text-[10px] font-bold">{comment.rating}</span>
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
    </div>
  );
}

function NutritionRow({ label, value, unit, color }: { label: string, value: string, unit: string, color: string }) {
    return (
        <motion.div 
            whileHover={{ x: 5 }}
            className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 group hover:border-orange-200 transition-colors cursor-default shadow-sm hover:shadow-md"
        >
            <div className="flex items-center gap-3">
               <div className={`w-2 h-2 rounded-full ${color}`} />
               <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">{label}</span>
            </div>
            <div className="flex items-baseline gap-0.5">
                <span className="text-sm font-bold text-gray-900">{value}</span>
                <span className="text-[9px] font-bold text-gray-400 uppercase">{unit}</span>
            </div>
        </motion.div>
    );
}
