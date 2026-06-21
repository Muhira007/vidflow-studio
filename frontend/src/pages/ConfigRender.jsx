import { useState, useEffect } from 'react';
import { Save, AlertTriangle } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function ConfigRender() {
  const [resolution, setResolution] = useState('1080p');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/videos/settings/render');
      if (res.data.resolution) {
        setResolution(res.data.resolution);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.post('/videos/settings/render', { resolution });
      toast.success('Pengaturan Render berhasil disimpan! Semua video yang masih berstatus PENDING akan mengikuti resolusi baru ini.');
    } catch (err) {
      toast.error('Gagal menyimpan pengaturan: ' + err.message);
    }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div style={{ maxWidth: '800px' }}>
      <h1 className="page-title">Render Settings</h1>
      <p className="page-subtitle">Atur resolusi, format, dan kualitas export untuk video final.</p>

      <div className="card glass-panel grid-cols-2">
        <div className="form-group">
          <label className="form-label">Resolusi Output</label>
          <select 
            className="form-control" 
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
          >
            <option value="720p">HD (720p)</option>
            <option value="1080p">FHD (1080p)</option>
            <option value="4K">4K (2160p)</option>
          </select>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            4K membutuhkan waktu proses lebih lama
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Format Output</label>
          <select className="form-control" defaultValue="MP4 (H.264)">
            <option>MP4 (H.264)</option>
            <option>MP4 (H.265 / HEVC)</option>
            <option>WebM</option>
          </select>
        </div>

        <div style={{ gridColumn: 'span 2', marginTop: '16px' }}>
          <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} className="text-warning" /> Advanced Settings
          </h4>
          
          <div className="grid-cols-2">
            <div className="form-group">
              <label className="form-label">Video Bitrate (Mbps)</label>
              <input type="number" className="form-control" defaultValue="8" />
            </div>

            <div className="form-group">
              <label className="form-label">Audio Bitrate (kbps)</label>
              <select className="form-control" defaultValue="192">
                <option>128</option>
                <option>192</option>
                <option>256</option>
                <option>320</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Hardware Acceleration</label>
              <select className="form-control" defaultValue="Auto">
                <option>Auto (Recommended)</option>
                <option>NVENC (NVIDIA)</option>
                <option>QSV (Intel)</option>
                <option>Software Only</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ gridColumn: 'span 2', marginTop: '16px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: '24px' }}>
          <button onClick={handleSave} className="btn btn-primary">
            <Save size={18} /> Simpan Konfigurasi
          </button>
        </div>
      </div>
    </div>
  );
}
