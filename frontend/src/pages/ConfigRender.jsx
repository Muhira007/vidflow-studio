import { useState, useEffect } from 'react';
import { Save, AlertTriangle } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function ConfigRender() {
  const [resolution, setResolution] = useState('1080p');
  const [outputFormat, setOutputFormat] = useState('MP4 (H.264)');
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
      if (res.data.output_format) {
        setOutputFormat(res.data.output_format);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.post('/videos/settings/render', { resolution, output_format: outputFormat });
      toast.success('Pengaturan Render berhasil disimpan!');
    } catch (err) {
      toast.error('Gagal menyimpan pengaturan: ' + err.message);
    }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div style={{ maxWidth: '800px' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Render Settings</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Atur resolusi, format, dan kualitas export untuk video final.</p>
        </div>
        <button onClick={handleSave} className="btn btn-primary" style={{ padding: '10px 22px', fontWeight: 600 }}>
          <Save size={16} /> Simpan Konfigurasi
        </button>
      </div>

      <div className="card glass-panel" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border-light)' }}>
          Pengaturan Dasar
        </h3>
        <div className="grid-cols-2">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Resolusi Output</label>
            <select
              className="form-control"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
            >
              <option value="720p">HD (720p)</option>
              <option value="1080p">FHD (1080p)</option>
            </select>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              1080p direkomendasikan untuk keseimbangan kualitas & kecepatan
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Format Output</label>
            <select
              className="form-control"
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
            >
              <option>MP4 (H.264)</option>
              <option>MP4 (H.265 / HEVC)</option>
              <option>WebM</option>
            </select>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              H.265 menghasilkan file lebih kecil namun proses lebih lama
            </div>
          </div>
        </div>
      </div>

      <div className="card glass-panel">
        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '12px', borderBottom: '1px solid var(--border-light)' }}>
          <AlertTriangle size={18} className="text-warning" /> Advanced Settings
        </h3>
        
        <div className="grid-cols-3">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Video Bitrate (Mbps)</label>
            <input type="number" className="form-control" defaultValue="8" />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Audio Bitrate (kbps)</label>
            <select className="form-control" defaultValue="192">
              <option>128</option>
              <option>192</option>
              <option>256</option>
              <option>320</option>
            </select>
          </div>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
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
    </div>
  );
}
