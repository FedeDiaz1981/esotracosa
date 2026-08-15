import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { recordProductView } from "@/app/catalog-actions";
import { getProductBySku } from "@/application/catalog";
import { CartAddButton } from "@/components/cart/cart-add-button";
import { ProductFabricGallery } from "@/components/site/product-fabric-gallery";
import { ProductImageCarousel } from "@/components/site/product-image-carousel";
import { getCurrentViewer } from "@/infrastructure/auth/pintofruta-auth";
import { getSiteContent } from "@/infrastructure/site-content.repository";
import { formatCurrency, publicAsset } from "@/lib/catalog";
import { resolveProductUnitPrice } from "@/lib/pricing";

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
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-4xl text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.45em] text-[var(--pf-secondary-dark)]">{eyebrow}</p>
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

export default async function ProductPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const { sku } = await params;
  const viewer = await getCurrentViewer();
  const authenticated = Boolean(viewer?.authenticated);
  const product = await getProductBySku(sku, viewer);

  if (!product) {
    notFound();
  }

  const content = await getSiteContent();
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
  const heroPrice = resolveProductUnitPrice(product, viewer);
  const fabricCount = product.fabricVariants?.length ?? product.fabricIds?.length ?? 0;
  const mainImage = heroImages[0] ?? "";
  const secondaryImages = heroImages.slice(1, 5);

  const infoRows = [
    { label: "Marca", value: product.brand },
    { label: "Categoria", value: product.categoryName },
    { label: "SKU", value: product.sku },
    { label: "Telas", value: fabricCount > 0 ? `${fabricCount} disponibles` : "Sin definir" },
    { label: "Solo miembros", value: product.onlyMembers ? "Si" : "No" },
    { label: "Stock", value: product.stock == null ? "A pedido" : product.stock <= 0 ? "Agotado" : `${product.stock} unidades` },
  ];

  const summaryLines = [
    product.featured ? "Producto destacado" : "Producto en catalogo",
    product.onlyMembers ? "Visible solo para usuarios logueados" : "Visible para todo el publico",
    product.vegano ? "Sello vegano disponible" : "Sin sello vegano",
    product.kosher ? "Sello kosher disponible" : "Sin sello kosher",
  ];

  return (
    <main className="bg-[#fbf8f2] text-[var(--pf-text)]">
      <div className="mx-auto flex w-full max-w-[1220px] flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.08)] pb-4 text-[11px] font-black uppercase tracking-[0.35em] text-[var(--pf-muted)]">
          <Link href="/galeria" className="transition hover:text-[var(--pf-primary-darker)]">
            Volver a la galeria
          </Link>
          <span>{product.sku}</span>
        </div>

        <section className="border-b border-[rgba(0,0,0,0.08)] px-2 py-12 text-center sm:px-6 lg:py-14">
          <p className="text-[11px] font-black uppercase tracking-[0.5em] text-[var(--pf-secondary-dark)]">{product.brand}</p>
          <p className="mt-4 text-[0.8rem] font-medium uppercase tracking-[0.38em] text-[var(--pf-muted)]">
            {product.categoryName}
          </p>
          <h1 className="mt-6 font-serif text-[clamp(3rem,8vw,7rem)] leading-[0.9] tracking-[-0.06em] text-[var(--pf-text)]">
            {product.name}
          </h1>
          <div className="mx-auto mt-8 max-w-[34rem] bg-[#111111] px-6 py-5 text-white sm:px-10">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">Precio</p>
            <p className="mt-2 font-serif text-[clamp(2.4rem,5vw,4rem)] leading-none">{formatCurrency(heroPrice)}</p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.28em] text-white/60">Un solo precio para todos</p>
          </div>
          <p className="mx-auto mt-6 max-w-3xl text-sm leading-7 text-[var(--pf-muted)]">
            {product.description || product.detail}
          </p>
        </section>

        <section className="border-y border-[rgba(0,0,0,0.08)] py-12">
          <ProductFabricGallery product={product} />
        </section>

        <ProductImageCarousel
          images={heroImages}
          alt={product.name}
          eyebrow="Mas vistas"
          title="Todas las imagenes del producto en loop infinito"
        />

        <section className="py-12">
          <div className="grid gap-10 lg:grid-cols-[1.08fr_.92fr]">
            <div className="border-t border-[rgba(0,0,0,0.08)] pt-8">
              <div className="max-w-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.45em] text-[var(--pf-secondary-dark)]">Detalle</p>
                <h2 className="mt-4 font-serif text-[clamp(1.9rem,3vw,3.2rem)] leading-tight tracking-[-0.04em] text-[var(--pf-text)]">
                  Una ficha limpia, directa y sin distracciones
                </h2>
                <p className="mt-4 text-sm leading-7 text-[var(--pf-muted)]">
                  La idea es que la experiencia se parezca a la referencia: mucho aire, imagen protagonista y secciones
                  claras para telas, medidas y contenido comercial.
                </p>
              </div>

              <div className="mt-8 border-y border-[rgba(0,0,0,0.08)] py-1">
                {infoRows.map((item) => (
                  <DetailRow key={item.label} label={item.label} value={item.value} />
                ))}
              </div>
            </div>

            <div className="border-t border-[rgba(0,0,0,0.08)] pt-8">
              <p className="text-[10px] font-black uppercase tracking-[0.45em] text-[var(--pf-secondary-dark)]">Estado</p>
              <div className="mt-4 border-t border-[rgba(0,0,0,0.08)]">
                {summaryLines.map((line) => (
                  <div key={line} className="border-b border-[rgba(0,0,0,0.08)] py-4 text-sm leading-7 text-[var(--pf-text)] last:border-b-0">
                    {line}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <CartAddButton product={product} className="rounded-none bg-[var(--pf-primary-darker)] px-8 py-3 text-sm font-black uppercase tracking-[0.18em] text-white hover:bg-[var(--pf-primary-dark)]">
                  Agregar al pedido
                </CartAddButton>
                <Link
                  href="/busqueda"
                  className="inline-flex items-center justify-center border border-[rgba(0,0,0,0.14)] px-8 py-3 text-sm font-black uppercase tracking-[0.18em] text-[var(--pf-text)] transition hover:border-[rgba(0,0,0,0.3)]"
                >
                  Seguir buscando
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[rgba(0,0,0,0.08)] py-12">
          <SectionTitle
            eyebrow="Vista del modelo"
            title="Galeria amplia de imagenes"
            description="Una composicion simple, con dos o mas vistas grandes para transmitir escala y terminacion."
          />

          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {secondaryImages.length > 0 ? (
              secondaryImages.slice(0, 2).map((image, index) => (
                <div key={`${product.id}-hero-${index}`} className="relative min-h-[360px] border border-[rgba(0,0,0,0.08)] bg-white">
                  <Image
                    src={publicAsset(image)}
                    alt={`${product.name} vista ${index + 1}`}
                    fill
                    className="object-contain p-6"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              ))
            ) : (
              <>
                <div className="relative min-h-[360px] border border-[rgba(0,0,0,0.08)] bg-white">
                  <Image
                    src={publicAsset(mainImage)}
                    alt={product.name}
                    fill
                    className="object-contain p-6"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
                <div className="relative min-h-[360px] border border-[rgba(0,0,0,0.08)] bg-white">
                  <Image
                    src={publicAsset(mainImage)}
                    alt={product.name}
                    fill
                    className="object-contain p-6"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              </>
            )}
          </div>
        </section>

        <section className="py-12">
          <SectionTitle
            eyebrow="Medidas personalizables"
            title="Medidas y configuraciones"
            description="Un bloque limpio para mostrar la informacion dimensional sin cargar la pagina con decoracion extra."
          />

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Ancho", value: "A medida", detail: "Segun el modulo o la composicion elegida." },
              { label: "Profundidad", value: "A medida", detail: "Listo para ajustar al espacio disponible." },
              { label: "Altura", value: "Estandar", detail: "Se puede adaptar segun el modelo cargado." },
              { label: "Tapizado", value: "A eleccion", detail: "La tela define la foto y la variante visible." },
            ].map((item) => (
              <div key={item.label} className="border-t border-[rgba(0,0,0,0.08)] pt-4">
                <p className="text-[10px] font-black uppercase tracking-[0.34em] text-[var(--pf-muted)]">{item.label}</p>
                <p className="mt-3 font-serif text-[2rem] leading-none tracking-[-0.05em] text-[var(--pf-text)]">{item.value}</p>
                <p className="mt-3 text-sm leading-7 text-[var(--pf-muted)]">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-[rgba(0,0,0,0.08)] py-12">
          <SectionTitle
            eyebrow="Informacion general"
            title="Datos claros para la compra"
            description="La tabla queda simple y legible, sin bloques pesados ni bordes gruesos."
          />

          <div className="mx-auto mt-10 max-w-4xl border-t border-[rgba(0,0,0,0.08)]">
            <DetailRow label="Garantia" value="Consultanos la cobertura segun la linea y el tapizado." />
            <DetailRow label="Financiacion" value="Tenemos opciones para compras de monto alto." />
            <DetailRow label="Envios" value="Coordinamos entrega y retiro segun la zona." />
            <DetailRow label="Fabricante" value={product.brand} />
          </div>
        </section>

        <section className="py-12">
          <SectionTitle
            eyebrow="Caracteristicas generales"
            title="Lo importante, en una sola mirada"
            description="Resumen comercial y de visibilidad para que la ficha funcione bien tanto en catalogo como en detalle."
          />

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="border-t border-[rgba(0,0,0,0.08)] pt-4">
              {[
                ["Marca", product.brand],
                ["Categoria", product.categoryName],
                ["Precio", formatCurrency(heroPrice)],
                ["Telas", `${fabricCount} variantes`],
                ["Solo miembros", product.onlyMembers ? "Si" : "No"],
                ["Stock", product.stock == null ? "A pedido" : product.stock <= 0 ? "Agotado" : `${product.stock} unidades`],
              ].map(([label, value]) => (
                <DetailRow key={label} label={label} value={value} />
              ))}
            </div>

            <div className="border-t border-[rgba(0,0,0,0.08)] pt-4">
              {summaryLines.map((line) => (
                <div key={line} className="border-b border-[rgba(0,0,0,0.08)] py-4 text-sm leading-7 text-[var(--pf-text)] last:border-b-0">
                  {line}
                </div>
              ))}
            </div>
          </div>
        </section>

        {relatedProducts.length > 0 ? (
          <section className="border-t border-[rgba(0,0,0,0.08)] py-12">
            <SectionTitle
              eyebrow="Relacionados"
              title="Mas sofas"
              description="Productos que combinan por categoria, marca o por la relacion cargada en la ficha."
            />

            <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {relatedProducts.map((item) => (
                <Link key={item.id} href={`/producto/${item.sku}`} className="group block">
                  <div className="relative min-h-[240px] border border-[rgba(0,0,0,0.08)] bg-white">
                    <Image
                      src={publicAsset(item.image)}
                      alt={item.name}
                      fill
                      className="object-contain p-6 transition duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="pt-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.34em] text-[var(--pf-muted)]">{item.brand}</p>
                    <h3 className="mt-2 text-[1.05rem] font-medium text-[var(--pf-text)]">{item.name}</h3>
                    <p className="mt-2 text-sm font-semibold text-[var(--pf-primary-darker)]">
                      {formatCurrency(resolveProductUnitPrice(item, viewer))}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="border-t border-[rgba(0,0,0,0.08)] py-12">
          <SectionTitle
            eyebrow="Clientes"
            title="Clientes nos recomiendan"
            description="Un cierre simple para completar la experiencia sin romper la estética editorial."
          />

          <div className="mt-10 grid gap-4 lg:grid-cols-4">
            {[
              ["Excelente terminacion y muy buen tapizado.", "Silvia F."],
              ["La foto de la tela ayuda muchisimo para elegir.", "Victoria G."],
              ["La compra fue simple y la atencion fue muy clara.", "Lucia M."],
              ["Nos asesoraron bien con medidas y entrega.", "Matias L."],
            ].map(([quote, name]) => (
              <article key={name} className="border-t border-[rgba(0,0,0,0.08)] pt-4">
                <p className="text-[10px] font-black uppercase tracking-[0.34em] text-[var(--pf-primary-darker)]">★★★★★</p>
                <p className="mt-4 text-sm leading-7 text-[var(--pf-muted)]">{quote}</p>
                <p className="mt-4 text-[11px] font-black uppercase tracking-[0.34em] text-[var(--pf-text)]">{name}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
