import { prisma } from '../config/prisma';
import { env } from '../config/env';

const DEFAULTS: Record<string, string> = {
  companyName: 'Northline',
  supportEmail: 'support@northline.example',
  taxRatePercent: '0',
  defaultCurrency: 'USD',
};

export async function getSettings() {
  const rows = await prisma.setting.findMany();
  const settings = { ...DEFAULTS };
  for (const row of rows) settings[row.key] = row.value;
  return settings;
}

export async function getPublicSettings() {
  const settings = await getSettings();
  return {
    companyName: settings.companyName,
    supportEmail: settings.supportEmail,
    stripePublishableKey: env.STRIPE_PUBLISHABLE_KEY,
  };
}

export async function getTaxRatePercent() {
  const settings = await getSettings();
  const rate = Number(settings.taxRatePercent);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) return 0;
  return rate;
}

export async function updateSettings(values: Record<string, string>) {
  const allowed = Object.keys(DEFAULTS);
  const current = await getSettings();
  const next: Record<string, string> = {};
  for (const key of allowed) {
    if (values[key] !== undefined) next[key] = values[key];
  }
  await prisma.$transaction(
    Object.entries(next).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      }),
    ),
  );
  return { previous: current, settings: await getSettings() };
}

export async function notifyAddress() {
  if (env.ADMIN_NOTIFY_EMAIL) return env.ADMIN_NOTIFY_EMAIL;
  const settings = await getSettings();
  return settings.supportEmail;
}
