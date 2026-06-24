import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Video,
  Scissors,
  Subtitles,
  Image as ImageIcon,
  MonitorPlay,
  ScrollText,
  Settings,
  Menu,
  X,
  UploadCloud,
  Folder,
  Film,
  Tag,
  LogOut
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import api from './api';

// Pages
import Login from './pages/Login';
import DashboardOverview from './pages/DashboardOverview';
import FileManager from './pages/FileManager';
import ErrorBoundary from './ErrorBoundary';
import VideoList from './pages/VideoList';
import ConfigSilenceCut from './pages/ConfigSilenceCut';
import ConfigCaption from './pages/ConfigCaption';
import ConfigCover from './pages/ConfigCover';
import ConfigRender from './pages/ConfigRender';
import JobLogs from './pages/JobLogs';
import GlobalSettings from './pages/GlobalSettings';
import OutputList from './pages/OutputList';
import ProductGroups from './pages/ProductGroups';

function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { path: '/explorer', label: 'File Explorer', icon: <Folder size={20} /> },
    { path: '/videos', label: 'Daftar Video', icon: <Video size={20} /> },
    { path: '/products', label: 'Kelola Produk', icon: <Tag size={20} /> },
    { path: '/outputs', label: 'Hasil Render', icon: <Film size={20} /> },
    { path: '/config/silence-cut', label: 'Silence Cut', icon: <Scissors size={20} /> },
    { path: '/config/caption', label: 'Auto Caption', icon: <Subtitles size={20} /> },
    { path: '/config/cover', label: 'Auto Cover', icon: <ImageIcon size={20} /> },
    { path: '/config/render', label: 'Render Settings', icon: <MonitorPlay size={20} /> },
    { path: '/settings', label: 'Global Settings', icon: <Settings size={20} /> },
    { path: '/logs', label: 'Log & Riwayat', icon: <ScrollText size={20} /> },
  ];

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'show' : ''}`} onClick={() => setIsOpen(false)}></div>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="logo-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="logo-icon">V</div>
            <div className="logo-text">Vidflow Studio</div>
          </div>
          <button className="mobile-close-btn" onClick={() => setIsOpen(false)}>
            <X size={24} />
          </button>
        </div>
        
        <ul className="nav-menu">
          {navItems.map((item) => (
            <li className="nav-item" key={item.path}>
              <Link 
                to={item.path} 
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Cek token yang sudah ada saat mount
  useEffect(() => {
    const token = localStorage.getItem('vidflow_token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verifikasi token masih valid
      api.get('/auth/me')
        .then(() => setIsAuthenticated(true))
        .catch(() => {
          localStorage.removeItem('vidflow_token');
          localStorage.removeItem('vidflow_user');
        })
        .finally(() => setAuthChecked(true));
    } else {
      setAuthChecked(true);
    }
  }, []);

  const handleLogin = () => setIsAuthenticated(true);

  const handleLogout = () => {
    localStorage.removeItem('vidflow_token');
    localStorage.removeItem('vidflow_user');
    delete api.defaults.headers.common['Authorization'];
    setIsAuthenticated(false);
  };

  if (!authChecked) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
    </div>;
  }

  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" toastOptions={{
          style: { background: 'rgba(30, 41, 59, 0.9)', color: '#fff', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }
        }} />
        <Login onLogin={handleLogin} />
      </>
    );
  }

  return (
    <Router>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: 'rgba(30, 41, 59, 0.9)',
          color: '#fff',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }
      }} />
      <div className="app-container">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

        <main className="main-content">
          <header className="top-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
                <Menu size={24} />
              </button>
              <div className="header-title" style={{ color: 'var(--text-secondary)' }}>Welcome to Vidflow Studio</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span className="badge badge-success hide-mobile">System Online</span>
              <button
                onClick={handleLogout}
                title="Logout"
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}
              >
                <LogOut size={16} />
              </button>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>V</div>
            </div>
          </header>

          <div className="page-content">
            <Routes>
              <Route path="/" element={<DashboardOverview />} />
              <Route path="/explorer" element={<ErrorBoundary><FileManager /></ErrorBoundary>} />
              <Route path="/videos" element={<VideoList />} />
              <Route path="/products" element={<ProductGroups />} />
              <Route path="/outputs" element={<OutputList />} />
              <Route path="/config/silence-cut" element={<ConfigSilenceCut />} />
              <Route path="/config/caption" element={<ConfigCaption />} />
              <Route path="/config/cover" element={<ConfigCover />} />
              <Route path="/config/render" element={<ConfigRender />} />
              <Route path="/settings" element={<GlobalSettings />} />
              <Route path="/logs" element={<JobLogs />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
