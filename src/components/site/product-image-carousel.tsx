"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { publicAsset } from "@/lib/catalog";

type ProductImageCarouselProps = {
  images: string[];
  alt: string;
  eyebrow?: string;
  title?: ReactNode;
};

export function ProductImageCarousel({ images, alt, eyebrow, title }: ProductImageCarouselProps) {
  const galleryImages = images.length > 0 ? images : [""];

  return (
    <section className="py-12">
      <div className="mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8">
        {eyebrow || title ? (
          <div className="mx-auto max-w-4xl text-center">
            {eyebrow ? (
              <p className="text-[10px] font-black uppercase tracking-[0.45em] text-[var(--pf-secondary-dark)]">{eyebrow}</p>
            ) : null}
            {title ? (
              <h2 className="mt-4 font-serif text-[clamp(1.8rem,3vw,3rem)] leading-tight tracking-[-0.03em] text-[var(--pf-text)]">
                {title}
              </h2>
            ) : null}
          </div>
        ) : null}

        <div className="product-carousel-mask mt-10 overflow-hidden">
          <div className="product-carousel-track flex w-max">
            {[0, 1].map((groupIndex) => (
              <div key={groupIndex} className="product-carousel-group flex gap-2 pr-2">
                {galleryImages.map((image, index) => (
                  <div
                    key={`${groupIndex}-${image || "empty"}-${index}`}
                    className="product-carousel-item relative h-[260px] w-[min(34vw,560px)] min-w-[320px] flex-none bg-[#e7e7e7] sm:h-[320px] lg:h-[380px] lg:w-[min(30vw,560px)]"
                  >
                    <Image
                      src={publicAsset(image)}
                      alt={`${alt} ${index + 1}`}
                      fill
                      className="object-contain p-4"
                      sizes="(max-width: 768px) 82vw, 33vw"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .product-carousel-mask {
          mask-image: linear-gradient(to right, transparent, black 6%, black 94%, transparent);
        }

        .product-carousel-track {
          animation: product-carousel-scroll 36s linear infinite;
          will-change: transform;
        }

        .product-carousel-item {
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
        }

        @keyframes product-carousel-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </section>
  );
}
