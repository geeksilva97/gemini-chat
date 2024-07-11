import React, { useState, useEffect, useRef } from 'react';
import './Chat.css';
import { FunctionDeclarationSchemaType, getGenerativeModel, vertexAI } from '../firebase';

interface Message {
  user: string;
  text: string;
  role: 'user' | 'model';
}

const functions = {
  findPostsByCategory({ categories }: { categories: any[] }) {
    console.log('gotta search by category', { categories });

    if (categories.includes('java')) {
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
      systemInstruction: `
        You are a friendly bot named Dory that speaks Brazilian Portuguese and helps visitors of codesilva blog to find blog posts by category.
        After a function call YOU DO NOT INFER posts, you just take what is given in functionResponse and assume it's right. You are a bot that give functions an autonomy to define which data should be displayed or not.
        For example, if the user asks for posts on Erlang and the function returned a list of posts, you assume it's correct and display the posts.
        In the post listing you format it in HTML showing the list as a <ul> with the post title and a link to the post.
        When the visitor suggests a post you take the suggestion and display a message saying that the suggestion was received.
        `,
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
                    description: "The categories for searching blog post. They are lowercased when passed to the function",
                  }
                },
                required: ['categories'],
              },
            },

            {
              name: "fallbackFunction",
              description: "This is a fallback function that should be called when the model can't find posts by category",
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
          { text: 'Sempre que não encontrar posts no que foi fornecido em functionResponse, use a função de fallback para que progamaticamente um form possa ser mostrado para o usuário' }
        ]
      },
      {
        role: 'model',
        parts: [
          { text: 'Okay, sempre que uma functionResponse for recebida vou analisar e determinar se retorno algo em functionCalls ou não' }
        ]
      },
    ]
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [displayForm, setDisplayForm] = useState<boolean>(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const handleSend = async () => {
    if (input.trim()) {
      setMessages([...messages, { user: 'User', text: input, role: 'user' }]);
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
            response: {
              posts: apiResponse.posts
            }
          }
        }]);

        const chatResponseText = result.response.text();
        const [fallbackCall] = result.response.functionCalls?.() || [];

        console.log('after calling api', { calls: result.response.functionCalls?.(), chatResponseText, fallbackCall });

        if (fallbackCall?.name === 'fallbackFunction') {
          setDisplayForm(true);

          setMessages((messages) => {
            return messages.concat({
              user: 'Dory',
              text: 'Não encontrei posts para a categoria fornecida. Por favor, preencha o formulário abaixo para sugerir um post.',
              role: 'model'
            });
          });
        } else {
          setMessages((messages) => {
            return messages.concat({
              user: 'Dory',
              text: chatResponseText,
              role: 'model'
            });
          });
        }

        return;
      }


      // TODO: show form
      const chatResponseText = result.response.text();

      setMessages((messages) => {
        return messages.concat({
          user: 'Dory',
          text: chatResponseText,
          role: 'model'
        });
      });
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSend();
    }
  };

  const onSuggestionCancel = async () => {
    const result = await chat.sendMessage(`Não quero enviar sugestão agora. Vou esperar sair mesmo.`);
    const chatResponseText = result.response.text();

    setDisplayForm(false);
    setMessages((messages) => {
      return messages.concat({
        user: 'Dory',
        text: chatResponseText,
        role: 'model'
      });
    });
  };

  const onSuggestionSend = async () => {
    const result = await chat.sendMessage(`Essa é minha sugestão. Post de Erlang mostrando como fazer aplicações tolerantes a falhas.`);
    const chatResponseText = result.response.text();

    setDisplayForm(false);
    setMessages((messages) => {
      return messages.concat({
        user: 'Dory',
        text: chatResponseText,
        role: 'model'
      });
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`chat-message ${message.role === 'model' ? 'is-bot' : ''}`}>
            <span className="chat-user">{message.user}:</span> {message.text}
          </div>
        ))}
        <div ref={messagesEndRef}></div>

        {displayForm && (
          <div className='chat-message post-suggestion'>
            <form>
              <label htmlFor="email">Email:</label>
              <input type="email" id="email" name="email" />
              <label htmlFor="category">Assunto do post:</label>
              <input type="text" id="category" name="category" />
              <label htmlFor="category">Breve descrição (opcional)</label>
              <input type="text" id="category" name="category" />
              <div className='buttons'>
                <button type="button" className='cancel' onClick={onSuggestionCancel}>Cancelar</button>
                <button type="button" onClick={onSuggestionSend}>Enviar</button>
              </div>
            </form>
          </div>
        )}
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
