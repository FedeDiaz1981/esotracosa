import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { recordProductView } from "@/app/catalog-actions";
import { getProductBySku } from "@/application/catalog";
import { CartAddButton } from "@/components/cart/cart-add-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { SectionHeading } from "@/components/site/section-heading";
import { ProductFabricGallery } from "@/components/site/product-fabric-gallery";
import { getCurrentViewer } from "@/infrastructure/auth/pintofruta-auth";
import { getSiteContent } from "@/infrastructure/site-content.repository";
import { formatCurrency, publicAsset } from "@/lib/catalog";
import { resolveProductUnitPrice } from "@/lib/pricing";

function isVisibleProduct(product: {
  status: string;
  onlyMembers?: boolean;
}, authenticated: boolean) {
  return product.status === "published" && (!product.onlyMembers || authenticated);
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

  const infoRows = [
    { label: "Marca", value: product.brand },
    { label: "Categoria", value: product.categoryName },
    { label: "SKU", value: product.sku },
    { label: "Telas", value: fabricCount > 0 ? `${fabricCount} disponibles` : "Sin definir" },
    { label: "Solo miembros", value: product.onlyMembers ? "Si" : "No" },
    { label: "Stock", value: product.stock == null ? "A pedido" : product.stock <= 0 ? "Agotado" : `${product.stock} unidades` },
  ];

  const highlights = [
    { title: "Precio unificado", text: "Un solo precio para todos los usuarios, con compra simple y directa." },
    { title: "Telas configurables", text: "Cada tela puede tener su propia foto del sillon para mostrar el acabado real." },
    { title: "Visibilidad flexible", text: "Si es solo miembros, la ficha respeta el acceso del usuario." },
    { title: "Carga rapida", text: "La ficha trae solo lo necesario y deja el resto listo para seguir navegando." },
  ];

  return (
    <main className="pf-shell flex w-full flex-1 flex-col gap-10 px-4 py-5 sm:px-6 lg:px-12 lg:py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/galeria" className="text-sm font-semibold text-[var(--pf-primary-dark)] hover:underline">
          ← Volver a la galeria
        </Link>
        <span className="rounded-full border border-[rgba(200,154,21,0.18)] bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-[var(--pf-primary-darker)] shadow-[0_10px_24px_rgba(29,24,20,0.06)]">
          Ficha de producto
        </span>
      </div>

      <section className="overflow-hidden rounded-[2.5rem] border border-[var(--pf-border)] bg-[var(--pf-surface)] shadow-[0_18px_42px_rgba(29,24,20,0.10)]">
        <div className="border-b border-[rgba(200,154,21,0.12)] bg-[linear-gradient(180deg,rgba(249,245,238,0.98),rgba(255,255,255,0.96))] px-5 py-5 sm:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-[rgba(200,154,21,0.28)] text-[var(--pf-text)]">
              {product.brand}
            </Badge>
            <Badge variant="outline" className="border-[rgba(200,154,21,0.28)] text-[var(--pf-text)]">
              {product.categoryName}
            </Badge>
            {product.onlyMembers ? (
              <Badge variant="outline" className="border-[rgba(185,79,54,0.22)] text-[var(--pf-wood-muted)]">
                Solo miembros
              </Badge>
            ) : null}
            {product.featured ? (
              <Badge variant="outline" className="border-[rgba(200,154,21,0.22)] text-[var(--pf-primary-darker)]">
                Destacado
              </Badge>
            ) : null}
          </div>
          <div className="mt-5 max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[var(--pf-secondary-dark)]">Sillon / {product.sku}</p>
            <h1 className="mt-3 text-[2.3rem] font-black tracking-[-0.06em] text-[var(--pf-text)] sm:text-[3.8rem]">
              {product.name}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--pf-muted)] sm:text-[1rem] sm:leading-8">
              {product.description || product.detail}
            </p>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.12fr_.88fr]">
          <ProductFabricGallery product={product} />

          <div className="flex min-h-0 flex-col gap-5 p-5 sm:p-8">
            <div className="rounded-[2rem] border border-[rgba(224,208,180,0.7)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,243,234,0.96))] p-5 shadow-[0_14px_28px_rgba(29,24,20,0.08)]">
              <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[var(--pf-muted)]">Precio</p>
              <p className="mt-3 text-4xl font-black tracking-[-0.05em] text-[var(--pf-text)] sm:text-5xl">
                {formatCurrency(heroPrice)}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--pf-muted)]">
                Un solo precio para todo el sitio. Si despues queres agregar financiamiento o promos, esta ficha ya queda lista.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {infoRows.map((item) => (
                <div key={item.label} className="rounded-[1.5rem] border border-[var(--pf-border)] bg-white p-4 shadow-[0_10px_22px_rgba(29,24,20,0.05)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--pf-muted)]">{item.label}</p>
                  <p className="mt-1 text-base font-semibold text-[var(--pf-text)]">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[2rem] border border-[var(--pf-border)] bg-[rgba(255,255,255,0.92)] p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[var(--pf-secondary-dark)]">Resumen</p>
              <div className="mt-4 grid gap-3">
                {highlights.map((highlight) => (
                  <div key={highlight.title} className="rounded-[1.25rem] border border-[rgba(200,154,21,0.14)] bg-[rgba(245,239,228,0.5)] px-4 py-3">
                    <p className="text-sm font-bold text-[var(--pf-text)]">{highlight.title}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--pf-muted)]">{highlight.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto flex flex-wrap gap-3">
              <CartAddButton product={product} className={buttonVariants({ variant: "primary", size: "lg" })}>
                Agregar al pedido
              </CartAddButton>
              <Link href="/busqueda" className={buttonVariants({ variant: "secondary", size: "lg" })}>
                Seguir buscando
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-[2.25rem] border border-[var(--pf-border)] bg-white p-5 shadow-[0_14px_30px_rgba(29,24,20,0.06)]">
          <SectionHeading
            eyebrow="Selección"
            title="Elegí la tela y mirá el acabado real"
            description="La galeria te permite cambiar la tela y ver la foto correspondiente del sillon sin salir de la ficha."
          />
          <div className="mt-6 overflow-hidden rounded-[2rem] bg-[linear-gradient(180deg,rgba(249,245,238,0.92),rgba(255,255,255,1))] p-4">
            <ProductFabricGallery product={product} />
          </div>
        </div>

        <div className="rounded-[2.25rem] border border-[var(--pf-border)] bg-[linear-gradient(180deg,rgba(44,35,27,1),rgba(75,58,44,1))] p-5 text-white shadow-[0_14px_30px_rgba(29,24,20,0.12)]">
          <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[rgba(255,255,255,0.68)]">Vista del modelo</p>
          <h2 className="mt-3 text-2xl font-black tracking-[-0.04em]">Presentacion amplia y limpia</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-white/76">
            Esta seccion replica el estilo de showroom de la referencia, pero con la paleta del sitio y la fotografia del producto.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {heroImages.slice(0, 2).map((image, index) => (
              <div key={`${product.id}-hero-${index}`} className="relative min-h-[240px] overflow-hidden rounded-[1.75rem] bg-[rgba(255,255,255,0.96)]">
                <Image
                  src={publicAsset(image)}
                  alt={`${product.name} vista ${index + 1}`}
                  fill
                  className="object-contain p-4"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[2.25rem] border border-[var(--pf-border)] bg-[var(--pf-surface)] p-5 shadow-[0_14px_30px_rgba(29,24,20,0.06)] sm:p-6">
        <SectionHeading
          eyebrow="Medidas"
          title="Medidas personalizables"
          description="Si el modelo admite variantes de tamaño o configuracion, este bloque queda listo para mostrarlo."
        />

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Ancho", value: "A medida", detail: "Definilo segun el modulo o la composicion." },
            { label: "Profundidad", value: "A medida", detail: "Ideal para dejar armado el encastre." },
            { label: "Altura", value: "Estándar", detail: "El respaldo puede ajustarse segun el tapizado." },
            { label: "Tapizado", value: "A elección", detail: "La tela seleccionada define la imagen de la variante." },
          ].map((item) => (
            <div key={item.label} className="rounded-[1.75rem] border border-[var(--pf-border-soft)] bg-white p-5 shadow-[0_10px_22px_rgba(29,24,20,0.05)]">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--pf-muted)]">{item.label}</p>
              <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--pf-text)]">{item.value}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--pf-muted)]">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2.25rem] border border-[var(--pf-border)] bg-white p-5 shadow-[0_14px_30px_rgba(29,24,20,0.06)] sm:p-6">
        <SectionHeading
          eyebrow="Informacion"
          title="Informacion general"
          description="Datos rapidos para ver la ficha completa sin abrir modales ni pantallas extra."
        />

        <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-[var(--pf-border-soft)]">
          <div className="grid md:grid-cols-[260px_1fr]">
            {[
              ["Garantia", "Consultanos la cobertura segun la linea y el tapizado."],
              ["Financiacion", "Tenemos opciones para compras de monto alto."],
              ["Envios", "Coordinamos entrega y retiro segun la zona."],
              ["Fabricante", product.brand],
            ].map(([label, value]) => (
              <>
                <div className="border-b border-r border-[var(--pf-border-soft)] bg-[rgba(245,243,239,0.82)] px-4 py-4 text-xs font-black uppercase tracking-[0.24em] text-[var(--pf-muted)]">
                  {label}
                </div>
                <div className="border-b border-[var(--pf-border-soft)] px-4 py-4 text-sm leading-6 text-[var(--pf-text)]">{value}</div>
              </>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[2.25rem] border border-[var(--pf-border)] bg-white p-5 shadow-[0_14px_30px_rgba(29,24,20,0.06)] sm:p-6">
        <SectionHeading
          eyebrow="Caracteristicas"
          title="Características generales"
          description="Un resumen corto para transmitir la personalidad del sillon y su estado comercial."
        />

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[1.75rem] border border-[var(--pf-border-soft)] bg-[rgba(245,243,239,0.6)] p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Marca", product.brand],
                ["Categoria", product.categoryName],
                ["Precio", formatCurrency(heroPrice)],
                ["Telas", `${fabricCount} variantes`],
                ["Solo miembros", product.onlyMembers ? "Si" : "No"],
                ["Stock", product.stock == null ? "A pedido" : product.stock <= 0 ? "Agotado" : `${product.stock} unidades`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[1.25rem] border border-white bg-white px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--pf-muted)]">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--pf-text)]">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--pf-border-soft)] bg-[linear-gradient(180deg,rgba(44,35,27,1),rgba(75,58,44,1))] p-5 text-white">
            <p className="text-[11px] font-black uppercase tracking-[0.34em] text-white/60">Caracteristicas especiales</p>
            <div className="mt-4 grid gap-3">
              {[
                product.featured ? "Producto destacado en la web" : "Producto disponible en catalogo",
                product.onlyMembers ? "Visible solo para usuarios logueados" : "Visible para todo el publico",
                product.vegano ? "Aplica sello vegano" : "Sin sello vegano",
                product.kosher ? "Aplica sello kosher" : "Sin sello kosher",
              ].map((item) => (
                <div key={item} className="rounded-[1.25rem] border border-white/10 bg-white/6 px-4 py-3 text-sm leading-6 text-white/88">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 ? (
        <section className="rounded-[2.25rem] border border-[var(--pf-border)] bg-[var(--pf-surface)] p-5 shadow-[0_14px_30px_rgba(29,24,20,0.06)] sm:p-6">
          <SectionHeading
            eyebrow="Relacionados"
            title="Más sofás"
            description="Productos que combinan por categoria, marca o por la relacion cargada en la ficha."
            action={
              <Link href="/galeria" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Ver galeria
              </Link>
            }
          />

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {relatedProducts.map((item) => (
              <Link
                key={item.id}
                href={`/producto/${item.sku}`}
                className="group overflow-hidden rounded-[1.75rem] border border-[var(--pf-border-soft)] bg-white shadow-[0_10px_22px_rgba(29,24,20,0.06)] transition hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(29,24,20,0.12)]"
              >
                <div className="relative h-56 overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,247,244,1))]">
                  <Image
                    src={publicAsset(item.image)}
                    alt={item.name}
                    fill
                    className="object-contain p-4 transition duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="border-t border-[rgba(29,24,20,0.08)] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--pf-muted)]">{item.brand}</p>
                  <h3 className="mt-2 line-clamp-2 text-base font-semibold text-[var(--pf-text)]">{item.name}</h3>
                  <p className="mt-3 text-sm font-semibold text-[var(--pf-primary-darker)]">{formatCurrency(resolveProductUnitPrice(item, viewer))}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-[2.25rem] border border-[var(--pf-border)] bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,244,236,1))] p-5 shadow-[0_14px_30px_rgba(29,24,20,0.06)] sm:p-6">
        <SectionHeading
          eyebrow="Opiniones"
          title="Clientes nos recomiendan"
          description="Una franja social simple para dar contexto comercial y completar la ficha con un tono mas editorial."
        />

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          {[
            ["Excelente terminacion y muy buen tapizado.", "Silvia F."],
            ["La foto de la tela ayuda muchisimo para elegir.", "Victoria G."],
            ["La compra fue simple y la atencion fue muy clara.", "Lucia M."],
            ["Nos asesoraron bien con medidas y entrega.", "Matias L."],
          ].map(([quote, name]) => (
            <article key={name} className="rounded-[1.75rem] border border-[var(--pf-border-soft)] bg-white p-5 shadow-[0_10px_22px_rgba(29,24,20,0.05)]">
              <p className="text-amber-500">★★★★★</p>
              <p className="mt-4 text-sm leading-7 text-[var(--pf-muted)]">{quote}</p>
              <p className="mt-4 text-xs font-black uppercase tracking-[0.28em] text-[var(--pf-primary-darker)]">{name}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
