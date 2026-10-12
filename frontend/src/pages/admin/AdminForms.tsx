import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api, errorMessage, unwrap } from '../../api/client';
import { PageHeader, StatusChip } from '../../components/common';
import { Seo } from '../../components/Seo';
import type { Category, Faq, Milestone, Payment, Project, Service } from '../../types';
import { formatDate } from '../../utils/format';

const emptyBlock = { title: '', description: '' };

export function ServiceFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const categories = useQuery({ queryKey: ['admin-categories'], queryFn: () => unwrap<Category[]>(api.get('/admin/categories')) });
  const existing = useQuery({
    queryKey: ['admin-service', id],
    enabled: Boolean(id),
    queryFn: () => unwrap<Service>(api.get(`/admin/services/${id}`)),
  });
  const [form, setForm] = useState({
    name: '', slug: '', shortDescription: '', description: '', categoryId: '', billingType: 'ONE_TIME', price: '0', setupFee: '0', monthlyPrice: '', currency: 'USD', isFeatured: false, isPublished: false, seoTitle: '', seoDescription: '',
    features: [{ ...emptyBlock }], benefits: [{ ...emptyBlock }], useCases: [{ ...emptyBlock }],
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const service = existing.data;
    if (!service) return;
    setForm({
      name: service.name,
      slug: service.slug,
      shortDescription: service.shortDescription,
      description: service.description,
      categoryId: service.categoryId,
      billingType: service.billingType,
      price: String(service.price),
      setupFee: String(service.setupFee),
      monthlyPrice: service.monthlyPrice ? String(service.monthlyPrice) : '',
      currency: service.currency,
      isFeatured: service.isFeatured,
      isPublished: service.isPublished,
      seoTitle: service.seoTitle ?? '',
      seoDescription: service.seoDescription ?? '',
      features: service.features.length ? service.features : [{ ...emptyBlock }],
      benefits: service.benefits.length ? service.benefits : [{ ...emptyBlock }],
      useCases: service.useCases.length ? service.useCases : [{ ...emptyBlock }],
    });
  }, [existing.data]);

  function payload() {
    const clean = (items: Array<{ title: string; description: string }>) => items.filter((item) => item.title && item.description);
    return {
      ...form,
      price: Number(form.price),
      setupFee: Number(form.setupFee || 0),
      monthlyPrice: form.monthlyPrice ? Number(form.monthlyPrice) : null,
      features: clean(form.features),
      benefits: clean(form.benefits),
      useCases: clean(form.useCases),
      seoTitle: form.seoTitle || null,
      seoDescription: form.seoDescription || null,
    };
  }

  return (
    <>
      <Seo title={id ? 'Edit service' : 'New service'} description="Service form" noIndex />
      <PageHeader title={id ? 'Edit service' : 'New service'} />
      <Stack spacing={2} sx={{ maxWidth: 820 }}>
        {error && <Typography color="error">{error}</Typography>}
        <TextField label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <TextField label="Slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
        <TextField select label="Category" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
          {(categories.data ?? []).map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
        </TextField>
        <TextField label="Short description" value={form.shortDescription} onChange={(event) => setForm({ ...form, shortDescription: event.target.value })} />
        <TextField label="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} multiline minRows={5} />
        <TextField select label="Billing type" value={form.billingType} onChange={(event) => setForm({ ...form, billingType: event.target.value })}>
          {['ONE_TIME', 'RECURRING', 'PROJECT', 'CUSTOM'].map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
        </TextField>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField label="Price" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
          <TextField label="Setup fee" value={form.setupFee} onChange={(event) => setForm({ ...form, setupFee: event.target.value })} />
          <TextField label="Monthly price" value={form.monthlyPrice} onChange={(event) => setForm({ ...form, monthlyPrice: event.target.value })} />
          <TextField label="Currency" value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} />
        </Stack>
        <BlockEditor label="Features" items={form.features} onChange={(features) => setForm({ ...form, features })} />
        <BlockEditor label="Benefits" items={form.benefits} onChange={(benefits) => setForm({ ...form, benefits })} />
        <BlockEditor label="Use cases" items={form.useCases} onChange={(useCases) => setForm({ ...form, useCases })} />
        <TextField label="SEO title" value={form.seoTitle} onChange={(event) => setForm({ ...form, seoTitle: event.target.value })} />
        <TextField label="SEO description" value={form.seoDescription} onChange={(event) => setForm({ ...form, seoDescription: event.target.value })} />
        <Stack direction="row" spacing={1}>
          <Button variant={form.isFeatured ? 'contained' : 'outlined'} onClick={() => setForm({ ...form, isFeatured: !form.isFeatured })}>Featured</Button>
          <Button variant={form.isPublished ? 'contained' : 'outlined'} onClick={() => setForm({ ...form, isPublished: !form.isPublished })}>Published</Button>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={async () => {
            setError('');
            try {
              if (id) await api.patch(`/admin/services/${id}`, payload());
              else await api.post('/admin/services', payload());
              navigate('/admin/services');
            } catch (err) {
              setError(errorMessage(err));
            }
          }}>Save</Button>
          {id && (
            <>
              <Button onClick={() => api.post(`/admin/services/${id}/publish`).then(() => setForm({ ...form, isPublished: true }))}>Publish</Button>
              <Button onClick={() => api.post(`/admin/services/${id}/unpublish`).then(() => setForm({ ...form, isPublished: false }))}>Unpublish</Button>
              <Button onClick={() => api.post(`/admin/services/${id}/archive`).then(() => navigate('/admin/services'))}>Archive</Button>
              <Button color="error" onClick={() => api.delete(`/admin/services/${id}`).then(() => navigate('/admin/services')).catch((err) => setError(errorMessage(err)))}>Delete</Button>
            </>
          )}
        </Stack>
      </Stack>
    </>
  );
}

function BlockEditor({ label, items, onChange }: { label: string; items: Array<{ title: string; description: string }>; onChange: (items: Array<{ title: string; description: string }>) => void }) {
  return (
    <Box>
      <Typography sx={{ fontWeight: 700, mb: 1 }}>{label}</Typography>
      <Stack spacing={1}>
        {items.map((item, index) => (
          <Stack key={index} direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField label="Title" value={item.title} onChange={(event) => onChange(items.map((entry, entryIndex) => entryIndex === index ? { ...entry, title: event.target.value } : entry))} />
            <TextField label="Description" value={item.description} onChange={(event) => onChange(items.map((entry, entryIndex) => entryIndex === index ? { ...entry, description: event.target.value } : entry))} fullWidth />
          </Stack>
        ))}
        <Button onClick={() => onChange([...items, { ...emptyBlock }])}>Add {label.toLowerCase()}</Button>
      </Stack>
    </Box>
  );
}

type ClientDetail = {
  user: { firstName: string; lastName: string; email: string; status: string; phone: string | null; createdAt: string };
  profile: { id: string; companyName: string | null };
  projects: Project[];
  services: Array<{ id: string; status: string; service: { name: string } }>;
  orders: Array<{ id: string; orderNumber: string; status: string; total: string }>;
  payments: Payment[];
  invoices: Array<{ id: string; invoiceNumber: string; status: string; total: string }>;
  activity: Array<{ id: string; title: string; message: string; createdAt: string }>;
};

export function AdminClientDetailPage() {
  const { id = '' } = useParams();
  const query = useQuery({ queryKey: ['admin-client', id], queryFn: () => unwrap<ClientDetail>(api.get(`/admin/clients/${id}`)) });
  if (!query.data) return null;
  const detail = query.data;
  return (
    <>
      <Seo title={detail.user.email} description="Client" noIndex />
      <PageHeader title={`${detail.user.firstName} ${detail.user.lastName}`} subtitle={detail.user.email} action={<StatusChip status={detail.user.status} />} />
      <Typography>Company: {detail.profile.companyName ?? '—'}</Typography>
      <Typography sx={{ mb: 2 }}>Registered {formatDate(detail.user.createdAt)}</Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        {['ACTIVE', 'SUSPENDED', 'INACTIVE'].map((status) => (
          <Button key={status} variant={detail.user.status === status ? 'contained' : 'outlined'} onClick={() => api.patch(`/admin/clients/${id}`, { status }).then(() => query.refetch())}>{status}</Button>
        ))}
      </Stack>
      <Section title="Projects" rows={detail.projects.map((project) => `${project.projectNumber} · ${project.name} · ${project.status}`)} />
      <Section title="Services" rows={detail.services.map((service) => `${service.service.name} · ${service.status}`)} />
      <Section title="Orders" rows={detail.orders.map((order) => `${order.orderNumber} · ${order.total} · ${order.status}`)} />
      <Section title="Payments" rows={detail.payments.map((payment) => `${payment.amount} ${payment.currency} · ${payment.status}`)} />
      <Section title="Invoices" rows={detail.invoices.map((invoice) => `${invoice.invoiceNumber} · ${invoice.total} · ${invoice.status}`)} />
      <Section title="Activity" rows={detail.activity.map((item) => `${formatDate(item.createdAt)} · ${item.title}: ${item.message}`)} />
    </>
  );
}

function Section({ title, rows }: { title: string; rows: string[] }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6">{title}</Typography>
      {rows.length === 0 && <Typography color="text.secondary">None</Typography>}
      {rows.map((row) => <Typography key={row} variant="body2">{row}</Typography>)}
    </Box>
  );
}

export function AdminProjectDetailPage() {
  const { id } = useParams();
  const creating = !id;
  const query = useQuery({ queryKey: ['admin-project', id], enabled: Boolean(id), queryFn: () => unwrap<Project>(api.get(`/admin/projects/${id}`)) });
  const clients = useQuery({ queryKey: ['admin-clients-options'], queryFn: () => api.get('/admin/clients', { params: { limit: 100 } }).then((response) => response.data.data as Array<{ clientId: string; email: string }>) });
  const services = useQuery({ queryKey: ['admin-service-options'], queryFn: () => unwrap<Service[]>(api.get('/admin/services', { params: { limit: 100 } })) });
  const [note, setNote] = useState('');
  const [draft, setDraft] = useState({ clientId: '', serviceId: '', name: '', totalAmount: '0', status: 'PAID', expectedCompletionDate: '' });
  const project = query.data;

  if (!creating && !project) return null;
  return (
    <>
      <Seo title={creating ? 'New project' : project!.name} description="Project" noIndex />
      <PageHeader title={creating ? 'New project' : project!.name} subtitle={project?.projectNumber} />
      {creating ? (
        <Stack spacing={2} sx={{ maxWidth: 560 }}>
          <TextField select label="Client" value={draft.clientId} onChange={(event) => setDraft({ ...draft, clientId: event.target.value })}>
            {(clients.data ?? []).map((client) => <MenuItem key={client.clientId} value={client.clientId}>{client.email}</MenuItem>)}
          </TextField>
          <TextField select label="Service" value={draft.serviceId} onChange={(event) => setDraft({ ...draft, serviceId: event.target.value })}>
            {(services.data ?? []).map((service) => <MenuItem key={service.id} value={service.id}>{service.name}</MenuItem>)}
          </TextField>
          <TextField label="Name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          <TextField label="Amount" value={draft.totalAmount} onChange={(event) => setDraft({ ...draft, totalAmount: event.target.value })} />
          <Button variant="contained" onClick={() => api.post('/admin/projects', { ...draft, totalAmount: Number(draft.totalAmount) }).then((response) => window.location.assign(`/admin/projects/${response.data.data.id}`))}>Create</Button>
        </Stack>
      ) : (
        <Stack spacing={2}>
          <TextField select label="Status" value={project!.status} onChange={(event) => api.patch(`/admin/projects/${id}`, { status: event.target.value }).then(() => query.refetch())}>
            {['PENDING_PAYMENT', 'PAID', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'REFUNDED'].map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
          </TextField>
          <TextField type="date" label="Expected completion" defaultValue={project!.expectedCompletionDate?.slice(0, 10) ?? ''} onBlur={(event) => api.patch(`/admin/projects/${id}`, { expectedCompletionDate: event.target.value })} />
          <Typography variant="h6">Milestones</Typography>
          {(project!.milestones ?? []).map((milestone) => <MilestoneRow key={milestone.id} projectId={id!} milestone={milestone} onSaved={() => query.refetch()} />)}
          <Typography variant="h6">Notes</Typography>
          {(project!.notes ?? []).map((item) => <Typography key={item.id}>{item.author.firstName}: {item.content}</Typography>)}
          <Stack direction="row" spacing={1}>
            <TextField fullWidth label="Add a note" value={note} onChange={(event) => setNote(event.target.value)} />
            <Button onClick={() => api.post(`/admin/projects/${id}/notes`, { content: note }).then(() => { setNote(''); query.refetch(); })}>Add</Button>
          </Stack>
          <Typography variant="h6">Activity</Typography>
          {(project!.activities ?? []).map((activity) => <Typography key={activity.id} variant="body2">{activity.message}</Typography>)}
        </Stack>
      )}
    </>
  );
}

function MilestoneRow({ projectId, milestone, onSaved }: { projectId: string; milestone: Milestone; onSaved: () => void }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
      <Typography sx={{ flex: 1 }}>{milestone.title}</Typography>
      <TextField select size="small" value={milestone.status} onChange={(event) => api.patch(`/admin/projects/${projectId}/milestones/${milestone.id}`, { status: event.target.value }).then(onSaved)}>
        {['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'].map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
      </TextField>
    </Stack>
  );
}

export function AdminRefundsPage() {
  const payments = useQuery({ queryKey: ['refundable'], queryFn: () => api.get('/admin/payments', { params: { limit: 50 } }).then((response) => response.data.data as Payment[]) });
  const [paymentId, setPaymentId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  return (
    <>
      <Seo title="Refunds" description="Refunds" noIndex />
      <PageHeader title="Refunds" subtitle="Stripe confirms the refund through the webhook." />
      <Stack spacing={2} sx={{ maxWidth: 520 }}>
        <TextField select label="Payment" value={paymentId} onChange={(event) => setPaymentId(event.target.value)}>
          {(payments.data ?? []).filter((payment) => payment.status === 'SUCCEEDED' || payment.status === 'PARTIALLY_REFUNDED').map((payment) => (
            <MenuItem key={payment.id} value={payment.id}>{payment.order?.orderNumber} · {payment.amount} {payment.currency}</MenuItem>
          ))}
        </TextField>
        <TextField label="Amount (blank refunds the remainder)" value={amount} onChange={(event) => setAmount(event.target.value)} />
        <TextField label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} />
        <Button variant="contained" onClick={async () => {
          try {
            await api.post('/admin/refunds', { paymentId, amount: amount ? Number(amount) : undefined, reason });
            setMessage('Refund submitted to Stripe. The order updates when the webhook arrives.');
          } catch (err) {
            setMessage(errorMessage(err));
          }
        }}>Refund</Button>
        {message && <Typography>{message}</Typography>}
      </Stack>
    </>
  );
}

export function AdminFaqsPage() {
  const client = useQueryClient();
  const faqs = useQuery({ queryKey: ['admin-faqs'], queryFn: () => unwrap<Faq[]>(api.get('/admin/faqs')) });
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  return (
    <>
      <Seo title="FAQs" description="FAQs" noIndex />
      <PageHeader title="FAQs" />
      <Stack spacing={1} sx={{ mb: 3, maxWidth: 720 }}>
        <TextField label="Question" value={question} onChange={(event) => setQuestion(event.target.value)} />
        <TextField label="Answer" value={answer} onChange={(event) => setAnswer(event.target.value)} multiline />
        <Button variant="contained" onClick={async () => { await api.post('/admin/faqs', { question, answer, isPublished: true }); setQuestion(''); setAnswer(''); client.invalidateQueries({ queryKey: ['admin-faqs'] }); }}>Add FAQ</Button>
      </Stack>
      <Stack spacing={1}>
        {(faqs.data ?? []).map((faq) => (
          <Stack key={faq.id} direction="row" justifyContent="space-between" sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Box>
              <Typography sx={{ fontWeight: 700 }}>{faq.question}</Typography>
              <Typography variant="body2" color="text.secondary">{faq.answer}</Typography>
            </Box>
            <Stack>
              <Button size="small" onClick={() => api.patch(`/admin/faqs/${faq.id}`, { isPublished: !faq.isPublished }).then(() => client.invalidateQueries({ queryKey: ['admin-faqs'] }))}>{faq.isPublished ? 'Unpublish' : 'Publish'}</Button>
              <Button size="small" color="error" onClick={() => api.delete(`/admin/faqs/${faq.id}`).then(() => client.invalidateQueries({ queryKey: ['admin-faqs'] }))}>Delete</Button>
            </Stack>
          </Stack>
        ))}
      </Stack>
    </>
  );
}

export function AdminSettingsPage() {
  const query = useQuery({ queryKey: ['settings'], queryFn: () => unwrap<Record<string, string>>(api.get('/admin/settings')) });
  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => { if (query.data) setForm(query.data); }, [query.data]);
  const save = useMutation({ mutationFn: () => api.patch('/admin/settings', form) });
  return (
    <>
      <Seo title="Settings" description="Settings" noIndex />
      <PageHeader title="Settings" />
      <Stack spacing={2} sx={{ maxWidth: 480 }}>
        {['companyName', 'supportEmail', 'taxRatePercent', 'defaultCurrency'].map((key) => (
          <TextField key={key} label={key} value={form[key] ?? ''} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
        ))}
        <Button variant="contained" onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
        {save.isSuccess && <Typography color="secondary">Saved.</Typography>}
        {save.isError && <Typography color="error">{errorMessage(save.error)}</Typography>}
      </Stack>
    </>
  );
}

export function AdminAuditPage() {
  const list = useQuery({ queryKey: ['audit'], queryFn: () => api.get('/admin/audit-logs').then((response) => response.data.data as Array<{ id: string; action: string; entityType: string; entityId: string | null; createdAt: string; user: { email: string } }>) });
  return (
    <>
      <Seo title="Audit logs" description="Audit logs" noIndex />
      <PageHeader title="Audit logs" />
      <Stack spacing={1}>
        {(list.data ?? []).map((row) => (
          <Typography key={row.id} variant="body2">{formatDate(row.createdAt)} · {row.user.email} · {row.action} · {row.entityType} {row.entityId ?? ''}</Typography>
        ))}
      </Stack>
    </>
  );
}
