/**
 * Represents a voice message sent by a user in the chat
 */
export interface VoiceMessage {
  /**
   * Unique identifier for the message
   */
  id: string;
  /**
   * Type of message (always 'VOICE_MESSAGE')
   */
  type: string;
  /**
   * Nickname of the user who sent the message
   */
  nickname: string;
  /**
   * Base64-encoded audio data
   */
  audioData: string;
  /**
   * MIME type of the audio data (e.g. 'audio/webm')
   */
  mimeType: string;
  /**
   * Duration of the audio in seconds
   */
  duration: number;
  /**
   * Timestamp when the message was sent
   */
  timestamp: Date | string;
  /**
   * Whether the message was sent by the current user
   */
  isOwn: boolean;
}

/**
 * Represents the current user's state
 */
export interface User {
  /**
   * Nickname chosen by the user
   */
  nickname: string;
  /**
   * Initials of the user (derived from their nickname)
   */
  initials: string;
  /**
   * Whether the user is currently logged in
   */
  isLoggedIn: boolean;
}

/**
 * Represents an online user in the chat
 */
export interface OnlineUser {
  /**
   * Nickname of the user
   */
  nickname: string;
  /**
   * Whether the user is currently online
   */
  online: boolean;
  /**
   * Timestamp when the user's online status last changed
   */
  lastChanged?: Date;
}

/**
 * Represents the state of the chat
 */
export interface ChatState {
  /**
   * Array of voice messages in the chat
   */
  messages: VoiceMessage[];
  /**
   * Current user's state
   */
  user: User;
  /**
   * Whether the user is currently recording a voice message
   */
  isRecording: boolean;
  /**
   * Duration of the current recording in seconds
   */
  recordingDuration: number;
}
