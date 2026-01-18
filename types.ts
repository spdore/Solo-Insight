
export type OrgasmType = 'YES' | 'NO' | 'EDGING';
export type Language = 'en' | 'zh';

export interface Tag {
  id: string;
  name: string;
}

export interface Entry {
  id: string;
  timestamp: number; // Unix timestamp
  duration: number; // in minutes
  intensity: number; // 1-5
  orgasm: OrgasmType;
  tags: string[]; // List of tag names
  note: string;
  photoData?: string; // Base64 string for local storage simplicity
  // Link to content used in this session (optional snapshot of what was watched)
  contentUsed?: {
    url?: string;
    actor?: string;
  };
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  condition: (entries: Entry[]) => boolean;
  unlockedAt?: number;
}

export interface SavedInsight {
  id: string;
  timestamp: number;
  text: string;
  period: string;
}

export interface ContentItem {
  id: string;
  url?: string;
  actor?: string;
  title?: string; // Optional nickname for the link
  isFavorite: boolean;
  createdAt: number;
  lastUsedAt?: number;
}

export interface AiAccessState {
  unlocked: boolean;
  attempts: number;
}

export type ViewState = 'DASHBOARD' | 'CALENDAR' | 'LIBRARY' | 'STATS' | 'ACHIEVEMENTS';
