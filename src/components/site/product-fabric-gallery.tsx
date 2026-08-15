"use client";

import Image from "next/image";
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

  const selectedVariant = fabricVariants.find((variant) => variant.fabricId === selectedFabricId) ?? null;
  const heroImage = selectedVariant?.image || imageList[0] || "";
  const fallbackImages = imageList.filter((image) => image !== heroImage).slice(0, 4);

  return (
    <div className="space-y-3 rounded-[2rem] bg-[rgba(245,243,239,0.82)] p-3">
      <div className="relative min-h-[380px] overflow-hidden rounded-[1.75rem] bg-[rgba(255,255,255,0.92)]">
        <Image
          src={publicAsset(heroImage)}
          alt={product.name}
          fill
          className="object-contain p-6"
          sizes="(max-width: 1024px) 100vw, 55vw"
          priority
        />
      </div>

      {fabricVariants.length > 0 ? (
        <div className="rounded-[1.5rem] border border-[var(--pf-border)] bg-white p-4">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[var(--pf-muted)]">Tela</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {fabricVariants.map((variant) => {
              const active = variant.fabricId === selectedFabricId;

              return (
                <button
                  key={variant.fabricId}
                  type="button"
                  onClick={() => setSelectedFabricId(variant.fabricId)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-[linear-gradient(180deg,var(--pf-primary-soft)_0%,var(--pf-primary)_100%)] text-white"
                      : "border border-[var(--pf-border)] bg-[rgba(245,243,239,0.55)] text-[var(--pf-text)] hover:bg-white"
                  }`}
                >
                  {variant.fabricName || `Tela ${variant.fabricId}`}
                </button>
              );
            })}
          </div>
          {selectedVariant ? (
            <p className="mt-3 text-sm text-[var(--pf-muted)]">
              {selectedVariant.fabricName ? `Vista con ${selectedVariant.fabricName}.` : "Vista con la tela seleccionada."}
            </p>
          ) : null}
        </div>
      ) : null}

      {fallbackImages.length > 0 ? (
        <div className="grid grid-cols-5 gap-2">
          {[heroImage, ...fallbackImages].slice(0, 5).map((image, index) => (
            <div key={`${product.id}-${image}-${index}`} className="relative aspect-square overflow-hidden rounded-xl border border-[var(--pf-border)] bg-white">
              <Image
                src={publicAsset(image)}
                alt={`${product.name} ${index + 1}`}
                fill
                className="object-contain p-2"
                sizes="80px"
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
