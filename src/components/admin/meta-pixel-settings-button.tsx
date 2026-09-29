"use client";

import { Crosshair } from "lucide-react";
import { useEffect, useState } from "react";

export function MetaPixelSettingsButton() {
  const [open, setOpen] = useState(false);
  const [pixelId, setPixelId] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/admin/meta-pixel", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : Promise.reject(new Error("No se pudo consultar la configuración.")))
      .then((data) => setConfigured(Boolean(data.configured)))
      .catch((error) => setMessage(error instanceof Error ? error.message : "No se pudo consultar la configuración."));
  }, [open]);

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/meta-pixel", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pixelId }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudo guardar la configuración.");
      setPixelId("");
      setConfigured(true);
      setMessage("Configuración guardada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  }

  return <>
    <button type="button" onClick={() => { setMessage(""); setOpen(true); }} className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-[#1877f2]/30 bg-white px-5 text-sm font-bold text-[#1877f2] shadow-[0_8px_20px_rgba(29,24,20,0.06)] transition hover:bg-[#f3f7ff]">
      <Crosshair className="size-4" /> Píxel de Meta
    </button>
    {open ? <div className="fixed inset-0 z-[13000] grid place-items-center bg-black/45 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-[24px] bg-[#fffdfb] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.3)]">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#1877f2]">Meta</p><h2 className="mt-2 text-2xl font-black">Píxel de la tienda</h2></div><button type="button" onClick={() => setOpen(false)} className="rounded-full border border-[var(--pf-border-soft)] px-3 py-1.5 text-sm font-semibold">Cerrar</button></div>
        <p className="mt-4 text-sm text-[var(--pf-muted)]">Estado: {configured === null ? "consultando" : configured ? "configurado" : "sin configurar"}.</p>
        <label className="mt-5 block text-sm font-bold">ID del píxel<input type="text" inputMode="numeric" autoComplete="off" value={pixelId} onChange={(event) => setPixelId(event.target.value.replace(/\D/g, ""))} placeholder="123456789012345" className="mt-2 w-full rounded-xl border border-[var(--pf-border-soft)] bg-white px-4 py-3 font-mono text-sm outline-none focus:border-[#1877f2]" /></label>
        {message ? <p className="mt-3 text-sm text-[var(--pf-muted)]">{message}</p> : null}
        <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-full px-4 py-2 text-sm font-semibold">Cancelar</button><button type="button" disabled={saving || !pixelId.trim()} onClick={save} className="rounded-full bg-[#1877f2] px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">{saving ? "Guardando" : "Guardar"}</button></div>
      </div>
    </div> : null}
  </>;
}
