import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function ConfigSilenceCut() {
  const [level, setLevel] = useState('Level 2');
  const [threshold, setThreshold] = useState(-30.0);
  const [minDuration, setMinDuration] = useState(0.5);
  const [padding, setPadding] = useState(150);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/videos/settings/silence');
      const data = res.data;
      if (data.silence_cut_level !== undefined) {
        if (data.silence_cut_level === 0) setLevel('Nonaktif');
        else if (data.silence_cut_level === 1) setLevel('Level 1');
        else setLevel('Level 2');
      }
      if (data.silence_threshold !== undefined) setThreshold(data.silence_threshold);
      if (data.min_silence_duration !== undefined) setMinDuration(data.min_silence_duration);
      if (data.silence_padding !== undefined) setPadding(data.silence_padding);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    let numericLevel = 2;
    if (level === 'Nonaktif') numericLevel = 0;
    if (level === 'Level 1') numericLevel = 1;

    try {
      await api.post('/videos/settings/silence', {
        silence_cut_level: numericLevel,
        silence_threshold: parseFloat(threshold),
        min_silence_duration: parseFloat(minDuration),
        silence_padding: parseInt(padding)
      });
      toast.success('Pengaturan Silence Cut berhasil disimpan!');
    } catch (err) {
      toast.error('Gagal menyimpan pengaturan: ' + err.message);
    }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div style={{ maxWidth: '800px' }}>
      <h1 className="page-title">Silence Cut Configuration</h1>
      <p className="page-subtitle">Atur parameter untuk memotong bagian tanpa suara dari video secara otomatis.</p>

      <div className="card glass-panel">
        <div className="form-group" style={{ marginBottom: '32px' }}>
          <label className="form-label">Mode Pemotongan</label>
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
            {['Nonaktif', 'Level 1', 'Level 2'].map(opt => (
              <div 
                key={opt}
                onClick={() => setLevel(opt)}
                style={{
                  padding: '16px 24px',
                  borderRadius: '12px',
                  border: `2px solid ${level === opt ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  background: level === opt ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  cursor: 'pointer',
                  flex: 1,
                  textAlign: 'center',
                  fontWeight: level === opt ? 600 : 400,
                  transition: 'var(--transition-fast)'
                }}
              >
                {opt}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px', fontWeight: 400 }}>
                  {opt === 'Nonaktif' && 'Tidak ada pemotongan'}
                  {opt === 'Level 1' && 'Hanya potong awal & akhir video'}
                  {opt === 'Level 2' && 'Potong semua jeda diam (Tengah, Awal, Akhir)'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {level !== 'Nonaktif' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h3 style={{ marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border-light)' }}>
              Parameter Threshold
            </h3>
            
            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label">Threshold dB (Ambang Batas)</label>
                <input type="number" className="form-control" value={threshold} onChange={e => setThreshold(e.target.value)} />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>Lebih senyap dari ini dianggap "diam"</div>
              </div>

              <div className="form-group">
                <label className="form-label">Durasi Minimum Diam (detik)</label>
                <input type="number" step="0.1" className="form-control" value={minDuration} onChange={e => setMinDuration(e.target.value)} />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>Diam lebih pendek dari ini diabaikan</div>
              </div>

              {level === 'Level 2' && (
                <div className="form-group">
                  <label className="form-label">Padding Segmen (ms)</label>
                  <input type="number" className="form-control" value={padding} onChange={e => setPadding(e.target.value)} />
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>Buffer di awal/akhir tiap segmen bersuara</div>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleSave} className="btn btn-primary">
            <Save size={18} /> Simpan Konfigurasi
          </button>
        </div>
      </div>
    </div>
  );
}
