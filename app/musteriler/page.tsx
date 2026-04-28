/**
 * Müşteri arama sayfası — ISS Manager v2 /customers proxy üzerinden.
 *
 * KVKK: gelen sonuçlar API tarafında maskeli olduğundan ek bir maskeye
 * gerek yok. Sayfada bilgilendirme notu var.
 */
import Link from "next/link";
import { SearchForm } from "./search-form";

export const metadata = {
  title: "Müşteri Arama · crmanaliz",
};

export default function MusterilerPage(): React.ReactElement {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12 md:px-10 md:py-16">
      <header className="mb-8 flex flex-col gap-1">
        <Link
          href="/"
          className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--color-fg-3)] hover:text-[color:var(--color-fg-1)]"
        >
          ← Genel Duruma dön
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-[var(--tracking-tighter)] text-[color:var(--color-fg-0)] md:text-4xl">
          Müşteri Arama
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-fg-2)]">
          ISS Manager üzerinde isim, soyisim, telefon veya e-posta ile
          arama yapın.
        </p>
      </header>

      <SearchForm />
    </main>
  );
}
