"use client";

import Image from "next/image";
import Link from "next/link";
import { Search, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import type { DynamicHeaderMenu } from "@/application/catalog";
import { CartButton } from "@/components/cart/cart-button";
import { publicAsset } from "@/lib/catalog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SiteHeaderProps = {
  menus: DynamicHeaderMenu[];
};

function DesktopLoginModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal modal-open z-[11080] hidden lg:block">
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
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.24em] text-[var(--pf-muted)]" htmlFor="desktop-login-email">
              Correo
            </label>
            <input
              id="desktop-login-email"
              name="email"
              type="email"
              placeholder="tu@email.com"
              className="w-full rounded-[1rem] border border-[var(--pf-border)] bg-[rgba(255,255,255,0.92)] px-4 py-3 text-sm outline-none transition focus:border-[var(--pf-primary)]"
            />
          </div>

          <div>
            <label
              className="mb-2 block text-xs font-bold uppercase tracking-[0.24em] text-[var(--pf-muted)]"
              htmlFor="desktop-login-password"
            >
              Contraseña
            </label>
            <input
              id="desktop-login-password"
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
        </form>
      </div>

      <button type="button" className="modal-backdrop" aria-label="Cerrar login" onClick={() => onOpenChange(false)} />
    </div>
  );
}

export function SiteHeader({ menus }: SiteHeaderProps) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  const submitSearch = () => {
    const normalized = searchInputRef.current?.value.trim() ?? "";
    router.push(normalized ? `/busqueda?q=${encodeURIComponent(normalized)}` : "/galeria");
  };

  return (
    <>
      <header className="sticky top-0 z-[10010] hidden lg:block">
        <div className="border-b border-[var(--pf-border)] bg-[rgba(248,242,232,0.96)] shadow-[0_14px_32px_rgba(74,57,38,0.08)] backdrop-blur">
          <div className="pf-shell grid gap-4 px-4 py-4 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-6 lg:px-12">
            <Link
              href="/"
              className="mx-auto flex items-center justify-center rounded-full border-2 border-[rgba(168,109,69,0.32)] bg-[linear-gradient(90deg,rgba(168,109,69,0.20),rgba(200,176,137,0.28),rgba(246,240,230,0.6))] px-4 py-2 shadow-[0_8px_18px_rgba(74,57,38,0.10),inset_0_0_0_1px_rgba(255,255,255,0.10)] lg:mx-0"
            >
              <Image
                src={publicAsset("/assets/images/logo/logo-Pintofruta.png")}
                alt="Pintofruta"
                width={255}
                height={64}
                className="h-auto w-[180px] max-w-full drop-shadow-[0_1px_1px_rgba(0,0,0,0.08)] sm:w-[220px] lg:w-[255px]"
                priority
              />
            </Link>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitSearch();
              }}
              className="w-full"
            >
              <div className="overflow-hidden rounded-full border border-[var(--pf-border)] bg-[var(--pf-surface)] shadow-[var(--pf-shadow-soft)]">
                <div className="flex flex-col sm:flex-row">
                  <Button
                    type="submit"
                    variant="primary"
                    size="icon"
                    className="min-h-[52px] w-full rounded-none sm:w-[52px]"
                    aria-label="Buscar"
                  >
                    <Search className="size-5" />
                  </Button>
                  <Input
                    ref={searchInputRef}
                    type="text"
                    name="q"
                    placeholder="Buscar"
                    className="min-h-[52px] flex-1 rounded-none border-0 bg-transparent px-4 shadow-none focus:ring-0"
                  />
                </div>
              </div>
            </form>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="secondary" size="icon" aria-label="Cuenta" onClick={() => setLoginOpen(true)}>
                <UserRound className="size-4" />
              </Button>
              <CartButton />
              <Link
                href="/admin"
                className={`${buttonVariants({ variant: "primary", size: "md" })} !text-white`}
              >
                Admin demo
              </Link>
            </div>
          </div>
        </div>

        <div className="border-b border-[var(--pf-border-soft)] bg-white/90 shadow-[0_1px_1px_hsla(0,0%,0%,0.06),0_2px_2px_hsla(0,0%,0%,0.06)]">
          <div className="pf-shell px-4 lg:px-12">
            <nav className="grid grid-cols-2 border-x border-[var(--pf-border-soft)] bg-white">
              {menus.map((menu) => (
                <details
                  key={menu.key}
                  className="dropdown dropdown-bottom dropdown-center relative"
                  open={openMenuKey === menu.key}
                  onToggle={(event) => {
                    if (!(event.currentTarget as HTMLDetailsElement).open && openMenuKey === menu.key) {
                      setOpenMenuKey(null);
                    }
                  }}
                >
                  <summary
                    className={`${buttonVariants({ variant: "secondary", size: "md" })} flex min-h-[64px] cursor-pointer list-none justify-center rounded-none border-y border-[var(--pf-border-soft)] bg-white px-4 text-sm font-medium uppercase tracking-[0.18em] hover:bg-[rgba(248,242,232,0.7)] [&::-webkit-details-marker]:hidden`}
                    onClick={(event) => {
                      event.preventDefault();
                      setOpenMenuKey((current) => (current === menu.key ? null : menu.key));
                    }}
                  >
                    {menu.label}
                  </summary>
                  <div className="dropdown-content z-[10060] mt-3 w-[min(92vw,1100px)] rounded-[1.75rem] border border-[var(--pf-border)] bg-[var(--pf-surface)] p-4 shadow-[0_24px_60px_rgba(74,57,38,0.16)]">
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--pf-border-soft)] pb-4">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--pf-muted)]">{menu.label}</p>
                        <p className="text-sm text-[var(--pf-muted)]">Agrupado por letras</p>
                      </div>
                      <Link
                        href={menu.key === "brands" ? "/galeria" : "/galeria"}
                        className="btn btn-ghost btn-sm rounded-full border border-[var(--pf-border)] normal-case"
                      >
                        Ver todo
                      </Link>
                    </div>

                    <div className="mt-4 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
                      {menu.groups.map((group) => (
                        <div key={group.label} className="rounded-[1.25rem] border border-[var(--pf-border-soft)] bg-[rgba(255,255,255,0.55)] p-4">
                          <p className="mb-3 text-sm font-bold uppercase tracking-[0.22em] text-[var(--pf-primary-darker)]">{group.label}</p>
                          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
                            {group.itemsByInitial.map((bucket) => (
                              <div key={bucket.initial} className="h-full rounded-2xl border border-[var(--pf-border-soft)] bg-white/70 p-4">
                                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--pf-muted)]">{bucket.initial}</p>
                                <ul className="space-y-2">
                                  {bucket.items.map((item) => (
                                    <li key={item.href}>
                                      <Link
                                        href={item.href}
                                        onClick={() => setOpenMenuKey(null)}
                                        className="block rounded-xl px-3 py-2 text-sm text-[var(--pf-text)] transition hover:bg-[rgba(168,109,69,0.08)] hover:text-[var(--pf-primary-darker)]"
                                      >
                                        {item.label}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <DesktopLoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
}
