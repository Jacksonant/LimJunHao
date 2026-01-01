from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from chatbot import AdvancedChatbot
from tools import ChatbotWithTools
from rag import RAGChatbot
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

chatbot = AdvancedChatbot()
tool_chatbot = ChatbotWithTools()
rag_chatbot = RAGChatbot()

class ChatRequest(BaseModel):
    user_id: str
    message: str
    mode: str = "basic"  # basic, tools, rag
    system_prompt: str = None

class KnowledgeRequest(BaseModel):
    text: str

class ClearRequest(BaseModel):
    user_id: str

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        if request.mode == "tools":
            messages = [{"role": "user", "content": request.message}]
            response = tool_chatbot.chat_with_tools(messages)
        elif request.mode == "rag":
            response = rag_chatbot.chat_with_rag(request.message)
        else:
            response = chatbot.chat(request.user_id, request.message, request.system_prompt)
        
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/add-knowledge")
async def add_knowledge(request: KnowledgeRequest):
    try:
        rag_chatbot.add_knowledge(request.text)
        return {"status": "added", "message": "Knowledge added successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/clear")
async def clear(request: ClearRequest):
    try:
        chatbot.clear_history(request.user_id)
        return {"status": "cleared", "message": "Conversation history cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Advanced AI Chatbot API", "status": "running"}
