import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgePercent, CreditCard, RefreshCcw, Truck } from "lucide-react";

import { publicAsset } from "@/lib/catalog";

function accentWord(word: string, index: number) {
  const clean = word.trim();

  if (!clean) {
    return null;
  }

  const first = clean[0] ?? "";
  const rest = clean.slice(1);

  return (
    <span key={`${clean}-${index}`} className="inline-flex text-[#fbf8f2]">
      <span className="text-[#fbf8f2]">{first.toUpperCase()}</span>
      <span className="text-[#fbf8f2]">{rest}</span>
    </span>
  );
}

function accentSentence(text: string) {
  const words = text.split(/\s+/).filter(Boolean);

  return words.map((word, index) => (
    <span key={`${word}-${index}`} className="inline-flex items-baseline text-[#fbf8f2]">
      {accentWord(word, index)}
      {index < words.length - 1 ? <span className="w-[0.3em]" /> : null}
    </span>
  ));
}

export function SiteFooter() {
  const commercialLinks = [
    {
      icon: Truck,
      title: "Envios",
      text: "Coordinamos entrega segun zona, volumen y tipo de producto.",
      href: "/galeria",
    },
    {
      icon: CreditCard,
      title: "Medios de pago",
      text: "Tarjeta, transferencia y combinaciones de pago segun la compra.",
      href: "/galeria",
    },
    {
      icon: BadgePercent,
      title: "Cuotas",
      text: "Opciones de financiamiento visibles para decidir mas rapido.",
      href: "/galeria",
    },
    {
      icon: RefreshCcw,
      title: "Cambios y devoluciones",
      text: "Una politica clara para comprar con tranquilidad y mejor experiencia postventa.",
      href: "/galeria",
    },
  ];

  return (
    <footer className="hidden border-t-2 border-[#e7c56a] bg-[#050505] text-[#fbf8f2] lg:block">
      <div className="bg-white">
        <div className="pf-shell grid gap-px bg-[rgba(212,168,26,0.12)] md:grid-cols-2 xl:grid-cols-4">
          {commercialLinks.map(({ icon: Icon, title, text, href }) => (
            <Link
              key={title}
              href={href}
              className="group flex min-h-[108px] items-start gap-4 bg-white px-5 py-5 text-[var(--pf-text)] transition hover:bg-[rgba(250,246,238,0.9)]"
            >
              <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[rgba(200,154,21,0.12)] text-[var(--pf-text)] transition group-hover:scale-[1.03] group-hover:bg-[rgba(200,154,21,0.18)]">
                <Icon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-[13px] font-black uppercase tracking-[0.06em] text-[var(--pf-text)]">{title}</h2>
                  <ArrowRight className="size-3.5 text-[var(--pf-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--pf-primary-darker)]" />
                </div>
                <p className="mt-1 text-sm leading-6 text-[var(--pf-muted)]">{text}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="h-[2px] bg-[#e7c56a]" />

      <div className="pf-shell grid gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_.9fr_.9fr] lg:px-12">
        <div className="max-w-[22rem]">
          <Image
            src={publicAsset("/assets/images/logo/logo_v2.png")}
            alt="Pintofruta"
            width={83}
            height={21}
            className="h-auto w-[58px] sm:w-[71px]"
          />

          <p className="mt-5 text-sm leading-6 text-[#fbf8f2]">
            {accentSentence("Diseño, fabricación y presencia editorial para espacios que piden carácter.")}
          </p>
        </div>

        <div>
          <h3 className="mb-4 text-[11px] font-black uppercase tracking-[0.34em] text-[#fbf8f2]">
            {accentSentence("Navegación")}
          </h3>

          <ul className="space-y-3 text-sm text-[#fbf8f2]">
            <li>
              <Link href="/" className="text-[#fbf8f2] transition hover:text-[#e7c56a]">
                {accentSentence("Inicio")}
              </Link>
            </li>
            <li>
              <Link href="/galeria" className="text-[#fbf8f2] transition hover:text-[#e7c56a]">
                {accentSentence("Galería")}
              </Link>
            </li>
            <li>
              <Link href="/busqueda" className="text-[#fbf8f2] transition hover:text-[#e7c56a]">
                {accentSentence("Búsqueda")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-[11px] font-black uppercase tracking-[0.34em] text-[#fbf8f2]">
            {accentSentence("Contacto")}
          </h3>

          <ul className="space-y-3 text-sm text-[#fbf8f2]">
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#e7c56a]" />
              <span>{accentSentence("Showroom con atención personalizada")}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#e33226]" />
              <span>{accentSentence("Instagram y WhatsApp")}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#e7c56a]" />
              <span>{accentSentence("Consultas y asesoramiento")}</span>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
