'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { FlowiseMessage } from '@/app/types/flowise';
import { v4 as uuidv4 } from 'uuid';

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<FlowiseMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // セッションIDを生成
    setSessionId(uuidv4());
  }, []);

  useEffect(() => {
    // 新しいメッセージが追加されたら自動スクロール
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (content: string) => {
    // ユーザーメッセージを追加
    const userMessage: FlowiseMessage = {
      role: 'user',
      content,
      timestamp: new Date(),
      id: uuidv4()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/flowise/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          sessionId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      // AIの応答を追加
      const aiMessage: FlowiseMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        id: uuidv4()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);

      // エラーメッセージを表示
      const errorMessage: FlowiseMessage = {
        role: 'assistant',
        content: 'すみません、エラーが発生しました。もう一度お試しください。',
        timestamp: new Date(),
        id: uuidv4()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* ヘッダー */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Owlia Fabrica Chat
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Powered by Flowise AI
          </p>
        </div>
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                チャットを開始しましょう
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                下のテキストボックスにメッセージを入力してください
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isLoading && (
                <div className="flex justify-start mb-4">
                  <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* 入力エリア */}
      <ChatInput
        onSendMessage={sendMessage}
        disabled={isLoading}
        placeholder={isLoading ? 'AI が応答中...' : 'メッセージを入力してください...'}
      />
    </div>
  );
};