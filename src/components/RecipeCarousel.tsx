import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Recipe } from '../types';
import { Link } from 'react-router-dom';

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
    <div className="relative w-full h-[300px] md:h-[400px] rounded-3xl overflow-hidden shadow-sm mb-12">
      <AnimatePresence initial={false}>
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${displayRecipes[currentIndex].coverImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 flex flex-col items-start">
            <span className="bg-orange-600 text-white px-3 py-1 text-xs font-bold rounded-full mb-3 shadow-md capitalize">
              Rekomendasi {timeLabel} Ini
            </span>
            <h2 className="text-2xl md:text-4xl font-serif font-bold text-white mb-2 max-w-2xl leading-tight">
              {displayRecipes[currentIndex].title}
            </h2>
            <p className="text-gray-200 text-sm md:text-base max-w-xl mb-6 line-clamp-2">
              {displayRecipes[currentIndex].description}
            </p>
            <Link 
              to={`/recipe/${displayRecipes[currentIndex].id}`}
              className="bg-white text-gray-900 px-6 py-2.5 rounded-full text-sm font-bold hover:bg-gray-100 transition-colors shadow-lg"
            >
              Lihat Resep
            </Link>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-6 right-6 md:bottom-10 md:right-10 flex gap-2 z-10">
        {displayRecipes.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              idx === currentIndex ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/80'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
