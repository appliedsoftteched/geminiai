import React, { useRef, useState, useEffect } from 'react';
import { Subject, Message } from '../types';
import { AVATAR_URLS } from '../constants';
import ReactMarkdown from 'react-markdown';

interface ChatAreaProps {
  subject: Subject;
  messages: Message[];
  loading: boolean;
  onSendMessage: (text: string, file?: File, mode?: 'chat' | 'edit' | 'veo') => void;
  onStartLive: () => void;
  onToggleSidebar: () => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({ subject, messages, loading, onSendMessage, onStartLive, onToggleSidebar }) => {
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSend = (mode: 'chat' | 'edit' | 'veo' = 'chat') => {
    if (!inputText.trim() && !attachedFile) return;
    onSendMessage(inputText, attachedFile || undefined, mode);
    setInputText('');
    setAttachedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReadAloud = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const lastModelMessage = [...messages].reverse().find(m => m.role === 'model');
    if (lastModelMessage) {
      // Strip markdown for better speech
      const cleanText = lastModelMessage.text.replace(/[*_#`]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      
      // Try to find a nice English voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha'));
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      speechRef.current = utterance;
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
       alert("Dictation is not supported in this browser.");
       return;
    }

    if (isListening) {
      // It will stop automatically or we can force stop if we had the instance ref
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + transcript);
    };

    recognition.start();
  };

  return (
    <main className="flex-1 flex flex-col h-full md:rounded-[2.5rem] overflow-hidden relative shadow-glass bg-white/80 backdrop-blur-md border border-white/70 w-full">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-8 py-5 bg-white/90 border-b border-white shadow-sm z-10 backdrop-blur-md">
        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={onToggleSidebar}
            className="md:hidden p-3 -ml-2 rounded-full hover:bg-[#F5F5F5] text-[#666666] transition-colors"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-4 bg-[#C8E6C9] rounded-full animate-pulse"></span>
              <h2 className="text-[#333333] text-lg md:text-xl font-bold tracking-tight font-display truncate">{subject} Class</h2>
            </div>
            <span className="hidden md:block text-[#F5F5F5] text-2xl font-light">/</span>
            <p className="hidden md:block text-[#E1BEE7] font-semibold text-base bg-[#E1BEE7]/10 px-4 py-1.5 rounded-xl border border-[#E1BEE7]/20 font-body">Learning Session</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex bg-[#F5F5F5] p-1.5 rounded-full">
            <button 
              onClick={handleReadAloud}
              className={`size-8 md:size-10 flex items-center justify-center rounded-full shadow-sm transition-colors ${isSpeaking ? 'bg-[#FFCDD2] text-white animate-pulse' : 'bg-white text-[#666666] hover:text-[#E1BEE7]'}`} 
              title={isSpeaking ? "Stop Reading" : "Read Aloud"}
            >
              <span className="material-symbols-outlined text-[20px] md:text-[24px]">
                {isSpeaking ? 'stop' : 'volume_up'}
              </span>
            </button>
            <button 
              onClick={onStartLive}
              className="size-8 md:size-10 flex items-center justify-center rounded-full text-[#666666] hover:text-[#E1BEE7] hover:bg-white transition-all" 
              title="Live Voice"
            >
              <span className="material-symbols-outlined text-[20px] md:text-[24px]">mic_none</span>
            </button>
          </div>
          <div className="h-9 w-px bg-[#F5F5F5] mx-1 md:mx-2"></div>
          <div 
            className="bg-center bg-no-repeat bg-cover rounded-full size-10 md:size-12 border-3 border-[#FFCDD2] shadow-sm cursor-pointer hover:ring-3 ring-[#E1BEE7] ring-offset-2 transition-all" 
            style={{ backgroundImage: `url("${AVATAR_URLS.user}")` }}
          >
          </div>
        </div>
      </header>

      {/* Gamification Bar */}
      <div className="px-4 md:px-8 pt-6 pb-3">
        <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
          <div className="flex items-center gap-3 bg-gradient-to-br from-[#E1BEE7] to-[#FFCDD2] text-white p-2 pl-5 pr-2 rounded-full shadow-lg shadow-[#E1BEE7]/40 min-w-[fit-content]">
            <div className="flex flex-col leading-none font-display">
              <span className="text-[11px] uppercase font-bold opacity-80">Star Learner</span>
              <span className="text-lg font-bold">Level 5</span>
            </div>
            <div className="bg-white/20 p-2.5 rounded-full backdrop-blur-sm">
              <span className="material-symbols-outlined text-white text-[24px]">workspace_premium</span>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white border border-[#F5F5F5] text-[#333333] p-2 pl-5 pr-2 rounded-full shadow-sm min-w-[fit-content]">
            <div className="flex flex-col leading-none font-display">
              <span className="text-[11px] uppercase font-bold text-[#666666]">Brainpower XP</span>
              <span className="text-lg font-bold">1,240 XP</span>
            </div>
            <div className="bg-[#FFECB3] p-2.5 rounded-full text-[#333333] shadow-glow shadow-[#FFECB3]/50">
              <span className="material-symbols-outlined text-[24px]">lightbulb</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-5 flex flex-col gap-6 md:gap-8 scroll-smooth" id="chat-container" ref={scrollRef}>
        <div className="flex justify-center">
          <span className="text-xs font-bold text-[#666666] bg-[#F5F5F5]/70 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/50 font-body">TODAY, FUN O'CLOCK</span>
        </div>

        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex items-end gap-2 md:gap-3 max-w-[95%] md:max-w-[85%] group ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}
          >
            <div 
              className={`bg-center bg-no-repeat bg-cover rounded-full size-8 md:size-12 flex-shrink-0 shadow-sm ${msg.role === 'user' ? 'border-3 border-[#FFCDD2]' : 'border border-white'}`}
              style={{ backgroundImage: `url("${msg.role === 'user' ? AVATAR_URLS.user : AVATAR_URLS.ai}")` }}
            >
            </div>
            
            <div className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : ''}`}>
              <span className={`text-xs md:text-sm font-bold ml-2 font-display ${msg.role === 'user' ? 'text-[#666666] mr-2' : 'text-[#E1BEE7]'}`}>
                {msg.role === 'user' ? 'Alex the Awesome' : 'Smarty-Pants Pal'}
              </span>
              <div className={`p-4 md:p-5 rounded-2xl md:rounded-[2rem] font-medium leading-relaxed text-sm md:text-base font-body shadow-glass border relative overflow-hidden ${
                msg.role === 'user' 
                  ? 'rounded-tr-none bg-[#FFCDD2] text-white border-[#FFCDD2]/70 shadow-glow' 
                  : 'rounded-tl-none bg-white text-[#333333] border-white/70'
              }`}>
                {msg.image && (
                  <img src={msg.image} alt="Uploaded content" className="rounded-xl mb-3 max-w-full h-auto border-4 border-white/30" />
                )}
                {msg.video && (
                  <video src={msg.video} controls className="rounded-xl mb-3 max-w-full h-auto border-4 border-white/30" />
                )}
                <div className="prose prose-sm md:prose-base prose-p:my-1 prose-ul:my-1 max-w-none text-inherit">
                   <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 ml-12 md:ml-16">
            <div className="flex space-x-1">
              <div className="w-2 md:w-2.5 h-2 md:h-2.5 bg-[#B3E0FF] rounded-full animate-bounce"></div>
              <div className="w-2 md:w-2.5 h-2 md:h-2.5 bg-[#B3E0FF] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 md:w-2.5 h-2 md:h-2.5 bg-[#B3E0FF] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-white/60 backdrop-blur-md border-t border-white/70">
        <div className="max-w-4xl mx-auto relative flex flex-col gap-3">
          
          {previewUrl && (
             <div className="flex items-center gap-4 bg-white/90 p-3 rounded-2xl shadow-sm border border-[#E1BEE7]/30 self-start animate-in fade-in slide-in-from-bottom-2">
                <img src={previewUrl} alt="Preview" className="h-16 w-16 md:h-20 md:w-20 object-cover rounded-xl border border-[#F5F5F5]" />
                <div className="flex flex-col gap-2">
                   <p className="text-xs font-bold text-[#666666] uppercase">Magic Actions:</p>
                   <div className="flex gap-2">
                      <button 
                         onClick={() => handleSend('edit')}
                         className="px-2 md:px-3 py-1.5 bg-[#E1BEE7] text-white rounded-lg text-[10px] md:text-xs font-bold hover:bg-[#E1BEE7]/80 flex items-center gap-1"
                      >
                         <span className="material-symbols-outlined text-sm">auto_fix</span> Edit
                      </button>
                      <button 
                         onClick={() => handleSend('veo')}
                         className="px-2 md:px-3 py-1.5 bg-[#B3E0FF] text-[#333333] rounded-lg text-[10px] md:text-xs font-bold hover:bg-[#B3E0FF]/80 flex items-center gap-1"
                      >
                         <span className="material-symbols-outlined text-sm">movie</span> Veo
                      </button>
                   </div>
                </div>
                <button onClick={() => { setAttachedFile(null); setPreviewUrl(null); }} className="absolute top-1 right-1 bg-red-400 text-white rounded-full p-1 hover:bg-red-500">
                   <span className="material-symbols-outlined text-sm">close</span>
                </button>
             </div>
          )}

          <div className="flex items-center gap-2 md:gap-3 w-full">
            <button 
              onClick={handleVoiceInput}
              className={`flex-shrink-0 size-10 md:size-14 rounded-full border shadow-sm flex items-center justify-center transition-all duration-300 group ${isListening ? 'bg-red-500 border-red-500 text-white animate-pulse' : 'bg-white border-[#F5F5F5] text-[#666666] hover:text-white hover:bg-[#E1BEE7] hover:border-[#E1BEE7]'}`} 
              title="Voice Input (Dictation)"
            >
              <span className="material-symbols-outlined group-hover:scale-110 text-xl md:text-2xl">
                {isListening ? 'mic_off' : 'mic'}
              </span>
            </button>
            
            <div className="flex-1 relative">
              <input 
                className="w-full h-12 md:h-16 pl-4 md:pl-6 pr-10 md:pr-14 rounded-full border-0 bg-white/80 shadow-inner text-[#333333] placeholder-[#666666] focus:ring-2 focus:ring-[#FFCDD2] focus:bg-white text-base md:text-lg transition-all font-body" 
                placeholder={isListening ? "Listening..." : (attachedFile ? "Magic prompt..." : "Ask me anything...")}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend('chat')}
              />
              <input 
                 type="file" 
                 accept="image/*" 
                 className="hidden" 
                 ref={fileInputRef} 
                 onChange={handleFileChange}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 md:p-2.5 rounded-full text-[#666666] hover:text-[#E1BEE7] hover:bg-[#F5F5F5] transition-colors"
              >
                <span className="material-symbols-outlined text-xl md:text-2xl">add_photo_alternate</span>
              </button>
            </div>
            
            <button 
              onClick={() => handleSend('chat')}
              className="flex-shrink-0 h-10 md:h-14 px-4 md:px-7 rounded-full bg-[#FFCDD2] text-white font-bold shadow-lg shadow-[#FFCDD2]/40 hover:shadow-[#E1BEE7]/50 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 group font-display"
            >
              <span className="hidden md:inline">Send!</span>
              <span className="material-symbols-outlined text-[20px] md:text-[24px] group-hover:translate-x-1 transition-transform">send</span>
            </button>
          </div>
        </div>
        <div className="text-center mt-3 hidden md:block">
          <p className="text-[11px] text-[#666666] font-medium font-body">Your Smarty-Pants Pal is learning too! Double-check super important facts.</p>
        </div>
      </div>
    </main>
  );
};

export default ChatArea;