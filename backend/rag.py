from openai import OpenAI
import numpy as np
import os

class RAGChatbot:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.knowledge_base = []  # Store embeddings + text
    
    def add_knowledge(self, text: str):
        """Add document to knowledge base"""
        embedding = self.client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        ).data[0].embedding
        
        self.knowledge_base.append({"text": text, "embedding": embedding})
    
    def retrieve_relevant(self, query: str, top_k: int = 3):
        """Find most relevant documents"""
        if not self.knowledge_base:
            return []
        
        query_embedding = self.client.embeddings.create(
            model="text-embedding-3-small",
            input=query
        ).data[0].embedding
        
        # Calculate cosine similarity
        similarities = []
        for doc in self.knowledge_base:
            similarity = np.dot(query_embedding, doc["embedding"])
            similarities.append((doc["text"], similarity))
        
        # Return top-k most relevant
        similarities.sort(key=lambda x: x[1], reverse=True)
        return [text for text, _ in similarities[:top_k]]
    
    def chat_with_rag(self, query: str):
        """Chat with retrieved context"""
        relevant_docs = self.retrieve_relevant(query)
        
        if relevant_docs:
            context = "\n\n".join(relevant_docs)
            system_message = f"Use this context to answer:\n{context}"
        else:
            system_message = "No relevant context found. Answer based on your knowledge."
        
        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": query}
            ]
        )
        
        return response.choices[0].message.content
