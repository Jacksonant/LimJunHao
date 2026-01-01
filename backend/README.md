# Advanced AI Chatbot Backend

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create `.env` file and add your OpenAI API key:
```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

3. Run the server:
```bash
uvicorn main:app --reload
```

Server will run on `http://localhost:8000`

## API Endpoints

### POST /chat
Chat with the AI in different modes.

**Request:**
```json
{
  "user_id": "user123",
  "message": "Hello!",
  "mode": "basic",  // "basic", "tools", or "rag"
  "system_prompt": "You are a helpful assistant"  // optional
}
```

**Response:**
```json
{
  "response": "Hi! How can I help you?"
}
```

### POST /add-knowledge
Add documents to RAG knowledge base.

**Request:**
```json
{
  "text": "Your document content here"
}
```

### POST /clear
Clear conversation history for a user.

**Request:**
```json
{
  "user_id": "user123"
}
```

## Modes

- **basic**: Standard chat with conversation memory
- **tools**: Chat with function calling (weather, search)
- **rag**: Chat with retrieval from knowledge base

## Learning Features

1. **Conversation Memory** - Maintains context across messages
2. **Function Calling** - AI can use external tools
3. **RAG** - Retrieval Augmented Generation with embeddings
4. **System Prompts** - Control AI behavior
