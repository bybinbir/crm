import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Giriş · crmanaliz" };
export const dynamic = "force-dynamic";

export default async function GirisPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}): Promise<React.ReactElement> {
  const params = await searchParams;
  const sess = await getSession();
  if (sess) {
    redirect(params.next && params.next.startsWith("/") ? params.next : "/");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-12">
      <header className="mb-8 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--color-fg-3)]">
          binbirnet
        </p>
        <h1 className="text-3xl font-semibold tracking-[var(--tracking-tighter)] text-[color:var(--color-fg-0)]">
          crmanaliz Girişi
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-fg-2)]">
          Operatör hesabınızla giriş yapın.
        </p>
      </header>
      <LoginForm {...(params.next ? { next: params.next } : {})} />
      <footer className="mt-12 text-xs text-[color:var(--color-fg-3)]">
        KVKK kapsamında — her giriş audit log&apos;una yazılır.
      </footer>
    </main>
  );
}
