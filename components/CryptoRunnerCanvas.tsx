
import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { GameState, Player, Obstacle, Particle } from '../types';

interface GameProps {
  gameState: GameState;
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
}

const BASE_BLUE = '#0052FF';
const RED_VULN = '#FF4444';
const INITIAL_FALL_SPEED = 4;
const SPEED_INCREMENT = 0.00015;

const CryptoRunnerCanvas = forwardRef<{ move: (dir: 'left' | 'right') => void }, GameProps>(({ gameState, onGameOver, onScoreUpdate }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Parallax star positions
  const starsRef = useRef<{x: number, y: number, size: number}[]>([]);
  
  // Game instance variables
  const playerRef = useRef<Player & { targetX: number }>({ 
    x: 0, 
    y: 0, 
    width: 48, 
    height: 48, 
    color: BASE_BLUE,
    targetX: 0
  });
  
  const obstaclesRef = useRef<Obstacle[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scoreRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const currentDifficultyRef = useRef(1);
  const currentFallSpeedRef = useRef(INITIAL_FALL_SPEED);

  // Sound Synthesis Helpers
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playMoveSound = () => {
    if (!audioCtxRef.current) return;
    const osc = audioCtxRef.current.createOscillator();
    const gain = audioCtxRef.current.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, audioCtxRef.current.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtxRef.current.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, audioCtxRef.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtxRef.current.destination);
    osc.start();
    osc.stop(audioCtxRef.current.currentTime + 0.1);
  };

  const playScoreSound = () => {
    if (!audioCtxRef.current) return;
    const osc = audioCtxRef.current.createOscillator();
    const gain = audioCtxRef.current.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, audioCtxRef.current.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, audioCtxRef.current.currentTime + 0.05);
    gain.gain.setValueAtTime(0.05, audioCtxRef.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtxRef.current.destination);
    osc.start();
    osc.stop(audioCtxRef.current.currentTime + 0.1);
  };

  const playCrashSound = () => {
    if (!audioCtxRef.current) return;
    const bufferSize = audioCtxRef.current.sampleRate * 0.5;
    const buffer = audioCtxRef.current.createBuffer(1, bufferSize, audioCtxRef.current.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = audioCtxRef.current.createBufferSource();
    noise.buffer = buffer;
    const filter = audioCtxRef.current.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, audioCtxRef.current.currentTime);
    filter.frequency.exponentialRampToValueAtTime(10, audioCtxRef.current.currentTime + 0.5);
    const gain = audioCtxRef.current.createGain();
    gain.gain.setValueAtTime(0.3, audioCtxRef.current.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioCtxRef.current.currentTime + 0.5);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtxRef.current.destination);
    noise.start();
  };

  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const startX = canvas.width / 2 - 24;
    playerRef.current = {
      x: startX,
      targetX: startX,
      y: canvas.height - 240,
      width: 48,
      height: 48,
      color: BASE_BLUE
    };
    obstaclesRef.current = [];
    particlesRef.current = [];
    scoreRef.current = 0;
    spawnTimerRef.current = 0;
    currentDifficultyRef.current = 1;
    currentFallSpeedRef.current = INITIAL_FALL_SPEED;
    
    if (starsRef.current.length === 0) {
      for (let i = 0; i < 100; i++) {
        starsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: 0.5 + Math.random() * 1.5
        });
      }
    }
    
    onScoreUpdate(0);
  }, [onScoreUpdate]);

  const createExplosion = (x: number, y: number, color: string) => {
    playCrashSound();
    const count = 25;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        maxLife: 1.0,
        color,
        size: 2 + Math.random() * 4
      });
    }
  };

  const handleMove = useCallback((dir: 'left' | 'right') => {
    if (gameState !== GameState.PLAYING) return;
    initAudio(); // Initialize audio on first interaction
    const canvas = canvasRef.current;
    if (!canvas) return;

    const laneWidth = canvas.width / 4;
    const p = playerRef.current;
    if (dir === 'left') {
      p.targetX = Math.max(10, p.targetX - laneWidth);
    } else {
      p.targetX = Math.min(canvas.width - p.width - 10, p.targetX + laneWidth);
    }
    playMoveSound();
  }, [gameState]);

  useImperativeHandle(ref, () => ({
    move: handleMove
  }));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== GameState.PLAYING) return;
      initAudio();
      
      const key = e.key.toLowerCase();
      if (key === 'arrowleft' || key === 'a') {
        handleMove('left');
      } else if (key === 'arrowright' || key === 'd') {
        handleMove('right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleMove]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      starsRef.current = [];
      for (let i = 0; i < 100; i++) {
        starsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: 0.5 + Math.random() * 1.5
        });
      }
      initGame();
    };

    window.addEventListener('resize', resize);
    resize();

    return () => window.removeEventListener('resize', resize);
  }, [initGame]);

  const update = useCallback((dt: number) => {
    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx * (dt / 16.66);
      p.y += p.vy * (dt / 16.66);
      p.life -= 0.02 * (dt / 16.66);
      return p.life > 0;
    });

    if (gameState !== GameState.PLAYING) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const p = playerRef.current;
    const dx = p.targetX - p.x;
    p.x += dx * (1 - Math.pow(0.001, dt / 1000)); 

    currentFallSpeedRef.current += SPEED_INCREMENT * dt;
    currentDifficultyRef.current += (SPEED_INCREMENT / 8) * dt;

    spawnTimerRef.current -= dt;
    if (spawnTimerRef.current <= 0) {
      const width = 50 + Math.random() * 80;
      const x = Math.random() * (canvas.width - width);
      obstaclesRef.current.push({
        x,
        y: -100,
        width,
        height: 45,
        color: RED_VULN,
        speed: currentFallSpeedRef.current + (Math.random() * 2.5) 
      });
      spawnTimerRef.current = Math.max(350, 1000 / currentDifficultyRef.current);
    }

    obstaclesRef.current = obstaclesRef.current.filter(obs => {
      obs.y += obs.speed * (dt / 16.66);
      
      const collides = (
        p.x < obs.x + obs.width &&
        p.x + p.width > obs.x &&
        p.y < obs.y + obs.height &&
        p.y + p.height > obs.y
      );

      if (collides) {
        createExplosion(p.x + p.width / 2, p.y + p.height / 2, RED_VULN);
        onGameOver(Math.floor(scoreRef.current));
        return false;
      }

      if (obs.y > canvas.height) {
        playScoreSound();
        scoreRef.current += 10;
        onScoreUpdate(Math.floor(scoreRef.current));
        return false;
      }
      return true;
    });

    scoreRef.current += 0.015 * dt;
  }, [gameState, onGameOver, onScoreUpdate]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#020617');
    bgGradient.addColorStop(1, '#000000');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    const starOffset = (scoreRef.current * 0.5) % canvas.height;
    starsRef.current.forEach(star => {
      let sy = (star.y + starOffset) % canvas.height;
      ctx.beginPath();
      ctx.arc(star.x, sy, star.size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.strokeStyle = 'rgba(0, 82, 255, 0.08)';
    ctx.lineWidth = 1;
    const gridSize = 80;
    const gridOffset = (scoreRef.current * 3) % gridSize; 
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y + gridOffset - gridSize);
      ctx.lineTo(canvas.width, y + gridOffset - gridSize);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(0, 82, 255, 0.15)';
    ctx.lineWidth = 2;
    const streakSpeed = 12;
    const streakOffset = (scoreRef.current * streakSpeed) % canvas.height;
    for (let i = 0; i < 5; i++) {
        const sx = (canvas.width / 5) * i + (canvas.width / 10);
        const sy = (streakOffset + (i * canvas.height / 5)) % canvas.height;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, sy + 100);
        ctx.stroke();
    }

    obstaclesRef.current.forEach(obs => {
      ctx.fillStyle = obs.color;
      ctx.shadowBlur = 20;
      ctx.shadowColor = obs.color;
      const r = 8;
      ctx.beginPath();
      ctx.roundRect(obs.x, obs.y, obs.width, obs.height, r);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    particlesRef.current.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    if (gameState === GameState.PLAYING) {
      const p = playerRef.current;
      const dx = p.targetX - p.x;
      const tilt = Math.max(-0.25, Math.min(0.25, dx * 0.008));
      ctx.save();
      ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
      ctx.rotate(tilt);
      ctx.shadowBlur = 40;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.roundRect(-p.width/2, -p.height/2, p.width, p.height, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, p.width / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.shadowBlur = 0;
  }, [gameState]);

  const animate = useCallback((time: number) => {
    const dt = time - (lastTimeRef.current || time);
    lastTimeRef.current = time;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      update(dt);
      draw(ctx);
    }
    requestRef.current = requestAnimationFrame(animate);
  }, [update, draw]);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      lastTimeRef.current = performance.now();
    }
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, animate]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
    />
  );
});

CryptoRunnerCanvas.displayName = 'CryptoRunnerCanvas';

export default CryptoRunnerCanvas;
