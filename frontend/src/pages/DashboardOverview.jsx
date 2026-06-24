import { useState, useEffect } from 'react';
import { PlaySquare, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../api';

export default function DashboardOverview() {
  const [stats, setStats] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);

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
      setRecentJobs(data.recentJobs);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setLoading(false);
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Recent Jobs (Auto-refresh)</h3>
          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={fetchDashboardData}>Refresh Now</button>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px', fontWeight: 500 }}>Video ID</th>
                <th style={{ padding: '12px', fontWeight: 500 }}>Current Step</th>
                <th style={{ padding: '12px', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '12px', fontWeight: 500 }}>Time</th>
                <th style={{ padding: '12px', fontWeight: 500 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentJobs.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No recent jobs found. Add a video to the source folder!</td>
                </tr>
              ) : recentJobs.map((job, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '16px 12px', fontWeight: 600 }}>{job.id}</td>
                  <td style={{ padding: '16px 12px', color: 'var(--text-secondary)' }}>{job.step}</td>
                  <td style={{ padding: '16px 12px' }}>
                    <span className={`badge badge-${job.type}`}>{job.status}</span>
                  </td>
                  <td style={{ padding: '16px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{job.datetime || job.time}</div>
                    {job.datetime && <div style={{ fontSize: '0.7rem', marginTop: '2px' }}>{job.time}</div>}
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>Detail</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
