import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from './theme';
import { ThemeModeProvider } from './components/ThemeMode';
import App from './App';

createRoot(document.getElementById('root')!).render(
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
