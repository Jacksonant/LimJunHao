import json
from openai import OpenAI
from typing import List, Dict
import os

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather for a location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "City name"}
                },
                "required": ["location"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "Search the web for information",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"}
                },
                "required": ["query"]
            }
        }
    }
]

def execute_function(name: str, arguments: dict):
    if name == "get_weather":
        return f"Weather in {arguments['location']}: 72°F, Sunny"
    elif name == "search_web":
        return f"Search results for: {arguments['query']}"
    return "Function not found"

class ChatbotWithTools:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    def chat_with_tools(self, messages: List[Dict]) -> str:
        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            tools=TOOLS,
            tool_choice="auto"
        )
        
        message = response.choices[0].message
        
        # Check if model wants to call a function
        if message.tool_calls:
            for tool_call in message.tool_calls:
                function_name = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments)
                
                # Execute function
                function_response = execute_function(function_name, function_args)
                
                # Add function result to messages
                messages.append({
                    "role": "function",
                    "name": function_name,
                    "content": function_response
                })
            
            # Get final response with function results
            final_response = self.client.chat.completions.create(
                model="gpt-4",
                messages=messages
            )
            return final_response.choices[0].message.content
        
        return message.content
