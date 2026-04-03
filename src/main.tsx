import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ExcelAddinPage} from './pages/ExcelAddinPage.tsx';
import './index.css';

const isExcelAddin = window.location.search.includes('addin=true');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isExcelAddin ? <ExcelAddinPage /> : <App />}
  </StrictMode>,
);
