'use client';

import React from 'react';
import { FlowiseMessage } from '@/app/types/flowise';

interface ChatMessageProps {
  message: FlowiseMessage;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex ${
        isUser ? 'justify-end' : 'justify-start'
      } mb-4 animate-fadeIn`}
    >
      <div
        className={`max-w-[70%] px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-blue-500 text-white rounded-br-sm'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'
        } shadow-md`}
      >
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0">
            {isUser ? (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                U
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                AI
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">
              {isUser ? 'You' : 'AI Assistant'}
            </p>
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
            {message.timestamp && (
              <p className="text-xs opacity-70 mt-2">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};