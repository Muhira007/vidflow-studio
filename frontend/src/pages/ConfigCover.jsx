import { Save, Upload } from 'lucide-react';

export default function ConfigCover() {
  const templates = [
    { id: 'tpl_1', name: 'Minimalist Bold', active: true },
    { id: 'tpl_2', name: 'News Style', active: false },
    { id: 'tpl_3', name: 'Gaming Focus', active: false },
    { id: 'tpl_4', name: 'Vlog Setup', active: false },
  ];

  return (
    <div style={{ maxWidth: '900px' }}>
      <h1 className="page-title">Auto Cover Configuration</h1>
      <p className="page-subtitle">Atur template dan layout untuk pembuatan thumbnail/cover video otomatis.</p>

      <div className="card glass-panel" style={{ marginBottom: '32px' }}>
        <h3 style={{ marginBottom: '20px' }}>Pilihan Template</h3>
        <div className="grid-cols-4">
          {templates.map(tpl => (
            <div 
              key={tpl.id}
              style={{
                aspectRatio: '16/9',
                background: tpl.active ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))' : 'rgba(0,0,0,0.3)',
                border: `2px solid ${tpl.active ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative',
                transition: 'var(--transition-fast)'
              }}
            >
              {tpl.active && (
                <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'var(--accent-primary)', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>
              )}
              <span style={{ fontWeight: 500 }}>{tpl.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-cols-2">
        <div className="card glass-panel">
          <h3 style={{ marginBottom: '20px' }}>Pengaturan Layout</h3>
          
          <div className="form-group">
            <label className="form-label">Posisi Judul (Teks Utama)</label>
            <select className="form-control">
              <option>Tengah Besar</option>
              <option>Kiri Atas</option>
              <option>Kiri Bawah</option>
              <option>Bawah (Lower Third)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Opacity Background Teks</label>
            <input type="range" min="0" max="100" defaultValue="40" style={{ width: '100%' }} />
          </div>
        </div>

        <div className="card glass-panel">
          <h3 style={{ marginBottom: '20px' }}>Branding</h3>
          
          <div className="form-group">
            <label className="form-label">Watermark / Logo (Opsional)</label>
            <div style={{ 
              border: '2px dashed var(--border-color)', 
              borderRadius: '12px', 
              padding: '32px', 
              textAlign: 'center',
              background: 'rgba(0,0,0,0.1)',
              cursor: 'pointer'
            }}>
              <Upload size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
              <div style={{ color: 'var(--text-secondary)' }}>Klik atau drop file logo disini (PNG transparan)</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary">
          <Save size={18} /> Simpan Konfigurasi
        </button>
      </div>
    </div>
  );
}
