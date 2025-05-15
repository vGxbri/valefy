'use client';

class AudioService {
  private soundEnabled = true;
  private initialized = false;
  private audioContext: AudioContext | null = null;
  private sounds: Record<string, AudioBuffer> = {};
  private gainNode: GainNode | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  initialize() {
    if (typeof window === 'undefined' || this.initialized) return;
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.initialized = true;
    } catch (e) {
      console.error('Error initializing AudioService:', e);
    }
  }

  setEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  private async loadSound(url: string, key: string) {
    if (!this.audioContext) return;
    
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.sounds[key] = audioBuffer;
    } catch (e) {
      console.error(`Error loading sound ${key}:`, e);
    }
  }

  private playSound(buffer: AudioBuffer, volume = 1) {
    if (!this.soundEnabled || !this.audioContext || !this.gainNode) return;
    
    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = volume;
      
      source.connect(gainNode);
      gainNode.connect(this.gainNode);
      
      source.start(0);
    } catch (e) {
      console.error('Error playing sound:', e);
    }
  }

  playUnlockSound() {
    if (!this.soundEnabled) return;
    console.log('Sonido de desbloqueo reproducido');
  }

  playUnlockImmidiateSound() {
    if (!this.soundEnabled) return;
    console.log('Sonido de desbloqueo inmediato reproducido');
  }

  playRevealSound(rarity: string) {
    if (!this.soundEnabled) return;
    console.log(`Sonido de revelación reproducido: ${rarity}`);
  }

  playItemScrollSound() {
    if (!this.soundEnabled) return;
    console.log('Sonido de desplazamiento reproducido');
  }
}

export const audioService = new AudioService(); 