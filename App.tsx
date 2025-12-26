import React, { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import LiveSession from './components/LiveSession';
import { Subject, Message, ChatSessionState } from './types';
import { createChatSession, sendMessage, editImage, generateVeoVideo } from './services/geminiService';
import { Chat } from '@google/genai';

// Simple store for active Chat instances to persist history in memory
const chatInstances: Record<string, Chat> = {};

const App: React.FC = () => {
  const [currentSubject, setCurrentSubject] = useState<Subject>(Subject.Science);
  const [messagesBySubject, setMessagesBySubject] = useState<ChatSessionState>({
    [Subject.Science]: [],
    [Subject.Mathematics]: [],
    [Subject.SocialScience]: [],
    [Subject.English]: [],
    [Subject.Hindi]: [],
    [Subject.Computer]: [],
  });
  const [loading, setLoading] = useState(false);
  const [isLiveOpen, setIsLiveOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const getChat = (subject: Subject): Chat => {
    if (!chatInstances[subject]) {
      chatInstances[subject] = createChatSession();
    }
    return chatInstances[subject];
  };

  const addMessage = (subject: Subject, msg: Message) => {
    setMessagesBySubject(prev => ({
      ...prev,
      [subject]: [...(prev[subject] || []), msg]
    }));
  };

  const handleSendMessage = useCallback(async (text: string, file?: File, mode: 'chat' | 'edit' | 'veo' = 'chat') => {
    const subject = currentSubject;
    const chat = getChat(subject);
    
    // Convert file to base64 if exists
    let base64Image: string | undefined;
    if (file) {
      base64Image = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    // Add User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
      image: base64Image,
      timestamp: Date.now()
    };
    addMessage(subject, userMsg);
    setLoading(true);

    try {
      let responseText = "";
      let responseImage = "";
      let responseVideo = "";

      if (mode === 'edit' && base64Image) {
        // Image Editing Mode
        const base64Data = base64Image.split(',')[1];
        responseImage = await editImage(base64Data, text || "Edit this image");
        responseText = "Here is your magical edit! ✨";
      } else if (mode === 'veo' && base64Image) {
        // Video Generation Mode
        const base64Data = base64Image.split(',')[1];
        try {
           responseVideo = await generateVeoVideo(base64Data);
           responseText = "Action! 🎬 I've brought your image to life!";
        } catch (e: any) {
           responseText = "I couldn't generate the video. Please check your billing/key selection.";
           console.error(e);
        }
      } else {
        // Normal Chat Mode (with or without image context)
        const part = base64Image ? { inlineData: { data: base64Image.split(',')[1], mimeType: file?.type || 'image/png' } } : undefined;
        responseText = await sendMessage(chat, text, part);
      }

      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        image: responseImage || undefined,
        video: responseVideo || undefined,
        timestamp: Date.now()
      };
      addMessage(subject, modelMsg);

    } catch (error) {
      console.error("Error generating response:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Oops! My brain froze for a second. Can you try again? 🧊",
        timestamp: Date.now()
      };
      addMessage(subject, errorMsg);
    } finally {
      setLoading(false);
    }
  }, [currentSubject]);

  const handleClearHistory = () => {
    // Reset React state
    setMessagesBySubject({
      [Subject.Science]: [],
      [Subject.Mathematics]: [],
      [Subject.SocialScience]: [],
      [Subject.English]: [],
      [Subject.Hindi]: [],
      [Subject.Computer]: [],
    });
    // Reset Chat SDK instances
    Object.keys(chatInstances).forEach(key => delete chatInstances[key]);
  };

  return (
    <div className="flex h-screen w-full max-w-[1600px] mx-auto p-0 md:p-6 gap-0 md:gap-6 overflow-hidden relative">
      <Sidebar 
        currentSubject={currentSubject} 
        onSelectSubject={(s) => {
          setCurrentSubject(s);
          setIsMobileSidebarOpen(false);
        }}
        onClearHistory={handleClearHistory}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />
      <ChatArea 
        subject={currentSubject}
        messages={messagesBySubject[currentSubject] || []}
        loading={loading}
        onSendMessage={handleSendMessage}
        onStartLive={() => setIsLiveOpen(true)}
        onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />
      {isLiveOpen && <LiveSession onClose={() => setIsLiveOpen(false)} />}
    </div>
  );
};

export default App;