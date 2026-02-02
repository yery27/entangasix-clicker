// Web Audio API Sound Synthesizer
// Generates arcade-style sounds on the fly

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let isMuted = false;

const initAudio = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.connect(audioCtx.destination);
        masterGain.gain.value = 0.3; // Default volume
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
};

export const setMuted = (muted: boolean) => {
    isMuted = muted;
    if (masterGain) {
        masterGain.gain.value = muted ? 0 : 0.3;
    }
};

const createOscillator = (type: OscillatorType, freq: number, duration: number, startTime: number = 0) => {
    if (!audioCtx || !masterGain || isMuted) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + startTime);

    gain.connect(masterGain);
    osc.connect(gain);

    osc.start(audioCtx.currentTime + startTime);
    osc.stop(audioCtx.currentTime + startTime + duration);

    // Envelope for click-free sound
    gain.gain.setValueAtTime(0, audioCtx.currentTime + startTime);
    gain.gain.linearRampToValueAtTime(1, audioCtx.currentTime + startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + startTime + duration);
};

export const playSound = {
    // UI Sounds
    click: () => {
        initAudio();
        createOscillator('sine', 800, 0.05);
    },

    // Casino / Win Sounds
    coin: () => {
        initAudio();
        // Mario coin style: B5 then E6 fast
        if (!audioCtx || !masterGain || isMuted) return;

        const t = audioCtx.currentTime;

        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(987.77, t); // B5
        osc1.connect(gain1);
        gain1.connect(masterGain);
        gain1.gain.setValueAtTime(0.1, t);
        gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc1.start(t);
        osc1.stop(t + 0.1);

        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(1318.51, t + 0.1); // E6
        osc2.connect(gain2);
        gain2.connect(masterGain);
        gain2.gain.setValueAtTime(0.1, t + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
        osc2.start(t + 0.1);
        osc2.stop(t + 0.5);
    },

    win: () => {
        initAudio();
        // Major Arpeggio
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            createOscillator('triangle', freq, 0.3, i * 0.1);
        });
    },

    jackpot: () => {
        initAudio();
        // Fast arpeggios loop
        for (let i = 0; i < 10; i++) {
            [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98].forEach((freq, j) => {
                createOscillator('square', freq, 0.1, (i * 0.4) + (j * 0.05));
            });
        }
    },

    loss: () => {
        initAudio();
        // Sad boop
        createOscillator('sawtooth', 150, 0.4);
        if (!audioCtx || !masterGain || isMuted) return;
        const osc = audioCtx.createOscillator();
        osc.frequency.linearRampToValueAtTime(50, audioCtx.currentTime + 0.4);
    },

    // Game Specifics
    plink: () => {
        initAudio();
        // High pitched short ping
        createOscillator('sine', 1200 + Math.random() * 200, 0.05);
    },

    crashStart: () => {
        initAudio();
        // Rising pitch
        if (!audioCtx || !masterGain || isMuted) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 2);
        gain.connect(masterGain);
        osc.connect(gain);
        gain.gain.value = 0.1;
        osc.start();
        osc.stop(audioCtx.currentTime + 2);
    },

    explosion: () => {
        initAudio();
        // White noise burst
        if (!audioCtx || !masterGain || isMuted) return;
        const bufferSize = audioCtx.sampleRate * 0.5; // 0.5 sec
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const gain = audioCtx.createGain();
        gain.connect(masterGain);
        noise.connect(gain);

        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        noise.start();
    },

    jump: () => {
        initAudio();
        if (!audioCtx || !masterGain || isMuted) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.1);
        gain.connect(masterGain);
        osc.connect(gain);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    },

    cardFlip: () => {
        initAudio();
        // Simple noise slip
        if (!audioCtx || !masterGain || isMuted) return;
        const bufferSize = audioCtx.sampleRate * 0.1;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.5;
        }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;

        const gain = audioCtx.createGain();
        gain.connect(masterGain);
        noise.connect(filter);
        filter.connect(gain);

        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
        noise.start();
    },

    spin: () => {
        initAudio();
        // Repeating tick
        createOscillator('square', 80, 0.05);
    }
};
