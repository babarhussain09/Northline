import { Container, Stack, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, errorMessage } from '../../api/client';
import { Seo } from '../../components/Seo';
import { FormCard, TextInput } from '../../components/Form';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  company: z.string().optional(),
  subject: z.string().min(2),
  message: z.string().min(2),
});

export function ContactPage() {
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name: '', email: '', company: '', subject: '', message: '' } });
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => api.post('/contact', values),
    onSuccess: () => form.reset(),
  });

  return (
    <Container sx={{ py: 6, maxWidth: 760 }}>
      <Seo title="Contact" description="Talk to Northline about an agent, an automation, or a custom build." path="/contact" />
      <Typography variant="h2">Contact</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>Tell us what you want to take off the team’s plate. We reply by email.</Typography>
      <FormCard
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        submitLabel="Send message"
        loading={mutation.isPending}
        error={mutation.isError ? errorMessage(mutation.error) : undefined}
        success={mutation.isSuccess ? 'Message received. We will reply by email.' : undefined}
      >
        <Stack spacing={2}>
          <TextInput label="Name" register={form.register('name')} error={form.formState.errors.name?.message} />
          <TextInput label="Email" register={form.register('email')} error={form.formState.errors.email?.message} />
          <TextInput label="Company" register={form.register('company')} />
          <TextInput label="Subject" register={form.register('subject')} error={form.formState.errors.subject?.message} />
          <TextInput label="Message" register={form.register('message')} error={form.formState.errors.message?.message} multiline />
        </Stack>
      </FormCard>
    </Container>
  );
}

export function AboutPage() {
  return (
    <Container sx={{ py: 6, maxWidth: 800 }}>
      <Seo title="About" description="Northline builds AI agents, automation, and custom software around the way a business already works." path="/about" />
      <Typography variant="h2">About Northline</Typography>
      <Typography sx={{ mt: 2, fontSize: 18 }} color="text.secondary">
        Northline designs agents and software around a specific workflow: sales follow-up, support, operations, or the internal tool a team has been holding together with spreadsheets.
      </Typography>
      <Typography sx={{ mt: 2 }}>
        Published services have a price and a project path. Custom work starts with a demo, then a scoped project. Either way, the client sees orders, payments, invoices, and milestones in one place.
      </Typography>
    </Container>
  );
}

export function LegalPage({ title, body }: { title: string; body: string }) {
  return (
    <Container sx={{ py: 6, maxWidth: 800 }}>
      <Seo title={title} description={body.slice(0, 150)} path={title === 'Privacy' ? '/privacy' : '/terms'} />
      <Typography variant="h2">{title}</Typography>
      <Typography sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>{body}</Typography>
    </Container>
  );
}
