import type { ReactNode } from "react";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminAuthGate } from "@/components/admin/AdminAuthGate";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AdminTopBar />
      <AdminAuthGate>{children}</AdminAuthGate>
      <footer className="mt-24 border-t border-hairline px-6 py-8">
        <p className="mx-auto w-full max-w-5xl text-note text-text-muted">
          Internal dashboard — not for parent or student access.
        </p>
      </footer>
    </>
  );
}
