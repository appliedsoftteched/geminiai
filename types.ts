export enum Subject {
  Science = 'Science',
  Mathematics = 'Mathematics',
  SocialScience = 'Social Science',
  English = 'English',
  Hindi = 'Hindi',
  Computer = 'Computer'
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; // base64 or url
  video?: string; // uri
  isAudio?: boolean; // marker for audio-only messages (if we store them)
  timestamp: number;
}

export interface ChatSessionState {
  [key: string]: Message[];
}

export interface UserState {
  level: number;
  xp: number;
}
