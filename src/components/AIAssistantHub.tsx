import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChefHat, Utensils, X, Sparkles } from 'lucide-react';

export default function AIAssistantHub({ 
    openAssistant, 
    setOpenAssistant 
}: { 
    openAssistant: 'chef' | 'sulap' | null, 
    setOpenAssistant: (a: 'chef' | 'sulap' | null) => void 
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleClickMain = () => {
    if (openAssistant) {
      setOpenAssistant(null);
      setIsMenuOpen(false);
    } else {
      setIsMenuOpen(!isMenuOpen);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[120]">
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleClickMain}
        className={`flex items-center justify-center gap-2 rounded-full text-sm font-bold transition-colors shadow-2xl w-14 h-14 md:w-auto md:h-auto md:px-5 md:py-3.5 ${
          openAssistant 
            ? 'bg-gray-900 text-white hover:bg-gray-800' 
            : 'bg-orange-600 text-white hover:bg-orange-700'
        }`}
      >
        {openAssistant ? <X size={24} /> : <Sparkles size={24} />}
        <span className="hidden md:block">{openAssistant ? 'Tutup' : 'AI Asisten'}</span>
      </motion.button>

      <AnimatePresence>
        {isMenuOpen && !openAssistant && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full right-0 mb-3 z-50 flex flex-col gap-2 w-56 bg-white border border-gray-100 rounded-3xl shadow-2xl p-2"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => { setOpenAssistant('chef'); setIsMenuOpen(false); }}
              className="px-4 py-3 rounded-2xl text-left text-sm font-bold text-gray-900 hover:bg-gray-50 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                <ChefHat size={16} className="text-orange-600" />
              </div>
              Tanya Chef AI
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => { setOpenAssistant('sulap'); setIsMenuOpen(false); }}
              className="px-4 py-3 rounded-2xl text-left text-sm font-bold text-gray-900 hover:bg-gray-50 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <Utensils size={16} className="text-emerald-600" />
              </div>
              Sulap Sisa Bahan Makanan
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
