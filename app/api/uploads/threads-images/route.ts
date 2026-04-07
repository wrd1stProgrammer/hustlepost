import crypto from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";

const MAX_IMAGE_COUNT = 3;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

function sanitizeBaseName(name: string) {
  const extension = path.extname(name).toLowerCase();
  const base = path.basename(name, extension).replace(/[^a-zA-Z0-9-_]+/g, "-");
  return base || "image";
}

function buildCloudinarySignature(
  params: Record<string, string>,
  apiSecret: string,
) {
  const serializedParams = Object.entries(params)
    .filter(([, value]) => value.length > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto
    .createHash("sha1")
    .update(`${serializedParams}${apiSecret}`)
    .digest("hex");
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Cloudinary environment variables are missing" },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const files = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File)
    .slice(0, MAX_IMAGE_COUNT);

  if (files.length === 0) {
    return NextResponse.json({ error: "No images provided" }, { status: 400 });
  }

  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported image type: ${file.type}` },
        { status: 400 },
      );
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: `${file.name} exceeds 10MB` },
        { status: 400 },
      );
    }
  }

  const uploaded: { path: string; url: string; name: string }[] = [];

  for (const file of files) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const folder = `threads-post-media/${user.id}`;
    const publicId = `${crypto.randomUUID()}-${sanitizeBaseName(file.name)}`;
    const signature = buildCloudinarySignature(
      {
        folder,
        public_id: publicId,
        timestamp,
      },
      apiSecret,
    );

    const uploadForm = new FormData();
    uploadForm.set("file", file);
    uploadForm.set("api_key", apiKey);
    uploadForm.set("timestamp", timestamp);
    uploadForm.set("signature", signature);
    uploadForm.set("folder", folder);
    uploadForm.set("public_id", publicId);

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: uploadForm,
        cache: "no-store",
      },
    );

    const raw = (await uploadResponse.json().catch(() => null)) as
      | {
          secure_url?: string;
          public_id?: string;
          error?: { message?: string };
        }
      | null;

    if (!uploadResponse.ok || !raw?.secure_url || !raw.public_id) {
      return NextResponse.json(
        {
          error:
            raw?.error?.message ||
            "Cloudinary image upload failed",
        },
        { status: 500 },
      );
    }

    uploaded.push({
      path: raw.public_id,
      url: raw.secure_url,
      name: file.name,
    });
  }

  return NextResponse.json({ images: uploaded });
}
