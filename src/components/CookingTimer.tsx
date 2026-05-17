import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUI } from '../context/UIContext';

export default function CookingTimer() {
  const { activeComponent, setActiveComponent } = useUI();
  const isOpen = activeComponent === 'timer';
  const setIsOpen = (open: boolean) => setActiveComponent(open ? 'timer' : null);

  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const ensureAudioContext = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
    } catch (e) {
      console.error('Failed to resume audio context:', e);
    }
  };

  const playSingleBeep = () => {
    try {
      ensureAudioContext();
      const ctx = audioContextRef.current;
      if (!ctx) return;
      const t = ctx.currentTime;
      
      const playBeep = (timeOffset: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, t + timeOffset); // A5
        gain.gain.setValueAtTime(0, t + timeOffset);
        gain.gain.linearRampToValueAtTime(0.3, t + timeOffset + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, t + timeOffset + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + timeOffset);
        osc.stop(t + timeOffset + 0.2);
      };

      playBeep(0);
      playBeep(0.25);
    } catch (e) {
      console.error('Audio error:', e);
    }
  };

  const playAlarm = () => {
    if (alarmIntervalRef.current) return;
    playSingleBeep();
    alarmIntervalRef.current = setInterval(() => {
      playSingleBeep();
    }, 1000);
  };

  const stopAlarm = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
  };

  useEffect(() => {
    const handleStartTimer = (e: any) => {
      const { duration } = e.detail;
      if (duration) {
        setMinutes(duration);
        setSeconds(0);
        setIsActive(true);
        setIsOpen(true);
        setIsFinished(false);
      }
    };

    window.addEventListener('start-cooking-timer', handleStartTimer as EventListener);
    return () => window.removeEventListener('start-cooking-timer', handleStartTimer as EventListener);
  }, []);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        } else if (minutes > 0) {
          setMinutes(minutes - 1);
          setSeconds(59);
        } else {
          setIsActive(false);
          setIsFinished(true);
          playAlarm();
        }
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      stopAlarm();
    };
  }, [isActive, minutes, seconds]);

  const toggleTimer = async () => {
    await ensureAudioContext();
    setIsActive(!isActive);
  };
  
  const resetTimer = async () => {
    await ensureAudioContext();
    setIsActive(false);
    setIsFinished(false);
    setMinutes(5);
    setSeconds(0);
    stopAlarm();
  };

  const adjustTime = (type: 'min' | 'sec', amount: number) => {
    if (isActive) return;
    if (type === 'min') {
      setMinutes(Math.max(0, minutes + amount));
    } else {
      let newSec = seconds + amount;
      if (newSec >= 60) {
        setMinutes(minutes + 1);
        setSeconds(newSec - 60);
      } else if (newSec < 0 && minutes > 0) {
        setMinutes(minutes - 1);
        setSeconds(59);
      } else {
        setSeconds(Math.max(0, newSec));
      }
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-[120]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-full left-0 mb-4 w-[calc(100vw-48px)] sm:w-64 bg-white rounded-3xl shadow-xl shadow-orange-100/30 p-6 border border-gray-100 overflow-hidden"
          >
            {isFinished && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-orange-600/10 flex flex-col items-center justify-center pointer-events-none"
              >
                <div className="hidden md:block animate-ping bg-orange-600 w-12 h-12 rounded-full opacity-20"></div>
                {!window.matchMedia('(min-width: 768px)').matches && (
                  <div className="bg-orange-600/20 w-full h-full animate-pulse" />
                )}
              </motion.div>
            )}

            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Shotclock Memasak</span>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <RotateCcw size={14} onClick={(e) => { e.stopPropagation(); resetTimer(); }} />
              </button>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex flex-col items-center">
                  <button onClick={() => adjustTime('min', 1)} className="text-gray-300 hover:text-gray-600 px-2">▲</button>
                  <span className="text-4xl font-black text-gray-900 tabular-nums">{minutes.toString().padStart(2, '0')}</span>
                  <button onClick={() => adjustTime('min', -1)} className="text-gray-300 hover:text-gray-600 px-2">▼</button>
                </div>
                <span className="text-4xl font-black text-gray-200">:</span>
                <div className="flex flex-col items-center">
                  <button onClick={() => adjustTime('sec', 10)} className="text-gray-300 hover:text-gray-600 px-2">▲</button>
                  <span className="text-4xl font-black text-gray-900 tabular-nums">{seconds.toString().padStart(2, '0')}</span>
                  <button onClick={() => adjustTime('sec', -10)} className="text-gray-300 hover:text-gray-600 px-2">▼</button>
                </div>
              </div>

              <div className="flex gap-3 w-full">
                {isFinished ? (
                  <button
                    onClick={resetTimer}
                    className="flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm bg-orange-600 text-white hover:bg-orange-700 shadow-orange-100"
                  >
                    <span className="text-xs font-bold uppercase tracking-widest">Matikan Alarm</span>
                  </button>
                ) : (
                  <button
                    onClick={toggleTimer}
                    className={`flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm ${
                      isActive 
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                        : 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-100'
                    }`}
                  >
                    {isActive ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
                    <span className="text-xs font-bold uppercase tracking-widest">{isActive ? 'Pause' : 'Start'}</span>
                  </button>
                )}
              </div>

              {isFinished && (
                <motion.p 
                  initial={{ y: 5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="mt-4 text-orange-600 text-[10px] font-bold uppercase tracking-widest animate-pulse"
                >
                  Waktu Habis! 🍜
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-500 ${
          isOpen ? 'bg-gray-900 text-white' : 'bg-white text-orange-600 border border-gray-100'
        } ${isActive ? 'ring-4 ring-orange-100' : ''}`}
      >
        {isActive ? (
          <span className="text-[10px] font-black tabular-nums">{minutes}:{seconds.toString().padStart(2, '0')}</span>
        ) : (
          <Timer size={24} />
        )}
      </motion.button>
    </div>
  );
}
