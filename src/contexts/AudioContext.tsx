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

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}

// Create atmospheric spy-themed ambient sound
function createAmbientSound(audioContext: AudioContext, gainNode: GainNode) {
  // Very subtle, pleasant pad sound
  const createPad = (freq: number, gain: number, detune: number = 0) => {
    const osc = audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioContext.currentTime);
    osc.detune.setValueAtTime(detune, audioContext.currentTime);
    
    const oscGain = audioContext.createGain();
    oscGain.gain.setValueAtTime(gain, audioContext.currentTime);
    
    // Add subtle filter for warmth
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
    createPad(65.41, 0.04, 0),      // C2 - very low base
    createPad(130.81, 0.025, 3),    // C3 - octave up, slight detune
    createPad(196.00, 0.015, -2),   // G3 - fifth
  ];

  // Slow LFO for gentle movement
  const lfo = audioContext.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.05, audioContext.currentTime); // Very slow
  
  const lfoGain = audioContext.createGain();
  lfoGain.gain.setValueAtTime(3, audioContext.currentTime);
  
  lfo.connect(lfoGain);
  // Modulate the first pad's frequency slightly
  lfoGain.connect(pads[0].osc.frequency);

  // Very subtle filtered noise for atmosphere
  const bufferSize = audioContext.sampleRate * 2;
  const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  
  const noise = audioContext.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  
  // Heavy filtering for subtle texture
  const noiseFilter = audioContext.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(150, audioContext.currentTime);
  noiseFilter.Q.setValueAtTime(0.3, audioContext.currentTime);
  
  const noiseGain = audioContext.createGain();
  noiseGain.gain.setValueAtTime(0.008, audioContext.currentTime);
  
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(gainNode);

  // Start everything
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

// Create hover sound - subtle high blip
function playHoverSound(audioContext: AudioContext, gainNode: GainNode, volume: number) {
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

// Create click sound - satisfying mechanical click
function playClickSound(audioContext: AudioContext, gainNode: GainNode, volume: number) {
  // Click body
  const osc = audioContext.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(150, audioContext.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.05);
  
  const oscGain = audioContext.createGain();
  oscGain.gain.setValueAtTime(0.15 * volume, audioContext.currentTime);
  oscGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.06);
  
  // Add some noise for texture
  const bufferSize = audioContext.sampleRate * 0.05;
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
    const saved = localStorage.getItem('audio_muted');
    return saved ? JSON.parse(saved) : false;
  });
  const [volume, setVolume] = useState(0.4);
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
      masterGain.gain.setValueAtTime(isMuted ? 0 : volume * 0.5, ctx.currentTime);
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
      const targetGain = isMuted ? 0 : volume * 0.5;
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

  const playHover = useCallback(() => {
    if (isMuted || !audioContextRef.current) return;
    playHoverSound(audioContextRef.current, gainNodeRef.current!, volume);
  }, [isMuted, volume]);

  const playClick = useCallback(() => {
    if (isMuted || !audioContextRef.current) return;
    playClickSound(audioContextRef.current, gainNodeRef.current!, volume);
  }, [isMuted, volume]);

  return (
    <AudioContext.Provider value={{ isMuted, setIsMuted, toggleMute, volume, setVolume, playHover, playClick }}>
      {children}
    </AudioContext.Provider>
  );
}
