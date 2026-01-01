from openai import OpenAI
from typing import List, Dict
import os

class AdvancedChatbot:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.conversations = {}  # Store per-user conversations
    
    def chat(self, user_id: str, message: str, system_prompt: str = None) -> str:
        # Initialize conversation history
        if user_id not in self.conversations:
            self.conversations[user_id] = []
            if system_prompt:
                self.conversations[user_id].append({
                    "role": "system", 
                    "content": system_prompt
                })
        
        # Add user message
        self.conversations[user_id].append({"role": "user", "content": message})
        
        # Get response with full context
        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=self.conversations[user_id],
            temperature=0.7,
            max_tokens=500
        )
        
        assistant_message = response.choices[0].message.content
        self.conversations[user_id].append({"role": "assistant", "content": assistant_message})
        
        return assistant_message
    
    def clear_history(self, user_id: str):
        if user_id in self.conversations:
            del self.conversations[user_id]
