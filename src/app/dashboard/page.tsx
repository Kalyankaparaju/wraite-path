"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderOpen, Plus, Clock, Loader2, Sparkles, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
        }
      } catch (e) {
        console.error("Failed to load projects", e);
      }
      setLoading(false);
    }
    fetchProjects();
  }, []);

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (res.ok) {
        setProjects(projects.filter(p => p.id !== projectId));
      } else {
        alert("Failed to delete project.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while deleting the project.");
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="relative min-h-screen p-8 bg-background overflow-hidden selection:bg-brand-base/30">
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-base/5 rounded-full blur-[150px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-purple-600/5 rounded-full blur-[150px] -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-12 relative z-10 pt-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-2">
              Your Architecture
            </h1>
            <p className="text-gray-400 text-lg">Select a project to continue writing or start a new masterpiece.</p>
          </div>
          <Link
            href="/new-project"
            className="group relative inline-flex items-center px-6 py-3 bg-brand-base hover:bg-brand-light text-white rounded-xl transition-all duration-300 font-semibold shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transform hover:-translate-y-0.5 overflow-hidden"
          >
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
            <Plus className="w-5 h-5 mr-2" />
            New Project
          </Link>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-brand-light" />
          </div>
        ) : projects.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border border-dashed border-white/10 rounded-3xl p-16 text-center text-gray-500 flex flex-col items-center bg-surface/30 backdrop-blur-sm"
          >
            <div className="w-20 h-20 bg-brand-base/10 rounded-full flex items-center justify-center mb-6">
              <FolderOpen className="w-10 h-10 text-brand-light" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-3">No active projects</h3>
            <p className="mb-8 text-gray-400 max-w-md">Your workspace is empty. Get started by drafting your first script or importing an existing one.</p>
            <Link
              href="/new-project"
              className="inline-flex items-center px-6 py-3 bg-surface hover:bg-surface-hover border border-white/10 rounded-xl transition-all text-white font-medium hover:border-brand-base/50"
            >
              Configure Workspace
            </Link>
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {projects.map((project) => (
              <motion.div key={project.id} variants={itemVariants}>
                <Link 
                  href={`/editor/${project.id}`}
                  className="group block h-full bg-surface/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 hover:bg-surface-hover hover:border-brand-base/50 hover:shadow-[0_8px_30px_rgba(99,102,241,0.15)] transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-base/20 to-purple-600/20 flex items-center justify-center border border-white/5 group-hover:border-brand-light/30 transition-colors">
                        <Sparkles className="w-6 h-6 text-brand-light group-hover:text-white transition-colors" />
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, project.id)}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 leading-tight">
                      {project.title}
                    </h3>
                    
                    <div className="inline-flex items-center gap-2 mb-6 text-xs font-semibold px-2.5 py-1 bg-black/40 border border-white/5 rounded-md w-fit text-brand-light/90">
                      {project.template}
                    </div>

                    <div className="mt-auto pt-5 border-t border-white/5 flex items-center text-xs font-medium text-gray-400">
                      <Clock className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                      Created {new Date(project.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
