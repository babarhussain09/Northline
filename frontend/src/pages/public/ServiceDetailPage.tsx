import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { api, errorMessage, unwrap } from '../../api/client';
import { Seo } from '../../components/Seo';
import { ErrorState, LoadingState } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import type { Service } from '../../types';
import { billingLabel, priceLabel, siteUrl } from '../../utils/format';
import { useState } from 'react';

export function ServiceDetailPage() {
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const query = useQuery({
    queryKey: ['service', slug],
    queryFn: () => unwrap<Service>(api.get(`/services/${slug}`)),
  });
  const add = useMutation({
    mutationFn: (serviceId: string) => api.post('/cart/items', { serviceId, quantity: 1 }),
    onSuccess: () => setMessage('Added to your cart.'),
    onError: (error) => setMessage(errorMessage(error)),
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) return <ErrorState message="This service is not available." />;
  const service = query.data;
  const blocks = (title: string, items: Array<{ title: string; description: string }> | undefined) =>
    items && items.length > 0 ? (
      <Box sx={{ mt: 6 }}>
        <Typography variant="h3">{title}</Typography>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, mt: 2 }}>
          {items.map((item) => (
            <Box key={item.title} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Typography sx={{ fontWeight: 700 }}>{item.title}</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>{item.description}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    ) : null;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: service.name,
      description: service.shortDescription,
      url: `${siteUrl}/services/${service.slug}`,
      provider: { '@type': 'Organization', name: 'Northline' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: service.name,
      description: service.shortDescription,
      offers: {
        '@type': 'Offer',
        priceCurrency: service.currency,
        price: service.billingType === 'RECURRING' ? service.monthlyPrice : service.price,
        availability: 'https://schema.org/InStock',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: 'Services', item: `${siteUrl}/services` },
        { '@type': 'ListItem', position: 3, name: service.name, item: `${siteUrl}/services/${service.slug}` },
      ],
    },
    service.faqs && service.faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: service.faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: { '@type': 'Answer', text: faq.answer },
          })),
        }
      : null,
    ...(service.reviews ?? []).slice(0, 5).map((review) => ({
      '@context': 'https://schema.org',
      '@type': 'Review',
      name: review.title,
      reviewBody: review.content,
      reviewRating: { '@type': 'Rating', ratingValue: review.rating, bestRating: 5 },
      author: { '@type': 'Person', name: review.client ? `${review.client.user.firstName} ${review.client.user.lastName}` : 'Client' },
      itemReviewed: { '@type': 'Service', name: service.name },
    })),
  ].filter(Boolean);

  return (
    <Container sx={{ py: 6 }}>
      <Seo title={service.seoTitle || service.name} description={service.seoDescription || service.shortDescription} path={`/services/${service.slug}`} jsonLd={jsonLd} />
      <Typography variant="overline" color="secondary">{service.category?.name} · {billingLabel(service.billingType)}</Typography>
      <Typography variant="h2" sx={{ mt: 1 }}>{service.name}</Typography>
      <Typography sx={{ mt: 2, maxWidth: 720, fontSize: 18, color: 'text.secondary' }}>{service.shortDescription}</Typography>
      <Typography variant="h4" sx={{ mt: 3 }}>{priceLabel(service)}</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
        {user?.role === 'CLIENT' ? (
          <Button variant="contained" disabled={add.isPending} onClick={() => add.mutate(service.id)}>Add to cart</Button>
        ) : (
          <Button component={RouterLink} to="/register" variant="contained">Create an account to buy</Button>
        )}
        <Button component={RouterLink} to={`/book-demo?serviceId=${service.id}`} variant="outlined">Book a demo</Button>
      </Stack>
      {message && <Typography sx={{ mt: 2 }}>{message}</Typography>}
      <Typography sx={{ mt: 5, maxWidth: 760, whiteSpace: 'pre-wrap' }}>{service.description}</Typography>
      {blocks('Features', service.features)}
      {blocks('Benefits', service.benefits)}
      {blocks('Use cases', service.useCases)}
      <Box sx={{ mt: 6, p: 3, borderRadius: 3, bgcolor: '#102433', color: '#F7F4EE' }}>
        <Typography variant="h5" sx={{ color: 'inherit' }}>Pricing</Typography>
        <Typography sx={{ mt: 1 }}>{priceLabel(service)}. Tax is calculated at checkout.</Typography>
      </Box>
      {service.faqs && service.faqs.length > 0 && (
        <Box sx={{ mt: 6 }}>
          <Typography variant="h3">FAQ</Typography>
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            {service.faqs.map((faq) => (
              <Box key={faq.id}>
                <Typography sx={{ fontWeight: 700 }}>{faq.question}</Typography>
                <Typography color="text.secondary">{faq.answer}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
      {service.reviews && service.reviews.length > 0 && (
        <Box sx={{ mt: 6 }}>
          <Typography variant="h3">Reviews</Typography>
          <Stack spacing={2} sx={{ mt: 2 }}>
            {service.reviews.map((review) => (
              <Box key={review.id} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography color="secondary">{'★'.repeat(review.rating)}</Typography>
                <Typography sx={{ fontWeight: 700 }}>{review.title}</Typography>
                <Typography color="text.secondary">{review.content}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 6 }}>
        <Button component={RouterLink} to="/book-demo" variant="contained">Book a demo</Button>
        <Button component={RouterLink} to="/contact" variant="outlined">Talk to us</Button>
      </Stack>
    </Container>
  );
}
