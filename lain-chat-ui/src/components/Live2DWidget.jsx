// src/components/Live2DWidget.jsx
import React, { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display';

// 将 PIXI 暴露到全局，这是 Live2D 库所需要的
window.PIXI = { Application };

const Live2DWidget = ({ modelPath, width, height }) => {
  const canvasRef = useRef(null);
  const appRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // 创建 Pixi 应用实例
    const app = new Application({
      view: canvasRef.current,
      width,
      height,
      transparent: true,
      autoStart: true,
    });
    appRef.current = app;

    // 加载 Live2D 模型
    Live2DModel.from(modelPath).then(model => {
      // 调整模型大小和位置
      const scale = (height / model.height) * 0.9;
      model.scale.set(scale);
      model.x = (width - model.width) / 2;
      model.y = height * 0.1;

      // 添加到舞台
      app.stage.addChild(model);

      // 实现随机眨眼
      model.internalModel.eyeBlink = new PIXI.live2d.EyeBlink();
      
      // 实现随机动作
      const motionKeys = Object.keys(model.internalModel.motionManager.motionGroups);
      setInterval(() => {
        const randomMotion = motionKeys[Math.floor(Math.random() * motionKeys.length)];
        model.motion(randomMotion);
      }, 10000); // 每10秒触发一次随机动作

    }).catch(err => {
        console.error("❌ Failed to load Live2D model:", err);
    });

    return () => {
      // 组件卸载时销毁 Pixi 应用
      app.destroy(true, { children: true, texture: true, baseTexture: true });
    };
  }, [modelPath, width, height]);

  return <canvas ref={canvasRef} />;
};

export default Live2DWidget;
