import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// No StrictMode: it would mount the game twice in development (two WebGL contexts).
createRoot(document.getElementById('root')!).render(<App />);
