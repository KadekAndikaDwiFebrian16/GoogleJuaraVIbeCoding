import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Recipe } from '../types';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

interface RecipeCardProps {
  recipe: Recipe;
  index: number;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, index }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Motion values for the "moving if mouse near" effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseSpringX = useSpring(x, { stiffness: 100, damping: 20 });
  const mouseSpringY = useSpring(y, { stiffness: 100, damping: 20 });

  const rotateX = useTransform(mouseSpringY, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(mouseSpringX, [-0.5, 0.5], [-10, 10]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current || window.innerWidth < 768) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Normalize position from -0.5 to 0.5
    x.set((e.clientX - centerX) / rect.width);
    y.set((e.clientY - centerY) / rect.height);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      whileHover={window.innerWidth >= 768 ? { y: -12 } : {}}
      whileTap={window.innerWidth >= 768 ? { scale: 0.97 } : { scale: 1 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: 1500 }}
      className="group relative h-full rounded-[2.5rem]"
    >
      <Link to={`/recipe/${recipe.id}`} className="block h-full rounded-[2.5rem] isolate">
        <motion.div 
          style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
          className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 transition-all duration-500 hover:shadow-xl hover:shadow-gray-200/20 h-full flex flex-col will-change-transform isolate"
        >
          {/* Image Container */}
          <div className="h-52 w-full bg-gray-100 relative overflow-hidden shrink-0 rounded-t-[2.3rem]">
            <motion.img 
              src={recipe.coverImage} 
              alt={recipe.title}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            
            {/* Shine effect on hover - Disabled on mobile */}
            <div className="absolute inset-0 opacity-0 md:group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
              <motion.div 
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-25deg]"
              />
            </div>
            
            {/* Badges */}
            <div className="absolute top-4 left-4 flex gap-2">
                <span className="px-2 py-1 bg-white/95 md:backdrop-blur text-[9px] font-bold rounded text-gray-900 uppercase tracking-wider shadow-sm">
                    {recipe.mealTime}
                </span>
                {recipe.condition && (
                    <span className="px-2 py-1 bg-orange-600 text-white text-[9px] font-bold rounded uppercase tracking-wider shadow-sm">
                        {recipe.condition}
                    </span>
                )}
            </div>
          </div>

          {/* Content */}
          <div className="p-5 flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-2 gap-4">
              <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-orange-600 transition-colors line-clamp-2">
                {recipe.title}
              </h3>
              <div className="flex items-center gap-1 text-orange-400 text-xs font-bold italic shrink-0">
                ★ {recipe.rating.toFixed(1)} <span className="text-[10px] text-gray-400 font-normal">({recipe.reviewCount || 0})</span>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed flex-1">
              {recipe.description}
            </p>

            <div className="grid grid-cols-3 gap-2 border-t border-gray-50 pt-4 text-center">
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-[9px] text-gray-400 uppercase font-bold tracking-tighter">Kalori</p>
                <p className="text-xs font-bold text-gray-700">{recipe.nutrition.calories} kkal</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-[9px] text-gray-400 uppercase font-bold tracking-tighter">Protein</p>
                <p className="text-xs font-bold text-gray-700">{recipe.nutrition.protein}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-[9px] text-gray-400 uppercase font-bold tracking-tighter">Lemak</p>
                <p className="text-xs font-bold text-gray-700">{recipe.nutrition.fat}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
};

export default RecipeCard;
