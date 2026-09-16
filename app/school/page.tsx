import { redirect } from "next/navigation";

/**
 * /school has no landing page of its own yet — the role switcher (Section 5)
 * is what moves between dashboards, and Principal is the default view.
 */
export default function SchoolIndexPage() {
  redirect("/school/principal");
}
