import { useState, useEffect } from 'react';
import { Save, Image as ImageIcon, Type, Zap, Loader2 } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

const allTemplates = [
  { id: 'tpl_new_1', name: 'Kuning-Putih', category: 'Dual Color' },
  { id: 'tpl_new_2', name: 'Hijau-Putih', category: 'Dual Color' },
  { id: 'tpl_new_3', name: 'Merah-Putih', category: 'Dual Color' },
  { id: 'none', name: 'Blank Cover', category: 'Polos' },
];

const titleStyles = [
  'Santai & Gaul (Gen-Z)',
  'Hard Selling (FOMO)',
  'Storytelling (Bercerita)',
  'Edukasi & Pakar',
  'Savage & Lucu',
  'ASMR / Calming',
  'Elegan & Mewah',
  'Misteri (Bikin Penasaran)',
  'Curhat / POV',
  'Jujur & Brutal Review',
  'Tantangan (Challenge)',
  'Tips & Hacks',
  'Breaking News',
  'Pantun / Rima',
  'Motivasi / Inspiring',
  'Ngerap / Cepat',
];

export default function ConfigCover() {
  const [activeTemplate, setActiveTemplate] = useState('tpl_new_1');
  const [bgOpacity, setBgOpacity] = useState(40);
  const [coverTitleStyle, setCoverTitleStyle] = useState('Santai & Gaul (Gen-Z)');
  const [coverTitleMaxWords, setCoverTitleMaxWords] = useState(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/videos/settings/cover');
      const data = res.data;
      if (data.cover_template) setActiveTemplate(data.cover_template);
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
    setSaving(true);
    try {
      await api.post('/videos/settings/cover', {
        cover_template: activeTemplate,
        cover_bg_opacity: parseInt(bgOpacity),
        cover_title_style: coverTitleStyle,
        cover_title_max_words: parseInt(coverTitleMaxWords),
      });
      toast.success('Pengaturan Cover berhasil disimpan!');
    } catch (err) {
      toast.error('Gagal menyimpan pengaturan: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px', color: 'var(--text-muted)' }}>
        <Loader2 size={24} className="spinner" style={{ color: 'var(--accent-primary)' }} />
        <span>Memuat pengaturan cover...</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Auto Cover Configuration</h1>
          <p className="page-subtitle">Pilih template cover & pengaturan AI untuk generate cover otomatis.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ padding: '10px 22px', fontWeight: 600 }}>
          {saving ? <><Loader2 size={16} className="spinner" /> Menyimpan...</> : <><Save size={16} /> Simpan Konfigurasi</>}
        </button>
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.25rem', alignItems: 'start' }}>

        {/* ── LEFT: Template Selection ── */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
            <ImageIcon size={20} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ margin: 0 }}>Template Cover</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {allTemplates.length} template · klik untuk memilih
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '14px',
          }}>
            {allTemplates.map(tpl => {
              const isActive = tpl.id === activeTemplate;
              return (
                <div
                  key={tpl.id}
                  onClick={() => setActiveTemplate(tpl.id)}
                  className="hover-lift"
                  style={{
                    background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.03)',
                    border: `2px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                    overflow: 'hidden',
                  }}
                >
                  {/* Active checkmark */}
                  {isActive && (
                    <div style={{
                      position: 'absolute', top: '8px', right: '8px', zIndex: 10,
                      background: 'var(--accent-primary)', color: '#fff',
                      width: '24px', height: '24px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem', boxShadow: '0 2px 8px rgba(59,130,246,0.4)',
                    }}>✓</div>
                  )}

                  {/* Preview image */}
                  <div style={{
                    aspectRatio: '9/16',
                    background: 'var(--bg-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                    <img
                      src={`/covers/${tpl.id}.png`}
                      alt={tpl.name}
                      loading="lazy"
                      style={{
                        width: '100%', height: '100%',
                        objectFit: 'cover',
                        opacity: isActive ? 1 : 0.6,
                        transition: 'opacity 0.2s',
                      }}
                    />
                  </div>

                  {/* Label */}
                  <div style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{
                      fontSize: '0.65rem', fontWeight: 700,
                      color: 'var(--accent-primary)', textTransform: 'uppercase',
                      letterSpacing: '0.5px', marginBottom: '2px',
                    }}>{tpl.category}</div>
                    <div style={{
                      fontWeight: 600, fontSize: '0.85rem',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}>{tpl.name}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: Settings ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Opacity Slider */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
              <Type size={20} style={{ color: 'var(--accent-primary)' }} />
              <h3 style={{ margin: 0 }}>Opacity Background</h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="range"
                min="0"
                max="100"
                value={bgOpacity}
                onChange={(e) => setBgOpacity(e.target.value)}
                style={{ flex: 1, accentColor: 'var(--accent-primary)' }}
              />
              <span style={{
                background: 'var(--bg-primary)', padding: '6px 14px',
                borderRadius: '20px', fontWeight: 700, fontSize: '0.9rem',
                minWidth: '55px', textAlign: 'center',
              }}>{bgOpacity}%</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              Transparansi box di belakang teks judul cover. 0 = transparan penuh.
            </div>
          </div>

          {/* AI Title Settings */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
              <Zap size={20} style={{ color: '#f59e0b' }} />
              <h3 style={{ margin: 0 }}>AI Judul (DeepSeek)</h3>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Gaya Bahasa</label>
              <select
                className="form-control"
                value={coverTitleStyle}
                onChange={e => setCoverTitleStyle(e.target.value)}
              >
                {titleStyles.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Gaya penulisan judul cover oleh AI
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Maksimum Kata: <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{coverTitleMaxWords}</span>
              </label>
              <input
                type="range"
                min="3"
                max="12"
                value={coverTitleMaxWords}
                onChange={(e) => setCoverTitleMaxWords(e.target.value)}
                style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <span>3 kata</span>
                <span>12 kata</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
