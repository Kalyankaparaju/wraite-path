"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, CheckCircle, AlertCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const formatRawScriptToTipTap = (rawText: string) => {
    const lines = rawText.split('\n');
    const nodes: string[] = [];
    
    let lastType = 'action';

    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (!t) {
        lastType = 'action'; // empty line resets to action
        continue;
      }

      // Check for Page Numbers just in case some slipped through
      if (/^[\d\s\-\.\/]+$/.test(t) || /^page\s*\d+$/i.test(t)) {
        continue; // skip
      }

      // Check for Transitions (CUT TO:, CUT TO., FADE IN:, etc.)
      const isTransition = /^(CUT TO|FADE IN|FADE OUT|DISSOLVE TO|SMASH CUT TO|MATCH CUT TO|JUMP CUT TO|QUICK CUT TO|BACK TO|TITLE CARD)[\.\:]?/i.test(t);
      if (isTransition) {
        nodes.push(`<p data-type="transition">${t.toUpperCase()}</p>`);
        lastType = 'action';
        continue;
      }

      // Check for Slugline (EXT. / INT.)
      if (t.toUpperCase().startsWith('EXT.') || t.toUpperCase().startsWith('INT.')) {
        nodes.push(`<p data-type="action"><strong>${t.toUpperCase()}</strong></p>`);
        lastType = 'action';
        continue;
      }

      // Check for Character Name
      const isAllCaps = t === t.toUpperCase() && /[a-zA-Z]/.test(t);
      // It's a character if it's short, ALL CAPS, and follows an action (or dialog from someone else, but usually spaced).
      // If lastType is already Character, multiple character lines usually means a mistake, but we'll allow it.
      if (isAllCaps && t.length < 40 && (lastType === 'action' || lastType === 'dialogue')) {
        nodes.push(`<p data-type="character">${t}</p>`);
        lastType = 'character';
        continue;
      }

      // Check for Parenthetical
      if (t.startsWith('(') && t.endsWith(')')) {
        nodes.push(`<p data-type="parenthetical">${t}</p>`);
        lastType = 'parenthetical';
        continue;
      }

      // If last line was character, parenthetical, or dialogue -> THIS is dialogue
      if (lastType === 'character' || lastType === 'parenthetical' || lastType === 'dialogue') {
        // If it suddenly became all caps and short, it might be a new character without spacing
        if (isAllCaps && t.length < 40) {
          nodes.push(`<p data-type="character">${t}</p>`);
          lastType = 'character';
          continue;
        }

        nodes.push(`<p data-type="dialogue">${t}</p>`);
        lastType = 'dialogue';
        continue;
      }

      // Default to Action
      nodes.push(`<p data-type="action">${t}</p>`);
      lastType = 'action';
    }

    return nodes.join('');
  };

  const [formData, setFormData] = useState({
    title: "",
    template: "Feature Film",
    mode: "Screenplay",
    language: "English",
    synopsis: "",
  });
  
  const [initialScript, setInitialScript] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<"none" | "loading" | "success" | "error">("none");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadState("loading");
    setUploadName(file.name);
    
    if (!formData.title) {
        setFormData(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, "") }));
    }

    const payload = new FormData();
    payload.append("file", file);

    try {
      const res = await fetch("/api/parse", { method: "POST", body: payload });
      if (!res.ok) {
         let errorText = await res.text();
         try {
           const json = JSON.parse(errorText);
           errorText = json.error || errorText;
         } catch(e) {}
         throw new Error(errorText || "Upload Failed");
      }
      
      const { text } = await res.json();
      setInitialScript(text);
      setUploadState("success");
    } catch (err: any) {
      console.error(err);
      setUploadState("error");
      alert("Failed to read document: " + err.message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const parseScriptToScenesAI = async (scriptText: string, projectId: string) => {
    try {
      const aiRes = await fetch("/api/parse-boundaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: scriptText })
      });

      if (!aiRes.ok) throw new Error("AI Parsing Failed");

      const { scenes: boundaries } = await aiRes.json();
      const lines = scriptText.split('\n');
      const scenesToInsert = [];

      if (boundaries && boundaries.length > 0) {
        for (let i = 0; i < boundaries.length; i++) {
          const curr = boundaries[i];
          const next = boundaries[i + 1];
          
          const startIdx = curr.start_line;
          const endIdx = next ? next.start_line : lines.length;
          
          // Slice the lines array using the exact indexes returned by the LLM
          const contentLines = lines.slice(startIdx, endIdx);
          
          const contentRaw = contentLines.join('\n').trim();
          scenesToInsert.push({
            project_id: projectId,
            scene_number: i + 1,
            location: curr.location || "SCENE",
            time_of_day: curr.time_of_day || "",
            content: formatRawScriptToTipTap(contentRaw),
          });
        }
      } else {
        throw new Error("No boundaries detected");
      }

      return scenesToInsert;
    } catch (error) {
      console.error("AI Scene Splitting Error:", error);
      // Fallback: Dump whole script as Scene 1
      return [{
        project_id: projectId,
        scene_number: 1,
        location: "IMPORTED SCRIPT",
        time_of_day: "",
        content: formatRawScriptToTipTap(scriptText.trim()),
      }];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to create project");
      const data = await res.json();
      
      if (data) {
        if (initialScript) {
          const scenesToInsert = await parseScriptToScenesAI(initialScript, data.id);
          
          await fetch(`/api/scenes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(scenesToInsert)
          });
        } else if (formData.synopsis.trim()) {
          try {
             // Generate draft scenes using AI
             const draftRes = await fetch('/api/generate-draft', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(formData)
             });
             
             if (draftRes.ok) {
                 const { scenes } = await draftRes.json();
                 if (scenes && scenes.length > 0) {
                     const formattedScenes = scenes.map((s: any) => ({
                         project_id: data.id,
                         scene_number: s.scene_number,
                         location: s.location || "SCENE",
                         time_of_day: s.time_of_day || "",
                         synopsis: s.synopsis || "",
                         content: s.content || ""
                     }));
                     await fetch(`/api/scenes`, {
                         method: "POST",
                         headers: { "Content-Type": "application/json" },
                         body: JSON.stringify(formattedScenes)
                     });
                 }
             }
          } catch(err) {
              console.error("Drafting failed", err);
          }
        }
        router.push(`/editor/${data.id}`);
      }
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants: any = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { staggerChildren: 0.1, duration: 0.5, ease: "easeOut" as any } }
  };
  
  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as any } }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 bg-background overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand-base/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] -z-10 pointer-events-none" />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full max-w-md bg-surface/50 backdrop-blur-2xl p-8 rounded-3xl border border-white/5 shadow-2xl relative z-10"
      >
        <motion.h1 variants={itemVariants} className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
          Create New Project
        </motion.h1>
        
        {/* Document Upload Section */}
        <motion.div variants={itemVariants} className="mb-8 bg-black/20 border border-white/10 rounded-2xl p-6 text-center border-dashed backdrop-blur-sm transition-all hover:bg-black/30 hover:border-brand-base/50">
            <input 
              type="file" 
              accept=".pdf,.docx" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            
            {uploadState === "none" && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer group"
                >
                    <div className="w-14 h-14 bg-brand-base/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-brand-base/20 transition-all group-hover:scale-110">
                        <Upload className="w-6 h-6 text-brand-light" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-200 mb-1">Got an existing script?</h3>
                    <p className="text-xs text-gray-500">Upload a PDF or Word file to auto-import it</p>
                </div>
            )}
            
            {uploadState === "loading" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                    <Loader2 className="w-10 h-10 text-brand-light animate-spin mb-4" />
                    <p className="text-sm text-gray-400">Extracting and structuring text...</p>
                </motion.div>
            )}
            
            {uploadState === "success" && (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                    <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        <CheckCircle className="w-7 h-7 text-emerald-400" />
                    </div>
                    <p className="text-sm font-semibold text-emerald-400 mb-1">Script Extracted Successfully!</p>
                    <p className="text-xs text-gray-500">{uploadName} will be automatically split into scenes.</p>
                </motion.div>
            )}
            
            {uploadState === "error" && (
                <motion.div initial={{ x: [-10, 10, -10, 10, 0] }} transition={{ duration: 0.4 }} className="flex flex-col items-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-7 h-7 text-red-400" />
                    </div>
                    <p className="text-sm text-red-400 mb-1 font-semibold">Upload Failed</p>
                    <p className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Click to try another file</p>
                </motion.div>
            )}
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div variants={itemVariants}>
            <label className="block text-sm font-medium text-gray-400 mb-2">Project Title</label>
            <input
              required
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-base focus:border-transparent transition-all shadow-inner"
              placeholder="e.g. The Matrix Reloaded"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <label className="block text-sm font-medium text-gray-400 mb-2">Template</label>
            <select
              value={formData.template}
              onChange={(e) => setFormData({ ...formData, template: e.target.value })}
              className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-base transition-all appearance-none cursor-pointer"
            >
              <option value="Feature Film">Feature Film</option>
              <option value="Web Series">Web Series</option>
              <option value="Short Film">Short Film</option>
              <option value="Reel Script">Reel Script</option>
              <option value="YouTube Script">YouTube Script</option>
            </select>
          </motion.div>

          <motion.div variants={itemVariants}>
            <label className="block text-sm font-medium text-gray-400 mb-2">Writing Mode</label>
            <select
              value={formData.mode}
              onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
              className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-base transition-all appearance-none cursor-pointer"
            >
              <option value="Story">Story</option>
              <option value="Story + Screenplay">Story + Screenplay</option>
              <option value="Screenplay">Screenplay</option>
            </select>
          </motion.div>

          <motion.div variants={itemVariants}>
            <label className="block text-sm font-medium text-gray-400 mb-2">Language</label>
            <select
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-base transition-all appearance-none cursor-pointer"
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Telugu">Telugu</option>
              <option value="Tamil">Tamil</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
              <option value="Hinglish (Hindi + English)">Hinglish</option>
              <option value="Tinglish (Telugu + English)">Tinglish</option>
              <option value="Tanglish (Tamil + English)">Tanglish</option>
            </select>
          </motion.div>

          <motion.div variants={itemVariants}>
            <label className="block text-sm font-medium text-brand-light/90 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Storyline / Synopsis (Optional)
            </label>
            <textarea
              value={formData.synopsis}
              onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
              className="w-full h-32 bg-surface border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-base transition-all resize-none shadow-inner"
              placeholder="Describe your story idea or plot here... We'll magically draft the first few scenes for you automatically!"
            />
          </motion.div>

          <motion.button
            variants={itemVariants}
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-brand-base hover:bg-brand-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-brand-base disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Project"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
