import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { recordProductView } from "@/app/catalog-actions";
import { CatalogGrid } from "@/components/site/catalog-grid";
import { ProductFabricGallery } from "@/components/site/product-fabric-gallery";
import { ProductImageCarousel } from "@/components/site/product-image-carousel";
import { getCurrentViewer } from "@/infrastructure/auth/pintofruta-auth";
import { getSiteContent } from "@/infrastructure/site-content.repository";
import { formatCurrency, publicAsset } from "@/lib/catalog";
import { normalizeReturnTo } from "@/lib/navigation";
import { LotReservationPanel } from "@/components/site/lot-reservation-panel";

function isVisibleProduct(
  product: {
    status: string;
    onlyMembers?: boolean;
  },
  authenticated: boolean,
) {
  return product.status === "published" && (!product.onlyMembers || authenticated);
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-4xl text-center">
      {eyebrow ? (
        <p className="text-[10px] font-black uppercase tracking-[0.45em] text-[var(--pf-secondary-dark)]">{eyebrow}</p>
      ) : null}
      <h2 className="mt-4 font-serif text-[clamp(1.8rem,3vw,3rem)] leading-tight tracking-[-0.03em] text-[var(--pf-text)]">
        {title}
      </h2>
      {description ? <p className="mt-4 text-sm leading-7 text-[var(--pf-muted)]">{description}</p> : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[170px_1fr] gap-4 border-b border-[rgba(0,0,0,0.08)] py-4 text-sm last:border-b-0">
      <div className="text-[10px] font-black uppercase tracking-[0.34em] text-[var(--pf-muted)]">{label}</div>
      <div className="text-[0.98rem] text-[var(--pf-text)]">{value}</div>
    </div>
  );
}

export default async function CollectivePurchaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { id } = await params;
  const { returnTo: returnToParam } = await searchParams;
  const viewer = await getCurrentViewer();
  const authenticated = Boolean(viewer?.authenticated);
  const content = await getSiteContent();
  const lotId = Number(id);
  const lot = Number.isFinite(lotId) && lotId > 0 ? content.productLots?.find((item) => item.id === lotId) ?? null : null;

  if (!lot) {
    notFound();
  }

  const product =
    content.products.find(
      (item) => lot.productSku && item.sku.toLowerCase() === lot.productSku.toLowerCase() && isVisibleProduct(item, authenticated),
    ) ??
    content.products.find((item) => item.id === lot.productId && isVisibleProduct(item, authenticated)) ??
    null;

  if (!product) {
    notFound();
  }

  const returnTo = normalizeReturnTo(returnToParam, "/");
  const currentReturnTo = `/compra-colectiva/${lot.id}`;
  const relatedProducts = content.products
    .filter((item) => item.id !== product.id && isVisibleProduct(item, authenticated))
    .filter((item) => {
      const relatedById = (product.relatedProductIds ?? []).includes(item.id);
      const relatedByCategory = item.categoryId === product.categoryId || item.categoryNames?.includes(product.categoryName);
      const relatedByBrand = item.brand === product.brand;
      return relatedById || relatedByCategory || relatedByBrand;
    })
    .sort((left, right) => {
      const leftScore = (product.relatedProductIds ?? []).includes(left.id) ? 2 : 0;
      const rightScore = (product.relatedProductIds ?? []).includes(right.id) ? 2 : 0;
      return rightScore - leftScore || left.name.localeCompare(right.name, "es", { sensitivity: "base" });
    })
    .slice(0, 6);

  await recordProductView(product.id).catch(() => undefined);

  const imageList = product.images?.length ? product.images : product.image ? [product.image] : [];
  const heroImages = imageList.length > 0 ? imageList : [product.image ?? ""];
  const heroPrice = lot.lotUnitPrice;
  const fabricCount = product.fabricVariants?.length ?? product.fabricIds?.length ?? 0;
  const heroHint = `Cantidad disponible: ${lot.availableUnits} unidades`;
  const fixedMeasure = product.measures?.find((measure) => measure.id === lot.fixedMeasureId) ?? null;
  const fixedMeasureDimensions = fixedMeasure
    ? [fixedMeasure.width, fixedMeasure.depth, fixedMeasure.height].every((value) => value != null)
      ? `${fixedMeasure.width} x ${fixedMeasure.depth} x ${fixedMeasure.height} ${fixedMeasure.unit ?? "cm"}`
      : "Medida definida para este lote"
    : "Sin medida fijada";

  return (
    <main className="bg-[#fbf8f2] text-[var(--pf-text)]">
      <div className="mx-auto flex w-full max-w-[1220px] flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="flex items-center pb-4 text-[11px] font-black uppercase tracking-[0.35em] text-[var(--pf-muted)]">
          <Link href={returnTo} className="transition hover:text-[var(--pf-primary-darker)]">
            Volver
          </Link>
        </div>

        <section className="border-b border-[rgba(0,0,0,0.08)] px-2 py-12 text-center sm:px-6 lg:py-14">
          <p className="text-[11px] font-black uppercase tracking-[0.5em] text-[var(--pf-secondary-dark)]">Compra colectiva</p>
          <p className="mt-4 text-[0.8rem] font-medium uppercase tracking-[0.38em] text-[var(--pf-muted)]">
            {product.categoryName}
          </p>
          <h1 className="mt-6 font-serif text-[clamp(3rem,8vw,7rem)] leading-[0.9] tracking-[-0.06em] text-[var(--pf-text)]">
            {product.name}
          </h1>
          <p className="mt-4 text-[0.8rem] font-medium uppercase tracking-[0.32em] text-[var(--pf-muted)]">{lot.title}</p>
          <div className="mx-auto mt-8 max-w-[34rem] bg-[#111111] px-6 py-5 text-white sm:px-10">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">Precio por unidad</p>
            <p className="mt-2 font-serif text-[clamp(2.4rem,5vw,4rem)] leading-none">{formatCurrency(heroPrice)}</p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.28em] text-white/60">{heroHint}</p>
          </div>
          <LotReservationPanel lot={lot} />
        </section>

        <section className="border-y border-[rgba(0,0,0,0.08)] py-12">
          <ProductFabricGallery product={product} fixedFabricId={lot.fixedFabricId ?? null} />
        </section>
        <LotReservationPanel lot={lot} />

        <ProductImageCarousel
          images={heroImages}
          alt={product.name}
        />
        <LotReservationPanel lot={lot} />

        <section className="border-b border-[rgba(0,0,0,0.08)] py-12">
          <SectionTitle
            title="Elegí tu medida"
          />
          <div className="mx-auto mt-10 max-w-2xl rounded-[1.5rem] border border-[rgba(200,154,21,0.3)] bg-[linear-gradient(180deg,rgba(246,226,167,0.5),rgba(255,250,240,0.95))] p-6 text-center shadow-[0_14px_28px_rgba(200,154,21,0.1)]">
            <p className="text-[10px] font-black uppercase tracking-[0.38em] text-[var(--pf-muted)]">Medida fijada en el lote</p>
            <p className="mt-3 text-xl font-black text-[var(--pf-text)]">{lot.fixedMeasureLabel ?? "Sin medida fijada"}</p>
            <p className="mt-2 text-sm text-[var(--pf-muted)]">{fixedMeasureDimensions}</p>
          </div>
          <LotReservationPanel lot={lot} />
        </section>

        <section className="border-b border-[rgba(0,0,0,0.08)] py-12">
          <SectionTitle
            title="Sistema de apertura"
            description="Dibujos de ejemplo meramente ilustrativos."
          />

          <div className="mt-10 flex justify-center">
            <div className="relative w-full max-w-5xl overflow-hidden bg-transparent px-6 py-8 sm:px-10 sm:py-12">
              <Image
                src={publicAsset("/assets/images/medidas/02.svg")}
                alt="Sistema de apertura"
                width={1200}
                height={900}
                className="h-auto w-full object-contain"
                priority={false}
              />
            </div>
          </div>
          <LotReservationPanel lot={lot} />
        </section>

        <section className="border-y border-[rgba(0,0,0,0.08)] py-12">
          <SectionTitle
            title="Información general"
          />

          <div className="mx-auto mt-10 max-w-4xl border-t border-[rgba(0,0,0,0.08)]">
            <DetailRow label="Garantia" value="Consultanos la cobertura segun la linea y el tapizado." />
            <DetailRow label="Financiacion" value="Tenemos opciones para compras de monto alto." />
            <DetailRow label="Envios" value="Coordinamos entrega y retiro segun la zona." />
            <DetailRow label="Cantidad disponible" value={`${lot.availableUnits} unidades`} />
            <DetailRow label="Medida" value={lot.fixedMeasureLabel ?? "No especificada"} />
          </div>
          <LotReservationPanel lot={lot} />
        </section>

        <section className="py-12">
          <SectionTitle
            title="Características generales"
          />

          <div className="mt-10 max-w-4xl border-t border-[rgba(0,0,0,0.08)]">
            {[
              ["Marca", product.brand],
              ["Categoria", product.categoryName],
              ["Precio por unidad", formatCurrency(heroPrice)],
              ["Cantidad disponible", `${lot.availableUnits} unidades`],
              ["Telas", `${fabricCount} variantes`],
              ["Solo miembros", product.onlyMembers ? "Si" : "No"],
            ].map(([label, value]) => (
              <DetailRow key={label} label={label} value={value} />
            ))}
          </div>
          <LotReservationPanel lot={lot} />
        </section>

        <section className="border-t border-[rgba(0,0,0,0.08)] py-12">
          <div className="mt-10 grid gap-4 lg:grid-cols-4">
            {[
              ["Excelente terminacion y muy buen tapizado.", "Silvia F."],
              ["La foto de la tela ayuda muchisimo para elegir.", "Victoria G."],
              ["La compra fue simple y la atencion fue muy clara.", "Lucia M."],
              ["Nos asesoraron bien con medidas y entrega.", "Matias L."],
            ].map(([quote, name]) => (
              <article
                key={name}
                className="group relative overflow-hidden rounded-[1.75rem] border border-[rgba(200,154,21,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(248,244,236,0.98)_100%)] p-5 shadow-[0_12px_30px_rgba(29,24,20,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(29,24,20,0.1)]"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(200,154,21,0.55),transparent)]" />
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.34em] text-[var(--pf-primary-darker)]">★★★★★</p>
                  <span className="rounded-full border border-[rgba(200,154,21,0.16)] bg-[rgba(200,154,21,0.08)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--pf-primary-darker)]">
                    Verificado
                  </span>
                </div>
                <p className="mt-5 text-sm leading-7 text-[var(--pf-text)]">{quote}</p>
                <div className="mt-5 flex items-center gap-3 border-t border-[rgba(0,0,0,0.06)] pt-4">
                  <div className="grid size-10 place-items-center rounded-full bg-[linear-gradient(180deg,var(--pf-primary-soft),var(--pf-primary))] text-[11px] font-black uppercase tracking-[0.22em] text-white shadow-[0_8px_18px_rgba(200,154,21,0.18)]">
                    {String(name)
                      .split(" ")
                      .map((part) => part[0])
                      .filter(Boolean)
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[var(--pf-text)]">{name}</p>
                    <p className="mt-1 text-[11px] text-[var(--pf-muted)]">Cliente satisfecho</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <LotReservationPanel lot={lot} />
        </section>

        {relatedProducts.length > 0 ? (
          <section className="border-t border-[rgba(0,0,0,0.08)] py-12">
            <SectionTitle
              title="Productos relacionados"
            />

            <div className="mt-10">
              <CatalogGrid products={relatedProducts} columns={3} returnTo={currentReturnTo} />
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
