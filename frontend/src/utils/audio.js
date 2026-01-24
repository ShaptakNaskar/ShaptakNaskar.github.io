// Audio utility for game sounds with mute toggle
// Uses Web Audio API for low-latency playback
// Optimized with throttling and sound pooling for performance

class GameAudio {
    constructor() {
        this.audioContext = null;
        this.muted = true; // Start muted by default
        this.sounds = {};
        this.loaded = false;
        // Throttle tracking - prevent rapid duplicate sounds
        this.lastPlayTime = {};
        this.throttleMs = 50; // Min milliseconds between same sound

        // Global throttle to prevent too many distinct sounds per frame
        this.lastGlobalPlayTime = 0;
        this.globalThrottleMs = 16; // ~1 frame at 60fps

        this.noiseBuffer = null;
    }

    async init() {
        if (this.audioContext) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createNoiseBuffer();
            await this.loadSounds();
            this.loaded = true;
        } catch (err) {
            console.warn('Audio not available:', err);
        }
    }

    createNoiseBuffer() {
        if (!this.audioContext) return;
        const bufferSize = this.audioContext.sampleRate * 2; // 2 seconds of noise
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        this.noiseBuffer = buffer;
    }

    async loadSounds() {
        // Define sound configurations (not functions to avoid closure overhead)
        this.sounds = {
            bounce: { freq: 440, duration: 0.05, type: 'square' },
            score: { freq: 880, duration: 0.1, type: 'sine' },
            levelUp: { arpeggio: [523, 659, 784], duration: 0.15 },
            gameOver: { freq: 220, duration: 0.3, type: 'sawtooth' },
            click: { freq: 600, duration: 0.03, type: 'sine' },
            win: { arpeggio: [523, 659, 784, 1047], duration: 0.2 },
            wrong: { freq: 150, duration: 0.15, type: 'sawtooth' },
            correct: { freq: 660, duration: 0.08, type: 'sine' },
            merge: { freq: 520, duration: 0.06, type: 'triangle' },
            thrust: { type: 'noise', duration: 0.1, volume: 0.3 },
            laser: { freq: 880, duration: 0.1, type: 'sawtooth', slide: true },
        };
    }

    playTone(frequency, duration, type = 'sine') {
        if (this.muted || !this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

            if (soundType === 'laser') {
                oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + duration);
            }

            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (err) {
            // Silently fail if audio context is suspended
        }
    }

    playArpeggio(frequencies, noteDuration) {
        if (this.muted || !this.audioContext) return;

        frequencies.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, noteDuration, 'sine'), i * noteDuration * 500);
        });
    }

    playNoise(duration, volume = 0.5) {
        if (this.muted || !this.audioContext || !this.noiseBuffer) return;

        try {
            const source = this.audioContext.createBufferSource();
            source.buffer = this.noiseBuffer;
            const gainNode = this.audioContext.createGain();

            // Bandpass filter for rocket sound
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1000;

            source.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            source.start(this.audioContext.currentTime);
            source.stop(this.audioContext.currentTime + duration);
        } catch (e) { }
    }

    play(soundName) {
        if (this.muted) return;

        const sound = this.sounds[soundName];
        if (!sound) return;

        // Throttle: skip if same sound was played too recently
        const now = performance.now();

        // Global throttle check
        if (now - this.lastGlobalPlayTime < this.globalThrottleMs) {
            return; // Skip if a sound already played this frame
        }

        const lastTime = this.lastPlayTime[soundName] || 0;
        if (now - lastTime < this.throttleMs) {
            return; // Skip this play - too soon
        }
        this.lastPlayTime[soundName] = now;
        this.lastGlobalPlayTime = now;

        // Resume audio context if suspended
        if (this.audioContext?.state === 'suspended') {
            this.audioContext.resume();
        }

        // Play based on sound type
        if (sound.type === 'noise') {
            this.playNoise(sound.duration, sound.volume);
        } else if (sound.arpeggio) {
            this.playArpeggio(sound.arpeggio, sound.duration);
        } else {
            this.playTone(sound.freq, sound.duration, sound.type);
        }
    }

    toggle() {
        this.muted = !this.muted;
        if (!this.muted && this.audioContext?.state === 'suspended') {
            this.audioContext.resume();
        }
        return !this.muted;
    }

    setMuted(value) {
        this.muted = value;
        if (!this.muted && this.audioContext?.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    isMuted() {
        return this.muted;
    }
}

// Singleton instance
const gameAudio = new GameAudio();

export default gameAudio;
