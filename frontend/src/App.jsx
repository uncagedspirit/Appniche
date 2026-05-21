import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Landing from './pages/Landing.jsx';
import Dashboard from './pages/Dashboard.jsx';
import KeywordResearch from './pages/KeywordResearch.jsx';
import NicheExplorer from './pages/NicheExplorer.jsx';
import AppAnalyzer from './pages/AppAnalyzer.jsx';
import IdeaGenerator from './pages/IdeaGenerator.jsx';
import ASOOptimizer from './pages/ASOOptimizer.jsx';
import SavedItems from './pages/SavedItems.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<Layout />}>
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
