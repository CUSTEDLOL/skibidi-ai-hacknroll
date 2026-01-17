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

// Create atmospheric spy-themed ambient sound
function createAmbientSound(audioContext: AudioContext, gainNode: GainNode) {
  const createPad = (freq: number, gain: number, detune: number = 0) => {
    const osc = audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioContext.currentTime);
    osc.detune.setValueAtTime(detune, audioContext.currentTime);
    
    const oscGain = audioContext.createGain();
    oscGain.gain.setValueAtTime(gain, audioContext.currentTime);
    
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, audioContext.currentTime);
    filter.Q.setValueAtTime(0.5, audioContext.currentTime);
    
    osc.connect(filter);
    filter.connect(oscGain);
    oscGain.connect(gainNode);
    
    return { osc, oscGain };
  };

  const pads = [
    createPad(65.41, 0.04, 0),
    createPad(130.81, 0.025, 3),
    createPad(196.00, 0.015, -2),
  ];

  const lfo = audioContext.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.05, audioContext.currentTime);
  
  const lfoGain = audioContext.createGain();
  lfoGain.gain.setValueAtTime(3, audioContext.currentTime);
  
  lfo.connect(lfoGain);
  lfoGain.connect(pads[0].osc.frequency);

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
  noiseFilter.frequency.setValueAtTime(150, audioContext.currentTime);
  noiseFilter.Q.setValueAtTime(0.3, audioContext.currentTime);
  
  const noiseGain = audioContext.createGain();
  noiseGain.gain.setValueAtTime(0.008, audioContext.currentTime);
  
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(gainNode);

  pads.forEach(p => p.osc.start());
  lfo.start();
  noise.start();

  return {
    stop: () => {
      pads.forEach(p => { try { p.osc.stop(); } catch {} });
      try { lfo.stop(); } catch {}
      try { noise.stop(); } catch {}
    }
  };
}

// Hover sound - subtle high blip
function playHoverSound(audioContext: AudioContext, volume: number) {
  const osc = audioContext.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, audioContext.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.08);
  
  const oscGain = audioContext.createGain();
  oscGain.gain.setValueAtTime(0.08 * volume, audioContext.currentTime);
  oscGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.08);
  
  const filter = audioContext.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1000, audioContext.currentTime);
  filter.Q.setValueAtTime(2, audioContext.currentTime);
  
  osc.connect(filter);
  filter.connect(oscGain);
  oscGain.connect(audioContext.destination);
  
  osc.start();
  osc.stop(audioContext.currentTime + 0.1);
}

// Click sound - satisfying mechanical click
function playClickSound(audioContext: AudioContext, volume: number) {
  const osc = audioContext.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(150, audioContext.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.05);
  
  const oscGain = audioContext.createGain();
  oscGain.gain.setValueAtTime(0.15 * volume, audioContext.currentTime);
  oscGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.06);
  
  const bufferSize = Math.floor(audioContext.sampleRate * 0.05);
  const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  
  const noise = audioContext.createBufferSource();
  noise.buffer = noiseBuffer;
  
  const noiseFilter = audioContext.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.setValueAtTime(2000, audioContext.currentTime);
  
  const noiseGain = audioContext.createGain();
  noiseGain.gain.setValueAtTime(0.1 * volume, audioContext.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.04);
  
  osc.connect(oscGain);
  oscGain.connect(audioContext.destination);
  
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(audioContext.destination);
  
  osc.start();
  noise.start();
  osc.stop(audioContext.currentTime + 0.1);
  noise.stop(audioContext.currentTime + 0.1);
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(() => {
    try {
      const saved = localStorage.getItem('audio_muted');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [volume] = useState(0.4);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const ambientRef = useRef<{ stop: () => void } | null>(null);
  const isInitializedRef = useRef(false);

  const getOrCreateAudioContext = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      // Resume if suspended
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      return audioContextRef.current;
    }
    
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(isMuted ? 0 : volume * 0.5, ctx.currentTime);
      masterGain.connect(ctx.destination);
      gainNodeRef.current = masterGain;
      
      // Start ambient on first creation
      if (!isInitializedRef.current) {
        ambientRef.current = createAmbientSound(ctx, masterGain);
        isInitializedRef.current = true;
      }
      
      return ctx;
    } catch (error) {
      console.error('Failed to create audio context:', error);
      return null;
    }
  }, [isMuted, volume]);

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
      localStorage.setItem('audio_muted', JSON.stringify(isMuted));
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
    if (isMuted) return;
    const ctx = getOrCreateAudioContext();
    if (ctx) {
      try {
        playHoverSound(ctx, volume);
      } catch (e) {
        console.error('Hover sound error:', e);
      }
    }
  }, [isMuted, volume, getOrCreateAudioContext]);

  const playClick = useCallback(() => {
    if (isMuted) return;
    const ctx = getOrCreateAudioContext();
    if (ctx) {
      try {
        playClickSound(ctx, volume);
      } catch (e) {
        console.error('Click sound error:', e);
      }
    }
  }, [isMuted, volume, getOrCreateAudioContext]);

  return (
    <AudioContextReact.Provider value={{ isMuted, setIsMuted, toggleMute, volume, setVolume, playHover, playClick }}>
      {children}
    </AudioContextReact.Provider>
  );
}
