import React, { useState } from 'react';
import { ContentItem } from '../types';
import { StorageService } from '../services/storageService';
import { Search, Plus, Star, Link as LinkIcon, User, Trash2, ExternalLink, Copy, X } from 'lucide-react';
import { format } from 'date-fns';

interface LibraryProps {
  items: ContentItem[];
  onUpdate: (items: ContentItem[]) => void;
}

export const Library: React.FC<LibraryProps> = ({ items, onUpdate }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFav, setFilterFav] = useState(false);

  // Form State
  const [newUrl, setNewUrl] = useState('');
  const [newActor, setNewActor] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const handleAddItem = () => {
    if (!newUrl && !newActor) return; // Need at least one

    const newItem: ContentItem = {
      id: crypto.randomUUID(),
      url: newUrl,
      actor: newActor,
      title: newTitle,
      isFavorite: false,
      createdAt: Date.now()
    };

    const updated = StorageService.addLibraryItem(newItem);
    onUpdate(updated);
    
    // Reset form
    setNewUrl('');
    setNewActor('');
    setNewTitle('');
    setIsAdding(false);
  };

  const toggleFavorite = (item: ContentItem) => {
    const updatedItem = { ...item, isFavorite: !item.isFavorite };
    const updatedList = StorageService.updateLibraryItem(updatedItem);
    onUpdate(updatedList);
  };

  const deleteItem = (id: string) => {
    if (confirm('Remove this item from library?')) {
        const updatedList = StorageService.deleteLibraryItem(id);
        onUpdate(updatedList);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = (item.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.actor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.url?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFav = filterFav ? item.isFavorite : true;
    return matchesSearch && matchesFav;
  });

  return (
    <div className="space-y-6 pb-24 animate-slide-up">
       <header className="flex justify-between items-center mb-4 pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Library</h1>
          <p className="text-slate-400 text-sm font-medium">Your collection</p>
        </div>
        <button 
            onClick={() => setIsAdding(!isAdding)}
            className={`p-3 rounded-full border transition-all ${isAdding ? 'bg-slate-800 text-white border-slate-600' : 'bg-violet-600 text-white border-violet-500 shadow-[0_0_15px_rgba(124,58,237,0.4)]'}`}
        >
            {isAdding ? <X size={20} /> : <Plus size={20} />}
        </button>
      </header>

      {/* Add Item Form */}
      {isAdding && (
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl animate-in slide-in-from-top-4 duration-300">
              <div className="space-y-4">
                  <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Actor / Actress</label>
                      <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus-within:border-violet-500 transition-colors">
                          <User size={14} className="text-slate-500"/>
                          <input 
                            type="text" 
                            className="bg-transparent w-full text-sm text-white outline-none placeholder-slate-600"
                            placeholder="Name..."
                            value={newActor}
                            onChange={e => setNewActor(e.target.value)}
                          />
                      </div>
                  </div>
                  <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Link / URL</label>
                      <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus-within:border-violet-500 transition-colors">
                          <LinkIcon size={14} className="text-slate-500"/>
                          <input 
                            type="text" 
                            className="bg-transparent w-full text-sm text-white outline-none placeholder-slate-600"
                            placeholder="https://..."
                            value={newUrl}
                            onChange={e => setNewUrl(e.target.value)}
                          />
                      </div>
                  </div>
                  <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Note / Title (Optional)</label>
                      <input 
                        type="text" 
                        className="bg-slate-950 border border-slate-800 rounded-lg w-full px-3 py-2 text-sm text-white outline-none focus:border-violet-500 transition-colors placeholder-slate-600"
                        placeholder="e.g. Favorite scene"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                      />
                  </div>
                  <button 
                    onClick={handleAddItem}
                    className="w-full bg-slate-100 text-slate-900 font-bold py-3 rounded-xl hover:bg-white transition-colors"
                  >
                      Add to Collection
                  </button>
              </div>
          </div>
      )}

      {/* Search & Filter */}
      <div className="flex gap-3">
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl flex items-center px-3 py-2.5">
              <Search size={16} className="text-slate-500 mr-2" />
              <input 
                type="text" 
                placeholder="Search..." 
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
                  {items.length === 0 ? "Library is empty." : "No matches found."}
              </div>
          ) : (
              filteredItems.map(item => (
                  <div key={item.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-start gap-4 group hover:border-slate-700 transition-all">
                      <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                              {item.title && <h3 className="text-sm font-bold text-white truncate">{item.title}</h3>}
                              {item.actor && (
                                <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${item.title ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-transparent text-white font-bold text-sm pl-0 border-none'}`}>
                                    {!item.title && <User size={14} className="text-violet-400"/>}
                                    {item.actor}
                                </span>
                              )}
                          </div>
                          
                          {item.url && (
                              <a href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors truncate mb-2">
                                  <ExternalLink size={12} />
                                  {item.url}
                              </a>
                          )}
                          
                          <div className="text-[10px] text-slate-600">
                              Added {format(new Date(item.createdAt), 'MMM d, yyyy')}
                          </div>
                      </div>

                      <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => toggleFavorite(item)}
                            className={`p-2 rounded-lg transition-colors ${item.isFavorite ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'}`}
                          >
                              <Star size={16} fill={item.isFavorite ? "currentColor" : "none"} />
                          </button>
                          <button 
                            onClick={() => deleteItem(item.id)}
                            className="p-2 rounded-lg text-slate-600 hover:text-red-400 transition-colors"
                          >
                              <Trash2 size={16} />
                          </button>
                      </div>
                  </div>
              ))
          )}
      </div>
    </div>
  );
};
