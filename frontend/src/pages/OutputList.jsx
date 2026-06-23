import { useState, useEffect, useMemo } from 'react';
import { Download, Copy, Trash2, Check, X, AlertTriangle, Image as ImageIcon, Film, Filter, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

const API_BASE = api.defaults.baseURL || 'http://localhost:8000/api';
const PER_PAGE = 20;

export default function OutputList() {
  const [outputs, setOutputs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterUploaded, setFilterUploaded] = useState('all'); // 'all' | 'yes' | 'no'
  const [currentPage, setCurrentPage] = useState(1);

  // Video Player Modal
  const [showPlayer, setShowPlayer] = useState(false);
  const [playerVideoUrl, setPlayerVideoUrl] = useState('');
  const [playerVideoName, setPlayerVideoName] = useState('');

  const fetchOutputs = async () => {
    try {
      const res = await api.get('/outputs');
      setOutputs(res.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching outputs:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutputs();
    const interval = setInterval(fetchOutputs, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyCaption = async (videoId) => {
    try {
      const res = await api.get(`/outputs/${videoId}/caption`);
      const text = res.data?.caption_text;
      if (text) {
        await navigator.clipboard.writeText(text);
        toast.success('Transkrip berhasil disalin ke clipboard!');
      } else {
        toast.error('Tidak ada transkrip tersedia.');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Transkrip tidak tersedia untuk video ini.');
      } else {
        toast.error('Gagal mengambil transkrip.');
      }
    }
  };

  const handleCopySocialCaption = async (videoId) => {
    const loadingToast = toast.loading('Mengenerate caption AI...');
    try {
      const res = await api.get(`/outputs/${videoId}/social-caption`);
      const text = res.data?.caption_social;
      toast.dismiss(loadingToast);
      if (text) {
        await navigator.clipboard.writeText(text);
        toast.success('Caption AI berhasil disalin! Siap upload ke sosmed 🎉');
        // Refresh daftar untuk update status has_social_caption
        fetchOutputs();
      } else {
        toast.error('Caption AI kosong.');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      if (error.response?.status === 503) {
        toast.error('Gagal generate caption AI. Pastikan DEEPSEEK_API_KEY sudah diisi di Global Settings.');
      } else if (error.response?.status === 404) {
        toast.error('Transkrip belum tersedia. Proses video dulu.');
      } else {
        toast.error('Gagal: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleDownload = (videoId) => {
    const url = `${API_BASE}/outputs/${videoId}/download`;
    // Buka di tab baru untuk trigger download
    window.open(url, '_blank');
  };

  const handleToggleUploaded = async (videoId) => {
    try {
      const res = await api.patch(`/outputs/${videoId}/toggle-uploaded`);
      const newStatus = res.data?.uploaded_to_social;
      toast.success(newStatus ? 'Ditandai: sudah diupload ke sosmed ✓' : 'Ditandai: belum diupload');
      fetchOutputs();
    } catch (error) {
      toast.error('Gagal update status upload.');
    }
  };

  const executeDelete = async (videoId) => {
    setDeleteTarget(null);
    try {
      await api.delete(`/outputs/${videoId}`);
      toast.success(`Video ${videoId} berhasil dihapus!`);
      fetchOutputs();
    } catch (error) {
      toast.error('Gagal menghapus: ' + (error.response?.data?.detail || error.message));
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Filter & Pagination (client-side)
  const filteredOutputs = useMemo(() => {
    if (filterUploaded === 'all') return outputs;
    const target = filterUploaded === 'yes';
    return outputs.filter(o => o.uploaded_to_social === target);
  }, [outputs, filterUploaded]);

  const totalPages = Math.max(1, Math.ceil(filteredOutputs.length / PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedOutputs = filteredOutputs.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  // Reset page when filter changes
  const handleFilterChange = (value) => {
    setFilterUploaded(value);
    setCurrentPage(1);
  };

  // Video player — pakai fs/stream agar video di-play inline (bukan download)
  const openVideoPlayer = (videoId, videoFileName) => {
    const url = `${API_BASE}/fs/stream/${videoId}/${encodeURIComponent(videoFileName)}`;
    setPlayerVideoUrl(url);
    setPlayerVideoName(videoId);
    setShowPlayer(true);
  };

  const closeVideoPlayer = () => {
    setShowPlayer(false);
    setPlayerVideoUrl('');
    setPlayerVideoName('');
  };

  // Close player on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showPlayer) closeVideoPlayer();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPlayer]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading output videos...</div>;

  return (
    <div>
      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div className="card glass-panel" style={{ maxWidth: '400px', width: '100%', animation: 'fadeIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: 'var(--danger)' }}>
              <AlertTriangle size={28} />
              <h3 style={{ margin: 0 }}>Konfirmasi Penghapusan</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
              Yakin ingin menghapus <strong style={{ color: 'var(--danger)' }}>HARD DELETE</strong> video <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget}</strong>?<br /><br />
              Semua file di folder <b>Source</b>, <b>Tmp</b>, dan <b>Output</b> akan dihapus. Tindakan ini tidak dapat dibatalkan!
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Batal</button>
              <button className="btn btn-primary" style={{ background: 'var(--danger)', border: 'none', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }} onClick={() => executeDelete(deleteTarget)}>
                <Trash2 size={16} /> Ya, Hapus!
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Hasil Render</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Video yang sudah selesai diproses dan siap diunduh.
            {filteredOutputs.length !== outputs.length && (
              <span style={{ color: 'var(--accent-primary)' }}> — Difilter: {filteredOutputs.length} dari {outputs.length} video</span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <select
              className="form-control"
              style={{ width: '180px' }}
              value={filterUploaded}
              onChange={(e) => handleFilterChange(e.target.value)}
            >
              <option value="all">Upload Sosmed: Semua</option>
              <option value="yes">Upload Sosmed: Sudah</option>
              <option value="no">Upload Sosmed: Belum</option>
            </select>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
            {outputs.length} video
          </span>
        </div>
      </div>

      <div className="card glass-panel">
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '16px 12px', fontWeight: 500, width: '80px' }}>Preview</th>
                <th style={{ padding: '16px 12px', fontWeight: 500 }}>ID Video</th>
                <th style={{ padding: '16px 12px', fontWeight: 500, textAlign: 'center' }}>Caption</th>
                <th style={{ padding: '16px 12px', fontWeight: 500, textAlign: 'center' }}>Unduh</th>
                <th style={{ padding: '16px 12px', fontWeight: 500, textAlign: 'center' }}>Upload Sosmed</th>
                <th style={{ padding: '16px 12px', fontWeight: 500, textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOutputs.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <Film size={48} style={{ opacity: 0.3, margin: '0 auto 16px', display: 'block' }} />
                  {outputs.length === 0 ? (
                    <>
                      <p>Belum ada video yang selesai dirender.</p>
                      <p style={{ fontSize: '0.85rem' }}>Proses video terlebih dahulu dari menu <strong>Daftar Video</strong>.</p>
                    </>
                  ) : (
                    <p>Tidak ada video yang cocok dengan filter "<strong>{filterUploaded === 'yes' ? 'Sudah' : 'Belum'}</strong>".</p>
                  )}
                </td></tr>
              ) : paginatedOutputs.map((out) => (
                <tr key={out.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s' }} className="hover-bg-light">
                  {/* Preview / Cover + Play Button */}
                  <td style={{ padding: '10px 12px' }}>
                    <div
                      style={{
                        position: 'relative',
                        width: '64px', height: '36px',
                        cursor: out.video_file ? 'pointer' : 'default',
                        borderRadius: '4px', overflow: 'hidden',
                        background: 'var(--bg-tertiary)',
                        display: 'inline-block'
                      }}
                      onClick={() => out.video_file && openVideoPlayer(out.group || out.id, out.video_file.name)}
                      title={out.video_file ? 'Klik untuk preview video' : 'Tidak ada file video'}
                    >
                      {out.cover_file ? (
                        <img
                          src={`${API_BASE}/fs/stream/${encodeURIComponent(out.group || out.id)}/${encodeURIComponent(out.cover_file.name)}`}
                          alt={out.id}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ImageIcon size={20} style={{ opacity: 0.3 }} />
                        </div>
                      )}
                      {/* Play overlay */}
                      {out.video_file && (
                        <div style={{
                          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                          background: 'rgba(0,0,0,0.4)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          opacity: 0.7, transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                        >
                          <Play size={14} color="#fff" fill="#fff" />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* ID Video + Group */}
                  <td style={{ padding: '16px 12px', fontWeight: 600, color: 'var(--accent-primary)' }}>
                    {out.id}
                    {out.group && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 400, opacity: 0.7 }}>
                        📁 {out.group}
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                      {out.resolution} · {out.video_file ? formatSize(out.video_file.size_bytes) : '-'}
                    </div>
                  </td>

                  {/* Caption - AI Social */}
                  <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                    {out.has_caption ? (
                      <button
                        onClick={() => handleCopySocialCaption(out.full_id)}
                        className="btn btn-primary"
                        style={{
                          padding: '5px 12px', fontSize: '0.82rem',
                          background: out.has_social_caption
                            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                            : 'linear-gradient(135deg, #f59e0b, #ef4444)',
                          border: 'none', fontWeight: 600
                        }}
                        title={out.has_social_caption ? 'Caption siap sosmed (AI)' : 'Generate caption AI dari transkrip'}
                      >
                        {out.has_social_caption ? (
                          <><Copy size={12} /> ✨ Caption AI</>
                        ) : (
                          <><Copy size={12} /> 🔄 Generate AI</>
                        )}
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>N/A</span>
                    )}
                  </td>

                  {/* Download */}
                  <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleDownload(out.full_id)}
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.85rem', background: 'var(--success)', border: 'none' }}
                      disabled={!out.video_file}
                    >
                      <Download size={14} /> Unduh
                    </button>
                  </td>

                  {/* Uploaded to Sosmed Toggle */}
                  <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleToggleUploaded(out.full_id)}
                      className="btn"
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.85rem',
                        background: out.uploaded_to_social ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${out.uploaded_to_social ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                        color: out.uploaded_to_social ? 'var(--success)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s',
                      }}
                      title={out.uploaded_to_social ? 'Klik untuk batalkan' : 'Klik untuk tandai sudah diupload'}
                    >
                      {out.uploaded_to_social ? <Check size={14} /> : <X size={14} />}
                      {out.uploaded_to_social ? 'Sudah' : 'Belum'}
                    </button>
                    {out.uploaded_at && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {new Date(out.uploaded_at).toLocaleDateString()}
                      </div>
                    )}
                  </td>

                  {/* Delete */}
                  <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                    <button
                      onClick={() => setDeleteTarget(out.full_id)}
                      className="btn btn-danger"
                      style={{ padding: '6px 10px', backgroundColor: 'var(--danger)', color: 'white', border: 'none' }}
                      title="Hapus video"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
            padding: '16px', borderTop: '1px solid var(--border-color)'
          }}>
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              style={{ padding: '6px 10px', opacity: safePage <= 1 ? 0.3 : 1 }}
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={page === safePage ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{
                  padding: '6px 12px',
                  minWidth: '36px',
                  fontSize: '0.85rem',
                  fontWeight: page === safePage ? 600 : 400,
                }}
              >
                {page}
              </button>
            ))}

            <button
              className="btn btn-secondary"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              style={{ padding: '6px 10px', opacity: safePage >= totalPages ? 0.3 : 1 }}
            >
              <ChevronRight size={16} />
            </button>

            <span style={{ marginLeft: '12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Halaman {safePage} dari {totalPages} ({filteredOutputs.length} video)
            </span>
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      {showPlayer && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={closeVideoPlayer}
        >
          <div
            className="card glass-panel"
            style={{
              width: '90vw', maxWidth: '900px',
              display: 'flex', flexDirection: 'column',
              maxHeight: '90vh'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderBottom: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Play size={20} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {playerVideoName}
                </span>
              </div>
              <button
                onClick={closeVideoPlayer}
                style={{
                  background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px',
                  padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center'
                }}
              >
                <X size={18} color="var(--text-secondary)" />
              </button>
            </div>

            {/* Video */}
            <div style={{ padding: '8px', background: '#000', borderRadius: '0 0 12px 12px' }}>
              <video
                controls
                autoPlay
                style={{ width: '100%', maxHeight: '70vh', borderRadius: '4px', display: 'block' }}
                src={playerVideoUrl}
                onError={() => {
                  toast.error('Gagal memutar video. Format mungkin tidak didukung browser.');
                }}
              >
                Browser Anda tidak mendukung pemutaran video HTML5.
              </video>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
