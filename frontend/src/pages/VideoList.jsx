import { useState, useEffect, useMemo } from 'react';
import { Filter, Play, RotateCcw, MoreHorizontal, Trash2, FolderSync, AlertTriangle, CheckSquare, Square, Zap, StopCircle, Settings, FileText, Hash, Clock } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function VideoList() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [videoToDelete, setVideoToDelete] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [processingSelected, setProcessingSelected] = useState(false);
  const [detailVideo, setDetailVideo] = useState(null); // { id, data, loading }
  const [actionMenu, setActionMenu] = useState(null);
  const [idPopup, setIdPopup] = useState(null);
  const [timePopup, setTimePopup] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleBgClick = () => {
      setActionMenu(null);
      setIdPopup(null);
      setTimePopup(null);
    };
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    
    window.addEventListener('click', handleBgClick);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('click', handleBgClick);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleTimeClick = (e, createdAt) => {
    e.stopPropagation();
    if (!createdAt) return;
    const dateObj = new Date(createdAt);
    const rect = e.currentTarget.getBoundingClientRect();
    let x = rect.left - 80;
    if (x < 10) x = 10;
    setTimePopup({
      x,
      y: rect.top + 32,
      datetime: dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });
    setActionMenu(null);
    setIdPopup(null);
  };

  const handleIdClick = (e, videoId) => {
    e.stopPropagation();
    if (!videoId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    let x = rect.left;
    if (x < 10) x = 10;
    setIdPopup({
      x,
      y: rect.top + 32,
      videoId
    });
    setActionMenu(null);
    setTimePopup(null);
  };

  const fetchVideos = async () => {
    try {
      const response = await api.get('/videos/');
      setVideos(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching videos:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
    const interval = setInterval(fetchVideos, 5000);
    return () => clearInterval(interval);
  }, []);

  // Videos that can be processed (PENDING or FAILED)
  const processableIds = useMemo(() => {
    return new Set(
      videos
        .filter(v => v.status === 'PENDING' || v.status === 'FAILED' || v.status === 'pending' || v.status === 'failed')
        .map(v => v.id)
    );
  }, [videos]);

  const isAllSelected = processableIds.size > 0 && [...processableIds].every(id => selectedIds.has(id));

  const toggleSelect = (videoId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(processableIds));
    }
  };

  const handleProcess = async (videoId) => {
    try {
      await api.post(`/videos/${videoId}/process`);
      toast.success('Proses dimulai untuk video: ' + videoId);
      fetchVideos();
    } catch (error) {
      toast.error('Gagal memulai proses: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleCancel = async (videoId) => {
    try {
      await api.post(`/videos/${videoId}/cancel`);
      toast.success('Proses dibatalkan: ' + videoId);
      fetchVideos();
    } catch (error) {
      toast.error('Gagal membatalkan: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleRestore = async (videoId) => {
    try {
      await api.post(`/videos/${videoId}/restore`);
      toast.success('Video dikembalikan ke PENDING');
      fetchVideos();
    } catch (error) {
      toast.error('Gagal restore: ' + (error.response?.data?.detail || error.message));
    }
  };

  const openDetail = async (videoId) => {
    setDetailVideo({ id: videoId, data: null, loading: true });
    try {
      const res = await api.get(`/videos/${videoId}`);
      setDetailVideo({ id: videoId, data: res.data, loading: false });
    } catch (err) {
      toast.error('Gagal memuat detail');
      setDetailVideo(null);
    }
  };

  const handleProcessSelected = async () => {
    if (selectedIds.size === 0) return;
    setProcessingSelected(true);
    const ids = [...selectedIds];
    setSelectedIds(new Set());

    let success = 0;
    let waiting = 0;
    let failed = 0;
    const loadingToast = toast.loading(`Mengantre ${ids.length} video... (0/${ids.length})`);

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      try {
        const res = await api.post(`/videos/${id}/process`);
        if (res.data?.status === 'waiting') {
          waiting++;
        } else {
          success++;
        }
      } catch (err) {
        failed++;
        console.error(`Gagal memproses ${id}:`, err);
      }
      toast.loading(`Mengantre ${ids.length} video... (${i + 1}/${ids.length})`, { id: loadingToast });

      // Jeda 800ms antar request
      if (i < ids.length - 1) {
        await new Promise(r => setTimeout(r, 800));
      }
    }

    const totalQueued = success + waiting;
    if (failed === 0) {
      const msg = waiting > 0
        ? `${success} diproses, ${waiting} masuk antrian (WAITING)`
        : `${totalQueued} video masuk antrian render!`;
      toast.success(msg, { id: loadingToast });
    } else {
      toast.error(`${totalQueued} berhasil, ${failed} gagal`, { id: loadingToast });
    }
    setProcessingSelected(false);
    fetchVideos();
  };

  const handleSync = async () => {
    try {
      const res = await api.post('/videos/sync');
      toast.success(`Sinkronisasi berhasil! ${res.data.added} video baru ditambahkan ke database.`);
      fetchVideos();
    } catch (error) {
      let errMsg = 'Gagal sinkronisasi';
      // HTTP error with response body
      if (error.response?.data?.detail) {
        errMsg += ': ' + error.response.data.detail;
      } else if (error.response?.status) {
        errMsg += `: Server error (${error.response.status})`;
      } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        errMsg += ': Tidak dapat terhubung ke server. Pastikan backend berjalan.';
      } else {
        errMsg += ': ' + error.message;
      }
      toast.error(errMsg);
    }
  };

  const executeDelete = async (videoId) => {
    setVideoToDelete(null); // Close modal immediately
    try {
      await api.delete(`/videos/${videoId}`);
      toast.success('Video berhasil dihapus!');
      fetchVideos();
    } catch (error) {
      toast.error('Gagal menghapus video: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading videos...</div>;

  return (
    <div>
      {/* DELETE CONFIRMATION MODAL */}
      {videoToDelete && (
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
              Yakin ingin menghapus secara <strong style={{color: 'var(--danger)'}}>HARD DELETE</strong> video <strong style={{color: 'var(--text-primary)'}}>{videoToDelete}</strong>? <br/><br/>
              Tindakan ini akan menghapus data dari <b>Database</b> sekaligus melenyapkan semua *file* dari folder <b>Source</b>. Aksi ini tidak dapat dibatalkan!
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setVideoToDelete(null)}>
                Batal
              </button>
              <button className="btn btn-primary" style={{ background: 'var(--danger)', border: 'none', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }} onClick={() => executeDelete(videoToDelete)}>
                <Trash2 size={16} /> Ya, Hapus!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIDEO DETAIL MODAL */}
      {detailVideo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div className="card glass-panel" style={{ maxWidth: '560px', width: '100%', maxHeight: '80vh', overflowY: 'auto', animation: 'fadeIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Detail Video</h3>
              <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => setDetailVideo(null)}>✕</button>
            </div>

            {detailVideo.loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="spinner" />
                <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>Memuat detail...</p>
              </div>
            ) : detailVideo.data ? (
              <>
                {/* Info utama */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  {[
                    ['ID', detailVideo.data.id],
                    ['Status', detailVideo.data.status?.toUpperCase()],
                    ['Resolusi', detailVideo.data.resolution],
                    ['Silence Cut', `Level ${detailVideo.data.silence_cut_level}`],
                    ['Font Caption', detailVideo.data.caption_font],
                    ['Dibuat', new Date(detailVideo.data.created_at).toLocaleString('id-ID')],
                  ].map(([label, value]) => (
                    <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{value ?? '-'}</div>
                    </div>
                  ))}
                </div>

                {/* Job Logs */}
                {detailVideo.data.jobs && detailVideo.data.jobs.length > 0 && (
                  <>
                    <h4 style={{ marginBottom: '12px', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Riwayat Proses</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {detailVideo.data.jobs.map((job, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '8px 12px', borderRadius: '8px',
                          background: 'rgba(255,255,255,0.04)',
                          borderLeft: `3px solid ${
                            job.status === 'success' ? 'var(--success)' :
                            job.status === 'running' ? 'var(--warning)' : 'var(--danger)'
                          }`
                        }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem', minWidth: '80px' }}>{job.step}</span>
                          <span className={`badge badge-${
                            job.status === 'success' ? 'success' : job.status === 'running' ? 'warning' : 'danger'
                          }`} style={{ fontSize: '0.7rem' }}>{job.status}</span>
                          {job.message && (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flex: 1, textAlign: 'right' }}>{job.message.slice(0, 60)}</span>
                          )}
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {new Date(job.created_at).toLocaleTimeString('id-ID')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Data tidak tersedia</p>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Daftar Video</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Kelola dan pantau semua video dalam antrian Anda.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {selectedIds.size > 0 && (
            <button
              onClick={handleProcessSelected}
              disabled={processingSelected}
              className="btn btn-primary"
              style={{
                background: 'var(--accent-gradient)',
                boxShadow: '0 4px 16px rgba(139, 92, 246, 0.35)',
                fontWeight: 600,
              }}
            >
              <Zap size={18} /> Render {selectedIds.size} Video
            </button>
          )}
          <button onClick={handleSync} className="btn btn-primary">
            <FolderSync size={18} /> Sync Folder
          </button>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <select className="form-control" style={{ width: '160px' }}>
              <option>Semua Status</option>
              <option>Pending</option>
              <option>Processing</option>
              <option>Completed</option>
              <option>Failed</option>
            </select>
          </div>
          <button className="btn btn-secondary">
            <Filter size={18} /> Filter
          </button>
        </div>
      </div>

      <div className="card glass-panel">
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '16px 8px', fontWeight: 500, width: '44px', textAlign: 'center' }}>
                  <span
                    onClick={toggleSelectAll}
                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', userSelect: 'none' }}
                    title={isAllSelected ? 'Batal pilih semua' : 'Pilih semua'}
                  >
                    {isAllSelected ? <CheckSquare size={18} color="var(--accent-primary)" /> : <Square size={18} />}
                  </span>
                </th>
                <th style={{ padding: '16px 12px', fontWeight: 500 }}>ID Video</th>
                <th style={{ padding: '16px 12px', fontWeight: 500 }}>Tanggal</th>
                <th style={{ padding: '16px 12px', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '16px 12px', fontWeight: 500, textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {videos.length === 0 ? (
                <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px'}}>Belum ada video terdaftar.</td></tr>
              ) : videos.map((vid, idx) => {
                const status = (vid.status || '').toUpperCase();
                let badgeType = 'warning';
                if (status === 'COMPLETED') badgeType = 'success';
                if (status === 'FAILED') badgeType = 'danger';
                if (status === 'CANCELLED') badgeType = 'warning';
                if (status === 'PENDING') badgeType = 'secondary';
                if (status === 'WAITING') badgeType = 'info';
                if (status === 'PROCESSING') badgeType = 'warning';

                const isProcessable = status === 'PENDING' || status === 'FAILED';
                const isSelected = selectedIds.has(vid.id);

                return (
                  <tr key={idx} style={{
                    borderBottom: '1px solid var(--border-light)',
                    backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
                    transition: 'background-color 0.2s',
                  }}>
                    <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                      {isProcessable ? (
                        <span
                          onClick={() => toggleSelect(vid.id)}
                          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', userSelect: 'none' }}
                          title={isSelected ? 'Batal pilih' : 'Pilih'}
                        >
                          {isSelected
                            ? <CheckSquare size={18} color="var(--accent-primary)" />
                            : <Square size={18} />
                          }
                        </span>
                      ) : (
                        <Square size={18} style={{ opacity: 0.25, cursor: 'not-allowed' }} />
                      )}
                    </td>
                    <td 
                      style={{ padding: '16px 12px', fontWeight: 600, color: 'var(--accent-primary)', cursor: isMobile ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
                      title={isMobile ? "Klik untuk lihat full ID" : ""}
                      onClick={(e) => { if (isMobile) handleIdClick(e, vid.id); }}
                    >
                      {isMobile ? (vid.id ? (vid.id.length > 5 ? '...' + vid.id.slice(-5) : vid.id) : '-') : (vid.id || '-')}
                    </td>
                    <td style={{ padding: '16px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {isMobile ? (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '6px', background: 'transparent', border: '1px solid var(--border-light)' }}
                          onClick={(e) => handleTimeClick(e, vid.created_at)}
                          title="Lihat Waktu"
                        >
                          <Clock size={16} />
                        </button>
                      ) : (
                        vid.created_at ? new Date(vid.created_at).toLocaleString('id-ID') : '-'
                      )}
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <span className={`badge badge-${badgeType}`}>{status}</span>
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        {isMobile ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setActionMenu({
                                id: vid.id,
                                status: status,
                                x: rect.right,
                                y: rect.bottom
                              });
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px' }}
                            title="Aksi"
                          >
                            <Settings size={16} />
                          </button>
                        ) : (
                          <>
                            {status === 'PROCESSING' && (
                              <button className="btn btn-secondary" style={{ padding: '6px 10px', color: 'var(--warning)' }} onClick={() => handleCancel(vid.id)} title="Batalkan">
                                <StopCircle size={16} />
                              </button>
                            )}
                            {(status === 'WAITING' || status === 'CANCELLED') && (
                              <button className="btn btn-secondary" style={{ padding: '6px 10px', color: 'var(--success)' }} onClick={() => handleRestore(vid.id)} title="Ke Pending">
                                <RotateCcw size={16} />
                              </button>
                            )}
                            {status === 'FAILED' && (
                              <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => handleProcess(vid.id)} title="Coba Lagi">
                                <RotateCcw size={16} />
                              </button>
                            )}
                            {(status === 'PENDING' || status === 'FAILED') && (
                              <button className="btn btn-secondary" style={{ padding: '6px 10px', color: 'var(--accent-primary)' }} onClick={() => handleProcess(vid.id)} title="Proses Video">
                                <Play size={16} />
                              </button>
                            )}
                            <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => openDetail(vid.id)} title="Detail">
                              <FileText size={16} />
                            </button>
                            <button className="btn btn-secondary" style={{ padding: '6px 10px', color: 'var(--danger)' }} onClick={() => setVideoToDelete(vid.id)} title="Hapus">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {actionMenu && (
        <div 
          style={{
            position: 'fixed',
            top: actionMenu.y + 4,
            left: actionMenu.x - 180,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
            zIndex: 9999,
            minWidth: '180px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {actionMenu.status === 'PROCESSING' && (
            <div className="hover-bg-light" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: 'var(--warning)', borderBottom: '1px solid var(--border-light)' }} onClick={() => { handleCancel(actionMenu.id); setActionMenu(null); }}>
              <StopCircle size={16} /> Batalkan Proses
            </div>
          )}
          {(actionMenu.status === 'WAITING' || actionMenu.status === 'CANCELLED') && (
            <div className="hover-bg-light" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: 'var(--success)', borderBottom: '1px solid var(--border-light)' }} onClick={() => { handleRestore(actionMenu.id); setActionMenu(null); }}>
              <RotateCcw size={16} /> Ke Pending
            </div>
          )}
          {actionMenu.status === 'FAILED' && (
            <div className="hover-bg-light" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)' }} onClick={() => { handleProcess(actionMenu.id); setActionMenu(null); }}>
              <RotateCcw size={16} /> Coba Lagi
            </div>
          )}
          {(actionMenu.status === 'PENDING' || actionMenu.status === 'FAILED') && (
            <div className="hover-bg-light" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-light)' }} onClick={() => { handleProcess(actionMenu.id); setActionMenu(null); }}>
              <Play size={16} /> Proses Video
            </div>
          )}
          <div className="hover-bg-light" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)' }} onClick={() => { openDetail(actionMenu.id); setActionMenu(null); }}>
            <FileText size={16} /> Detail Video
          </div>
          <div className="hover-bg-light" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: 'var(--danger)' }} onClick={() => { setVideoToDelete(actionMenu.id); setActionMenu(null); }}>
            <Trash2 size={16} /> Hapus Video
          </div>
        </div>
      )}

      {idPopup && (
        <div style={{
          position: 'fixed',
          left: idPopup.x,
          top: idPopup.y,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
          zIndex: 9999,
          color: 'var(--text-primary)',
          fontSize: '0.85rem',
          maxWidth: '85vw',
          wordBreak: 'break-all'
        }} onClick={(e) => e.stopPropagation()}>
          <div style={{ fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Hash size={14} color="var(--accent-primary)" />
            Full Video ID
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>{idPopup.videoId}</div>
        </div>
      )}

      {timePopup && (
        <div style={{
          position: 'fixed',
          left: timePopup.x,
          top: timePopup.y,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
          zIndex: 9999,
          color: 'var(--text-primary)',
          fontSize: '0.85rem',
          minWidth: '150px'
        }} onClick={(e) => e.stopPropagation()}>
          <div style={{ fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} color="var(--accent-primary)" />
            Waktu Dibuat
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>{timePopup.datetime}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>{timePopup.time}</div>
        </div>
      )}
    </div>
  );
}
