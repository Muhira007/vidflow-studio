import { useState, useEffect } from 'react';
import { Save, Upload } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function ConfigCover() {
  const [activeTemplate, setActiveTemplate] = useState('tpl_1');
  const [titlePosition, setTitlePosition] = useState('Tengah Besar');
  const [bgOpacity, setBgOpacity] = useState(40);
  const [coverTitleStyle, setCoverTitleStyle] = useState('Santai & Gaul (Gen-Z)');
  const [coverTitleMaxWords, setCoverTitleMaxWords] = useState(5);
  const [loading, setLoading] = useState(true);

  const templates = [
    { id: 'tpl_1', name: 'Minimalist Bold', desc: 'Teks besar di tengah dengan shadow' },
    { id: 'tpl_2', name: 'News Style', desc: 'Lower third + garis merah' },
    { id: 'tpl_3', name: 'Gaming Focus', desc: 'Teks kuning di kotak ungu' },
    { id: 'tpl_4', name: 'Vlog Setup', desc: 'Border putih + rounded box' },
  ];

  const titlePositions = [
    'Tengah Besar',
    'Kiri Atas',
    'Kiri Bawah',
    'Bawah (Lower Third)',
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/videos/settings/cover');
      const data = res.data;
      if (data.cover_template) setActiveTemplate(data.cover_template);
      if (data.cover_title_position) setTitlePosition(data.cover_title_position);
      if (data.cover_bg_opacity !== undefined) setBgOpacity(data.cover_bg_opacity);
      if (data.cover_title_style) setCoverTitleStyle(data.cover_title_style);
      if (data.cover_title_max_words) setCoverTitleMaxWords(data.cover_title_max_words);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.post('/videos/settings/cover', {
        cover_template: activeTemplate,
        cover_title_position: titlePosition,
        cover_bg_opacity: parseInt(bgOpacity),
        cover_title_style: coverTitleStyle,
        cover_title_max_words: parseInt(coverTitleMaxWords)
      });
      toast.success('Pengaturan Cover berhasil disimpan!');
    } catch (err) {
      toast.error('Gagal menyimpan pengaturan: ' + err.message);
    }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div style={{ maxWidth: '900px' }}>
      <h1 className="page-title">Auto Cover Configuration</h1>
      <p className="page-subtitle">Atur template dan layout untuk pembuatan thumbnail/cover video otomatis.</p>

      {/* Template Selection */}
      <div className="card glass-panel" style={{ marginBottom: '32px' }}>
        <h3 style={{ marginBottom: '20px' }}>Pilihan Template</h3>
        <div className="grid-cols-4">
          {templates.map(tpl => {
            const isActive = tpl.id === activeTemplate;
            return (
              <div
                key={tpl.id}
                onClick={() => setActiveTemplate(tpl.id)}
                style={{
                  aspectRatio: '16/9',
                  background: isActive ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))' : 'rgba(0,0,0,0.3)',
                  border: `2px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'var(--transition-fast)',
                  textAlign: 'center',
                  padding: '12px'
                }}
              >
                {isActive && (
                  <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'var(--accent-primary)', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>
                )}
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{tpl.name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>{tpl.desc}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid-cols-2">
        {/* Layout Settings */}
        <div className="card glass-panel">
          <h3 style={{ marginBottom: '20px' }}>Pengaturan Layout</h3>

          <div className="form-group">
            <label className="form-label">Posisi Judul (Teks Utama)</label>
            <select
              className="form-control"
              value={titlePosition}
              onChange={(e) => setTitlePosition(e.target.value)}
            >
              {titlePositions.map(pos => (
                <option key={pos}>{pos}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Opacity Background Teks ({bgOpacity}%)</label>
            <input
              type="range"
              min="0"
              max="100"
              value={bgOpacity}
              onChange={(e) => setBgOpacity(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">🤖 AI Generate Judul (DeepSeek)</label>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Judul cover akan digenerate otomatis dari transkrip video oleh AI
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Gaya Bahasa Judul</label>
            <select className="form-control" value={coverTitleStyle} onChange={e => setCoverTitleStyle(e.target.value)}>
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

          <div className="form-group">
            <label className="form-label">Maksimum Kata Judul</label>
            <input type="number" min="2" max="10" className="form-control" value={coverTitleMaxWords} onChange={e => setCoverTitleMaxWords(e.target.value)} />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Judul pendek agar muat di cover (default: 5 kata)
            </div>
          </div>
        </div>

        {/* Branding */}
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
              opacity: 0.5
            }}>
              <Upload size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
              <div style={{ color: 'var(--text-secondary)' }}>Coming soon — fitur upload logo</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Akan tersedia di update berikutnya</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleSave} className="btn btn-primary">
          <Save size={18} /> Simpan Konfigurasi
        </button>
      </div>
    </div>
  );
}
