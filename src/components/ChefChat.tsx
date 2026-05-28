import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Salad, Loader2, Save, ShoppingCart } from 'lucide-react';
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

export default function ChefChat({ isOpen, onToggle }: { isOpen: boolean, onToggle: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Halo! Saya Chef AI. Ada yang bisa saya bantu hari ini? Tanyakan apa saja seputar resep, tips dapur, atau informasi gizi makanan sehat!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [savingIngredients, setSavingIngredients] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

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
      const responseText = await askAssistant(userMsg, 'chat');
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
          title: extracted.title || 'Daftar Belanja Chef AI',
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
      const extracted = await extractRecipe(text, 'chef_ai');
      if (extracted && extracted.title && extracted.instructions) {
        const newId = doc(collection(db, 'customRecipes')).id;
        await setDoc(doc(db, 'customRecipes', newId), {
          id: newId,
          userId: user.uid,
          title: extracted.title,
          source: 'chef_ai',
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
          className="fixed bottom-24 right-4 sm:right-8 sm:w-[380px] w-[calc(100vw-32px)] max-h-[calc(100vh-120px)] h-[600px] bg-white rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden flex flex-col z-[100] border border-gray-100 will-change-transform"
        >
          <div className="p-5 bg-gray-900 text-white flex items-center justify-between relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-lg">
                <Salad size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">Chef AI</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 opacity-80">Chef Digital Dapursehat</span>
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

          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#FAFAF8]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm text-[15px] leading-relaxed ${
                  msg.role === 'user' 
                  ? 'bg-amber-500 text-white' 
                  : 'bg-white text-gray-900 border border-gray-200'
                }`}>
                  <div className={`prose max-w-none prose-p:leading-relaxed prose-li:my-1 ${
                    msg.role === 'user' 
                    ? 'prose-invert text-white prose-p:text-white prose-strong:text-white' 
                    : 'prose-amber text-gray-900 prose-p:text-gray-900 prose-headings:text-gray-900 prose-headings:font-bold prose-strong:text-amber-900 prose-li:text-gray-900 prose-ul:text-gray-900 prose-ol:text-gray-900'
                  }`}>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                  {msg.role === 'ai' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                       <button
                        onClick={() => handleSaveToCustomRecipe(msg.text)}
                        disabled={savingRecipe || savingIngredients}
                        className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors border border-amber-200/50"
                      >
                        {savingRecipe ? <Loader2 size = {12} className="animate-spin" /> : <Save size={12} />}
                        Simpan Resep
                      </button>
                      <button
                        onClick={() => handleSaveToShoppingList(msg.text)}
                        disabled={savingRecipe || savingIngredients}
                        className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200/50"
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
                <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl shadow-sm">
                  <Loader2 size={16} className="animate-spin text-amber-500" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-gray-100">
              <form onSubmit={handleSend} className="flex gap-2">
                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Apa yang ingin Anda masak?"
                    className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="p-3 bg-gray-900 text-white rounded-xl hover:bg-amber-500 transition-all shadow-md disabled:opacity-50 active:scale-95 flex items-center justify-center"
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
