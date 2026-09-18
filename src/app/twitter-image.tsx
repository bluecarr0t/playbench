import {
  createPlaybenchShareImage,
  shareImageAlt,
  shareImageContentType,
  shareImageSize,
} from "@/lib/playbench-share-image";

export const alt = shareImageAlt;
export const size = shareImageSize;
export const contentType = shareImageContentType;

export default function Image() {
  return createPlaybenchShareImage();
}
