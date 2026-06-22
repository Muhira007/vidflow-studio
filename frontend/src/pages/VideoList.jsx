import { useState, useEffect } from 'react';
import { Filter, Play, RotateCcw, MoreHorizontal, Trash2, FolderSync, AlertTriangle } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function VideoList() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [videoToDelete, setVideoToDelete] = useState(null);

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
      toast.success('Proses dimulai untuk video: ' + videoId);
      fetchVideos();
    } catch (error) {
      toast.error('Gagal memulai proses: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleSync = async () => {
    try {
      const res = await api.post('/videos/sync');
      toast.success(`Sinkronisasi berhasil! ${res.data.added} video baru ditambahkan ke database.`);
      fetchVideos();
    } catch (error) {
      let errMsg = 'Gagal sinkronisasi';
      // HTTP error with response body
      if (error.response?.data?.detail) {
        errMsg += ': ' + error.response.data.detail;
      } else if (error.response?.status) {
        errMsg += `: Server error (${error.response.status})`;
      } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        errMsg += ': Tidak dapat terhubung ke server. Pastikan backend berjalan.';
      } else {
        errMsg += ': ' + error.message;
      }
      toast.error(errMsg);
    }
  };

  const executeDelete = async (videoId) => {
    setVideoToDelete(null); // Close modal immediately
    try {
      await api.delete(`/videos/${videoId}`);
      toast.success('Video berhasil dihapus!');
      fetchVideos();
    } catch (error) {
      toast.error('Gagal menghapus video: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading videos...</div>;

  return (
    <div>
      {/* DELETE CONFIRMATION MODAL */}
      {videoToDelete && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div className="card glass-panel" style={{ maxWidth: '400px', width: '100%', animation: 'fadeIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: 'var(--danger)' }}>
              <AlertTriangle size={28} />
              <h3 style={{ margin: 0 }}>Konfirmasi Penghapusan</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
              Yakin ingin menghapus secara <strong style={{color: 'var(--danger)'}}>HARD DELETE</strong> video <strong style={{color: 'var(--text-primary)'}}>{videoToDelete}</strong>? <br/><br/>
              Tindakan ini akan menghapus data dari <b>Database</b> sekaligus melenyapkan semua *file* dari folder <b>Source</b>. Aksi ini tidak dapat dibatalkan!
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setVideoToDelete(null)}>
                Batal
              </button>
              <button className="btn btn-primary" style={{ background: 'var(--danger)', border: 'none', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }} onClick={() => executeDelete(videoToDelete)}>
                <Trash2 size={16} /> Ya, Hapus!
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Daftar Video</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Kelola dan pantau semua video dalam antrian Anda.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={handleSync} className="btn btn-primary">
            <FolderSync size={18} /> Sync Folder
          </button>
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
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
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
                        <button onClick={() => setVideoToDelete(vid.id)} className="btn btn-danger" style={{ padding: '6px 10px', backgroundColor: 'var(--danger)', color: 'white', border: 'none' }} title="Hapus">
                          <Trash2 size={16} />
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
