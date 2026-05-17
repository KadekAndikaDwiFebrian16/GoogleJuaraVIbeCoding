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
import AIAssistantChat from './components/AIAssistant';
import SulapSisaChat from './components/SulapSisaButton';
import MealPlannerChat from './components/MealPlannerChat';
import Navbar from './components/Navbar';
import Loader from './components/Loader';

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
  const { activeComponent, setActiveComponent } = useUI();
  const [assistantType, setAssistantType] = React.useState<'chef' | 'sulap' | 'meal-planner' | null>(null);

  // Sync assistantType with activeComponent
  React.useEffect(() => {
    if (activeComponent !== 'assistant') {
      setAssistantType(null);
    }
  }, [activeComponent]);

  return (
    <Router>
      <div className="min-h-screen bg-[#FAFAF8] text-[#2D2D2D] font-sans selection:bg-orange-600 selection:text-white relative overflow-x-hidden">
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
        <main className="relative z-10">
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
            <AIAssistantChat 
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
