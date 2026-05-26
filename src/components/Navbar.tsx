import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logout } from '../lib/firebase';
import { LogOut, Salad, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Navbar() {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Resep' },
    { path: '/shopping-list', label: 'List Belanja' },
    { path: '/custom-recipes', label: 'Resep Custom' },
    ...(isAdmin ? [{ path: '/admin', label: 'Admin' }] : [])
  ];

  return (
    <nav className="bg-white/90 backdrop-blur-md sticky top-0 z-[110] border-b border-gray-100 px-4 sm:px-6 md:px-8 h-20 flex items-center shadow-sm shadow-gray-100/10 transition-all duration-300">
      <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
        {/* Brand/Logo Layout */}
        <div className="flex items-center flex-shrink-0">
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: -2 }}
              whileTap={{ scale: 0.95 }}
              className="w-11 h-11 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 animate-gradient-smooth rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20 transition-all duration-300"
            >
              <Salad size={24} />
            </motion.div>
            <span className="text-2xl font-serif font-black text-gray-900 tracking-tight leading-none select-none">
              Dapur<span className="bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 bg-clip-text text-transparent animate-gradient-smooth">Sehat</span>
            </span>
          </Link>
        </div>

        {/* Center: Premium Nav Items for Desktop */}
        <div className="hidden md:flex items-center gap-1.5 bg-gray-50 border border-gray-100/80 p-1.5 rounded-[2rem]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative px-5 py-2 text-xs lg:text-sm font-bold rounded-full transition-all duration-300 ${
                  isActive 
                    ? 'text-amber-600' 
                    : 'text-gray-500 hover:text-amber-600'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="active-nav-bg"
                    className="absolute inset-0 bg-white shadow-sm rounded-full border border-amber-100/40"
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  />
                )}
                <span className="relative z-10 transition-transform duration-200">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right: User Profile & Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4 pl-4 border-l border-gray-100">
            <div className="flex items-center gap-3 bg-gray-50/60 hover:bg-gray-50 border border-gray-100 py-1.5 pl-3 pr-2.5 rounded-full transition-all duration-200 shadow-sm">
              <div className="flex flex-col items-end leading-none">
                <span className="text-xs font-bold text-gray-800 tracking-tight">{profile?.displayName || 'User'}</span>
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{profile?.role || 'Member'}</span>
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-yellow-500 text-white font-bold rounded-full flex items-center justify-center text-xs shadow-md shadow-amber-500/10 uppercase">
                {profile?.displayName?.charAt(0) || 'U'}
              </div>
            </div>
            <button 
              onClick={handleLogout} 
              className="flex items-center gap-2 text-xs font-bold text-gray-500 px-4 py-2.5 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-full border border-gray-200 transition-all duration-200 shadow-sm"
            >
              Keluar
              <LogOut size={13} />
            </button>
          </div>

          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-3 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute top-20 left-0 right-0 bg-white border-b border-gray-100 shadow-lg shadow-gray-100/50 md:hidden overflow-hidden z-50"
          >
            <div className="flex flex-col p-6 gap-6">
              <div className="flex flex-col gap-2">
                {navItems.filter(item => item.path === '/' || item.path === '/admin').map((item) => (
                  <Link 
                    key={item.path}
                    to={item.path} 
                    onClick={() => setIsMenuOpen(false)}
                    className="text-sm font-bold text-gray-900 flex items-center gap-2 py-3 px-4 hover:bg-amber-50 hover:text-amber-600 rounded-xl transition-all"
                  >
                    <Salad size={18} className="text-amber-600" />
                    {item.label}
                  </Link>
                ))}
              </div>
              
              <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-900">{profile?.displayName || 'User'}</span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest leading-none">{profile?.role || 'Member'}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-xs font-bold text-amber-600 px-4 py-2 bg-amber-50 rounded-full"
                >
                  Keluar
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
