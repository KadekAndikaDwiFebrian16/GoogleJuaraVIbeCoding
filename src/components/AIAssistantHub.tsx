import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Salad, Utensils, X, Sparkles, Calendar } from 'lucide-react';
import { useUI } from '../context/UIContext';

export default function AIAssistantHub({ 
    openAssistant, 
    setOpenAssistant 
}: { 
    openAssistant: 'chef' | 'sulap' | 'meal-planner' | null, 
    setOpenAssistant: (a: 'chef' | 'sulap' | 'meal-planner' | null) => void 
}) {
  const { activeComponent, setActiveComponent } = useUI();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Sync menu state with global UI state
  useEffect(() => {
    if (activeComponent !== 'assistant') {
      setIsMenuOpen(false);
    }
  }, [activeComponent]);

  const handleClickMain = () => {
    if (openAssistant) {
      setOpenAssistant(null);
      setIsMenuOpen(false);
      setActiveComponent(null);
    } else {
      const nextState = !isMenuOpen;
      setIsMenuOpen(nextState);
      setActiveComponent(nextState ? 'assistant' : null);
    }
  };

  return (
    <div className={`fixed bottom-24 md:bottom-6 right-4 md:right-6 z-[120] flex flex-col items-end transition-all duration-300 ${
      openAssistant ? 'opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto' : ''
    }`}>
      <AnimatePresence>
        {isMenuOpen && !openAssistant && (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 20, stiffness: 300 } }}
            exit={{ opacity: 0, y: 20, scale: 0.8, transition: { duration: 0.2 } }}
            className="mb-4 z-50 flex flex-col gap-2 w-[280px] bg-white border border-emerald-100 rounded-[2.5rem] shadow-xl md:shadow-[0_15px_40px_rgba(0,0,0,0.08)] p-2 md:backdrop-blur-xl bg-white/95"
          >
            <motion.button
              whileHover={{ x: 6, backgroundColor: "rgba(249, 115, 22, 0.05)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setOpenAssistant('chef'); setIsMenuOpen(false); }}
              className="px-4 py-4 rounded-3xl text-left text-sm font-bold text-gray-900 transition-all flex items-center gap-4 group"
            >
              <div className="w-11 h-11 rounded-2xl bg-orange-100 flex items-center justify-center shadow-inner md:group-hover:rotate-6 transition-transform">
                <Salad size={22} className="text-orange-600" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-gray-900">Tanya Chef AI</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Resep & Tips Masak</span>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ x: 6, backgroundColor: "rgba(16, 185, 129, 0.05)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setOpenAssistant('meal-planner'); setIsMenuOpen(false); }}
              className="px-4 py-4 rounded-3xl text-left text-sm font-bold text-gray-900 transition-all flex items-center gap-4 group"
            >
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center shadow-inner group-hover:rotate-6 transition-transform">
                <Calendar size={22} className="text-emerald-600" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-gray-900">Meal Planner 3 Hari</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Nutrisi Kustom AI</span>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ x: 6, backgroundColor: "rgba(16, 185, 129, 0.05)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setOpenAssistant('sulap'); setIsMenuOpen(false); }}
              className="px-4 py-4 rounded-3xl text-left text-sm font-bold text-gray-900 transition-all flex items-center gap-4 group"
            >
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center shadow-inner group-hover:rotate-6 transition-transform">
                <Utensils size={22} className="text-emerald-600" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-gray-900">Sulap Sisa Bahan</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Manfaatkan Sisa Kuliner</span>
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button 
        whileHover={{ scale: 1.1, rotate: openAssistant ? -5 : 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleClickMain}
        className={`relative flex items-center justify-center gap-3 rounded-full text-sm font-bold transition-all shadow-[0_10px_25px_rgba(0,0,0,0.1)] h-16 w-16 md:w-auto md:px-7 ${
          openAssistant 
            ? 'bg-gray-900 text-white' 
            : 'bg-emerald-900 text-white'
        }`}
      >
        {!openAssistant && !isMenuOpen && (
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0, 0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-emerald-400 rounded-full hidden md:block"
          />
        )}
        {openAssistant ? <X size={26} /> : <Sparkles size={26} className={isMenuOpen ? "rotate-45 transition-transform" : ""} />}
        <span className="hidden md:block text-base tracking-tight font-black">{openAssistant ? 'Tutup' : 'Tanya AI'}</span>
      </motion.button>
    </div>
  );
}
