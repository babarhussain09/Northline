import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, unwrap } from '../../api/client';
import { DataTable, LoadingState, MoneyDisplay, PageHeader, StatCard, StatusChip } from '../../components/common';
import { FilterBar, SearchBar } from '../../components/common';
import { Seo } from '../../components/Seo';
import { usePagedList } from '../../hooks/usePagedList';
import type { Analytics, Category, Invoice, Order, Payment, Project, PublicReview, Service } from '../../types';
import { formatDate, statusLabel } from '../../utils/format';
import { useState, type ReactElement, type ReactNode } from 'react';

export function AdminHomePage() {
  const query = useQuery({ queryKey: ['analytics'], queryFn: () => unwrap<Analytics>(api.get('/admin/analytics')) });
  if (query.isLoading || !query.data) return <LoadingState />;
  const data = query.data;
  return (
    <>
      <Seo title="Admin" description="Admin dashboard" noIndex />
      <PageHeader title="Dashboard" />
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' } }}>
        <StatCard label="Total revenue" value={<MoneyDisplay amount={data.totalRevenue} />} />
        <StatCard label="Monthly revenue" value={<MoneyDisplay amount={data.monthlyRevenue} />} />
        <StatCard label="Active clients" value={data.activeClients} />
        <StatCard label="Active projects" value={data.activeProjects} />
        <StatCard label="Pending payments" value={data.pendingPayments} />
        <StatCard label="Services sold" value={data.servicesSold} />
        <StatCard label="New demo requests" value={data.demoRequests} />
      </Box>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, mt: 3 }}>
        <ChartCard title="Revenue"><LineChart data={data.revenueChart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Line dataKey="amount" stroke="#0F766E" strokeWidth={2} dot={false} /></LineChart></ChartCard>
        <ChartCard title="Orders"><BarChart data={data.ordersChart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Bar dataKey="count" fill="#102433" /></BarChart></ChartCard>
        <ChartCard title="Customer growth"><LineChart data={data.customerGrowth}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Line dataKey="count" stroke="#1D4E89" strokeWidth={2} dot={false} /></LineChart></ChartCard>
        <ChartCard title="Project status"><BarChart data={data.projectStatus}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="status" /><YAxis /><Tooltip /><Bar dataKey="count" fill="#0F766E" /></BarChart></ChartCard>
      </Box>
      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Top services</Typography>
      <DataTable rows={data.topServices.map((row) => ({ ...row, id: row.name }))} columns={[
        { key: 'n', header: 'Service', render: (row) => row.name },
        { key: 'c', header: 'Sold', render: (row) => row.count },
        { key: 'r', header: 'Revenue', render: (row) => <MoneyDisplay amount={row.revenue} /> },
      ]} />
    </>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactElement }) {
  return (
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper', height: 280 }}>
      <Typography sx={{ fontWeight: 700, mb: 1 }}>{title}</Typography>
      <ResponsiveContainer width="100%" height="85%">{children}</ResponsiveContainer>
    </Box>
  );
}

type ClientRow = { id: string; clientId: string | null; firstName: string; lastName: string; email: string; companyName: string | null; createdAt: string; services: number; projects: number; orders: number; totalSpent: string };

export function AdminClientsPage() {
  const list = usePagedList<ClientRow>('admin-clients', '/admin/clients');
  return (
    <ListFrame title="Clients" search={list.search} setSearch={list.setSearch}>
      <DataTable rows={list.data?.data ?? []} pagination={list.data?.pagination} onPage={list.setPage} columns={[
        { key: 'n', header: 'Name', render: (row) => <RouterLink to={`/admin/clients/${row.clientId ?? row.id}`}>{row.firstName} {row.lastName}</RouterLink> },
        { key: 'e', header: 'Email', render: (row) => row.email },
        { key: 'c', header: 'Company', render: (row) => row.companyName ?? '—' },
        { key: 'd', header: 'Registered', render: (row) => formatDate(row.createdAt) },
        { key: 's', header: 'Services', render: (row) => row.services },
        { key: 'p', header: 'Projects', render: (row) => row.projects },
        { key: 'o', header: 'Orders', render: (row) => row.orders },
        { key: 't', header: 'Spent', render: (row) => <MoneyDisplay amount={row.totalSpent} /> },
      ]} />
    </ListFrame>
  );
}

export function AdminServicesPage() {
  const list = usePagedList<Service>('admin-services', '/admin/services');
  return (
    <ListFrame title="Services" search={list.search} setSearch={list.setSearch} action={<Button component={RouterLink} to="/admin/services/new" variant="contained">New service</Button>}>
      <DataTable rows={list.data?.data ?? []} pagination={list.data?.pagination} onPage={list.setPage} columns={[
        { key: 'n', header: 'Name', render: (row) => <RouterLink to={`/admin/services/${row.id}`}>{row.name}</RouterLink> },
        { key: 'c', header: 'Category', render: (row) => row.category?.name ?? '—' },
        { key: 'b', header: 'Billing', render: (row) => row.billingType },
        { key: 'p', header: 'Price', render: (row) => <MoneyDisplay amount={row.billingType === 'RECURRING' ? row.monthlyPrice : row.price} currency={row.currency} /> },
        { key: 's', header: 'Published', render: (row) => row.isPublished ? 'Yes' : 'No' },
      ]} />
    </ListFrame>
  );
}

export function AdminCategoriesPage() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['admin-categories'], queryFn: () => unwrap<Category[]>(api.get('/admin/categories')) });
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  return (
    <>
      <Seo title="Categories" description="Categories" noIndex />
      <PageHeader title="Categories" />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
        <TextField size="small" label="Name" value={name} onChange={(event) => setName(event.target.value)} />
        <TextField size="small" label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
        <Button variant="contained" onClick={async () => { await api.post('/admin/categories', { name, description }); setName(''); setDescription(''); client.invalidateQueries({ queryKey: ['admin-categories'] }); }}>Add</Button>
      </Stack>
      {query.isLoading ? <LoadingState /> : (
        <DataTable rows={query.data ?? []} columns={[
          { key: 'n', header: 'Name', render: (row) => row.name },
          { key: 's', header: 'Slug', render: (row) => row.slug },
          { key: 'a', header: 'Active', render: (row) => (row.isActive ? 'Yes' : 'No') },
          { key: 'x', header: '', render: (row) => <Button color="error" size="small" onClick={async () => { await api.delete(`/admin/categories/${row.id}`); client.invalidateQueries({ queryKey: ['admin-categories'] }); }}>Delete</Button> },
        ]} />
      )}
    </>
  );
}

export function AdminOrdersPage() {
  const [status, setStatus] = useState('');
  const list = usePagedList<Order>('admin-orders', '/admin/orders', { status });
  return (
    <ListFrame title="Orders" search={list.search} setSearch={list.setSearch} filter={<FilterBar value={status} onChange={setStatus} options={['PENDING_PAYMENT', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED'].map((value) => ({ value, label: statusLabel(value) }))} />}>
      <DataTable rows={list.data?.data ?? []} pagination={list.data?.pagination} onPage={list.setPage} columns={[
        { key: 'n', header: 'Order', render: (row) => row.orderNumber },
        { key: 'c', header: 'Client', render: (row) => row.client ? `${row.client.user.firstName} ${row.client.user.lastName}` : '—' },
        { key: 't', header: 'Total', render: (row) => <MoneyDisplay amount={row.total} currency={row.currency} /> },
        { key: 's', header: 'Status', render: (row) => <StatusChip status={row.status} /> },
        { key: 'd', header: 'Date', render: (row) => formatDate(row.createdAt) },
      ]} />
    </ListFrame>
  );
}

export function AdminPaymentsPage() {
  const list = usePagedList<Payment>('admin-payments', '/admin/payments');
  return (
    <ListFrame title="Payments" search={list.search} setSearch={list.setSearch}>
      <DataTable rows={list.data?.data ?? []} pagination={list.data?.pagination} onPage={list.setPage} columns={[
        { key: 'id', header: 'Payment', render: (row) => row.id.slice(0, 12) },
        { key: 'c', header: 'Client', render: (row) => row.client ? row.client.user.email : '—' },
        { key: 'o', header: 'Order', render: (row) => row.order?.orderNumber ?? '—' },
        { key: 'a', header: 'Amount', render: (row) => <MoneyDisplay amount={row.amount} currency={row.currency} /> },
        { key: 's', header: 'Status', render: (row) => <StatusChip status={row.status} /> },
        { key: 'd', header: 'Date', render: (row) => formatDate(row.createdAt) },
      ]} />
    </ListFrame>
  );
}

export function AdminInvoicesPage() {
  const list = usePagedList<Invoice>('admin-invoices', '/admin/invoices');
  return (
    <ListFrame title="Invoices" search={list.search} setSearch={list.setSearch}>
      <DataTable rows={list.data?.data ?? []} pagination={list.data?.pagination} onPage={list.setPage} columns={[
        { key: 'n', header: 'Invoice', render: (row) => row.invoiceNumber },
        { key: 'd', header: 'Date', render: (row) => formatDate(row.invoiceDate) },
        { key: 'a', header: 'Amount', render: (row) => <MoneyDisplay amount={row.total} currency={row.currency} /> },
        { key: 's', header: 'Status', render: (row) => <StatusChip status={row.status} /> },
        { key: 'pdf', header: 'PDF', render: (row) => <Button size="small" onClick={() => downloadAdminInvoice(row.id, row.invoiceNumber)}>Download</Button> },
      ]} />
    </ListFrame>
  );
}

async function downloadAdminInvoice(id: string, number: string) {
  const response = await api.get(`/admin/invoices/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${number}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminProjectsPage() {
  const list = usePagedList<Project>('admin-projects', '/admin/projects');
  return (
    <ListFrame title="Projects" search={list.search} setSearch={list.setSearch} action={<Button component={RouterLink} to="/admin/projects/new" variant="contained">New project</Button>}>
      <DataTable rows={list.data?.data ?? []} pagination={list.data?.pagination} onPage={list.setPage} columns={[
        { key: 'n', header: 'Project', render: (row) => <RouterLink to={`/admin/projects/${row.id}`}>{row.projectNumber}</RouterLink> },
        { key: 'name', header: 'Name', render: (row) => row.name },
        { key: 'c', header: 'Client', render: (row) => row.client ? row.client.user.email : '—' },
        { key: 's', header: 'Status', render: (row) => <StatusChip status={row.status} /> },
        { key: 'd', header: 'Expected', render: (row) => formatDate(row.expectedCompletionDate) },
      ]} />
    </ListFrame>
  );
}

export function AdminReviewsPage() {
  const client = useQueryClient();
  const list = usePagedList<PublicReview & { id: string }>('admin-reviews', '/admin/reviews');
  return (
    <ListFrame title="Reviews" search={list.search} setSearch={list.setSearch}>
      <DataTable rows={list.data?.data ?? []} pagination={list.data?.pagination} onPage={list.setPage} columns={[
        { key: 't', header: 'Title', render: (row) => row.title },
        { key: 's', header: 'Service', render: (row) => row.service?.name ?? '—' },
        { key: 'r', header: 'Rating', render: (row) => row.rating },
        { key: 'p', header: 'Published', render: (row) => (row.isPublished ? 'Yes' : 'No') },
        { key: 'a', header: '', render: (row) => <Button size="small" onClick={async () => { await api.patch(`/admin/reviews/${row.id}`, { isPublished: !row.isPublished }); client.invalidateQueries({ queryKey: ['admin-reviews'] }); }}>{row.isPublished ? 'Unpublish' : 'Approve'}</Button> },
      ]} />
    </ListFrame>
  );
}

export function AdminSimpleQueue({ title, path, statuses }: { title: string; path: string; statuses: string[] }) {
  const [status, setStatus] = useState('');
  const client = useQueryClient();
  const list = usePagedList<{ id: string; name: string; email: string; status: string; subject?: string; company?: string | null; createdAt: string; message?: string }>('queue-' + path, path, { status });
  return (
    <ListFrame title={title} search={list.search} setSearch={list.setSearch} filter={<FilterBar value={status} onChange={setStatus} options={statuses.map((value) => ({ value, label: statusLabel(value) }))} />}>
      <Stack spacing={1}>
        {(list.data?.data ?? []).map((row) => (
          <Stack key={row.id} spacing={1} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between">
              <Typography sx={{ fontWeight: 700 }}>{row.name} · {row.email}</Typography>
              <StatusChip status={row.status} />
            </Stack>
            <Typography color="text.secondary">{row.subject || row.company || row.message}</Typography>
            <TextField select size="small" label="Status" value={row.status} onChange={async (event) => { await api.patch(`${path}/${row.id}`, { status: event.target.value }); client.invalidateQueries({ queryKey: ['queue-' + path] }); }} sx={{ maxWidth: 220 }}>
              {statuses.map((value) => <MenuItem key={value} value={value}>{statusLabel(value)}</MenuItem>)}
            </TextField>
          </Stack>
        ))}
      </Stack>
    </ListFrame>
  );
}

function ListFrame({ title, search, setSearch, action, filter, children }: { title: string; search: string; setSearch: (value: string) => void; action?: ReactNode; filter?: ReactNode; children: ReactNode }) {
  return (
    <>
      <Seo title={title} description={title} noIndex />
      <PageHeader title={title} action={action} />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 2 }}>
        <Box sx={{ flex: 1 }}><SearchBar value={search} onChange={setSearch} /></Box>
        {filter}
      </Stack>
      {children}
    </>
  );
}

export function useInvalidate() {
  const client = useQueryClient();
  return () => client.invalidateQueries();
}

export function AdminMutationButton({ label, run }: { label: string; run: () => Promise<unknown> }) {
  const mutation = useMutation({ mutationFn: run });
  return <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>{label}</Button>;
}
