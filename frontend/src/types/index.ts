export type Role = 'CLIENT' | 'ADMIN';

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  emailVerified: boolean;
  status: string;
  clientProfile?: {
    id: string;
    companyName: string | null;
    companyWebsite: string | null;
    country: string | null;
    address: string | null;
    taxId: string | null;
  } | null;
};

export type ContentBlock = { title: string; description: string };

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
};

export type Service = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  category?: Category;
  billingType: 'ONE_TIME' | 'RECURRING' | 'PROJECT' | 'CUSTOM';
  price: string;
  setupFee: string;
  monthlyPrice: string | null;
  currency: string;
  features: ContentBlock[];
  benefits: ContentBlock[];
  useCases: ContentBlock[];
  isFeatured: boolean;
  isActive: boolean;
  isPublished: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  faqs?: Faq[];
  reviews?: PublicReview[];
};

export type Faq = {
  id: string;
  serviceId: string | null;
  question: string;
  answer: string;
  sortOrder: number;
  isPublished: boolean;
  service?: { name: string; slug: string } | null;
};

export type PublicReview = {
  id: string;
  rating: number;
  title: string;
  content: string;
  isPublished?: boolean;
  createdAt: string;
  author?: string;
  service?: { name: string; slug: string };
  client?: { user: { firstName: string; lastName: string } };
};

export type Pagination = { page: number; limit: number; total: number; totalPages: number };

export type Cart = {
  id: string;
  currency: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: string;
    setupFee: string;
    lineTotal: string;
    service: { id: string; name: string; slug: string; billingType: string; currency: string; shortDescription: string };
  }>;
};

export type Order = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  currency: string;
  createdAt: string;
  items?: Array<{ id: string; name: string; quantity: number; unitPrice: string; totalPrice: string }>;
  client?: { user: { firstName: string; lastName: string; email: string } };
};

export type Project = {
  id: string;
  projectNumber: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  expectedCompletionDate: string | null;
  actualCompletionDate: string | null;
  totalAmount: string;
  currency: string;
  service?: { id: string; name: string; slug: string };
  client?: { user: { firstName: string; lastName: string; email: string } };
  milestones?: Milestone[];
  notes?: Array<{ id: string; content: string; createdAt: string; author: { firstName: string; lastName: string } }>;
  activities?: Array<{ id: string; message: string; createdAt: string }>;
  order?: { id: string; orderNumber: string; status: string; total: string; currency: string } | null;
};

export type Milestone = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  sortOrder: number;
};

export type ClientService = {
  id: string;
  status: string;
  activatedAt: string | null;
  expiresAt: string | null;
  service: { id: string; name: string; slug: string; billingType: string };
  project: { id: string; projectNumber: string; name: string; status: string } | null;
};

export type Payment = {
  id: string;
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
  order?: { id: string; orderNumber: string };
  client?: { user: { firstName: string; lastName: string; email: string } };
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  total: string;
  currency: string;
  status: string;
  order?: { orderNumber: string } | null;
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type Analytics = {
  totalRevenue: string;
  monthlyRevenue: string;
  activeClients: number;
  activeProjects: number;
  pendingPayments: number;
  servicesSold: number;
  demoRequests: number;
  revenueChart: Array<{ month: string; amount: string }>;
  ordersChart: Array<{ month: string; count: number }>;
  customerGrowth: Array<{ month: string; count: number }>;
  topServices: Array<{ name: string; count: number; revenue: string }>;
  projectStatus: Array<{ status: string; count: number }>;
};
