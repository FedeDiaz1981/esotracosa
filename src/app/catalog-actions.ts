"use server";

import { revalidatePath } from "next/cache";
import { ensureSiteContentSchema } from "@/infrastructure/db/ensure-site-content-schema";

async function ensureDatabase() {
  await ensureSiteContentSchema();
}

async function updateProductCounter(productId: number, column: "views_count" | "sales_count") {
  await ensureDatabase();

  await postgresPool!.query(
    `
      update products
      set ${column} = coalesce(${column}, 0) + 1,
          updated_at = now()
      where id = $1
    `,
    [productId],
  );
}

export async function recordProductView(productId: number) {
  await updateProductCounter(productId, "views_count");
  revalidatePath("/");
  revalidatePath("/galeria");
  revalidatePath("/producto/[sku]", "page");
}

export async function recordProductSale(productId: number) {
  await updateProductCounter(productId, "sales_count");
  revalidatePath("/");
  revalidatePath("/galeria");
  revalidatePath("/producto/[sku]", "page");
}
