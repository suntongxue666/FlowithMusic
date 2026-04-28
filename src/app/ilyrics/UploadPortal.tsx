'use client';

import React, { useState, useRef } from 'react';
import './ilyrics.css';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oiggdnnehohoaycyiydn.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Simple hashing function for song_id
async function generateSongId(title: string, artist: string) {
  const msg = `${title.trim().toLowerCase()}${artist.trim().toLowerCase()}`;
  const msgUint8 = new TextEncoder().encode(msg);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 32); // Use first 32 chars for consistency
}

export default function UploadPortal() {
  const [step, setStep] = useState(1);
  const [pairingCode, setPairingCode] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [songInfo, setSongInfo] = useState({
    title: '',
    artist: '',
    lyrics: '',
    type: 'lrc' as 'lrc' | 'ttml'
  });

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

  // Step 2: Handle File Upload & Parsing
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'lrc' && extension !== 'ttml') {
      setError('仅支持 .lrc 或 .ttml 文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      parseLyricsFile(content, extension as 'lrc' | 'ttml');
    };
    reader.readAsText(file);
  };

  const parseLyricsFile = (content: string, type: 'lrc' | 'ttml') => {
    let title = '';
    let artist = '';

    if (type === 'lrc') {
      const tiMatch = content.match(/\[ti:(.*?)\]/);
      const arMatch = content.match(/\[ar:(.*?)\]/);
      title = tiMatch ? tiMatch[1].trim() : '';
      artist = arMatch ? arMatch[1].trim() : '';
    } else if (type === 'ttml') {
      const titleMatch = content.match(/<title>(.*?)<\/title>/);
      title = titleMatch ? titleMatch[1].trim() : '';
    }

    setSongInfo({
      title,
      artist,
      lyrics: content,
      type
    });
    setError('');
  };

  // Step 3: Submit to Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songInfo.title || !songInfo.artist) {
      setError('请输入歌名和歌手');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const song_id = await generateSongId(songInfo.title, songInfo.artist);
      
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
          title: songInfo.title,
          artist: songInfo.artist,
          lyrics: songInfo.lyrics,
          type: songInfo.type
        })
      });

      if (response.ok) {
        setStep(3);
      } else {
        const errData = await response.json();
        setError(errData.message || '上传失败，请检查数据格式');
      }
    } catch (err) {
      setError('网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ilyrics-container">
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>

      <main className="ilyrics-content">
        <header className="header">
          <h1>iLyrics Portal</h1>
          <p>同步你的本地歌词到 iOS 设备</p>
        </header>

        <div className="card">
          {step === 1 && (
            <div className="step-container">
              <div className="input-group">
                <label>请输入配对码</label>
                <input 
                  type="text" 
                  className="pairing-input" 
                  maxLength={6}
                  placeholder="000000"
                  value={pairingCode}
                  onChange={(e) => setPairingCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              {error && <p style={{ color: 'var(--accent-color)', textAlign: 'center' }}>{error}</p>}
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
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    const extension = file.name.split('.').pop()?.toLowerCase();
                    if (extension === 'lrc' || extension === 'ttml') {
                      const reader = new FileReader();
                      reader.onload = (event) => parseLyricsFile(event.target?.result as string, extension as 'lrc' | 'ttml');
                      reader.readAsText(file);
                    } else {
                      setError('仅支持 .lrc 或 .ttml 文件');
                    }
                  }
                }}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <p>{songInfo.lyrics ? '已选择歌词文件' : '点击或拖拽上传 LRC / TTML 文件'}</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  hidden 
                  accept=".lrc,.ttml" 
                  onChange={handleFileChange}
                />
              </div>

              {songInfo.lyrics && (
                <form className="lyrics-form" onSubmit={handleSubmit}>
                  <div className="input-group">
                    <label>歌名 (Title)</label>
                    <input 
                      type="text" 
                      value={songInfo.title}
                      onChange={(e) => setSongInfo({...songInfo, title: e.target.value})}
                      placeholder="例如: Blinding Lights"
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>歌手 (Artist)</label>
                    <input 
                      type="text" 
                      value={songInfo.artist}
                      onChange={(e) => setSongInfo({...songInfo, artist: e.target.value})}
                      placeholder="例如: The Weeknd"
                      required
                    />
                  </div>
                  {error && <p style={{ color: 'var(--accent-color)', textAlign: 'center' }}>{error}</p>}
                  <button 
                    className="btn-primary" 
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? '正在同步...' : '确认并同步到 App'}
                  </button>
                </form>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="success-state">
              <div className="success-icon">✓</div>
              <h2>同步成功！</h2>
              <p style={{ color: 'var(--text-secondary)', margin: '16px 0' }}>
                歌词已成功上传到云端。
                <br />
                请在 App 的 <b>Uploaded</b> 页面下拉刷新查看。
              </p>
              <button 
                className="btn-primary" 
                style={{ width: '100%' }}
                onClick={() => {
                  setStep(2);
                  setSongInfo({ title: '', artist: '', lyrics: '', type: 'lrc' });
                }}
              >
                继续上传
              </button>
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
