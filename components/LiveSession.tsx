import React, { useEffect, useState, useRef } from 'react';
import { getLiveClient } from '../services/geminiService';
import { createPcmBlob, decodeAudioData, decode } from '../services/audioUtils';
import { LiveServerMessage, Modality } from '@google/genai';
import { AVATAR_URLS } from '../constants';

interface LiveSessionProps {
  onClose: () => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ onClose }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'closed'>('connecting');
  const [visualizerHeight, setVisualizerHeight] = useState<number[]>(new Array(5).fill(20));
  
  // Refs for audio processing to avoid stale closures
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  useEffect(() => {
    let active = true;

    const startSession = async () => {
      try {
        const ai = getLiveClient();
        
        // Setup Audio Contexts
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        audioContextRef.current = inputCtx;
        outputContextRef.current = outputCtx;

        const outputNode = outputCtx.createGain();
        outputNode.connect(outputCtx.destination);

        // Get Mic Stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        // Connect Gemini Live
        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          callbacks: {
            onopen: () => {
              if (!active) return;
              setStatus('connected');
              
              // Process Input Audio
              const source = inputCtx.createMediaStreamSource(stream);
              sourceRef.current = source;
              const processor = inputCtx.createScriptProcessor(4096, 1, 1);
              processorRef.current = processor;

              processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createPcmBlob(inputData);
                
                // Visualizer update (simple RMS)
                let sum = 0;
                for(let i=0; i<inputData.length; i++) sum += inputData[i]*inputData[i];
                const rms = Math.sqrt(sum/inputData.length);
                setVisualizerHeight(prev => prev.map(() => Math.max(20, Math.min(100, rms * 1000 + Math.random() * 30))));

                sessionPromise.then(session => {
                   session.sendRealtimeInput({ media: pcmBlob });
                });
              };

              source.connect(processor);
              processor.connect(inputCtx.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
              if (!active) return;
              
              const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (base64Audio) {
                if (outputCtx.state === 'suspended') await outputCtx.resume();
                
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                
                const audioBuffer = await decodeAudioData(
                  decode(base64Audio),
                  outputCtx,
                  24000,
                  1
                );
                
                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode);
                
                source.addEventListener('ended', () => {
                   sourcesRef.current.delete(source);
                });
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
              }

              // Handle Interruption
              if (message.serverContent?.interrupted) {
                 sourcesRef.current.forEach(s => {
                    try { s.stop(); } catch(e) {}
                 });
                 sourcesRef.current.clear();
                 nextStartTimeRef.current = 0;
              }
            },
            onclose: () => {
              if (active) setStatus('closed');
            },
            onerror: (e) => {
              console.error(e);
              if (active) setStatus('error');
            }
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
            },
            systemInstruction: "You are Smarty-Pants Pal, a fun and helpful Class 7 learning assistant. Be energetic and concise."
          }
        });
        
        sessionPromiseRef.current = sessionPromise;

      } catch (err) {
        console.error("Failed to connect live session", err);
        setStatus('error');
      }
    };

    startSession();

    return () => {
      active = false;
      // Cleanup
      if (sessionPromiseRef.current) {
         sessionPromiseRef.current.then(session => session.close());
      }
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (processorRef.current) processorRef.current.disconnect();
      if (sourceRef.current) sourceRef.current.disconnect();
      if (audioContextRef.current) audioContextRef.current.close();
      if (outputContextRef.current) outputContextRef.current.close();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-[#B3E0FF]/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] p-10 shadow-2xl max-w-md w-full flex flex-col items-center gap-8 relative overflow-hidden border-4 border-white">
        
        <div className="absolute top-0 left-0 w-full h-32 bg-[#FFCDD2] opacity-20 rounded-b-[50%]"></div>

        <div className="relative z-10">
          <div className="size-32 rounded-full border-4 border-[#C8E6C9] shadow-lg bg-cover bg-center animate-pulse" 
               style={{ backgroundImage: `url("${AVATAR_URLS.academy}")` }}></div>
          <div className="absolute -bottom-2 right-2 bg-[#C8E6C9] text-white p-2 rounded-full shadow-md">
            <span className="material-symbols-outlined">mic</span>
          </div>
        </div>

        <div className="text-center z-10">
           <h2 className="text-2xl font-bold text-[#333333] font-display mb-2">Live Class Session</h2>
           <p className="text-[#666666] font-body">
             {status === 'connecting' && "Dialing into the classroom..."}
             {status === 'connected' && "Listening... Go ahead!"}
             {status === 'error' && "Oops! Connection dropped."}
             {status === 'closed' && "Class dismissed!"}
           </p>
        </div>

        {status === 'connected' && (
          <div className="flex items-center justify-center gap-2 h-16">
            {visualizerHeight.map((h, i) => (
              <div 
                key={i}
                className="w-3 bg-[#E1BEE7] rounded-full transition-all duration-75 ease-in-out"
                style={{ height: `${h}px` }}
              ></div>
            ))}
          </div>
        )}

        <button 
          onClick={onClose}
          className="mt-4 px-8 py-3 bg-[#FFCDD2] text-white rounded-full font-bold shadow-lg hover:bg-[#FFCDD2]/90 transition-all font-display"
        >
          End Session
        </button>
      </div>
    </div>
  );
};

export default LiveSession;
