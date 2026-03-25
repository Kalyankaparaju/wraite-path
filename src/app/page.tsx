"use client";

import Link from "next/link";
import { PenLine, Sparkles, Wand2 } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-background overflow-hidden px-6">

      {/* Dynamic Background Blurs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-brand-base/20 rounded-full blur-[120px] -z-10 pointer-events-none opacity-50" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[500px] bg-purple-600/10 rounded-full blur-[150px] -z-10 pointer-events-none opacity-40" />

      {/* Hero Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" as const }}
        className="max-w-4xl w-full text-center space-y-10 flex flex-col items-center relative z-10"
      >
        {/* Floating Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-brand-base/30 blur-2xl rounded-full" />
          <div className="relative w-24 h-24 bg-surface/50 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl">
            <PenLine className="w-12 h-12 text-brand-light" />
          </div>
        </motion.div>

        {/* Title */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-white/5 text-sm text-brand-light font-medium mb-4 shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>The Future of Screenwriting</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-6xl md:text-8xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/40 pb-2"
          >
            wrAIte Path
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed"
          >
            An intelligent workspace designed for visionaries. Focus on the soul of your story while we architect the structure and analyze your characters.
          </motion.p>
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="pt-8 flex flex-col sm:flex-row gap-4 items-center justify-center"
        >
          <Link
            href="/new-project"
            className="group relative inline-flex items-center justify-center px-8 py-4 bg-brand-base hover:bg-brand-light text-white font-medium rounded-2xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] overflow-hidden"
          >
            {/* Button Shine Effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
            <Wand2 className="w-5 h-5 mr-2" />
            Start Writing Now
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-8 py-4 bg-surface hover:bg-surface-hover text-gray-300 font-medium rounded-2xl border border-white/10 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg"
          >
            View Projects
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
