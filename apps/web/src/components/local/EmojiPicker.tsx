"use client";

import { useState, useRef, useEffect } from "react";
import data from '@emoji-mart/data'
import Picker from "@emoji-mart/react";
import { Smile } from "lucide-react";
import "emoji-mart/css/emoji-mart.css";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      {/* Button that toggles the picker */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Add emoji"
      >
        <Smile className="w-5 h-5 text-gray-600" />
      </button>

      {/* Popup */}
      {open && (
        <div className="absolute bottom-full mb-2 right-0 z-50 bg-white shadow-lg border rounded-2xl overflow-hidden">
          <Picker
            theme="light"
            set="apple"
            title="Pick an emoji"
            data={data}
            onSelect={(emoji: any) => {
              onSelect(emoji.native);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

