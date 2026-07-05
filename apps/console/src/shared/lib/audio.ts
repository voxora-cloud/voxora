/**
 * Plays a premium, gentle two-tone notification sound (chime)
 * using the browser's Web Audio API. This avoids any asset loading/network dependencies.
 */
export function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      
      gainNode.gain.setValueAtTime(0.15, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = audioCtx.currentTime;
    // Play a lovely two-tone chime (C5 followed quickly by E5)
    playTone(523.25, now, 0.15); // C5
    playTone(659.25, now + 0.08, 0.25); // E5
  } catch (err) {
    console.error("Failed to play notification sound:", err);
  }
}
