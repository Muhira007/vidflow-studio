import { useState, useEffect, useRef } from 'react';
import { Folder, FileVideo, ChevronLeft, MoreVertical, UploadCloud, Plus, Trash2, Edit3, Image as ImageIcon, Play, X } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function FileManager() {
  const [items, setItems] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null); // null means root
  const [loading, setLoading] = useState(true);

  // Selection & Mobile State
  const [selectedItems, setSelectedItems] = useState([]);
  const [isMobileSelectionMode, setIsMobileSelectionMode] = useState(false);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, type: 'bg', target: null });
  
  // Modals
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [newName, setNewName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Video Player State
  const [showPlayer, setShowPlayer] = useState(false);
  const [playerVideoUrl, setPlayerVideoUrl] = useState('');
  const [playerVideoName, setPlayerVideoName] = useState('');

  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchItems = async () => {
    try {
      const res = await api.get('/fs/list');
      setItems(res.data?.items || []);
      setLoading(false);
    } catch (error) {
      toast.error("Gagal mengambil data folder.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleBgClick = () => {
    setContextMenu({ ...contextMenu, visible: false });
    setSelectedItems([]);
    setIsMobileSelectionMode(false);
  };

  // Touch & Long Press Logic
  const touchTimer = useRef(null);
  const lastTap = useRef(0);
  const isTouchInteraction = useRef(false);

  const handleTouchStart = (e, type, target) => {
    isTouchInteraction.current = true;
    if (e.touches && e.touches.length > 0 && target) {
      touchTimer.current = setTimeout(() => {
        // Long press trigger selection mode for mobile
        if (!selectedItems.includes(target)) {
          setSelectedItems(prev => [...prev, target]);
        }
        setIsMobileSelectionMode(true);
        if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
      }, 600);
    }
  };

  const cancelTouch = () => {
    if (touchTimer.current) clearTimeout(touchTimer.current);
  };

  const handleItemTouchEnd = (e, isFolder, targetName) => {
    cancelTouch();
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap.current;
    if (tapLength < 400 && tapLength > 0) {
      // Double tap detected
      if (isFolder) {
        setCurrentFolder(targetName);
        setSelectedItems([]);
        setIsMobileSelectionMode(false);
      } else {
        openVideoPlayer(targetName);
      }
      if (e.cancelable) e.preventDefault();
    }
    lastTap.current = currentTime;
    
    // Reset touch flag after a short delay
    setTimeout(() => {
      isTouchInteraction.current = false;
    }, 500);
  };

  const handleItemClick = (e, itemName) => {
    e.stopPropagation();
    if (isMobileSelectionMode) {
      toggleSelection(itemName);
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      toggleSelection(itemName);
    } else {
      setSelectedItems([itemName]);
    }
    setContextMenu({ ...contextMenu, visible: false });
  };

  const toggleSelection = (itemName) => {
    setSelectedItems(prev => 
      prev.includes(itemName) ? prev.filter(i => i !== itemName) : [...prev, itemName]
    );
  };

  const handleDoubleClick = (e, isFolder, targetName) => {
    e.stopPropagation();
    if (isFolder) {
      setCurrentFolder(targetName);
      setSelectedItems([]);
      setIsMobileSelectionMode(false);
    } else {
      openVideoPlayer(targetName);
    }
  };

  const openVideoPlayer = (filename) => {
    const folder = currentFolder;
    if (!folder) return;
    // Build stream URL using the same base as our API
    const base = api.defaults.baseURL || 'http://localhost:8000/api';
    const url = `${base}/fs/stream/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}`;
    setPlayerVideoUrl(url);
    setPlayerVideoName(filename);
    setShowPlayer(true);
  };

  const closeVideoPlayer = () => {
    setShowPlayer(false);
    setPlayerVideoUrl('');
    setPlayerVideoName('');
  };

  // Close player on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showPlayer) {
        closeVideoPlayer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPlayer]);

  const handleContextMenu = (e, type, target) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Block context menu if it was triggered by a touch (long press)
    if (isTouchInteraction.current) {
      return;
    }
    
    // If target is an item and not in selected list, select it
    if (target && !selectedItems.includes(target)) {
      setSelectedItems([target]);
    }
    
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      type, // 'bg', 'folder', 'file'
      target
    });
  };

  const handleThreeDotsClick = (e, type, target) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Position menu near the 3 dots
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({
      visible: true,
      x: rect.left,
      y: rect.bottom,
      type,
      target
    });
  };

  const openCreateModal = () => {
    setNewFolderName('');
    setShowCreateModal(true);
  };

  const submitCreateFolder = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const formData = new FormData();
      formData.append('name', newFolderName.trim());
      await api.post('/fs/mkdir', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success("Folder berhasil dibuat");
      setShowCreateModal(false);
      fetchItems();

      // Auto register to DB (non-critical — show separate toast on failure)
      try {
        await api.post('/videos/sync');
      } catch (syncError) {
        let syncErrMsg = 'Gagal sinkronisasi ke database';
        if (syncError.response?.data?.detail) {
          syncErrMsg += ': ' + syncError.response.data.detail;
        } else if (syncError.code === 'ERR_NETWORK' || syncError.message === 'Network Error') {
          syncErrMsg += ': Tidak dapat terhubung ke server. Pastikan backend berjalan.';
        }
        toast.error(syncErrMsg);
      }
    } catch (error) {
      let errMsg = "Gagal membuat folder";
      const detail = error.response?.data?.detail;
      if (detail) {
        errMsg = typeof detail === 'string' ? detail : JSON.stringify(detail);
      }
      toast.error(errMsg);
    }
  };

  const handleDelete = async (target, type) => {
    const targetsToDelete = selectedItems.includes(target) && selectedItems.length > 1 
      ? selectedItems 
      : [target];

    if (!confirm(`Yakin ingin menghapus ${targetsToDelete.length} item? Tindakan ini permanen.`)) return;
    try {
      for (const t of targetsToDelete) {
        if (currentFolder === null) {
          await api.delete(`/fs/delete/${t}`);
          try { await api.delete(`/videos/${t}`); } catch(e) {}
        } else {
          await api.delete(`/fs/delete_file/${currentFolder}/${t}`);
        }
      }
      toast.success("Berhasil dihapus");
      setSelectedItems([]);
      setIsMobileSelectionMode(false);
      setContextMenu({...contextMenu, visible: false});
      fetchItems();
    } catch (error) {
      toast.error("Gagal menghapus sebagian/seluruh item");
    }
  };

  const openRenameModal = (target) => {
    setRenameTarget(target);
    setNewName(target);
    setShowRenameModal(true);
  };

  const submitRename = async () => {
    if (!newName || newName === renameTarget) return;
    try {
      const formData = new FormData();
      formData.append('old_name', renameTarget);
      formData.append('new_name', newName);
      await api.post('/fs/rename', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success("Folder berhasil di-rename");
      setShowRenameModal(false);
      setContextMenu({...contextMenu, visible: false});
      fetchItems();
    } catch (error) {
      let errMsg = "Gagal rename";
      const detail = error.response?.data?.detail;
      if (detail) {
        errMsg = typeof detail === 'string' ? detail : JSON.stringify(detail);
      }
      toast.error(errMsg);
    }
  };

  const triggerFileUpload = (targetFolder) => {
    if (targetFolder) setCurrentFolder(targetFolder);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!currentFolder) {
      toast.error("Harap masuk ke dalam folder dulu untuk upload");
      return;
    }
    
    const formData = new FormData();
    formData.append('video_id', currentFolder);
    formData.append('file', file);

    const loadingToast = toast.loading(`Mengupload ${file.name}...`);
    try {
      await api.post('/videos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success("Upload selesai!", { id: loadingToast });
      fetchItems();
    } catch (error) {
      toast.error("Upload gagal", { id: loadingToast });
    }
    e.target.value = null;
  };

  const handleDrop = async (e, targetFolder) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    const folderId = targetFolder || currentFolder;
    if (!folderId) {
       toast.error("Silakan letakkan file di dalam sebuah folder.");
       return;
    }

    const formData = new FormData();
    formData.append('video_id', folderId);
    formData.append('file', file);

    const loadingToast = toast.loading(`Mengupload ${file.name} ke ${folderId}...`);
    try {
      await api.post('/videos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success("Upload selesai!", { id: loadingToast });
      fetchItems();
    } catch (error) {
      toast.error("Upload gagal", { id: loadingToast });
    }
  };

  const allowDrop = (e) => {
    e.preventDefault();
  };

  // Render logic
  let displayItems = [];
  if (currentFolder === null) {
    displayItems = items.map(f => ({ ...f, isFolder: true }));
  } else {
    const folderData = items.find(f => f.name === currentFolder);
    if (folderData) {
      displayItems = folderData.files.map(file => ({ name: file, isFolder: false }));
    }
  }

  return (
    <div 
      style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', userSelect: 'none' }}
      onClick={handleBgClick}
      onContextMenu={(e) => handleContextMenu(e, 'bg', null)}
      onDragOver={allowDrop}
      onDrop={(e) => handleDrop(e, currentFolder)}
    >
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }} onClick={(e) => e.stopPropagation()}>
        <div>
          <h1 className="page-title">File Explorer</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            {currentFolder ? (
              <>
                <span style={{ cursor: 'pointer', color: 'var(--accent-primary)' }} onClick={() => { setCurrentFolder(null); setSelectedItems([]); setIsMobileSelectionMode(false); }}>Root</span>
                <span>/</span>
                <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{currentFolder}</span>
              </>
            ) : (
              <span>Root / source /</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {currentFolder && (
            <button className="btn btn-secondary" onClick={() => { setCurrentFolder(null); setSelectedItems([]); setIsMobileSelectionMode(false); }}>
              <ChevronLeft size={18} /> Kembali
            </button>
          )}
          <button className="btn btn-primary" onClick={() => currentFolder ? triggerFileUpload() : openCreateModal()}>
            {currentFolder ? <><UploadCloud size={18}/> Upload File</> : <><Plus size={18}/> Buat Folder</>}
          </button>
        </div>
      </div>

      <div 
        className="card glass-panel" 
        style={{ flex: 1, overflowY: 'auto', display: 'flex', alignContent: 'flex-start', flexWrap: 'wrap', gap: '16px', padding: '24px' }}
      >
        {loading ? <p>Loading...</p> : displayItems.length === 0 ? (
          <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
            <Folder size={48} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
            <p>{currentFolder ? 'Folder ini kosong. Klik kanan atau Drag & Drop untuk upload file.' : 'Belum ada folder. Klik kanan untuk membuat folder.'}</p>
          </div>
        ) : displayItems.map((item, idx) => {
          const isSelected = selectedItems.includes(item.name);
          return (
            <div 
              key={idx}
              onContextMenu={(e) => handleContextMenu(e, item.isFolder ? 'folder' : 'file', item.name)}
              onTouchStart={(e) => handleTouchStart(e, item.isFolder ? 'folder' : 'file', item.name)}
              onTouchEnd={(e) => handleItemTouchEnd(e, item.isFolder, item.name)}
              onTouchMove={cancelTouch}
              onDragOver={allowDrop}
              onDrop={(e) => item.isFolder ? handleDrop(e, item.name) : null}
              onClick={(e) => handleItemClick(e, item.name)}
              onDoubleClick={(e) => handleDoubleClick(e, item.isFolder, item.name)}
              style={{
                width: '120px', 
                padding: '16px 8px', 
                borderRadius: '12px', 
                textAlign: 'center',
                cursor: item.isFolder ? 'pointer' : 'default',
                transition: 'all 0.2s',
                border: '1px solid transparent',
                position: 'relative',
                backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                borderColor: isSelected ? 'rgba(59, 130, 246, 0.4)' : 'transparent'
              }}
              className="hover-bg-light"
            >
              {(isMobileSelectionMode || isSelected) && (
                <div style={{ position: 'absolute', top: '8px', left: '8px' }}>
                  <input type="checkbox" checked={isSelected} readOnly style={{ pointerEvents: 'none', accentColor: 'var(--accent-primary)' }} />
                </div>
              )}

              {isSelected && (
                <div 
                  style={{ position: 'absolute', top: '6px', right: '4px', padding: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '50%' }}
                  onClick={(e) => handleThreeDotsClick(e, item.isFolder ? 'folder' : 'file', item.name)}
                >
                  <MoreVertical size={16} color="#fff" />
                </div>
              )}

              {item.isFolder ? (
                <Folder size={48} style={{ color: 'var(--accent-primary)', margin: '0 auto 8px', fill: 'rgba(59, 130, 246, 0.2)' }} />
              ) : item.name.endsWith('.jpg') || item.name.endsWith('.png') ? (
                <ImageIcon size={48} style={{ color: 'var(--success)', margin: '0 auto 8px' }} />
              ) : (
                <FileVideo size={48} style={{ color: 'var(--warning)', margin: '0 auto 8px' }} />
              )}
              
              <div style={{ fontSize: '0.85rem', wordBreak: 'break-all', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {item.name}
              </div>
              
              {item.isFolder && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {items.find(f => f.name === item.name)?.files?.length || 0} files
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div 
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
            zIndex: 9999,
            minWidth: '160px',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'bg' && !currentFolder && (
            <div className="context-menu-item" onClick={openCreateModal}>
              <Plus size={16} /> Buat Folder Baru
            </div>
          )}
          {contextMenu.type === 'bg' && currentFolder && (
            <div className="context-menu-item" onClick={() => triggerFileUpload()}>
              <UploadCloud size={16} /> Upload File di Sini
            </div>
          )}
          
          {contextMenu.type === 'folder' && (
            <>
              {selectedItems.length === 1 && (
                <>
                  <div className="context-menu-item" onClick={() => { setCurrentFolder(contextMenu.target); setContextMenu({...contextMenu, visible:false}); }}>
                    <Folder size={16} /> Buka Folder
                  </div>
                  <div className="context-menu-item" onClick={() => { triggerFileUpload(contextMenu.target); setContextMenu({...contextMenu, visible:false}); }}>
                    <UploadCloud size={16} /> Upload File ke Folder Ini
                  </div>
                  <div className="context-menu-item" onClick={() => openRenameModal(contextMenu.target)}>
                    <Edit3 size={16} /> Rename Folder
                  </div>
                </>
              )}
              <div className="context-menu-item text-danger" onClick={() => handleDelete(contextMenu.target, 'folder')}>
                <Trash2 size={16} /> {selectedItems.length > 1 ? `Hapus ${selectedItems.length} Folder` : `Hapus Folder`}
              </div>
            </>
          )}

          {contextMenu.type === 'file' && (
            <>
              <div className="context-menu-item" onClick={() => { openVideoPlayer(contextMenu.target); setContextMenu({...contextMenu, visible:false}); }}>
                <Play size={16} /> Preview Video
              </div>
              <div className="context-menu-item text-danger" onClick={() => handleDelete(contextMenu.target, 'file')}>
                <Trash2 size={16} /> {selectedItems.length > 1 ? `Hapus ${selectedItems.length} File` : `Hapus File`}
              </div>
            </>
          )}
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card glass-panel" style={{ width: '400px', animation: 'fadeIn 0.2s ease-out' }}>
            <h3>Rename Folder</h3>
            <div className="form-group" style={{ marginTop: '16px' }}>
              <input 
                type="text" 
                className="form-control" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setShowRenameModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={submitRename}>Simpan</button>
            </div>
          </div>
        </div>
      )}

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
              animation: 'fadeIn 0.3s ease-out',
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
                <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                  {playerVideoName}
                </span>
              </div>
              <button
                onClick={closeVideoPlayer}
                style={{
                  background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px',
                  padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  transition: 'background 0.2s'
                }}
                className="hover-bg-light"
              >
                <X size={18} color="var(--text-secondary)" />
              </button>
            </div>

            {/* Video Element */}
            <div style={{ padding: '8px', background: '#000', borderRadius: '0 0 12px 12px' }}>
              <video
                controls
                autoPlay
                style={{ width: '100%', maxHeight: '70vh', borderRadius: '4px', display: 'block' }}
                src={playerVideoUrl}
                onError={(e) => {
                  toast.error('Gagal memutar video. Format mungkin tidak didukung browser.');
                }}
              >
                Browser Anda tidak mendukung pemutaran video HTML5.
              </video>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card glass-panel" style={{ width: '400px', animation: 'fadeIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <Folder size={24} className="text-primary" />
              <h3 style={{ margin: 0 }}>Buat Folder Baru</h3>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Nama Folder / Video ID</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Contoh: VIDEO_001"
                value={newFolderName} 
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitCreateFolder();
                  }
                }}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Batal</button>
              <button type="button" className="btn btn-primary" onClick={submitCreateFolder}>Buat Folder</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .context-menu-item {
          padding: 10px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          font-size: 0.9rem;
          color: var(--text-primary);
          transition: background 0.2s;
        }
        .context-menu-item:hover {
          background: rgba(255,255,255,0.05);
        }
        .context-menu-item.text-danger {
          color: var(--danger);
        }
        .context-menu-item.text-danger:hover {
          background: rgba(239, 68, 68, 0.1);
        }
        .hover-bg-light:hover {
          background: rgba(255,255,255,0.03);
          border-color: rgba(255,255,255,0.1) !important;
        }
      `}</style>
    </div>
  );
}
