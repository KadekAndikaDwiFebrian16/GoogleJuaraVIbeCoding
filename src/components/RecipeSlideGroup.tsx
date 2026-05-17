import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Recipe } from '../types';
import RecipeCard from './RecipeCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface RecipeSlideGroupProps {
  recipes: Recipe[];
  title?: string;
}

export default function RecipeSlideGroup({ recipes, title }: RecipeSlideGroupProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 6 recipes per slide/page
  const pageSize = 6;
  const totalPages = Math.ceil(recipes.length / pageSize);
  const currentRecipes = recipes.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const nextPage = () => setCurrentPage((prev) => (prev + 1) % totalPages);
  const prevPage = () => setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);

  // Handle scroll snap events for mobile paginating
  const handleScroll = () => {
    if (!containerRef.current || window.innerWidth >= 1024) return;
    const scrollLeft = containerRef.current.scrollLeft;
    const width = containerRef.current.offsetWidth;
    const newPage = Math.round(scrollLeft / width);
    if (newPage !== currentPage) setCurrentPage(newPage);
  };

  return (
    <div className="w-full py-12 md:py-20 group/slider">
      <div className="flex items-end justify-between mb-8 md:mb-12 px-2 md:px-0">
        <div>
          {title && (
            <h2 className="text-2xl md:text-5xl font-serif font-black text-gray-900 tracking-tight leading-tight">
              {title}
            </h2>
          )}
          <div className="flex items-center gap-3 mt-2 md:mt-4">
            <div className="h-[2px] w-12 bg-orange-600 rounded-full" />
            <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-gray-400">
              Menampilkan {currentRecipes.length} dari {recipes.length} Resep Terpilih
            </p>
          </div>
        </div>

        {/* Desktop Pagination Controls */}
        <div className="hidden lg:flex items-center gap-3">
          <div className="flex items-center gap-2 mr-4">
            {Array.from({ length: totalPages }).map((_, i) => (
              <motion.div
                key={i}
                animate={{ 
                  width: i === currentPage ? 24 : 6,
                  backgroundColor: i === currentPage ? "#ea580c" : "#e5e7eb"
                }}
                className="h-1.5 rounded-full"
              />
            ))}
          </div>
          <button 
            onClick={prevPage}
            className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-900 hover:bg-orange-600 hover:text-white hover:border-orange-600 transition-all shadow-sm hover:shadow-xl hover:shadow-orange-200/40"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={nextPage}
            className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-900 hover:bg-orange-600 hover:text-white hover:border-orange-600 transition-all shadow-sm hover:shadow-xl hover:shadow-orange-200/40"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Slide Container */}
      <div className="relative">
        {/* Desktop View (Animated Grid) */}
        <div className="hidden lg:block relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              className="grid grid-cols-3 gap-8"
            >
              {currentRecipes.map((recipe, idx) => (
                <div key={`${recipe.id}-${currentPage}`} className="h-full">
                  <RecipeCard recipe={recipe} index={idx} />
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile/Tablet View (High Performance Touch Scroll) */}
        <div 
          ref={containerRef}
          onScroll={handleScroll}
          className="lg:hidden flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-4 px-2 pb-8 overscroll-x-contain"
        >
          {recipes.map((recipe, idx) => (
            <div 
              key={recipe.id} 
              className="min-w-[280px] w-[85vw] sm:w-[50vw] snap-center shrink-0"
            >
              <RecipeCard recipe={recipe} index={idx} />
            </div>
          ))}
        </div>
        
        {/* Progress indicator for Mobile */}
        <div className="lg:hidden flex justify-center gap-1.5 mt-2">
            {Array.from({ length: recipes.length }).map((_, i) => {
              const isActive = Math.floor(i / pageSize) === currentPage;
              // On mobile we show a simpler progress because there are more cards horizontally
              return (
                <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === currentPage ? 'w-4 bg-orange-600' : 'w-1 bg-gray-200'}`} />
              );
            })}
        </div>
      </div>
    </div>
  );
}
