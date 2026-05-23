import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UIProvider, useUI } from './context/UIContext';
import { AnimatePresence, motion } from 'motion/react';
import Home from './pages/Home';
import RecipeDetail from './pages/RecipeDetail';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import AIAssistantHub from './components/AIAssistantHub';
import ChefChat from './components/ChefChat';
import SulapSisaChat from './components/SulapSisaChat';
import MealPlannerChat from './components/MealPlannerChat';
import Navbar from './components/Navbar';
import Loader from './components/Loader';
import CookingTimer from './components/CookingTimer';
import MobileBottomNav from './components/MobileBottomNav';

import ShoppingList from './pages/ShoppingList';
import ShoppingListDetail from './pages/ShoppingListDetail';
import CustomRecipes from './pages/CustomRecipes';
import CustomRecipeDetail from './pages/CustomRecipeDetail';

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { user, loading, isAdmin } = useAuth();
  
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/" />;
  
  return <>{children}</>;
};

function AnimatedRoutes() {
  const location = useLocation();
  const { loading } = useAuth();

  if (loading) return <Loader />;

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <Login />
          </motion.div>
        } />
        <Route path="/" element={
          <ProtectedRoute>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <Home />
            </motion.div>
          </ProtectedRoute>
        } />
        <Route path="/shopping-list" element={
          <ProtectedRoute>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <ShoppingList />
            </motion.div>
          </ProtectedRoute>
        } />
        <Route path="/shopping-list/:id" element={
          <ProtectedRoute>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <ShoppingListDetail />
            </motion.div>
          </ProtectedRoute>
        } />
        <Route path="/custom-recipes" element={
          <ProtectedRoute>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <CustomRecipes />
            </motion.div>
          </ProtectedRoute>
        } />
        <Route path="/custom-recipe/:id" element={
          <ProtectedRoute>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <CustomRecipeDetail />
            </motion.div>
          </ProtectedRoute>
        } />
        <Route path="/recipe/:id" element={
          <ProtectedRoute>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <RecipeDetail />
            </motion.div>
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute adminOnly>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}>
              <AdminDashboard />
            </motion.div>
          </ProtectedRoute>
        } />
      </Routes>
    </AnimatePresence>
  );
}

function AppContent() {
  const { user } = useAuth();
  const { activeComponent, setActiveComponent, toast, hideToast } = useUI();
  const [assistantType, setAssistantType] = React.useState<'chef' | 'sulap' | 'meal-planner' | null>(null);

  // Sync assistantType with activeComponent
  React.useEffect(() => {
    if (activeComponent !== 'assistant') {
      setAssistantType(null);
    }
  }, [activeComponent]);

  React.useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        hideToast();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show, toast.message, hideToast]);

  return (
    <Router>
      <div className="min-h-screen bg-[#FAFAF8] text-[#2D2D2D] font-sans selection:bg-orange-600 selection:text-white relative overflow-x-hidden">
        {/* Global Floating Toast */}
        <div className="fixed top-4 md:top-6 left-0 right-0 z-[100000] flex justify-center pointer-events-none px-4">
          <AnimatePresence>
            {toast.show && (
              <motion.div
                initial={{ opacity: 0, y: -40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 450, damping: 28 }}
                className="pointer-events-auto flex items-center gap-3.5 px-5 py-3.5 rounded-2xl shadow-[0_20px_50px_rgba(251,146,60,0.18),0_1px_4px_rgba(0,0,0,0.05)] border backdrop-blur-lg max-w-[95vw] w-[380px]"
                style={{
                  backgroundColor: toast.type === 'success' ? 'rgba(255, 255, 255, 0.99)' : toast.type === 'error' ? 'rgba(254, 242, 242, 0.99)' : 'rgba(255, 255, 255, 0.99)',
                  borderColor: toast.type === 'success' ? '#FED7AA' : toast.type === 'error' ? '#FECACA' : '#E5E7EB',
                }}
              >
                <div className="flex-shrink-0">
                  {toast.type === 'success' ? (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/15">
                      <motion.span
                        animate={{ scale: [1, 1.15, 1, 1.15, 1], rotate: [0, 8, -8, 8, 0] }}
                        transition={{ repeat: Infinity, duration: 2.5, repeatDelay: 1.5 }}
                        className="text-sm"
                      >
                        ✨
                      </motion.span>
                    </div>
                  ) : toast.type === 'error' ? (
                    <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                      ✕
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                      ℹ
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-orange-600/80 mb-0.5 font-sans">
                    {toast.type === 'success' ? 'Berhasil Terkirim' : toast.type === 'error' ? 'Kesalahan' : 'Pemberitahuan'}
                  </h4>
                  <p className="text-xs font-bold text-gray-800 leading-snug">
                    {toast.message}
                  </p>
                </div>

                <button
                  onClick={hideToast}
                  className="text-gray-400 hover:text-gray-700 p-1 rounded-xl transition-colors hover:bg-gray-100/50 focus:outline-none"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Ambient Background Elements - Disabled on mobile for performance */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden hidden md:block">
          <motion.div 
            animate={{ 
              x: [0, 100, 0], 
              y: [0, 150, 0],
              rotate: [0, 45, 0]
            }} 
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -top-24 -left-24 w-[500px] h-[500px] bg-orange-50/50 rounded-full blur-[100px]" 
          />
          <motion.div 
            animate={{ 
              x: [0, -80, 0], 
              y: [0, -120, 0],
              rotate: [0, -30, 0]
            }} 
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-24 -right-24 w-[600px] h-[600px] bg-emerald-50/50 rounded-full blur-[100px]" 
          />
        </div>

        {user && <Navbar />}
        <main className="relative">
          <AnimatedRoutes />
        </main>
        {user && (
          <>
            <AIAssistantHub 
              openAssistant={assistantType}
              setOpenAssistant={(type) => {
                setAssistantType(type);
                if (type) setActiveComponent('assistant');
                else setActiveComponent(null);
              }}
            />
            <ChefChat 
              isOpen={assistantType === 'chef'} 
              onToggle={() => {
                if (assistantType === 'chef') {
                  setAssistantType(null);
                  setActiveComponent(null);
                } else {
                  setAssistantType('chef');
                  setActiveComponent('assistant');
                }
              }}
            />
            <SulapSisaChat 
              isOpen={assistantType === 'sulap'} 
              onToggle={() => {
                if (assistantType === 'sulap') {
                  setAssistantType(null);
                  setActiveComponent(null);
                } else {
                  setAssistantType('sulap');
                  setActiveComponent('assistant');
                }
              }}
            />
            <MealPlannerChat 
              isOpen={assistantType === 'meal-planner'} 
              onToggle={() => {
                if (assistantType === 'meal-planner') {
                  setAssistantType(null);
                  setActiveComponent(null);
                } else {
                  setAssistantType('meal-planner');
                  setActiveComponent('assistant');
                }
              }}
            />
            <CookingTimer />
            <MobileBottomNav />
          </>
        )}
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <UIProvider>
        <AppContent />
      </UIProvider>
    </AuthProvider>
  );
}
