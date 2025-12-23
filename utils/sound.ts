let audioCtx: AudioContext | null = null;

const getCtx = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

export const playSound = {
  click: () => {
    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {}
  },
  win: () => {
    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        const startTime = ctx.currentTime + i * 0.1;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.05, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
        osc.start(startTime);
        osc.stop(startTime + 0.2);
      });
    } catch (e) {}
  },
  achievement: () => {
    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      // Majestic major chord arpeggio with delay
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C Major
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        const startTime = ctx.currentTime + i * 0.08;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
        osc.start(startTime);
        osc.stop(startTime + 0.6);
      });
    } catch (e) {}
  },
  lose: () => {
    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  },
  wrong: () => {
    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  },
  move: () => { // Generic move sound
    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  },
  capture: () => { // Generic capture
    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  },
  // --- Billiards Specific Sounds ---
  billiardHit: (velocity: number = 1) => {
    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';

      // Distinguish between soft clicks and hard clacks
      if (velocity < 0.6) {
        // Soft Click: Higher pitch, very short decay, specific volume curve
        // Boost volume slightly for low velocity to make it audible but crisp
        const softVol = Math.max(velocity * 0.3, 0.05); 
        
        osc1.frequency.setValueAtTime(3200, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.01);
        
        gain1.gain.setValueAtTime(softVol, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);
        
        osc1.start();
        osc1.stop(ctx.currentTime + 0.015);
      } else {
        // Hard Hit: Standard physics sound with resonance
        const vol = Math.min(Math.max(velocity * 0.15, 0.1), 0.8);

        osc1.frequency.setValueAtTime(2200 + (velocity * 20), ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.03);
        
        gain1.gain.setValueAtTime(vol, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
        
        osc1.start();
        osc1.stop(ctx.currentTime + 0.03);

        // Body resonance for harder hits
        if (velocity > 2) {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(300, ctx.currentTime);
          osc2.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);
          
          gain2.gain.setValueAtTime(vol * 0.4, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
          
          osc2.start();
          osc2.stop(ctx.currentTime + 0.05);
        }
      }
    } catch (e) {}
  },
  billiardRail: (velocity: number = 1) => {
    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      
      const vol = Math.min(Math.max(velocity * 0.12, 0.03), 0.6);
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'triangle';
      
      if (velocity < 0.8) {
         // Soft thud
         osc.frequency.setValueAtTime(200, ctx.currentTime);
         osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.04);
      } else {
         // Harder thud
         osc.frequency.setValueAtTime(140 + Math.random() * 20, ctx.currentTime);
         osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08);
      }
      
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  },
  billiardShot: (power: number = 10) => {
    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      
      // Normalize power (roughly 0-35)
      const normPower = Math.min(power / 35, 1);
      const vol = Math.max(normPower * 0.7, 0.1);
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'triangle'; // Leather tip sound character
      // Pitch drops quickly
      osc.frequency.setValueAtTime(180 + (normPower * 80), ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.12);
      
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {}
  },
  billiardPocket: () => {
    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      
      // Hollow drop sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.25);
      
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  }
};