import { Search, Filter, Download } from 'lucide-react';

export default function JobLogs() {
  const logs = [
    { time: '2026-06-20 14:32:10', vid: 'vid_0921c', step: 'Generate Cover', status: 'Failed', msg: 'FFmpeg error: Unable to extract frame. Video stream may be corrupted.' },
    { time: '2026-06-20 14:30:05', vid: 'vid_0921c', step: 'Auto Caption', status: 'Success', msg: 'Generated 45 subtitle segments.' },
    { time: '2026-06-20 14:28:12', vid: 'vid_0921c', step: 'Silence Cut', status: 'Success', msg: 'Removed 12 segments (Total: 1m 5s padding cut)' },
    { time: '2026-06-20 13:45:00', vid: 'vid_0920b', step: 'Render', status: 'Success', msg: 'Exported to output/vid_0920b/vid_0920b_1080p.mp4 successfully.' },
    { time: '2026-06-20 13:20:15', vid: 'vid_0920b', step: 'Generate Cover', status: 'Success', msg: 'Cover created from template Minimalist Bold.' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h1 className="page-title">Log & Riwayat</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Pantau detail eksekusi setiap proses dalam pipeline.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary">
            <Download size={18} /> Export CSV
          </button>
        </div>
      </div>

      <div className="card glass-panel">
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input type="text" className="form-control" placeholder="Cari Video ID atau Error..." style={{ paddingLeft: '40px' }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <select className="form-control" style={{ width: '160px' }}>
              <option>Semua Status</option>
              <option>Success</option>
              <option>Failed</option>
              <option>Warning</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '16px 12px', fontWeight: 500 }}>Timestamp</th>
                <th style={{ padding: '16px 12px', fontWeight: 500 }}>Video ID</th>
                <th style={{ padding: '16px 12px', fontWeight: 500 }}>Step</th>
                <th style={{ padding: '16px 12px', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '16px 12px', fontWeight: 500 }}>Pesan/Detail</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.9rem' }}>
              {logs.map((log, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '16px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{log.time}</td>
                  <td style={{ padding: '16px 12px', fontWeight: 600, color: 'var(--accent-primary)' }}>{log.vid}</td>
                  <td style={{ padding: '16px 12px' }}>{log.step}</td>
                  <td style={{ padding: '16px 12px' }}>
                    <span className={`badge ${log.status === 'Failed' ? 'badge-danger' : 'badge-success'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 12px', color: log.status === 'Failed' ? 'var(--danger)' : 'var(--text-secondary)' }}>
                    {log.msg}
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
