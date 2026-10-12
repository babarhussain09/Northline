import { z } from 'zod';

const password = z.string().min(8).max(128);
const email = z.string().email().max(255);
const blocks = z.array(z.object({ title: z.string().min(1).max(160), description: z.string().min(1).max(1000) })).default([]);

export const registerSchema = z.object({
  email,
  password,
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phone: z.string().max(40).optional(),
  companyName: z.string().max(160).optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ token: z.string().min(20), password });
export const verifySchema = z.object({ token: z.string().min(20) });

export const profileSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  phone: z.string().max(40).nullable().optional(),
  companyName: z.string().max(160).nullable().optional(),
  companyWebsite: z.string().max(255).nullable().optional(),
  country: z.string().max(80).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  taxId: z.string().max(80).nullable().optional(),
});

export const cartItemSchema = z.object({
  serviceId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
});

export const cartQuantitySchema = z.object({
  quantity: z.coerce.number().int().min(1).max(99),
});

const serviceFields = {
  name: z.string().min(2).max(160),
  slug: z.string().min(2).max(80).optional(),
  shortDescription: z.string().min(2).max(300),
  description: z.string().min(2).max(20000),
  categoryId: z.string().min(1),
  billingType: z.enum(['ONE_TIME', 'RECURRING', 'PROJECT', 'CUSTOM']),
  price: z.coerce.number().min(0),
  setupFee: z.coerce.number().min(0).optional(),
  monthlyPrice: z.coerce.number().min(0).nullable().optional(),
  currency: z.string().length(3).optional(),
  features: blocks.optional(),
  benefits: blocks.optional(),
  useCases: blocks.optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  seoTitle: z.string().max(160).nullable().optional(),
  seoDescription: z.string().max(300).nullable().optional(),
};

export const serviceSchema = z.object(serviceFields);
export const serviceUpdateSchema = z.object(serviceFields).partial();

export const categorySchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(80).optional(),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
});

export const categoryUpdateSchema = categorySchema.partial();

export const reviewSchema = z.object({
  serviceId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().min(2).max(160),
  content: z.string().min(2).max(4000),
});

export const faqSchema = z.object({
  serviceId: z.string().nullable().optional(),
  question: z.string().min(2).max(300),
  answer: z.string().min(2).max(5000),
  sortOrder: z.coerce.number().int().min(0).max(1000).optional(),
  isPublished: z.boolean().optional(),
});

export const faqUpdateSchema = faqSchema.partial();

export const demoSchema = z.object({
  name: z.string().min(2).max(120),
  email,
  company: z.string().max(160).optional(),
  phone: z.string().max(40).optional(),
  serviceId: z.string().optional(),
  preferredDate: z.string().optional(),
  preferredTime: z.string().max(40).optional(),
  message: z.string().max(4000).optional(),
});

export const contactSchema = z.object({
  name: z.string().min(2).max(120),
  email,
  company: z.string().max(160).optional(),
  subject: z.string().min(2).max(160),
  message: z.string().min(2).max(5000),
});

export const projectSchema = z.object({
  clientId: z.string().min(1),
  serviceId: z.string().min(1),
  name: z.string().min(2).max(160),
  description: z.string().max(5000).optional(),
  status: z.enum(['PENDING_PAYMENT', 'PAID', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'REFUNDED']).optional(),
  startDate: z.string().nullable().optional(),
  expectedCompletionDate: z.string().nullable().optional(),
  totalAmount: z.coerce.number().min(0),
  currency: z.string().length(3).optional(),
});

export const projectUpdateSchema = z.object({
  name: z.string().min(2).max(160).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(['PENDING_PAYMENT', 'PAID', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'REFUNDED']).optional(),
  serviceId: z.string().optional(),
  clientId: z.string().optional(),
  startDate: z.string().nullable().optional(),
  expectedCompletionDate: z.string().nullable().optional(),
  actualCompletionDate: z.string().nullable().optional(),
  totalAmount: z.coerce.number().min(0).optional(),
});

export const milestoneSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']).optional(),
  dueDate: z.string().nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const noteSchema = z.object({ content: z.string().min(1).max(5000) });

export const refundSchema = z.object({
  paymentId: z.string().min(1),
  amount: z.coerce.number().positive().optional(),
  reason: z.string().max(500).optional(),
});

export const settingsSchema = z.object({
  companyName: z.string().min(2).max(120).optional(),
  supportEmail: z.string().email().optional(),
  taxRatePercent: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  defaultCurrency: z.string().length(3).optional(),
});

export const clientUpdateSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  companyName: z.string().max(160).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
});

export const publishSchema = z.object({ isPublished: z.boolean() });
export const invoiceStatusSchema = z.object({
  status: z.enum(['DRAFT', 'OPEN', 'PAID', 'VOID', 'REFUNDED']),
});
export const demoStatusSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED']),
});
export const contactStatusSchema = z.object({
  status: z.enum(['NEW', 'READ', 'RESOLVED']),
});
