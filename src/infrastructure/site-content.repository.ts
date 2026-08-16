import { cache } from "react";
import type { PoolClient, QueryResultRow } from "pg";
import type { SiteContentDocument } from "@/domain/site-content";
import { postgresPool } from "@/infrastructure/db/postgres";
import { ensureSiteContentSchema } from "@/infrastructure/db/ensure-site-content-schema";
import {
  mapHeaderNavigation,
  mapSiteContentDocument,
  type BannerRow,
  type BrandRow,
  type FabricRow,
  type CategoryRow,
  type PackItemRow,
  type PackRow,
  type HeroSlideRow,
  type ProductFabricVariantRow,
  type NavGroupRow,
  type NavItemRow,
  type NavSectionRow,
  type ProductRow,
  type SearchScopeRow,
  type SiteMetaRow,
  type UserRow,
} from "@/infrastructure/site-content/mappers";

const ensureSchema = cache(async () => {
  await ensureSiteContentSchema();
});

async function readRows<T extends QueryResultRow>(client: PoolClient, sql: string) {
  const result = await client.query<T>(sql);
  return result.rows;
}

export async function getSiteContent(): Promise<SiteContentDocument> {
  if (!postgresPool) {
    throw new Error("DATABASE_URL no está configurada.");
  }

  await ensureSchema();

  const client = await postgresPool.connect();

  try {
    const metaRows = await readRows<SiteMetaRow>(
      client,
      "select session_role, view_mode, active_admin_panel, panel_search_query, active_modal_action, ping, next_ids from site_content_meta where id = 1 limit 1",
    );
    const scopesRows = await readRows<SearchScopeRow>(
      client,
      "select id, label, href, sort_order from header_search_scopes order by sort_order, id",
    );
    const sectionsRows = await readRows<NavSectionRow>(
      client,
      "select id, label, icon, href, sort_order from header_sections order by sort_order, id",
    );
    const groupsRows = await readRows<NavGroupRow>(
      client,
      "select id, section_id, label, href, sort_order from header_groups order by sort_order, id",
    );
    const itemsRows = await readRows<NavItemRow>(
      client,
      "select id, group_id, label, href, sort_order from header_group_items order by sort_order, id",
    );
    const heroSlidesRows = await readRows<HeroSlideRow>(
      client,
      "select id, order_index, title, subtitle, badge, image, image_mobile, link, active, home_spotlight from hero_slides order by order_index, id",
    );
    const bannerRows = await readRows<BannerRow>(
      client,
      "select id, text, order_index, active from banners order by order_index, id",
    );
    const productRows = await readRows<ProductRow>(
      client,
      "select id, sku, name, detail, presentation, category_id, category_name, category_ids, category_names, brand, vegano, kosher, testeado_en_animales, public_price, member_price, image, images, fabric_ids, related_product_ids, only_members, status, featured, featured_priority, trending, stock, views_count, sales_count, description, source_section, template_row_map, created_at, updated_at from products where deleted_at is null order by id",
    );
    const productFabricVariantRows = await readRows<ProductFabricVariantRow>(
      client,
      "select product_id, fabric_id, image, sort_order, created_at, updated_at from product_fabric_variants order by product_id, sort_order, fabric_id",
    );
    const packRows = await readRows<PackRow>(
      client,
      "select id, apodo, title, description, category, public_price, image, active, featured, order_index, created_at, updated_at from promotion_packs order by order_index, id",
    );
    const packItemRows = await readRows<PackItemRow>(
      client,
      "select pack_id, product_id, quantity, order_index from promotion_pack_items order by order_index, pack_id, product_id",
    );
    const brandRows = await readRows<BrandRow>(
      client,
      "select id, code, name, image, featured, active from brands order by featured desc, name",
    );
    const fabricRows = await readRows<FabricRow>(
      client,
      "select id, name, image, created_at, updated_at from fabrics order by id",
    );
    const categoryRows = await readRows<CategoryRow>(
      client,
      "select id, name, slug, visible, home_menu, icon from categories where deleted_at is null order by id",
    );
    const userRows = await readRows<UserRow>(
      client,
      "select id, auth_user_id, name, email, role, can_see_prices, active from users order by id",
    );

    const headerNavigation = mapHeaderNavigation(scopesRows, sectionsRows, groupsRows, itemsRows);

    return mapSiteContentDocument({
      metaRow: metaRows[0],
      headerNavigation,
      heroSlides: heroSlidesRows,
      banners: bannerRows,
      products: productRows,
      productFabricVariants: productFabricVariantRows,
      packs: packRows,
      packItems: packItemRows,
      brands: brandRows,
      fabrics: fabricRows,
      categories: categoryRows,
      users: userRows,
    });
  } finally {
    client.release();
  }
}
