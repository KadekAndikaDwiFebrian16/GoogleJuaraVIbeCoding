import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Utensils, Loader2, Save, ShoppingCart } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { askAssistant, extractRecipe, extractIngredients } from '../services/aiService';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

interface Message {
  role: 'ai' | 'user';
  text: string;
}

export default function SulapSisaChat({ isOpen, onToggle }: { isOpen: boolean, onToggle: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Halo! Saya Chef Zero-Waste. Sebutkan bahan-bahan sisa di kulkas Anda, dan saya akan meracik ide masakan kreatif agar tidak mubazir!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [savingIngredients, setSavingIngredients] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const responseText = await askAssistant(userMsg, 'sulap');
      setMessages(prev => [...prev, { role: 'ai', text: responseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Maaf, saya sedang mengalami kendala teknis. Coba lagi nanti ya!' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToShoppingList = async (text: string) => {
    if (!user || savingIngredients) return;
    setSavingIngredients(true);
    try {
      const extracted = await extractIngredients(text);
      if (extracted && extracted.ingredients && extracted.ingredients.length > 0) {
        const newId = doc(collection(db, 'shoppingLists')).id;
        const now = new Date().toISOString();
        await setDoc(doc(db, 'shoppingLists', newId), {
          id: newId,
          userId: user.uid,
          title: extracted.title || 'Daftar Belanja Zero-Waste',
          items: extracted.ingredients.map(ing => ({
            id: (Date.now() + Math.random()).toString(),
            name: ing,
            checked: false
          })),
          createdAt: now,
          updatedAt: now
        });
        navigate(`/shopping-list/${newId}`);
        onToggle(); // Close chat
      } else {
        alert("Bahan makanan sehat tidak terdeteksi di pesan ini.");
      }
    } catch (error) {
      console.error(error);
      alert("Gagal menyarikan bahan makanan. Pastikan teks berisi bahan makanan.");
    } finally {
      setSavingIngredients(false);
    }
  };

  const handleSaveToCustomRecipe = async (text: string) => {
    if (!user || savingRecipe) return;
    setSavingRecipe(true);
    try {
      const extracted = await extractRecipe(text, 'magic_ingredients');
      if (extracted && extracted.title && extracted.instructions) {
        const newId = doc(collection(db, 'customRecipes')).id;
        await setDoc(doc(db, 'customRecipes', newId), {
          id: newId,
          userId: user.uid,
          title: extracted.title,
          source: 'magic_ingredients',
          instructions: extracted.instructions,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        navigate(`/custom-recipe/${newId}`);
        onToggle(); // Close chat
      } else {
        alert("Gagal mengekstrak resep dari teks ini.");
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat menyimpan resep.");
    } finally {
      setSavingRecipe(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } }}
            exit={{ opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } }}
            className="fixed bottom-24 right-4 sm:right-8 sm:w-[380px] w-[calc(100vw-32px)] max-h-[calc(100vh-120px)] h-[600px] bg-white rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden flex flex-col z-[100] border border-emerald-100 will-change-transform"
          >
            <div className="p-5 bg-emerald-600 text-white flex items-center justify-between relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white shadow-lg">
                  <Utensils size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Zero-Waste Chef</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100 opacity-80">Sulap Sisa Makanan</span>
                </div>
              </div>
              <button 
                onClick={onToggle}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F0FDF4]">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] px-4 py-3 rounded-2xl shadow-sm text-[15px] ${
                    msg.role === 'user' 
                    ? 'bg-emerald-600 text-white rounded-tr-none' 
                    : 'bg-white text-gray-900 border border-emerald-100 rounded-tl-none'
                  }`}>
                    <div className={`prose max-w-none prose-p:leading-relaxed break-words ${
                      msg.role === 'user'
                      ? 'prose-invert text-white prose-p:text-white prose-strong:text-white'
                      : 'prose-emerald text-gray-900 prose-headings:font-bold prose-headings:text-emerald-900 prose-p:text-gray-900 prose-strong:text-emerald-900 prose-li:text-gray-900 prose-ul:text-gray-900 prose-ol:text-gray-900'
                    }`}>
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                    {msg.role === 'ai' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => handleSaveToCustomRecipe(msg.text)}
                          disabled={savingRecipe || savingIngredients}
                          className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-650 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200/50"
                        >
                          {savingRecipe ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                          Simpan Resep
                        </button>
                        <button
                          onClick={() => handleSaveToShoppingList(msg.text)}
                          disabled={savingRecipe || savingIngredients}
                          className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 hover:bg-emerald-250 px-3 py-1.5 rounded-lg transition-colors border border-emerald-300/30"
                        >
                          {savingIngredients ? <Loader2 size={12} className="animate-spin" /> : <ShoppingCart size={12} />}
                          Simpan Belanja
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-emerald-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm">
                    <Loader2 size={16} className="animate-spin text-emerald-600" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-emerald-100 shrink-0">
                <form onSubmit={handleSend} className="flex gap-2">
                    <input 
                      type="text" 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Bahan sisa di kulkas..."
                      className="flex-1 bg-gray-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-200 outline-none transition-all w-0"
                    />
                    <button 
                      type="submit"
                      disabled={!input.trim() || loading}
                      className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50 active:scale-95 flex items-center justify-center shrink-0"
                    >
                      <Send size={18} />
                    </button>
                </form>
            </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
