import { useState, useEffect, useRef } from 'react';
import { Tag, RefreshCw, Save, Package, Search, Folder, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

export default function ProductGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [edited, setEdited] = useState({}); // { groupId: { product_name, product_description } }

  useEffect(() => {
    fetchGroups();
  }, []);

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
          {filtered.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Tidak ada grup yang cocok dengan "{search}"
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
              gap: '1rem',
            }}>
              {filtered.map((group) => {
                const cur = getEdited(group);
                const dirty = isDirty(group);
                const isSaving = savingId === group.id;
                const hasName = (group.product_name || '').trim().length > 0;

                return (
                  <div key={group.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Header: Folder ID + Video Count + Saved Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="badge badge-primary" style={{
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        padding: '4px 10px',
                      }}>
                        <Folder size={13} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                        {group.id}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge badge-secondary" style={{ fontSize: '0.8rem' }}>
                          {group.video_count || 0} video
                        </span>
                        {hasName && !dirty && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Check size={12} /> tersimpan
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Product Name Input */}
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                        Nama Produk
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Contoh: Produk Tissue Murah"
                        value={cur.product_name}
                        onChange={(e) => setField(group.id, 'product_name', e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(group.id); }}
                        style={{ fontSize: '0.9rem' }}
                      />
                    </div>

                    {/* Description Input */}
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                        Deskripsi <span style={{ fontWeight: 400 }}>(opsional)</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Deskripsi singkat produk..."
                        value={cur.product_description}
                        onChange={(e) => setField(group.id, 'product_description', e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(group.id); }}
                        style={{ fontSize: '0.9rem' }}
                      />
                    </div>

                    {/* Save Button */}
                    <button
                      className="btn btn-primary"
                      onClick={() => handleSave(group.id)}
                      disabled={isSaving || !dirty}
                      style={{
                        alignSelf: 'flex-end',
                        padding: '8px 20px',
                        fontWeight: 600,
                        opacity: dirty ? 1 : 0.5,
                        transition: 'all 0.2s',
                      }}
                    >
                      {isSaving ? (
                        <><Loader2 size={15} className="spinner" /> Menyimpan...</>
                      ) : (
                        <><Save size={15} /> Simpan</>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Stats Footer */}
          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
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
        </>
      )}
    </div>
  );
}
