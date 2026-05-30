import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Landing from './pages/Landing.jsx';
import Dashboard from './pages/Dashboard.jsx';
import KeywordResearch from './pages/KeywordResearch.jsx';
import NicheExplorer from './pages/NicheExplorer.jsx';
import MarketExplorer from './pages/MarketExplorer.jsx';
import AppAnalyzer from './pages/AppAnalyzer.jsx';
import IdeaGenerator from './pages/IdeaGenerator.jsx';
import ASOOptimizer from './pages/ASOOptimizer.jsx';
import SavedItems from './pages/SavedItems.jsx';
import MarketReport from './pages/MarketReport.jsx';
import ReviewIntelligence from './pages/ReviewIntelligence.jsx';
import Watchlist from './pages/Watchlist.jsx';
import IdeaValidator from './pages/IdeaValidator.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="keywords" element={<KeywordResearch />} />
        <Route path="niches" element={<NicheExplorer />} />
        <Route path="market" element={<MarketExplorer />} />
        <Route path="analyzer" element={<AppAnalyzer />} />
        <Route path="ideas" element={<IdeaGenerator />} />
        <Route path="aso" element={<ASOOptimizer />} />
        <Route path="saved" element={<SavedItems />} />
        <Route path="report" element={<MarketReport />} />
        <Route path="reviews" element={<ReviewIntelligence />} />
        <Route path="watchlist" element={<Watchlist />} />
        <Route path="validate" element={<IdeaValidator />} />
      </Route>
    </Routes>
  );
}
