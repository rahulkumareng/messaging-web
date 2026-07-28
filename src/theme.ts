import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#f0edff' },
          100: { value: '#d4cfff' },
          200: { value: '#b8b0ff' },
          300: { value: '#9c91ff' },
          400: { value: '#8077ff' },
          500: { value: '#6c63ff' },
          600: { value: '#5a52d9' },
          700: { value: '#4841b3' },
          800: { value: '#36318c' },
          900: { value: '#252166' },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
