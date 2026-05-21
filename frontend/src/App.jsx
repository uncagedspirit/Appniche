import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Landing from './pages/Landing.jsx';
import Dashboard from './pages/Dashboard.jsx';
import KeywordResearch from './pages/KeywordResearch.jsx';
import NicheExplorer from './pages/NicheExplorer.jsx';
import AppAnalyzer from './pages/AppAnalyzer.jsx';
import IdeaGenerator from './pages/IdeaGenerator.jsx';
import ASOOptimizer from './pages/ASOOptimizer.jsx';
import SavedItems from './pages/SavedItems.jsx';
import Login from './pages/Login.jsx';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-acid border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/app" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="keywords" element={<KeywordResearch />} />
        <Route path="niches" element={<NicheExplorer />} />
        <Route path="analyzer" element={<AppAnalyzer />} />
        <Route path="ideas" element={<IdeaGenerator />} />
        <Route path="aso" element={<ASOOptimizer />} />
        <Route path="saved" element={<SavedItems />} />
      </Route>
    </Routes>
  );
}
