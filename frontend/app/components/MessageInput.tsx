'use client';

import { useState, useRef, useCallback } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading?: boolean;
}

export function MessageInput({
  value,
  onChange,
  onSend,
  isLoading = false,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [rows, setRows] = useState(1);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!isLoading && value.trim()) {
          onSend();
        }
      }
    },
    [isLoading, value, onSend]
  );

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to get the actual new height
    textarea.style.height = 'auto';
    
    // Calculate new height
    const newHeight = textarea.scrollHeight;
    textarea.style.height = `${newHeight}px`;

    // Update rows
    const newRows = Math.min(Math.floor(newHeight / 24), 5);
    setRows(newRows);
  }, []);

  return (
    <div className="flex items-end space-x-2 p-4 border-t">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        rows={rows}
        placeholder="Digite sua mensagem..."
        className="flex-1 resize-none rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        disabled={isLoading}
      />
      <button
        onClick={onSend}
        disabled={isLoading || !value.trim()}
        className={`p-2 rounded-lg ${
          isLoading || !value.trim()
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        <PaperAirplaneIcon
          className={`h-5 w-5 ${
            isLoading || !value.trim() ? 'text-gray-500' : 'text-white'
          }`}
        />
      </button>
    </div>
  );
} 