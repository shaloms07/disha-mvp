import { COUNSELLOR_PROFILE, type CounsellorProfile } from "@/lib/counsellor";

/**
 * The counsellor behind the call, on the ₹999 card. Reads lib/counsellor.ts's
 * one config object and renders nothing while it's empty - so there is never
 * a placeholder name or made-up credential on the page.
 */
export function CounsellorTrust({ profile = COUNSELLOR_PROFILE }: { profile?: CounsellorProfile | null }) {
  if (!profile?.name) return null;

  const details = [
    ...profile.qualifications,
    ...(profile.yearsExperience ? [`${profile.yearsExperience} years' experience`] : []),
  ];

  return (
    <span className="mt-3 flex items-center gap-3">
      {profile.photo && (
        // A plain <img>: one small local photo, no need for next/image here
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.photo}
          alt=""
          width={48}
          height={48}
          className="size-12 shrink-0 rounded-full object-cover"
        />
      )}
      <span className="block text-note text-text-secondary">
        <span className="block font-semibold text-text">{profile.name}</span>
        {details.join(" · ")}
      </span>
    </span>
  );
}
