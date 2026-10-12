import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { formatMoney, statusLabel } from '../utils/format';
import type { Pagination } from '../types';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-end' }} spacing={2} sx={{ mb: 3 }}>
      <Box>
        <Typography variant="h3" sx={{ fontSize: { xs: '1.7rem', md: '2rem' } }}>{title}</Typography>
        {subtitle && <Typography color="text.secondary" sx={{ mt: 0.5 }}>{subtitle}</Typography>}
      </Box>
      {action}
    </Stack>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Box sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper', height: '100%' }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h4" sx={{ mt: 1 }}>{value}</Typography>
      {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
    </Box>
  );
}

const chipColor: Record<string, { bg: string; color: string }> = {
  ACTIVE: { bg: '#E5F4EC', color: '#1F7A4D' },
  PAID: { bg: '#E5F4EC', color: '#1F7A4D' },
  COMPLETED: { bg: '#E5F4EC', color: '#1F7A4D' },
  SUCCEEDED: { bg: '#E5F4EC', color: '#1F7A4D' },
  SCHEDULED: { bg: '#E7F0FA', color: '#1D4E89' },
  IN_PROGRESS: { bg: '#E7F0FA', color: '#1D4E89' },
  CONTACTED: { bg: '#E7F0FA', color: '#1D4E89' },
  OPEN: { bg: '#E7F0FA', color: '#1D4E89' },
  PENDING: { bg: '#F8F1DE', color: '#8A5A00' },
  PENDING_PAYMENT: { bg: '#F8F1DE', color: '#8A5A00' },
  ON_HOLD: { bg: '#F8F1DE', color: '#8A5A00' },
  NEW: { bg: '#F8F1DE', color: '#8A5A00' },
  DRAFT: { bg: '#F3F1EC', color: '#5C6B78' },
  FAILED: { bg: '#FDECEC', color: '#B42318' },
  SUSPENDED: { bg: '#FDECEC', color: '#B42318' },
  BLOCKED: { bg: '#FDECEC', color: '#B42318' },
  CANCELLED: { bg: '#F3F1EC', color: '#5C6B78' },
  REFUNDED: { bg: '#F3E8FF', color: '#6B21A8' },
  PARTIALLY_REFUNDED: { bg: '#F3E8FF', color: '#6B21A8' },
  EXPIRED: { bg: '#F3F1EC', color: '#5C6B78' },
  VOID: { bg: '#F3F1EC', color: '#5C6B78' },
  RESOLVED: { bg: '#E5F4EC', color: '#1F7A4D' },
  READ: { bg: '#E7F0FA', color: '#1D4E89' },
  INACTIVE: { bg: '#F3F1EC', color: '#5C6B78' },
};

export function StatusChip({ status }: { status: string }) {
  const tone = chipColor[status] ?? { bg: '#F3F1EC', color: '#5C6B78' };
  return (
    <Box component="span" sx={{ display: 'inline-flex', px: 1.1, py: 0.35, borderRadius: 999, bgcolor: tone.bg, color: tone.color, fontSize: 12, fontWeight: 700, letterSpacing: '0.02em' }}>
      {statusLabel(status)}
    </Box>
  );
}

export function MoneyDisplay({ amount, currency }: { amount: string | number | null | undefined; currency?: string }) {
  return <span>{formatMoney(amount, currency)}</span>;
}

export function SearchBar({ value, onChange, placeholder = 'Search' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <TextField size="small" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} fullWidth />;
}

export function FilterBar({ value, onChange, options, label = 'Status' }: { value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; label?: string }) {
  return (
    <TextField select size="small" label={label} value={value} onChange={(event) => onChange(event.target.value)} sx={{ minWidth: 180 }}>
      <MenuItem value="">All</MenuItem>
      {options.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
    </TextField>
  );
}

export function DataTable<T extends { id: string }>({ columns, rows, pagination, onPage, empty }: {
  columns: Array<{ key: string; header: string; render: (row: T) => ReactNode }>;
  rows: T[];
  pagination?: Pagination;
  onPage?: (page: number) => void;
  empty?: string;
}) {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden', bgcolor: 'background.paper' }}>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((column) => <TableCell key={column.key} sx={{ fontWeight: 700, color: 'text.secondary' }}>{column.header}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>{empty ?? 'Nothing here yet.'}</Typography>
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                {columns.map((column) => <TableCell key={column.key}>{column.render(row)}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      {pagination && onPage && (
        <TablePagination
          component="div"
          count={pagination.total}
          page={Math.max(0, pagination.page - 1)}
          onPageChange={(_event, page) => onPage(page + 1)}
          rowsPerPage={pagination.limit}
          rowsPerPageOptions={[pagination.limit]}
        />
      )}
    </Box>
  );
}

export function ConfirmDialog({ open, title, body, confirmLabel = 'Confirm', onClose, onConfirm, loading }: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent><Typography color="text.secondary">{body}</Typography></DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="error" onClick={onConfirm} disabled={loading}>{confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  );
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ py: 8 }}>
      <CircularProgress size={28} />
      <Typography color="text.secondary">{label}</Typography>
    </Stack>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <Box sx={{ py: 6, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 3 }}>
      <Typography variant="h6">{title}</Typography>
      {body && <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>{body}</Typography>}
      {action}
    </Box>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Typography color="error">{message}</Typography>
      {onRetry && <Button sx={{ mt: 2 }} onClick={onRetry}>Try again</Button>}
    </Box>
  );
}
