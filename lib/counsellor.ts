/**
 * Who the counsellor is, for the trust block on the ₹498 card
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

// TODO(Shalom): the real counsellor's name, photo, qualifications and years of
// experience - from the counsellor, never written by us. Null hides the block.
export const COUNSELLOR_PROFILE: CounsellorProfile | null = null;
