import { Entry, Tag, Achievement, SavedInsight, ContentItem, AiAccessState, Language } from '../types';

const KEYS = {
  ENTRIES: 'solo_insight_entries',
  TAGS: 'solo_insight_tags',
  ACHIEVEMENTS: 'solo_insight_achievements_state',
  INSIGHTS: 'solo_insight_saved_insights',
  LIBRARY: 'solo_insight_library',
  AI_ACCESS: 'solo_insight_ai_access',
  LANGUAGE: 'solo_insight_language',
};

const DEFAULT_TAGS = ['Relaxation', 'Stress Relief', 'Imagination', 'Toy', 'Visual Content', 'Audio', 'Tired', 'Energetic'];

export const StorageService = {
  
  getLanguage: (): Language => {
    return (localStorage.getItem(KEYS.LANGUAGE) as Language) || 'en';
  },

  setLanguage: (lang: Language) => {
    localStorage.setItem(KEYS.LANGUAGE, lang);
    return lang;
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
    return entries;
  },

  updateEntry: (updatedEntry: Entry) => {
    const entries = StorageService.getEntries();
    const index = entries.findIndex(e => e.id === updatedEntry.id);
    if (index !== -1) {
      entries[index] = updatedEntry;
      localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
    }
    return entries;
  },

  deleteEntry: (id: string) => {
    const entries = StorageService.getEntries();
    const filtered = entries.filter(e => e.id !== id);
    localStorage.setItem(KEYS.ENTRIES, JSON.stringify(filtered));
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
    }
    return unlocked;
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
    return library;
  },

  updateLibraryItem: (item: ContentItem) => {
    const library = StorageService.getLibrary();
    const index = library.findIndex(i => i.id === item.id);
    if (index !== -1) {
      library[index] = item;
      localStorage.setItem(KEYS.LIBRARY, JSON.stringify(library));
    }
    return library;
  },

  deleteLibraryItem: (id: string) => {
    const library = StorageService.getLibrary();
    const filtered = library.filter(i => i.id !== id);
    localStorage.setItem(KEYS.LIBRARY, JSON.stringify(filtered));
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
    return state;
  },

  getFullBackupData: () => {
    return {
      entries: StorageService.getEntries(),
      tags: StorageService.getTags(),
      achievements: StorageService.getUnlockedAchievements(),
      library: StorageService.getLibrary(),
      aiAccess: StorageService.getAiAccessState(),
      language: StorageService.getLanguage(),
      version: 2,
      backupDate: new Date().toISOString(),
      platform: 'web-offline'
    };
  }
};
