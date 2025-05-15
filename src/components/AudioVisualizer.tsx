import { useAnimationLoop } from '../utils/canvas/useAnimationLoop';
import { useCanvas } from '../utils/canvas/useCanvas';
import { useEffect, useRef, useState } from 'react';

function AudioVisualizer({ audio }: { audio: ArrayBuffer | null }) {
  const [ctx, canvas, setCanvas] = useCanvas({
    autoResize: true,
  });

  const [audioContext] = useState<AudioContext | null>(() => {
    if (!('AudioContext' in globalThis)) {
      console.error('AudioContext is not supported in this browser');
      return null;
    }
    return new window.AudioContext();
  });
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(
    null,
  );
  const [dataArray, setDataArray] = useState<Uint8Array | null>(null);
  const [bufferLength, setBufferLength] = useState<number>(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  useEffect(() => {
    if (!audioContext || !audio) return;

    const setupAudio = async () => {
      if (audio.detached) {
        // Don't use detached audio
        return;
      }

      // Create analyzer
      const newAnalyser = audioContext.createAnalyser();
      newAnalyser.fftSize = 2048;
      setAnalyser(newAnalyser);

      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(audio);
      if (!audioBuffer) {
        console.error('Failed to decode audio data');
        return;
      }

      // Store the decoded audio for later use
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(newAnalyser);
      newAnalyser.connect(audioContext.destination);
      setAudioSource(source);

      setBufferLength(newAnalyser.frequencyBinCount);
      const newDataArray = new Uint8Array(newAnalyser.frequencyBinCount);
      setDataArray(newDataArray);

      source.start(0);
    };

    setupAudio().catch(error => {
      console.error('Error setting up audio:', error);
    });

    return () => {
      if (audioSource) {
        if (audioSource.context.state === 'running') {
          audioSource.stop();
        }
        audioSource.disconnect();
      }
    };
  }, [audioContext, audio, audioSource]);

  useAnimationLoop(() => {
    if (!ctx || !canvas || !analyser || !dataArray) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get frequency data
    analyser.getByteFrequencyData(dataArray);

    // Draw visualizer
    ctx.beginPath();
    const barWidth = (canvas.width / bufferLength) * 2.5;

    for (let i = 0; i < bufferLength; i++) {
      const audioSample = dataArray[i] / 256; // Normalize to 0-1
      const barHeight = canvas.height * audioSample;

      const x = i * barWidth + barWidth / 2;
      const y = canvas.height - barHeight;

      ctx.fillStyle = `rgb(${audioSample * 126 + 100},50,50)`;
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  });

  return (
    <canvas className="fixed inset-0 -z-10 h-full w-full" ref={setCanvas} />
  );
}

export default function AudioVisualizerWrapper() {
  const [audioBuffer, setAudioBuffer] = useState<ArrayBuffer | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async e => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        setAudioBuffer(arrayBuffer);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div className="flex flex-col items-center text-white">
      <h1 className="mb-4 text-2xl font-bold text-white">Audio Visualizer</h1>
      <input
        className="hidden"
        id="audio-upload"
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
      />
      <label
        htmlFor="audio-upload"
        className="mb-4 cursor-pointer rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        Upload Audio
      </label>
      <AudioVisualizer audio={audioBuffer} />
    </div>
  );
}
