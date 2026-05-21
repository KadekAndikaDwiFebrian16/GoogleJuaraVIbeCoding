import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Calendar, Loader2, ShoppingBag, Save } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { askAssistant, extractRecipe } from '../services/aiService';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';

interface Message {
  role: 'ai' | 'user';
  text: string;
}

export default function MealPlannerChat({ isOpen, onToggle }: { isOpen: boolean, onToggle: () => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Halo! Saya AI Smart Meal Planner. Berikan saya target kalori Anda, kondisi kesehatan (misal: diabetes atau hipertensi), atau preferensi diet (misal: vegan, keto, rendah karbo), dan saya akan buatkan rencana makan 3 hari serta daftar belanjaannya untuk Anda!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
      const responseText = await askAssistant(userMsg, 'meal-planner');
      setMessages(prev => [...prev, { role: 'ai', text: responseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Maaf, saya sedang mengalami kendala teknis. Coba lagi nanti ya!' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShoppingList = async (items: string[]) => {
    if (!user || !items || items.length === 0) return;
    try {
      const newId = doc(collection(db, 'shoppingLists')).id;
      const now = new Date().toISOString();
      await setDoc(doc(db, 'shoppingLists', newId), {
        id: newId,
        userId: user.uid,
        title: 'Bahan Meal Planner',
        items: items.map(item => ({
          id: (Date.now() + Math.random()).toString(),
          name: item,
          checked: false
        })),
        createdAt: now,
        updatedAt: now
      });

      onToggle(); // Close chat
      navigate(`/shopping-list/${newId}`);
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan daftar belanja.");
    }
  };

  const handleSaveToCustomRecipe = async (text: string) => {
    if (!user || savingRecipe) return;
    setSavingRecipe(true);
    try {
      const extracted = await extractRecipe(text, 'meal_planner');
      if (extracted && extracted.title && extracted.instructions) {
        const newId = doc(collection(db, 'customRecipes')).id;
        await setDoc(doc(db, 'customRecipes', newId), {
          id: newId,
          userId: user.uid,
          title: extracted.title,
          source: 'meal_planner',
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

  const renderMessageContent = (msg: Message) => {
    const isAI = msg.role === 'ai';
    let shoppingItems: string[] = [];

    if (isAI) {
      // Find the shopping list section, looking for Daftar Belanjaan loosely
      const listIndex = msg.text.toLowerCase().indexOf('daftar belanjaan');
      if (listIndex !== -1) {
        const afterHeader = msg.text.slice(listIndex);
        const nextHeaderMatch = afterHeader.match(/\n## /);
        const listText = nextHeaderMatch ? afterHeader.slice(0, nextHeaderMatch.index) : afterHeader;

        const lines = listText.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          let itemText = '';
          
          if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            itemText = trimmed.substring(2).trim();
          } else if (/^\d+\.\s/.test(trimmed)) {
            itemText = trimmed.replace(/^\d+\.\s/, '').trim();
          }

          if (itemText) {
            // Check if it's likely a category header (e.g. **Sumber Protein:**)
            if (!itemText.startsWith('**') && !itemText.endsWith('**') && !itemText.includes('**:') && itemText.length > 0) {
              // Strip out any trailing/leading asterisks 
              let cleanItem = itemText.replace(/^\*+|\*+$/g, '').trim();
              if (cleanItem && !cleanItem.includes('Kumpulkan bahan-bahan')) {
                shoppingItems.push(cleanItem);
              }
            }
          }
        }
      }
    }

    return (
      <div className={`max-w-[90%] px-4 py-3 rounded-2xl shadow-sm text-[15px] leading-relaxed ${
        msg.role === 'user' 
        ? 'bg-emerald-600 text-white' 
        : 'bg-white text-gray-900 border border-emerald-100'
      }`}>
        <div className={`prose max-w-none prose-p:leading-relaxed prose-li:my-1 ${
          msg.role === 'user' 
          ? 'prose-invert text-white prose-p:text-white prose-strong:text-white' 
          : 'prose-emerald text-gray-900 prose-p:text-gray-900 prose-headings:text-gray-900 prose-headings:font-bold prose-strong:text-emerald-900 prose-li:text-gray-900 prose-ul:text-gray-900 prose-ol:text-gray-900'
        }`}>
          <ReactMarkdown>{msg.text}</ReactMarkdown>
        </div>
        
        {shoppingItems.length > 0 && (
          <div className="mt-4 pt-3 border-t border-emerald-100 flex flex-col gap-2 justify-end">
            <button
              onClick={() => handleSaveShoppingList(shoppingItems)}
              className="flex items-center justify-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm w-full"
            >
              <ShoppingBag size={16} />
              Simpan Bahan Makanan Untuk Dibeli
            </button>
            <button
              onClick={() => handleSaveToCustomRecipe(msg.text)}
              disabled={savingRecipe}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm w-full disabled:opacity-50"
            >
              {savingRecipe ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Simpan Sebagai Resep Custom
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } }}
          exit={{ opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } }}
          className="fixed bottom-24 right-4 sm:right-8 sm:w-[420px] w-[calc(100vw-32px)] max-h-[calc(100vh-120px)] h-[650px] bg-white rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden flex flex-col z-[100] border border-emerald-100 will-change-transform"
        >
          <div className="p-5 bg-emerald-900 text-white flex items-center justify-between relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg">
                <Calendar size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">AI Smart Meal Planner</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 opacity-80">Nutrisi Kustom 3 Hari</span>
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

          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#F8FAFA]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {renderMessageContent(msg)}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-emerald-50 px-4 py-3 rounded-2xl shadow-sm flex items-center gap-3">
                  <Loader2 size={16} className="animate-spin text-emerald-600" />
                  <span className="text-xs text-gray-500 font-medium italic">Sedang menyusun rencana makan terbaik...</span>
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
                    placeholder="Contoh: 1800 kkal, rendah karbo, untuk diet hipertensi"
                    className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-100 outline-none transition-all placeholder:text-gray-400"
                  />
                  <button 
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="p-3 bg-emerald-900 text-white rounded-xl hover:bg-emerald-800 transition-all shadow-md disabled:opacity-50 active:scale-95 flex items-center justify-center min-w-[44px]"
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
