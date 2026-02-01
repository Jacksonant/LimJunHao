'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

const SinSection: React.FC = () => {
  const router = useRouter();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#030712' }}>
      <button
        onClick={() => router.push('/math-analysis')}
        style={{ padding: '24px 48px', fontSize: '18px', backgroundColor: '#1f2937', color: '#9ca3af', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#374151'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1f2937'}
      >
        Analysis Tool
      </button>
    </div>
  );
};

export default SinSection;
