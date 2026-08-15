"use client";

import { ProductCard } from "@/components/site/product-card";
import type { ProductItem } from "@/domain/site-content";

function getColumnClass(columns: number) {
  if (columns <= 2) {
    return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2";
  }

  if (columns >= 4) {
    return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  }

  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
}

export function CatalogGrid({ products, columns = 3 }: { products: ProductItem[]; columns?: number }) {
  return (
    <div className={`grid gap-4 ${getColumnClass(columns)}`}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} href={`/producto/${product.sku}`} />
      ))}
    </div>
  );
}
