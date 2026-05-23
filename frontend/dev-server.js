// Local-only API server. In production, Vercel serves the same Express app
// from api/[...path].js. Vite dev proxies /api to this server (port 3001).
import app from './api/_server/app.js';

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`AppNiche API (dev) running on http://localhost:${PORT}`));
