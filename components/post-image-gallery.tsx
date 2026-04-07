type PostImageGalleryProps = {
  imageUrls?: string[] | null;
};

export function PostImageGallery({ imageUrls }: PostImageGalleryProps) {
  const urls =
    imageUrls
      ?.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .slice(0, 3) ?? [];

  if (urls.length === 0) {
    return null;
  }

  const gridClassName =
    urls.length === 1
      ? "grid-cols-1"
      : urls.length === 2
        ? "grid-cols-2"
        : "grid-cols-2";

  return (
    <div className={`mt-4 grid gap-2 ${gridClassName}`}>
      {urls.map((imageUrl, index) => (
        <a
          key={`${imageUrl}-${index}`}
          href={imageUrl}
          target="_blank"
          rel="noreferrer noopener"
          className={`block overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${
            urls.length === 3 && index === 0 ? "row-span-2 min-h-[192px]" : "min-h-[92px]"
          }`}
          aria-label={`Open post image ${index + 1}`}
        >
          <div
            className="h-full w-full bg-cover bg-center transition hover:scale-[1.02]"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
        </a>
      ))}
    </div>
  );
}
