import { notFound } from "next/navigation";
import { SchoolTestEntry } from "@/components/school/SchoolTestEntry";
import { resolveSchoolCode } from "@/lib/school/schoolCode";

/* -------------------------------------------------------------------------
   /BVMNGP26-10A/test  — the school-branded entry link.

   This is the only route in the app with a dynamic segment at the site root,
   so it is deliberately narrow. It matches `/<something>/test` and nothing
   else, and the code is validated here on the server before anything renders:
   a first segment that is not a real school code gets a genuine 404, not a
   page. Every other route in the app is static, and Next matches static
   segments before dynamic ones, so /register, /test, /school and the rest are
   unaffected by its existence.

   Validation is deliberately strict on both halves. "BVMNGP26-12Z" names a
   section this school does not have, and is rejected rather than quietly
   downgraded to the bare school — silently dropping the section would leave
   the student invisible to their class teacher without anyone being told.
   ------------------------------------------------------------------------- */

export default async function SchoolTestEntryPage({
  params,
}: {
  params: Promise<{ schoolCode: string }>;
}) {
  const { schoolCode } = await params;

  if (!resolveSchoolCode(schoolCode)) notFound();

  return <SchoolTestEntry schoolCode={schoolCode} />;
}
