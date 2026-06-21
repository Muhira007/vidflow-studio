import { useState, useEffect } from 'react';
import { Filter, Play, RotateCcw, MoreHorizontal } from 'lucide-react';
import api from '../api';

export default function VideoList() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVideos = async () => {
    try {
      const response = await api.get('/videos');
      setVideos(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching videos:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
    const interval = setInterval(fetchVideos, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleProcess = async (videoId) => {
    try {
      await api.post(`/videos/${videoId}/process`);
      alert('Proses dimulai untuk video: ' + videoId);
      fetchVideos();
    } catch (error) {
      alert('Gagal memulai proses: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading videos...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h1 className="page-title">Daftar Video</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Kelola dan pantau semua video dalam antrian Anda.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <select className="form-control" style={{ width: '160px' }}>
              <option>Semua Status</option>
              <option>Pending</option>
              <option>Processing</option>
              <option>Completed</option>
              <option>Failed</option>
            </select>
          </div>
          <button className="btn btn-secondary">
            <Filter size={18} /> Filter
          </button>
        </div>
      </div>

      <div className="card glass-panel">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '16px 12px', fontWeight: 500 }}>ID Video</th>
                <th style={{ padding: '16px 12px', fontWeight: 500 }}>Tanggal</th>
                <th style={{ padding: '16px 12px', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '16px 12px', fontWeight: 500, textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {videos.length === 0 ? (
                <tr><td colSpan="4" style={{textAlign: 'center', padding: '20px'}}>Belum ada video terdaftar.</td></tr>
              ) : videos.map((vid, idx) => {
                const status = (vid.status || '').toUpperCase();
                let badgeType = 'warning';
                if (status === 'COMPLETED') badgeType = 'success';
                if (status === 'FAILED') badgeType = 'danger';
                if (status === 'PENDING') badgeType = 'secondary';
                
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '16px 12px', fontWeight: 600, color: 'var(--accent-primary)' }}>{vid.id}</td>
                    <td style={{ padding: '16px 12px', color: 'var(--text-secondary)' }}>{new Date(vid.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '16px 12px' }}>
                      <span className={`badge badge-${badgeType}`}>{status}</span>
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        {status === 'FAILED' && (
                          <button onClick={() => handleProcess(vid.id)} className="btn btn-secondary" style={{ padding: '6px 10px' }} title="Retry">
                            <RotateCcw size={16} />
                          </button>
                        )}
                        {(status === 'PENDING' || status === 'FAILED') && (
                          <button onClick={() => handleProcess(vid.id)} className="btn btn-primary" style={{ padding: '6px 10px' }} title="Proses">
                            <Play size={16} />
                          </button>
                        )}
                        <button className="btn btn-secondary" style={{ padding: '6px 10px' }} title="Detail">
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
