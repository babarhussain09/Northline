import { Box, Button, Container, Grid, Stack, Typography } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '../../api/client';
import { Seo } from '../../components/Seo';
import type { Faq, PublicReview, Service } from '../../types';
import { billingLabel, priceLabel, siteUrl } from '../../utils/format';

const steps = [
  ['AI Agent', 'A specialist for one job, not a generic chatbot.'],
  ['Understand', 'It reads the request, the rules, and the context.'],
  ['Automate', 'The busywork follows a path you can inspect.'],
  ['Execute', 'The next step happens in the tools you already use.'],
  ['Report', 'You see what moved, what waited, and what needs you.'],
];

function Fade({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div initial={reduce ? false : { opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay }}>
      {children}
    </motion.div>
  );
}

function AgentFlow() {
  const reduce = useReducedMotion();
  return (
    <Box sx={{ position: 'relative', p: { xs: 2, md: 3 }, borderRadius: 4, bgcolor: '#102433', color: '#F7F4EE', minHeight: 420 }}>
      <Typography variant="overline" sx={{ color: '#99F6E4', letterSpacing: '0.16em' }}>How an agent works</Typography>
      <Stack spacing={0} sx={{ mt: 2, position: 'relative' }}>
        <Box sx={{ position: 'absolute', left: 15, top: 12, bottom: 12, width: 2, bgcolor: 'rgba(255,255,255,0.15)' }} />
        {!reduce && (
          <motion.div
            style={{ position: 'absolute', left: 11, width: 10, height: 10, borderRadius: 99, background: '#5EEAD4' }}
            animate={{ top: ['8%', '88%', '8%'] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        {steps.map(([title, caption], index) => (
          <Stack key={title} direction="row" spacing={2} sx={{ py: 1.4, position: 'relative' }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.3)', display: 'grid', placeItems: 'center', fontSize: 13, flexShrink: 0, bgcolor: '#102433' }}>{index + 1}</Box>
            <Box>
              <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(247,244,238,0.72)' }}>{caption}</Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

export function HomePage() {
  const services = useQuery({
    queryKey: ['featured-services'],
    queryFn: () => unwrap<Service[]>(api.get('/services', { params: { featured: true, limit: 6 } }).then((response) => ({ data: { data: response.data.data } }))),
  });
  const reviews = useQuery({
    queryKey: ['home-reviews'],
    queryFn: () => unwrap<PublicReview[]>(api.get('/reviews', { params: { limit: 3 } }).then((response) => ({ data: { data: response.data.data } }))),
  });
  const faqs = useQuery({
    queryKey: ['home-faqs'],
    queryFn: () => unwrap<Faq[]>(api.get('/faqs', { params: { global: true } })),
  });

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Northline',
    url: siteUrl,
    description: 'AI agents and custom automation for growing businesses.',
  };

  return (
    <>
      <Seo
        title="Build smarter. Automate faster."
        description="Power your business with AI agents and custom automation solutions built around your needs."
        path="/"
        jsonLd={organization}
      />
      <Container sx={{ pt: { xs: 6, md: 10 } }}>
        <Grid container spacing={6} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="overline" color="secondary" sx={{ letterSpacing: '0.16em' }}>AI agents and software</Typography>
            <Typography variant="h1" sx={{ fontSize: { xs: '2.7rem', md: '4.2rem' }, mt: 1 }}>
              Build Smarter.<br />Automate Faster.<br />Grow Better.
            </Typography>
            <Typography sx={{ mt: 2, fontSize: 18, color: 'text.secondary', maxWidth: 520 }}>
              Power your business with AI agents and custom automation solutions built around your needs.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
              <Button component={RouterLink} to="/services" variant="contained" size="large">Explore Services</Button>
              <Button component={RouterLink} to="/book-demo" variant="outlined" size="large">Book a Demo</Button>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}><AgentFlow /></Grid>
        </Grid>
      </Container>

      <Section id="services" eyebrow="Services" title="Work you can buy, scope, and track.">
        <Grid container spacing={2}>
          {(services.data ?? []).map((service) => (
            <Grid key={service.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <ServiceCard service={service} />
            </Grid>
          ))}
        </Grid>
        <Button component={RouterLink} to="/services" sx={{ mt: 3 }}>View all services</Button>
      </Section>

      <Section eyebrow="Featured AI agents" title="Start with an agent that already knows the job.">
        <Grid container spacing={2}>
          {(services.data ?? []).filter((service) => service.billingType === 'RECURRING' || service.isFeatured).slice(0, 3).map((service) => (
            <Grid key={service.id} size={{ xs: 12, md: 4 }}>
              <ServiceCard service={service} />
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section eyebrow="How it works" title="From conversation to a running project.">
        <Grid container spacing={2}>
          {['Choose a service', 'Check out with Stripe', 'We open a project', 'You follow the milestones'].map((item, index) => (
            <Grid key={item} size={{ xs: 12, sm: 6, md: 3 }}>
              <Fade delay={index * 0.05}>
                <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', height: '100%' }}>
                  <Typography color="secondary" sx={{ fontWeight: 800 }}>0{index + 1}</Typography>
                  <Typography sx={{ mt: 1, fontWeight: 700 }}>{item}</Typography>
                </Box>
              </Fade>
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section eyebrow="Benefits" title="Less chasing. More finished work.">
        <Grid container spacing={2}>
          {[
            ['A clear owner', 'Every purchase becomes a project with a status you can see.'],
            ['Prices from the server', 'Checkout uses the catalog price, not a number typed in the browser.'],
            ['Invoices included', 'Paid work produces an invoice you can download.'],
            ['Room to go custom', 'Fixed services and quoted projects live in the same account.'],
          ].map(([title, body]) => (
            <Grid key={title} size={{ xs: 12, md: 6 }}>
              <Box sx={{ p: 3, borderRadius: 3, bgcolor: '#102433', color: '#F7F4EE', height: '100%' }}>
                <Typography variant="h6">{title}</Typography>
                <Typography sx={{ mt: 1, color: 'rgba(247,244,238,0.75)' }}>{body}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section eyebrow="Use cases" title="Where teams put an agent to work.">
        <Grid container spacing={2}>
          {[
            ['Sales follow-up', 'Qualify inbound interest and draft the next note while the lead is warm.'],
            ['Support desks', 'Answer the repeat questions and hand off the ones that need a person.'],
            ['Operations', 'Move a request from email into the system that actually does the work.'],
            ['Custom software', 'When the workflow does not fit a product, we build the missing piece.'],
          ].map(([title, body]) => (
            <Grid key={title} size={{ xs: 12, sm: 6 }}>
              <Box sx={{ p: 3, height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Typography variant="h6">{title}</Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>{body}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section eyebrow="Why Northline" title="A studio, not a pile of tools.">
        <Typography color="text.secondary" sx={{ maxWidth: 680 }}>
          You get a published service, a price, a project, and a person who can change the scope. Agents are useful when they sit inside a real workflow. That is the work we sell.
        </Typography>
      </Section>

      <Section eyebrow="Reviews" title="From teams already running the work.">
        <Grid container spacing={2}>
          {(reviews.data ?? []).map((review) => (
            <Grid key={review.id} size={{ xs: 12, md: 4 }}>
              <Box sx={{ p: 3, height: '100%', borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                <Typography color="secondary">{'★'.repeat(review.rating)}</Typography>
                <Typography sx={{ fontWeight: 700, mt: 1 }}>{review.title}</Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>{review.content}</Typography>
                <Typography variant="body2" sx={{ mt: 2 }}>{review.author}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section eyebrow="FAQ" title="A few practical answers.">
        <Stack spacing={1.5}>
          {(faqs.data ?? []).slice(0, 5).map((faq) => (
            <Box key={faq.id} sx={{ p: 2.5, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ fontWeight: 700 }}>{faq.question}</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>{faq.answer}</Typography>
            </Box>
          ))}
        </Stack>
      </Section>

      <Container sx={{ pb: 4 }}>
        <Box sx={{ p: { xs: 3, md: 6 }, borderRadius: 4, bgcolor: '#102433', color: '#F7F4EE' }}>
          <Typography variant="h2" sx={{ color: 'inherit', fontSize: { xs: '2rem', md: '2.8rem' } }}>See it on your workflow.</Typography>
          <Typography sx={{ mt: 1, maxWidth: 560, color: 'rgba(247,244,238,0.75)' }}>Book a short demo. Tell us the process you want off your plate.</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
            <Button component={RouterLink} to="/book-demo" variant="contained" color="secondary">Book a demo</Button>
            <Button component={RouterLink} to="/contact" variant="outlined" sx={{ color: '#F7F4EE', borderColor: 'rgba(247,244,238,0.4)' }}>Contact</Button>
          </Stack>
        </Box>
      </Container>
    </>
  );
}

function Section({ id, eyebrow, title, children }: { id?: string; eyebrow: string; title: string; children: ReactNode }) {
  return (
    <Container id={id} sx={{ py: { xs: 6, md: 9 } }}>
      <Fade>
        <Typography variant="overline" color="secondary" sx={{ letterSpacing: '0.16em' }}>{eyebrow}</Typography>
        <Typography variant="h2" sx={{ mt: 1, mb: 3, maxWidth: 720 }}>{title}</Typography>
        {children}
      </Fade>
    </Container>
  );
}

export function ServiceCard({ service }: { service: Service }) {
  return (
    <Box component={RouterLink} to={`/services/${service.slug}`} sx={{ display: 'block', height: '100%', p: 2.5, textDecoration: 'none', color: 'inherit', borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="caption" color="secondary" sx={{ fontWeight: 700 }}>{billingLabel(service.billingType)}</Typography>
      <Typography variant="h6" sx={{ mt: 0.5 }}>{service.name}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, minHeight: 48 }}>{service.shortDescription}</Typography>
      <Typography sx={{ mt: 2, fontWeight: 800 }}>{priceLabel(service)}</Typography>
    </Box>
  );
}
