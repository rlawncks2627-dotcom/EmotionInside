import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root 를 찾을 수 없습니다. index.html 을 확인해주세요.');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
