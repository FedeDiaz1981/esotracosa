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
    <div className="space-y-5">
      <div className="relative min-h-[420px] overflow-hidden border border-[rgba(0,0,0,0.08)] bg-white">
        <Image
          src={publicAsset(heroImage)}
          alt={product.name}
          fill
          className="object-contain p-8"
          sizes="(max-width: 1024px) 100vw, 55vw"
          priority
        />
      </div>

      {fabricVariants.length > 0 ? (
        <div className="border-y border-[rgba(0,0,0,0.08)] py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-[var(--pf-muted)]">Tela</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {fabricVariants.map((variant) => {
              const active = variant.fabricId === selectedFabricId;

              return (
                <button
                  key={variant.fabricId}
                  type="button"
                  onClick={() => setSelectedFabricId(variant.fabricId)}
                  className={`px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-[#111111] text-white"
                      : "border border-[rgba(0,0,0,0.12)] bg-white text-[var(--pf-text)] hover:border-[rgba(0,0,0,0.28)]"
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
            <div key={`${product.id}-${image}-${index}`} className="relative aspect-square overflow-hidden border border-[rgba(0,0,0,0.08)] bg-white">
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
