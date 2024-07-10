import React, { useState, useEffect, useRef } from 'react';
import './Chat.css';
import { FunctionDeclarationSchemaType, getGenerativeModel, vertexAI } from '../firebase';

interface Message {
  user: string;
  text: string;
}

const functions = {
  findPostsByCategory({ categories }: { categories: any[] }) {
    console.log('gotta search by category', { categories });

    if (categories.indexOf('java') > -1) {
      return {
        posts: []
      }
    }

    return {
      posts: [
        {
          title: 'some python post',
          url: 'https://codesilva.github.io'
        },
        {
          title: 'some nodejs post',
          url: 'https://codesilva.github.io'
        },
        {
          title: 'some rust post',
          url: 'https://codesilva.github.io'
        }
      ]
    };
  }
}

const Chat = () => {

  const model = getGenerativeModel(
    vertexAI,
    {
      model: "gemini-1.5-flash-preview-0514",
      tools: [
        {
          functionDeclarations: [
            {
              name: "findPostsByCategory",
              description: "Find posts by category",
              parameters: {
                type: FunctionDeclarationSchemaType.OBJECT,
                description: "Categories provided to find blog posts",
                properties: {
                  categories: {
                    type: FunctionDeclarationSchemaType.ARRAY,
                    description: "The categories for searching blog post",
                  }
                },
                required: ['categories'],
              },
            }
          ],
        }
      ]
    }
  );

  const chat = model.startChat({
    history: [
      {
        role: 'user',
        parts: [
          { text: 'Can you please answer in Brazilian Portuguese?' }
        ]
      },
      {
        role: 'model',
        parts: [
          { text: 'Sim, vou responder em Portugues' }
        ]
      },

      {
        role: 'user',
        parts: [
          { text: 'Os links mostrados, pode por em tag <a>?' }
        ]
      },

      {
        role: 'model',
        parts: [
          { text: 'Claro! Os links que vierem nas respostas serão devidamente colocados em tag <a>' }
        ]
      }
    ]
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const handleSend = async () => {
    if (input.trim()) {
      setMessages([...messages, { user: 'User', text: input }]);
      setInput('');

      const result = await chat.sendMessage(input);

      const calls = result.response.functionCalls() || [];
      const [call] = calls;

      console.log({ result, calls });

      if (call) {
        // Call the executable function named in the function call
        // with the arguments specified in the function call and
        // let it call the hypothetical API.
        const apiResponse = await functions[call.name](call.args);

        console.log({ apiResponse })

        // Send the API response back to the model so it can generate
        // a text response that can be displayed to the user.
        const result = await chat.sendMessage([{
          functionResponse: {
            name: 'findPostsByCategory',
            response: apiResponse
          }
        }]);

        const chatResponseText = result.response.text();

        // Log the text response.
        console.log(chatResponseText);

        return;
      }

      console.log('no call identified', result.response.text());
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSend();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className="chat-message">
            <span className="chat-user">{message.user}:</span> {message.text}
          </div>
        ))}
        <div ref={messagesEndRef}></div>
      </div>
      <div className="chat-input-container">
        <input
          type="text"
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
        />
        <button className="chat-send-button" onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
