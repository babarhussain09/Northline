import { Container, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { api, errorMessage, unwrap } from '../../api/client';
import { FormCard, TextInput } from '../../components/Form';
import { Seo } from '../../components/Seo';
import type { Service } from '../../types';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  company: z.string().optional(),
  phone: z.string().optional(),
  serviceId: z.string().optional(),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  message: z.string().optional(),
});

export function BookDemoPage() {
  const [params] = useSearchParams();
  const services = useQuery({ queryKey: ['services-demo'], queryFn: () => unwrap<Service[]>(api.get('/services', { params: { limit: 50 } })) });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', company: '', phone: '', serviceId: params.get('serviceId') ?? '', preferredDate: '', preferredTime: '', message: '' },
  });
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => api.post('/demo', { ...values, serviceId: values.serviceId || undefined }),
    onSuccess: () => form.reset(),
  });

  return (
    <Container sx={{ py: 6, maxWidth: 760 }}>
      <Seo title="Book a demo" description="Book a Northline demo and tell us which service or workflow you want to see." path="/book-demo" />
      <Typography variant="h2">Book a demo</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>Thirty minutes. Bring the workflow you want to change.</Typography>
      <FormCard
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        submitLabel="Request demo"
        loading={mutation.isPending}
        error={mutation.isError ? errorMessage(mutation.error) : undefined}
        success={mutation.isSuccess ? 'Request received. We will email you to confirm a time.' : undefined}
      >
        <Stack spacing={2}>
          <TextInput label="Name" register={form.register('name')} error={form.formState.errors.name?.message} />
          <TextInput label="Email" register={form.register('email')} error={form.formState.errors.email?.message} />
          <TextInput label="Company" register={form.register('company')} />
          <TextInput label="Phone" register={form.register('phone')} />
          <TextField select label="Service" fullWidth defaultValue={params.get('serviceId') ?? ''} {...form.register('serviceId')}>
            <MenuItem value="">Not sure yet</MenuItem>
            {(services.data ?? []).map((service) => <MenuItem key={service.id} value={service.id}>{service.name}</MenuItem>)}
          </TextField>
          <TextInput label="Preferred date" type="date" register={form.register('preferredDate')} />
          <TextInput label="Preferred time" register={form.register('preferredTime')} />
          <TextInput label="Message" register={form.register('message')} multiline />
        </Stack>
      </FormCard>
    </Container>
  );
}
