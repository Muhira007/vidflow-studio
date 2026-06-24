import { useState, useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Folder, FileVideo, ChevronLeft, MoreVertical, UploadCloud, Plus, Trash2, Edit3, Image as ImageIcon, Play, X, MessageSquare, Save } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

// Helper: format bytes ke human-readable
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Helper: format speed ke human-readable
function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec < 1) return '0 B/s';
  return formatBytes(bytesPerSec) + '/s';
}

// Helper: format detik ke "Xm Ys" atau "Xs"
function formatTime(seconds) {
  if (!seconds || seconds < 0.5) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

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

  // Comment Modal State
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentTarget, setCommentTarget] = useState(null);
  const [commentText, setCommentText] = useState('');

  // Video Player State
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type, targets }
  const [showPlayer, setShowPlayer] = useState(false);
  const [playerVideoUrl, setPlayerVideoUrl] = useState('');
  const [playerVideoName, setPlayerVideoName] = useState('');

  // Upload Progress State
  const [uploadState, setUploadState] = useState({
    active: false,        // upload sedang berjalan
    fileName: '',         // nama file yang sedang diupload
    progress: 0,          // persentase (0-100)
    loaded: 0,            // bytes terupload
    total: 0,             // total bytes
    speed: 0,             // bytes/detik
    startTime: 0,         // timestamp mulai upload file ini
  });

  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const uploadStateRef = useRef(null);  // ref untuk akses uploadState di callback

  // Sync ref dengan uploadState untuk akses di onUploadProgress
  useEffect(() => { uploadStateRef.current = uploadState; }, [uploadState]);

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
    // Gunakan relative URL — works di lokal (Vite proxy) & production (Nginx)
    const url = `/api/fs/stream/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}`;
    setPlayerVideoUrl(url);
    setPlayerVideoName(filename);
    setShowPlayer(true);
  };

  const closeVideoPlayer = () => {
    setShowPlayer(false);
    setPlayerVideoUrl('');
    setPlayerVideoName('');
  };

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showPlayer) closeVideoPlayer();
        else if (deleteConfirm) setDeleteConfirm(null);
        else if (showRenameModal) setShowRenameModal(false);
        else if (showCreateModal) setShowCreateModal(false);
        else if (showCommentModal) setShowCommentModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPlayer, deleteConfirm, showRenameModal, showCreateModal, showCommentModal]);

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

  const handleDelete = (target, type) => {
    // If multiple items are selected and target is among them, delete all selected
    const targetsToDelete = selectedItems.includes(target) && selectedItems.length > 1
      ? selectedItems
      : [target];

    setDeleteConfirm({ type, targets: targetsToDelete, folder: currentFolder });
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    const { targets, folder } = deleteConfirm;
    setDeleteConfirm(null);

    let success = 0;
    let failed = 0;
    try {
      for (const t of targets) {
        try {
          if (folder === null) {
            await api.delete(`/fs/delete/${t}`);
            try { await api.delete(`/videos/${t}`); } catch(e) {}
          } else {
            await api.delete(`/fs/delete_file/${folder}/${t}`);
          }
          success++;
        } catch (e) {
          failed++;
        }
      }
      if (failed === 0) {
        toast.success(`${success} item berhasil dihapus`);
      } else {
        toast.error(`${success} berhasil, ${failed} gagal`);
      }
      setSelectedItems([]);
      setIsMobileSelectionMode(false);
      setContextMenu({...contextMenu, visible: false});
      fetchItems();
    } catch (error) {
      toast.error("Gagal menghapus item");
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

  const submitComment = async () => {
    if (!commentTarget) return;
    try {
      await api.put(`/groups/${encodeURIComponent(commentTarget)}`, {
        product_description: commentText.trim() || null
      });
      toast.success('Komentar berhasil disimpan');
      setShowCommentModal(false);
      // Update local state immediately
      setItems(prev => prev.map(f =>
        f.name === commentTarget
          ? { ...f, product_description: commentText.trim() || null }
          : f
      ));
      fetchItems();
    } catch (error) {
      let errMsg = 'Gagal menyimpan komentar';
      const detail = error.response?.data?.detail;
      if (detail) errMsg += ': ' + (typeof detail === 'string' ? detail : JSON.stringify(detail));
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
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    if (!currentFolder) {
      toast.error("Harap masuk ke dalam folder dulu untuk upload");
      return;
    }

    let success = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('video_id', currentFolder);
      formData.append('file', file);

      // Init progress untuk file ini
      setUploadState({
        active: true, fileName: file.name,
        progress: 0, loaded: 0, total: file.size,
        speed: 0, startTime: Date.now(),
      });

      try {
        await api.post('/videos/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const { loaded, total } = progressEvent;
            const elapsed = (Date.now() - uploadStateRef.current.startTime) / 1000;
            setUploadState(prev => ({
              ...prev,
              loaded, total,
              progress: total ? Math.round((loaded * 100) / total) : 0,
              speed: elapsed > 0 ? loaded / elapsed : 0,
            }));
          },
        });
        success++;
      } catch (error) {
        failed++;
        console.error(`Gagal upload ${file.name}:`, error);
        toast.error(`Gagal upload ${file.name}`);
      }
    }

    setUploadState(prev => ({ ...prev, active: false }));
    if (failed === 0 && success > 0) {
      toast.success(`${success} file berhasil diupload!`);
    } else if (failed > 0) {
      toast.error(`${success} berhasil, ${failed} gagal`);
    }
    fetchItems();
    e.target.value = null;
  };

  const handleDrop = async (e, targetFolder) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const folderId = targetFolder || currentFolder;
    if (!folderId) {
       toast.error("Silakan letakkan file di dalam sebuah folder.");
       return;
    }

    let success = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('video_id', folderId);
      formData.append('file', file);

      setUploadState({
        active: true, fileName: file.name,
        progress: 0, loaded: 0, total: file.size,
        speed: 0, startTime: Date.now(),
      });

      try {
        await api.post('/videos/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const { loaded, total } = progressEvent;
            const elapsed = (Date.now() - uploadStateRef.current.startTime) / 1000;
            setUploadState(prev => ({
              ...prev,
              loaded, total,
              progress: total ? Math.round((loaded * 100) / total) : 0,
              speed: elapsed > 0 ? loaded / elapsed : 0,
            }));
          },
        });
        success++;
      } catch (error) {
        failed++;
        console.error(`Gagal upload ${file.name}:`, error);
        toast.error(`Gagal upload ${file.name}`);
      }
    }

    setUploadState(prev => ({ ...prev, active: false }));
    if (failed === 0 && success > 0) {
      toast.success(`${success} file berhasil diupload ke ${folderId}!`);
    } else if (failed > 0) {
      toast.error(`${success} berhasil, ${failed} gagal`);
    }
    fetchItems();
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
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} multiple />

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
                <>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {items.find(f => f.name === item.name)?.files?.length || 0} files
                  </div>
                  {item.product_description && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--accent-primary)',
                      marginTop: '6px',
                      padding: '4px 8px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: '6px',
                      wordBreak: 'break-word',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: '1.3',
                      textAlign: 'left'
                    }}>
                      {item.product_description}
                    </div>
                  )}
                </>
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
                  <div className="context-menu-item" onClick={() => {
                    const currentComment = items.find(f => f.name === contextMenu.target)?.product_description || '';
                    setCommentTarget(contextMenu.target);
                    setCommentText(currentComment);
                    setShowCommentModal(true);
                    setContextMenu({...contextMenu, visible: false});
                  }}>
                    <MessageSquare size={16} /> {items.find(f => f.name === contextMenu.target)?.product_description ? 'Edit Komentar' : 'Tambah Komentar'}
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div className="card glass-panel" style={{ maxWidth: '440px', width: '100%', animation: 'fadeIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: 'var(--danger)' }}>
              <AlertTriangle size={28} />
              <h3 style={{ margin: 0 }}>Konfirmasi Penghapusan</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.6' }}>
              Yakin ingin menghapus <strong style={{ color: 'var(--danger)' }}>HARD DELETE</strong>{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirm.targets.length} item</strong>?
            </p>
            <div style={{
              background: 'rgba(255,255,255,0.05)', borderRadius: '8px',
              padding: '12px', marginBottom: '20px', maxHeight: '150px', overflowY: 'auto'
            }}>
              {deleteConfirm.targets.map((t, i) => (
                <div key={i} style={{
                  fontFamily: 'monospace', fontSize: '0.85rem',
                  color: 'var(--text-secondary)', padding: '4px 0',
                  borderBottom: i < deleteConfirm.targets.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  wordBreak: 'break-all', overflowWrap: 'anywhere',
                  overflow: 'hidden',
                }}>
                  {deleteConfirm.folder === null ? '📁' : '🎬'} {deleteConfirm.folder !== null && deleteConfirm.folder + '/'}{t}
                </div>
              ))}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
              Tindakan ini akan menghapus data dari <b>Database</b> dan <b>Source Folder</b>. Aksi ini tidak dapat dibatalkan!
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Batal
              </button>
              <button className="btn btn-primary" style={{
                background: 'var(--danger)', border: 'none',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
              }} onClick={executeDelete}>
                <Trash2 size={16} /> Ya, Hapus!
              </button>
            </div>
          </div>
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

      {/* Comment Modal */}
      {showCommentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card glass-panel" style={{ width: '420px', animation: 'fadeIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <MessageSquare size={24} className="text-primary" />
              <h3 style={{ margin: 0 }}>
                {commentText ? 'Edit Komentar' : 'Tambah Komentar'}
              </h3>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{
                fontFamily: 'monospace', fontSize: '0.8rem',
                color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)',
                padding: '2px 8px', borderRadius: '4px'
              }}>
                {commentTarget}
              </span>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--text-secondary)' }}>
                Komentar
              </label>
              <textarea
                className="form-control"
                placeholder="Contoh: Produk skincare batch Maret 2025..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    submitComment();
                  }
                }}
                style={{ minHeight: '100px', resize: 'vertical', fontSize: '0.9rem' }}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setShowCommentModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={submitComment}>
                <Save size={16} /> Simpan
              </button>
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

      {/* Upload Progress Overlay */}
      {uploadState.active && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(12px)',
          zIndex: 9998, padding: '20px 24px',
          borderTop: '1px solid var(--border-color)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            maxWidth: '700px', margin: '0 auto',
            display: 'flex', alignItems: 'center', gap: '16px'
          }}>
            {/* Icon */}
            <div style={{
              width: '42px', height: '42px', borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <UploadCloud size={22} style={{ color: 'var(--accent-primary)' }} />
            </div>

            {/* Info + Progress */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginBottom: '8px', fontSize: '0.9rem'
              }}>
                <span style={{
                  color: 'var(--text-primary)', fontWeight: 600,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  marginRight: '12px'
                }}>
                  {uploadState.fileName}
                </span>
                <span style={{ color: 'var(--accent-primary)', whiteSpace: 'nowrap', fontWeight: 600 }}>
                  {uploadState.progress}%
                </span>
              </div>

              {/* Progress bar */}
              <div style={{
                height: '6px', background: 'rgba(255,255,255,0.1)',
                borderRadius: '3px', overflow: 'hidden', marginBottom: '8px'
              }}>
                <div style={{
                  height: '100%',
                  width: `${uploadState.progress}%`,
                  background: 'var(--accent-primary)',
                  borderRadius: '3px',
                  transition: 'width 0.3s ease-out'
                }} />
              </div>

              {/* Speed + Size */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '0.75rem', color: 'var(--text-muted)'
              }}>
                <span>
                  {formatBytes(uploadState.loaded)} / {formatBytes(uploadState.total)}
                  {' · '}
                  {formatSpeed(uploadState.speed)}
                </span>
                <span>
                  {uploadState.speed > 0 && uploadState.total > uploadState.loaded
                    ? `≈ ${formatTime((uploadState.total - uploadState.loaded) / uploadState.speed)}`
                    : ''}
                </span>
              </div>
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
