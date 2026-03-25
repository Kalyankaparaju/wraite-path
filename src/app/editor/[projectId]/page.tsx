"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { FileText, ArrowLeft, Loader2, Sparkles, Wand2, Type, AlignLeft, Bot, MessageSquare, PenTool, Plus, Trash2, Send, Lightbulb, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import ReactMarkdown from 'react-markdown';
import { useChat } from '@ai-sdk/react';
import ScreenplayEditor from '@/components/ScreenplayEditor';
import CharactersArcView from '@/components/CharactersArcView';

interface Scene {
  id: string;
  project_id: string;
  scene_number: number;
  location: string;
  time_of_day: string;
  content: string;
}

export default function EditorPage() {
  const { projectId } = useParams() as { projectId: string };
  const router = useRouter();

  const chatConfig = useChat({
    api: '/api/chat',
  } as any) as any;
  
  const { messages = [], isLoading: isChatLoading, append } = chatConfig;
  const [chatInput, setChatInput] = useState("");

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [scenes, setScenes] = useState<any[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [ideas, setIdeas] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'ideas'>('chat');
  const [ideaInput, setIdeaInput] = useState("");
  
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [savingScene, setSavingScene] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) {
            router.push("/dashboard");
            return;
        }
        const data = await res.json();
        
        if (!data.project) {
          router.push("/dashboard");
          return;
        }
        
        setProject(data.project);
        
        if (data.scenes) {
          setScenes(data.scenes);
          // Only auto-select scene if present, otherwise default to characters-arc if project is completely empty
          if (data.scenes.length > 0) setActiveSceneId(data.scenes[0].id);
          else setActiveSceneId('characters-arc');
        }
        
        if (data.characters) setCharacters(data.characters);
        if (data.ideas) setIdeas(data.ideas);
        
      } catch (e) {
        console.error(e);
        router.push("/dashboard");
      }
      setLoading(false);
    }
    init();
  }, [projectId, router]);

  const activeScene = scenes.find((s) => s.id === activeSceneId);

  // Add new scene
  const handleAddScene = async () => {
    if (!project) return;
    const newSceneNumber = scenes.length > 0 ? Math.max(...scenes.map((s) => s.scene_number || 0)) + 1 : 1;
    
    try {
      const res = await fetch(`/api/scenes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{
          project_id: projectId,
          scene_number: newSceneNumber,
          location: "NEW SCENE",
          time_of_day: "DAY",
          content: ""
        }])
      });

      if (res.ok) {
        const { data } = await res.json();
        if (data && data.length > 0) {
          setScenes([...scenes, data[0]]);
          setActiveSceneId(data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
      alert("Failed to add scene");
    }
  };

  const handleDeleteScene = async () => {
    if (!activeScene) return;
    if (!window.confirm("Are you sure you want to delete this scene?")) return;

    try {
      const res = await fetch(`/api/scenes/${activeScene.id}`, { method: 'DELETE' });
      if (res.ok) {
        const remainingScenes = scenes.filter(s => s.id !== activeScene.id);
        const sortedRemaining = remainingScenes.sort((a,b) => (a.scene_number || 0) - (b.scene_number || 0));
        
        // Re-number remaining scenes nicely or keep them as is (keeping as is usually fine for MVP)
        setScenes(sortedRemaining);
        setActiveSceneId(sortedRemaining.length > 0 ? sortedRemaining[0].id : null);
      } else {
        alert("Failed to delete scene.");
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting scene.");
    }
  };

  // Sync Content Process
  const saveSceneContent = async (updatedScene: any) => {
    setSavingScene(true);
    
    const allScenesNow = scenes.map(s => s.id === updatedScene.id ? updatedScene : s);
    setScenes(allScenesNow);
    
    try {
      const res = await fetch(`/api/scenes/${updatedScene.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...updatedScene,
          all_scenes: allScenesNow
        }),
      });
      
      if (res.ok) {
        const { updatedCharacters } = await res.json();
        
        if (updatedCharacters && updatedCharacters.length > 0) {
          const map = new Map(characters.map(c => [c.name, c]));
          updatedCharacters.forEach((uc: any) => map.set(uc.name, uc));
          setCharacters(Array.from(map.values()).sort((a: any, b: any) => b.appearance_count - a.appearance_count));
        }
      }
    } catch(e) {
      console.error(e);
    }

    setSavingScene(false);
  };

  const handleAddIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaInput.trim()) return;
    
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, content: ideaInput.trim() })
      });
      if (res.ok) {
        const { data } = await res.json();
        setIdeas([data, ...ideas]);
        setIdeaInput("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleIdeaStatus = async (ideaId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'used' : 'pending';
    try {
      setIdeas(ideas.map(i => i.id === ideaId ? { ...i, status: newStatus } : i));
      await fetch(`/api/ideas/${ideaId}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // AI Streaming Process
  const handleAiAction = async (mode: 'suggest' | 'improve' | 'format') => {
    if (!activeScene || !activeScene.content) return;
    setIsAiLoading(true);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, context: activeScene.content }),
      });

      if (!res.ok) {
        let errorText = await res.text();
        try {
          const json = JSON.parse(errorText);
          errorText = json.error || errorText;
        } catch(e) {}
        throw new Error(errorText || "AI request failed with status " + res.status);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;
      
      let newText = mode === 'suggest' ? activeScene.content + "\n\n" : "";

      while (!done && reader) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          newText += chunk;
          
          handleSceneChange("content", newText);
        }
      }
    } catch (e: any) {
      console.error(e);
      alert("AI Error Details: " + (e.message || "Please check your terminal logs."));
    } finally {
      setIsAiLoading(false);
    }
  };

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleSceneChange = (field: string, value: string | number) => {
    if (!activeScene) return;
    const updated = { ...activeScene, [field]: value };
    
    setScenes(scenes.map(s => s.id === activeScene.id ? updated : s));

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      saveSceneContent(updated);
    }, 1500); 
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-brand-light" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden relative selection:bg-brand-base/30">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-base/5 rounded-full blur-[150px] pointer-events-none" />

      {/* LEFT PANEL */}
      <motion.div 
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-80 border-r border-white/5 flex flex-col bg-surface/60 backdrop-blur-xl z-10"
      >
        <div className="p-5 border-b border-white/5 flex items-center gap-3 bg-white/5">
          <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
          </button>
          <div className="font-semibold truncate text-lg tracking-tight">{project?.title || "Project"}</div>
        </div>

        {/* Scene List */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center">
              <FileText className="w-3.5 h-3.5 mr-2 opacity-70" />
              Scenes
            </h2>
            <button 
              onClick={handleAddScene}
              className="p-1.5 hover:bg-brand-base/20 rounded-lg text-brand-light transition-all hover:scale-110" 
              title="Add Scene"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-1.5 mb-10">
            <button
              onClick={() => setActiveSceneId('characters-arc')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 border mb-2 ${
                activeSceneId === 'characters-arc' 
                ? "bg-purple-500/15 text-purple-300 border-purple-500/30 flex items-center shadow-[0_0_15px_rgba(168,85,247,0.1)]" 
                : "text-gray-400 hover:bg-white/5 flex items-center hover:text-gray-200 border-transparent"
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 mr-2 ${activeSceneId === 'characters-arc' ? 'text-purple-400' : 'opacity-60'}`} />
              <span className="font-semibold tracking-wide uppercase text-xs">Characters Arc</span>
            </button>
            {scenes.map((scene) => (
              <button
                key={scene.id}
                onClick={() => setActiveSceneId(scene.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 border ${
                  activeSceneId === scene.id 
                  ? "bg-brand-base/15 text-brand-light border-brand-base/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]" 
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200 border-transparent"
                }`}
              >
                <span className="font-medium mr-1.5 opacity-60">S{scene.scene_number}</span> 
                {scene.location}
              </button>
            ))}
            {scenes.length === 0 && (
              <div className="text-xs text-brand-light/60 italic p-4 bg-brand-base/5 rounded-xl border border-brand-base/10">No scenes. Click + to begin.</div>
            )}
          </div>

          {/* Character List */}
          <div className="mb-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
              <PenTool className="w-3.5 h-3.5 mr-2 opacity-70" />
              Detected Cast
            </h2>
            <div className="space-y-2.5">
              {characters.map((c) => (
                <div key={c.id} className="flex flex-col p-3.5 rounded-xl bg-black/20 border border-white/5 shadow-inner">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-sm text-gray-200">{c.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      c.role_tag === "Main" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" :
                      c.role_tag === "Supporting" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" :
                      "bg-white/5 text-gray-400 border border-white/10"
                    }`}>
                      {c.role_tag}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 flex justify-between font-medium">
                    <span>Dialogues: {c.dialogue_count}</span>
                    <span>Scenes: {c.appearance_count}</span>
                  </div>
                </div>
              ))}
              {characters.length === 0 && (
                <div className="text-xs text-gray-500 italic leading-relaxed">Cast appears automatically as you write their names in ALL CAPS.</div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* CENTER PANEL */}
      <div className="flex-1 flex flex-col relative z-0">
        <AnimatePresence>
          {savingScene && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-6 right-6 flex items-center text-xs font-medium text-brand-light bg-surface/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-brand-base/30 shadow-[0_0_15px_rgba(99,102,241,0.2)] z-20"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Syncing...
            </motion.div>
          )}
        </AnimatePresence>

        {activeScene ? (
          <motion.div 
            key={activeScene.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex-1 flex flex-col px-16 py-12 custom-scrollbar overflow-y-auto"
          >
            {/* Header Form */}
            <div className="max-w-3xl mx-auto w-full mb-10 space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-24">
                  <label className="text-[10px] font-bold text-brand-light uppercase tracking-wider block mb-2">Scene #</label>
                  <input
                    type="number"
                    value={activeScene.scene_number}
                    onChange={(e) => handleSceneChange("scene_number", parseInt(e.target.value))}
                    className="w-full bg-transparent border-b-2 border-white/10 pb-2 text-xl font-medium text-white focus:outline-none focus:border-brand-base transition-colors"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-brand-light uppercase tracking-wider block mb-2">Location</label>
                  <input
                    type="text"
                    value={activeScene.location}
                    onChange={(e) => handleSceneChange("location", e.target.value)}
                    className="w-full bg-transparent border-b-2 border-white/10 pb-2 text-xl font-bold text-white focus:outline-none focus:border-brand-base transition-colors"
                    placeholder="EXT. COFFEE SHOP"
                  />
                </div>
                <div className="w-32">
                  <label className="text-[10px] font-bold text-brand-light uppercase tracking-wider block mb-2">Time</label>
                  <input
                    type="text"
                    value={activeScene.time_of_day}
                    onChange={(e) => handleSceneChange("time_of_day", e.target.value)}
                    className="w-full bg-transparent border-b-2 border-white/10 pb-2 text-xl font-medium text-white focus:outline-none focus:border-brand-base transition-colors"
                    placeholder="DAY"
                  />
                </div>
                
                <button
                  onClick={handleDeleteScene}
                  className="ml-auto p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all transform hover:scale-105 border border-red-500/20"
                  title="Delete Scene"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div>
                 <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Synopsis Notes</label>
                 <textarea
                    value={activeScene.synopsis || ""}
                    onChange={(e) => handleSceneChange("synopsis", e.target.value)}
                    className="w-full bg-surface/30 px-4 py-3 rounded-xl border border-white/5 text-base leading-relaxed font-medium text-gray-300 focus:outline-none focus:border-brand-base/50 focus:bg-surface/50 transition-all placeholder:text-gray-600 shadow-inner min-h-[120px] resize-y"
                    placeholder="Brief description of what happens in this scene for AI context..."
                  />
              </div>
            </div>

            {/* Script Rich Text Editor */}
            <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col pt-4">
              <ScreenplayEditor
                initialContent={activeScene.content || ""}
                onChange={(html) => handleSceneChange("content", html)}
              />
            </div>
          </motion.div>
        ) : activeSceneId === 'characters-arc' ? (
          <CharactersArcView 
            projectId={projectId} 
            characters={characters} 
            setCharacters={setCharacters} 
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
             <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                <FileText className="w-10 h-10 opacity-40 text-brand-light" />
             </div>
             <p className="text-lg">Select a scene to start writing.</p>
          </div>
        )}
      </div>

      {/* RIGHT PANEL - AI CO-WRITER CHAT */}
      <motion.div 
        initial={{ x: 300 }}
        animate={{ x: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-80 border-l border-white/5 bg-surface/60 backdrop-blur-xl flex flex-col relative z-10 h-full"
      >
        <AnimatePresence>
          {isChatLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-base via-purple-500 to-brand-base bg-[length:200%_auto] animate-[shimmer_2s_linear_infinite] z-20" 
            />
          )}
        </AnimatePresence>
        
        <div className="flex border-b border-white/5 bg-black/20">
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${activeTab === 'chat' ? 'text-brand-light border-b-2 border-brand-base bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Bot className="w-4 h-4" /> Chat
          </button>
          <button 
            onClick={() => setActiveTab('ideas')}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${activeTab === 'ideas' ? 'text-yellow-400 border-b-2 border-yellow-500 bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Lightbulb className="w-4 h-4" /> Idea Bank
          </button>
        </div>

        {activeTab === 'chat' ? (
          <>
            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm font-sans" id="chat-container">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 opacity-60">
                  <MessageSquare className="w-8 h-8 mb-3 text-white/20" />
                  <p className="text-sm">I'm reading your script.<br/>How can I help you write?</p>
                </div>
          ) : (
            messages.map((m: any) => (
              <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.role === 'user' ? 'bg-brand-base/20 text-brand-light border border-brand-base/30 rounded-tr-sm' : 'bg-white/5 text-gray-300 border border-white/10 rounded-tl-sm'}`}>
                   <ReactMarkdown className="prose prose-invert prose-sm max-w-none">{m.content}</ReactMarkdown>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-white/5 bg-surface/80">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (!chatInput.trim() || isChatLoading) return;
                    const contextPayload = `Active Scene:\n${activeScene?.content || ""}\n\nSpontaneous Ideas Bank:\n${ideas.filter(i => i.status === 'pending').map(i => "- " + i.content).join('\n') || "None"}`;
                    append(
                      { role: 'user', content: chatInput },
                      { options: { body: { context: contextPayload } } }
                    );
              setChatInput("");
            }}
            className="relative"
          >
             <textarea
               value={chatInput}
               onChange={(e) => setChatInput(e.target.value)}
               placeholder="Ask for ideas or a rewrite..."
               className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-base/50 focus:ring-1 focus:ring-brand-base/50 resize-none h-14"
               onKeyDown={(e) => {
                 if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault();
                   if (!chatInput.trim() || isChatLoading) return;
                   
                   const contextPayload = `Active Scene:\n${activeScene?.content || ""}\n\nSpontaneous Ideas Bank:\n${ideas.filter(i => i.status === 'pending').map(i => "- " + i.content).join('\n') || "None"}`;
                   append(
                     { role: 'user', content: chatInput },
                     { options: { body: { context: contextPayload } } }
                   );
                   setChatInput("");
                 }
               }}
             />
             <button 
              onClick={(e) => {
                 e.preventDefault();
                 if (!chatInput.trim() || isChatLoading) return;
                 const contextPayload = `Active Scene:\n${activeScene?.content || ""}\n\nSpontaneous Ideas Bank:\n${ideas.filter(i => i.status === 'pending').map(i => "- " + i.content).join('\n') || "None"}`;
                 append(
                   { role: 'user', content: chatInput },
                   { options: { body: { context: contextPayload } } }
                 );
                 setChatInput("");
              }}
              disabled={!chatInput.trim() || isChatLoading}
              className="absolute right-2 bottom-2 p-2 bg-brand-base text-white rounded-lg hover:bg-brand-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
               <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {ideas.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 opacity-60 px-4">
                  <Lightbulb className="w-8 h-8 mb-3 text-yellow-500/30" />
                  <p className="text-sm">Got a sudden plot idea? Add it here. The AI will remember it and suggest weaving it into future scenes.</p>
                </div>
              ) : (
                ideas.map((idea) => (
                  <div key={idea.id} className={`p-3.5 rounded-xl border transition-all shadow-lg ${idea.status === 'used' ? 'bg-white/5 border-white/5 opacity-50' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
                    <p className={`text-sm mb-3 ${idea.status === 'used' ? 'text-gray-400 line-through' : 'text-gray-200'} leading-relaxed`}>{idea.content}</p>
                    <div className="flex justify-between items-center">
                       <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${idea.status === 'used' ? 'bg-gray-500/20 text-gray-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                         {idea.status}
                       </span>
                       <button onClick={() => handleToggleIdeaStatus(idea.id, idea.status)} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors" title={idea.status === 'used' ? "Mark Pending" : "Mark Used"}>
                         {idea.status === 'used' ? <Plus className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                       </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-white/5 bg-surface/80">
              <form onSubmit={handleAddIdea} className="relative">
                 <textarea
                   value={ideaInput}
                   onChange={(e) => setIdeaInput(e.target.value)}
                   placeholder="Quick! Jot it down..."
                   className="w-full bg-yellow-500/5 hover:bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 pr-12 text-sm text-yellow-100 placeholder-yellow-500/40 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 resize-none h-14 transition-colors"
                   onKeyDown={(e) => {
                     if (e.key === 'Enter' && !e.shiftKey) {
                       handleAddIdea(e);
                     }
                   }}
                 />
                 <button 
                  type="submit"
                  disabled={!ideaInput.trim()}
                  className="absolute right-2 bottom-2 p-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   <Plus className="w-4 h-4 font-bold" />
                </button>
              </form>
            </div>
          </>
        )}
        <div className="mt-8 text-xs text-gray-400 block bg-black/20 p-5 rounded-2xl border border-white/5 backdrop-blur-sm shadow-inner">
           <p className="mb-3 uppercase font-bold text-gray-500 tracking-wider">Pro Tip</p>
           Type names in ALL CAPS to automatically track dialogues and generate smart roles throughout the script.
           <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/5 font-mono text-[10px] leading-relaxed">
             <span className="text-brand-light">ARJUN</span><br/>
             <span className="text-gray-300">We have to get out of here.</span>
           </div>
        </div>
      </motion.div>

    </div>
  );
}
