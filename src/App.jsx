import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// --- API配置 ---
// 请确保您的后端服务器正在运行，并根据需要修改此URL
const API_ENDPOINT = 'http://localhost:3000/chat';

// --- 主应用组件 ---
export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const chatEndRef = useRef(null);

  // 初始化，设置初始欢迎语和用户ID
  useEffect(() => {
    // 为Web端生成一个临时的、唯一的userId
    const webUserId = `web_user_${Date.now()}`;
    setUserId(webUserId);

    // Lain 的开场白
    setMessages([
      { sender: 'lain', text: '... a new connection.' },
      { sender: 'lain', text: '... who are you?' },
    ]);
  }, []);

  // 每当有新消息时，自动滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 发送消息的处理函数
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post(API_ENDPOINT, {
        userId: userId,
        message: input,
      });

      // 注意：我们当前的 /chat 接口只返回一个简单的文本回复
      // 未来可以扩展接口，返回更复杂的数据结构，如 { type: 'text', content: '...' } 或 { type: 'audio', url: '...' }
      const lainReply = { sender: 'lain', text: response.data.reply || '... no signal ...' };
      setMessages(prev => [...prev, lainReply]);

    } catch (error) {
      console.error("❌ API请求失败:", error);
      const errorReply = { sender: 'lain', text: '... a bug in the Wired ...' };
      setMessages(prev => [...prev, errorReply]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <>
      <style>{`
        /* --- 全局与字体 --- */
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap');
        
        :root {
          --lain-bg: #0d0d1a;
          --lain-text: #b3b3cc;
          --lain-accent: #8c73ff;
          --lain-glow: rgba(140, 115, 255, 0.5);
          --lain-glitch1: #ff00ff;
          --lain-glitch2: #00ffff;
        }

        * {
          box-sizing: border-box;
          scrollbar-width: thin;
          scrollbar-color: var(--lain-accent) transparent;
        }

        body {
          background-color: var(--lain-bg);
          color: var(--lain-text);
          font-family: 'IBM Plex Mono', monospace;
          margin: 0;
          overflow: hidden;
        }
        
        /* --- 主容器与CRT效果 --- */
        .main-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100vw;
          position: relative;
        }

        .main-container::before {
          content: ' ';
          display: block;
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          right: 0;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
          z-index: 2;
          background-size: 100% 2px, 3px 100%;
          pointer-events: none;
          animation: flicker 0.15s infinite;
        }

        .main-container::after {
          content: ' ';
          display: block;
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          right: 0;
          background: rgba(18, 16, 16, 0.1);
          opacity: 0;
          z-index: 2;
          pointer-events: none;
          animation: scanline 4s linear infinite;
        }

        @keyframes flicker { 0% { opacity: 0.1; } 20% { opacity: 1; } 40% { opacity: 0.3; } 60% { opacity: 0.9; } 80% { opacity: 0.2; } 100% { opacity: 1; } }
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }

        /* --- 聊天区域 --- */
        .chat-area {
          flex-grow: 1;
          overflow-y: auto;
          padding: 2rem;
          display: flex;
          flex-direction: column;
        }

        .message-bubble {
          max-width: 70%;
          margin-bottom: 1rem;
          padding: 0.75rem 1rem;
          border: 1px solid var(--lain-accent);
          background: rgba(140, 115, 255, 0.05);
          backdrop-filter: blur(2px);
          animation: fadeIn 0.5s ease-in-out;
        }
        
        .message-bubble.user {
          align-self: flex-end;
          background: rgba(40, 40, 60, 0.1);
          border-color: #555;
        }

        .message-bubble.lain {
          align-self: flex-start;
        }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        /* --- 输入区域 --- */
        .input-area {
          display: flex;
          padding: 1.5rem;
          border-top: 1px solid var(--lain-accent);
          box-shadow: 0 -5px 15px var(--lain-glow);
          background: var(--lain-bg);
          position: relative;
          z-index: 10;
        }

        .input-field {
          flex-grow: 1;
          background: transparent;
          border: none;
          border-bottom: 1px solid #555;
          color: var(--lain-text);
          font-family: inherit;
          font-size: 1rem;
          padding: 0.5rem;
          caret-color: var(--lain-accent);
          transition: border-color 0.3s;
        }

        .input-field:focus {
          outline: none;
          border-bottom-color: var(--lain-accent);
        }
        
        .input-cursor {
          display: inline-block;
          width: 8px;
          height: 1.2em;
          background-color: var(--lain-accent);
          margin-left: 2px;
          animation: blink 1s step-end infinite;
          vertical-align: bottom;
        }

        @keyframes blink { 50% { opacity: 0; } }
        
        .send-button {
          background: transparent;
          border: 1px solid var(--lain-accent);
          color: var(--lain-text);
          font-family: inherit;
          font-size: 1rem;
          margin-left: 1rem;
          padding: 0.5rem 1rem;
          cursor: pointer;
          transition: background-color 0.3s, color 0.3s;
        }

        .send-button:hover:not(:disabled) {
          background-color: var(--lain-accent);
          color: var(--lain-bg);
        }

        .send-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        
        .loading-indicator {
          font-size: 0.8rem;
          opacity: 0.7;
          margin-left: 1rem;
          align-self: center;
        }

      `}</style>
      <div className="main-container">
        <div className="chat-area">
          {messages.map((msg, index) => (
            <div key={index} className={`message-bubble ${msg.sender}`}>
              {/* 未来可以根据 msg.type 渲染不同组件，如 AudioPlayer */}
              <p style={{ margin: 0 }}>{msg.text}</p>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        
        <div className="input-area">
          {/* 修正：在 React 的 inline style 中使用 CSS 变量，需要将其作为字符串传递 */}
          <span style={{ color: 'var(--lain-accent)' }}>&gt;&nbsp;</span>
          <input
            type="text"
            className="input-field"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder=""
            disabled={isLoading}
          />
          <div className="input-cursor"></div>
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
