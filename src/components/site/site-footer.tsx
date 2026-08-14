import Image from "next/image";

import { publicAsset } from "@/lib/catalog";

export function SiteFooter() {
  return (
    <footer className="hidden border-t border-[var(--pf-border-warm)] bg-[linear-gradient(180deg,var(--pf-primary-darker),var(--pf-primary-dark))] text-[#f8f1e7] lg:block">
      <div className="pf-shell grid gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:px-12">
        <div>
          <div className="inline-flex items-center gap-3">
            <Image
              src={publicAsset("/assets/images/logo/logo_v2.png")}
              alt="Pintofruta"
              width={83}
              height={21}
              className="h-auto w-[58px] sm:w-[71px]"
            />
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.28em] text-[#f8f1e7]/70">Navegación</h3>
          <ul className="space-y-2 text-sm text-[#f8f1e7]/80">
            <li>Inicio</li>
            <li>Galería</li>
            <li>Búsqueda</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
