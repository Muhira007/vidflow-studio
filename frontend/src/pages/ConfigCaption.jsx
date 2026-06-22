import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function ConfigCaption() {
  const [fontName, setFontName] = useState('DejaVu Sans');
  const [fontSize, setFontSize] = useState(24);
  const [fontColor, setFontColor] = useState('#ffffff');
  const [outlineEnabled, setOutlineEnabled] = useState(true);
  const [outlineSize, setOutlineSize] = useState(2);
  const [outlineColor, setOutlineColor] = useState('#000000');
  const [position, setPosition] = useState(15); // Percentage 0 to 100
  const [socialMaxWords, setSocialMaxWords] = useState(40);
  const [socialHashtags, setSocialHashtags] = useState(5);
  const [socialTone, setSocialTone] = useState('Santai & Gaul (Gen-Z)');
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
      if (res.data.caption_outline_enabled !== undefined) setOutlineEnabled(res.data.caption_outline_enabled);
      if (res.data.caption_outline_size !== undefined) setOutlineSize(res.data.caption_outline_size);
      if (res.data.caption_outline) setOutlineColor(res.data.caption_outline);
      if (res.data.caption_position) setPosition(res.data.caption_position);
      if (res.data.caption_social_max_words) setSocialMaxWords(res.data.caption_social_max_words);
      if (res.data.caption_social_hashtags) setSocialHashtags(res.data.caption_social_hashtags);
      if (res.data.caption_social_tone) setSocialTone(res.data.caption_social_tone);
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
        caption_outline_enabled: outlineEnabled,
        caption_outline_size: outlineSize,
        caption_outline: outlineColor,
        caption_position: position,
        caption_social_max_words: parseInt(socialMaxWords),
        caption_social_hashtags: parseInt(socialHashtags),
        caption_social_tone: socialTone
      });
      toast.success('Pengaturan Caption & Sosial Media berhasil disimpan!');
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
          <label className="form-label">Aktifkan Outline (Stroke)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '40px' }}>
            <label className="switch">
              <input type="checkbox" checked={outlineEnabled} onChange={e => setOutlineEnabled(e.target.checked)} />
              <span className="slider"></span>
            </label>
            <span>{outlineEnabled ? 'Aktif' : 'Nonaktif'}</span>
          </div>
        </div>

        {outlineEnabled && (
          <>
            <div className="form-group">
              <label className="form-label">Warna Outline</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input type="color" value={outlineColor} onChange={e => setOutlineColor(e.target.value)} style={{ width: '40px', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }} />
                <span style={{ fontFamily: 'monospace' }}>{outlineColor.toUpperCase()}</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Ketebalan Outline</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <input type="range" min="1" max="10" value={outlineSize} onChange={e => setOutlineSize(parseInt(e.target.value))} style={{ flex: 1 }} />
                <span style={{ minWidth: '40px', textAlign: 'right', fontWeight: 'bold' }}>{outlineSize}px</span>
              </div>
            </div>
          </>
        )}

        <div className="form-group" style={{ gridColumn: outlineEnabled ? 'span 2' : 'auto' }}>
          <label className="form-label">Posisi Vertikal Caption</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Bawah</span>
            <input type="range" min="0" max="100" value={position} onChange={e => setPosition(parseInt(e.target.value))} style={{ flex: 1 }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Atas</span>
            <span style={{ minWidth: '45px', textAlign: 'right', fontWeight: 'bold' }}>{position}%</span>
          </div>
        </div>

        <div style={{ gridColumn: 'span 2', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--accent-primary)' }}>
          <h3 style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🤖 Caption Sosial Media (AI DeepSeek)
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Hasil transkrip video akan diproses ulang oleh AI untuk menjadi caption siap upload sosmed.
          </p>

          <div className="grid-cols-3">
            <div className="form-group">
              <label className="form-label">Maksimum Kata</label>
              <input type="number" min="10" max="200" className="form-control" value={socialMaxWords} onChange={e => setSocialMaxWords(e.target.value)} />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Caption utama (default: 40)</div>
            </div>
            <div className="form-group">
              <label className="form-label">Jumlah Hashtag</label>
              <input type="number" min="0" max="15" className="form-control" value={socialHashtags} onChange={e => setSocialHashtags(e.target.value)} />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>0 = tanpa hashtag (default: 5)</div>
            </div>
            <div className="form-group">
              <label className="form-label">Gaya Bahasa</label>
              <select className="form-control" value={socialTone} onChange={e => setSocialTone(e.target.value)}>
                <option value="Santai & Gaul (Gen-Z)">Santai & Gaul (Gen-Z)</option>
                <option value="Hard Selling (FOMO)">Hard Selling (FOMO)</option>
                <option value="Storytelling (Bercerita)">Storytelling (Bercerita)</option>
                <option value="Edukasi & Pakar">Edukasi & Pakar</option>
                <option value="Savage & Lucu">Savage & Lucu</option>
                <option value="ASMR / Calming">ASMR / Calming</option>
                <option value="Elegan & Mewah">Elegan & Mewah</option>
                <option value="Misteri (Bikin Penasaran)">Misteri (Bikin Penasaran)</option>
                <option value="Curhat / POV">Curhat / POV</option>
                <option value="Jujur & Brutal Review">Jujur & Brutal Review</option>
                <option value="Tantangan (Challenge)">Tantangan (Challenge)</option>
                <option value="Tips & Hacks">Tips & Hacks</option>
                <option value="Breaking News">Breaking News</option>
                <option value="Pantun / Rima">Pantun / Rima</option>
                <option value="Motivasi / Inspiring">Motivasi / Inspiring</option>
                <option value="Ngerap / Cepat">Ngerap / Cepat</option>
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
