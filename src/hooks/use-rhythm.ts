import { useEffect, useState, useCallback } from 'react';
import { getRhythmEngine } from '@/lib/rhythmEngine';

export function useRhythm(bpm: number, enabled: boolean) {
    const [isInitialized, setIsInitialized] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [needsUserGesture, setNeedsUserGesture] = useState(true);

    const rhythmEngine = getRhythmEngine();

    // Initialize audio on user gesture
    const initializeAudio = useCallback(async () => {
        try {
            await rhythmEngine.initialize();
            setIsInitialized(true);
            setNeedsUserGesture(false);
        } catch (error) {
            console.error('Failed to initialize rhythm engine:', error);
        }
    }, [rhythmEngine]);

    // Start/stop rhythm based on enabled state
    useEffect(() => {
        if (!isInitialized || !enabled) {
            if (isPlaying) {
                rhythmEngine.stop();
                setIsPlaying(false);
            }
            return;
        }

        rhythmEngine.start(bpm);
        setIsPlaying(true);

        return () => {
            rhythmEngine.stop();
            setIsPlaying(false);
        };
    }, [isInitialized, enabled, bpm, rhythmEngine]);

    // Update BPM when it changes
    useEffect(() => {
        if (isPlaying) {
            rhythmEngine.setBPM(bpm);
        }
    }, [bpm, isPlaying, rhythmEngine]);

    const setVolume = useCallback((volume: number) => {
        rhythmEngine.setVolume(volume);
    }, [rhythmEngine]);

    const toggleMetronome = useCallback((enabled: boolean) => {
        rhythmEngine.toggleMetronome(enabled);
    }, [rhythmEngine]);

    const onBeat = useCallback((callback: () => void) => {
        return rhythmEngine.onBeat(callback);
    }, [rhythmEngine]);

    return {
        isInitialized,
        isPlaying,
        needsUserGesture,
        initializeAudio,
        setVolume,
        toggleMetronome,
        onBeat,
    };
}
