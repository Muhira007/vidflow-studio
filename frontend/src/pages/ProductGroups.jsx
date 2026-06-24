import { useState, useEffect, useRef } from 'react';
import { Tag, RefreshCw, Save, Package, Search, Folder, Check, Loader2, Trash2, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

export default function ProductGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [edited, setEdited] = useState({}); // { groupId: { product_name, product_description } }
  const [idPopup, setIdPopup] = useState(null);

  useEffect(() => {
    fetchGroups();
    const handleBgClick = () => setIdPopup(null);
    window.addEventListener('click', handleBgClick);
    return () => window.removeEventListener('click', handleBgClick);
  }, []);

  const handleIdClick = (e, folderId) => {
    e.stopPropagation();
    if (!folderId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    let x = rect.left;
    if (x < 10) x = 10;
    setIdPopup({
      x,
      y: rect.top + 28,
      folderId
    });
  };

  const fetchGroups = async () => {
    try {
      const { data } = await api.get('/groups/');
      setGroups(data);
    } catch (err) {
      toast.error('Gagal memuat data grup: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      const { data } = await api.post('/groups/sync');
      toast.success(data.message);
      await fetchGroups();
    } catch (err) {
      toast.error('Gagal sinkronisasi: ' + (err.response?.data?.detail || err.message));
    }
  };

  const getEdited = (group) => {
    const e = edited[group.id];
    return {
      product_name: e?.product_name ?? group.product_name ?? '',
      product_description: e?.product_description ?? group.product_description ?? '',
    };
  };

  const isDirty = (group) => {
    const e = edited[group.id];
    if (!e) return false;
    return (
      e.product_name !== (group.product_name ?? '') ||
      e.product_description !== (group.product_description ?? '')
    );
  };

  const setField = (groupId, field, value) => {
    setEdited((prev) => ({
      ...prev,
      [groupId]: { ...(prev[groupId] || {}), [field]: value },
    }));
  };

  const handleSave = async (groupId) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    const current = getEdited(group);
    setSavingId(groupId);
    try {
      await api.put(`/groups/${groupId}`, {
        product_name: current.product_name,
        product_description: current.product_description,
      });
      // Clear dirty state for this group
      setEdited((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
      // Update local groups
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, product_name: current.product_name, product_description: current.product_description }
            : g
        )
      );
      toast.success(`"${current.product_name || groupId}" disimpan ✓`);
    } catch (err) {
      toast.error('Gagal menyimpan: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (groupId) => {
    if (!confirm(`Hapus grup "${groupId}"?\n\nHanya menghapus data produk, TIDAK menghapus folder/video.`)) return;
    try {
      await api.delete(`/groups/${groupId}`);
      toast.success(`Grup "${groupId}" dihapus`);
      setGroups(prev => prev.filter(g => g.id !== groupId));
    } catch (err) {
      toast.error('Gagal menghapus: ' + (err.response?.data?.detail || err.message));
    }
  };

  const filtered = groups.filter((g) => {
    const q = search.toLowerCase();
    const cur = getEdited(g);
    return (
      g.id.toLowerCase().includes(q) ||
      cur.product_name.toLowerCase().includes(q) ||
      cur.product_description.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Kelola Produk</h1>
          <p className="page-subtitle">
            Atur nama produk untuk setiap folder/grup video — AI akan menggunakannya untuk caption & cover.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={handleSync}>
          <RefreshCw size={16} /> Sync Folder
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.25rem', position: 'relative', maxWidth: '400px' }}>
        <Search
          size={16}
          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
        />
        <input
          type="text"
          className="form-control"
          placeholder="Cari folder atau produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: '36px' }}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
          <Loader2 size={32} className="spinner" style={{ color: 'var(--accent-primary)' }} />
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Memuat data grup...</p>
        </div>
      )}

      {/* Empty */}
      {!loading && groups.length === 0 && (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Folder size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h2 style={{ marginBottom: '0.5rem' }}>Belum ada grup produk</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Sinkronisasi folder source terlebih dahulu, atau upload video melalui File Explorer.
          </p>
          <button className="btn btn-primary" onClick={handleSync}>
            <RefreshCw size={16} /> Sync Sekarang
          </button>
        </div>
      )}

      {/* Card Grid */}
      {!loading && groups.length > 0 && (
        <>
          {/* Stats Header */}
          <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Package size={20} style={{ color: 'var(--accent-primary)' }} />
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Grup</div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{groups.length}</div>
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Tag size={20} style={{ color: '#22c55e' }} />
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Produk Terisi</div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>
                  {groups.filter((g) => (g.product_name || '').trim()).length}
                </div>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Tidak ada grup yang cocok dengan "{search}"
            </div>
          ) : (
            <div className="product-grid">
              {filtered.map((group) => {
                const cur = getEdited(group);
                const dirty = isDirty(group);
                const isSaving = savingId === group.id;
                const hasName = (group.product_name || '').trim().length > 0;

                return (
                  <div key={group.id} className="glass-panel" style={{ 
                    padding: '1.25rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '1.25rem',
                    borderLeft: '4px solid var(--accent-primary)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Header Row */}
                    <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '1rem', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0, flex: 1 }}>
                        <div style={{ 
                          background: 'rgba(139, 92, 246, 0.15)', 
                          padding: '0.6rem', 
                          borderRadius: '8px',
                          color: 'var(--accent-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Folder size={20} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '4px' }}>
                            <div 
                              style={{ 
                                fontWeight: 700, 
                                fontFamily: 'monospace', 
                                whiteSpace: 'nowrap',
                                fontSize: '1.05rem',
                                color: 'var(--text-primary)',
                                cursor: 'pointer'
                              }}
                              onClick={(e) => handleIdClick(e, group.id)}
                              title="Lihat Full ID"
                            >
                              {group.id.length > 10 ? group.id.slice(0, 10) + '...' : group.id}
                            </div>
                            <button
                              onClick={() => handleDelete(group.id)}
                              className="btn btn-secondary hover-bg-light"
                              style={{ 
                                padding: '6px', 
                                color: 'var(--danger)', 
                                border: '1px solid rgba(239, 68, 68, 0.1)',
                                background: 'rgba(239, 68, 68, 0.05)',
                                flexShrink: 0
                              }}
                              title="Hapus grup"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span className="badge badge-secondary" style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                              {group.video_count || 0} Video
                            </span>
                            {hasName ? (
                              <span style={{color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '3px'}}>
                                <Check size={12} /> Tersimpan
                              </span>
                            ) : (
                              <span style={{color: 'var(--warning)'}}>
                                Belum diatur
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Inputs Row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
                      <div style={{ flex: '1 1 250px' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
                          Nama Produk
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Contoh: Sabun Mandi Wangi"
                          value={cur.product_name}
                          onChange={(e) => setField(group.id, 'product_name', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(group.id); }}
                          style={{ width: '100%' }}
                        />
                      </div>
                      
                      <div style={{ flex: '2 1 300px' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
                          Deskripsi <span style={{ fontWeight: 400, opacity: 0.6 }}>(opsional)</span>
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Deskripsi singkat produk..."
                            value={cur.product_description}
                            onChange={(e) => setField(group.id, 'product_description', e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(group.id); }}
                            style={{ flex: 1 }}
                          />
                          <button
                            className="btn btn-primary"
                            onClick={() => handleSave(group.id)}
                            disabled={isSaving || !dirty}
                            style={{
                              padding: '0 20px',
                              fontWeight: 600,
                              opacity: dirty ? 1 : 0.5,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {isSaving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
                            <span className="hide-mobile" style={{ marginLeft: '6px' }}>Simpan</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}


        </>
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
            Full Folder ID
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>{idPopup.folderId}</div>
        </div>
      )}
    </div>
  );
}
