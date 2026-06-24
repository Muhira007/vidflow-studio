import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function ConfigSilenceCut() {
  const [level, setLevel] = useState('Level 2');
  const [threshold, setThreshold] = useState(-30.0);
  const [minDuration, setMinDuration] = useState(0.5);
  const [padding, setPadding] = useState(150);
  const [vadThreshold, setVadThreshold] = useState(0.5);
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
        else if (data.silence_cut_level === 2) setLevel('Level 2');
        else if (data.silence_cut_level === 3) setLevel('Level 3 (VAD/AI)');
      }
      if (data.silence_threshold !== undefined) setThreshold(data.silence_threshold);
      if (data.min_silence_duration !== undefined) setMinDuration(data.min_silence_duration);
      if (data.silence_padding !== undefined) setPadding(data.silence_padding);
      if (data.vad_threshold !== undefined) setVadThreshold(data.vad_threshold);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    let numericLevel = 2;
    if (level === 'Nonaktif') numericLevel = 0;
    else if (level === 'Level 1') numericLevel = 1;
    else if (level === 'Level 2') numericLevel = 2;
    else if (level.startsWith('Level 3')) numericLevel = 3;

    try {
      await api.post('/videos/settings/silence', {
        silence_cut_level: numericLevel,
        silence_threshold: parseFloat(threshold),
        min_silence_duration: parseFloat(minDuration),
        silence_padding: parseInt(padding),
        vad_threshold: parseFloat(vadThreshold)
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
          <div className="grid-cols-4" style={{ marginTop: '12px' }}>
            {['Nonaktif', 'Level 1', 'Level 2', 'Level 3 (VAD/AI)'].map(opt => (
              <div
                key={opt}
                onClick={() => setLevel(opt)}
                style={{
                  padding: '16px 24px',
                  borderRadius: '12px',
                  border: `2px solid ${level === opt ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  background: level === opt ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontWeight: level === opt ? 600 : 400,
                  transition: 'var(--transition-fast)'
                }}
              >
                {opt.replace(' (VAD/AI)', '')}
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 600, display: 'block' }}>
                  {opt.includes('VAD') ? '🤖 VAD/AI' : ''}
                </span>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px', fontWeight: 400 }}>
                  {opt === 'Nonaktif' && 'Tidak ada pemotongan'}
                  {opt === 'Level 1' && 'Hanya potong awal & akhir video'}
                  {opt === 'Level 2' && 'Potong semua jeda diam (Amplitudo)'}
                  {opt.includes('VAD') && 'AI deteksi suara manusia vs noise'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {level.startsWith('Level 3') && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h3 style={{ marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border-light)' }}>
              🤖 Parameter VAD (Voice Activity Detection)
            </h3>
            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label">Speech Threshold (0-1)</label>
                <input type="number" step="0.05" min="0.1" max="0.9" className="form-control" value={vadThreshold} onChange={e => setVadThreshold(e.target.value)} />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Lebih tinggi = lebih strict (hanya suara jelas). Default: 0.5
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Padding (ms)</label>
                <input type="number" className="form-control" value={padding} onChange={e => setPadding(e.target.value)} />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>Buffer sebelum/sesudah segmen suara</div>
              </div>
            </div>
          </div>
        )}

        {level !== 'Nonaktif' && !level.startsWith('Level 3') && (
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
