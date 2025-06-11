import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000';
const CHAT_API_URL = `${API_ENDPOINT}/chat`;

// --- 子组件 (Spotify, Audio, Typewriter) ---
const TypewriterText = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');
  useEffect(() => {
    setDisplayedText('');
    let i = 0;
    const intervalId = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(prev => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(intervalId);
      }
    }, 30);
    return () => clearInterval(intervalId);
  }, [text]);

  return <p style={{ margin: 0 }}>{displayedText}<span className="text-cursor"></span></p>;
};

const SpotifyCard = ({ track }) => (
  <div className="spotify-card">
    <img src={track.albumArt} alt={track.name} className="album-art" />
    <div className="track-info">
      <div className="track-name">{track.name}</div>
      <div className="artist-name">{track.artist}</div>
      <a href={track.url} target="_blank" rel="noopener noreferrer" className="play-button">
        CONNECT ON SPOTIFY
      </a>
    </div>
  </div>
);

const AudioPlayer = ({ audio }) => (
  <div className="audio-player">
    <audio controls controlsList="nodownload noplaybackrate" src={audio.url}>
      Your browser does not support the audio element.
    </audio>
  </div>
);


// --- 主应用组件 ---
export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [systemStatus, setSystemStatus] = useState('initializing...');
  const chatEndRef = useRef(null);
  const mainContainerRef = useRef(null); // 用于动态设置高度

  // ▼▼▼ 核心修正：监听并设置动态视窗高度 ▼▼▼
  useEffect(() => {
    const mainContainer = mainContainerRef.current;
    if (!mainContainer) return;

    const setRealViewportHeight = () => {
      // 使用 window.innerHeight 作为最可靠的、包含UI栏的实际高度
      mainContainer.style.height = `${window.innerHeight}px`;
    };

    // 页面加载和窗口大小变化时都设置一次
    setRealViewportHeight();
    window.addEventListener('resize', setRealViewportHeight);

    // 对于移动端，visualViewport API 更能精确地处理虚拟键盘
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setRealViewportHeight);
    }
    
    return () => {
      window.removeEventListener('resize', setRealViewportHeight);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', setRealViewportHeight);
      }
    };
  }, []);


  // 初始化
  useEffect(() => {
    console.log("React App Initialized.");
    console.log("API Endpoint in use:", CHAT_API_URL);

    if (!import.meta.env.VITE_API_ENDPOINT && window.location.hostname !== 'localhost') {
        setSystemStatus('Error: VITE_API_ENDPOINT is not configured.');
    } else {
        setSystemStatus('... ready ...');
    }

    const webUserId = `web_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setUserId(webUserId);
    setMessages([{ type: 'text', sender: 'lain', content: '... present day, present time. ...', id: `msg-${Date.now()}` }]);
  }, []);

  // 自动滚动
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 背景动画
  useEffect(() => {
    const canvas = canvasRef.current;
    // 解决方案四：对 canvas 进行更严格的检查
    if (!canvas || typeof canvas.getContext !== 'function') return;
    
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    const particles = Array.from({ length: 100 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 1.5 + 0.5,
    }));
    const render = () => {
      if(!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(140, 115, 255, 0.5)';
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      });
      animationFrameId = window.requestAnimationFrame(render);
    };
    render();
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = { type: 'text', sender: 'user', content: input, id: `msg-user-${Date.now()}` };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    setSystemStatus('connecting to the Wired...');
    try {
      const response = await axios.post(CHAT_API_URL, { userId, message: currentInput });
      const repliesFromServer = Array.isArray(response.data.replies) ? response.data.replies : [];
      if (repliesFromServer.length > 0) {
        const formattedReplies = repliesFromServer.map((reply, index) => ({ ...reply, sender: 'lain', id: `msg-lain-${Date.now()}-${index}` }));
        setMessages(prev => [...prev, ...formattedReplies]);
        setSystemStatus('... connected ...');
      } else {
         setSystemStatus('... silence ...');
      }
    } catch (error) {
      console.error("❌ API请求失败:", error);
      let errorMessage = '... connection failed ...';
      if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Network Error: Cannot reach server. Check backend status and CORS policy.';
      } else if (error.response) {
        errorMessage = `Server Error: ${error.response.status} ${error.response.data?.error || ''}`;
      }
      setSystemStatus(errorMessage);
      const errorReply = { type: 'text', sender: 'lain', content: errorMessage, id: `msg-error-${Date.now()}` };
      setMessages(prev => [...prev, errorReply]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyPress = (e) => { if (e.key === 'Enter' && !isLoading) handleSend(); };

  // 渲染不同类型的消息气泡
  const renderMessageContent = (msg) => {
    switch (msg.type) {
      case 'spotify': return <SpotifyCard track={msg.content} />;
      case 'audio': return <AudioPlayer audio={msg.content} />;
      case 'text':
      default:
        return msg.sender === 'user' ? <p style={{ margin: 0 }}>{msg.content}</p> : <TypewriterText text={msg.content} />;
    }
  };

  return (
    <>
      <canvas ref={canvasRef} id="background-canvas"></canvas>
      <style>{`
        /* --- 所有 "Lain风格" CSS 代码保持不变 --- */
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap');
        :root { --lain-bg: #0a0a0f; --lain-text: #b3b3cc; --lain-accent: #8c73ff; --lain-glow: rgba(140, 115, 255, 0.3); }
        * { box-sizing: border-box; }
        body { background-color: var(--lain-bg); color: var(--lain-text); font-family: 'IBM Plex Mono', monospace; margin: 0; overflow: hidden; }
        #background-canvas { position: fixed; top: 0; left: 0; z-index: -1; opacity: 0.5; }
        .main-container { display: flex; flex-direction: column; height: 100vh; width: 100vw; position: relative; backdrop-filter: blur(1px); }
        .main-container::before { content: ' '; display: block; position: absolute; top: 0; left: 0; bottom: 0; right: 0; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03)); z-index: 2; background-size: 100% 2px, 3px 100%; pointer-events: none; animation: flicker 0.15s infinite; }
        @keyframes flicker { 0% { opacity: 0.2; } 20% { opacity: 1; } 40% { opacity: 0.4; } 60% { opacity: 0.8; } 80% { opacity: 0.3; } 100% { opacity: 1; } }
        .chat-area { flex-grow: 1; overflow-y: auto; padding: 2rem; display: flex; flex-direction: column; }
        .message-bubble { max-width: 70%; margin-bottom: 1.5rem; padding: 0.75rem 1rem; border: 1px solid var(--lain-accent); background: rgba(13, 13, 26, 0.5); backdrop-filter: blur(5px); animation: fadeIn 0.5s; }
        .message-bubble.user { align-self: flex-end; background: rgba(40, 40, 60, 0.2); border-color: #444; }
        .message-bubble.lain { align-self: flex-start; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .text-cursor { display: inline-block; width: 8px; height: 1em; background-color: var(--lain-text); animation: blink 1s step-end infinite; vertical-align: bottom; margin-left: 2px; }
        @keyframes blink { 50% { opacity: 0; } }
        .input-area { display: flex; padding: 1.5rem; border-top: 1px solid var(--lain-accent); box-shadow: 0 -5px 25px var(--lain-glow); background: var(--lain-bg); z-index: 10; }
        .input-field { flex-grow: 1; background: transparent; border: none; border-bottom: 1px solid #555; color: var(--lain-text); font-family: inherit; font-size: 1rem; padding: 0.5rem; caret-color: var(--lain-accent); transition: border-color 0.3s; }
        .input-field:focus { outline: none; border-bottom-color: var(--lain-accent); }
        .send-button { background: transparent; border: 1px solid var(--lain-accent); color: var(--lain-text); font-family: inherit; font-size: 1rem; margin-left: 1rem; padding: 0.5rem 1rem; cursor: pointer; transition: background-color 0.3s, color 0.3s; }
        .send-button:hover:not(:disabled) { background-color: var(--lain-accent); color: var(--lain-bg); }
        .send-button:disabled { opacity: 0.4; cursor: not-allowed; }
        .loading-indicator { font-size: 0.8rem; opacity: 0.7; margin-left: 1rem; align-self: center; }
        .spotify-card { display: flex; align-items: center; background: rgba(30, 215, 96, 0.05); border: 1px solid #1DB954; padding: 1rem; max-width: 320px; }
        .album-art { width: 64px; height: 64px; margin-right: 1rem; flex-shrink: 0; }
        .track-info { flex-grow: 1; min-width: 0; }
        .track-name { font-weight: 500; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .artist-name { font-size: 0.9rem; color: #b3b3b3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .play-button { display: block; margin-top: 0.5rem; padding: 0.5rem; background-color: #1DB954; color: #fff; text-align: center; text-decoration: none; font-size: 0.8rem; font-weight: bold; border-radius: 20px; transition: background-color 0.2s; }
        .play-button:hover { background-color: #1ed760; }
        .audio-player audio { width: 100%; max-width: 280px; filter: invert(1) sepia(1) saturate(0.5) hue-rotate(200deg); }
        .system-status { position: fixed; top: 10px; left: 50%; transform: translateX(-50%); background: rgba(255, 0, 0, 0.2); border: 1px solid red; color: #ffc4c4; padding: 5px 10px; font-size: 12px; z-index: 100; }
      `}</style>
      <div className="main-container">
        {systemStatus.toLowerCase().includes('error') && <div className="system-status">{systemStatus}</div>}
        
        <div className="chat-area">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-bubble ${msg.sender}`}>
              {renderMessageContent(msg)}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        
        <div className="input-area">
          <span style={{ color: 'var(--lain-accent)', alignSelf: 'center' }}>&gt;&nbsp;</span>
          <input
            type="text"
            className="input-field"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isLoading ? '...' : systemStatus}
            disabled={isLoading}
          />
          {isLoading ? (
            <span className="loading-indicator">...connecting...</span>
          ) : (
            <button className="send-button" onClick={handleSend} disabled={!input.trim()}>
              SEND
            </button>
          )}
        </div>
      </div>
    </>
  );
}
