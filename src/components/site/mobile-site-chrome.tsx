"use client";

import Image from "next/image";
import Link from "next/link";
import { House, Menu, UserRound } from "lucide-react";
import { useState } from "react";

import type { DynamicHeaderMenu } from "@/application/catalog";
import { MobileCartButton } from "@/components/cart/mobile-cart-button";
import { buttonVariants } from "@/components/ui/button";
import { publicAsset } from "@/lib/catalog";
import { MobileHeaderDrawer } from "@/components/site/mobile-header-drawer";

type MobileSiteChromeProps = {
  menus: DynamicHeaderMenu[];
};

export function MobileSiteChrome({ menus }: MobileSiteChromeProps) {
  const [menuOpen, setMenuOpen] = useState(false);

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
        <div className="pf-shell grid h-[72px] grid-cols-3 items-center px-4">
          <Link
            href="/admin"
            className="flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--pf-muted)] transition hover:text-[var(--pf-primary-darker)]"
          >
            <UserRound className="size-5" />
            Login
          </Link>

          <Link
            href="/"
            className="flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--pf-muted)] transition hover:text-[var(--pf-primary-darker)]"
          >
            <House className="size-5" />
            Home
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className={`${buttonVariants({ variant: "ghost", size: "sm" })} flex h-full flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--pf-muted)] transition hover:text-[var(--pf-primary-darker)]`}
            aria-label="Abrir menú"
          >
            <Menu className="size-5" />
            Menú
          </button>
        </div>
      </div>

      <MobileHeaderDrawer menus={menus} open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
}
