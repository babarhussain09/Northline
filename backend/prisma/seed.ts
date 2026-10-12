import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient, type BillingType } from '@prisma/client';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

const blocks = (items: Array<[string, string]>) => items.map(([title, description]) => ({ title, description }));

const categories = [
  { name: 'AI Agents', slug: 'ai-agents', description: 'Agents that take a defined job from request to result.' },
  { name: 'Automation', slug: 'automation', description: 'Workflows that move work between the tools you already use.' },
  { name: 'Software Services', slug: 'software-services', description: 'Integrations and custom software around your operation.' },
];

const services: Array<{
  name: string;
  slug: string;
  category: string;
  billingType: BillingType;
  price: number;
  setupFee: number;
  monthlyPrice: number | null;
  featured: boolean;
  shortDescription: string;
  description: string;
  features: Array<[string, string]>;
  benefits: Array<[string, string]>;
  useCases: Array<[string, string]>;
  faqs: Array<[string, string]>;
}> = [
  {
    name: 'AI Sales Agent',
    slug: 'ai-sales-agent',
    category: 'ai-agents',
    billingType: 'RECURRING',
    price: 0,
    setupFee: 500,
    monthlyPrice: 900,
    featured: true,
    shortDescription: 'Follows new leads, drafts the next note, and keeps the pipeline from going quiet.',
    description: 'The sales agent watches new inquiries, summarizes what the buyer asked for, and prepares a follow-up your team can send or approve. It is built around your offer, not a generic script.',
    features: [['Lead summary', 'Turns an inquiry into the need, the timeline, and the open question.'], ['Follow-up draft', 'Writes the next email in your voice.'], ['Handoff', 'Flags deals that need a person.']],
    benefits: [['Faster first response', 'New interest does not wait for someone to notice it.'], ['Cleaner pipeline', 'Every lead has a next step.']],
    useCases: [['Inbound demo requests', 'Qualify the request before it hits the calendar.'], ['Stalled proposals', 'Draft a check-in when a deal goes quiet.']],
    faqs: [['Is this a fully autonomous closer?', 'No. It prepares and routes the work. Your team approves anything customer-facing until you decide otherwise.'], ['What does the monthly fee cover?', 'The running agent, monitoring, and small adjustments to the prompts and routing.']],
  },
  {
    name: 'AI Customer Support Agent',
    slug: 'ai-customer-support',
    category: 'ai-agents',
    billingType: 'RECURRING',
    price: 0,
    setupFee: 500,
    monthlyPrice: 800,
    featured: true,
    shortDescription: 'Answers the questions you already answer every week and escalates the rest.',
    description: 'The support agent uses your help content and recent tickets to answer repeat questions. Anything uncertain is handed to a person with the context attached.',
    features: [['Grounded answers', 'Replies from your documents, not from guesswork.'], ['Escalation', 'Passes along tickets that need a person.'], ['Tone', 'Matches the way your team already writes.']],
    benefits: [['Shorter queue', 'Repeat questions stop consuming the day.'], ['Consistent answers', 'Customers get the same policy every time.']],
    useCases: [['Order status', 'Answer where-is-my-order without a ticket hop.'], ['Policy questions', 'Explain returns, billing, and access rules.']],
    faqs: [['Can it issue refunds?', 'Only if you explicitly connect that action. By default it explains the policy and escalates.'], ['How do we correct a bad answer?', 'Send the correction and we update the source material.']],
  },
  {
    name: 'AI Workflow Automation',
    slug: 'workflow-automation',
    category: 'automation',
    billingType: 'PROJECT',
    price: 4500,
    setupFee: 0,
    monthlyPrice: null,
    featured: true,
    shortDescription: 'A scoped automation that moves one painful process out of inboxes and spreadsheets.',
    description: 'We pick one workflow, map the steps, and connect the systems that already hold the work. You get a project with milestones instead of an open-ended retainer.',
    features: [['Process map', 'The current path, written down before anything is built.'], ['System connection', 'The handoff between the tools you named.'], ['Exception path', 'A place for the cases the automation should not touch.']],
    benefits: [['One finished workflow', 'The project ends when that path runs.'], ['Visible progress', 'Milestones show what is done and what is waiting.']],
    useCases: [['Intake forms', 'Turn a request into a task in the system that does the work.'], ['Internal approvals', 'Route a request to the right person and record the decision.']],
    faqs: [['What is included in the project price?', 'Discovery, the build, a review, and handover for the workflow we scoped.'], ['Can this become a monthly agent later?', 'Yes. We can split the running cost into a recurring service after the project.']],
  },
  {
    name: 'Custom AI Agent',
    slug: 'custom-ai-agent',
    category: 'ai-agents',
    billingType: 'CUSTOM',
    price: 0,
    setupFee: 0,
    monthlyPrice: null,
    featured: false,
    shortDescription: 'An agent designed around a job your current tools do not cover.',
    description: 'Use this when the work is specific to your business. We scope it on a demo, then publish a price on the project before you pay. A zero price cannot be checked out.',
    features: [['Scoped job', 'One responsibility, written down.'], ['Your data', 'The documents and systems the agent is allowed to use.'], ['Human review', 'A point where a person still decides.']],
    benefits: [['Fits the work', 'You are not bending the process to a template.'], ['Quoted before payment', 'Checkout stays closed until a price is set.']],
    useCases: [['Specialist research', 'Gather the same briefing your team rebuilds by hand.'], ['Operations assistant', 'Watch a queue and prepare the next action.']],
    faqs: [['Why is there no price?', 'Custom work is quoted. Book a demo and we will turn the scope into a project price.'], ['Can I add this to the cart?', 'Not until an admin sets a price.']],
  },
  {
    name: 'API Integration',
    slug: 'api-integration',
    category: 'software-services',
    billingType: 'ONE_TIME',
    price: 2800,
    setupFee: 0,
    monthlyPrice: null,
    featured: false,
    shortDescription: 'Connect two systems so a record created in one shows up in the other.',
    description: 'A fixed integration project: authentication, the field mapping, error handling, and a short handover. Useful when the gap is a missing connection rather than a new product.',
    features: [['Field map', 'What moves, and what stays put.'], ['Failure handling', 'Retries and a visible error when a sync stops.'], ['Handover notes', 'How to tell that the connection is healthy.']],
    benefits: [['No more retyping', 'The record is created once.'], ['A finished scope', 'One connection, delivered as a project.']],
    useCases: [['CRM and billing', 'Create the customer in both places.'], ['Form and task tracker', 'A submission becomes a ticket.']],
    faqs: [['Do you build the whole product?', 'This service is the connection. A larger product is Custom Software Development.'], ['Who owns the code?', 'You do, once the invoice is paid.']],
  },
  {
    name: 'Custom Software Development',
    slug: 'custom-software-development',
    category: 'software-services',
    billingType: 'PROJECT',
    price: 12000,
    setupFee: 0,
    monthlyPrice: null,
    featured: true,
    shortDescription: 'A small product or internal tool, scoped, built, and handed over.',
    description: 'For the workflow that needs its own interface. We define the first version, build it, and leave you with something the team can actually use.',
    features: [['First version', 'The smallest release that removes the manual step.'], ['Admin path', 'A way for your team to correct the data.'], ['Handover', 'Access, a short guide, and the known limits.']],
    benefits: [['Built for the team using it', 'The screen matches the job.'], ['Project status you can see', 'Milestones stay in your account.']],
    useCases: [['Internal portal', 'Replace the spreadsheet that runs the week.'], ['Client delivery tool', 'Give customers one place to see progress.']],
    faqs: [['Is the price the full product?', 'It is the starting project. A larger scope is written as a change before more work is billed.'], ['How long does it take?', 'The project opens with an expected completion date, usually a few weeks for this starting scope.']],
  },
];

const globalFaqs: Array<[string, string]> = [
  ['When does work start?', 'After Stripe confirms the payment. Returning from checkout is not enough.'],
  ['Can I buy more than one service?', 'Yes. Add them to the cart. Recurring and one-time services can be checked out together.'],
  ['Where are invoices?', 'In your account, as a PDF, after the payment is confirmed.'],
  ['Who can see my projects?', 'You can see your own. Admins can see every client. Another client cannot.'],
  ['How do refunds work?', 'An admin sends the refund through Stripe. The order, project, and service update when Stripe confirms it.'],
];

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW_PRODUCTION !== 'true') {
    throw new Error('Refusing to seed production. Set SEED_ALLOW_PRODUCTION=true to override.');
  }
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD before seeding.');
  }

  const categoryIds = new Map<string, string>();
  for (const category of categories) {
    const saved = await prisma.serviceCategory.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description, isActive: true },
      create: category,
    });
    categoryIds.set(category.slug, saved.id);
  }

  for (const service of services) {
    const saved = await prisma.service.upsert({
      where: { slug: service.slug },
      update: {
        name: service.name,
        shortDescription: service.shortDescription,
        description: service.description,
        billingType: service.billingType,
        price: service.price,
        setupFee: service.setupFee,
        monthlyPrice: service.monthlyPrice,
        isFeatured: service.featured,
        isPublished: true,
        isActive: true,
        features: blocks(service.features),
        benefits: blocks(service.benefits),
        useCases: blocks(service.useCases),
        seoTitle: service.name,
        seoDescription: service.shortDescription,
      },
      create: {
        name: service.name,
        slug: service.slug,
        shortDescription: service.shortDescription,
        description: service.description,
        categoryId: categoryIds.get(service.category)!,
        billingType: service.billingType,
        price: service.price,
        setupFee: service.setupFee,
        monthlyPrice: service.monthlyPrice,
        isFeatured: service.featured,
        isPublished: true,
        isActive: true,
        features: blocks(service.features),
        benefits: blocks(service.benefits),
        useCases: blocks(service.useCases),
        seoTitle: service.name,
        seoDescription: service.shortDescription,
      },
    });
    await prisma.faq.deleteMany({ where: { serviceId: saved.id } });
    await prisma.faq.createMany({
      data: service.faqs.map(([question, answer], index) => ({ serviceId: saved.id, question, answer, sortOrder: index, isPublished: true })),
    });
  }

  const existingGlobal = await prisma.faq.count({ where: { serviceId: null } });
  if (existingGlobal === 0) {
    await prisma.faq.createMany({
      data: globalFaqs.map(([question, answer], index) => ({ question, answer, sortOrder: index, isPublished: true })),
    });
  }

  await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: { role: 'ADMIN', status: 'ACTIVE', emailVerified: true, passwordHash: await hashPassword(adminPassword) },
    create: {
      email: adminEmail.toLowerCase(),
      passwordHash: await hashPassword(adminPassword),
      firstName: 'Northline',
      lastName: 'Admin',
      role: 'ADMIN',
      emailVerified: true,
      status: 'ACTIVE',
    },
  });

  const demoEmail = process.env.SEED_DEMO_CLIENT_EMAIL;
  const demoPassword = process.env.SEED_DEMO_CLIENT_PASSWORD;
  if (demoEmail && demoPassword) {
    const demo = await prisma.user.upsert({
      where: { email: demoEmail.toLowerCase() },
      update: { passwordHash: await hashPassword(demoPassword), emailVerified: true, status: 'ACTIVE' },
      create: {
        email: demoEmail.toLowerCase(),
        passwordHash: await hashPassword(demoPassword),
        firstName: 'Amina',
        lastName: 'Rahman',
        role: 'CLIENT',
        emailVerified: true,
        status: 'ACTIVE',
        clientProfile: { create: { companyName: 'Harbor & Co.' } },
      },
      include: { clientProfile: true },
    });
    const profile = demo.clientProfile ?? (await prisma.clientProfile.create({ data: { userId: demo.id, companyName: 'Harbor & Co.' } }));
    const sales = await prisma.service.findUnique({ where: { slug: 'ai-sales-agent' } });
    const support = await prisma.service.findUnique({ where: { slug: 'ai-customer-support' } });
    const already = await prisma.review.count({ where: { clientId: profile.id } });
    if (sales && support && already === 0) {
      await prisma.review.createMany({
        data: [
          { clientId: profile.id, serviceId: sales.id, rating: 5, title: 'The follow-up actually goes out', content: 'New leads used to sit until Friday. The agent drafts the note the same day, and we still approve it.', isPublished: true },
          { clientId: profile.id, serviceId: support.id, rating: 5, title: 'The repeat tickets dropped', content: 'Shipping and billing questions are answered from our own docs. The odd cases still come to us with the context attached.', isPublished: true },
          { clientId: profile.id, serviceId: sales.id, rating: 4, title: 'Clear enough to trust', content: 'We started with one queue. The project milestones made it obvious what was live and what was still being tuned.', isPublished: true },
        ],
      });
    }
  }

  await prisma.setting.upsert({ where: { key: 'companyName' }, update: {}, create: { key: 'companyName', value: 'Northline' } });
  await prisma.setting.upsert({ where: { key: 'supportEmail' }, update: {}, create: { key: 'supportEmail', value: adminEmail } });
  await prisma.setting.upsert({ where: { key: 'taxRatePercent' }, update: {}, create: { key: 'taxRatePercent', value: '0' } });
  await prisma.setting.upsert({ where: { key: 'defaultCurrency' }, update: {}, create: { key: 'defaultCurrency', value: 'USD' } });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
