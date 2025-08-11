export interface VoiceMessage {
  id: string;
  type: string;
  nickname: string;
  audioData: string;
  mimeType: string;
  duration: number;
  timestamp: Date | string;
  isOwn: boolean;
}

export interface User {
  nickname: string;
  initials: string;
  isLoggedIn: boolean;
}

export interface ChatState {
  messages: VoiceMessage[];
  user: User;
  isRecording: boolean;
  recordingDuration: number;
}