import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Send, UtensilsCrossed, CheckCircle2, Loader2 } from 'lucide-react';

export default function SuggestionForm() {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'suggestions'), {
        userId: profile.uid,
        userName: profile.displayName,
        title,
        description,
        ingredients,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setSubmitted(true);
      setTitle('');
      setDescription('');
      setIngredients('');
      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'suggestions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100 relative overflow-hidden group">
      <div className="flex flex-col md:flex-row gap-12 items-center relative z-10">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">
             <UtensilsCrossed size={12} />
             <span>Ide Baru?</span>
          </div>
          <h2 className="text-3xl font-serif font-bold text-gray-900 mb-6 leading-tight">
            Punya Resep <br/> yang Ingin Dicoba?
          </h2>
          <p className="text-gray-500 mb-8 leading-relaxed text-sm">
             Berikan saran resep favorit Anda. Admin akan meramu bumbu informasinya untuk komunitas.
          </p>
        </div>

        <div className="w-full max-w-lg">
          {submitted ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-green-50 border border-green-100 p-8 rounded-2xl text-center"
            >
              <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                 <CheckCircle2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-green-900 mb-1">Terima Kasih!</h3>
              <p className="text-green-700/70 text-sm">Saran Anda telah diterima oleh Admin.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input 
                type="text" 
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Judul Resep..."
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-100 transition-all text-sm text-gray-700"
              />
              <textarea 
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Kenapa resep ini unik?"
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-100 transition-all text-sm text-gray-700 min-h-[80px]"
              />
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-500 transition-all disabled:opacity-50 active:scale-95 text-xs uppercase tracking-widest"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16}/>}
                Kirim Saran Resep
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
