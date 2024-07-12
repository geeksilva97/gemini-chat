import { initializeApp } from 'firebase/app';
import { getVertexAI, getGenerativeModel, FunctionDeclarationSchemaType } from "firebase/vertexai-preview";

const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
  measurementId: "..."
};

const app = initializeApp(firebaseConfig);

const vertexAI = getVertexAI(app);

export { FunctionDeclarationSchemaType, app, vertexAI, getGenerativeModel, getVertexAI };
