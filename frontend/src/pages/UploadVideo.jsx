import { useState } from 'react';
import { UploadCloud, FolderPlus, Video, AlertCircle } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function UploadVideo() {
  const [videoId, setVideoId] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!videoId.trim()) {
      toast.error('Video ID (Nama Folder) tidak boleh kosong');
      return;
    }
    if (!file) {
      toast.error('Silakan pilih file video terlebih dahulu');
      return;
    }

    const formData = new FormData();
    formData.append('video_id', videoId.trim());
    formData.append('file', file);

    setUploading(true);
    try {
      const response = await api.post('/videos/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success(response.data.message || 'Video berhasil diupload dan didaftarkan!');
      setVideoId('');
      setFile(null);
      // Reset file input
      document.getElementById('videoFile').value = '';
    } catch (error) {
      toast.error('Gagal upload: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <h1 className="page-title">Upload Video Source</h1>
      <p className="page-subtitle">Unggah video mentah langsung ke server dan buat ID folder otomatis.</p>

      <div className="card glass-panel" style={{ marginTop: '24px' }}>
        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FolderPlus className="text-primary" /> Setup Folder Video
        </h3>
        
        <div className="form-group">
          <label className="form-label">Video ID (Nama Folder Unik)</label>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Contoh: VID_001_HARI_INI" 
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
          />
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            ID ini akan menjadi nama folder di dalam folder `source/`. Jika folder belum ada, sistem akan membuatnya.
          </div>
        </div>

        <h3 style={{ marginTop: '32px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Video className="text-info" /> File Video Mentah
        </h3>

        <div className="form-group">
          <div style={{ 
            border: '2px dashed var(--border-color)', 
            borderRadius: '12px', 
            padding: '40px', 
            textAlign: 'center',
            background: 'rgba(0,0,0,0.1)',
            position: 'relative'
          }}>
            <input 
              type="file" 
              id="videoFile"
              accept="video/mp4,video/x-m4v,video/*"
              onChange={handleFileChange}
              style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer'
              }}
            />
            <UploadCloud size={48} style={{ color: file ? 'var(--accent-primary)' : 'var(--text-muted)', margin: '0 auto 16px' }} />
            
            {file ? (
              <div style={{ color: 'var(--text-primary)', fontWeight: '500', fontSize: '1.1rem' }}>
                {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </div>
            ) : (
              <div>
                <div style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '8px' }}>
                  Klik atau Drag & Drop file video di sini
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Mendukung MP4, MOV, MKV (Maks rekomendasi: 2GB via Web)
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ background: 'rgba(245, 158, 11, 0.1)', borderLeft: '4px solid var(--warning)', padding: '16px', borderRadius: '4px', marginTop: '24px', display: 'flex', gap: '12px' }}>
          <AlertCircle className="text-warning" size={24} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <strong>Catatan:</strong> File berukuran sangat besar (&gt; 2GB) mungkin memerlukan waktu lama untuk diunggah lewat browser. Untuk file masif, disarankan tetap menggunakan cara manual via File Explorer.
          </div>
        </div>

        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={handleUpload} 
            className="btn btn-primary" 
            disabled={uploading}
            style={{ padding: '12px 24px', fontSize: '1.05rem', minWidth: '180px' }}
          >
            {uploading ? 'Mengunggah...' : (
              <>
                <UploadCloud size={20} /> Mulai Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
