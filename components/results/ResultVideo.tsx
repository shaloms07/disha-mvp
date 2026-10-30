import { Card } from "@/components/ui/Card";
import { RESULT_VIDEOS_AI_ASSISTED } from "@/lib/resultsPageConfig";

/**
 * The personal "your result explained" video, chosen from
 * lib/resultsPageConfig.ts's RESULT_VIDEOS by the child's top two types. The
 * caller only renders this when a video exists for that result. Never
 * autoplays - phones block autoplay with sound, and a parent should choose
 * to press play.
 */
export function ResultVideo({ src, caption }: { src: string; caption: string }) {
  const embed = /youtube\.com\/embed|youtube-nocookie\.com\/embed|player\.vimeo\.com/.test(src);

  return (
    <Card className="mt-6">
      <div className="aspect-video overflow-hidden rounded-lg bg-brand-800">
        {embed ? (
          <iframe
            src={src}
            title={caption}
            className="size-full"
            allow="encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video src={src} controls playsInline preload="metadata" className="size-full" />
        )}
      </div>
      <p className="mt-3 text-note text-text-muted">
        {caption}
        {RESULT_VIDEOS_AI_ASSISTED ? " · AI-assisted" : ""}
      </p>
    </Card>
  );
}
