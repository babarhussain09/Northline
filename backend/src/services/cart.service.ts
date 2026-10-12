import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { applyTax, assertPurchasable, priceService, sumMoney } from '../utils/pricing';
import { getTaxRatePercent } from './settings.service';

async function getOrCreateCart(clientId: string) {
  return prisma.cart.upsert({
    where: { clientId },
    create: { clientId },
    update: {},
    include: {
      items: {
        include: { service: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

export async function presentCart(clientId: string) {
  const cart = await getOrCreateCart(clientId);
  const taxRate = await getTaxRatePercent();
  const items = cart.items.map((item) => {
    const priced = priceService(item.service, item.quantity);
    return {
      id: item.id,
      quantity: item.quantity,
      service: {
        id: item.service.id,
        name: item.service.name,
        slug: item.service.slug,
        billingType: item.service.billingType,
        currency: item.service.currency,
        shortDescription: item.service.shortDescription,
      },
      unitPrice: priced.unitPrice,
      setupFee: priced.setupFee,
      lineTotal: priced.lineTotal,
    };
  });
  const currency = items[0]?.service.currency ?? 'USD';
  const subtotal = sumMoney(items.map((item) => item.lineTotal));
  const totals = applyTax(subtotal, taxRate, 0);
  return {
    id: cart.id,
    currency,
    items,
    ...totals,
  };
}

export async function addCartItem(clientId: string, serviceId: string, quantity = 1) {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) throw new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found');
  const problem = assertPurchasable(service);
  if (problem) throw new AppError(400, 'SERVICE_NOT_PURCHASABLE', problem);

  const cart = await getOrCreateCart(clientId);
  if (cart.items.length > 0 && cart.items[0].service.currency !== service.currency) {
    throw new AppError(400, 'CURRENCY_MISMATCH', 'Your cart already contains a service in a different currency.');
  }

  await prisma.cartItem.upsert({
    where: { cartId_serviceId: { cartId: cart.id, serviceId } },
    create: { cartId: cart.id, serviceId, quantity },
    update: { quantity },
  });
  return presentCart(clientId);
}

export async function updateCartItem(clientId: string, itemId: string, quantity: number) {
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cart: { clientId } } });
  if (!item) throw new AppError(404, 'CART_ITEM_NOT_FOUND', 'Cart item not found');
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
  return presentCart(clientId);
}

export async function removeCartItem(clientId: string, itemId: string) {
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cart: { clientId } } });
  if (!item) throw new AppError(404, 'CART_ITEM_NOT_FOUND', 'Cart item not found');
  await prisma.cartItem.delete({ where: { id: item.id } });
  return presentCart(clientId);
}

export async function clearCart(clientId: string) {
  const cart = await prisma.cart.findUnique({ where: { clientId } });
  if (cart) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }
  return presentCart(clientId);
}
