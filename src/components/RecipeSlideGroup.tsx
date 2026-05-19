import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Recipe } from '../types';
import RecipeCard from './RecipeCard';

interface RecipeSlideGroupProps {
  recipes: Recipe[];
  title?: string;
}

export default function RecipeSlideGroup({ recipes, title }: RecipeSlideGroupProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const recipesPerPage = 6;
  
  // Reset currentPage when recipes change (like changing categories)
  useEffect(() => {
    setCurrentPage(1);
  }, [recipes]);

  const totalPages = Math.ceil(recipes.length / recipesPerPage);
  const currentRecipes = recipes.slice((currentPage - 1) * recipesPerPage, currentPage * recipesPerPage);

  return (
    <div id="jelajahi-menu" className="w-full py-8 md:py-16 flex flex-col">
      <div className="flex flex-col mb-8 md:mb-12 px-2 md:px-0">
        {title && (
          <h2 className="text-2xl md:text-4xl font-serif font-black text-gray-900 tracking-tight leading-tight">
            {title}
          </h2>
        )}
        <div className="flex items-center gap-3 mt-2 md:mt-4">
          <div className="h-[2px] w-12 bg-orange-600 rounded-full" />
          <p className="text-xs md:text-sm font-bold uppercase tracking-[0.15em] text-gray-500">
            Menampilkan {recipes.length} Resep Terpilih
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8 px-2 md:px-0 mb-12">
        {currentRecipes.map((recipe, i) => (
          <motion.div
            key={`${recipe.id}-${currentPage}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
          >
            <RecipeCard recipe={recipe} />
          </motion.div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-auto">
          <button 
            onClick={() => {
              setCurrentPage(p => Math.max(1, p - 1));
              window.scrollTo({ top: document.getElementById('jelajahi-menu')?.offsetTop || 500, behavior: 'smooth' });
            }}
            disabled={currentPage === 1}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold disabled:opacity-30 border border-gray-200 hover:bg-gray-50 transition-colors text-gray-700"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setCurrentPage(i + 1);
                  window.scrollTo({ top: document.getElementById('jelajahi-menu')?.offsetTop || 500, behavior: 'smooth' });
                }}
                className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all duration-300 ${
                  currentPage === i + 1 
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-200/50 scale-110' 
                    : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button 
            onClick={() => {
              setCurrentPage(p => Math.min(totalPages, p + 1));
              window.scrollTo({ top: document.getElementById('jelajahi-menu')?.offsetTop || 500, behavior: 'smooth' });
            }}
            disabled={currentPage === totalPages}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold disabled:opacity-30 border border-gray-200 hover:bg-gray-50 transition-colors text-gray-700"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
