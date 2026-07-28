"use client";

import { useActionState, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { loginAction, logoutAction, type LoginActionState } from "@/app/auth/actions";
import { useViewer } from "@/components/auth/viewer-provider";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const initialState: LoginActionState = {};

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const viewer = useViewer();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  const currentPath = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const returnTo = pathname.startsWith("/admin") ? "/" : currentPath;

  if (!open) {
    return null;
  }

  return (
    <div className="modal modal-open !z-[12050] items-start pt-[96px] lg:pt-[136px]">
      <div className="modal-box w-[min(92vw,26rem)] max-w-none overflow-hidden rounded-[2rem] border border-[var(--pf-border-warm)] bg-[var(--pf-surface)] p-0 text-[var(--pf-text)] shadow-[0_30px_80px_rgba(74,57,38,0.26)]">
        <div className="flex items-center justify-between border-b border-[rgba(168,109,69,0.12)] px-5 py-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[var(--pf-muted)]">Acceso</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[var(--pf-text)]">
              {viewer ? "Mi cuenta" : "Iniciar sesión"}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={`${buttonVariants({ variant: "secondary", size: "icon" })} h-10 w-10 rounded-full`}
            aria-label="Cerrar acceso"
          >
            <X className="size-5" />
          </button>
        </div>

        {!viewer ? (
          <form action={formAction} className="space-y-4 px-5 py-5">
            <input type="hidden" name="returnTo" value={returnTo} />

            <div>
              <label
                className="mb-2 block text-xs font-bold uppercase tracking-[0.24em] text-[var(--pf-muted)]"
                htmlFor="auth-email"
              >
                Correo
              </label>
              <Input
                id="auth-email"
                name="email"
                type="email"
                placeholder="tu@email.com"
                className="min-h-[52px] rounded-[1rem] border border-[var(--pf-border)] bg-[rgba(255,255,255,0.92)] px-4 text-sm outline-none transition focus:border-[var(--pf-primary)]"
              />
            </div>

            <div>
              <label
                className="mb-2 block text-xs font-bold uppercase tracking-[0.24em] text-[var(--pf-muted)]"
                htmlFor="auth-password"
              >
                Contraseña
              </label>
              <Input
                id="auth-password"
                name="password"
                type="password"
                placeholder="••••••••"
                className="min-h-[52px] rounded-[1rem] border border-[var(--pf-border)] bg-[rgba(255,255,255,0.92)] px-4 text-sm outline-none transition focus:border-[var(--pf-primary)]"
              />
            </div>

            {state.error ? (
              <p className="rounded-2xl border border-[rgba(216,75,57,0.22)] bg-[rgba(216,75,57,0.08)] px-4 py-3 text-sm font-medium text-[#9c2c1d]">
                {state.error}
              </p>
            ) : null}

            <div className="grid gap-3 pt-2">
              <button type="submit" className={buttonVariants({ variant: "primary", size: "md" })} disabled={isPending}>
                {isPending ? "Ingresando..." : "Entrar"}
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className={buttonVariants({ variant: "secondary", size: "md" })}
              >
                Cerrar
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 px-5 py-5">
            <div className="rounded-[1.35rem] border border-[var(--pf-border)] bg-[rgba(255,255,255,0.85)] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[var(--pf-muted)]">Sesión activa</p>
              <p className="mt-2 text-lg font-black text-[var(--pf-text)]">{viewer.name}</p>
              <p className="mt-1 text-sm text-[var(--pf-muted)]">{viewer.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-[rgba(168,109,69,0.12)] px-3 py-1 text-xs font-semibold text-[var(--pf-primary-darker)]">
                  {viewer.role}
                </span>
                {viewer.isAdmin ? (
                  <span className="rounded-full bg-[rgba(74,125,82,0.12)] px-3 py-1 text-xs font-semibold text-[var(--pf-success)]">
                    Administrador
                  </span>
                ) : (
                  <span className="rounded-full bg-[rgba(168,109,69,0.08)] px-3 py-1 text-xs font-semibold text-[var(--pf-muted)]">
                    Cliente
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-3 pt-2">
              {viewer.isAdmin ? (
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className={`${buttonVariants({ variant: "primary", size: "md" })} w-full`}
                >
                  Administración
                </button>
              ) : null}
              <form action={logoutAction}>
                <input type="hidden" name="returnTo" value={returnTo} />
                <button type="submit" className={`${buttonVariants({ variant: "secondary", size: "md" })} w-full`}>
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      <button type="button" className="modal-backdrop" aria-label="Cerrar acceso" onClick={() => onOpenChange(false)} />
    </div>
  );
}
