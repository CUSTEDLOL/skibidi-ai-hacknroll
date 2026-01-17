import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

interface AudioContextType {
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  toggleMute: () => void;
  volume: number;
  setVolume: (volume: number) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}

// Create ambient spy-themed drone using Web Audio API
function createAmbientSound(audioContext: AudioContext, gainNode: GainNode) {
  const oscillators: OscillatorNode[] = [];
  const gains: GainNode[] = [];

  // Base drone - low frequency
  const drone1 = audioContext.createOscillator();
  drone1.type = 'sine';
  drone1.frequency.setValueAtTime(55, audioContext.currentTime); // Low A
  const drone1Gain = audioContext.createGain();
  drone1Gain.gain.setValueAtTime(0.15, audioContext.currentTime);
  drone1.connect(drone1Gain);
  drone1Gain.connect(gainNode);
  oscillators.push(drone1);
  gains.push(drone1Gain);

  // Second harmonic
  const drone2 = audioContext.createOscillator();
  drone2.type = 'sine';
  drone2.frequency.setValueAtTime(82.5, audioContext.currentTime); // Perfect fifth above
  const drone2Gain = audioContext.createGain();
  drone2Gain.gain.setValueAtTime(0.08, audioContext.currentTime);
  drone2.connect(drone2Gain);
  drone2Gain.connect(gainNode);
  oscillators.push(drone2);
  gains.push(drone2Gain);

  // High mysterious tone with LFO modulation
  const highTone = audioContext.createOscillator();
  highTone.type = 'triangle';
  highTone.frequency.setValueAtTime(440, audioContext.currentTime);
  const highToneGain = audioContext.createGain();
  highToneGain.gain.setValueAtTime(0.02, audioContext.currentTime);
  
  // LFO for subtle wobble
  const lfo = audioContext.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.1, audioContext.currentTime);
  const lfoGain = audioContext.createGain();
  lfoGain.gain.setValueAtTime(0.01, audioContext.currentTime);
  lfo.connect(lfoGain);
  lfoGain.connect(highToneGain.gain);
  
  highTone.connect(highToneGain);
  highToneGain.connect(gainNode);
  oscillators.push(highTone, lfo);
  gains.push(highToneGain, lfoGain);

  // Subtle noise for texture
  const bufferSize = audioContext.sampleRate * 2;
  const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  
  const noise = audioContext.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  
  // Filter the noise to make it more subtle
  const noiseFilter = audioContext.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.setValueAtTime(200, audioContext.currentTime);
  
  const noiseGain = audioContext.createGain();
  noiseGain.gain.setValueAtTime(0.03, audioContext.currentTime);
  
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(gainNode);

  // Start all oscillators
  oscillators.forEach(osc => osc.start());
  noise.start();

  return {
    stop: () => {
      oscillators.forEach(osc => {
        try { osc.stop(); } catch {}
      });
      try { noise.stop(); } catch {}
    }
  };
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('audio_muted');
    return saved ? JSON.parse(saved) : false;
  });
  const [volume, setVolume] = useState(0.3);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const ambientRef = useRef<{ stop: () => void } | null>(null);

  const initAudio = useCallback(() => {
    if (isInitialized || audioContextRef.current) return;
    
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(isMuted ? 0 : volume, ctx.currentTime);
      masterGain.connect(ctx.destination);
      gainNodeRef.current = masterGain;
      
      ambientRef.current = createAmbientSound(ctx, masterGain);
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  }, [isInitialized, isMuted, volume]);

  // Initialize on first user interaction
  useEffect(() => {
    const handleInteraction = () => {
      initAudio();
      // Remove listeners after first interaction
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, [initAudio]);

  // Update gain when muted/volume changes
  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      const targetGain = isMuted ? 0 : volume;
      gainNodeRef.current.gain.linearRampToValueAtTime(
        targetGain, 
        audioContextRef.current.currentTime + 0.1
      );
    }
    localStorage.setItem('audio_muted', JSON.stringify(isMuted));
  }, [isMuted, volume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ambientRef.current?.stop();
      audioContextRef.current?.close();
    };
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev: boolean) => !prev);
  }, []);

  return (
    <AudioContext.Provider value={{ isMuted, setIsMuted, toggleMute, volume, setVolume }}>
      {children}
    </AudioContext.Provider>
  );
}
