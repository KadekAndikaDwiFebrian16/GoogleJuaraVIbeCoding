import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUI } from '../context/UIContext';
import { useLocation } from 'react-router-dom';

function urlB64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const getPushSubscription = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('PushManager or serviceWorker not supported on this browser/OS.');
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const response = await fetch('/api/vapidPublicKey').catch(() => null);
      if (!response) {
        console.warn('Could not fetch public key.');
        return null;
      }
      const data = await response.json().catch(() => null);
      if (!data || !data.publicKey) {
        console.warn('Invalid public key data.');
        return null;
      }
      const convertedVapidKey = urlB64ToUint8Array(data.publicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }
    return subscription;
  } catch (err) {
    console.error('getPushSubscription error:', err);
    return null;
  }
};

export default function CookingTimer() {
  const location = useLocation();
  const { activeComponent, setActiveComponent } = useUI();
  const isOpen = activeComponent === 'timer';
  const setIsOpen = (open: boolean) => setActiveComponent(open ? 'timer' : null);

  const [minutes, setMinutes] = useState(() => {
    const savedMins = localStorage.getItem('cooking_timer_minutes');
    return savedMins ? parseInt(savedMins, 10) : 5;
  });
  const [seconds, setSeconds] = useState(() => {
    const savedSecs = localStorage.getItem('cooking_timer_seconds');
    return savedSecs ? parseInt(savedSecs, 10) : 0;
  });
  const [isActive, setIsActive] = useState(() => {
    return localStorage.getItem('cooking_timer_active') === 'true';
  });
  const [isFinished, setIsFinished] = useState(() => {
    return localStorage.getItem('cooking_timer_finished') === 'true';
  });
  const [showIOSWarning, setShowIOSWarning] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const targetTimeRef = useRef<number | null>(
    localStorage.getItem('cooking_timer_target_time') 
      ? parseInt(localStorage.getItem('cooking_timer_target_time')!, 10) 
      : null
  );
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const webPushTimerIdRef = useRef<string | null>(localStorage.getItem('cooking_timer_push_id') || null);
  const isPlayingAlarmRef = useRef(false);

  // Helper to persist state to localStorage
  const persistTimerState = (active: boolean, finished: boolean, mins: number, secs: number, target: number | null) => {
    try {
      localStorage.setItem('cooking_timer_active', active ? 'true' : 'false');
      localStorage.setItem('cooking_timer_finished', finished ? 'true' : 'false');
      localStorage.setItem('cooking_timer_minutes', mins.toString());
      localStorage.setItem('cooking_timer_seconds', secs.toString());
      localStorage.setItem('cooking_timer_target_time', target ? target.toString() : '');
      if (webPushTimerIdRef.current) {
        localStorage.setItem('cooking_timer_push_id', webPushTimerIdRef.current);
      } else {
        localStorage.removeItem('cooking_timer_push_id');
      }
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
  };

  const clearPersistedState = () => {
    try {
      localStorage.removeItem('cooking_timer_active');
      localStorage.removeItem('cooking_timer_finished');
      localStorage.removeItem('cooking_timer_minutes');
      localStorage.removeItem('cooking_timer_seconds');
      localStorage.removeItem('cooking_timer_target_time');
      localStorage.removeItem('cooking_timer_push_id');
    } catch (e) {
      console.error('Failed to clear state from localStorage', e);
    }
  };

  const scheduleWebPush = async (delayMs: number, subscription: any) => {
    try {
      if (subscription) {
        const timerId = Date.now().toString() + Math.random().toString(36);
        webPushTimerIdRef.current = timerId;
        localStorage.setItem('cooking_timer_push_id', timerId);
        
        const res = await fetch('/api/schedule-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription,
            delayMs,
            timerId,
            payload: {
              title: 'Waktu Memasak Habis! 🍜',
              body: 'Timer Anda telah selesai. Segera periksa masakan Anda!',
              url: window.location.href
            }
          })
        });
        if (!res.ok) {
          webPushTimerIdRef.current = null;
          localStorage.removeItem('cooking_timer_push_id');
        }
      }
    } catch (e) {
      console.error('Failed to schedule web push', e);
      webPushTimerIdRef.current = null;
      localStorage.removeItem('cooking_timer_push_id');
    }
  };

  const cancelWebPush = async () => {
    const currentTimerId = webPushTimerIdRef.current;
    if (currentTimerId) {
      webPushTimerIdRef.current = null;
      localStorage.removeItem('cooking_timer_push_id');
      await fetch('/api/cancel-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timerId: currentTimerId })
      }).catch(() => {});
    }
  };

  useEffect(() => {
    // Create a 1-second silent audio element to keep iOS Safari alive in the background
    const audio = new Audio();
    audio.src = "data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq==";
    audio.loop = true;
    silentAudioRef.current = audio;

    // Load persisted state and check if timer finished while app was closed or tab was destroyed
    const savedActive = localStorage.getItem('cooking_timer_active') === 'true';
    const savedTargetStr = localStorage.getItem('cooking_timer_target_time');
    
    if (savedActive && savedTargetStr) {
      const savedTarget = parseInt(savedTargetStr, 10);
      const now = Date.now();
      
      if (savedTarget <= now) {
        setIsActive(false);
        setIsFinished(true);
        setMinutes(0);
        setSeconds(0);
        targetTimeRef.current = null;
        persistTimerState(false, true, 0, 0, null);
        setIsOpen(true);
        playAlarm({ skipNotification: false });
      } else {
        const remainingMs = savedTarget - now;
        const totalSecs = Math.ceil(remainingMs / 1000);
        setMinutes(Math.floor(totalSecs / 60));
        setSeconds(totalSecs % 60);
        setIsActive(true);
        setIsOpen(true);
      }
    } else if (localStorage.getItem('cooking_timer_finished') === 'true') {
      setIsFinished(true);
      setMinutes(0);
      setSeconds(0);
      setIsOpen(true);
      playAlarm({ skipNotification: false });
    }
  }, []);

  const requestNotificationPermission = async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // Show warning on iOS if not a standalone app because iOS Safari blocks notifications 
    // unless added to the Home Screen.
    if (isIOS && !isStandalone) {
      setShowIOSWarning(true);
    }

    if ('Notification' in window) {
      if (Notification.permission === 'granted') return true;
      if (Notification.permission !== 'denied') {
        try {
          const permission = await Notification.requestPermission();
          return permission === 'granted';
        } catch (e) {
          console.error(e);
        }
      }
    }
    return false;
  };

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
      const ctx = audioContextRef.current;
      if (!ctx || ctx.state !== 'running') return;
      const t = ctx.currentTime;
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t + start);
        gain.gain.setValueAtTime(0, t + start);
        gain.gain.linearRampToValueAtTime(0.4, t + start + Math.min(0.05, duration/2));
        gain.gain.exponentialRampToValueAtTime(0.01, t + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + start);
        osc.stop(t + start + duration);
      };

      // Play a ringing alarm pattern
      playTone(880, 0, 0.15); // A5
      playTone(1046, 0.2, 0.15); // C6
      playTone(880, 0.4, 0.15); // A5
      playTone(1046, 0.6, 0.15); // C6
    } catch (e) {
      console.error('Audio error:', e);
    }
  };

  const playAlarm = async (options?: { skipNotification?: boolean }) => {
    if (isPlayingAlarmRef.current) return;
    isPlayingAlarmRef.current = true;
    await ensureAudioContext();
    if (!isPlayingAlarmRef.current || alarmIntervalRef.current) return;

    playSingleBeep();
    alarmIntervalRef.current = setInterval(() => {
      playSingleBeep();
    }, 1500);

    // Show Notification outside browser
    if (!options?.skipNotification && 'Notification' in window && Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification('Waktu Memasak Habis! 🍜', {
              body: 'Timer Anda telah selesai. Segera periksa masakan Anda!',
              requireInteraction: true,
              vibrate: [200, 100, 200, 100, 200],
              tag: 'cooking-timer'
            } as any).catch(e => {
               // Fallback if ServiceWorker approach fails
               createFallbackNotification();
            });
          }).catch(e => createFallbackNotification());
        } else {
          createFallbackNotification();
        }
      } catch (e) {
        console.error("Notification error:", e);
      }
    }
  };

  const createFallbackNotification = () => {
    try {
      const notification = new Notification('Waktu Memasak Habis! 🍜', {
        body: 'Timer Anda telah selesai. Segera periksa masakan Anda!',
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        tag: 'cooking-timer'
      } as any);
      notification.onclick = () => {
        window.focus();
        stopAlarm();
        setIsFinished(false);
        setIsOpen(true);
        notification.close();
      };
    } catch(e) {
        console.error("Fallback notification error:", e);
    }
  }

  const stopAlarm = () => {
    isPlayingAlarmRef.current = false;
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
  };

  useEffect(() => {
    const handleStartTimer = async (e: any) => {
      const { duration } = e.detail;
      if (duration) {
        silentAudioRef.current?.play().catch(() => {});
        
        // Disable first to fully stop any old alarms, active intervals, and cleanly trigger teardown
        setIsActive(false);
        setIsFinished(false);
        stopAlarm();
        
        // CRITICAL: First cancel any existing push on the server to prevent duplicates
        await cancelWebPush();
        
        // Ask for permission in the active user action sequence
        const permissionGranted = await requestNotificationPermission();
        await ensureAudioContext();
        
        // Subscribe to push notifications safely
        const subscription = permissionGranted ? await getPushSubscription().catch(() => null) : null;
        
        setMinutes(duration);
        setSeconds(0);
        const durationMs = (duration * 60) * 1000;
        const target = Date.now() + durationMs;
        targetTimeRef.current = target;
        
        // Persist local state securely
        persistTimerState(true, false, duration, 0, target);
        
        if (subscription) scheduleWebPush(durationMs, subscription);

        // Turn active back on inside a tiny timeout to ensure React triggers a clean mount cycle of the loop
        setTimeout(() => {
          setIsActive(true);
          setIsOpen(true);
        }, 10);
      }
    };

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data) {
        if (event.data.type === 'TIMER_FINISHED' || event.data.type === 'TIMER_FINISHED_PUSH') {
          stopAlarm();
          setIsActive(false);
          setIsFinished(true);
          setMinutes(0);
          setSeconds(0);
          targetTimeRef.current = null;
          persistTimerState(false, true, 0, 0, null);
          setIsOpen(true);
          playAlarm({ skipNotification: true });
        }
      }
    };

    window.addEventListener('start-cooking-timer', handleStartTimer as EventListener);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }
    
    return () => {
      window.removeEventListener('start-cooking-timer', handleStartTimer as EventListener);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, []);

  useEffect(() => {
    if (isActive) {
      if (!targetTimeRef.current) {
        const target = Date.now() + (minutes * 60 + seconds) * 1000;
        targetTimeRef.current = target;
        persistTimerState(true, false, minutes, seconds, target);
      }

      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const diff = Math.max(0, targetTimeRef.current! - now);
        
        if (diff > 0) {
          const totalSecs = Math.ceil(diff / 1000);
          const mins = Math.floor(totalSecs / 60);
          const secs = totalSecs % 60;
          setMinutes(mins);
          setSeconds(secs);
          persistTimerState(true, false, mins, secs, targetTimeRef.current);
        } else {
          setIsActive(false);
          setIsFinished(true);
          setMinutes(0);
          setSeconds(0);
          targetTimeRef.current = null;
          persistTimerState(false, true, 0, 0, null);
          
          silentAudioRef.current?.pause();
          if ((window as any).backgroundSilentAudio) {
            (window as any).backgroundSilentAudio.pause();
          }
          const hasWebPush = !!webPushTimerIdRef.current;
          playAlarm({ skipNotification: hasWebPush });
          webPushTimerIdRef.current = null;
        }
      }, 1000); // 1-second ticks is plenty of accuracy & resource-friendly
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      stopAlarm();
    };
  }, [isActive]);

  const toggleTimer = async () => {
    if (!isActive) {
      silentAudioRef.current?.play().catch(() => {});
      if ((window as any).backgroundSilentAudio) {
        (window as any).backgroundSilentAudio.play().catch(() => {});
      }
    } else {
      silentAudioRef.current?.pause();
      if ((window as any).backgroundSilentAudio) {
        (window as any).backgroundSilentAudio.pause();
      }
    }

    // Ask for permission in the active user action sequence
    const permissionGranted = await requestNotificationPermission();
    await ensureAudioContext();
    
    // Subscribe to push notifications safely
    const subscription = permissionGranted ? await getPushSubscription().catch(() => null) : null;
    
    const nextActive = !isActive;
    if (nextActive) {
      const remainingMs = (minutes * 60 + seconds) * 1000;
      const target = Date.now() + remainingMs;
      targetTimeRef.current = target;
      persistTimerState(true, false, minutes, seconds, target);
      if (subscription) scheduleWebPush(remainingMs, subscription);
    } else {
      targetTimeRef.current = null;
      persistTimerState(false, false, minutes, seconds, null);
      cancelWebPush();
    }
    setIsActive(nextActive);
  };
  
  const resetTimer = async () => {
    await ensureAudioContext();
    setIsActive(false);
    setIsFinished(false);
    setMinutes(5);
    setSeconds(0);
    targetTimeRef.current = null;
    stopAlarm();
    await cancelWebPush();
    clearPersistedState();
    silentAudioRef.current?.pause();
    if ((window as any).backgroundSilentAudio) {
      (window as any).backgroundSilentAudio.pause();
    }
  };

  const adjustTime = (type: 'min' | 'sec', amount: number) => {
    if (isActive) return;
    let newMins = minutes;
    let newSecs = seconds;
    if (type === 'min') {
      newMins = Math.max(0, minutes + amount);
      setMinutes(newMins);
    } else {
      let newSec = seconds + amount;
      if (newSec >= 60) {
        newMins = minutes + Math.floor(newSec / 60);
        newSecs = newSec % 60;
        setMinutes(newMins);
        setSeconds(newSecs);
      } else if (newSec < 0 && minutes > 0) {
        newMins = Math.max(0, minutes - 1);
        newSecs = 60 + newSec;
        setMinutes(newMins);
        setSeconds(newSecs);
      } else {
        newSecs = Math.max(0, newSec);
        setSeconds(newSecs);
      }
    }
    persistTimerState(false, false, newMins, newSecs, null);
  };

  const isRecipePage = location.pathname.startsWith('/recipe') || location.pathname.startsWith('/custom-recipe');

  useEffect(() => {
    if (!isRecipePage) {
      resetTimer();
    }
  }, [isRecipePage]);

  if (!isRecipePage) return null;

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
              <button 
                onClick={(e) => { e.stopPropagation(); resetTimer(); }} 
                className="text-gray-400 hover:text-gray-600 flex items-center justify-center w-6 h-6"
              >
                <RotateCcw size={14} />
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

              {showIOSWarning && !isFinished && (
                 <motion.div
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   className="mt-6 p-4 bg-orange-50 rounded-xl"
                 >
                   <p className="text-orange-800 text-[10px] font-bold uppercase tracking-widest mb-1">Penting untuk iOS</p>
                   <p className="text-orange-600/80 text-[10px] leading-relaxed">
                     Agar notifikasi dan alarm berfungsi penuh, ketuk ikon bagikan <Share size={10} className="inline mx-1" /> di bawah layar Safari Anda, lalu pilih <strong>"Tambah ke Layar Utama"</strong>.
                   </p>
                 </motion.div>
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
