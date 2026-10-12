import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppShell, Guard } from './layouts/AppShell';
import { PublicLayout } from './layouts/PublicLayout';
import { theme } from './theme/theme';
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage, VerifyEmailPage } from './pages/auth/AuthPages';
import { AboutPage, ContactPage, LegalPage } from './pages/public/InfoPages';
import { BookDemoPage } from './pages/public/BookDemoPage';
import { FaqPage } from './pages/public/FaqPage';
import { HomePage } from './pages/public/HomePage';
import { ServiceDetailPage } from './pages/public/ServiceDetailPage';
import { ServicesPage } from './pages/public/ServicesPage';
import { CartPage, CheckoutResultPage, ClientServicesPage, DashboardPage, InvoicesPage, NotificationsPage, OrdersPage, PaymentsPage, ProfilePage, ProjectDetailPage, ProjectsPage } from './pages/client/ClientPages';
import { AdminCategoriesPage, AdminClientsPage, AdminHomePage, AdminInvoicesPage, AdminOrdersPage, AdminPaymentsPage, AdminProjectsPage, AdminReviewsPage, AdminServicesPage, AdminSimpleQueue } from './pages/admin/AdminPages';
import { AdminAuditPage, AdminClientDetailPage, AdminFaqsPage, AdminProjectDetailPage, AdminRefundsPage, AdminSettingsPage, ServiceFormPage } from './pages/admin/AdminForms';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 20_000 } },
});

const clientNav = [
  { to: '/dashboard', label: 'Overview' },
  { to: '/dashboard/projects', label: 'Projects' },
  { to: '/dashboard/services', label: 'Services' },
  { to: '/dashboard/orders', label: 'Orders' },
  { to: '/dashboard/payments', label: 'Payments' },
  { to: '/dashboard/invoices', label: 'Invoices' },
  { to: '/dashboard/profile', label: 'Profile' },
  { to: '/dashboard/notifications', label: 'Notifications' },
  { to: '/cart', label: 'Cart' },
];

const adminNav = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/services', label: 'Services' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/clients', label: 'Clients' },
  { to: '/admin/projects', label: 'Projects' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/payments', label: 'Payments' },
  { to: '/admin/invoices', label: 'Invoices' },
  { to: '/admin/refunds', label: 'Refunds' },
  { to: '/admin/demo-requests', label: 'Demo Requests' },
  { to: '/admin/contact-requests', label: 'Contact Requests' },
  { to: '/admin/reviews', label: 'Reviews' },
  { to: '/admin/faqs', label: 'FAQs' },
  { to: '/admin/analytics', label: 'Analytics' },
  { to: '/admin/audit-logs', label: 'Audit Logs' },
  { to: '/admin/settings', label: 'Settings' },
];

export function App() {
  return (
    <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="services" element={<ServicesPage />} />
                  <Route path="services/:slug" element={<ServiceDetailPage />} />
                  <Route path="about" element={<AboutPage />} />
                  <Route path="faq" element={<FaqPage />} />
                  <Route path="contact" element={<ContactPage />} />
                  <Route path="book-demo" element={<BookDemoPage />} />
                  <Route path="privacy" element={<LegalPage title="Privacy" body="Northline stores the account, order, and project information needed to deliver a service. We do not store card numbers. Payments are processed by Stripe. Contact the address in your invoice to ask about your data." />} />
                  <Route path="terms" element={<LegalPage title="Terms" body="Buying a service creates an order. Work begins after Stripe confirms payment. Project timelines are estimates until a milestone plan is agreed. Custom quotes are valid only when a price is published on the service or written into a project." />} />
                  <Route path="login" element={<LoginPage />} />
                  <Route path="register" element={<RegisterPage />} />
                  <Route path="forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="reset-password" element={<ResetPasswordPage />} />
                  <Route path="verify-email" element={<VerifyEmailPage />} />
                </Route>
                <Route element={<Guard allow="CLIENT"><AppShell title="Northline" items={clientNav} /></Guard>}>
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="dashboard/projects" element={<ProjectsPage />} />
                  <Route path="dashboard/projects/:id" element={<ProjectDetailPage />} />
                  <Route path="dashboard/services" element={<ClientServicesPage />} />
                  <Route path="dashboard/orders" element={<OrdersPage />} />
                  <Route path="dashboard/payments" element={<PaymentsPage />} />
                  <Route path="dashboard/invoices" element={<InvoicesPage />} />
                  <Route path="dashboard/profile" element={<ProfilePage />} />
                  <Route path="dashboard/notifications" element={<NotificationsPage />} />
                  <Route path="cart" element={<CartPage />} />
                  <Route path="checkout/success" element={<CheckoutResultPage status="success" />} />
                  <Route path="checkout/cancel" element={<CheckoutResultPage status="cancel" />} />
                </Route>
                <Route element={<Guard allow="ADMIN"><AppShell title="Admin" items={adminNav} /></Guard>}>
                  <Route path="admin" element={<AdminHomePage />} />
                  <Route path="admin/analytics" element={<AdminHomePage />} />
                  <Route path="admin/services" element={<AdminServicesPage />} />
                  <Route path="admin/services/new" element={<ServiceFormPage />} />
                  <Route path="admin/services/:id" element={<ServiceFormPage />} />
                  <Route path="admin/categories" element={<AdminCategoriesPage />} />
                  <Route path="admin/clients" element={<AdminClientsPage />} />
                  <Route path="admin/clients/:id" element={<AdminClientDetailPage />} />
                  <Route path="admin/projects" element={<AdminProjectsPage />} />
                  <Route path="admin/projects/new" element={<AdminProjectDetailPage />} />
                  <Route path="admin/projects/:id" element={<AdminProjectDetailPage />} />
                  <Route path="admin/orders" element={<AdminOrdersPage />} />
                  <Route path="admin/payments" element={<AdminPaymentsPage />} />
                  <Route path="admin/invoices" element={<AdminInvoicesPage />} />
                  <Route path="admin/refunds" element={<AdminRefundsPage />} />
                  <Route path="admin/demo-requests" element={<AdminSimpleQueue title="Demo requests" path="/admin/demo-requests" statuses={['NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED']} />} />
                  <Route path="admin/contact-requests" element={<AdminSimpleQueue title="Contact requests" path="/admin/contact-requests" statuses={['NEW', 'READ', 'RESOLVED']} />} />
                  <Route path="admin/reviews" element={<AdminReviewsPage />} />
                  <Route path="admin/faqs" element={<AdminFaqsPage />} />
                  <Route path="admin/audit-logs" element={<AdminAuditPage />} />
                  <Route path="admin/settings" element={<AdminSettingsPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
  );
}
