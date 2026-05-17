import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Calendar, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { askAssistant } from '../services/aiService';

interface Message {
  role: 'ai' | 'user';
  text: string;
}

export default function MealPlannerChat({ isOpen, onToggle }: { isOpen: boolean, onToggle: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Halo! Saya AI Smart Meal Planner. Berikan saya target kalori Anda, kondisi kesehatan (misal: diabetes atau hipertensi), atau preferensi diet (misal: vegan, keto, rendah karbo), dan saya akan buatkan rencana makan 3 hari serta daftar belanjaannya untuk Anda!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
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
      const responseText = await askAssistant(userMsg, 'meal-planner');
      setMessages(prev => [...prev, { role: 'ai', text: responseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Maaf, saya sedang mengalami kendala teknis. Coba lagi nanti ya!' }]);
    } finally {
      setLoading(false);
    }
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
                <div className={`max-w-[90%] px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed ${
                  msg.role === 'user' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-white text-gray-800 border border-emerald-50'
                }`}>
                  <div className="prose prose-sm max-w-none prose-emerald prose-p:leading-relaxed prose-li:my-1">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
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
