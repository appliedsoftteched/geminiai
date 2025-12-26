import { GoogleGenAI, Chat, GenerateContentResponse, Part } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';

// Initialize Gemini Client
// IMPORTANT: We create a new instance when needed for Veo to pick up new keys.
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Chat Service
export const createChatSession = (modelName: string = 'gemini-2.5-flash'): Chat => {
  const ai = getAiClient();
  return ai.chats.create({
    model: modelName,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }], // Enable grounding
    },
  });
};

export const sendMessage = async (chat: Chat, message: string, imagePart?: Part): Promise<string> => {
  // SDK Requirement: chat.sendMessage expects an object with a `message` property.
  // The `message` property can be a string or an array of parts (for multimodal).
  
  let msgParam: string | (string | Part)[];
  
  if (imagePart) {
      msgParam = [imagePart, { text: message }];
  } else {
      msgParam = message;
  }
  
  // @ts-ignore - The SDK types can be strict, but this matches the documented signature { message: ... }
  const response: GenerateContentResponse = await chat.sendMessage({ message: msgParam });
  
  return response.text || "I couldn't generate a response.";
};

// Image Editing Service
export const editImage = async (base64Image: string, prompt: string): Promise<string> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Image,
            mimeType: 'image/png',
          },
        },
        {
          text: prompt,
        },
      ],
    },
  });

  // Extract image from response parts
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }
  throw new Error("No image generated");
};

// Veo Video Generation Service
export const generateVeoVideo = async (base64Image: string): Promise<string> => {
  // Ensure we have a selected key for Veo
  if (window.aistudio && window.aistudio.hasSelectedApiKey) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey && window.aistudio.openSelectKey) {
        await window.aistudio.openSelectKey();
      }
  }

  const ai = getAiClient(); // Re-init to capture potentially new key
  
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    image: {
      imageBytes: base64Image,
      mimeType: 'image/png', // Assuming PNG for simplicity from canvas/input
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9' // Defaulting to landscape
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("Video generation failed");

  // Fetch with key appended
  const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const getLiveClient = () => getAiClient();
