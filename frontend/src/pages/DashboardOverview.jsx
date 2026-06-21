import { PlaySquare, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function DashboardOverview() {
  const stats = [
    { title: 'Total Video', value: '142', icon: <PlaySquare size={24} className="text-info" />, color: 'var(--info)' },
    { title: 'Job Aktif', value: '3', icon: <Activity size={24} className="text-warning" />, color: 'var(--warning)' },
    { title: 'Selesai Hari Ini', value: '12', icon: <CheckCircle2 size={24} className="text-success" />, color: 'var(--success)' },
    { title: 'Gagal Hari Ini', value: '1', icon: <AlertCircle size={24} className="text-danger" />, color: 'var(--danger)' },
  ];

  const recentJobs = [
    { id: 'vid_0921a', step: 'Render 4K', status: 'Running', time: '10 mins ago', type: 'warning' },
    { id: 'vid_0921b', step: 'Silence Cut', status: 'Running', time: '12 mins ago', type: 'warning' },
    { id: 'vid_0921c', step: 'Generate Cover', status: 'Failed', time: '1 hour ago', type: 'danger' },
    { id: 'vid_0920a', step: 'Done', status: 'Success', time: '3 hours ago', type: 'success' },
    { id: 'vid_0920b', step: 'Done', status: 'Success', time: '4 hours ago', type: 'success' },
  ];

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
          <h3>Recent Jobs</h3>
          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>View All</button>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px', fontWeight: 500 }}>Video ID</th>
                <th style={{ padding: '12px', fontWeight: 500 }}>Current Step</th>
                <th style={{ padding: '12px', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '12px', fontWeight: 500 }}>Started At</th>
                <th style={{ padding: '12px', fontWeight: 500 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentJobs.map((job, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '16px 12px', fontWeight: 600 }}>{job.id}</td>
                  <td style={{ padding: '16px 12px', color: 'var(--text-secondary)' }}>{job.step}</td>
                  <td style={{ padding: '16px 12px' }}>
                    <span className={`badge badge-${job.type}`}>{job.status}</span>
                  </td>
                  <td style={{ padding: '16px 12px', color: 'var(--text-muted)' }}>{job.time}</td>
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
