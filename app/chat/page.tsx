'use client';

import { Suspense } from 'react';
import ChatContent from './ChatContent';

function LoadingSpinner() {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ChatContent />
    </Suspense>
  );
}
