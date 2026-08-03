import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from './theme';
import { ThemeModeProvider } from './components/ThemeMode';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <ChakraProvider value={system}>
        <ThemeModeProvider>
          <App />
        </ThemeModeProvider>
      </ChakraProvider>
    </BrowserRouter>
  </StrictMode>
);
