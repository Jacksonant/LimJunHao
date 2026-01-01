'use client';

import { useState } from 'react';

export default function KnowledgeManager() {
  const [knowledge, setKnowledge] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const addKnowledge = async () => {
    if (!knowledge.trim()) return;

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/add-knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: knowledge }),
      });

      const data = await response.json();
      
      if (data.status === 'added') {
        setMessage('✓ Knowledge added successfully!');
        setKnowledge('');
      } else {
        throw new Error('Failed to add knowledge');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('✗ Error adding knowledge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Knowledge Manager (RAG)</h2>
      <p className="text-sm text-gray-600 mb-4">
        Add documents to the knowledge base. The chatbot will use this information when in RAG mode.
      </p>
      
      <textarea
        value={knowledge}
        onChange={(e) => setKnowledge(e.target.value)}
        placeholder="Paste your document or knowledge here..."
        className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
        disabled={loading}
      />
      
      <button
        onClick={addKnowledge}
        disabled={loading || !knowledge.trim()}
        className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {loading ? 'Adding...' : 'Add Knowledge'}
      </button>
      
      {message && (
        <p className={`mt-2 text-sm ${message.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
