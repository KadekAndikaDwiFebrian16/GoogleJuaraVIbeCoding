import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { askAssistant } from '../services/aiService';
import { useAuth } from '../context/AuthContext';

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([
    { role: 'ai', text: 'Halo! Saya Chef AI. Ada yang bisa saya bantu hari ini? Tanyakan apa saja seputar resep atau gizi!' }
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
      const response = await askAssistant(userMsg);
      setMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Maaf, saya sedang sibuk. Coba lagi nanti ya!' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all z-[60] group"
      >
        <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-[#FAFAF8]" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20, x: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20, x: 20 }}
            className="fixed bottom-6 right-6 w-full max-w-[380px] h-[580px] max-h-[85vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col z-[70] border border-gray-100"
          >
            {/* Header */}
            <div className="p-5 bg-gray-900 text-white flex items-center justify-between relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/5 rounded-full"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white shadow-lg">
                   <Bot size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">AI Nutritionist</h3>
                  <div className="flex items-center gap-1.5 opacity-80">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Powered by Gemini</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#FAFAF8]">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed ${
                    msg.role === 'user' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-white text-gray-800 border border-gray-100'
                  }`}>
                    {msg.role === 'ai' ? (
                      <div className="prose prose-sm max-w-none prose-orange prose-p:leading-relaxed prose-li:my-0">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.text
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl shadow-sm">
                    <Loader2 size={16} className="animate-spin text-orange-600" />
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
                      placeholder="Tanya Chef AI..."
                      className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                    />
                    <button 
                      type="submit"
                      disabled={!input.trim() || loading}
                      className="p-3 bg-gray-900 text-white rounded-xl hover:bg-orange-600 transition-all shadow-md disabled:opacity-50 active:scale-95 flex items-center justify-center"
                    >
                      <Send size={18} />
                    </button>
                </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
