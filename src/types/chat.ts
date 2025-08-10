export interface VoiceMessage {
  id: string;
  nickname: string;
  audioBlob: Blob;
  audioUrl: string;
  duration: number;
  timestamp: Date;
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