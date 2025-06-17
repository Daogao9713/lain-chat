// src/App.jsx

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as Tone from 'tone';
import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display';
import 'pixi-live2d-display/cubism4';
import './index.css';

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000';
const CHAT_API_URL = `${API_ENDPOINT}/chat`;

window.PIXI = PIXI;

const Live2DWidget = ({ modelPath, state }) => {
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const modelRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || appRef.current) return;

    const app = new PIXI.Application({
      view: canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundAlpha: 0,
      autoStart: true,
      resizeTo: window,
    });
    appRef.current = app;

    Live2DModel.from(modelPath, { autoInteract: false }).then(model => {
      app.stage.addChild(model);
      modelRef.current = model;

      const scale = (window.innerHeight / model.height) * 0.7;
      model.scale.set(scale);
      model.x = (window.innerWidth - model.width) / 2;
      model.y = (window.innerHeight - model.height) / 2;
      
      model.autoUpdate = true;
      
      triggerMotionByState(state, model);
      
    }).catch(err => console.error("❌ Live2D Model Loading Error:", err));

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
    const stateToMotionGroup = { 'companion': 'Idle', 'teaching': 'TapBody', 'pondering': 'FlickHead' };
    const groupName = stateToMotionGroup[currentState] || 'Idle';
    
    if (model.internalModel.motionManager.motionGroups[groupName]) {
        model.motion(groupName);
    } else {
        console.warn(`动作组 "${groupName}" 未在模型中找到。`);
        if (model.internalModel.motionManager.motionGroups['Idle']) {
            model.motion('Idle');
        }
    }
  };

  return <canvas ref={canvasRef} className="live2d-canvas" />;
};

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
    const particles = Array.from({ length: 100 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      char: runes[Math.floor(Math.random() * runes.length)],
      speed: Math.random() * 0.5 + 0.2,
      size: Math.random() * 12 + 8,
      opacity: Math.random() * 0.3 + 0.1
    }));
    
    const render = () => {
      if (!ctx) return;
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

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [roxyState, setRoxyState] = useState('companion');
  const audioInitialized = useRef(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    let storedUserId = localStorage.getItem('lain_user_id');
    if (!storedUserId) {
      storedUserId = `web_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('lain_user_id', storedUserId);
    }
    setUserId(storedUserId);
    setMessages([{ type: 'text', sender: 'roxy', content: '...你好，初次见面。我是洛琪希。', id: `msg-${Date.now()}` }]);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    startAudio();

    const userMessage = { type: 'text', sender: 'user', content: input, id: `msg-user-${Date.now()}` };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      setMessages(prev => [...prev, {type: 'casting_animation', sender: 'roxy', id: `cast-${Date.now()}`}]);
      await new Promise(res => setTimeout(res, 2000));
      const response = await axios.post(CHAT_API_URL, { userId, message: currentInput });
      const repliesFromServer = Array.isArray(response.data.replies) ? response.data.replies : [];
      const formattedReplies = repliesFromServer.map((reply, index) => ({
        ...reply,
        sender: 'roxy',
        id: `msg-roxy-${Date.now()}-${index}`
      }));
      setMessages(prev => [...prev.filter(m => m.type !== 'casting_animation'), ...formattedReplies]);
    } catch (error) {
      console.error("❌ API请求失败:", error);
      const errorReply = { type: 'text', sender: 'roxy', content: '...魔力连接中断了...', id: `msg-error-${Date.now()}` };
      setMessages(prev => [...prev.filter(m => m.type !== 'casting_animation'), errorReply]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSend();
    }
  }

  const renderMessageContent = (msg) => {
    if (msg.type === 'casting_animation') {
      return <div className="casting-effect"><span></span><span></span><span></span></div>;
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
      <MagicBackground />
      <Live2DWidget modelPath="/live2d/Roxy_V1/Roxy_V1.model3.json" state={roxyState} />
      
      <div className="mode-switcher" onClick={handleStateChange}>
        Mode: {roxyState}
      </div>

      <div className="chat-container">
        <div className="chat-area">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-bubble ${msg.sender}`}>
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