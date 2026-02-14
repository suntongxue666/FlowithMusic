'use client'

import React, { useState } from 'react'

const COMMON_EMOJIS = [
    '❤️', '✨', '🎶', '🔥', '😂', '🥺', '🥰', '🎉', '🌟', '🌹',
    '🦋', '🌸', '💫', '🧸', '🎈', '🎁', '💖', '🎵', '🎹', '🎸',
    '🐶', '🐱', '🐣', '🐳', '🍀', '🌈', '🌙', '☀️', '☁️', '❄️'
]

interface EmojiSelectorProps {
    selectedEmojis: string[]
    onSelect: (emojis: string[]) => void
    maxSelection?: number
}

export default function EmojiSelector({
    selectedEmojis,
    onSelect,
    maxSelection = 3
}: EmojiSelectorProps) {

    const handleToggle = (emoji: string) => {
        if (selectedEmojis.includes(emoji)) {
            onSelect(selectedEmojis.filter(e => e !== emoji))
        } else {
            if (selectedEmojis.length < maxSelection) {
                onSelect([...selectedEmojis, emoji])
            }
        }
    }

    return (
        <div className="emoji-selector-container">
            <div className="selected-preview">
                {selectedEmojis.length === 0 ? (
                    <span className="placeholder">Select up to {maxSelection} emojis for the effect</span>
                ) : (
                    <div className="selected-list">
                        {selectedEmojis.map((emoji, index) => (
                            <span key={index} className="selected-emoji animate-pop">
                                {emoji}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="emoji-grid">
                {COMMON_EMOJIS.map(emoji => (
                    <button
                        key={emoji}
                        className={`emoji-btn ${selectedEmojis.includes(emoji) ? 'active' : ''}`}
                        onClick={() => handleToggle(emoji)}
                        disabled={!selectedEmojis.includes(emoji) && selectedEmojis.length >= maxSelection}
                    >
                        {emoji}
                    </button>
                ))}
            </div>

            <style jsx>{`
        .emoji-selector-container {
          background: #fdfdfd;
          border: 1px solid #eee;
          border-radius: 12px;
          padding: 12px;
        }

        .selected-preview {
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          background: #f8f9fa;
          border-radius: 8px;
          padding: 8px;
        }

        .placeholder {
          color: #adb5bd;
          font-size: 0.9rem;
        }

        .selected-list {
          display: flex;
          gap: 12px;
          font-size: 1.5rem;
        }

        .animate-pop {
          animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .emoji-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
          gap: 8px;
        }

        .emoji-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .emoji-btn:hover:not(:disabled) {
          background: #f0f0f0;
          transform: scale(1.1);
        }

        .emoji-btn.active {
          background: #e3f2fd;
          border-color: #90caf9;
          transform: scale(1.1);
        }

        .emoji-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        @keyframes pop {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
        </div>
    )
}
