const LOCAL_DEVELOPMENT_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function createEmailActionContinueUrl(origin: string) {
  return new URL("/login", origin).toString();
}

export function resolveEmailActionReturnUrl(
  continueUrl: string | null,
  fallback = "/login",
  allowedOrigins: readonly string[] = []
) {
  if (!continueUrl) return fallback;

  try {
    const url = new URL(continueUrl);
    const isSecure = url.protocol === "https:";
    const isLocalDevelopment =
      url.protocol === "http:" && LOCAL_DEVELOPMENT_HOSTS.has(url.hostname);

    if ((!isSecure && !isLocalDevelopment) || url.username || url.password) {
      return fallback;
    }

    const normalizedAllowedOrigins = new Set(
      allowedOrigins.flatMap(origin => {
        try {
          return [new URL(origin).origin];
        } catch {
          return [];
        }
      })
    );
    if (!isLocalDevelopment && !normalizedAllowedOrigins.has(url.origin)) {
      return fallback;
    }

    url.pathname = "/login";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return fallback;
  }
}
