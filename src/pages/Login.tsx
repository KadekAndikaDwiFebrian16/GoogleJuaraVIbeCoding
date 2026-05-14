import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../lib/firebase';
import { motion } from 'motion/react';
import { ChefHat, Chrome } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate('/');
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
           <span className="text-2xl font-serif font-black tracking-tighter text-gray-900 border-b-2 border-orange-600 pb-1">Dapursehat.</span>
        </div>

        <h1 className="text-2xl font-serif font-bold text-gray-900 mb-2 tracking-tight">Welcome Back</h1>
        <p className="text-gray-400 text-sm mb-10 leading-relaxed font-medium">
          Access your personalized healthy kitchen powered by AI.
        </p>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-gray-900 hover:bg-orange-600 text-white text-[10px] uppercase tracking-widest font-bold py-4 px-6 rounded-2xl transition-all shadow-md active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <span>Processing...</span>
          ) : (
            <>
              <Chrome size={18} />
              Continue with Google
            </>
          )}
        </button>

        <div className="mt-12 pt-8 border-t border-gray-50 flex flex-col gap-4">
            <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Admin & Member Portal</p>
            <div className="flex justify-center gap-4 text-gray-300">
               <ChefHat size={20} />
            </div>
        </div>
      </motion.div>
      <p className="mt-8 text-[10px] text-gray-300 font-bold uppercase tracking-[0.3em]">Minimalist Kitchen Assistant</p>
    </div>
  );
}
