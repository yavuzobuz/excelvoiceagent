export class AudioRecorder {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private onData: (base64: string) => void;

  constructor(onData: (base64: string) => void) {
    this.onData = onData;
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.context = new AudioContext({ sampleRate: 16000 });
    
    const workletCode = `
      class RecorderProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this.bufferSize = 4096;
          this.buffer = new Float32Array(this.bufferSize);
          this.bufferIndex = 0;
        }
        process(inputs) {
          const input = inputs[0];
          if (input && input.length > 0) {
            const channelData = input[0];
            for (let i = 0; i < channelData.length; i++) {
              this.buffer[this.bufferIndex++] = channelData[i];
              if (this.bufferIndex >= this.bufferSize) {
                // Convert Float32 to Int16
                const int16Array = new Int16Array(this.bufferSize);
                for (let j = 0; j < this.bufferSize; j++) {
                  const s = Math.max(-1, Math.min(1, this.buffer[j]));
                  int16Array[j] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                this.port.postMessage(int16Array.buffer, [int16Array.buffer]);
                this.buffer = new Float32Array(this.bufferSize);
                this.bufferIndex = 0;
              }
            }
          }
          return true;
        }
      }
      registerProcessor('recorder-worklet', RecorderProcessor);
    `;
    const blob = new Blob([workletCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    await this.context.audioWorklet.addModule(url);

    const source = this.context.createMediaStreamSource(this.stream);
    this.workletNode = new AudioWorkletNode(this.context, 'recorder-worklet');
    
    this.workletNode.port.onmessage = (e) => {
      const buffer = e.data as ArrayBuffer;
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      this.onData(base64);
    };

    source.connect(this.workletNode);
    // Connect to destination so it processes, but set gain to 0 to avoid feedback
    const gainNode = this.context.createGain();
    gainNode.gain.value = 0;
    this.workletNode.connect(gainNode);
    gainNode.connect(this.context.destination);
  }

  stop() {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.context) {
      this.context.close();
      this.context = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }
}

export class AudioPlayer {
  private context: AudioContext | null = null;
  private nextTime: number = 0;
  private sources: AudioBufferSourceNode[] = [];

  init() {
    if (!this.context) {
      this.context = new AudioContext({ sampleRate: 24000 });
      this.nextTime = this.context.currentTime;
    }
  }

  play(base64: string) {
    if (!this.context) return;
    
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    const audioBuffer = this.context.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = this.context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.context.destination);
    
    this.sources.push(source);
    source.onended = () => {
      this.sources = this.sources.filter(s => s !== source);
    };

    if (this.nextTime < this.context.currentTime) {
      this.nextTime = this.context.currentTime;
    }
    source.start(this.nextTime);
    this.nextTime += audioBuffer.duration;
  }

  stop() {
    this.clearQueue();
    if (this.context) {
      this.context.close();
      this.context = null;
    }
  }

  clearQueue() {
    this.sources.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Ignore if already stopped
      }
    });
    this.sources = [];
    if (this.context) {
      this.nextTime = this.context.currentTime;
    }
  }
}
