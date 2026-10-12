import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import { api, errorMessage, unwrap } from '../../api/client';
import { DataTable, EmptyState, LoadingState, MoneyDisplay, PageHeader, StatCard, StatusChip } from '../../components/common';
import { Seo } from '../../components/Seo';
import { useAuth } from '../../context/AuthContext';
import { usePagedList } from '../../hooks/usePagedList';
import type { Cart, ClientService, Invoice, Notification, Order, Payment, Project } from '../../types';
import { formatDate } from '../../utils/format';
import { useState } from 'react';

export function DashboardPage() {
  const summary = useQuery({
    queryKey: ['summary'],
    queryFn: () => unwrap<{ activeServices: number; activeProjects: number; pendingPayments: number; totalSpent: string }>(api.get('/dashboard/summary')),
  });
  return (
    <>
      <Seo title="Dashboard" description="Client dashboard" noIndex />
      <PageHeader title="Overview" subtitle="Services, projects, and spend on your account." />
      {summary.isLoading || !summary.data ? <LoadingState /> : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' } }}>
          <StatCard label="Active services" value={summary.data.activeServices} />
          <StatCard label="Active projects" value={summary.data.activeProjects} />
          <StatCard label="Pending payments" value={summary.data.pendingPayments} />
          <StatCard label="Total spent" value={<MoneyDisplay amount={summary.data.totalSpent} />} />
        </Box>
      )}
    </>
  );
}

export function ProjectsPage() {
  const list = usePagedList<Project>('my-projects', '/projects');
  return (
    <>
      <Seo title="Projects" description="Your projects" noIndex />
      <PageHeader title="Projects" />
      {list.isLoading ? <LoadingState /> : (
        <DataTable
          rows={list.data?.data ?? []}
          pagination={list.data?.pagination}
          onPage={list.setPage}
          columns={[
            { key: 'n', header: 'Project', render: (row) => <RouterLink to={`/dashboard/projects/${row.id}`}>{row.projectNumber}</RouterLink> },
            { key: 's', header: 'Service', render: (row) => row.service?.name ?? row.name },
            { key: 'a', header: 'Amount', render: (row) => <MoneyDisplay amount={row.totalAmount} currency={row.currency} /> },
            { key: 'st', header: 'Status', render: (row) => <StatusChip status={row.status} /> },
            { key: 'start', header: 'Start', render: (row) => formatDate(row.startDate) },
            { key: 'due', header: 'Expected', render: (row) => formatDate(row.expectedCompletionDate) },
          ]}
        />
      )}
    </>
  );
}

export function ProjectDetailPage() {
  const { id = '' } = useParams();
  const query = useQuery({ queryKey: ['project', id], queryFn: () => unwrap<Project>(api.get(`/projects/${id}`)) });
  if (query.isLoading || !query.data) return <LoadingState />;
  const project = query.data;
  return (
    <>
      <Seo title={project.name} description="Project detail" noIndex />
      <PageHeader title={project.name} subtitle={project.projectNumber} action={<StatusChip status={project.status} />} />
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1.2fr 0.8fr' } }}>
        <Stack spacing={2}>
          <Info title="Project" lines={[project.description ?? '', `Service: ${project.service?.name ?? '—'}`, `Amount: ${project.totalAmount} ${project.currency}`, `Start: ${formatDate(project.startDate)}`, `Expected: ${formatDate(project.expectedCompletionDate)}`]} />
          <Box>
            <Typography variant="h6">Milestones</Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {(project.milestones ?? []).map((milestone) => (
                <Stack key={milestone.id} direction="row" justifyContent="space-between" sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{milestone.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{milestone.description}</Typography>
                  </Box>
                  <StatusChip status={milestone.status} />
                </Stack>
              ))}
            </Stack>
          </Box>
        </Stack>
        <Stack spacing={2}>
          <Info title="Payment" lines={[project.order ? `${project.order.orderNumber} · ${project.order.status}` : 'No linked order']} />
          <Box>
            <Typography variant="h6">Activity</Typography>
            {(project.activities ?? []).map((activity) => <Typography key={activity.id} variant="body2" sx={{ mt: 1 }}>{formatDate(activity.createdAt)} — {activity.message}</Typography>)}
          </Box>
          <Box>
            <Typography variant="h6">Notes</Typography>
            {(project.notes ?? []).length === 0 && <Typography color="text.secondary">No notes yet.</Typography>}
            {(project.notes ?? []).map((note) => (
              <Typography key={note.id} variant="body2" sx={{ mt: 1 }}>{note.author.firstName}: {note.content}</Typography>
            ))}
          </Box>
        </Stack>
      </Box>
    </>
  );
}

function Info({ title, lines }: { title: string; lines: string[] }) {
  return (
    <Box sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Typography variant="h6">{title}</Typography>
      {lines.map((line) => <Typography key={line} sx={{ mt: 0.5 }}>{line}</Typography>)}
    </Box>
  );
}

export function ClientServicesPage() {
  const list = usePagedList<ClientService>('my-services', '/client-services');
  return (
    <>
      <Seo title="Services" description="Your services" noIndex />
      <PageHeader title="Services" />
      {list.isLoading ? <LoadingState /> : (
        <DataTable
          rows={list.data?.data ?? []}
          pagination={list.data?.pagination}
          onPage={list.setPage}
          columns={[
            { key: 's', header: 'Service', render: (row) => row.service.name },
            { key: 'st', header: 'Status', render: (row) => <StatusChip status={row.status} /> },
            { key: 'a', header: 'Activated', render: (row) => formatDate(row.activatedAt) },
            { key: 'e', header: 'Expiry', render: (row) => formatDate(row.expiresAt) },
            { key: 'p', header: 'Project', render: (row) => row.project ? <RouterLink to={`/dashboard/projects/${row.project.id}`}>{row.project.projectNumber}</RouterLink> : '—' },
          ]}
        />
      )}
    </>
  );
}

export function OrdersPage() {
  const list = usePagedList<Order>('my-orders', '/orders');
  return (
    <>
      <Seo title="Orders" description="Your orders" noIndex />
      <PageHeader title="Orders" />
      {list.isLoading ? <LoadingState /> : (
        <DataTable rows={list.data?.data ?? []} pagination={list.data?.pagination} onPage={list.setPage} columns={[
          { key: 'n', header: 'Order', render: (row) => row.orderNumber },
          { key: 't', header: 'Total', render: (row) => <MoneyDisplay amount={row.total} currency={row.currency} /> },
          { key: 's', header: 'Status', render: (row) => <StatusChip status={row.status} /> },
          { key: 'd', header: 'Date', render: (row) => formatDate(row.createdAt) },
        ]} />
      )}
    </>
  );
}

export function PaymentsPage() {
  const list = usePagedList<Payment>('my-payments', '/payments');
  return (
    <>
      <Seo title="Payments" description="Your payments" noIndex />
      <PageHeader title="Payments" />
      {list.isLoading ? <LoadingState /> : (
        <DataTable rows={list.data?.data ?? []} pagination={list.data?.pagination} onPage={list.setPage} columns={[
          { key: 'id', header: 'Payment', render: (row) => row.id.slice(0, 10) },
          { key: 'o', header: 'Order', render: (row) => row.order?.orderNumber ?? '—' },
          { key: 'a', header: 'Amount', render: (row) => <MoneyDisplay amount={row.amount} currency={row.currency} /> },
          { key: 's', header: 'Status', render: (row) => <StatusChip status={row.status} /> },
          { key: 'd', header: 'Date', render: (row) => formatDate(row.createdAt) },
        ]} />
      )}
    </>
  );
}

export function InvoicesPage() {
  const list = usePagedList<Invoice>('my-invoices', '/invoices');
  return (
    <>
      <Seo title="Invoices" description="Your invoices" noIndex />
      <PageHeader title="Invoices" />
      {list.isLoading ? <LoadingState /> : (
        <DataTable rows={list.data?.data ?? []} pagination={list.data?.pagination} onPage={list.setPage} columns={[
          { key: 'n', header: 'Invoice', render: (row) => row.invoiceNumber },
          { key: 'd', header: 'Date', render: (row) => formatDate(row.invoiceDate) },
          { key: 'a', header: 'Amount', render: (row) => <MoneyDisplay amount={row.total} currency={row.currency} /> },
          { key: 's', header: 'Status', render: (row) => <StatusChip status={row.status} /> },
          { key: 'dl', header: 'PDF', render: (row) => <Button size="small" onClick={() => downloadInvoice(row.id, row.invoiceNumber)}>Download</Button> },
        ]} />
      )}
    </>
  );
}

async function downloadInvoice(id: string, number: string) {
  const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${number}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
    companyName: user?.clientProfile?.companyName ?? '',
    companyWebsite: user?.clientProfile?.companyWebsite ?? '',
    country: user?.clientProfile?.country ?? '',
    address: user?.clientProfile?.address ?? '',
    taxId: user?.clientProfile?.taxId ?? '',
  });
  return (
    <>
      <Seo title="Profile" description="Your profile" noIndex />
      <PageHeader title="Profile" />
      {!user?.emailVerified && (
        <Alert severity="warning" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={() => api.post('/auth/resend-verification')}>Resend</Button>}>
          Verify your email before checkout.
        </Alert>
      )}
      <Stack spacing={2} sx={{ maxWidth: 560 }} component="form" onSubmit={async (event) => {
        event.preventDefault();
        setError('');
        try {
          await api.patch('/profile', form);
          await refreshUser();
          setMessage('Profile saved.');
        } catch (err) {
          setError(errorMessage(err));
        }
      }}>
        {message && <Alert severity="success">{message}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        {Object.entries({ firstName: 'First name', lastName: 'Last name', phone: 'Phone', companyName: 'Company', companyWebsite: 'Website', country: 'Country', address: 'Address', taxId: 'Tax ID' }).map(([key, label]) => (
          <TextField key={key} label={label} value={form[key as keyof typeof form] ?? ''} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
        ))}
        <Button type="submit" variant="contained">Save</Button>
      </Stack>
    </>
  );
}

export function NotificationsPage() {
  const client = useQueryClient();
  const list = usePagedList<Notification>('notes', '/notifications');
  const read = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => client.invalidateQueries({ queryKey: ['notes'] }),
  });
  return (
    <>
      <Seo title="Notifications" description="Notifications" noIndex />
      <PageHeader title="Notifications" action={<Button onClick={async () => { await api.post('/notifications/read-all'); client.invalidateQueries({ queryKey: ['notes'] }); }}>Mark all read</Button>} />
      {list.isLoading ? <LoadingState /> : (list.data?.data.length ? (
        <Stack spacing={1}>
          {list.data.data.map((item) => (
            <Box key={item.id} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', opacity: item.isRead ? 0.7 : 1 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography sx={{ fontWeight: 700 }}>{item.title}</Typography>
                {!item.isRead && <Button size="small" onClick={() => read.mutate(item.id)}>Mark read</Button>}
              </Stack>
              <Typography color="text.secondary">{item.message}</Typography>
            </Box>
          ))}
        </Stack>
      ) : <EmptyState title="No notifications" />)}
    </>
  );
}

export function CartPage() {
  const client = useQueryClient();
  const cart = useQuery({ queryKey: ['cart'], queryFn: () => unwrap<Cart>(api.get('/cart')) });
  const [error, setError] = useState('');
  const reload = () => client.invalidateQueries({ queryKey: ['cart'] });
  return (
    <>
      <Seo title="Cart" description="Your cart" noIndex />
      <PageHeader title="Cart" />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {cart.isLoading || !cart.data ? <LoadingState /> : cart.data.items.length === 0 ? <EmptyState title="Your cart is empty" action={<Button component={RouterLink} to="/services">Browse services</Button>} /> : (
        <Stack spacing={2}>
          {cart.data.items.map((item) => (
            <Stack key={item.id} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box>
                <Typography sx={{ fontWeight: 700 }}>{item.service.name}</Typography>
                <Typography variant="body2" color="text.secondary">Qty {item.quantity}</Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <MoneyDisplay amount={item.lineTotal} currency={cart.data?.currency} />
                <Button size="small" onClick={async () => { await api.delete(`/cart/items/${item.id}`); reload(); }}>Remove</Button>
              </Stack>
            </Stack>
          ))}
          <Typography variant="h6">Total <MoneyDisplay amount={cart.data.total} currency={cart.data.currency} /></Typography>
          <Typography variant="body2" color="text.secondary">Tax {cart.data.tax} · calculated by the server</Typography>
          <Button variant="contained" sx={{ alignSelf: 'flex-start' }} onClick={async () => {
            setError('');
            try {
              const result = await unwrap<{ url: string }>(api.post('/orders/checkout'));
              window.location.href = result.url;
            } catch (err) {
              setError(errorMessage(err));
            }
          }}>Checkout</Button>
        </Stack>
      )}
    </>
  );
}

export function CheckoutResultPage({ status }: { status: 'success' | 'cancel' }) {
  const [params] = useSearchParams();
  const orderId = params.get('order');
  const order = useQuery({
    queryKey: ['checkout-order', orderId],
    enabled: Boolean(orderId) && status === 'success',
    refetchInterval: (query) => (query.state.data && (query.state.data as Order).status === 'PENDING_PAYMENT' ? 3000 : false),
    queryFn: () => unwrap<Order>(api.get(`/orders/${orderId}`)),
  });
  return (
    <>
      <Seo title="Checkout" description="Checkout" noIndex />
      <PageHeader title={status === 'success' ? 'Confirming payment' : 'Checkout cancelled'} />
      {status === 'cancel' ? (
        <Typography>No charge was made. Your cart is still available if you want to try again.</Typography>
      ) : (
        <Stack spacing={1}>
          <Typography>Stripe is the source of truth. This page waits for the payment webhook before showing the order as paid.</Typography>
          {order.data && <StatusChip status={order.data.status} />}
          {order.data?.status === 'PAID' && <Button component={RouterLink} to="/dashboard/projects">View projects</Button>}
        </Stack>
      )}
    </>
  );
}
