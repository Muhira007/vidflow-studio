import { useState } from 'react';
import { Save } from 'lucide-react';

export default function ConfigSilenceCut() {
  const [level, setLevel] = useState('Level 2');
  
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
                <input type="number" className="form-control" defaultValue="-30" />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>Lebih senyap dari ini dianggap "diam"</div>
              </div>

              <div className="form-group">
                <label className="form-label">Durasi Minimum Diam (detik)</label>
                <input type="number" step="0.1" className="form-control" defaultValue="0.3" />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>Diam lebih pendek dari ini diabaikan</div>
              </div>

              {level === 'Level 2' && (
                <div className="form-group">
                  <label className="form-label">Padding Segmen (ms)</label>
                  <input type="number" className="form-control" defaultValue="150" />
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>Buffer di awal/akhir tiap segmen bersuara</div>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary">
            <Save size={18} /> Simpan Konfigurasi
          </button>
        </div>
      </div>
    </div>
  );
}
