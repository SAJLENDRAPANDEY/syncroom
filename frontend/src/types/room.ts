export type Role = 'HOST' | 'MODERATOR' | 'PARTICIPANT';

export interface Participant {
  id: string;
  username: string;
  role: Role;
}

export interface VideoState {
  videoId: string | null;
  currentTime: number;
  isPlaying: boolean;
  lastUpdated?: number;
}

export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: number;
}

export interface RoomState {
  roomId: string;
  hostId: string;
  video: VideoState;
  participants: Participant[];
  chatMessages: ChatMessage[];
}

export interface ControlRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  action: 'play' | 'pause' | 'seek' | 'change_video';
  payload?: { currentTime?: number; videoUrlOrId?: string };
  createdAt: number;
}
