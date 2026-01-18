import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

export type MusicTheme = 'lobby' | 'searcher' | 'guesser' | 'victory' | 'defeat';

interface AudioContextType {
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  toggleMute: () => void;
  volume: number;
  setVolume: (volume: number) => void;
  playHover: () => void;
  playClick: () => void;
  playBackgroundMusic: (theme: MusicTheme) => void;
  stopBackgroundMusic: () => void;
  setMusicIntensity: (level: number) => void;
}

const AudioContextReact = createContext<AudioContextType>({
  isMuted: false,
  setIsMuted: () => {},
  toggleMute: () => {},
  volume: 0.4,
  setVolume: () => {},
  playHover: () => {},
  playClick: () => {},
  playBackgroundMusic: () => {},
  stopBackgroundMusic: () => {},
  setMusicIntensity: () => {},
});

export function useAudio() {
  return useContext(AudioContextReact);
}

// Music file paths - add more files for different themes if needed
const MUSIC_FILES: Record<MusicTheme, string> = {
  lobby: '/lobby-music.wav',
  searcher: '/lobby-music.wav',
  guesser: '/lobby-music.wav',
  victory: '/lobby-music.wav',
  defeat: '/lobby-music.wav',
};

// Simple sound effect using Web Audio API
function playSimpleBeep(frequency: number, duration: number, volume: number) {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (e) {
    // Silently fail if Web Audio API not available
  }
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
  
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const currentThemeRef = useRef<MusicTheme | null>(null);

  // Save mute state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('audio_muted', String(isMuted));
    } catch {}
  }, [isMuted]);

  // Update music volume when muted state changes
  useEffect(() => {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.volume = isMuted ? 0 : volume * 0.3;
    }
  }, [isMuted, volume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current = null;
      }
    };
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev: boolean) => !prev);
  }, []);

  const setVolume = useCallback(() => {}, []);

  const playHover = useCallback(() => {
    if (isMuted) return;
    playSimpleBeep(1200, 0.06, 0.06 * volume);
  }, [isMuted, volume]);

  const playClick = useCallback(() => {
    if (isMuted) return;
    playSimpleBeep(800, 0.08, 0.12 * volume);
  }, [isMuted, volume]);

  const playBackgroundMusic = useCallback((theme: MusicTheme) => {
    console.log(`🎵 Playing ${theme} music`);
    
    // Don't restart if already playing same theme
    if (currentThemeRef.current === theme && backgroundMusicRef.current) {
      console.log(`🎵 Already playing ${theme}`);
      return;
    }

    try {
      // Stop current music
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current.currentTime = 0;
      }

      // Create and play new audio
      const audio = new Audio(MUSIC_FILES[theme]);
      audio.loop = true;
      audio.volume = isMuted ? 0 : volume * 0.3;
      
      audio.play()
        .then(() => console.log(`✅ ${theme} music playing`))
        .catch((err) => {
          console.error(`❌ Failed to play ${theme}:`, err);
          console.log('💡 Click anywhere on page to enable audio');
        });

      backgroundMusicRef.current = audio;
      currentThemeRef.current = theme;
    } catch (error) {
      console.error('Music playback error:', error);
    }
  }, [isMuted, volume]);

  const stopBackgroundMusic = useCallback(() => {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current.currentTime = 0;
      backgroundMusicRef.current = null;
      currentThemeRef.current = null;
      console.log('🔇 Music stopped');
    }
  }, []);

  const setMusicIntensity = useCallback((level: number) => {
    if (!backgroundMusicRef.current) return;
    
    const clampedLevel = Math.max(0, Math.min(1, level));
    const baseVolume = isMuted ? 0 : volume * 0.3;
    const intensityBoost = 1 + (clampedLevel * 0.3);
    
    backgroundMusicRef.current.volume = Math.min(1, baseVolume * intensityBoost);
  }, [isMuted, volume]);

  return (
    <AudioContextReact.Provider 
      value={{ 
        isMuted, 
        setIsMuted, 
        toggleMute, 
        volume, 
        setVolume, 
        playHover, 
        playClick,
        playBackgroundMusic,
        stopBackgroundMusic,
        setMusicIntensity
      }}
    >
      {children}
    </AudioContextReact.Provider>
  );
}
