import { Entry, Tag, Achievement, SavedInsight, ContentItem, AiAccessState } from '../types';
import { FirebaseService } from './firebase';

const KEYS = {
  ENTRIES: 'solo_insight_entries',
  TAGS: 'solo_insight_tags',
  ACHIEVEMENTS: 'solo_insight_achievements_state',
  INSIGHTS: 'solo_insight_saved_insights',
  LIBRARY: 'solo_insight_library',
  AI_ACCESS: 'solo_insight_ai_access',
};

const DEFAULT_TAGS = ['Relaxation', 'Stress Relief', 'Imagination', 'Toy', 'Visual Content', 'Audio', 'Tired', 'Energetic'];

// Current User ID (if logged in)
let currentUserId: string | null = null;

export const StorageService = {
  
  setUserId: (uid: string | null) => {
      currentUserId = uid;
  },

  // When Cloud data changes, update local storage cache so the UI stays snappy
  // and we have offline support
  syncFromCloud: (data: any) => {
      if (data.entries) localStorage.setItem(KEYS.ENTRIES, JSON.stringify(data.entries));
      if (data.tags) localStorage.setItem(KEYS.TAGS, JSON.stringify(data.tags));
      if (data.library) localStorage.setItem(KEYS.LIBRARY, JSON.stringify(data.library));
      if (data.insights) localStorage.setItem(KEYS.INSIGHTS, JSON.stringify(data.insights));
      if (data.achievements) localStorage.setItem(KEYS.ACHIEVEMENTS, JSON.stringify(data.achievements));
      if (data.aiAccess) localStorage.setItem(KEYS.AI_ACCESS, JSON.stringify(data.aiAccess));
  },

  getEntries: (): Entry[] => {
    try {
      const data = localStorage.getItem(KEYS.ENTRIES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveEntry: (entry: Entry) => {
    const entries = StorageService.getEntries();
    entries.push(entry);
    localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
    
    if (currentUserId) FirebaseService.saveEntry(currentUserId, entries);
    return entries;
  },

  updateEntry: (updatedEntry: Entry) => {
    const entries = StorageService.getEntries();
    const index = entries.findIndex(e => e.id === updatedEntry.id);
    if (index !== -1) {
      entries[index] = updatedEntry;
      localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
      if (currentUserId) FirebaseService.saveEntry(currentUserId, entries);
    }
    return entries;
  },

  deleteEntry: (id: string) => {
    const entries = StorageService.getEntries();
    const filtered = entries.filter(e => e.id !== id);
    localStorage.setItem(KEYS.ENTRIES, JSON.stringify(filtered));
    if (currentUserId) FirebaseService.saveEntry(currentUserId, filtered);
    return filtered;
  },

  getTags: (): string[] => {
    try {
      const data = localStorage.getItem(KEYS.TAGS);
      return data ? JSON.parse(data) : DEFAULT_TAGS;
    } catch (e) {
      return DEFAULT_TAGS;
    }
  },

  addTag: (tag: string) => {
    const tags = StorageService.getTags();
    if (!tags.includes(tag)) {
      tags.push(tag);
      localStorage.setItem(KEYS.TAGS, JSON.stringify(tags));
      if (currentUserId) FirebaseService.saveTags(currentUserId, tags);
    }
    return tags;
  },

  getUnlockedAchievements: (): Record<string, number> => {
    try {
      const data = localStorage.getItem(KEYS.ACHIEVEMENTS);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  },

  unlockAchievement: (id: string) => {
    const unlocked = StorageService.getUnlockedAchievements();
    if (!unlocked[id]) {
      unlocked[id] = Date.now();
      localStorage.setItem(KEYS.ACHIEVEMENTS, JSON.stringify(unlocked));
      if (currentUserId) FirebaseService.saveAchievements(currentUserId, unlocked);
    }
    return unlocked;
  },

  getSavedInsights: (): SavedInsight[] => {
    try {
      const data = localStorage.getItem(KEYS.INSIGHTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveInsight: (insight: SavedInsight) => {
    const insights = StorageService.getSavedInsights();
    insights.unshift(insight); 
    localStorage.setItem(KEYS.INSIGHTS, JSON.stringify(insights));
    if (currentUserId) FirebaseService.saveInsights(currentUserId, insights);
    return insights;
  },

  deleteInsight: (id: string) => {
    const insights = StorageService.getSavedInsights();
    const filtered = insights.filter(i => i.id !== id);
    localStorage.setItem(KEYS.INSIGHTS, JSON.stringify(filtered));
    if (currentUserId) FirebaseService.saveInsights(currentUserId, filtered);
    return filtered;
  },

  getLibrary: (): ContentItem[] => {
    try {
      const data = localStorage.getItem(KEYS.LIBRARY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  addLibraryItem: (item: ContentItem) => {
    const library = StorageService.getLibrary();
    library.unshift(item);
    localStorage.setItem(KEYS.LIBRARY, JSON.stringify(library));
    if (currentUserId) FirebaseService.saveLibrary(currentUserId, library);
    return library;
  },

  updateLibraryItem: (item: ContentItem) => {
    const library = StorageService.getLibrary();
    const index = library.findIndex(i => i.id === item.id);
    if (index !== -1) {
      library[index] = item;
      localStorage.setItem(KEYS.LIBRARY, JSON.stringify(library));
      if (currentUserId) FirebaseService.saveLibrary(currentUserId, library);
    }
    return library;
  },

  deleteLibraryItem: (id: string) => {
    const library = StorageService.getLibrary();
    const filtered = library.filter(i => i.id !== id);
    localStorage.setItem(KEYS.LIBRARY, JSON.stringify(filtered));
    if (currentUserId) FirebaseService.saveLibrary(currentUserId, filtered);
    return filtered;
  },

  getAiAccessState: (): AiAccessState => {
    try {
      const data = localStorage.getItem(KEYS.AI_ACCESS);
      return data ? JSON.parse(data) : { unlocked: false, attempts: 0 };
    } catch (e) {
      return { unlocked: false, attempts: 0 };
    }
  },

  updateAiAccessState: (state: AiAccessState) => {
    localStorage.setItem(KEYS.AI_ACCESS, JSON.stringify(state));
    if (currentUserId) FirebaseService.saveAiAccess(currentUserId, state);
    return state;
  },

  getFullBackupData: () => {
    return {
      entries: StorageService.getEntries(),
      tags: StorageService.getTags(),
      insights: StorageService.getSavedInsights(),
      achievements: StorageService.getUnlockedAchievements(),
      library: StorageService.getLibrary(),
      aiAccess: StorageService.getAiAccessState(),
      version: 1,
      backupDate: new Date().toISOString()
    };
  }
};