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

  const mouseSpringX = useSpring(x, { stiffness: 150, damping: 25 });
  const mouseSpringY = useSpring(y, { stiffness: 150, damping: 25 });

  const rotateX = useTransform(mouseSpringY, [-0.5, 0.5], [7, -7]);
  const rotateY = useTransform(mouseSpringX, [-0.5, 0.5], [-7, 7]);
  
  // Parallax for image inside card
  const imgX = useTransform(mouseSpringX, [-0.5, 0.5], [5, -5]);
  const imgY = useTransform(mouseSpringY, [-0.5, 0.5], [5, -5]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current || window.innerWidth < 1024) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
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
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      whileHover={window.innerWidth >= 1024 ? { y: -8, transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] } } : {}}
      whileTap={{ scale: 0.98 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ 
        perspective: 2000,
        // @ts-ignore
        "--mouse-x": useTransform(x, (val) => `${(val + 0.5) * 100}%`),
        // @ts-ignore
        "--mouse-y": useTransform(y, (val) => `${(val + 0.5) * 100}%`),
      }}
      className="group relative h-full rounded-[2.5rem] will-change-transform"
    >
      <Link to={`/recipe/${recipe.id}`} className="block h-full rounded-[2.5rem] isolate">
        <motion.div 
          style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
          className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100/80 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] hover:border-orange-200/50 h-full flex flex-col will-change-transform isolate relative"
        >
          {/* Dynamic Glow Effect - Desktop Only */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 bg-[radial-gradient(circle_at_var(--mouse-x)_var(--mouse-y),rgba(251,146,60,0.08)_0%,transparent_70%)] pointer-events-none hidden lg:block" />

          {/* Image Container */}
          <div className="h-48 md:h-52 w-full bg-gray-50 relative overflow-hidden shrink-0 rounded-t-[2.3rem]">
            <motion.img 
              src={recipe.coverImage} 
              alt={recipe.title}
              loading="lazy"
              style={{ x: imgX, y: imgY, scale: 1.15 }}
              className="w-full h-full object-cover transition-transform duration-700 ease-out will-change-transform"
              referrerPolicy="no-referrer"
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            
            {/* Shine Overlay */}
            <div className="absolute inset-0 opacity-0 md:group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none">
              <motion.div 
                animate={{ x: ['-200%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "linear" }}
                className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
              />
            </div>
            
            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                <span className="self-start px-2.5 py-1 bg-white/95 backdrop-blur-md text-[8px] md:text-[9px] font-black rounded-lg text-gray-900 uppercase tracking-[0.15em] shadow-sm border border-white/20">
                    {recipe.mealTime}
                </span>
                {recipe.condition && (
                    <span className="self-start px-2.5 py-1 bg-orange-600 text-white text-[8px] md:text-[9px] font-black rounded-lg uppercase tracking-[0.15em] shadow-sm border border-orange-400/30">
                        {recipe.condition}
                    </span>
                )}
            </div>

            <div className="absolute bottom-3 left-4 right-4 flex justify-between items-center">
              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
                <span className="text-orange-400 text-[10px]">★</span>
                <span className="text-white text-[10px] font-black tracking-tight">{recipe.rating.toFixed(1)}</span>
              </div>
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
