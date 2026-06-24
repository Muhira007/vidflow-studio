import React, { useState, useEffect } from 'react';
import { Save, Key } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function GlobalSettings() {
  const [openaiKey, setOpenaiKey] = useState('');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api.get('/settings')
      .then(res => {
        setOpenaiKey(res.data.openai_api_key || '');
        setDeepseekKey(res.data.deepseek_api_key || '');
      })
      .catch(err => console.error("Error loading settings:", err));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.put('/settings', {
        openai_api_key: openaiKey,
        deepseek_api_key: deepseekKey
      });
      toast.success('API Keys saved!');
    } catch (error) {
      toast.error('Gagal menyimpan API Keys');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Global Settings & API Keys</h1>
        <p className="page-subtitle">Configure your external API credentials here</p>
      </div>

      <div className="config-card">
        <div className="config-section">
          <h2 className="section-title">
            <Key size={18} style={{ marginRight: '8px' }} />
            OpenAI API Key
          </h2>
          <p className="section-description">
            Used for Whisper transcription (STT) and optional LLM features.
          </p>
          <div className="input-group">
            <input
              type="password"
              className="text-input"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              style={{ width: '100%', maxWidth: '500px' }}
            />
          </div>
        </div>

        <div className="config-section" style={{ marginTop: '32px', paddingTop: '32px', borderTop: '1px solid var(--border-color)' }}>
          <h2 className="section-title">
            <Key size={18} style={{ marginRight: '8px' }} />
            DeepSeek API Key
          </h2>
          <p className="section-description">
            Used for AI-powered social media caption generation (DeepSeek V4 Flash).
          </p>
          <div className="input-group">
            <input
              type="password"
              className="text-input"
              value={deepseekKey}
              onChange={(e) => setDeepseekKey(e.target.value)}
              placeholder="sk-..."
              style={{ width: '100%', maxWidth: '500px' }}
            />
          </div>
        </div>

        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
