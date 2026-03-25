import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Image as ImageIcon, Loader2, Save } from 'lucide-react';

interface CharactersArcViewProps {
  projectId: string;
  characters: any[];
  setCharacters: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function CharactersArcView({ projectId, characters, setCharacters }: CharactersArcViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loreInputs, setLoreInputs] = useState<Record<string, string>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const handleLoreChange = (id: string, value: string) => {
    setLoreInputs(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveLore = async (char: any) => {
    const updatedLore = loreInputs[char.id] !== undefined ? loreInputs[char.id] : char.lore;
    
    setLoadingStates(prev => ({ ...prev, [char.id]: true }));
    try {
      const res = await fetch(`/api/characters/${char.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lore: updatedLore })
      });
      if (res.ok) {
        setCharacters(prev => prev.map(c => c.id === char.id ? { ...c, lore: updatedLore } : c));
        setEditingId(null);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save character lore.');
    } finally {
      setLoadingStates(prev => ({ ...prev, [char.id]: false }));
    }
  };

  const generateLore = async (char: any) => {
    if (!window.confirm(`Generate AI psychological profile for ${char.name}? This will analyze their dialogue.`)) return;
    
    setLoadingStates(prev => ({ ...prev, [char.id]: true }));
    try {
      const res = await fetch(`/api/characters/${char.id}/lore`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLoreInputs(prev => ({ ...prev, [char.id]: data.lore }));
        setCharacters(prev => prev.map(c => c.id === char.id ? { ...c, lore: data.lore } : c));
      } else {
        alert("Failed to generate lore.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStates(prev => ({ ...prev, [char.id]: false }));
    }
  };

  const generatePortrait = async (char: any) => {
    alert("Portrait generation will be implemented in the next phase! For now, we are focusing on Text & Lore.");
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col p-12 custom-scrollbar overflow-y-auto"
    >
      <div className="max-w-4xl mx-auto w-full">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-brand-light font-display">Cast & Character Arcs</h1>
          <p className="text-gray-400 mt-3 max-w-2xl mx-auto text-sm">Define your characters, shape their backstories, and establish physical and psychological profiles to enrich the storytelling experience.</p>
        </div>

        {characters.length === 0 ? (
          <div className="text-center p-12 bg-surface/50 rounded-2xl border border-white/5 backdrop-blur-sm">
            <p className="text-gray-500 italic">No characters detected yet. They will appear here automatically when typed in ALL CAPS in the screenplay.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {characters.map(char => {
              const isEditing = editingId === char.id;
              const isLoading = loadingStates[char.id];
              const currentLore = loreInputs[char.id] !== undefined ? loreInputs[char.id] : (char.lore || "");

              return (
                <div key={char.id} className="bg-surface/60 border border-white/5 rounded-2xl p-6 backdrop-blur-md shadow-lg flex gap-6 hover:border-white/10 transition-colors">
                  
                  {/* Portrait Area Placeholder */}
                  <div className="flex flex-col items-center justify-center w-36 h-48 bg-black/40 rounded-xl border border-white/5 relative overflow-hidden group">
                    {char.portrait_url ? (
                      <img src={char.portrait_url} alt={char.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-white/10 group-hover:text-purple-400/50 transition-colors" />
                    )}
                    <button 
                      onClick={() => generatePortrait(char)}
                      className="absolute bottom-2 left-2 right-2 py-1.5 px-2 bg-purple-500/80 hover:bg-purple-500 text-[10px] font-bold text-white rounded opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md shadow-lg truncate"
                    >
                      Generate Portrait
                    </button>
                  </div>

                  {/* Info Area */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight text-white mb-1">{char.name}</h2>
                        <div className="flex items-center gap-3 text-xs font-medium">
                          <span className={`px-2 py-0.5 rounded-full ${
                            char.role_tag === "Main" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" :
                            char.role_tag === "Supporting" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" :
                            "bg-white/5 text-gray-400 border border-white/10"
                          }`}>
                            {char.role_tag}
                          </span>
                          <span className="text-gray-500">{char.appearance_count} Scenes</span>
                          <span className="text-gray-500">{char.dialogue_count} Lines</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                         <button 
                            onClick={() => generateLore(char)}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-3 py-1.5 bg-brand-base/20 hover:bg-brand-base/30 text-brand-light text-xs font-semibold rounded-lg border border-brand-base/30 transition-colors disabled:opacity-50"
                         >
                            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            AI Profile
                         </button>
                      </div>
                    </div>

                    <div className="flex-1 relative">
                       {isEditing ? (
                         <div className="h-full flex flex-col">
                            <textarea 
                              value={currentLore}
                              onChange={(e) => handleLoreChange(char.id, e.target.value)}
                              className="flex-1 w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 resize-y min-h-[120px]"
                              placeholder="Describe the character's background, physical traits, personality..."
                            />
                            <div className="flex gap-2 justify-end mt-3">
                              <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors">Cancel</button>
                              <button disabled={isLoading} onClick={() => handleSaveLore(char)} className="px-3 py-1.5 flex items-center gap-2 text-xs font-bold bg-white text-black hover:bg-gray-200 transition-colors rounded-lg">
                                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                              </button>
                            </div>
                         </div>
                       ) : (
                         <div 
                           onClick={() => setEditingId(char.id)}
                           className="h-full min-h-[120px] p-3 rounded-xl border border-transparent hover:border-white/5 hover:bg-white/5 cursor-text transition-colors group"
                         >
                           {currentLore ? (
                             <p className="text-sm text-gray-400 whitespace-pre-wrap leading-relaxed">{currentLore}</p>
                           ) : (
                             <p className="text-sm text-gray-600 italic group-hover:text-gray-500">Click to add character lore and styling descriptions...</p>
                           )}
                         </div>
                       )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
