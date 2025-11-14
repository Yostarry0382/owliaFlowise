'use client';

import dynamic from 'next/dynamic';

const FlowBuilder = dynamic(() => import('./components/FlowBuilder'), {
  ssr: false,
});

export default function Home() {
  return <FlowBuilder />;
}