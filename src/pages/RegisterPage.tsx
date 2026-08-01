import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Field, Flex, Heading, Input, Text } from '@chakra-ui/react';
import { AppLink } from '../components/AppLink';
import { ThemeToggle } from '../components/ThemeMode';
import { BoltIcon } from '../components/icons';
import { authApi, getErrorMessage } from '../api/client';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.register(email, password);
      const { userId, token } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('userId', userId);
      localStorage.setItem('email', email);

      navigate('/chat', { replace: true });
    } catch (err: any) {
      setError(getErrorMessage(err, 'Registration failed. Please try again.'));
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
          Create account
        </Heading>
        <Text color="text.secondary" fontSize="sm" mb={8}>
          Join Messenger and start chatting
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

          <Field.Root mb={5}>
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
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={72}
            />
          </Field.Root>

          <Field.Root mb={6}>
            <Field.Label
              fontSize="xs"
              fontWeight="medium"
              color="text.secondary"
              mb={1.5}
            >
              Confirm Password
            </Field.Label>
            <Input
              id="confirmPassword"
              type="password"
              colorPalette="brand"
              bg="bg.raised"
              borderColor="border.subtle"
              _placeholder={{ color: 'text.muted' }}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              maxLength={72}
            />
          </Field.Root>

          <Button
            type="submit"
            w="full"
            bg="accent.solid"
            color="text.inverse"
            _hover={{ bg: 'accent.hover' }}
            cartoon
            loading={loading}
            loadingText="Creating account..."
            disabled={!email || !password || !confirmPassword}
          >
            Create Account
          </Button>
        </form>

        <Text textAlign="center" mt={6} fontSize="sm" color="text.secondary">
          Already have an account?{' '}
          <AppLink to="/login" color="accent.text" fontWeight="medium" _hover={{ textDecoration: 'underline' }}>
            Sign in
          </AppLink>
        </Text>
      </Box>
    </Flex>
  );
};

export default RegisterPage;
