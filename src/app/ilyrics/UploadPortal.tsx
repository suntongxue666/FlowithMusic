'use client';

import React, { useState, useRef, useCallback } from 'react';
import './ilyrics.css';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oiggdnnehohoaycyiydn.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface UploadItem {
  id: string;
  file: File;
  title: string;
  artist: string;
  status: 'pending' | 'uploading' | 'success' | 'error' | 'conflict';
  error?: string;
  progress: number;
}

// Simple hashing function for song_id
async function generateSongId(title: string, artist: string) {
  const msg = `${title.trim().toLowerCase()}${artist.trim().toLowerCase()}`;
  const msgUint8 = new TextEncoder().encode(msg);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 32);
}

export default function UploadPortal() {
  const [step, setStep] = useState(1);
  const [pairingCode, setPairingCode] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Verify Pairing Code
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pairingCode.length !== 6) {
      setError('请输入6位配对码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/ilyrics_user_profiles?pairing_code=eq.${pairingCode}&select=user_id,code_expires_at`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      const data = await response.json();

      if (data && data.length > 0) {
        const profile = data[0];
        const expiry = new Date(profile.code_expires_at);
        if (expiry > new Date()) {
          setUserId(profile.user_id);
          setStep(2);
        } else {
          setError('配对码已过期，请在 App 中重新获取');
        }
      } else {
        setError('配对码错误或不存在');
      }
    } catch (err) {
      setError('连接服务器失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // Filename parsing regex
  const filenameRegex = /(.+)\s*[-_]\s*(.+)\.(lrc|ttml)/i;

  const parseFileMetadata = (file: File): { title: string, artist: string } => {
    const match = file.name.match(filenameRegex);
    if (match) {
      // Assuming Format: Artist - Title or Title - Artist
      // We'll put them in and let the user adjust if needed, 
      // but usually the regex group 1 is artist and group 2 is title or vice versa.
      return {
        artist: match[1].trim(),
        title: match[2].trim()
      };
    }
    return { title: file.name.replace(/\.(lrc|ttml)$/i, ''), artist: '' };
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    
    const newItems: UploadItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension !== 'lrc' && extension !== 'ttml') continue;

      const { title, artist } = parseFileMetadata(file);
      newItems.push({
        id: Math.random().toString(36).substring(7),
        file,
        title,
        artist,
        status: 'pending',
        progress: 0
      });
    }

    setUploadQueue(prev => [...prev, ...newItems]);
  };

  const updateItem = (id: string, updates: Partial<UploadItem>) => {
    setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const processUpload = async () => {
    const pendingItems = uploadQueue.filter(item => item.status === 'pending');
    if (pendingItems.length === 0) return;

    setLoading(true);
    
    // Concurrency limit: 3
    const limit = 3;
    const queue = [...pendingItems];
    const active: Promise<void>[] = [];

    const uploadOne = async (item: UploadItem) => {
      updateItem(item.id, { status: 'uploading' });
      
      try {
        const lyrics = await item.file.text();
        const song_id = await generateSongId(item.title, item.artist);
        const type = item.file.name.split('.').pop()?.toLowerCase() as 'lrc' | 'ttml';

        const response = await fetch(`${SUPABASE_URL}/rest/v1/ilyrics_user_library`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            user_id: userId,
            song_id,
            title: item.title,
            artist: item.artist,
            lyrics,
            type
          })
        });

        if (response.ok) {
          updateItem(item.id, { status: 'success', progress: 100 });
        } else if (response.status === 409) {
          updateItem(item.id, { status: 'conflict', error: '歌曲已在云端' });
        } else {
          const errData = await response.json();
          updateItem(item.id, { status: 'error', error: errData.message || '上传失败' });
        }
      } catch (err) {
        updateItem(item.id, { status: 'error', error: '网络错误' });
      }
    };

    while (queue.length > 0 || active.length > 0) {
      while (active.length < limit && queue.length > 0) {
        const item = queue.shift()!;
        const p = uploadOne(item).then(() => {
          active.splice(active.indexOf(p), 1);
        });
        active.push(p);
      }
      await Promise.race(active.length > 0 ? active : [Promise.resolve()]);
      if (queue.length === 0 && active.length === 0) break;
    }

    setLoading(false);
  };

  const removeItem = (id: string) => {
    setUploadQueue(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="ilyrics-container">
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>

      <main className="ilyrics-content">
        <header className="header">
          <h1>iLyrics Portal</h1>
          <p>批量同步本地歌词到 iOS 设备</p>
        </header>

        <div className="card">
          {step === 1 && (
            <div className="step-container">
              <div className="input-group">
                <label>请输入 6 位配对码</label>
                <input 
                  type="text" 
                  className="pairing-input" 
                  maxLength={6}
                  placeholder="000000"
                  value={pairingCode}
                  onChange={(e) => setPairingCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              {error && <p className="error-text">{error}</p>}
              <button 
                className="btn-primary" 
                onClick={handleVerify}
                disabled={loading || pairingCode.length !== 6}
              >
                {loading ? '正在验证...' : '开始配对'}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="step-container">
              <div 
                className="drop-zone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('active'); }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('active'); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('active');
                  handleFiles(e.dataTransfer.files);
                }}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <p>点击或拖拽上传多个 LRC / TTML 文件</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  hidden 
                  multiple
                  accept=".lrc,.ttml" 
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>

              {uploadQueue.length > 0 && (
                <div className="upload-list">
                  <div className="list-header">
                    <span>待处理列表 ({uploadQueue.length})</span>
                    <button className="btn-text" onClick={() => setUploadQueue([])}>清空</button>
                  </div>
                  <div className="items-container">
                    {uploadQueue.map(item => (
                      <div key={item.id} className={`upload-item ${item.status}`}>
                        <div className="item-info">
                          <input 
                            className="item-title" 
                            value={item.title} 
                            onChange={(e) => updateItem(item.id, { title: e.target.value })}
                            placeholder="歌名"
                            disabled={item.status !== 'pending'}
                          />
                          <input 
                            className="item-artist" 
                            value={item.artist} 
                            onChange={(e) => updateItem(item.id, { artist: e.target.value })}
                            placeholder="歌手"
                            disabled={item.status !== 'pending'}
                          />
                        </div>
                        <div className="item-status">
                          {item.status === 'uploading' && <span className="spinner"></span>}
                          {item.status === 'success' && <span className="icon-success">✓</span>}
                          {item.status === 'conflict' && <span className="icon-warning">已存在</span>}
                          {item.status === 'error' && <span className="icon-error">失败</span>}
                          {item.status === 'pending' && (
                            <button className="btn-remove" onClick={() => removeItem(item.id)}>×</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <button 
                    className="btn-primary" 
                    onClick={processUpload}
                    disabled={loading || !uploadQueue.some(i => i.status === 'pending')}
                    style={{ marginTop: '20px' }}
                  >
                    {loading ? '同步中...' : '开始同步'}
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 3 || (step === 2 && uploadQueue.length > 0 && uploadQueue.every(i => i.status !== 'pending' && i.status !== 'uploading')) && (
             <div className="success-footer" style={{ marginTop: '20px', textAlign: 'center' }}>
                <p style={{ color: 'var(--success-color)', fontWeight: '600' }}>同步任务已完成！</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>请在 App 的 Uploaded 页面下拉刷新查看</p>
             </div>
          )}
        </div>

        <p className="disclaimer">
          仅供个人研究与学习使用，请勿上传未经授权的内容。
          <br />
          iLyrics 不会公开分享您的个人本地歌词。
        </p>
      </main>
    </div>
  );
}
