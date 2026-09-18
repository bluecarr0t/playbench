import Link from "next/link";
import { GalleryViewToggle } from "@/components/gallery/gallery-view-toggle";
import { galleryBorderClass } from "@/lib/gallery-theme";
import type { GalleryViewMode } from "@/lib/gallery-url";

type GalleryChromeHeaderProps = {
  viewMode: GalleryViewMode;
  onViewModeChange: (mode: GalleryViewMode) => void;
};

export function GalleryChromeHeader({
  viewMode,
  onViewModeChange,
}: GalleryChromeHeaderProps) {
  return (
    <header className={`shrink-0 border-b px-5 py-3 md:px-8 ${galleryBorderClass}`}>
      <div className="flex items-center justify-between gap-3">
        <GalleryViewToggle mode={viewMode} onChange={onViewModeChange} />
        <Link
          href="/"
          className="font-mono text-[11px] tracking-[0.22em] text-white/45 uppercase transition hover:text-white"
        >
          ← Playbench
        </Link>
      </div>
    </header>
  );
}
