import { useState, useEffect } from 'react';
import { PlaySquare, Activity, AlertCircle, CheckCircle2, Trash2, RefreshCw, Clock, Hash } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function DashboardOverview() {
  const [stats, setStats] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timePopup, setTimePopup] = useState(null);
  const [idPopup, setIdPopup] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleBgClick = () => {
      setTimePopup(null);
      setIdPopup(null);
    };
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    
    window.addEventListener('click', handleBgClick);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('click', handleBgClick);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleTimeClick = (e, job) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    let x = rect.left - 80;
    if (x < 10) x = 10;
    setTimePopup({
      x,
      y: rect.top + 32,
      datetime: job.datetime || job.time,
      time: job.datetime ? job.time : null,
    });
    setIdPopup(null);
  };

  const handleIdClick = (e, videoId) => {
    e.stopPropagation();
    if (!videoId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    let x = rect.left;
    if (x < 10) x = 10;
    setIdPopup({
      x,
      y: rect.top + 32,
      videoId
    });
    setTimePopup(null);
  };

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      const data = response.data;

      // Map API stats to include icons
      const mappedStats = data.stats.map(s => {
        let icon;
        if (s.title.includes('Total')) icon = <PlaySquare size={24} className="text-info" />;
        else if (s.title.includes('Aktif')) icon = <Activity size={24} className="text-warning" />;
        else if (s.title.includes('Selesai')) icon = <CheckCircle2 size={24} className="text-success" />;
        else icon = <AlertCircle size={24} className="text-danger" />;
        return { ...s, icon };
      });

      setStats(mappedStats);
      setRecentJobs(data.recentJobs || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setLoading(false);
    }
  };

  const handleDeleteLog = async (logId) => {
    try {
      await api.delete(`/dashboard/logs/${logId}`);
      toast.success('Log dihapus');
      fetchDashboardData();
    } catch (err) {
      toast.error('Gagal menghapus log');
    }
  };

  const handleClearAllLogs = async () => {
    if (!confirm('Hapus SEMUA riwayat job? Tindakan ini tidak bisa dibatalkan.')) return;
    try {
      const res = await api.delete('/dashboard/logs');
      toast.success(res.data?.message || 'Semua log dihapus');
      fetchDashboardData();
    } catch (err) {
      toast.error('Gagal menghapus log');
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Poll every 5 seconds for updates
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading dashboard data...</div>;
  }

  return (
    <div>
      <h1 className="page-title">Dashboard Overview</h1>
      <p className="page-subtitle">Welcome back! Here's what's happening with your video pipeline.</p>

      <div className="grid-cols-4" style={{ marginBottom: '32px' }}>
        {stats.map((stat, idx) => (
          <div className="card glass-panel" key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px', height: '48px',
              borderRadius: '12px',
              background: `rgba(${stat.color === 'var(--info)' ? '14, 165, 233' : stat.color === 'var(--warning)' ? '245, 158, 11' : stat.color === 'var(--success)' ? '16, 185, 129' : '239, 68, 68'}, 0.15)`,
              color: stat.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>{stat.title}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ margin: 0 }}>Recent Jobs (Auto-refresh)</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={fetchDashboardData}>
              <RefreshCw size={14} /> Refresh
            </button>
            {recentJobs.length > 0 && (
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'var(--danger)' }} onClick={handleClearAllLogs}>
                <Trash2 size={14} /> Bersihkan Riwayat
              </button>
            )}
          </div>
        </div>

        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px', fontWeight: 500, whiteSpace: 'nowrap' }}>Video ID</th>
                <th style={{ padding: '12px', fontWeight: 500, whiteSpace: 'nowrap' }}>Step</th>
                <th style={{ padding: '12px', fontWeight: 500, whiteSpace: 'nowrap' }}>Status</th>
                <th style={{ padding: '12px', fontWeight: 500, whiteSpace: 'nowrap' }}>Waktu</th>
                <th style={{ padding: '12px', fontWeight: 500, whiteSpace: 'nowrap' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {recentJobs.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No recent jobs found. Add a video to the source folder!</td>
                </tr>
              ) : recentJobs.map((job) => (
                <tr key={job.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td 
                    style={{ padding: '16px 12px', fontWeight: 600, whiteSpace: 'nowrap', cursor: isMobile ? 'pointer' : 'default', color: 'var(--accent-primary)' }} 
                    title={isMobile ? "Klik untuk lihat full ID" : ""}
                    onClick={(e) => { if (isMobile) handleIdClick(e, job.video_id); }}
                  >
                    {isMobile ? (job.video_id ? (job.video_id.length > 5 ? '...' + job.video_id.slice(-5) : job.video_id) : '-') : (job.video_id || '-')}
                  </td>
                  <td style={{ padding: '16px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{job.step}</td>
                  <td style={{ padding: '16px 12px', whiteSpace: 'nowrap' }}>
                    <span className={`badge badge-${job.type}`}>{job.status}</span>
                  </td>
                  <td style={{ padding: '16px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {isMobile ? (
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px', background: 'transparent', border: '1px solid var(--border-light)' }}
                        onClick={(e) => handleTimeClick(e, job)}
                        title="Lihat Waktu"
                      >
                        <Clock size={16} />
                      </button>
                    ) : (
                      <>
                        <div style={{ color: 'var(--text-primary)' }}>{job.datetime || job.time}</div>
                        {job.datetime && <div style={{ fontSize: '0.8rem' }}>{job.time}</div>}
                      </>
                    )}
                  </td>
                  <td style={{ padding: '16px 12px', whiteSpace: 'nowrap' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => handleDeleteLog(job.id)}
                      title="Hapus log ini"
                    >
                      <Trash2 size={14} /> {!isMobile && 'Hapus'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {timePopup && (
        <div style={{
          position: 'fixed',
          left: timePopup.x,
          top: timePopup.y,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
          zIndex: 9999,
          color: 'var(--text-primary)',
          fontSize: '0.85rem',
          minWidth: '150px'
        }} onClick={(e) => e.stopPropagation()}>
          <div style={{ fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} color="var(--accent-primary)" />
            Waktu Proses
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>{timePopup.datetime}</div>
          {timePopup.time && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>{timePopup.time}</div>}
        </div>
      )}

      {idPopup && (
        <div style={{
          position: 'fixed',
          left: idPopup.x,
          top: idPopup.y,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
          zIndex: 9999,
          color: 'var(--text-primary)',
          fontSize: '0.85rem',
          maxWidth: '85vw',
          wordBreak: 'break-all'
        }} onClick={(e) => e.stopPropagation()}>
          <div style={{ fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Hash size={14} color="var(--accent-primary)" />
            Full Video ID
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>{idPopup.videoId}</div>
        </div>
      )}
    </div>
  );
}
