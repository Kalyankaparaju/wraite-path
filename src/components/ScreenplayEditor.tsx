"use client";

import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Paragraph from '@tiptap/extension-paragraph';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState, useRef } from 'react';
import { Mic, Loader2, Square } from 'lucide-react';

// Custom Paragraph extension to handle screenplay formatting modes via 'type'
const ScreenplayNode = Paragraph.extend({
  name: 'screenplayNode',
  addAttributes() {
    return {
      type: {
        default: 'action',
        parseHTML: (element) => element.getAttribute('data-type') || 'action',
        renderHTML: (attributes) => {
          let style = "margin-bottom: 0; line-height: 1.4; font-family: 'Courier Prime', 'Courier New', monospace; transition: all 0.2s ease-out; ";
          
          switch(attributes.type) {
             case 'scene_heading': 
               style += "text-transform: uppercase; font-weight: bold; margin-top: 1.5em;"; 
               break;
             case 'character': 
               style += "text-transform: uppercase; margin-left: 35%; width: fit-content; margin-top: 1.2em;"; 
               break;
             case 'dialogue': 
               style += "margin-left: 20%; margin-right: 20%; margin-top: 0;"; 
               break;
             case 'parenthetical': 
               style += "margin-left: 28%; width: fit-content; margin-top: 0;"; 
               break;
             case 'transition': 
               style += "text-transform: uppercase; font-weight: bold; text-align: right; padding-right: 5%; margin-top: 1.5em;"; 
               break;
             case 'action':
             default:
               style += "margin-top: 1.2em;";
               break;
          }
          
          return {
            'data-type': attributes.type,
            'style': style,
          };
        },
      },
    };
  },
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        const { state } = editor;
        const position = state.selection.$anchor;
        const node = position.node();
        
        // Find the block type attribute, defaulting to 'action'
        const currentType = node.attrs?.type || 'action';
        
        // Standard Tab cycle: Action -> Character -> Dialogue -> Parenthetical -> Action
        const nextMap: Record<string, string> = {
          action: 'character',
          character: 'dialogue',
          dialogue: 'parenthetical',
          parenthetical: 'action',
          scene_heading: 'action',
          transition: 'action'
        };
        
        const nextType = nextMap[currentType] || 'action';
        
        editor.commands.updateAttributes('screenplayNode', { type: nextType });
        return true; // prevent default tab behavior
      },
      Enter: ({ editor }) => {
        const { state } = editor;
        const position = state.selection.$anchor;
        const node = position.node();
        const currentType = node.attrs?.type || 'action';

        // What should the next line be?
        // Character -> Dialogue
        // Parenthetical -> Dialogue
        // Dialogue -> Action
        // Scene Heading -> Action
        const nextMap: Record<string, string> = {
          character: 'dialogue',
          parenthetical: 'dialogue',
          dialogue: 'action',
          scene_heading: 'action',
          action: 'action',
          transition: 'scene_heading'
        };

        const nextType = nextMap[currentType] || 'action';

        // Manually split the block and set the new block's type
        return editor.chain().splitBlock().updateAttributes('screenplayNode', { type: nextType }).run();
      }
    };
  }
});

interface ScreenplayEditorProps {
  initialContent: string;
  onChange: (html: string) => void;
  editable?: boolean;
}

export default function ScreenplayEditor({ initialContent, onChange, editable = true }: ScreenplayEditorProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        paragraph: false, // We replace standard paragraph with our custom one
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      ScreenplayNode,
      Placeholder.configure({
        placeholder: "Start your scene here... Press Tab to switch formats (Action -> Character -> Dialog).",
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: initialContent || '<p data-type="action"></p>',
    editable,
    onUpdate: ({ editor }) => {
      // Pass the HTML string back up
      onChange(editor.getHTML());
    },
  });

  // Keep content synced if project active scene swaps
  useEffect(() => {
    if (editor && initialContent !== undefined && editor.getHTML() !== initialContent) {
      // Re-initialize content but avoid cursor jumping issues
      if (!editor.isFocused) {
        editor.commands.setContent(initialContent || '<p data-type="action"></p>');
      }
    }
  }, [initialContent, editor]);

  // Voice Dictation Logic
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
             currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(prev => prev + " " + currentTranscript);
        };
        
        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsRecording(false);
        };
        
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleRecording = async () => {
    if (isRecording) {
      // STOP recording
      setIsRecording(false);
      if (recognitionRef.current) {
         recognitionRef.current.stop();
      }
      
      // Process Transcript
      if (transcript.trim().length > 0) {
        setIsProcessingVoice(true);
        try {
           const res = await fetch('/api/voice-to-script', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ transcript: transcript.trim() })
           });
           
           if (res.ok) {
             const data = await res.json();
             // Insert properly formatted HTML precisely at cursor
             if (editor && data.html) {
                editor.commands.insertContent(data.html);
             }
           } else {
             alert("Failed to parse voice command.");
           }
        } catch (e) {
           console.error(e);
        } finally {
           setIsProcessingVoice(false);
           setTranscript(""); // clear for next time
        }
      }
    } else {
      // START recording
      setTranscript("");
      setIsRecording(true);
      if (recognitionRef.current) {
         try {
           recognitionRef.current.start();
         } catch (e) {
           console.log("Mic already started or failed:", e);
         }
      } else {
        alert("Speech Recognition API is not supported in your browser. Please try Chrome/Edge.");
        setIsRecording(false);
      }
    }
  };

  if (!editor) {
    return null;
  }

  // A tiny toolbar for manual mode selection
  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center gap-2 mb-4 px-4 py-2 bg-white/5 border border-white/10 rounded-xl max-w-fit flex-wrap">
        {['scene_heading', 'action', 'character', 'parenthetical', 'dialogue', 'transition'].map((type) => (
          <button
            key={type}
            onClick={() => editor.chain().focus().updateAttributes('screenplayNode', { type }).run()}
            className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
              editor.isActive('screenplayNode', { type }) 
                ? 'bg-brand-base text-white shadow-lg shadow-brand-base/20' 
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {type.replace('_', ' ')}
          </button>
        ))}
        
        <div className="w-px h-4 bg-white/10 mx-2" />
        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest px-2 mr-2">Use TAB to cycle</span>
        
        <button
           onClick={toggleRecording}
           disabled={isProcessingVoice}
           className={`ml-auto flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-md ${
             isProcessingVoice ? "bg-gray-500/20 text-gray-400 cursor-not-allowed border border-white/5" :
             isRecording ? "bg-red-500 text-white animate-pulse border border-red-400/50 shadow-[0_0_15px_rgba(239,68,68,0.5)]" : 
             "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 hover:border-indigo-400/50"
           }`}
        >
          {isProcessingVoice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 
           isRecording ? <Square className="w-3.5 h-3.5 fill-current" /> : 
           <Mic className="w-3.5 h-3.5" />}
          {isProcessingVoice ? "Parsing Voice..." : isRecording ? "Recording..." : "Dictate Scene"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto w-full bg-white/5 border border-white/5 rounded-2xl p-8 lg:p-12 shadow-inner">
        <EditorContent 
          editor={editor} 
          className="prose prose-invert max-w-none h-full outline-none font-sans text-gray-200 screenplay-editor-container"
        />
      </div>
    </div>
  );
}
