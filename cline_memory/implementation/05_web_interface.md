# Web Interface Implementation

## Overview
This document outlines the steps to create the React-based web interface for the Seadragon LLM system. This interface will provide a chat experience for registered users, allowing them to interact with the LLM through a user-friendly interface. The interface will have a particular focus on educational features, creating a "tutor-like" experience for helping with math problems, coding questions, and textbook content.

## Steps

1. **Project Setup:**

   *Task Description:* Set up the React project structure for the web interface. This will be a separate frontend application from the admin panel, focused on providing a chat experience.

   ```
   frontend/
   ├── src/
   │   ├── components/
   │   │   ├── Chat/
   │   │   │   ├── ChatMessage.tsx
   │   │   │   ├── ChatInput.tsx
   │   │   │   ├── ChatWindow.tsx
   │   │   │   ├── FileUpload.tsx
   │   │   │   ├── CodeBlock.tsx
   │   │   │   └── MathRenderer.tsx
   │   │   ├── Auth/
   │   │   │   ├── LoginForm.tsx
   │   │   │   └── RegisterForm.tsx
   │   │   └── Layout/
   │   │       ├── Header.tsx
   │   │       └── Footer.tsx
   │   ├── pages/
   │   │   ├── Home.tsx
   │   │   ├── Chat.tsx
   │   │   ├── Login.tsx
   │   │   └── Register.tsx
   │   ├── services/
   │   │   ├── api.ts
   │   │   └── auth.ts
   │   ├── App.tsx
   │   └── index.tsx
   └── ...
   ```

2. **Authentication Components:**

   *Task Description:* Create the authentication components for user login and registration. These components will interact with the authentication API endpoints.

   ```typescript
   // frontend/src/components/Auth/LoginForm.tsx
   import React, { useState } from 'react';
   import { useNavigate } from 'react-router-dom';
   import { login } from '../../services/auth';

   export default function LoginForm() {
     const [username, setUsername] = useState('');
     const [password, setPassword] = useState('');
     const [error, setError] = useState('');
     const navigate = useNavigate();

     const handleSubmit = async (e: React.FormEvent) => {
       e.preventDefault();
       setError('');
       
       try {
         await login(username, password);
         navigate('/chat');
       } catch (err) {
         setError('Invalid username or password');
       }
     };

     return (
       <form onSubmit={handleSubmit} className="space-y-4">
         <div>
           <label htmlFor="username" className="block text-sm font-medium">
             Username
           </label>
           <input
             id="username"
             type="text"
             value={username}
             onChange={(e) => setUsername(e.target.value)}
             className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
             required
           />
         </div>
         <div>
           <label htmlFor="password" className="block text-sm font-medium">
             Password
           </label>
           <input
             id="password"
             type="password"
             value={password}
             onChange={(e) => setPassword(e.target.value)}
             className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
             required
           />
         </div>
         {error && <p className="text-red-500">{error}</p>}
         <button
           type="submit"
           className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
         >
           Log In
         </button>
       </form>
     );
   }
   ```

   ```typescript
   // frontend/src/components/Auth/RegisterForm.tsx
   import React, { useState } from 'react';
   import { useNavigate } from 'react-router-dom';
   import { register } from '../../services/auth';

   export default function RegisterForm() {
     const [username, setUsername] = useState('');
     const [password, setPassword] = useState('');
     const [token, setToken] = useState('');
     const [error, setError] = useState('');
     const navigate = useNavigate();

     const handleSubmit = async (e: React.FormEvent) => {
       e.preventDefault();
       setError('');
       
       try {
         await register(username, password, token);
         navigate('/login');
       } catch (err) {
         setError('Registration failed. Please check your token and try again.');
       }
     };

     return (
       <form onSubmit={handleSubmit} className="space-y-4">
         <div>
           <label htmlFor="username" className="block text-sm font-medium">
             Username
           </label>
           <input
             id="username"
             type="text"
             value={username}
             onChange={(e) => setUsername(e.target.value)}
             className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
             required
           />
         </div>
         <div>
           <label htmlFor="password" className="block text-sm font-medium">
             Password
           </label>
           <input
             id="password"
             type="password"
             value={password}
             onChange={(e) => setPassword(e.target.value)}
             className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
             required
           />
         </div>
         <div>
           <label htmlFor="token" className="block text-sm font-medium">
             Registration Token
           </label>
           <input
             id="token"
             type="text"
             value={token}
             onChange={(e) => setToken(e.target.value)}
             className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
             required
           />
         </div>
         {error && <p className="text-red-500">{error}</p>}
         <button
           type="submit"
           className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
         >
           Register
         </button>
       </form>
     );
   }
   ```

3. **Authentication Services:**

   *Task Description:* Create authentication services to handle API calls for login, registration, and token management.

   ```typescript
   // frontend/src/services/auth.ts
   import api from './api';

   export const login = async (username: string, password: string) => {
     const response = await api.post('/auth/token', {
       username,
       password,
     });
     
     const { access_token } = response.data;
     localStorage.setItem('token', access_token);
     
     return access_token;
   };

   export const register = async (username: string, password: string, token: string) => {
     const response = await api.post('/auth/register', {
       username,
       password,
       token,
     });
     
     return response.data;
   };

   export const logout = () => {
     localStorage.removeItem('token');
   };

   export const isAuthenticated = () => {
     return !!localStorage.getItem('token');
   };

   export const getToken = () => {
     return localStorage.getItem('token');
   };
   ```

4. **API Service:**

   *Task Description:* Create an API service to handle communication with the backend API.

   ```typescript
   // frontend/src/services/api.ts
   import axios from 'axios';
   import { getToken } from './auth';

   const api = axios.create({
     baseURL: 'https://local-llm.seadragoninkmortal.com',
   });

   // Add token to all requests
   api.interceptors.request.use((config) => {
     const token = getToken();
     if (token) {
       config.headers.Authorization = `Bearer ${token}`;
     }
     return config;
   });

   export default api;
   ```

5. **Educational Components:**

   *Task Description:* Create components to support educational features like math rendering, code highlighting, and image uploads.

   ```typescript
   // frontend/src/components/Chat/MathRenderer.tsx
   import React, { useEffect, useRef } from 'react';

   interface MathRendererProps {
     content: string;
   }

   export default function MathRenderer({ content }: MathRendererProps) {
     const containerRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
       if (containerRef.current && window.MathJax) {
         // Render math in the container
         window.MathJax.typesetPromise([containerRef.current]);
       }
     }, [content]);

     return (
       <div ref={containerRef} dangerouslySetInnerHTML={{ __html: content }} />
     );
   }
   ```

   ```typescript
   // frontend/src/components/Chat/CodeBlock.tsx
   import React from 'react';
   import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
   import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

   interface CodeBlockProps {
     code: string;
     language: string;
   }

   export default function CodeBlock({ code, language }: CodeBlockProps) {
     return (
       <div className="my-4 rounded-md overflow-hidden">
         <div className="flex justify-between items-center bg-gray-800 px-4 py-2">
           <span className="text-sm text-gray-200">{language}</span>
           <button
             onClick={() => navigator.clipboard.writeText(code)}
             className="text-gray-300 hover:text-white text-sm"
           >
             Copy
           </button>
         </div>
         <SyntaxHighlighter language={language} style={vscDarkPlus}>
           {code}
         </SyntaxHighlighter>
       </div>
     );
   }
   ```

   ```typescript
   // frontend/src/components/Chat/FileUpload.tsx
   import React, { useState } from 'react';
   import api from '../../services/api';

   interface FileUploadProps {
     onUploadComplete: (imageUrl: string) => void;
     disabled?: boolean;
   }

   export default function FileUpload({ onUploadComplete, disabled }: FileUploadProps) {
     const [uploading, setUploading] = useState(false);
     const [error, setError] = useState('');

     const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
       const file = e.target.files?.[0];
       if (!file) return;

       // Check if file is an image or PDF
       if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
         setError('Only images and PDFs are supported');
         return;
       }

       setUploading(true);
       setError('');

       try {
         const formData = new FormData();
         formData.append('file', file);

         const response = await api.post('/api/upload', formData, {
           headers: {
             'Content-Type': 'multipart/form-data',
           },
         });

         onUploadComplete(response.data.url);
       } catch (err) {
         setError('Error uploading file. Please try again.');
         console.error('Upload error:', err);
       } finally {
         setUploading(false);
       }
     };

     return (
       <div className="my-2">
         <label className="flex items-center gap-2">
           <input
             type="file"
             onChange={handleFileUpload}
             accept="image/*,application/pdf"
             className="hidden"
             disabled={disabled || uploading}
           />
           <span className={`px-3 py-1 rounded-md text-sm 
             ${disabled || uploading ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-500 text-white cursor-pointer hover:bg-green-600'}`}>
             {uploading ? 'Uploading...' : 'Upload Image or PDF'}
           </span>
         </label>
         {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
       </div>
     );
   }
   ```

6. **Enhanced Chat Components:**

   *Task Description:* Update the chat components to support educational features including math rendering, code highlighting, and image uploads.

   ```typescript
   // frontend/src/components/Chat/ChatMessage.tsx (updated)
   import React from 'react';
   import MathRenderer from './MathRenderer';
   import CodeBlock from './CodeBlock';

   interface ChatMessageProps {
     role: 'user' | 'assistant';
     content: string;
     attachments?: { type: 'image' | 'pdf', url: string }[];
   }

   export default function ChatMessage({ role, content, attachments }: ChatMessageProps) {
     // Process message content to detect code blocks and math expressions
     const processedContent = React.useMemo(() => {
       // Simple processing for demonstration
       // In a real implementation, use more robust parsing
       
       // Replace code blocks with CodeBlock components
       const codeBlockRegex = /```([a-z]+)\n([\s\S]*?)```/g;
       let processedText = content.replace(codeBlockRegex, (_, language, code) => {
         return `<div class="code-block" data-language="${language}" data-code="${encodeURIComponent(code)}"></div>`;
       });
       
       // Identify math expressions (LaTeX)
       processedText = processedText.replace(/\$(.*?)\$/g, '\\($1\\)');
       processedText = processedText.replace(/\$\$(.*?)\$\$/g, '\\[$1\\]');
       
       return processedText;
     }, [content]);

     // Function to render code blocks after the component is mounted
     React.useEffect(() => {
       document.querySelectorAll('.code-block').forEach(node => {
         const language = node.getAttribute('data-language') || 'text';
         const code = decodeURIComponent(node.getAttribute('data-code') || '');
         
         // Use React's createRoot to render the CodeBlock component
         const root = document.createRoot(node);
         root.render(<CodeBlock language={language} code={code} />);
       });
     }, [processedContent]);

     return (
       <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
         <div
           className={`max-w-2xl p-4 rounded-lg ${
             role === 'user'
               ? 'bg-blue-500 text-white'
               : 'bg-white shadow-md text-gray-800 border border-gray-200'
           }`}
         >
           {attachments && attachments.length > 0 && (
             <div className="mb-3">
               {attachments.map((attachment, index) => (
                 <div key={index} className="mb-2">
                   {attachment.type === 'image' ? (
                     <img 
                       src={attachment.url} 
                       alt="Uploaded content" 
                       className="max-w-full rounded-md shadow-sm" 
                     />
                   ) : (
                     <a 
                       href={attachment.url} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="flex items-center gap-2 text-blue-600 hover:underline"
                     >
                       <span>View PDF Document</span>
                     </a>
                   )}
                 </div>
               ))}
             </div>
           )}

           <MathRenderer content={processedContent} />
         </div>
       </div>
     );
   }
   ```

   ```typescript
   // frontend/src/components/Chat/ChatInput.tsx (updated)
   import React, { useState } from 'react';
   import FileUpload from './FileUpload';

   interface ChatInputProps {
     onSendMessage: (message: string, attachments: { type: 'image' | 'pdf', url: string }[]) => void;
     disabled?: boolean;
   }

   export default function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
     const [message, setMessage] = useState('');
     const [attachments, setAttachments] = useState<{ type: 'image' | 'pdf', url: string }[]>([]);

     const handleSubmit = (e: React.FormEvent) => {
       e.preventDefault();
       if (message.trim() && !disabled) {
         onSendMessage(message, attachments);
         setMessage('');
         setAttachments([]);
       }
     };

     const handleFileUpload = (url: string) => {
       const fileType = url.endsWith('.pdf') ? 'pdf' : 'image';
       setAttachments([...attachments, { type: fileType, url }]);
     };

     return (
       <div className="space-y-2">
         {attachments.length > 0 && (
           <div className="flex flex-wrap gap-2 mb-2">
             {attachments.map((attachment, index) => (
               <div key={index} className="relative">
                 {attachment.type === 'image' ? (
                   <img 
                     src={attachment.url} 
                     alt="Upload preview" 
                     className="h-16 w-auto rounded-md" 
                   />
                 ) : (
                   <div className="h-16 w-16 bg-gray-100 rounded-md flex items-center justify-center">
                     PDF
                   </div>
                 )}
                 <button
                   className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                   onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                 >
                   ×
                 </button>
               </div>
             ))}
           </div>
         )}
         
         <div className="flex">
           <FileUpload onUploadComplete={handleFileUpload} disabled={disabled} />
           <form onSubmit={handleSubmit} className="flex items-center flex-grow">
             <input
               type="text"
               value={message}
               onChange={(e) => setMessage(e.target.value)}
               placeholder="Ask math questions, upload images, send code..."
               className="flex-grow p-3 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
               disabled={disabled}
             />
             <button
               type="submit"
               className="bg-blue-500 text-white p-3 rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
               disabled={disabled}
             >
               Send
             </button>
           </form>
         </div>
         
         <div className="text-xs text-gray-500">
           <p>
             • Use $...$ for inline math and $$...$$ for display math<br />
             • Use ```language code ``` for code blocks<br />
             • Upload images of textbook questions or math problems
           </p>
         </div>
       </div>
     );
   }
   ```

   ```typescript
   // frontend/src/components/Chat/ChatWindow.tsx (updated)
   import React, { useState, useEffect, useRef } from 'react';
   import ChatMessage from './ChatMessage';
   import ChatInput from './ChatInput';
   import api from '../../services/api';

   interface Attachment {
     type: 'image' | 'pdf';
     url: string;
   }

   interface Message {
     role: 'user' | 'assistant';
     content: string;
     attachments?: Attachment[];
   }

   export default function ChatWindow() {
     const [messages, setMessages] = useState<Message[]>([]);
     const [loading, setLoading] = useState(false);
     const [currentResponse, setCurrentResponse] = useState('');
     const messagesEndRef = useRef<HTMLDivElement>(null);

     // Initialize with a welcome message
     useEffect(() => {
       setMessages([
         {
           role: 'assistant',
           content: 'Hi there! I\'m your AI tutor. You can ask me about math problems, coding questions, or upload textbook images for help. How can I assist you today?'
         }
       ]);
     }, []);

     const scrollToBottom = () => {
       messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
     };

     useEffect(() => {
       scrollToBottom();
     }, [messages]);

     const handleSendMessage = async (content: string, attachments: Attachment[] = []) => {
       // Add user message to chat
       const userMessage: Message = { role: 'user', content, attachments };
       setMessages((prev) => [...prev, userMessage]);
       
       // Add empty assistant message that will be updated as the response streams in
       setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
       
       // Set loading state
       setLoading(true);
       setCurrentResponse('');
       
       try {
         // Prepare request data
         const requestData = {
           model: 'llama3:70b',
           messages: messages.slice(0, -1).map(({ role, content }) => ({
             role,
             content,
           })),
           // Add the latest user message
           user_message: content,
         };

         // If there are attachments, include them
         if (attachments.length > 0) {
           requestData.attachments = attachments.map(a => a.url);
         }
         
         // Send message to API with streaming
         const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ollama/chat`, {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             Authorization: `Bearer ${localStorage.getItem('token')}`,
           },
           body: JSON.stringify(requestData),
         });

         const reader = response.body?.getReader();
         if (!reader) throw new Error('No reader available');

         // Read the stream
         while (true) {
           const { done, value } = await reader.read();
           if (done) break;
           
           // Parse the chunk
           const chunk = new TextDecoder().decode(value);
           try {
             // Handle SSE format
             const lines = chunk.split('\n\n');
             for (const line of lines) {
               if (line.startsWith('data: ')) {
                 const data = JSON.parse(line.substring(6));
                 if (data.message?.content) {
                   setCurrentResponse((prev) => prev + data.message.content);
                   // Update the last message (assistant's response)
                   setMessages((prev) => [
                     ...prev.slice(0, -1),
                     { role: 'assistant', content: prev[prev.length - 1].content + data.message.content },
                   ]);
                 }
               }
             }
           } catch (e) {
             console.error('Error parsing chunk:', e);
           }
         }
       } catch (error) {
         console.error('Error sending message:', error);
         // Update the last message with an error
         setMessages((prev) => [
           ...prev.slice(0, -1),
           { role: 'assistant', content: 'Sorry, there was an error processing your request.' },
         ]);
       } finally {
         setLoading(false);
       }
     };

     return (
       <div className="flex flex-col h-full">
         <div className="flex-grow overflow-y-auto p-4 bg-gray-50">
           {messages.map((message, index) => (
             <ChatMessage
               key={index}
               role={message.role}
               content={message.content}
               attachments={message.attachments}
             />
           ))}
           <div ref={messagesEndRef} />
         </div>
         <div className="p-4 border-t bg-white">
           <ChatInput onSendMessage={handleSendMessage} disabled={loading} />
         </div>
       </div>
     );
   }
   ```

7. **Page Components:**

   *Task Description:* Create the page components for the different routes in the application.

   ```typescript
   // frontend/src/pages/Home.tsx (updated)
   import React from 'react';
   import { Link } from 'react-router-dom';
   import { isAuthenticated } from '../services/auth';

   export default function Home() {
     return (
       <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-blue-50 to-white">
         <h1 className="text-5xl font-bold mb-4 text-blue-700">Seadragon LLM</h1>
         <p className="text-xl mb-8 text-center max-w-md text-gray-700">
           Your personal AI tutor powered by Llama 3. Get help with math problems, coding questions, and textbook content.
         </p>
         
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 max-w-4xl">
           <div className="bg-white p-6 rounded-lg shadow-md">
             <h3 className="text-xl font-semibold mb-3 text-blue-600">Math Help</h3>
             <p className="text-gray-600">Get step-by-step solutions to algebra, calculus, and other math problems.</p>
           </div>
           <div className="bg-white p-6 rounded-lg shadow-md">
             <h3 className="text-xl font-semibold mb-3 text-blue-600">Code Assistance</h3>
             <p className="text-gray-600">Help with programming concepts, debugging, and learning new languages.</p>
           </div>
           <div className="bg-white p-6 rounded-lg shadow-md">
             <h3 className="text-xl font-semibold mb-3 text-blue-600">Textbook Questions</h3>
             <p className="text-gray-600">Upload images of your textbook and get detailed explanations.</p>
           </div>
         </div>
         
         {isAuthenticated() ? (
           <Link
             to="/chat"
             className="bg-blue-600 text-white px-8 py-4 rounded-md hover:bg-blue-700 text-lg font-medium shadow-md transition-all hover:shadow-lg"
           >
             Start Learning
           </Link>
         ) : (
           <div className="flex space-x-4">
             <Link
               to="/login"
               className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 shadow-md transition-all"
             >
               Log In
             </Link>
             <Link
               to="/register"
               className="bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-md hover:bg-blue-50"
             >
               Register
             </Link>
           </div>
         )}
       </div>
     );
   }
   ```

   ```typescript
   // frontend/src/pages/Chat.tsx (updated)
   import React, { useEffect } from 'react';
   import { useNavigate } from 'react-router-dom';
   import ChatWindow from '../components/Chat/ChatWindow';
   import { isAuthenticated, logout } from '../services/auth';

   export default function Chat() {
     const navigate = useNavigate();

     useEffect(() => {
       if (!isAuthenticated()) {
         navigate('/login');
       }
       
       // Load MathJax for math rendering
       const script = document.createElement('script');
       script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
       script.async = true;
       document.head.appendChild(script);
       
       return () => {
         // Clean up if needed
         if (document.head.contains(script)) {
           document.head.removeChild(script);
         }
       };
     }, [navigate]);

     const handleLogout = () => {
       logout();
       navigate('/');
     };

     return (
       <div className="flex flex-col h-screen">
         <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 shadow-md">
           <div className="container mx-auto flex justify-between items-center">
             <h1 className="text-2xl font-bold">Seadragon Tutor</h1>
             <button 
               onClick={handleLogout}
               className="px-4 py-1 bg-blue-700 hover:bg-blue-900 rounded-md text-sm"
             >
               Log Out
             </button>
           </div>
         </header>
         <main className="flex-grow">
           <ChatWindow />
         </main>
       </div>
     );
   }
   ```

8. **App Component and Routing:**

   *Task Description:* Create the main App component with routing using React Router.

   ```typescript
   // frontend/src/App.tsx
   import React from 'react';
   import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
   import Home from './pages/Home';
   import Chat from './pages/Chat';
   import Login from './pages/Login';
   import Register from './pages/Register';
   import { isAuthenticated } from './services/auth';

   // Protected route component
   const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
     if (!isAuthenticated()) {
       return <Navigate to="/login" />;
     }
     return <>{children}</>;
   };

   function App() {
     return (
       <Router>
         <Routes>
           <Route path="/" element={<Home />} />
           <Route path="/login" element={<Login />} />
           <Route path="/register" element={<Register />} />
           <Route
             path="/chat"
             element={
               <ProtectedRoute>
                 <Chat />
               </ProtectedRoute>
             }
           />
         </Routes>
       </Router>
     );
   }

   export default App;
   ```

9. **Package Dependencies:**

   *Task Description:* Update the package.json to include the required dependencies for educational features.

   ```json
   // frontend/package.json (dependencies section)
   "dependencies": {
     "@types/react": "^18.2.15",
     "@types/react-dom": "^18.2.7",
     "axios": "^1.4.0",
     "react": "^18.2.0",
     "react-dom": "^18.2.0",
     "react-router-dom": "^6.14.2",
     "react-syntax-highlighter": "^15.5.0",
     "@types/react-syntax-highlighter": "^15.5.7",
     "tailwindcss": "^3.3.3"
   }
   ```

10. **Backend API Endpoints for Educational Features:**

    *Task Description:* Specify the required backend API endpoints to support the educational features.

    ```python
    # backend/app/api/uploads.py
    from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
    from ..auth.router import get_current_active_user
    from ..auth.models import User
    import os
    import uuid
    from datetime import datetime

    router = APIRouter()

    # Configure the upload directory
    UPLOAD_DIR = "uploads"
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    @router.post("/upload")
    async def upload_file(
        file: UploadFile = File(...),
        current_user: User = Depends(get_current_active_user)
    ):
        """Upload image or PDF files for textbook questions"""
        # Validate file type
        if not (file.content_type.startswith("image/") or file.content_type == "application/pdf"):
            raise HTTPException(status_code=400, detail="Only images and PDFs are supported")
        
        # Generate a unique filename
        file_ext = os.path.splitext(file.filename)[1] if file.filename else ".bin"
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        
        # Save the file
        user_upload_dir = os.path.join(UPLOAD_DIR, str(current_user.id))
        os.makedirs(user_upload_dir, exist_ok=True)
        file_path = os.path.join(user_upload_dir, unique_filename)
        
        with open(file_path, "wb") as f:
            f.write(await file.read())
        
        # Return the URL to access the file
        return {
            "url": f"/uploads/{current_user.id}/{unique_filename}",
            "filename": file.filename,
            "content_type": file.content_type
        }
    ```

    ```python
    # backend/app/main.py (updated)
    from .api.uploads import router as uploads_router

    # ... (existing code)

    # Include the uploads router
    app.include_router(uploads_router, prefix="/api", tags=["uploads"])

    # Serve uploaded files
    from fastapi.staticfiles import StaticFiles
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
    ```

11. **Environment Configuration:**

    *Task Description:* Create environment configuration files for different environments (development, production).

    ```
    # frontend/.env.development
    VITE_API_URL=http://localhost:8000
    ```

    ```
    # frontend/.env.production
    VITE_API_URL=https://local-llm.seadragoninkmortal.com
    ```

12. **Deployment Configuration:**

    *Task Description:* Create a deployment configuration for the web interface.

    ```
    # frontend/nginx.conf
    server {
      listen 80;
      server_name chat.seadragoninkmortal.com;
      
      location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
      }
      
      location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
      }

      # Serve uploaded files
      location /uploads {
        alias /path/to/uploads;
      }
    }