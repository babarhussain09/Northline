import { Box, Container, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useState, type ReactNode } from 'react';
import { api, errorMessage } from '../../api/client';
import { FormCard, TextInput } from '../../components/Form';
import { Seo } from '../../components/Seo';
import { useAuth } from '../../context/AuthContext';

function AuthFrame({ title, path, children }: { title: string; path: string; children: ReactNode }) {
  return (
    <Container sx={{ py: 8, maxWidth: 480 }}>
      <Seo title={title} description={title} noIndex path={path} />
      <Typography variant="h3" sx={{ mb: 3 }}>{title}</Typography>
      <Box sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>{children}</Box>
    </Container>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const form = useForm({ resolver: zodResolver(z.object({ email: z.string().email(), password: z.string().min(1) })), defaultValues: { email: '', password: '' } });
  return (
    <AuthFrame title="Sign in" path="/login">
      <FormCard
        submitLabel="Sign in"
        error={error}
        onSubmit={form.handleSubmit(async (values) => {
          setError('');
          try {
            const user = await login(values.email, values.password);
            navigate(user.role === 'ADMIN' ? '/admin' : '/dashboard');
          } catch (err) {
            setError(errorMessage(err, 'Could not sign in'));
          }
        })}
      >
        <TextInput label="Email" register={form.register('email')} error={form.formState.errors.email?.message} />
        <TextInput label="Password" type="password" register={form.register('password')} error={form.formState.errors.password?.message} />
        <Typography variant="body2"><RouterLink to="/forgot-password">Forgot password</RouterLink></Typography>
        <Typography variant="body2">New here? <RouterLink to="/register">Create an account</RouterLink></Typography>
      </FormCard>
    </AuthFrame>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const schema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    companyName: z.string().optional(),
  });
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { firstName: '', lastName: '', email: '', password: '', companyName: '' } });
  return (
    <AuthFrame title="Create your account" path="/register">
      <FormCard
        submitLabel="Create account"
        error={error}
        onSubmit={form.handleSubmit(async (values) => {
          setError('');
          try {
            await api.post('/auth/register', values);
            navigate('/login?registered=1');
          } catch (err) {
            setError(errorMessage(err));
          }
        })}
      >
        <TextInput label="First name" register={form.register('firstName')} error={form.formState.errors.firstName?.message} />
        <TextInput label="Last name" register={form.register('lastName')} error={form.formState.errors.lastName?.message} />
        <TextInput label="Work email" register={form.register('email')} error={form.formState.errors.email?.message} />
        <TextInput label="Company" register={form.register('companyName')} />
        <TextInput label="Password" type="password" register={form.register('password')} error={form.formState.errors.password?.message} />
        <Typography variant="body2">Already registered? <RouterLink to="/login">Sign in</RouterLink></Typography>
      </FormCard>
    </AuthFrame>
  );
}

export function ForgotPasswordPage() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const form = useForm({ resolver: zodResolver(z.object({ email: z.string().email() })), defaultValues: { email: '' } });
  return (
    <AuthFrame title="Reset password" path="/forgot-password">
      <FormCard
        submitLabel="Send reset link"
        error={error}
        success={message}
        onSubmit={form.handleSubmit(async (values) => {
          setError('');
          try {
            const response = await api.post('/auth/forgot-password', values);
            setMessage(response.data.data.message);
          } catch (err) {
            setError(errorMessage(err));
          }
        })}
      >
        <TextInput label="Email" register={form.register('email')} error={form.formState.errors.email?.message} />
      </FormCard>
    </AuthFrame>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const form = useForm({ resolver: zodResolver(z.object({ password: z.string().min(8) })), defaultValues: { password: '' } });
  return (
    <AuthFrame title="Choose a new password" path="/reset-password">
      <FormCard
        submitLabel="Update password"
        error={error}
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await api.post('/auth/reset-password', { token: params.get('token'), password: values.password });
            navigate('/login');
          } catch (err) {
            setError(errorMessage(err));
          }
        })}
      >
        <TextInput label="New password" type="password" register={form.register('password')} error={form.formState.errors.password?.message} />
      </FormCard>
    </AuthFrame>
  );
}

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  return (
    <AuthFrame title="Verify email" path="/verify-email">
      <FormCard
        submitLabel="Verify"
        error={error}
        success={done ? 'Email verified. You can sign in.' : undefined}
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            await api.post('/auth/verify-email', { token: params.get('token') });
            setDone(true);
          } catch (err) {
            setError(errorMessage(err));
          }
        }}
      >
        <Typography color="text.secondary">Confirm this address so you can check out.</Typography>
      </FormCard>
    </AuthFrame>
  );
}
