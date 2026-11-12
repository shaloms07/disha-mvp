/**
 * Who the counsellor is, for the trust block on the ₹999 card
 * (components/results/CounsellorTrust.tsx). Empty on purpose: while this is
 * null the block renders nothing. Fill it in only with the real counsellor's
 * real, verifiable details - never placeholder or invented credentials.
 *
 * Example once the details are confirmed:
 *   export const COUNSELLOR_PROFILE: CounsellorProfile | null = {
 *     name: "…",
 *     photo: "/counsellor/photo.jpg",      // a file in public/
 *     qualifications: ["…", "…"],
 *     yearsExperience: 12,
 *   };
 */

export interface CounsellorProfile {
  name: string;
  /** Site-relative path to a photo in public/, e.g. "/counsellor/photo.jpg" */
  photo?: string;
  qualifications: string[];
  yearsExperience?: number;
}

export const COUNSELLOR_PROFILE: CounsellorProfile | null = null;
