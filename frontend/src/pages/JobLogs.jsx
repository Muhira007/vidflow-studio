import { useState, useEffect } from 'react';
import { Search, Filter, Download } from 'lucide-react';
import api from '../api';

export default function JobLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const response = await api.get('/dashboard/logs');
      setLogs(response.data.logs);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
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

        <div className="table-responsive">
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
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No logs found.</td>
                </tr>
              ) : logs.map((log, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '16px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{log.time}</td>
                  <td style={{ padding: '16px 12px', fontWeight: 600, color: 'var(--accent-primary)' }}>{log.vid}</td>
                  <td style={{ padding: '16px 12px' }}>{log.step}</td>
                  <td style={{ padding: '16px 12px' }}>
                    <span className={`badge ${log.status === 'Failed' ? 'badge-danger' : log.status === 'Success' ? 'badge-success' : 'badge-warning'}`}>
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
