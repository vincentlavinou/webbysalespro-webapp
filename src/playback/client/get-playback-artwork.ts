import { WebinarMediaFieldType } from "@/media";
import type { WebinarMedia } from "@/media";

export function getPlaybackArtwork(
  media: WebinarMedia[] | null | undefined,
): MediaImage[] {
  const mediaItems = Array.isArray(media) ? media : [];

  return mediaItems
    .filter(
      (item) =>
        item.file_type === "image" &&
        item.field_type === WebinarMediaFieldType.THUMBNAIL &&
        typeof item.file_url === "string" &&
        item.file_url.length > 0,
    )
    .map((item) => ({ src: item.file_url }));
}
