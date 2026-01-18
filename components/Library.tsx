import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { ContentItem, Language } from '../services/types';
import { StorageService } from '../services/storageService';
import { Search, Plus, Star, Link as LinkIcon, User, ExternalLink, X, Save, FileText, Pencil, Play } from 'lucide-react';
import { format } from 'date-fns';
import { translations } from '../utils/translations';
import { SwipeableEntry } from './SwipeableEntry';

interface LibraryProps {
  items: ContentItem[];
  onUpdate: (items: ContentItem[]) => void;
  lang: Language;
  dateLocale?: any;
}

export interface LibraryRef {
    openAddModal: () => void;
}

export const Library = forwardRef<LibraryRef, LibraryProps>(({ items, onUpdate, lang, dateLocale }, ref) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFav, setFilterFav] = useState(false);

  // Form State
  const [newUrl, setNewUrl] = useState('');
  const [newActor, setNewActor] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const t = translations[lang];

  useImperativeHandle(ref, () => ({
    openAddModal: () => {
        openAddModal();
    }
  }));

  const handleSaveItem = () => {
    if (!newUrl && !newActor && !newTitle) return; // Need at least one

    if (editingItem) {
        // Update existing
        const updatedItem: ContentItem = {
            ...editingItem,
            url: newUrl,
            actor: newActor,
            title: newTitle,
        };
        const updatedList = StorageService.updateLibraryItem(updatedItem);
        onUpdate(updatedList);
    } else {
        // Create new
        const newItem: ContentItem = {
            id: crypto.randomUUID(),
            url: newUrl,
            actor: newActor,
            title: newTitle,
            isFavorite: false,
            createdAt: Date.now()
        };
        const updatedList = StorageService.addLibraryItem(newItem);
        onUpdate(updatedList);
    }
    
    closeModal();
  };

  const handleEditStart = (item: ContentItem) => {
    setEditingItem(item);
    setNewUrl(item.url || '');
    setNewActor(item.actor || '');
    setNewTitle(item.title || '');
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setNewUrl('');
    setNewActor('');
    setNewTitle('');
    setIsModalOpen(true);
  }

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setNewUrl('');
    setNewActor('');
    setNewTitle('');
  };

  const toggleFavorite = (item: ContentItem) => {
    const updatedItem = { ...item, isFavorite: !item.isFavorite };
    const updatedList = StorageService.updateLibraryItem(updatedItem);
    onUpdate(updatedList);
  };

  const deleteItem = (id: string) => {
    if (confirm(t.delete_confirm)) {
        const updatedList = StorageService.deleteLibraryItem(id);
        onUpdate(updatedList);
    }
  };

  const handleOpenLink = (url: string) => {
    if (!url) return;
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
    }
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = (item.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.actor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.url?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFav = filterFav ? item.isFavorite : true;
    return matchesSearch && matchesFav;
  });

  return (
    <>
      <div className="space-y-6 animate-slide-up pb-24">
         <header className="flex justify-between items-center mb-4 pt-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{t.library_title}</h1>
            <p className="text-slate-400 text-sm font-medium">{t.library_subtitle}</p>
          </div>
          {/* Add button removed from here, moved to central FAB */}
        </header>

        {/* Search & Filter */}
        <div className="flex gap-3">
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl flex items-center px-3 py-2.5">
                <Search size={16} className="text-slate-500 mr-2" />
                <input 
                  type="text" 
                  placeholder={t.search_placeholder} 
                  className="bg-transparent w-full text-sm text-white outline-none placeholder-slate-600"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <button 
              onClick={() => setFilterFav(!filterFav)}
              className={`px-4 rounded-xl border flex items-center justify-center transition-all ${filterFav ? 'bg-amber-900/30 border-amber-500/50 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'}`}
            >
                <Star size={18} fill={filterFav ? "currentColor" : "none"} />
            </button>
        </div>

        {/* List */}
        <div className="space-y-3">
            {filteredItems.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">
                    {items.length === 0 ? t.empty_library : t.no_matches}
                </div>
            ) : (
                filteredItems.map(item => (
                    <SwipeableEntry key={item.id} onDelete={() => deleteItem(item.id)}>
                        <div className="bg-slate-900/50 border border-slate-800/50 p-4 rounded-2xl flex items-center gap-4 group relative backdrop-blur-md hover:bg-slate-800/60 transition-colors">
                            {/* Left Content Area */}
                            <div className="flex-1 min-w-0">
                                {/* Header: Title & Actor */}
                                <div className="flex items-center gap-2 mb-1">
                                    {item.title ? (
                                        <h3 className="text-sm font-bold text-white truncate">{item.title}</h3>
                                    ) : (
                                        <h3 className="text-sm font-bold text-slate-500 italic truncate">
                                            {item.actor || t.what_watched}
                                        </h3>
                                    )}
                                    
                                    {item.actor && item.title && (
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/50 truncate max-w-[80px]">
                                            {item.actor}
                                        </span>
                                    )}
                                </div>
                                
                                {/* URL (Small) */}
                                {item.url && (
                                    <div className="flex items-center gap-1 mb-2 opacity-70">
                                        <ExternalLink size={10} className="text-violet-400 shrink-0"/>
                                        <span className="text-[10px] text-violet-300 truncate">{item.url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                                    </div>
                                )}
                                
                                {/* Footer: Date & Small Actions */}
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-[10px] text-slate-600 font-medium">
                                        {format(new Date(item.createdAt), 'MMM d, yyyy', { locale: dateLocale })}
                                    </span>
                                    
                                    <div className="flex items-center gap-1 pl-2">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }}
                                            className={`p-1.5 rounded-lg transition-colors ${item.isFavorite ? 'text-amber-400 bg-amber-900/10' : 'text-slate-600 hover:text-slate-400 hover:bg-slate-800'}`}
                                        >
                                            <Star size={14} fill={item.isFavorite ? "currentColor" : "none"} />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleEditStart(item); }}
                                            className="p-1.5 rounded-lg text-slate-600 hover:text-white hover:bg-slate-800 transition-colors"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right Action Button (Jump) */}
                            {item.url && (
                                <button 
                                    onClick={() => handleOpenLink(item.url!)}
                                    className="shrink-0 w-12 h-12 rounded-full bg-slate-800 hover:bg-violet-600/20 border border-slate-700 hover:border-violet-500/50 text-violet-400 hover:text-violet-300 flex items-center justify-center transition-all shadow-sm active:scale-95 group/play"
                                >
                                    <Play size={20} fill="currentColor" className="ml-1 group-hover/play:scale-110 transition-transform"/>
                                </button>
                            )}
                        </div>
                    </SwipeableEntry>
                ))
            )}
        </div>
      </div>

      {/* Add/Edit Item Modal Card - Rendered via Portal to break out of containers */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
            <div 
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-xl pointer-events-auto transition-all duration-500 animate-in fade-in" 
                onClick={closeModal} 
            />
            
            <div className="relative w-[320px] h-[540px] bg-[#0B0F19] border border-slate-800/60 rounded-[32px] shadow-[0_25px_80px_-15px_rgba(0,0,0,0.8)] flex flex-col pointer-events-auto overflow-hidden animate-in zoom-in-95 duration-300 slide-in-from-bottom-4">
                
                <button onClick={closeModal} className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-slate-900 text-slate-500 hover:text-white transition-colors">
                    <X size={16} />
                </button>

                <div className="flex-1 flex flex-col pt-14 px-6 pb-20">
                     <div className="flex items-center gap-2 mb-8 opacity-60">
                        {editingItem ? <Pencil size={14} className="text-violet-400" /> : <Plus size={14} className="text-violet-400" />}
                        <span className="text-xs font-bold uppercase tracking-widest text-white">
                            {editingItem ? t.edit_item : t.add_to_collection}
                        </span>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                             <label className="text-[10px] text-slate-500 uppercase font-bold pl-1">{t.actor}</label>
                             <div className="flex items-center bg-slate-900 rounded-xl px-4 py-3 border border-slate-800 focus-within:border-violet-500 transition-colors">
                                <User size={16} className="text-slate-500 mr-3 shrink-0"/>
                                <input 
                                    type="text" 
                                    value={newActor}
                                    onChange={(e) => setNewActor(e.target.value)}
                                    placeholder={t.placeholder_actor}
                                    className="bg-transparent text-sm text-white w-full outline-none font-medium placeholder-slate-600"
                                    autoFocus={!editingItem}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                             <label className="text-[10px] text-slate-500 uppercase font-bold pl-1">{t.link}</label>
                             <div className="flex items-center bg-slate-900 rounded-xl px-4 py-3 border border-slate-800 focus-within:border-violet-500 transition-colors">
                                <LinkIcon size={16} className="text-slate-500 mr-3 shrink-0"/>
                                <input 
                                    type="text" 
                                    value={newUrl}
                                    onChange={(e) => setNewUrl(e.target.value)}
                                    placeholder={t.placeholder_link}
                                    className="bg-transparent text-sm text-white w-full outline-none font-medium placeholder-slate-600"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                             <label className="text-[10px] text-slate-500 uppercase font-bold pl-1">{t.note_title}</label>
                             <div className="flex items-center bg-slate-900 rounded-xl px-4 py-3 border border-slate-800 focus-within:border-violet-500 transition-colors">
                                <FileText size={16} className="text-slate-500 mr-3 shrink-0"/>
                                <input 
                                    type="text" 
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder={t.placeholder_note}
                                    className="bg-transparent text-sm text-white w-full outline-none font-medium placeholder-slate-600"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#0B0F19]/90 backdrop-blur-md border-t border-slate-800/50 flex items-center justify-end px-6 z-10">
                     <button 
                        onClick={handleSaveItem}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-full text-sm font-bold shadow-lg shadow-violet-500/20 hover:brightness-110 transition-transform active:scale-95"
                    >
                        {editingItem ? t.confirm : t.add_to_collection} <Save size={16} />
                    </button>
                </div>
            </div>
        </div>,
        document.body
      )}
    </>
  );
});