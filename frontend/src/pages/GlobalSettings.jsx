import React, { useState, useEffect } from 'react';
import { Save, Key } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000/api';

export default function GlobalSettings() {
  const [openaiKey, setOpenaiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    // Load initial settings
    fetch(`${API_BASE_URL}/settings`)
      .then(res => res.json())
      .then(data => {
        setOpenaiKey(data.openai_api_key || '');
      })
      .catch(err => console.error("Error loading settings:", err));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          openai_api_key: openaiKey
        })
      });
      
      if (response.ok) {
        setSaveMessage('API Keys saved successfully!');
      } else {
        setSaveMessage('Failed to save API Keys.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('Error connecting to server.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
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


        {saveMessage && (
          <div style={{ marginTop: '16px', color: saveMessage.includes('success') ? 'var(--success-color)' : 'var(--danger-color)' }}>
            {saveMessage}
          </div>
        )}

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
