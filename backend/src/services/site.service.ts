import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { pageMeta, type PaginationQuery } from '../utils/pagination';

export async function listAuditLogs(query: PaginationQuery & { action?: string; entityType?: string }) {
  const where = {
    ...(query.action ? { action: query.action as never } : {}),
    ...(query.entityType ? { entityType: query.entityType } : {}),
  };
  const [total, data] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return { data, pagination: pageMeta(query.page, query.limit, total) };
}

export async function buildSitemap() {
  const services = await prisma.service.findMany({
    where: { isPublished: true, isActive: true },
    select: { slug: true, updatedAt: true },
  });
  const staticPaths = ['/', '/services', '/about', '/faq', '/contact', '/book-demo'];
  const urls = [
    ...staticPaths.map((path) => ({ loc: `${env.FRONTEND_URL}${path}`, lastmod: new Date().toISOString() })),
    ...services.map((service) => ({
      loc: `${env.FRONTEND_URL}/services/${service.slug}`,
      lastmod: service.updatedAt.toISOString(),
    })),
  ];
  const body = urls
    .map((url) => `  <url><loc>${url.loc}</loc><lastmod>${url.lastmod}</lastmod></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function robotsTxt() {
  return `User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /admin\nDisallow: /cart\nDisallow: /checkout\nDisallow: /login\nDisallow: /register\nDisallow: /forgot-password\nDisallow: /reset-password\nDisallow: /verify-email\n\nSitemap: ${env.FRONTEND_URL}/sitemap.xml\n`;
}
