/**
 * Rhythm Engine using Tone.js
 * Manages audio playback, metronome, and beat timing
 */

import * as Tone from 'tone';

type BeatCallback = () => void;

export class RhythmEngine {
    private synth: Tone.Synth | null = null;
    private metronomeSynth: Tone.Synth | null = null;
    private loop: Tone.Loop | null = null;
    private isInitialized = false;
    private isPlaying = false;
    private beatCallbacks: BeatCallback[] = [];
    private metronomeEnabled = true;
    private currentBPM = 120;

    /**
     * Initialize the audio context
     * Must be called after user interaction due to browser autoplay policy
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            await Tone.start();
            console.log('Audio context started');

            // Create main beat synth (kick drum sound)
            this.synth = new Tone.Synth({
                oscillator: { type: 'sine' },
                envelope: {
                    attack: 0.001,
                    decay: 0.1,
                    sustain: 0,
                    release: 0.1,
                },
            }).toDestination();

            // Create metronome click synth
            this.metronomeSynth = new Tone.Synth({
                oscillator: { type: 'square' },
                envelope: {
                    attack: 0.001,
                    decay: 0.05,
                    sustain: 0,
                    release: 0.05,
                },
            }).toDestination();

            this.synth.volume.value = -10; // Softer kick
            this.metronomeSynth.volume.value = -15; // Softer click

            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            throw error;
        }
    }

    /**
     * Start the rhythm loop
     */
    start(bpm: number = 120): void {
        if (!this.isInitialized) {
            console.warn('RhythmEngine not initialized');
            return;
        }

        if (this.isPlaying) {
            this.stop();
        }

        this.currentBPM = bpm;
        Tone.Transport.bpm.value = bpm;

        // Create loop that triggers on every beat
        this.loop = new Tone.Loop((time) => {
            // Play kick drum
            this.synth?.triggerAttackRelease('C2', '8n', time);

            // Play metronome click if enabled
            if (this.metronomeEnabled) {
                this.metronomeSynth?.triggerAttackRelease('C6', '32n', time);
            }

            // Trigger callbacks slightly ahead of actual beat for visual sync
            Tone.Draw.schedule(() => {
                this.beatCallbacks.forEach((callback) => callback());
            }, time);
        }, '4n'); // Every quarter note (1 beat)

        this.loop.start(0);
        Tone.Transport.start();
        this.isPlaying = true;
    }

    /**
     * Stop the rhythm loop
     */
    stop(): void {
        if (this.loop) {
            this.loop.stop();
            this.loop.dispose();
            this.loop = null;
        }
        Tone.Transport.stop();
        this.isPlaying = false;
    }

    /**
     * Set BPM (beats per minute)
     */
    setBPM(bpm: number): void {
        this.currentBPM = bpm;
        if (this.isPlaying) {
            Tone.Transport.bpm.rampTo(bpm, 0.5); // Smooth transition
        }
    }

    /**
     * Set master volume (0-100)
     */
    setVolume(volume: number): void {
        const dbValue = Tone.gainToDb(volume / 100);
        if (this.synth) {
            this.synth.volume.value = dbValue - 10;
        }
        if (this.metronomeSynth) {
            this.metronomeSynth.volume.value = dbValue - 15;
        }
    }

    /**
     * Toggle metronome click
     */
    toggleMetronome(enabled: boolean): void {
        this.metronomeEnabled = enabled;
    }

    /**
     * Register callback to be called on each beat
     */
    onBeat(callback: BeatCallback): () => void {
        this.beatCallbacks.push(callback);

        // Return cleanup function
        return () => {
            const index = this.beatCallbacks.indexOf(callback);
            if (index > -1) {
                this.beatCallbacks.splice(index, 1);
            }
        };
    }

    /**
     * Dispose of all audio resources
     */
    dispose(): void {
        this.stop();
        this.synth?.dispose();
        this.metronomeSynth?.dispose();
        this.beatCallbacks = [];
        this.isInitialized = false;
    }

    /**
     * Check if rhythm is playing
     */
    isRhythmPlaying(): boolean {
        return this.isPlaying;
    }

    /**
     * Get current BPM
     */
    getBPM(): number {
        return this.currentBPM;
    }
}

// Singleton instance
let rhythmEngineInstance: RhythmEngine | null = null;

export function getRhythmEngine(): RhythmEngine {
    if (!rhythmEngineInstance) {
        rhythmEngineInstance = new RhythmEngine();
    }
    return rhythmEngineInstance;
}
