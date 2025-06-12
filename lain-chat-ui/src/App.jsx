import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as Tone from 'tone';

// --- API 配置 ---
// 核心修正：在 Vite 前端应用中，为了最大化兼容性，我们使用 Vite 推荐的 `import.meta.env` 写法。
// Vercel 和现代构建工具会正确处理它。之前的警告是由于特定的目标环境配置，但Vercel通常会覆盖此设置。
// 我们将保持这个标准写法，因为它是 Vite 的官方推荐。
const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000';
const CHAT_API_URL = `${API_ENDPOINT}/chat`;

// --- ASCII 艺术头像定义 ---
const ASCII_FACES = [
  `
                           .#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@*.                       
                      .#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@+                       
                      +@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@-                      
                     :%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%.                     
                    .#@@@@@@@@@@@@@@@@@@@@@@%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@+                     
                    =@@@@@@@@@@@@@@@@@@%++#==@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%.                    
                   .#@@@@@@@@@@@@@@@@@@#    .%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@+                    
                   :@@@@@@@@@@@@@@@@@@@*    .%@@@@@@@@@@%@@@@@@@@@@@@@@@@@@@@@@@@@@%.                   
                   =@@@@@@@@@@@@@@@@@@@=    .%@@@@@@@@@%+@@@@@@@@@@@@@@@@@@@@@@@@@@@-                   
                   #@@@@@@@@@@@@@@@@@@@=    .%@%@@@@@@@%-@@@@@@@@@@@@@@@@@@@@@@@@@@@+                   
                  .%@@@@@@@@@@@@@@@@@@@=     %@+@@@@@@@#-@%@@@@@@%@@@@@@@@@@@@@@@@@@%                   
                  -@@@@@@@@@@@@@@@@@@@@=     %@=@@@@@@@#:@*@@@@@%*@@@@@@@@@@@@@@@@@@%:                  
                  +@@@@@@@@@@@@@@@@@@@@=     *%.%@@@@@@+:%+#@@@@#-@@@@@@@@@@@@@@@@@@@-                  
                  #@@@@@@@@@@@@@@@@@@@@+     +# %@@@@@@=.%+*@@@@+:@@@@@@@@@@@@@@@@@@@-                  
                 :%@@@@@@@@@@@@@@@@#@@@*     += #@@@@@@-:%-*@@@@*-#%@@@@@@@@@@@@@@@@@=                  
                 -@@@@@@@@@@@@@@@@@-@@@+     +- =%@@@@@..%+#%@@%:.:=:=%@@@@@@@@@@@@@@=                  
                 **@@@@@@@@@@@@@@@%-#@@#=-::.-. ==@@@@% .*.-==--. .   ++@@@@@@@@@@@@@+                  
                .*=@@@@@@@@@@@%*@%*--##+.   ..  :.=+=*=  -     .....:.:=@@@@@@@@@@@@@=                  
                :--@@@@@@@@@@@%-+%-:   .                   .-:=+=--+==++@@@@@@@@@@@@@=                  
                - -@@@@@@@@@@@%: .....::::::.             .--**-:=- = :=@@@@@@@@@@*@@=                  
                : :%@@@@@@@@@@%: .:-=+*--:==-.              :::- :..- .-@@@@@@@@@*-@@=                  
               .. .%@@@@@@@@@@%: .+=.-::+=.++-                 .::::.--=@@@@@@@@@-=@@=                  
                   %@@@@@@@@@@@=  .. .- . .-                  ..-:---. *@@@@@@@@*-%@@+                  
                   +@@@@@%#%%@%#.  ::  :.....                         -#*@@@@@@%=%%=%*                  
                   -@@@@@@+:.:*=-   .:---::.                         .*--#@@@#=-%@* -#.                 
                   .#*@@@@-  .**:                                    -::%-=+++#@@@-  :-                 
                   .= #@@@%:.:=+=                                    . -%+:=%@@@@%.                     
                    . =@@@@%+:.:=-                                     -+%@*-*%@@*                      
                      .@@#%@@%*: .:                                    =@@@@%=#@#=                      
                      .*-.:%@@@@#+*:                 . .               %@@@@@@@%::                      
                       -.  =%@@@@@@%:                                 -@@@@@@*++                        
                           .+@@@@@@@%=               ..::.           .#@@@@@@: .                        
                            .%@@*@#%@@*:             ..             =%@@@@@@%.                          
                             +%=:+==@@@@*-                        -#@#@@@@@@*.                          
                             .-  ...**@@@@%=:                    .#@+#@@@@@%:                           
                              .     ..%#+%@@@#+-.                -#-:@@@@@@+                            
                                      .. ..-=::-*#*=:.   .:=-.   =. *@@@@@%.                            
                                             .   .-*%%%%#*=.     . .%@@@@%-                             
                                                    .:--.          +@@@@@=.                             
                                                                  :%@@@@*.                              
                                                                  =@@@@#.                               
                                                                 .#@@@%:                                
                                                                 -@@@%-                                 
                                   ......                        *@@@=                                  
                                  ..   .....                     %@@*.                                  
                                  ....      .......             -@@%:.                                  
                                                   :.:....    . *@@-  ......                            
                                                        ..:..:..%@*   ....                              
                                                               :%%-::.                                  
 
  `,
  // 您可以添加更多 ASCII 艺术字符串
];


// =================================================================
//  优化一：代码结构 - 自定义Hooks (Custom Hooks)
// =================================================================

/**
 * Hook: 管理聊天核心逻辑 (状态、历史记录、API请求)
 */
const useChatManager = () => {
  const [messages, setMessages] = useState(() => {
    try {
      const savedMessages = localStorage.getItem('lain_chat_history');
      const parsed = savedMessages ? JSON.parse(savedMessages) : [];
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [{ type: 'text', sender: 'lain', content: '... a new connection.', id: `msg-${Date.now()}` }];
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
    
    const userMessage = { type: 'text', sender: 'user', content: input, id: `msg-user-${Date.now()}` };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    setIsLoading(true);

    try {
      const response = await axios.post(CHAT_API_URL, { userId, message: input });
      const repliesFromServer = Array.isArray(response.data.replies) ? response.data.replies : [];
      
      const formattedReplies = repliesFromServer.map((reply, index) => ({
        ...reply,
        sender: 'lain',
        id: `msg-lain-${Date.now()}-${index}`
      }));
      setMessages(prevMessages => [...prevMessages, ...formattedReplies]);

    } catch (error) {
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
      setMessages(prevMessages => [...prevMessages, errorReply]);
    } finally {
      setIsLoading(false);
    }
  };

  return { messages, isLoading, handleSend };
};

/**
 * Hook: 管理环境音
 */
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
  return startAudio;
};


// =================================================================
//  优化一：代码结构 - 子组件 (Components)
// =================================================================

const EmergingText = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');
  useEffect(() => {
    if (typeof text !== 'string') return;
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

const ToolCallVisualizer = ({ toolCall }) => {
  const functionName = toolCall?.function?.name || 'unknown_function';
  const lines = [`> boot(tool:${functionName})...`];
  return (
    <div className="tool-call-visualizer">
        {lines.map((log, i) => <div key={i} className="log-line">{log}</div>)}
    </div>
  );
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

const AsciiArt = () => {
  const [asciiFace, setAsciiFace] = useState(ASCII_FACES[0]);
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const faceInterval = setInterval(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
        if (Math.random() < 0.15) {
            setAsciiFace(prev => {
                let newIndex;
                do {
                    newIndex = Math.floor(Math.random() * ASCII_FACES.length);
                } while (ASCII_FACES[newIndex] === prev && ASCII_FACES.length > 1);
                return ASCII_FACES[newIndex];
            });
        }
    }, 4000);
    return () => clearInterval(faceInterval);
  }, []);

  return <div className={`ascii-art-container ${isBlinking ? 'blinking' : ''}`}>{asciiFace}</div>;
};

const ChatArea = ({ messages }) => {
  const chatAreaRef = useRef(null);
  
  const messagesWithDateSeparators = messages.reduce((acc, msg, index) => {
    if(!msg.id) return acc;
    const msgDate = new Date(parseInt(msg.id.split('-')[1]));
    if(isNaN(msgDate)) return acc;
    
    const currentDate = msgDate.toLocaleDateString();
    const prevMsg = acc.findLast(m => m.id?.startsWith('msg-'));
    let prevDate = null;
    if(prevMsg){
        const prevMsgDate = new Date(parseInt(prevMsg.id.split('-')[1]));
        if(!isNaN(prevMsgDate)) prevDate = prevMsgDate.toLocaleDateString();
    }

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
    const handleScroll = () => {
      const messageNodes = Array.from(chatArea.children);
      const viewHeight = chatArea.clientHeight;
      for(let i = 0; i < messageNodes.length - 5; i++) {
        const msgTop = messageNodes[i].getBoundingClientRect().top;
        const blurAmount = Math.max(0, 1 - (msgTop / viewHeight) * 1.2);
        if (messageNodes[i].style) {
           messageNodes[i].style.filter = `blur(${blurAmount * 2}px)`;
           messageNodes[i].style.opacity = `${1 - blurAmount * 0.7}`;
        }
      }
    };
    chatArea.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => chatArea.removeEventListener('scroll', handleScroll);
  }, [messages]);

  const renderMessageContent = (msg) => {
    if (msg.type === 'date_separator') return <div className="date-separator">{msg.content}</div>;
    if (msg.type === 'spotify') return <SpotifyCard track={msg.content} />;
    if (msg.type === 'audio') return <AudioPlayer audio={msg.content} />;
    if (msg.type === 'tool_start') return <ToolCallVisualizer toolCall={msg.content} />;

    return msg.sender === 'user' 
      ? <p style={{ margin: 0 }}>{msg.content}</p> 
      : <EmergingText text={msg.content} />;
  };
  
  return (
    <div ref={chatAreaRef} className="chat-area">
      {messagesWithDateSeparators.map((msg) => (
        <div key={msg.id} className={`message-bubble-wrapper ${msg.type === 'date_separator' ? 'separator-wrapper' : ''}`}>
          <div className={`message-bubble ${msg.sender} ${msg.type}`}>
            {renderMessageContent(msg)}
          </div>
        </div>
      ))}
    </div>
  );
};

const InputArea = ({ onSend, isLoading }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('lain_input_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [historyIndex, setHistoryIndex] = useState(-1);

  const handleSendClick = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;
    onSend(trimmedInput);
    if (!history.includes(trimmedInput)) {
      const newHistory = [trimmedInput, ...history].slice(0, 20);
      setHistory(newHistory);
      localStorage.setItem('lain_input_history', JSON.stringify(newHistory));
    }
    setHistoryIndex(-1);
    setInput('');
  };

  const handleKeyDown = (e) => {
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
        setHistoryIndex(-1); setInput('');
      }
    } else if (e.key === 'Enter' && !isLoading) {
      handleSendClick();
    }
  };

  return (
    <div className="input-area">
        <span style={{ color: 'var(--lain-accent)', fontSize: '1.2rem', alignSelf: 'center' }}>&gt;&nbsp;</span>
        <div className="input-field-wrapper">
            <input
              type="text" className="input-field"
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="..." disabled={isLoading}
            />
            {isLoading && <div className="scanline"></div>}
        </div>
        <button className="send-button" onClick={handleSendClick} disabled={!input.trim() || isLoading}>SEND</button>
    </div>
  );
};

// --- 主应用组件 ---
export default function App() {
  const { messages, isLoading, handleSend } = useChatManager();
  const startAudio = useAmbientSound();
  const mainContainerRef = useRef(null);

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
  
  useEffect(() => {
      const handleFirstInteraction = () => {
        startAudio();
        window.removeEventListener('click', handleFirstInteraction);
        window.removeEventListener('keydown', handleFirstInteraction);
      };
      window.addEventListener('click', handleFirstInteraction);
      window.addEventListener('keydown', handleFirstInteraction);
      return () => {
          window.removeEventListener('click', handleFirstInteraction);
          window.removeEventListener('keydown', handleFirstInteraction);
      };
  }, [startAudio]);

  return (
    <>
      <style>{`
        /* --- 所有 "Lain风格" CSS 代码保持不变 --- */
        @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
        :root { --lain-bg: #0a0a0f; --lain-text: #b3b3cc; --lain-accent: #6c5c98; --lain-glow: rgba(140, 115, 255, 0.3); }
        body { background-color: var(--lain-bg); color: var(--lain-text); font-family: 'VT323', monospace; margin: 0; overflow: hidden; }
        .main-container { display: flex; flex-direction: column; height: 100vh; width: 100vw; position: relative; backdrop-filter: blur(1px); }
        .ascii-art-container { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: -1; opacity: 0.08; font-size: 1vw; line-height: 0.8; white-space: pre; color: var(--lain-accent); animation: glitch 15s linear infinite alternate; transition: opacity 0.5s; pointer-events: none;}
        .ascii-art-container.blinking { opacity: 0.04; transform: translate(-50%, -50%) scale(1.005); }
        @keyframes glitch { 0%, 100% { text-shadow: 1px 1px #ff00ff, -1px -1px #00ffff; } 49.9% { text-shadow: 1px 1px #ff00ff, -1px -1px #00ffff; } 50% { text-shadow: -1px 1px #ff00ff, 1px -1px #00ffff; } }
        .chat-area { flex-grow: 1; overflow-y: auto; padding: 2rem; }
        .message-bubble-wrapper { display: flex; flex-direction: column; }
        .message-bubble-wrapper.date_separator { align-items: center; }
        .message-bubble { max-width: 70%; margin-bottom: 1.5rem; padding: 0.75rem 1rem; border: 1px solid var(--lain-accent); background: rgba(13, 13, 26, 0.5); backdrop-filter: blur(5px); animation: fadeIn 0.5s; }
        .message-bubble.user { align-self: flex-end; background: rgba(40, 40, 60, 0.2); border-color: #444; }
        .message-bubble.lain { align-self: flex-start; }
        .message-bubble.date_separator { background: none; border: none; padding: 0; backdrop-filter: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .text-cursor { display: inline-block; width: 8px; height: 1em; background-color: var(--lain-text); animation: blink 1s step-end infinite; vertical-align: bottom; margin-left: 2px; }
        @keyframes blink { 50% { opacity: 0; } }
        .input-area { display: flex; padding: 1.5rem; border-top: 1px solid var(--lain-accent); box-shadow: 0 -5px 25px var(--lain-glow); background: var(--lain-bg); z-index: 10; align-items: center; }
        .input-field-wrapper { flex-grow: 1; position: relative; }
        .input-field { width: 100%; background: transparent; border: none; color: var(--lain-text); font-family: inherit; font-size: 1.2rem; padding: 0.5rem; }
        .input-field:focus { outline: none; }
        .scanline { position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: var(--lain-accent); opacity: 0.6; animation: scan 2s linear infinite; pointer-events: none; }
        @keyframes scan { 0% { transform: translateY(-10px); } 50% { transform: translateY(calc(100% + 10px)); } 100% { transform: translateY(-10px); } }
        .send-button { background: transparent; border: 1px solid var(--lain-accent); color: var(--lain-text); font-family: inherit; font-size: 1.2rem; margin-left: 1rem; padding: 0.5rem 1rem; cursor: pointer; transition: background-color 0.3s; }
        .send-button:disabled { opacity: 0.4; cursor: not-allowed; }
        .tool-call-visualizer { border: 1px dashed #555; padding: 0.5rem; }
        .log-line { font-size: 0.8rem; color: #888; white-space: pre; animation: log-fade-in 0.2s; }
        @keyframes log-fade-in { from { opacity: 0; } to { opacity: 1; } }
        .date-separator { width: fit-content; text-align: center; color: #555; font-size: 0.8rem; margin-bottom: 1rem; padding: 2px 8px; border: 1px solid #333; }
        .spotify-card { display: flex; align-items: center; background: rgba(30, 215, 96, 0.05); border: 1px solid #1DB954; padding: 1rem; max-width: 320px; }
        .album-art { width: 64px; height: 64px; margin-right: 1rem; flex-shrink: 0; }
        .track-info { flex-grow: 1; min-width: 0; }
        .track-name { font-weight: 500; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .artist-name { font-size: 0.9rem; color: #b3b3b3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .play-button { display: block; margin-top: 0.5rem; padding: 0.5rem; background-color: #1DB954; color: #fff; text-align: center; text-decoration: none; font-size: 0.8rem; font-weight: bold; border-radius: 20px; transition: background-color 0.2s; }
        .play-button:hover { background-color: #1ed760; }
        .audio-player audio { width: 100%; max-width: 280px; filter: invert(1) sepia(1) saturate(0.5) hue-rotate(200deg); }
        @media (max-width: 600px) { .chat-area { padding: 1rem; } .message-bubble { max-width: 85%; } .input-area { padding: 1rem; } .input-field { font-size: 1rem; } .send-button { font-size: 1rem; padding: 0.5rem 0.8rem; } }
      `}</style>
      
      <div ref={mainContainerRef} className="main-container">
        <AsciiArt />
        <ChatArea messages={messages} />
        <InputArea onSend={handleSend} isLoading={isLoading} />
      </div>
    </>
  );
}
