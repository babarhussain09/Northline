import { Alert, Button, Stack, TextField } from '@mui/material';
import type { UseFormRegisterReturn } from 'react-hook-form';
import type { FormEvent, ReactNode } from 'react';

export function TextInput({ label, register, error, type = 'text', multiline = false }: {
  label: string;
  register: UseFormRegisterReturn;
  error?: string;
  type?: string;
  multiline?: boolean;
}) {
  return <TextField label={label} type={type} multiline={multiline} minRows={multiline ? 4 : undefined} fullWidth {...register} error={Boolean(error)} helperText={error} />;
}

export function FormCard({ children, onSubmit, submitLabel, loading, error, success }: {
  children: ReactNode;
  onSubmit: (event: FormEvent) => void;
  submitLabel: string;
  loading?: boolean;
  error?: string;
  success?: string;
}) {
  return (
    <Stack component="form" onSubmit={onSubmit} spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      {children}
      <Button type="submit" variant="contained" disabled={loading}>{submitLabel}</Button>
    </Stack>
  );
}
