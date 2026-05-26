import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Utensils, Clipboard } from 'lucide-react';
import { motion } from 'motion/react';

export default function MobileBottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    {
      path: '/shopping-list',
      label: 'Belanja',
      icon: ShoppingCart,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 text-emerald-600',
      activeColor: 'text-emerald-600',
      dotColor: 'bg-emerald-600',
    },
    {
      path: '/',
      label: 'Resep',
      icon: Utensils,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 text-amber-600',
      activeColor: 'text-amber-600',
      dotColor: 'bg-amber-500',
    },
    {
      path: '/custom-recipes',
      label: 'Kustom',
      icon: Clipboard,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 text-indigo-600',
      activeColor: 'text-indigo-600',
      dotColor: 'bg-indigo-600',
    },
  ];

  return (
    <div id="mobile-bottom-nav" className="fixed bottom-4 left-4 right-4 h-16 bg-white/95 backdrop-blur-lg border border-gray-100 shadow-[0_10px_30px_rgba(245,158,11,0.12)] rounded-[2rem] flex justify-between items-center px-4 md:hidden z-[150] overflow-hidden">
      {navItems.map((item) => {
        // Match home strictly, other paths with startsWith
        const isActive = item.path === '/' 
          ? currentPath === '/' 
          : currentPath.startsWith(item.path);

        const Icon = item.icon;

        return (
          <Link
            id={`bottom-nav-${item.label.toLowerCase()}`}
            key={item.path}
            to={item.path}
            className="flex-1 flex flex-col items-center justify-center h-full relative"
          >
            <div className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-all duration-300 ${
              isActive ? 'scale-110' : 'scale-100 opacity-65 hover:opacity-100'
            }`}>
              <div className={`p-1.5 rounded-xl transition-all duration-300 ${
                isActive ? item.bgColor : 'bg-transparent text-gray-400'
              }`}>
                <Icon size={18} className="stroke-[2.5]" />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-wider leading-none select-none ${
                isActive ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {item.label}
              </span>
            </div>
            
            {isActive && (
              <motion.div
                layoutId="mobileActiveDot"
                className={`absolute bottom-1 w-1 h-1 rounded-full ${item.dotColor}`}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
