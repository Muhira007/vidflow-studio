import { useState } from 'react';
import { Save } from 'lucide-react';

export default function ConfigCaption() {
  const [highlightWord, setHighlightWord] = useState(true);
  
  return (
    <div style={{ maxWidth: '800px' }}>
      <h1 className="page-title">Auto Caption Configuration</h1>
      <p className="page-subtitle">Atur gaya tampilan subtitle/caption otomatis untuk video Anda.</p>

      <div className="card glass-panel grid-cols-2">
        <div className="form-group">
          <label className="form-label">Jenis Font</label>
          <select className="form-control">
            <option>Montserrat</option>
            <option>Inter</option>
            <option>Bebas Neue</option>
            <option>Arial Black</option>
            <option>Comic Sans MS</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Ukuran Font</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <input type="range" min="12" max="72" defaultValue="32" style={{ flex: 1 }} />
            <span style={{ minWidth: '40px', textAlign: 'right', fontWeight: 'bold' }}>32px</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Warna Teks</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input type="color" defaultValue="#ffffff" style={{ width: '40px', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }} />
            <span style={{ fontFamily: 'monospace' }}>#FFFFFF</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Warna Outline (Stroke)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input type="color" defaultValue="#000000" style={{ width: '40px', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }} />
            <span style={{ fontFamily: 'monospace' }}>#000000</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Posisi Caption</label>
          <select className="form-control">
            <option>Tengah Bawah</option>
            <option>Tengah Atas</option>
            <option>Tengah (Center)</option>
            <option>Kustom (Offset Y)</option>
          </select>
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px' }}>
          <div>
            <label className="form-label" style={{ marginBottom: '4px' }}>Highlight Kata Aktif (Karaoke Style)</label>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mewarnai kata yang sedang diucapkan</div>
          </div>
          <label className="switch">
            <input type="checkbox" checked={highlightWord} onChange={() => setHighlightWord(!highlightWord)} />
            <span className="slider"></span>
          </label>
        </div>

        {highlightWord && (
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Warna Highlight</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input type="color" defaultValue="#fbbf24" style={{ width: '40px', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }} />
              <span style={{ fontFamily: 'monospace' }}>#FBBF24</span>
            </div>
          </div>
        )}

        <div style={{ gridColumn: 'span 2', marginTop: '16px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: '24px' }}>
          <button className="btn btn-primary">
            <Save size={18} /> Simpan Konfigurasi
          </button>
        </div>
      </div>
    </div>
  );
}
