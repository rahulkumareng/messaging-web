import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Field, Flex, Heading, Input, Text } from '@chakra-ui/react';
import { AppLink } from '../components/AppLink';
import { ThemeToggle } from '../components/ThemeMode';
import { BoltIcon } from '../components/icons';
import { authApi, getErrorMessage } from '../api/client';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(email, password);
      const { userId, token } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('userId', userId);
      localStorage.setItem('email', email);

      navigate('/chat', { replace: true });
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Invalid credentials. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex
      minH="100dvh"
      align="center"
      justify="center"
      position="relative"
      bg="bg.canvas"
      px={4}
    >
      <Box position="absolute" top={4} right={4}>
        <ThemeToggle />
      </Box>

      <Box layerStyle="card" w="full" maxW="400px" p={10} animation="fade-in-up 400ms ease-out">
        <Flex justify="center" mb={4}>
          <BoltIcon boxSize={14} />
        </Flex>
        <Heading as="h1" fontSize="2xl" fontWeight="700" fontFamily="display" mb={1.5} textAlign="center">
          Welcome back
        </Heading>
        <Text color="text.secondary" fontSize="sm" mb={8}>
          Sign in to continue to Messenger
        </Text>

        {error && (
          <Alert.Root status="error" mb={5}>
            <Alert.Indicator />
            <Alert.Title>{error}</Alert.Title>
          </Alert.Root>
        )}

        <form onSubmit={handleSubmit}>
          <Field.Root mb={5}>
            <Field.Label
              fontSize="xs"
              fontWeight="medium"
              color="text.secondary"
              mb={1.5}
            >
              Email
            </Field.Label>
            <Input
              id="email"
              type="email"
              colorPalette="brand"
              bg="bg.raised"
              borderColor="border.subtle"
              _placeholder={{ color: 'text.muted' }}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </Field.Root>

          <Field.Root mb={6}>
            <Field.Label
              fontSize="xs"
              fontWeight="medium"
              color="text.secondary"
              mb={1.5}
            >
              Password
            </Field.Label>
            <Input
              id="password"
              type="password"
              colorPalette="brand"
              bg="bg.raised"
              borderColor="border.subtle"
              _placeholder={{ color: 'text.muted' }}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field.Root>

          <Button
            type="submit"
            w="full"
            bg="accent.solid"
            color="text.inverse"
            _hover={{ bg: 'accent.hover' }}
            cartoon
            loading={isLoading}
            loadingText="Signing in..."
            disabled={!email || !password}
          >
            Sign In
          </Button>
        </form>

        <Text textAlign="center" mt={6} fontSize="sm" color="text.secondary">
          Don't have an account?{' '}
          <AppLink to="/register" color="accent.text" fontWeight="medium" _hover={{ textDecoration: 'underline' }}>
            Create one
          </AppLink>
        </Text>
      </Box>
    </Flex>
  );
};

export default LoginPage;
