import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Recipe } from '../types';
import { Link } from 'react-router-dom';
import { ChefHat } from 'lucide-react';

interface RecipeCarouselProps {
  recipes: Recipe[];
  timeLabel?: string;
}

export default function RecipeCarousel({ recipes, timeLabel = "Hari" }: RecipeCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const displayRecipes = recipes.slice(0, 5);

  useEffect(() => {
    if (displayRecipes.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayRecipes.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [displayRecipes.length]);

  if (displayRecipes.length === 0) return null;

  return (
    <div className="relative w-full h-[320px] md:h-[450px] rounded-3xl md:rounded-[2.5rem] overflow-hidden shadow-xl mb-12 group">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          {(() => {
            const currentRecipe = displayRecipes[currentIndex];
            const isNoImage = !currentRecipe.coverImage || currentRecipe.coverImage === '' || currentRecipe.coverImage.includes('unsplash.com/photo-1546069901-ba9599a7e63c');
            
            if (isNoImage) {
              return (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-slate-800 to-[#4E4E3A] flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none opacity-40 animate-pulse" />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center gap-2 max-w-md z-1"
                  >
                    <div className="w-14 h-14 rounded-full bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-2 shadow-inner">
                      <ChefHat size={28} className="stroke-[1.8]" />
                    </div>
                    <span className="text-[10px] md:text-xs text-amber-400 font-bold uppercase tracking-[0.25em]">No Cover Image</span>
                    <p className="text-gray-400 text-xs tracking-wide">Tetap penuh esensi rasa & kreasi yang menggugah selera!</p>
                  </motion.div>
                </div>
              );
            }
            
            return (
              <img 
                src={currentRecipe.coverImage}
                alt={currentRecipe.title}
                className="absolute inset-0 w-full h-full object-cover transform transition-transform duration-[10s] md:group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
            );
          })()}
          {/* Enhanced gradient for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent md:to-black/10" />
          
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 flex flex-col items-start z-10">
            <span className="bg-amber-500 text-white px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-black tracking-[0.15em] uppercase rounded-full mb-4 shadow-lg capitalize border border-amber-400/50">
              Rekomendasi {timeLabel} Ini
            </span>
            <h2 className="text-2xl md:text-5xl font-serif font-black text-white mb-3 max-w-3xl leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {displayRecipes[currentIndex].title}
            </h2>
            <p className="text-gray-200 text-sm md:text-lg max-w-2xl mb-8 line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] md:font-medium">
              {displayRecipes[currentIndex].description}
            </p>
            <Link 
              to={`/recipe/${displayRecipes[currentIndex].id}`}
              className="bg-white text-gray-900 md:bg-white/95 md:backdrop-blur-sm px-6 md:px-8 py-3 md:py-3.5 rounded-full text-sm md:text-base font-bold hover:bg-gray-50 md:hover:bg-white transition-all shadow-xl shadow-black/20 md:shadow-[0_0_20px_rgba(255,255,255,0.2)] md:hover:scale-105 active:scale-95"
            >
              Coba Resep Ini
            </Link>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-6 right-6 md:bottom-10 md:right-10 flex gap-2 z-20">
        {displayRecipes.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              idx === currentIndex ? 'bg-amber-500 w-8 shadow-[0_0_10px_rgba(245,158,11,0.8)]' : 'bg-white/60 w-2.5 hover:bg-white'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
