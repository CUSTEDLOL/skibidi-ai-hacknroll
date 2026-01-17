import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

interface AudioContextType {
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  toggleMute: () => void;
  volume: number;
  setVolume: (volume: number) => void;
  playHover: () => void;
  playClick: () => void;
}

const AudioContextReact = createContext<AudioContextType>({
  isMuted: false,
  setIsMuted: () => {},
  toggleMute: () => {},
  volume: 0.4,
  setVolume: () => {},
  playHover: () => {},
  playClick: () => {},
});

export function useAudio() {
  return useContext(AudioContextReact);
}

// Atmospheric spy-themed ambient drone
function createAmbientSound(audioContext: AudioContext, gainNode: GainNode) {
  // Deep pad oscillators for mysterious atmosphere
  const oscillators: OscillatorNode[] = [];
  const gains: GainNode[] = [];
  
  const frequencies = [55, 110, 165]; // A1, A2, E3 - dark minor feel
  const volumes = [0.03, 0.02, 0.01];
  
  frequencies.forEach((freq, i) => {
    const osc = audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioContext.currentTime);
    
    // Slight detune for richness
    if (i > 0) {
      osc.detune.setValueAtTime(i * 3, audioContext.currentTime);
    }
    
    const oscGain = audioContext.createGain();
    oscGain.gain.setValueAtTime(volumes[i], audioContext.currentTime);
    
    // Low-pass filter for warmth
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, audioContext.currentTime);
    filter.Q.setValueAtTime(0.5, audioContext.currentTime);
    
    osc.connect(filter);
    filter.connect(oscGain);
    oscGain.connect(gainNode);
    
    oscillators.push(osc);
    gains.push(oscGain);
  });
  
  // Slow LFO for gentle movement
  const lfo = audioContext.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.03, audioContext.currentTime);
  
  const lfoGain = audioContext.createGain();
  lfoGain.gain.setValueAtTime(2, audioContext.currentTime);
  
  lfo.connect(lfoGain);
  if (oscillators[0]) {
    lfoGain.connect(oscillators[0].frequency);
  }
  
  // Very subtle filtered noise for texture
  const bufferSize = audioContext.sampleRate * 2;
  const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  
  const noise = audioContext.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  
  const noiseFilter = audioContext.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(100, audioContext.currentTime);
  noiseFilter.Q.setValueAtTime(0.2, audioContext.currentTime);
  
  const noiseGain = audioContext.createGain();
  noiseGain.gain.setValueAtTime(0.005, audioContext.currentTime);
  
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(gainNode);
  
  // Start all sources
  oscillators.forEach(osc => osc.start());
  lfo.start();
  noise.start();
  
  return {
    stop: () => {
      oscillators.forEach(osc => { try { osc.stop(); } catch {} });
      try { lfo.stop(); } catch {}
      try { noise.stop(); } catch {}
    }
  };
}

// Hover sound - subtle digital blip
function playHoverSound(audioContext: AudioContext, volume: number) {
  const osc = audioContext.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, audioContext.currentTime);
  osc.frequency.exponentialRampToValueAtTime(900, audioContext.currentTime + 0.06);
  
  const oscGain = audioContext.createGain();
  oscGain.gain.setValueAtTime(0.06 * volume, audioContext.currentTime);
  oscGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.06);
  
  osc.connect(oscGain);
  oscGain.connect(audioContext.destination);
  
  osc.start();
  osc.stop(audioContext.currentTime + 0.08);
}

// Click sound - satisfying mechanical click
function playClickSound(audioContext: AudioContext, volume: number) {
  const osc = audioContext.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(120, audioContext.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, audioContext.currentTime + 0.04);
  
  const oscGain = audioContext.createGain();
  oscGain.gain.setValueAtTime(0.12 * volume, audioContext.currentTime);
  oscGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);
  
  osc.connect(oscGain);
  oscGain.connect(audioContext.destination);
  
  osc.start();
  osc.stop(audioContext.currentTime + 0.08);
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(() => {
    try {
      const saved = localStorage.getItem('audio_muted');
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const [volume] = useState(0.4);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const ambientRef = useRef<{ stop: () => void } | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize audio on first user interaction
  const initializeAudio = useCallback(() => {
    if (isInitializedRef.current) return;
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('Web Audio API not supported');
        return;
      }
      
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;
      
      // Create master gain node
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(isMuted ? 0 : volume * 0.5, ctx.currentTime);
      masterGain.connect(ctx.destination);
      gainNodeRef.current = masterGain;
      
      // Start ambient sound
      ambientRef.current = createAmbientSound(ctx, masterGain);
      isInitializedRef.current = true;
      
      console.log('Audio system initialized');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  }, [isMuted, volume]);

  // Set up user interaction listeners
  useEffect(() => {
    const handleInteraction = () => {
      initializeAudio();
      // Resume if suspended (browser policy)
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };
    
    // Listen for various user interactions
    const events = ['click', 'keydown', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleInteraction, { once: false, passive: true });
    });
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction);
      });
    };
  }, [initializeAudio]);

  // Update gain when muted changes
  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      const targetGain = isMuted ? 0 : volume * 0.5;
      gainNodeRef.current.gain.linearRampToValueAtTime(
        targetGain, 
        audioContextRef.current.currentTime + 0.1
      );
    }
    try {
      localStorage.setItem('audio_muted', String(isMuted));
    } catch {}
  }, [isMuted, volume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ambientRef.current?.stop();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev: boolean) => !prev);
  }, []);

  const setVolume = useCallback(() => {}, []);

  const playHover = useCallback(() => {
    if (isMuted || !audioContextRef.current) return;
    
    // Ensure context is running
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    try {
      playHoverSound(audioContextRef.current, volume);
    } catch (e) {
      console.error('Hover sound error:', e);
    }
  }, [isMuted, volume]);

  const playClick = useCallback(() => {
    if (isMuted || !audioContextRef.current) return;
    
    // Ensure context is running
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    try {
      playClickSound(audioContextRef.current, volume);
    } catch (e) {
      console.error('Click sound error:', e);
    }
  }, [isMuted, volume]);

  return (
    <AudioContextReact.Provider value={{ isMuted, setIsMuted, toggleMute, volume, setVolume, playHover, playClick }}>
      {children}
    </AudioContextReact.Provider>
  );
}
