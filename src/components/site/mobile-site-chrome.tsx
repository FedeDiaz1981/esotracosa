"use client";

import Image from "next/image";
import Link from "next/link";
import { House, Menu, Search, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { DynamicHeaderMenu } from "@/application/catalog";
import { MobileCartButton } from "@/components/cart/mobile-cart-button";
import { buttonVariants } from "@/components/ui/button";
import { publicAsset } from "@/lib/catalog";

type MobileSiteChromeProps = {
  menus: DynamicHeaderMenu[];
};

function MobileLoginModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal modal-open z-[11080] lg:hidden">
      <div className="modal-box w-[min(92vw,26rem)] max-w-none overflow-hidden rounded-[2rem] border border-[var(--pf-border-warm)] bg-[var(--pf-surface)] p-0 text-[var(--pf-text)] shadow-[0_30px_80px_rgba(74,57,38,0.26)]">
        <div className="flex items-center justify-between border-b border-[rgba(168,109,69,0.12)] px-5 py-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[var(--pf-muted)]">Acceso</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[var(--pf-text)]">Iniciar sesión</h2>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={`${buttonVariants({ variant: "secondary", size: "icon" })} h-10 w-10 rounded-full`}
            aria-label="Cerrar login"
          >
            <X className="size-5" />
          </button>
        </div>

        <form className="space-y-4 px-5 py-5" onSubmit={(event) => event.preventDefault()}>
          <div>
            <label
              className="mb-2 block text-xs font-bold uppercase tracking-[0.24em] text-[var(--pf-muted)]"
              htmlFor="mobile-login-email"
            >
              Correo
            </label>
            <input
              id="mobile-login-email"
              name="email"
              type="email"
              placeholder="tu@email.com"
              className="w-full rounded-[1rem] border border-[var(--pf-border)] bg-[rgba(255,255,255,0.92)] px-4 py-3 text-sm outline-none transition focus:border-[var(--pf-primary)]"
            />
          </div>

          <div>
            <label
              className="mb-2 block text-xs font-bold uppercase tracking-[0.24em] text-[var(--pf-muted)]"
              htmlFor="mobile-login-password"
            >
              Contraseña
            </label>
            <input
              id="mobile-login-password"
              name="password"
              type="password"
              placeholder="••••••••"
              className="w-full rounded-[1rem] border border-[var(--pf-border)] bg-[rgba(255,255,255,0.92)] px-4 py-3 text-sm outline-none transition focus:border-[var(--pf-primary)]"
            />
          </div>

          <div className="grid gap-3 pt-2">
            <button type="submit" className={buttonVariants({ variant: "primary", size: "md" })}>
              Entrar
            </button>
            <Link href="/admin" onClick={() => onOpenChange(false)} className={buttonVariants({ variant: "secondary", size: "md" })}>
              Ir al admin
            </Link>
          </div>

          <p className="text-sm leading-6 text-[var(--pf-muted)]">
            Acceso demo para administración. Si querés ver el panel, tocá{" "}
            <Link href="/admin" onClick={() => onOpenChange(false)} className="font-semibold text-[var(--pf-primary-darker)]">
              ir al admin
            </Link>
            .
          </p>
        </form>
      </div>

      <button type="button" className="modal-backdrop" aria-label="Cerrar login" onClick={() => onOpenChange(false)} />
    </div>
  );
}

function MobileSearchModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  if (!open) {
    return null;
  }

  const submitSearch = () => {
    const normalized = query.trim();
    onOpenChange(false);
    router.push(normalized ? `/galeria?q=${encodeURIComponent(normalized)}` : "/galeria");
  };

  return (
    <div className="modal modal-open z-[11080] lg:hidden">
      <div className="modal-box w-[min(92vw,26rem)] max-w-none overflow-hidden rounded-[2rem] border border-[var(--pf-border-warm)] bg-[var(--pf-surface)] p-0 text-[var(--pf-text)] shadow-[0_30px_80px_rgba(74,57,38,0.26)]">
        <div className="flex items-center justify-between border-b border-[rgba(168,109,69,0.12)] px-5 py-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[var(--pf-muted)]">Búsqueda</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[var(--pf-text)]">Buscar productos</h2>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={`${buttonVariants({ variant: "secondary", size: "icon" })} h-10 w-10 rounded-full`}
            aria-label="Cerrar búsqueda"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <label className="block text-xs font-bold uppercase tracking-[0.24em] text-[var(--pf-muted)]" htmlFor="mobile-search-query">
            Qué estás buscando
          </label>
          <input
            id="mobile-search-query"
            name="query"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitSearch();
              }
            }}
            placeholder="Ej: aloe vera, cosmética, natier"
            className="w-full rounded-[1rem] border border-[var(--pf-border)] bg-[rgba(255,255,255,0.92)] px-4 py-3 text-sm outline-none transition focus:border-[var(--pf-primary)]"
          />

          <div className="grid gap-3 pt-2">
            <button type="button" onClick={submitSearch} className={buttonVariants({ variant: "primary", size: "md" })}>
              Buscar
            </button>
            <Link href="/galeria" onClick={() => onOpenChange(false)} className={buttonVariants({ variant: "secondary", size: "md" })}>
              Ver galería
            </Link>
          </div>
        </div>
      </div>

      <button type="button" className="modal-backdrop" aria-label="Cerrar búsqueda" onClick={() => onOpenChange(false)} />
    </div>
  );
}

export function MobileSiteChrome({ menus }: MobileSiteChromeProps) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  void menus;

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[10020] border-b border-[var(--pf-border)] bg-[rgba(248,242,232,0.96)] shadow-[0_14px_32px_rgba(74,57,38,0.08)] backdrop-blur lg:hidden">
        <div className="pf-shell flex h-[78px] items-center justify-between gap-3 px-4">
          <Link
            href="/"
            className="flex items-center justify-center rounded-full border-2 border-[rgba(168,109,69,0.28)] bg-[linear-gradient(90deg,rgba(168,109,69,0.18),rgba(200,176,137,0.24),rgba(246,240,230,0.6))] px-3 py-2 shadow-[0_8px_18px_rgba(74,57,38,0.08),inset_0_0_0_1px_rgba(255,255,255,0.12)]"
          >
            <Image
              src={publicAsset("/assets/images/logo/logo-Pintofruta.png")}
              alt="Pintofruta"
              width={210}
              height={56}
              className="h-auto w-[132px] max-w-full"
              priority
            />
          </Link>

          <div className="flex items-center gap-2">
            <MobileCartButton />
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-[10020] border-t border-[var(--pf-border)] bg-[rgba(248,242,232,0.98)] shadow-[0_-14px_32px_rgba(74,57,38,0.08)] backdrop-blur lg:hidden">
        <div className="pf-shell grid h-[72px] grid-cols-4 items-center px-3">
          <button
            type="button"
            onClick={() => setLoginOpen(true)}
            className="flex h-12 items-center justify-center rounded-2xl text-[var(--pf-muted)] transition hover:text-[var(--pf-primary-darker)]"
            aria-label="Abrir login"
          >
            <UserRound className="size-5" />
          </button>

          <Link
            href="/"
            className="flex h-12 items-center justify-center rounded-2xl text-[var(--pf-muted)] transition hover:text-[var(--pf-primary-darker)]"
            aria-label="Ir a inicio"
          >
            <House className="size-5" />
          </Link>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-12 items-center justify-center rounded-2xl text-[var(--pf-muted)] transition hover:text-[var(--pf-primary-darker)]"
            aria-label="Abrir búsqueda"
          >
            <Search className="size-5" />
          </button>

          <Link
            href="/admin"
            className="flex h-12 items-center justify-center rounded-2xl text-[var(--pf-muted)] transition hover:text-[var(--pf-primary-darker)]"
            aria-label="Abrir admin de listas"
          >
            <Menu className="size-5" />
          </Link>
        </div>
      </div>

      <MobileLoginModal open={loginOpen} onOpenChange={setLoginOpen} />
      <MobileSearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
