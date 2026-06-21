import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function ConfigCaption() {
  const [fontName, setFontName] = useState('DejaVu Sans');
  const [fontSize, setFontSize] = useState(60);
  const [fontColor, setFontColor] = useState('#ffffff');
  const [outlineColor, setOutlineColor] = useState('#000000');
  const [position, setPosition] = useState(2); // 2: bottom, 10: center, 6: top
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/videos/settings/caption');
      if (res.data.caption_font) setFontName(res.data.caption_font);
      if (res.data.caption_size) setFontSize(res.data.caption_size);
      if (res.data.caption_color) setFontColor(res.data.caption_color);
      if (res.data.caption_outline) setOutlineColor(res.data.caption_outline);
      if (res.data.caption_position) setPosition(res.data.caption_position);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.post('/videos/settings/caption', { 
        caption_font: fontName,
        caption_size: fontSize,
        caption_color: fontColor,
        caption_outline: outlineColor,
        caption_position: position
      });
      toast.success('Pengaturan Caption berhasil disimpan!');
    } catch (err) {
      toast.error('Gagal menyimpan pengaturan: ' + err.message);
    }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div style={{ maxWidth: '800px' }}>
      <h1 className="page-title">Auto Caption Configuration</h1>
      <p className="page-subtitle">Atur gaya tampilan subtitle/caption otomatis untuk video Anda.</p>

      <div className="card glass-panel grid-cols-2">
        <div className="form-group">
          <label className="form-label">Jenis Font</label>
          <select className="form-control" value={fontName} onChange={e => setFontName(e.target.value)}>
            <option value="DejaVu Sans">DejaVu Sans</option>
            <option value="Ubuntu">Ubuntu</option>
            <option value="Ubuntu Sans">Ubuntu Sans</option>
            <option value="DejaVu Serif">DejaVu Serif</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Ukuran Font</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <input type="range" min="5" max="50" value={fontSize} onChange={e => setFontSize(parseInt(e.target.value))} style={{ flex: 1 }} />
            <span style={{ minWidth: '40px', textAlign: 'right', fontWeight: 'bold' }}>{fontSize}px</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Warna Teks</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input type="color" value={fontColor} onChange={e => setFontColor(e.target.value)} style={{ width: '40px', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }} />
            <span style={{ fontFamily: 'monospace' }}>{fontColor.toUpperCase()}</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Warna Outline (Stroke)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input type="color" value={outlineColor} onChange={e => setOutlineColor(e.target.value)} style={{ width: '40px', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }} />
            <span style={{ fontFamily: 'monospace' }}>{outlineColor.toUpperCase()}</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Posisi Caption</label>
          <select className="form-control" value={position} onChange={e => setPosition(parseInt(e.target.value))}>
            <option value={2}>Tengah Bawah</option>
            <option value={10}>Tengah (Center)</option>
            <option value={6}>Tengah Atas</option>
          </select>
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
