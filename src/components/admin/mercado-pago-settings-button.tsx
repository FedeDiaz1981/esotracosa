"use client";

import { CreditCard } from "lucide-react";
import { useEffect, useState } from "react";

export function MercadoPagoSettingsButton() {
  const [open, setOpen] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/admin/mercado-pago", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : Promise.reject(new Error("No se pudo consultar la configuración.")))
      .then((data) => setConfigured(Boolean(data.configured)))
      .catch((error) => setMessage(error instanceof Error ? error.message : "No se pudo consultar la configuración."));
  }, [open]);

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/mercado-pago", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudo guardar la configuración.");
      setAccessToken("");
      setConfigured(true);
      setMessage("Configuración guardada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  }

  return <>
    <button type="button" onClick={() => { setMessage(""); setOpen(true); }} className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-[rgba(0,158,227,0.3)] bg-white px-5 text-sm font-bold text-[#007eb5] shadow-[0_8px_20px_rgba(29,24,20,0.06)] transition hover:bg-[#f0fbff]">
      <CreditCard className="size-4" /> Mercado Pago
    </button>
    {open ? <div className="fixed inset-0 z-[13000] grid place-items-center bg-black/45 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-[24px] bg-[#fffdfb] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.3)]">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#007eb5]">Mercado Pago</p><h2 className="mt-2 text-2xl font-black">Cuenta de cobro</h2></div><button type="button" onClick={() => setOpen(false)} className="rounded-full border border-[var(--pf-border-soft)] px-3 py-1.5 text-sm font-semibold">Cerrar</button></div>
        <p className="mt-4 text-sm text-[var(--pf-muted)]">Estado: {configured === null ? "consultando" : configured ? "configurada" : "sin configurar"}.</p>
        <label className="mt-5 block text-sm font-bold">Access Token<input type="password" autoComplete="off" value={accessToken} onChange={(event) => setAccessToken(event.target.value)} placeholder="APP_USR-..." className="mt-2 w-full rounded-xl border border-[var(--pf-border-soft)] bg-white px-4 py-3 font-mono text-sm outline-none focus:border-[#009ee3]" /></label>
        {message ? <p className="mt-3 text-sm text-[var(--pf-muted)]">{message}</p> : null}
        <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-full px-4 py-2 text-sm font-semibold">Cancelar</button><button type="button" disabled={saving || !accessToken.trim()} onClick={save} className="rounded-full bg-[#009ee3] px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">{saving ? "Guardando" : "Guardar"}</button></div>
      </div>
    </div> : null}
  </>;
}
