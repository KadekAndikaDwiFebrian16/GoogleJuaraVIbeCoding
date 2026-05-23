import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logout } from '../lib/firebase';
import { LogOut, PlusCircle, Salad, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Navbar() {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white sticky top-0 z-50 border-b border-gray-100 px-6 md:px-8 h-16 flex justify-between items-center transition-all">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 group">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2"
          >
            <div className="w-10 h-10 bg-orange-600 rounded-2xl flex items-center justify-center text-white rotate-3 group-hover:rotate-0 transition-transform duration-300">
               <Salad size={22} />
            </div>
            <span className="text-2xl font-serif font-black text-gray-900 tracking-tight">
              Dapur<span className="text-orange-600">Sehat</span>
            </span>
          </motion.div>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-6 text-sm font-bold text-gray-400 mr-4">
          <Link to="/" className="hover:text-orange-600 transition-colors relative group">
            Resep
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-600 transition-all group-hover:w-full"></span>
          </Link>

          <Link to="/shopping-list" className="hover:text-orange-600 transition-colors relative group">
            List Belanja
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-600 transition-all group-hover:w-full"></span>
          </Link>

          <Link to="/custom-recipes" className="hover:text-orange-600 transition-colors relative group">
            Resep Custom
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-600 transition-all group-hover:w-full"></span>
          </Link>
          
          {isAdmin && (
            <Link to="/admin" className="hover:text-orange-600 transition-colors relative group">
              Admin
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-600 transition-all group-hover:w-full"></span>
            </Link>
          )}
        </div>
        
        <div className="flex items-center gap-3 pl-4 border-l border-gray-100 hidden md:flex">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-gray-900">{profile?.displayName}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest leading-none">{profile?.role}</span>
          </div>
          <button onClick={handleLogout} className="text-xs font-semibold px-4 py-2 bg-gray-50 rounded-full border border-gray-200 hover:bg-orange-50 hover:text-orange-600 transition-all">
            Keluar
          </button>
        </div>

        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute top-16 left-0 right-0 bg-white border-b border-gray-100 shadow-lg shadow-gray-100/50 md:hidden overflow-hidden z-50"
          >
            <div className="flex flex-col p-6 gap-6">
              <div className="flex flex-col gap-4">
                <Link 
                  to="/" 
                  onClick={() => setIsMenuOpen(false)}
                  className="text-sm font-bold text-gray-900 flex items-center gap-2"
                >
                  <Salad size={18} className="text-orange-600" />
                  Resep
                </Link>
                {isAdmin && (
                  <Link 
                    to="/admin" 
                    onClick={() => setIsMenuOpen(false)}
                    className="text-sm font-bold text-gray-900 flex items-center gap-2"
                  >
                    <PlusCircle size={18} className="text-orange-600" />
                    Admin Panel
                  </Link>
                )}
              </div>
              
              <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-900">{profile?.displayName}</span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest leading-none">{profile?.role}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-xs font-bold text-orange-600 px-4 py-2 bg-orange-50 rounded-full"
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
