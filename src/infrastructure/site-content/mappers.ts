import type {
  HeaderNavigation,
  PackIncludedProduct,
  PackItem,
  ProductLotItem,
  ProductLotReservationItem,
  ProductFabricVariant,
  ProductItem,
  SiteContentDocument,
} from "@/domain/site-content";
import type {
  SeedBanner,
  SeedBrand,
  SeedPaymentMethod,
  SeedFabric,
  SeedCategory,
  SeedHeaderGroup,
  SeedHeaderGroupItem,
  SeedHeaderSection,
  SeedHeaderSearchScope,
  SeedHeroSlide,
  SeedMeta,
  SeedProduct,
  SeedUser,
} from "@/infrastructure/site-content/seed";

export type SiteMetaRow = SeedMeta;
export type SearchScopeRow = SeedHeaderSearchScope;
export type NavSectionRow = SeedHeaderSection;
export type NavGroupRow = SeedHeaderGroup;
export type NavItemRow = SeedHeaderGroupItem;
export type HeroSlideRow = SeedHeroSlide;
export type BannerRow = SeedBanner;
export type ProductRow = SeedProduct & {
  images: unknown;
  fabric_ids: unknown;
  related_product_ids: unknown;
  only_members: boolean | null;
};
export type ProductLotRow = {
  id: number;
  product_id: number;
  fixed_fabric_id: number | null;
  use_fabric_image: boolean | null;
  title: string;
  description: string;
  total_units: number;
  reserved_units: number;
  regular_unit_price: number;
  lot_unit_price: number;
  status: string;
  only_members: boolean;
  image: string | null;
  completed_at: string | null;
  completion_email_sent_at: string | null;
  admin_notified_at: string | null;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};
export type ProductLotReservationRow = {
  id: number;
  lot_id: number;
  user_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  notes: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  admin_note: string | null;
  confirmed_by_user_id: number | null;
  cancelled_by_user_id: number | null;
  lot_title_snapshot: string | null;
  product_sku_snapshot: string | null;
  product_name_snapshot: string | null;
  fabric_name_snapshot: string | null;
  lot_image_snapshot: string | null;
  user_name: string | null;
  user_email: string | null;
  product_id: number;
  fixed_fabric_id: number | null;
  fixed_fabric_name: string | null;
  product_sku: string | null;
  product_name: string | null;
  lot_title: string | null;
  lot_image: string | null;
  created_at: string | null;
  updated_at: string | null;
};
export type ProductFabricVariantRow = {
  product_id: number;
  fabric_id: number;
  image: string;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};
export type BrandRow = SeedBrand;
export type PaymentMethodRow = SeedPaymentMethod;
export type FabricRow = SeedFabric;
export type CategoryRow = SeedCategory;
export type UserRow = SeedUser;
export type PackRow = {
  id: number;
  apodo: string;
  title: string;
  description: string;
  category: string;
  public_price: number;
  image: string | null;
  active: boolean;
  featured: boolean;
  order_index: number;
  created_at: string | null;
  updated_at: string | null;
};
export type PaymentMethodRowDb = {
  id: number;
  name: string;
  logo: string | null;
  order_index: number;
  active: boolean;
  created_at: string | null;
  updated_at: string | null;
};
export type PackItemRow = {
  pack_id: number;
  product_id: number;
  quantity: number;
  order_index: number;
};

function toNumberArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item).trim()).filter(Boolean);
}

function toStringArrayFromJson(value: unknown) {
  if (Array.isArray(value)) {
    return toStringArray(value);
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return toStringArray(parsed);
      }
    } catch {
      return [];
    }
  }

  return [];
}

export function mapHeaderNavigation(
  scopesRows: SearchScopeRow[],
  sectionsRows: NavSectionRow[],
  groupsRows: NavGroupRow[],
  itemsRows: NavItemRow[],
): HeaderNavigation | undefined {
  const sections = sectionsRows.map((section) => ({
    id: section.id,
    label: section.label,
    icon: section.icon,
    href: section.href,
    groups: groupsRows
      .filter((group) => group.section_id === section.id)
      .map((group) => ({
        id: group.id,
        label: group.label,
        href: group.href,
        items: itemsRows
          .filter((item) => item.group_id === group.id)
          .map((item) => ({
            id: item.id,
            label: item.label,
            href: item.href,
          })),
      })),
  }));

  if (scopesRows.length === 0 && sections.length === 0) {
    return undefined;
  }

  return {
    searchScopes: scopesRows.map((scope) => ({
      id: scope.id,
      label: scope.label,
      href: scope.href,
    })),
    sections,
  };
}

export function mapSiteContentDocument(params: {
  metaRow?: SiteMetaRow;
  headerNavigation?: HeaderNavigation;
  heroSlides: HeroSlideRow[];
  banners: BannerRow[];
  products: ProductRow[];
  productLots?: ProductLotRow[];
  productLotReservations?: ProductLotReservationRow[];
  productFabricVariants: ProductFabricVariantRow[];
  packs?: PackRow[];
  packItems?: PackItemRow[];
  brands: BrandRow[];
  paymentMethods: PaymentMethodRowDb[];
  fabrics: FabricRow[];
  categories: CategoryRow[];
  users: UserRow[];
}): SiteContentDocument {
  const {
    metaRow,
    headerNavigation,
    heroSlides,
    banners,
    products,
    productLots = [],
    productLotReservations = [],
    productFabricVariants,
    packs = [],
    packItems = [],
    brands,
    paymentMethods,
    fabrics,
    categories,
    users,
  } = params;
  const productMap = new Map<number, ProductItem>();
  const fabricNameMap = new Map(fabrics.map((fabric) => [fabric.id, fabric.name] as const));

  const mappedProducts = products.map((product) => {
    const categoryIds = toNumberArray(product.category_ids);
    const categoryNames = toStringArray(product.category_names);
    const primaryCategoryId = categoryIds[0] ?? product.category_id;
    const primaryCategoryName = categoryNames[0] ?? product.category_name;
    const mappedVariants = productFabricVariants
      .filter((variant) => variant.product_id === product.id)
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((variant) => ({
        fabricId: variant.fabric_id,
        fabricName: fabricNameMap.get(variant.fabric_id),
        image: variant.image,
        createdAt: variant.created_at ?? undefined,
        updatedAt: variant.updated_at ?? undefined,
      })) satisfies ProductFabricVariant[];

    const mapped: ProductItem = {
      id: product.id,
      sku: product.sku,
      name: product.name,
      detail: product.detail,
      presentation: product.presentation,
      categoryId: primaryCategoryId,
      categoryName: primaryCategoryName,
      categoryIds: categoryIds.length > 0 ? categoryIds : [product.category_id],
      categoryNames: categoryNames.length > 0 ? categoryNames : [product.category_name],
      brand: product.brand,
      vegano: product.vegano,
      kosher: product.kosher,
      testeadoEnAnimales: product.testeado_en_animales ?? undefined,
      publicPrice: product.public_price,
      memberPrice: product.member_price,
      image: product.image ?? toStringArrayFromJson(product.images)[0] ?? undefined,
      images: toStringArrayFromJson(product.images).length > 0 ? toStringArrayFromJson(product.images) : product.image ? [product.image] : undefined,
      fabricIds: toNumberArray(product.fabric_ids),
      relatedProductIds: toNumberArray(product.related_product_ids),
      fabricVariants: mappedVariants,
      onlyMembers: product.only_members ?? undefined,
      status: product.status,
      featured: product.featured,
      featuredPriority: product.featured_priority ?? undefined,
      trending: product.trending ?? undefined,
      stock: product.stock ?? undefined,
      viewsCount: product.views_count ?? undefined,
      salesCount: product.sales_count ?? undefined,
      description: product.description ?? undefined,
      sourceSection: product.source_section ?? undefined,
      templateRowMap: product.template_row_map ?? undefined,
      createdAt: product.created_at ?? undefined,
      updatedAt: product.updated_at ?? undefined,
    };

    productMap.set(mapped.id, mapped);
    return mapped;
  });

  const mappedLots: ProductLotItem[] = productLots
    .filter((lot) => lot.deleted_at == null)
    .map((lot) => {
      const totalUnits = Number(lot.total_units) || 0;
      const reservedUnits = Number(lot.reserved_units) || 0;
      const availableUnits = Math.max(0, totalUnits - reservedUnits);
      const fixedFabricId = lot.fixed_fabric_id ?? null;
      const product = productMap.get(lot.product_id);
      const resolvedFabric = product?.fabricVariants?.find((variant) => variant.fabricId === fixedFabricId);
      const resolvedImage = lot.use_fabric_image ? resolvedFabric?.image ?? lot.image ?? undefined : lot.image ?? undefined;

      return {
        id: lot.id,
        productId: lot.product_id,
        productSku: product?.sku,
        productName: product?.name,
        fixedFabricId,
        fixedFabricName: resolvedFabric?.fabricName,
        useFabricImage: Boolean(lot.use_fabric_image),
        title: lot.title,
        description: lot.description,
        totalUnits,
        reservedUnits,
        availableUnits,
        regularUnitPrice: Number(lot.regular_unit_price) || 0,
        lotUnitPrice: Number(lot.lot_unit_price) || 0,
        status: lot.status,
        onlyMembers: Boolean(lot.only_members),
        image: resolvedImage,
        completedAt: lot.completed_at ?? undefined,
        completionEmailSentAt: lot.completion_email_sent_at ?? undefined,
        adminNotifiedAt: lot.admin_notified_at ?? undefined,
        createdAt: lot.created_at ?? undefined,
        updatedAt: lot.updated_at ?? undefined,
      } satisfies ProductLotItem;
    });

  const lotsByProduct = new Map<number, ProductLotItem[]>();
  const activeLotByProduct = new Map<number, ProductLotItem>();

  for (const lot of mappedLots) {
    const lots = lotsByProduct.get(lot.productId) ?? [];
    lots.push(lot);
    lotsByProduct.set(lot.productId, lots);

    const currentActive = activeLotByProduct.get(lot.productId);
    const isActiveStatus = ["open", "published", "active", "reservable"].includes(String(lot.status).toLowerCase());
    if (
      isActiveStatus &&
      lot.availableUnits > 0 &&
      (!currentActive || currentActive.availableUnits < lot.availableUnits || (currentActive.updatedAt ?? "") < (lot.updatedAt ?? ""))
    ) {
      activeLotByProduct.set(lot.productId, lot);
    }
  }

  for (const product of mappedProducts) {
    product.lotOffers = lotsByProduct.get(product.id) ?? [];
    product.activeLot = activeLotByProduct.get(product.id) ?? null;
  }

  const mappedReservations: ProductLotReservationItem[] = productLotReservations.map((reservation) => ({
    id: reservation.id,
    lotId: reservation.lot_id,
    userId: reservation.user_id,
    userName: reservation.user_name ?? undefined,
    userEmail: reservation.user_email ?? undefined,
    lotTitle: reservation.lot_title_snapshot ?? reservation.lot_title ?? undefined,
    productId: reservation.product_id,
    productSku: reservation.product_sku_snapshot ?? reservation.product_sku ?? undefined,
    productName: reservation.product_name_snapshot ?? reservation.product_name ?? undefined,
    fixedFabricId: reservation.fixed_fabric_id ?? undefined,
    fixedFabricName: reservation.fixed_fabric_name ?? reservation.fabric_name_snapshot ?? undefined,
    lotImage: reservation.lot_image_snapshot ?? reservation.lot_image ?? undefined,
    quantity: Number(reservation.quantity) || 0,
    unitPrice: Number(reservation.unit_price) || 0,
    totalPrice: Number(reservation.total_price) || 0,
    status: reservation.status,
    notes: reservation.notes ?? undefined,
    confirmedAt: reservation.confirmed_at ?? undefined,
    cancelledAt: reservation.cancelled_at ?? undefined,
    cancelReason: reservation.cancel_reason ?? undefined,
    adminNote: reservation.admin_note ?? undefined,
    confirmedByUserId: reservation.confirmed_by_user_id ?? undefined,
    cancelledByUserId: reservation.cancelled_by_user_id ?? undefined,
    createdAt: reservation.created_at ?? undefined,
    updatedAt: reservation.updated_at ?? undefined,
  }));

  const mappedPacks: PackItem[] = packs.map((pack) => {
    const itemRows = packItems
      .filter((item) => item.pack_id === pack.id)
      .sort((left, right) => left.order_index - right.order_index);

    const items: PackIncludedProduct[] = itemRows
      .map((item) => {
        const product = productMap.get(item.product_id);
        if (!product) {
          return null;
        }

        return {
          productId: item.product_id,
          quantity: item.quantity,
          product,
        };
      })
      .filter((item): item is PackIncludedProduct => Boolean(item));

    return {
      id: pack.id,
      apodo: pack.apodo,
      title: pack.title,
      description: pack.description,
      category: pack.category,
      publicPrice: pack.public_price,
      image: pack.image ?? undefined,
      active: pack.active,
      featured: pack.featured,
      order: pack.order_index,
      items,
      createdAt: pack.created_at ?? undefined,
      updatedAt: pack.updated_at ?? undefined,
    };
  });

  const mappedPaymentMethods = paymentMethods
    .slice()
    .sort((left, right) => left.order_index - right.order_index || left.id - right.id)
    .map((method) => ({
      id: method.id,
      name: method.name,
      logo: method.logo ?? undefined,
      order: method.order_index,
      active: method.active,
      createdAt: method.created_at ?? undefined,
      updatedAt: method.updated_at ?? undefined,
    }));

  return {
    sessionRole: metaRow?.session_role ?? undefined,
    viewMode: metaRow?.view_mode ?? undefined,
    activeAdminPanel: metaRow?.active_admin_panel ?? undefined,
    panelSearchQuery: metaRow?.panel_search_query ?? undefined,
    activeModalAction: metaRow?.active_modal_action ?? undefined,
    headerNavigation,
    heroSlides: heroSlides.map((slide) => ({
      id: slide.id,
      order: slide.order_index,
      title: slide.title,
      subtitle: slide.subtitle,
      badge: slide.badge,
      image: slide.image,
      imageMobile: slide.image_mobile ?? undefined,
      link: slide.link,
      active: slide.active,
      homeSpotlight: slide.home_spotlight ?? undefined,
    })),
    banners: banners.map((banner) => ({
      id: banner.id,
      text: banner.text,
      order: banner.order_index,
      active: banner.active,
    })), 
    products: mappedProducts,
    productLots: mappedLots,
    productLotReservations: mappedReservations,
    packs: mappedPacks,
    brands: brands.map((brand) => ({
      id: brand.id,
      code: brand.code,
      name: brand.name,
      image: brand.image ?? undefined,
      featured: brand.featured,
      active: brand.active ?? undefined,
    })),
    paymentMethods: mappedPaymentMethods,
    fabrics: fabrics.map((fabric) => ({
      id: fabric.id,
      name: fabric.name,
      image: fabric.image ?? undefined,
      createdAt: fabric.created_at ?? undefined,
      updatedAt: fabric.updated_at ?? undefined,
    })),
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      visible: category.visible,
      homeMenu: category.home_menu ?? undefined,
      icon: category.icon ?? undefined,
    })),
    users: users.map((user) => ({
      id: user.id,
      authUserId: user.auth_user_id ?? undefined,
      name: user.name,
      email: user.email,
      role: user.role,
      canSeePrices: user.can_see_prices,
      active: user.active,
    })),
    ping: metaRow?.ping ?? undefined,
    nextIds: (metaRow?.next_ids as SiteContentDocument["nextIds"]) ?? undefined,
  };
}
