import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as Tone from 'tone';

// --- API 配置 ---
// 核心修正：使用 process.env，Vite/Vercel 在构建时会正确替换这个变量
const API_ENDPOINT = process.env.VITE_API_ENDPOINT || 'http://localhost:3000';
const CHAT_API_URL = `${API_ENDPOINT}/chat`;

// --- ASCII 艺术头像定义 ---
const ASCII_FACES = [
  `
     ...--=++**++=--...     
   .-=++++++++++++++++=-.   
  -++++++++++++++++++++++-  
 =+++++++++**+++++++++++++= 
=++++++++**##*#*++++++++++=
++++++++*#######*++++++++++
++++++++*#######*++++++++++
=++++++++**###*#*++++++++++=
 =+++++++++*###*++++++++++= 
  -++++++++++++++++++++++-  
   '-=++++++++++++++++=-'   
     ...--=++**++=--...     
  `,
  `
     ...--=++**++=--...     
   .-=++++++++++++++++=-.   
  -++++++++++++++++++++++-  
 =+++++++++**+++++++++++++= 
=++++++++*#*--*#*++++++++++=
++++++++*#*--*#*+++++++++++
++++++++*#######*++++++++++
=++++++++**###*#*++++++++++=
 =+++++++++*###*++++++++++= 
  -++++++++++++++++++++++-  
   '-=++++++++++++++++=-'   
     ...--=++**++=--...     
  `,
  `
     ...............      
   ...................    
  .....................   
 .......................  
 .........#######.........
 ......*###########*......
 ....*###############*....
 ...*#################*...
 ..*###################*..
 .*#####################*.
 *#######################*
 *#######################*
 .*#####################*.
  .###################.   
   ..###############..    
     ...#########...      
  `
];

// --- 子组件 (EmergingText, ToolCallVisualizer) ---
const EmergingText = ({ text }) => {
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
  return <p style={{ margin: 0 }}>{displayedText}</p>;
};

const ToolCallVisualizer = ({ toolCall }) => {
    const [logs, setLogs] = useState([]);
    const lines = [
        `> boot(tool_executor)...`,
        `> establish_connection(${toolCall.function.name})...`,
        `> transmit_arguments(len:${toolCall.function.arguments.length})...`,
        `> ...receiving_response...`,
        `> parse_result(status:OK)...`,
        `> connection_terminated.`
    ];
    useEffect(() => {
        let logIndex = 0;
        const intervalId = setInterval(() => {
            if (logIndex < lines.length) {
                setLogs(prev => [...prev, lines[logIndex]]);
                logIndex++;
            } else {
                clearInterval(intervalId);
            }
        }, 200);
        return () => clearInterval(intervalId);
    }, []);
    return (
        <div className="tool-call-visualizer">
            {logs.map((log, i) => <div key={i} className="log-line">{log}</div>)}
        </div>
    );
};


// --- 主应用组件 ---
export default function App() {
  const [messages, setMessages] = useState(() => {
    try {
      const savedMessages = localStorage.getItem('lain_chat_history');
      return savedMessages ? JSON.parse(savedMessages) : [{ type: 'text', sender: 'lain', content: '... a new connection.', id: `msg-${Date.now()}` }];
    } catch (error) {
      return [{ type: 'text', sender: 'lain', content: '... memory error ...', id: `msg-err-${Date.now()}` }];
    }
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [asciiFace, setAsciiFace] = useState(ASCII_FACES[0]);
  const [isBlinking, setIsBlinking] = useState(false);
  const audioInitialized = useRef(false);
  const chatAreaRef = useRef(null);

  // 初始化
  useEffect(() => {
    let storedUserId = localStorage.getItem('lain_user_id');
    if (!storedUserId) {
      storedUserId = `web_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('lain_user_id', storedUserId);
    }
    setUserId(storedUserId);
    
    const faceInterval = setInterval(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 200);
        if (Math.random() < 0.1) {
            setAsciiFace(prev => {
                let newIndex;
                do {
                    newIndex = Math.floor(Math.random() * ASCII_FACES.length);
                } while (ASCII_FACES[newIndex] === prev && ASCII_FACES.length > 1);
                return ASCII_FACES[newIndex];
            });
        }
    }, 5000);

    return () => clearInterval(faceInterval);
  }, []);

  // 保存对话历史
  useEffect(() => {
    try {
      localStorage.setItem('lain_chat_history', JSON.stringify(messages));
    } catch (error) {
      console.error("Failed to save chat history to localStorage:", error);
    }
  }, [messages]);

  // 自动滚动与记忆模糊效果
  useEffect(() => {
    const chatArea = chatAreaRef.current;
    if (!chatArea) return;
    chatArea.scrollTop = chatArea.scrollHeight;
    const handleScroll = () => {
      const messages = chatArea.children;
      const viewHeight = chatArea.clientHeight;
      for(let i = 0; i < messages.length - 5; i++) {
        const msgTop = messages[i].getBoundingClientRect().top;
        const blurAmount = Math.max(0, 1 - (msgTop / viewHeight) * 1.5);
        if (messages[i].style) {
           messages[i].style.filter = `blur(${blurAmount * 2}px)`;
           messages[i].style.opacity = `${1 - blurAmount * 0.8}`;
        }
      }
    };
    chatArea.addEventListener('scroll', handleScroll);
    return () => chatArea.removeEventListener('scroll', handleScroll);
  }, [messages]);
  
  // 启动环境音
  const startAudio = async () => {
      if (audioInitialized.current) return;
      await Tone.start();
      const hum = new Tone.Oscillator(50, "sine").toDestination();
      hum.volume.value = -35;
      hum.start();
      const noise = new Tone.Noise("white").toDestination();
      noise.volume.value = -45;
      const filter = new Tone.AutoFilter("4n").toDestination().start();
      noise.connect(filter);
      noise.start();
      const synth = new Tone.MembraneSynth().toDestination();
      synth.volume.value = -25;
      const loop = new Tone.Loop(time => {
          synth.triggerAttackRelease("C1", "8n", time);
      }, "8s").start(0);
      loop.probability = 0.2;
      Tone.Transport.start();
      audioInitialized.current = true;
      console.log("Ambient sound started.");
  };

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    startAudio();
    const userMessage = { type: 'text', sender: 'user', content: input, id: `msg-user-${Date.now()}` };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    try {
      const response = await axios.post(CHAT_API_URL, { userId, message: currentInput });
      const repliesFromServer = Array.isArray(response.data.replies) ? response.data.replies : [];
      const formattedReplies = repliesFromServer.flatMap((reply, index) => {
          const baseMessage = { sender: 'lain', id: `msg-lain-${Date.now()}-${index}` };
          if (reply.type === 'tool_start') {
              return { ...baseMessage, ...reply };
          }
          return { ...baseMessage, type: reply.type, content: reply.content };
      });
      for (let i = 0; i < formattedReplies.length; i++) {
        const reply = formattedReplies[i];
        if (reply.type === 'tool_start') {
            setMessages(prev => [...prev, reply]);
            await new Promise(res => setTimeout(res, 1500));
            const resultMessage = formattedReplies[i + 1];
            setMessages(prev => [...prev.slice(0, -1), resultMessage]);
            i++;
        } else {
            setMessages(prev => [...prev, reply]);
        }
        await new Promise(res => setTimeout(res, 500));
      }
    } catch (error) {
      console.error("❌ API请求失败:", error);
      const errorReply = { type: 'text', sender: 'lain', content: '... a bug in the Wired ...', id: `msg-error-${Date.now()}` };
      setMessages(prev => [...prev, errorReply]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyPress = (e) => { if (e.key === 'Enter' && !isLoading) handleSend(); };

  // 渲染不同类型的消息气泡
  const renderMessageContent = (msg) => {
    switch (msg.type) {
      case 'tool_start':
        return <ToolCallVisualizer toolCall={msg.content} />;
      case 'text':
      default:
        return msg.sender === 'user' 
          ? <p style={{ margin: 0 }}>{msg.content}</p> 
          : <EmergingText text={msg.content} />;
    }
  };

  return (
    <>
      <style>{`
        /* --- 全局与字体 --- */
        @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
        :root { --lain-bg: #0a0a0f; --lain-text: #b3b3cc; --lain-accent: #6c5c98; --lain-glow: rgba(140, 115, 255, 0.3); }
        body { background-color: var(--lain-bg); color: var(--lain-text); font-family: 'VT323', monospace; margin: 0; overflow: hidden; }
        
        /* --- 背景ASCII艺术 --- */
        .ascii-art-container { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: -1; opacity: 0.1; font-size: 1.2vw; line-height: 0.8; white-space: pre; color: var(--lain-accent); animation: glitch 15s linear infinite alternate; transition: opacity 0.5s; }
        .ascii-art-container.blinking { opacity: 0.05; transform: translate(-50%, -50%) scale(1.005); }
        @keyframes glitch { 0%, 100% { text-shadow: 1px 1px #ff00ff, -1px -1px #00ffff; } 49.9% { text-shadow: 1px 1px #ff00ff, -1px -1px #00ffff; } 50% { text-shadow: -1px 1px #ff00ff, 1px -1px #00ffff; } }

        .main-container { display: flex; flex-direction: column; height: 100%; width: 100%; position: absolute; }
        
        .chat-area { flex-grow: 1; overflow-y: auto; padding: 2rem; }
        .message-bubble { max-width: 70%; margin-bottom: 1.5rem; padding: 0.75rem 1rem; border: 1px solid var(--lain-accent); background: rgba(13, 13, 26, 0.5); backdrop-filter: blur(2px); transition: filter 0.5s, opacity 0.5s; }
        .message-bubble.user { align-self: flex-end; background: rgba(40, 40, 60, 0.2); border-color: #444; }
        
        .input-area { display: flex; padding: 1.5rem; border-top: 1px solid var(--lain-accent); box-shadow: 0 -5px 25px var(--lain-glow); background: var(--lain-bg); z-index: 10; align-items: center; }
        .input-field-wrapper { flex-grow: 1; position: relative; }
        .input-field { width: 100%; background: transparent; border: none; color: var(--lain-text); font-family: inherit; font-size: 1.2rem; padding: 0.5rem; }
        .input-field:focus { outline: none; }
        .scanline { position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: var(--lain-accent); opacity: 0.6; animation: scan 2s linear infinite; pointer-events: none; }
        @keyframes scan { 0% { transform: translateY(-10px); } 50% { transform: translateY(calc(100% + 10px)); } 100% { transform: translateY(-10px); } }
        
        .send-button { background: transparent; border: 1px solid var(--lain-accent); color: var(--lain-text); font-family: inherit; font-size: 1.2rem; margin-left: 1rem; padding: 0.5rem 1rem; cursor: pointer; transition: background-color 0.3s; }
        .send-button:disabled { opacity: 0.4; }
        
        .tool-call-visualizer { border: 1px dashed #555; padding: 0.5rem; }
        .log-line { font-size: 0.8rem; color: #888; white-space: pre; animation: log-fade-in 0.2s; }
        @keyframes log-fade-in { from { opacity: 0; } to { opacity: 1; } }

        @media (max-width: 600px) {
          .chat-area { padding: 1rem; }
          .message-bubble { max-width: 85%; }
          .input-area { padding: 1rem; }
          .input-field { font-size: 1rem; }
          .send-button { font-size: 1rem; padding: 0.5rem 0.8rem; }
        }
      `}</style>
      
      <div className={`ascii-art-container ${isBlinking ? 'blinking' : ''}`}>
          {asciiFace}
      </div>
      
      <div className="main-container">
        <div ref={chatAreaRef} className="chat-area">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-bubble ${msg.sender}`}>
              {renderMessageContent(msg)}
            </div>
          ))}
        </div>
        
        <div className="input-area">
          <span style={{ color: 'var(--lain-accent)', fontSize: '1.2rem' }}>&gt;&nbsp;</span>
          <div className="input-field-wrapper">
              <input
                type="text"
                className="input-field"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="..."
                disabled={isLoading}
              />
              {isLoading && <div className="scanline"></div>}
          </div>
          <button className="send-button" onClick={handleSend} disabled={!input.trim() || isLoading}>
            SEND
          </button>
        </div>
      </div>
    </>
  );
}
