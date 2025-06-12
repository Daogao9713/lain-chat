import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as Tone from 'tone';

// --- API 配置 ---
const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000';
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

// =================================================================
// 优化一：代码结构 - 自定义Hooks (Custom Hooks)
// =================================================================

// --- Hook: 管理聊天核心逻辑 ---
const useChatManager = () => {
  const [messages, setMessages] = useState(() => {
    try {
      const savedMessages = localStorage.getItem('lain_chat_history');
      return savedMessages ? JSON.parse(savedMessages) : [{ type: 'text', sender: 'lain', content: '... a new connection.', id: `msg-${Date.now()}` }];
    } catch (error) {
      console.error("LocalStorage read error:", error);
      return [{ type: 'text', sender: 'lain', content: '... memory error ...', id: `msg-err-${Date.now()}` }];
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    let storedUserId = localStorage.getItem('lain_user_id');
    if (!storedUserId) {
      storedUserId = `web_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('lain_user_id', storedUserId);
    }
    setUserId(storedUserId);
  }, []);

  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem('lain_chat_history', JSON.stringify(messages));
      }
    } catch (error) {
      console.error("Failed to save chat history:", error);
    }
  }, [messages]);

  const handleSend = async (input) => {
    if (!input.trim() || isLoading) return;
    setIsLoading(true);
    
    const userMessage = { type: 'text', sender: 'user', content: input, id: `msg-user-${Date.now()}` };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await axios.post(CHAT_API_URL, { userId, message: input });
      const repliesFromServer = Array.isArray(response.data.replies) ? response.data.replies : [];
      
      const formattedReplies = repliesFromServer.map((reply, index) => ({
        ...reply,
        sender: 'lain',
        id: `msg-lain-${Date.now()}-${index}`
      }));
      setMessages(prev => [...prev, ...formattedReplies]);
    } catch (error) {
      // 优化二：更详细的错误提示
      let errorMessage = '... connection failed ...';
      if (error.response) {
        errorMessage = `[${error.response.status}] ${error.response.data?.error || 'Server Error'}`;
      } else if (error.request) {
        errorMessage = '... no signal from the Wired. (Network Error)';
      } else {
        errorMessage = `... a bug in the system. (${error.message})`;
      }
      console.error("❌ API请求失败:", error);
      const errorReply = { type: 'text', sender: 'lain', content: errorMessage, id: `msg-error-${Date.now()}` };
      setMessages(prev => [...prev, errorReply]);
    } finally {
      setIsLoading(false);
    }
  };

  return { messages, isLoading, handleSend };
};

// --- Hook: 管理环境音 ---
const useAmbientSound = () => {
  const audioInitialized = useRef(false);
  const startAudio = async () => {
    if (audioInitialized.current) return;
    try {
      await Tone.start();
      const hum = new Tone.Oscillator(50, "sine").toDestination();
      hum.volume.value = -35;
      hum.start();
      const noise = new Tone.Noise("white").toDestination();
      noise.volume.value = -45;
      const filter = new Tone.AutoFilter("4n").toDestination().start();
      noise.connect(filter);
      noise.start();
      Tone.Transport.start();
      audioInitialized.current = true;
      console.log("Ambient sound started.");
    } catch(e) {
      console.error("Failed to start audio:", e);
    }
  };
  return { startAudio };
};

// =================================================================
// 优化一：代码结构 - 子组件 (Components)
// =================================================================

const EmergingText = ({ text }) => { /* ... 代码不变 ... */ };

// 优化四：工具调用视觉表现增强
const ToolCallVisualizer = ({ toolCall }) => {
  const functionName = toolCall?.function?.name || 'unknown_function';
  let args = {};
  try {
      args = JSON.parse(toolCall?.function?.arguments || '{}');
  } catch {}
  const argLines = Object.entries(args).map(([key, value]) => `  - ${key}: ${JSON.stringify(value)}`);
  const lines = [
      `> boot(tool:${functionName})...`,
      `> arguments:`,
      ...argLines,
      `> connection_terminated.`
  ];
  return (
    <div className="tool-call-visualizer">
        {lines.map((log, i) => <div key={i} className="log-line">{log}</div>)}
    </div>
  );
};

const AsciiArt = () => {
  const [asciiFace, setAsciiFace] = useState(ASCII_FACES[0]);
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
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

  return <div className={`ascii-art-container ${isBlinking ? 'blinking' : ''}`}>{asciiFace}</div>;
};

const ChatArea = ({ messages }) => {
  const chatAreaRef = useRef(null);
  
  // 优化三：对话上下文标识
  const messagesWithDateSeparators = messages.reduce((acc, msg, index) => {
    const currentDate = new Date(msg.id.split('-')[1] * 1).toLocaleDateString();
    const prevDate = index > 0 ? new Date(messages[index-1].id.split('-')[1] * 1).toLocaleDateString() : null;
    if (currentDate !== prevDate) {
      acc.push({ type: 'date_separator', content: currentDate, id: `date-${currentDate}` });
    }
    acc.push(msg);
    return acc;
  }, []);

  useEffect(() => {
    const chatArea = chatAreaRef.current;
    if (!chatArea) return;
    chatArea.scrollTop = chatArea.scrollHeight;
    const handleScroll = () => { /* ... 记忆模糊效果逻辑不变 ... */ };
    chatArea.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => chatArea.removeEventListener('scroll', handleScroll);
  }, [messages]);

  const renderMessageContent = (msg) => {
    if (msg.type === 'date_separator') {
      return <div className="date-separator">{msg.content}</div>;
    }
    // ... 其他 render 逻辑
  };
  
  return (
    <div ref={chatAreaRef} className="chat-area">
      {messagesWithDateSeparators.map((msg) => (
        <div key={msg.id} className={`message-bubble-wrapper ${msg.type === 'date_separator' ? 'separator' : ''}`}>
          {renderMessageContent(msg)}
        </div>
      ))}
    </div>
  );
};

const InputArea = ({ onSend, isLoading }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const handleSendClick = () => {
    onSend(input);
    if (input.trim()) {
      setHistory(prev => [input, ...prev].slice(0, 20)); // 最多保存20条历史
    }
    setHistoryIndex(-1);
    setInput('');
  };

  const handleKeyDown = (e) => {
    // 优化三：输入历史支持
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Enter' && !isLoading) {
      handleSendClick();
    }
  };

  return (
    <div className="input-area">
        <span style={{ color: 'var(--lain-accent)', fontSize: '1.2rem' }}>&gt;&nbsp;</span>
        <div className="input-field-wrapper">
            <input
              type="text"
              className="input-field"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown} // 使用 onKeyDown 捕获箭头键
              placeholder="..."
              disabled={isLoading}
            />
            {isLoading && <div className="scanline"></div>}
        </div>
        <button className="send-button" onClick={handleSendClick} disabled={!input.trim() || isLoading}>
          SEND
        </button>
    </div>
  );
};


// --- 主应用组件 ---
export default function App() {
  const { messages, isLoading, handleSend } = useChatManager();
  const { startAudio } = useAmbientSound();
  const mainContainerRef = useRef(null);

  // 优化三：iOS键盘遮挡问题
  useEffect(() => {
    const mainContainer = mainContainerRef.current;
    if (!mainContainer) return;
    const setRealViewportHeight = () => {
      mainContainer.style.height = `${window.innerHeight}px`;
    };
    setRealViewportHeight();
    window.addEventListener('resize', setRealViewportHeight);
    return () => window.removeEventListener('resize', setRealViewportHeight);
  }, []);
  
  const handleFirstInteraction = () => {
    startAudio();
    // 移除事件监听，确保只触发一次
    window.removeEventListener('click', handleFirstInteraction);
    window.removeEventListener('keydown', handleFirstInteraction);
  };
  
  useEffect(() => {
      window.addEventListener('click', handleFirstInteraction);
      window.addEventListener('keydown', handleFirstInteraction);
      return () => {
          window.removeEventListener('click', handleFirstInteraction);
          window.removeEventListener('keydown', handleFirstInteraction);
      };
  }, []);

  return (
    <>
      <style>{`
        /* --- 所有 "Lain风格" CSS 代码保持不变，并增加 date-separator 样式 --- */
        .date-separator { width: 100%; text-align: center; color: #555; font-size: 0.8rem; margin: 1rem 0; }
      `}</style>
      
      <div ref={mainContainerRef} className="main-container">
        <AsciiArt />
        <ChatArea messages={messages} />
        <InputArea onSend={handleSend} isLoading={isLoading} />
      </div>
    </>
  );
}
