import { Container, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '../../api/client';
import { Seo } from '../../components/Seo';
import { LoadingState } from '../../components/common';
import type { Faq } from '../../types';
import { siteUrl } from '../../utils/format';

export function FaqPage() {
  const query = useQuery({ queryKey: ['faqs'], queryFn: () => unwrap<Faq[]>(api.get('/faqs')) });
  const jsonLd = query.data && query.data.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: query.data.map((faq) => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })),
    url: `${siteUrl}/faq`,
  } : undefined;

  return (
    <Container sx={{ py: 6, maxWidth: 860 }}>
      <Seo title="FAQ" description="Answers about Northline services, projects, billing, and demos." path="/faq" jsonLd={jsonLd} />
      <Typography variant="h2">FAQ</Typography>
      {query.isLoading ? <LoadingState /> : (
        <Stack spacing={2} sx={{ mt: 3 }}>
          {(query.data ?? []).map((faq) => (
            <Stack key={faq.id} spacing={0.5} sx={{ p: 2.5, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ fontWeight: 700 }}>{faq.question}</Typography>
              <Typography color="text.secondary">{faq.answer}</Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Container>
  );
}
