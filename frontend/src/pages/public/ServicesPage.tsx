import { Box, Container, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '../../api/client';
import { Seo } from '../../components/Seo';
import { LoadingState } from '../../components/common';
import { ServiceCard } from './HomePage';
import type { Category, Service } from '../../types';
import { useState } from 'react';
import { FilterBar } from '../../components/common';

export function ServicesPage() {
  const [category, setCategory] = useState('');
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => unwrap<Category[]>(api.get('/categories')) });
  const services = useQuery({
    queryKey: ['services', category],
    queryFn: () => unwrap<Service[]>(api.get('/services', { params: { limit: 50, category: category || undefined } })),
  });

  return (
    <Container sx={{ py: 6 }}>
      <Seo title="Services" description="AI agents, automation, integrations, and custom software from Northline." path="/services" />
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h2">Services</Typography>
          <Typography color="text.secondary">Agents, automation, and software you can start this week or scope with us.</Typography>
        </Box>
        <FilterBar label="Category" value={category} onChange={setCategory} options={(categories.data ?? []).map((item) => ({ value: item.slug, label: item.name }))} />
      </Stack>
      {services.isLoading ? <LoadingState /> : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' } }}>
          {(services.data ?? []).map((service) => <ServiceCard key={service.id} service={service} />)}
        </Box>
      )}
    </Container>
  );
}
