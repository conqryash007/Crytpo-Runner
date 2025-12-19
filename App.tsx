
import React, { useState, useEffect, useRef } from 'react';
import { GameState } from './types';
import CryptoRunnerCanvas from './components/CryptoRunnerCanvas';
import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import { useAppKitProvider } from '@reown/appkit/react';
import { BrowserProvider, formatEther } from 'ethers';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [balance, setBalance] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const canvasRef = useRef<{ move: (dir: 'left' | 'right') => void } | null>(null);

  // WalletConnect hooks
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { disconnect } = useDisconnect();
  const { walletProvider } = useAppKitProvider<any>('eip155');

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('crypto-runner-highscore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // Update balance when connected
  useEffect(() => {
    const fetchBalance = async () => {
      if (isConnected && walletProvider && address) {
        try {
          const provider = new BrowserProvider(walletProvider);
          const bal = await provider.getBalance(address);
          setBalance(parseFloat(formatEther(bal)).toFixed(4));
        } catch (e) {
          console.error("Balance fetch failed", e);
          setBalance(null);
        }
      } else {
        setBalance(null);
      }
    };
    fetchBalance();
  }, [isConnected, walletProvider, address]);

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const connectWallet = () => {
    open({ view: 'Connect' });
  };

  const disconnectWallet = async () => {
    await disconnect();
    setBalance(null);
  };

  const startGame = () => {
    if (!isConnected) {
      open({ view: 'Connect' });
      return;
    }
    setScore(0);
    setGameState(GameState.PLAYING);
  };

  const handleGameOver = (finalScore: number) => {
    setScore(finalScore);
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('crypto-runner-highscore', finalScore.toString());
    }
    setGameState(GameState.GAMEOVER);
  };

  const handleControlClick = (dir: 'left' | 'right', e: React.MouseEvent | React.TouchEvent) => {
    if (e.cancelable) e.preventDefault();
    canvasRef.current?.move(dir);
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans select-none touch-none">
      {/* HUD */}
      {gameState === GameState.PLAYING && (
        <div className="absolute top-4 left-0 right-0 flex justify-between px-6 z-10 pointer-events-none">
          <div className="flex flex-col">
            <div className="text-white text-3xl font-black italic tracking-tighter drop-shadow-md">
              {Math.floor(score)}
            </div>
            {balance && (
              <div className="text-blue-400 text-[10px] font-mono font-bold bg-black/30 px-2 py-0.5 rounded border border-blue-500/20 backdrop-blur-sm self-start">
                {balance} ETH
              </div>
            )}
          </div>
          {address && (
            <div className="flex flex-col items-end">
              <div className="text-blue-200 text-[10px] bg-blue-900/60 px-3 py-1 rounded-full backdrop-blur-md border border-blue-500/40 font-mono shadow-lg">
                {truncateAddress(address)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* GAME CANVAS */}
      <CryptoRunnerCanvas 
        ref={canvasRef}
        gameState={gameState} 
        onGameOver={handleGameOver} 
        onScoreUpdate={setScore}
      />

      {/* ON-SCREEN CONTROLS */}
      {gameState === GameState.PLAYING && (
        <div className="absolute bottom-12 left-0 right-0 px-8 flex justify-between pointer-events-none z-30">
          <button
            onMouseDown={(e) => handleControlClick('left', e)}
            onTouchStart={(e) => handleControlClick('left', e)}
            className="pointer-events-auto w-20 h-20 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center active:bg-blue-600 active:scale-95 transition-all shadow-2xl"
          >
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onMouseDown={(e) => handleControlClick('right', e)}
            onTouchStart={(e) => handleControlClick('right', e)}
            className="pointer-events-auto w-20 h-20 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center active:bg-blue-600 active:scale-95 transition-all shadow-2xl"
          >
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* START SCREEN OVERLAY */}
      {gameState === GameState.START && (
        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 z-20 text-center">
          <div className="mb-12 relative">
            <div className="absolute -inset-10 bg-blue-500/10 blur-3xl rounded-full"></div>
            <h1 className="relative text-6xl font-black text-white mb-2 italic tracking-tighter drop-shadow-xl">
              CRYPTO RUNNER
            </h1>
            <p className="relative text-blue-400 font-mono tracking-[0.4em] text-[10px] uppercase font-bold">
              Base Ecosystem Edition
            </p>
          </div>

          <div className="flex flex-col items-center gap-6 w-full max-w-xs relative z-10">
            {/* Connect Wallet Button - Primary action when not connected */}
            {!isConnected ? (
              <>
                <button
                  onClick={connectWallet}
                  className="w-full py-5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black rounded-2xl text-xl shadow-xl transition-all active:translate-y-1 flex items-center justify-center gap-3"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  CONNECT WALLET
                </button>
                <p className="text-white/40 text-xs font-mono">
                  Connect your wallet to start playing
                </p>
              </>
            ) : (
              <>
                {/* Wallet Connected - Show info and play button */}
                <div className="w-full flex items-center justify-between bg-blue-900/20 px-4 py-3 rounded-2xl border border-blue-500/30 backdrop-blur-md">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-pulse"></div>
                    <div>
                      <div className="text-blue-100 font-mono text-xs">{truncateAddress(address!)}</div>
                      {balance && <div className="text-blue-400 text-[10px] font-mono">{balance} ETH</div>}
                    </div>
                  </div>
                  <button onClick={disconnectWallet} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                    <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
                    </svg>
                  </button>
                </div>

                <button
                  onClick={startGame}
                  className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl text-2xl shadow-xl transition-all active:translate-y-1"
                >
                  START RUNNING
                </button>
              </>
            )}
          </div>
          
          <div className="mt-20 text-white/20 text-[10px] max-w-xs leading-relaxed font-mono uppercase tracking-widest font-bold">
            DODGE <span className="text-red-500/40">VULNERABILITY</span><br/>
            BUILD ON <span className="text-blue-500/40">THE BASE</span>
          </div>
        </div>
      )}

      {/* GAME OVER SCREEN OVERLAY */}
      {gameState === GameState.GAMEOVER && (
        <div className="absolute inset-0 bg-red-950/95 flex flex-col items-center justify-center p-6 z-40 text-center">
          <div className="mb-10">
            <h2 className="text-7xl font-black text-white mb-2 italic tracking-tighter">REKT!</h2>
            <p className="text-red-400 font-mono text-xs uppercase tracking-[0.4em] font-bold">Volatile Market Crash</p>
          </div>
          
          <div className="grid grid-cols-2 gap-12 mb-16">
            <div className="flex flex-col items-center">
              <p className="text-red-500 text-[10px] uppercase tracking-widest font-bold mb-1 opacity-60">Profit</p>
              <p className="text-5xl font-black text-white italic">{Math.floor(score)}</p>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-blue-500 text-[10px] uppercase tracking-widest font-bold mb-1 opacity-60">Best</p>
              <p className="text-5xl font-black text-white italic">{highScore}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full max-w-xs">
            <button
              onClick={startGame}
              className="w-full py-5 bg-white text-red-950 font-black rounded-2xl text-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-95"
            >
              RESUME MINING
            </button>
            
            {address && (
              <button 
                onClick={() => window.open(`https://basescan.org/address/${address}`, '_blank')}
                className="py-3 text-white/40 text-[10px] uppercase tracking-widest font-bold hover:text-white/60 transition-colors pointer-events-auto border border-white/5 rounded-xl bg-white/5"
              >
                Inspect Ledger
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
