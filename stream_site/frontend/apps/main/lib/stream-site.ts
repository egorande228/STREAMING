interface ResolveStreamSiteURLArgs {
  configuredBaseURL?: string;
  currentOrigin?: string;
  primaryMirrorDomain?: string;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function resolveStreamSiteURL({
  configuredBaseURL,
  currentOrigin,
  primaryMirrorDomain,
}: ResolveStreamSiteURLArgs): string {
  if (configuredBaseURL && configuredBaseURL.trim()) {
    return trimTrailingSlash(configuredBaseURL.trim());
  }

  if (primaryMirrorDomain && primaryMirrorDomain.trim()) {
    let protocol = 'https:';
    if (currentOrigin) {
      try {
        protocol = new URL(currentOrigin).protocol;
      } catch {
        protocol = 'https:';
      }
    }
    return `${protocol}//${primaryMirrorDomain.trim()}`;
  }

  return currentOrigin ? trimTrailingSlash(currentOrigin) : '';
}
