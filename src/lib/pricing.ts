import type { PackItem, ProductItem } from "@/domain/site-content";
export function resolveProductUnitPrice(product: Pick<ProductItem, "publicPrice" | "memberPrice">) {
  return product.publicPrice;
}

export function resolvePackUnitPrice(pack: Pick<PackItem, "publicPrice">) {
  return pack.publicPrice;
}

