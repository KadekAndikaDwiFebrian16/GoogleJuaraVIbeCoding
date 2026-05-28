import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signInWithGoogle } from '../lib/firebase';
import { motion } from 'motion/react';
import { Salad } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async () => {
    setLoading(true);
    try {
       await signInWithGoogle();
    } catch (error) {
       console.error(error);
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAF8] p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100 text-center"
      >
        <div className="mb-10 flex justify-center">
           <span className="text-2xl font-serif font-black tracking-tighter text-gray-900 select-none pb-1">
             Dapur<span className="bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 bg-clip-text text-transparent animate-gradient-smooth">sehat.</span>
           </span>
         </div>

        <h1 className="text-2xl font-serif font-bold text-gray-900 mb-2 tracking-tight">Welcome</h1>
        <p className="text-gray-400 text-sm mb-10 leading-relaxed font-medium">
          Access your personalized healthy kitchen powered by AI.
        </p>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200/80 hover:border-amber-500/50 text-[10px] uppercase tracking-widest font-bold py-4 px-6 rounded-2xl transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 group font-sans"
        >
          {loading ? (
            <span className="text-gray-400 animate-pulse">Processing...</span>
          ) : (
            <>
              <svg 
                className="w-4.5 h-4.5 shrink-0 transition-transform duration-300 group-hover:scale-110" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <div className="mt-12 pt-8 border-t border-gray-50 flex flex-col gap-4">
            <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Admin & Member Portal</p>
            <div className="flex justify-center gap-4 text-gray-300">
               <Salad size={20} />
            </div>
        </div>
      </motion.div>
      <p className="mt-8 text-[10px] text-gray-300 font-bold uppercase tracking-[0.3em]">Minimalist Kitchen Assistant</p>
    </div>
  );
}
