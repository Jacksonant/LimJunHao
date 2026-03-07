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

### POST /ocr
Run PaddleOCR on a base64 image payload.

**Request:**
```json
{
  "image_base64": "data:image/png;base64,iVBORw0KGgoAAA...",
  "lang": "en"
}
```

**Response shape:**
```json
{
  "logs": ["decode:image_base64", "ocr:run", "pipeline:done"],
  "analysis": {
    "lineCount": 3,
    "avgConfidence": 0.9123,
    "highConfidenceLines": 2,
    "mediumConfidenceLines": 1,
    "lowConfidenceLines": 0
  },
  "result": {
    "text": "line 1\\nline 2",
    "lines": [
      { "text": "line 1", "confidence": 0.95, "box": [[0,0],[1,0],[1,1],[0,1]] }
    ]
  }
}
```

## PaddleOCR Setup Notes

`paddleocr` requires a compatible `paddlepaddle` build (CPU or GPU).

Example CPU install:
```bash
pip install paddlepaddle
pip install -r requirements.txt
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
