import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ButtonLink } from "@/components/ui/Button";
import { SCHOOL } from "@/lib/school/schoolCode";

/**
 * Served with a real 404 status when the first segment isn't a school code we
 * know — but a parent who got a slightly wrong link from their school should
 * land somewhere they can still start, not on a bare error. The route sends
 * unknown codes here rather than rendering a page at 200.
 */
export default function SchoolTestNotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-6 py-20 text-center">
        <h1 className="text-h1 font-semibold text-text">
          That link doesn&apos;t look right
        </h1>
        <p className="mt-4 text-lead text-text-secondary">
          The code in it isn&apos;t one we recognise. Check the link your school
          sent — it looks like{" "}
          <span className="font-mono text-body text-text">
            /{SCHOOL.code}-10A/test
          </span>{" "}
          — or start the test without a school code.
        </p>
        <ButtonLink href="/register" variant="accent" size="lg" className="mt-8">
          Start the test
        </ButtonLink>
      </main>
      <SiteFooter />
    </>
  );
}
