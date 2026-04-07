function getPrimaryHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function getOriginFromHeaders(
  headers: Headers,
  fallbackUrl?: string,
) {
  const forwardedHost =
    getPrimaryHeaderValue(headers.get("x-forwarded-host")) ??
    getPrimaryHeaderValue(headers.get("host"));

  if (!forwardedHost) {
    return fallbackUrl ? new URL(fallbackUrl).origin : null;
  }

  const fallbackProto = fallbackUrl
    ? new URL(fallbackUrl).protocol.replace(":", "")
    : "http";
  const forwardedProto =
    getPrimaryHeaderValue(headers.get("x-forwarded-proto")) ?? fallbackProto;

  return `${forwardedProto}://${forwardedHost}`;
}

export function getAppOrigin(input?: Request | Headers) {
  const appUrl = process.env.APP_URL;

  if (input instanceof Request) {
    return (
      getOriginFromHeaders(input.headers, input.url) ??
      (appUrl ? new URL(appUrl).origin : null) ??
      new URL(input.url).origin
    );
  }

  if (input instanceof Headers) {
    return (
      getOriginFromHeaders(input, appUrl) ??
      (appUrl ? new URL(appUrl).origin : null) ??
      "http://127.0.0.1:3000"
    );
  }

  return appUrl ? new URL(appUrl).origin : "http://127.0.0.1:3000";
}

export function buildAppUrl(pathname: string, request?: Request) {
  return new URL(pathname, getAppOrigin(request));
}
