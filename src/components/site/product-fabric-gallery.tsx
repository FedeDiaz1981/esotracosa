"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import type { ProductItem } from "@/domain/site-content";
import { publicAsset } from "@/lib/catalog";

type FabricGalleryProps = {
  product: ProductItem;
};

export function ProductFabricGallery({ product }: FabricGalleryProps) {
  const imageList = product.images?.length ? product.images : product.image ? [product.image] : [];
  const fabricVariants = product.fabricVariants ?? [];
  const [selectedFabricId, setSelectedFabricId] = useState<number | null>(() => fabricVariants[0]?.fabricId ?? null);

  const selectedIndex = Math.max(
    0,
    fabricVariants.findIndex((variant) => variant.fabricId === selectedFabricId),
  );
  const selectedVariant = fabricVariants[selectedIndex] ?? null;
  const heroImage = selectedVariant?.image || imageList[0] || "";

  const visibleVariants = fabricVariants;

  const goToVariant = (direction: -1 | 1) => {
    if (visibleVariants.length === 0) {
      return;
    }

    const nextIndex = (selectedIndex + direction + visibleVariants.length) % visibleVariants.length;
    setSelectedFabricId(visibleVariants[nextIndex]?.fabricId ?? null);
  };

  return (
    <div className="bg-white px-0 py-4 sm:py-6">
      <div className="grid gap-10 xl:grid-cols-[1.04fr_.96fr] xl:items-center">
        <div className="relative min-h-[460px] bg-white">
          <Image
            src={publicAsset(heroImage)}
            alt={product.name}
            fill
            className="object-contain"
            sizes="(max-width: 1280px) 100vw, 52vw"
            priority
          />
        </div>

        <div className="flex flex-col justify-center">
          <h3 className="text-right font-serif text-[clamp(1.65rem,2.6vw,2.75rem)] leading-none tracking-[-0.03em] text-[var(--pf-text)]">
            SELECCIONÁ TU TELA
          </h3>
          <div className="mt-5 h-px w-full bg-[rgba(0,0,0,0.14)]" />

          {visibleVariants.length > 0 ? (
            <div className="mt-8">
              <div className="flex items-start gap-1.5">
                <button
                  type="button"
                  onClick={() => goToVariant(-1)}
                  className="mt-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[18px] text-[var(--pf-text)] transition hover:opacity-75"
                  aria-label="Tela anterior"
                >
                  <X className="size-4" />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                    {visibleVariants.map((variant) => {
                      const active = variant.fabricId === selectedFabricId;

                      return (
                        <button
                          key={variant.fabricId}
                          type="button"
                          onClick={() => setSelectedFabricId(variant.fabricId)}
                          className="group flex flex-col items-center text-center"
                        >
                          <div
                            className={`relative aspect-square w-full overflow-hidden transition ${
                              active ? "border-[4px] border-[rgba(0,0,0,0.72)]" : "border border-[rgba(0,0,0,0.08)]"
                            } bg-white`}
                          >
                            <Image
                              src={publicAsset(variant.image)}
                              alt={variant.fabricName || `Tela ${variant.fabricId}`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 42vw, 16vw"
                            />
                          </div>
                          <p className="mt-3 text-[0.95rem] font-normal leading-5 text-[var(--pf-text)]">
                            {variant.fabricName || `Tela ${variant.fabricId}`}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => goToVariant(-1)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white transition hover:scale-105"
                      aria-label="Anterior"
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => goToVariant(1)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white transition hover:scale-105"
                      aria-label="Siguiente"
                    >
                      <ChevronRight className="size-5" />
                    </button>
                  </div>

                  <p className="mx-auto mt-6 max-w-[48rem] text-center text-[0.92rem] leading-7 text-[var(--pf-text)]">
                    Somos fabricantes. Disponemos de una amplia gama de colores y telas para su elección. Las imágenes son
                    meramente ilustrativas. Pueden diferir con la realidad. Ambos están sujetos a stock y disponibilidad.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-8 text-center text-sm text-[var(--pf-muted)]">No hay telas cargadas para este producto.</p>
          )}
        </div>
      </div>
    </div>
  );
}
