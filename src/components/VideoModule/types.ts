export interface VideoItem {
  id: string;
  title: string;
  url: string;
  thumbnail?: string;
  type: 'local' | 'external' | 'youtube';
  duration?: string;
  size?: number;
  storagePath?: string;
  createdAt: number;
  userId?: string;
  tags?: string[];
  isLocalOnly?: boolean;
}
