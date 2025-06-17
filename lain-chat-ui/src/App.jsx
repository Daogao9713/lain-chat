import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as Tone from 'tone';
import { Application } from 'pixi.js';

// 修正 1: 导入 Live2DModel 主类，并为副作用导入 Cubism 4 运行时
import { Live2DModel } from 'pixi-live2d-display';
import 'pixi-live2d-display/cubism4';

// 你原来的 `index.css` 导入是正确的，但我的代码里没有包含，请确保你的文件里有这一行
// import './index.css'; 


// --- API 配置 ---
const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000';
const CHAT_API_URL = `${API_ENDPOINT}/chat`;

// 将 PIXI 暴露到全局，这是 Live2D 库所需要的
window.PIXI = { Application };

// =================================================================
//  子组件 (Components)
// =================================================================

// --- Live2D Widget ---
const Live2DWidget = ({ modelPath, state }) => {
  const canvasRef = useRef(null);
  const appRef = useRef(null); // 使用 Ref 来持有 app 实例
  const modelRef = useRef(null); // 使用 Ref 来持有 model 实例

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || appRef.current) return; // 防止重复初始化

    const app = new Application({
      view: canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundAlpha: 0,
      autoStart: true,
      resizeTo: window,
    });
    appRef.current = app;

    // 修正 2: 使用 Live2DModel.from 加载模型
    Live2DModel.from(modelPath, { autoInteract: false }).then(model => {
      app.stage.addChild(model);
      modelRef.current = model;

      const scale = (window.innerHeight / model.height) * 0.7;
      model.scale.set(scale);
      model.x = (window.innerWidth - model.width) / 2;
      model.y = (window.innerHeight - model.height) / 2;

      // 启用模型的自动交互，如眨眼和呼吸
      model.autoUpdate = true;
      
      triggerMotionByState(state, model);
      
    }).catch(err => {
      console.error("❌ Live2D Model Loading Error:", err);
    });

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true, baseTexture: true });
        appRef.current = null;
      }
    };
  }, [modelPath]);
  
  useEffect(() => {
    triggerMotionByState(state, modelRef.current);
  }, [state]);

  const triggerMotionByState = (currentState, model) => {
    if (!model || !model.motion) return;

    const stateToMotionGroup = {
      'companion': 'Idle',
      'teaching': 'TapBody',
      'pondering': 'FlickHead'
    };

    // 对于你提供的 Roxy 模型，动作组可能就叫 "Idle", "Tap" 等
    // 你需要根据你的 .model3.json 文件中的定义来调整这里的名字
    const groupName = stateToMotionGroup[currentState] || 'Idle';
    
    // 检查动作组是否存在
    if (model.internalModel.motionManager.motionGroups[groupName]) {
        model.motion(groupName);
    } else {
        console.warn(`动作组 "${groupName}" 未在模型中找到。尝试播放 'Idle'。`);
        if (model.internalModel.motionManager.motionGroups['Idle']) {
            model.motion('Idle');
        }
    }
  };

  return <canvas ref={canvasRef} className="live2d-canvas" />;
};


// --- 魔法粒子背景 ---
const MagicBackground = () => {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        const runes = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
        const particles = Array.from({length: 100}, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            char: runes[Math.floor(Math.random() * runes.length)],
            speed: Math.random() * 0.5 + 0.2,
            size: Math.random() * 12 + 8,
            opacity: Math.random() * 0.3 + 0.1
        }));
        
        const render = () => {
            if(!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                ctx.fillStyle = `rgba(192, 192, 220, ${p.opacity})`;
                ctx.font = `${p.size}px monospace`;
                ctx.fillText(p.char, p.x, p.y);
                p.y -= p.speed;
                if (p.y < 0) {
                    p.y = canvas.height;
                    p.x = Math.random() * canvas.width;
                }
            });
            animationFrameId = requestAnimationFrame(render);
        };
        render();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        }
    }, []);
    return <canvas ref={canvasRef} className="magic-background-canvas" />;
};


// --- 主应用组件 ---
export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [roxyState, setRoxyState] = useState('companion');
  const audioInitialized = useRef(false);
  const chatEndRef = useRef(null); // 用于滚动到底部
  const chatAreaRef = useRef(null); // 修正一：为聊天区域声明 ref

  // 初始化
  useEffect(() => {
    let storedUserId = localStorage.getItem('lain_user_id');
    if (!storedUserId) {
      storedUserId = `web_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('lain_user_id', storedUserId);
    }
    setUserId(storedUserId);
    setMessages([{ type: 'text', sender: 'roxy', content: '...你好，初次见面。我是洛琪希。', id: `msg-${Date.now()}` }]);
  }, []);

  // 自动滚动
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 启动环境音
  const startAudio = async () => {
    if (audioInitialized.current) return;
    try {
      await Tone.start();
      const reverb = new Tone.Reverb(2).toDestination();
      const synth = new Tone.PolySynth(Tone.Synth).connect(reverb);
      synth.volume.value = -20;
      const notes = ["C4", "E4", "G4", "A4"];
      const loop = new Tone.Loop(time => {
          synth.triggerAttackRelease(notes[Math.floor(Math.random() * notes.length)], "4n", time);
      }, "2m").start(0);
      loop.humanize = true;
      Tone.Transport.start();
      audioInitialized.current = true;
      console.log("Magic ambient sound started.");
    } catch(e) {
      console.error("Failed to start audio:", e);
    }
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
      setMessages(prev => [...prev, {type: 'casting_animation', id: `cast-${Date.now()}`}]);
      await new Promise(res => setTimeout(res, 2000));

      const response = await axios.post(CHAT_API_URL, { userId, message: currentInput });
      const repliesFromServer = Array.isArray(response.data.replies) ? response.data.replies : [];
      const formattedReplies = repliesFromServer.map((reply, index) => ({
        ...reply,
        sender: 'roxy',
        id: `msg-roxy-${Date.now()}-${index}`
      }));
      
      setMessages(prev => [...prev.slice(0, -1), ...formattedReplies]);

    } catch (error) {
      console.error("❌ API请求失败:", error);
      const errorReply = { type: 'text', sender: 'roxy', content: '...魔力连接中断了...', id: `msg-error-${Date.now()}` };
      setMessages(prev => [...prev.slice(0, -1), errorReply]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
      if (e.key === 'Enter' && !isLoading) handleSend();
  }

  // 渲染不同消息
  const renderMessageContent = (msg) => {
    if (msg.type === 'casting_animation') {
      return <div className="casting-effect"><span>.</span><span>.</span><span>.</span></div>;
    }
    return <p style={{ margin: 0 }}>{msg.content}</p>;
  };

  const handleStateChange = () => {
      const states = ['companion', 'teaching', 'pondering'];
      const currentIndex = states.indexOf(roxyState);
      const nextIndex = (currentIndex + 1) % states.length;
      setRoxyState(states[nextIndex]);
  };

  return (
    <>
      <style>{`
        /* 性能建议：为了获得最佳性能，@import 规则应放在全局CSS文件（如 index.css）的顶部 */
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
        :root {
          --roxy-bg: #121828;
          --roxy-text: #e0e0f0;
          --roxy-blue: #7d97e8;
          --roxy-silver: #c0c0d0;
          --roxy-glow: rgba(125, 151, 232, 0.5);
        }
        body { background-color: var(--roxy-bg); color: var(--roxy-text); font-family: 'Cinzel', serif; margin: 0; overflow: hidden; }

        .magic-background-canvas { position: fixed; top: 0; left: 0; z-index: 1; opacity: 0.3; }
        .live2d-canvas { position: fixed; top: 0; left: 0; z-index: 2; width: 100% !important; height: 100% !important; }

        .chat-container {
          position: fixed; bottom: 20px; right: 20px;
          width: 400px; max-width: 90vw; height: 60vh;
          background: rgba(18, 24, 40, 0.8);
          border: 1px solid var(--roxy-blue);
          box-shadow: 0 0 20px var(--roxy-glow);
          border-radius: 10px;
          display: flex; flex-direction: column;
          backdrop-filter: blur(5px);
          z-index: 3;
        }

        .chat-area { flex-grow: 1; overflow-y: auto; padding: 1rem; }
        .message-bubble { margin-bottom: 1rem; padding: 0.7rem 1rem; border-radius: 8px; max-width: 80%; line-height: 1.6; }
        .message-bubble.roxy { background: rgba(125, 151, 232, 0.1); align-self: flex-start; }
        .message-bubble.user { background: rgba(192, 192, 208, 0.1); align-self: flex-end; }

        .input-area { padding: 1rem; border-top: 1px solid var(--roxy-blue); display: flex; }
        .input-field { flex-grow: 1; background: transparent; border: none; border-bottom: 1px solid var(--roxy-silver); color: var(--roxy-text); font-family: inherit; font-size: 1rem; padding: 0.5rem; }
        .input-field:focus { outline: none; border-bottom-color: var(--roxy-blue); }
        .send-button { background: var(--roxy-blue); color: var(--roxy-bg); border: none; border-radius: 5px; margin-left: 0.5rem; padding: 0.5rem 1rem; cursor: pointer; }

        .mode-switcher {
          position: fixed; top: 20px; left: 20px; z-index: 4;
          background: rgba(18, 24, 40, 0.8); border: 1px solid var(--roxy-blue);
          padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer;
          text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px;
        }
        .mode-switcher:hover { box-shadow: 0 0 10px var(--roxy-glow); }
        
        .casting-effect span { display: inline-block; animation: bounce 1.4s infinite; }
        .casting-effect span:nth-child(2) { animation-delay: 0.2s; }
        .casting-effect span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1.0); } }
      `}</style>
      
      <MagicBackground />
      <Live2DWidget modelPath="/live2d/Hiyori/Hiyori.model3.json" state={roxyState} />
      
      <div className="mode-switcher" onClick={handleStateChange}>
        Mode: {roxyState}
      </div>

      <div className="chat-container">
        <div ref={chatAreaRef} className="chat-area">
            {messages.map((msg, index) => (
                <div key={msg.id || index} className={`message-bubble ${msg.sender}`}>
                    {renderMessageContent(msg)}
                </div>
            ))}
            <div ref={chatEndRef}></div>
        </div>
        <div className="input-area">
          <input
            type="text"
            className="input-field"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入咒文..."
            disabled={isLoading}
          />
          <button className="send-button" onClick={handleSend} disabled={!input.trim() || isLoading}>
            传送
          </button>
        </div>
      </div>
    </>
  );
}
