import { Filter, Play, RotateCcw, MoreHorizontal } from 'lucide-react';

export default function VideoList() {
  const videos = [
    { id: 'vid_0921a', date: '2026-06-20', originalDur: '05:20', cutDur: '04:15', status: 'Processing', type: 'warning' },
    { id: 'vid_0921b', date: '2026-06-20', originalDur: '08:45', cutDur: '07:30', status: 'Processing', type: 'warning' },
    { id: 'vid_0921c', date: '2026-06-20', originalDur: '12:10', cutDur: '--:--', status: 'Failed', type: 'danger' },
    { id: 'vid_0920a', date: '2026-06-19', originalDur: '04:30', cutDur: '03:45', status: 'Completed', type: 'success' },
    { id: 'vid_0920b', date: '2026-06-19', originalDur: '15:00', cutDur: '12:20', status: 'Completed', type: 'success' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h1 className="page-title">Daftar Video</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Kelola dan pantau semua video dalam antrian Anda.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
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
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '16px 12px', fontWeight: 500 }}>ID Video</th>
                <th style={{ padding: '16px 12px', fontWeight: 500 }}>Tanggal</th>
                <th style={{ padding: '16px 12px', fontWeight: 500 }}>Durasi Asli</th>
                <th style={{ padding: '16px 12px', fontWeight: 500 }}>Durasi Cut</th>
                <th style={{ padding: '16px 12px', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '16px 12px', fontWeight: 500, textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((vid, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '16px 12px', fontWeight: 600, color: 'var(--accent-primary)' }}>{vid.id}</td>
                  <td style={{ padding: '16px 12px', color: 'var(--text-secondary)' }}>{vid.date}</td>
                  <td style={{ padding: '16px 12px', color: 'var(--text-secondary)' }}>{vid.originalDur}</td>
                  <td style={{ padding: '16px 12px', color: 'var(--text-secondary)' }}>{vid.cutDur}</td>
                  <td style={{ padding: '16px 12px' }}>
                    <span className={`badge badge-${vid.type}`}>{vid.status}</span>
                  </td>
                  <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      {vid.status === 'Failed' && (
                        <button className="btn btn-secondary" style={{ padding: '6px 10px' }} title="Retry">
                          <RotateCcw size={16} />
                        </button>
                      )}
                      {vid.status === 'Pending' && (
                        <button className="btn btn-primary" style={{ padding: '6px 10px' }} title="Proses">
                          <Play size={16} />
                        </button>
                      )}
                      <button className="btn btn-secondary" style={{ padding: '6px 10px' }} title="Detail">
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
