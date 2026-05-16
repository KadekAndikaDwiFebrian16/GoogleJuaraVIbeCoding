import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import RecipeDetail from './pages/RecipeDetail';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import AIAssistantHub from './components/AIAssistantHub';
import AIAssistantChat from './components/AIAssistant';
import SulapSisaChat from './components/SulapSisaButton';
import Navbar from './components/Navbar';

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { user, loading, isAdmin } = useAuth();
  
  if (loading) return <div className="h-screen flex items-center justify-center font-sans">Memuat...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/" />;
  
  return <>{children}</>;
};

function AppContent() {
  const { user } = useAuth();
  const [openAssistant, setOpenAssistant] = React.useState<'chef' | 'sulap' | null>(null);

  React.useEffect(() => {
    if (openAssistant) {
      window.dispatchEvent(new CustomEvent('close-timer'));
    }
  }, [openAssistant]);

  React.useEffect(() => {
    const handleCloseAssistant = () => setOpenAssistant(null);
    window.addEventListener('close-assistant', handleCloseAssistant);
    return () => window.removeEventListener('close-assistant', handleCloseAssistant);
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-[#FAFAF8] text-[#2D2D2D] font-sans selection:bg-orange-600 selection:text-white">
        {user && <Navbar />}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/recipe/:id" element={<ProtectedRoute><RecipeDetail /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
        </Routes>
        {user && (
          <>
            <AIAssistantHub 
              openAssistant={openAssistant}
              setOpenAssistant={setOpenAssistant}
            />
            <AIAssistantChat 
              isOpen={openAssistant === 'chef'} 
              onToggle={() => setOpenAssistant(prev => prev === 'chef' ? null : 'chef')}
            />
            <SulapSisaChat 
              isOpen={openAssistant === 'sulap'} 
              onToggle={() => setOpenAssistant(prev => prev === 'sulap' ? null : 'sulap')}
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
      <AppContent />
    </AuthProvider>
  );
}
