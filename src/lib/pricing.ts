import type { ViewerSession } from "@/domain/viewer";
import type { PackItem, ProductItem } from "@/domain/site-content";

type PricingViewer = Pick<ViewerSession, "authenticated" | "canSeePrices"> | null | undefined;

function canUseMemberPrice(viewer: PricingViewer) {
  return Boolean(viewer?.authenticated && viewer.canSeePrices);
}

export function resolveProductUnitPrice(product: Pick<ProductItem, "publicPrice" | "memberPrice">, viewer?: PricingViewer) {
  if (canUseMemberPrice(viewer) && Number.isFinite(product.memberPrice) && product.memberPrice > 0) {
    return product.memberPrice;
  }

  return product.publicPrice;
}

export function resolvePackUnitPrice(pack: Pick<PackItem, "publicPrice">) {
  return pack.publicPrice;
}

