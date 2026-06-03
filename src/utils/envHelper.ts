export const DOMAINS = {
  PRODUCTION_FRONTEND: 'admissionhands.com',
  PRODUCTION_ADMIN: 'admin.admissionhands.com',
  UAT_FRONTEND: 'uat.admissionhands.com',
  UAT_ADMIN: 'admin-uat.admissionhands.com',
};

export function getCleanHostname(hostname: string): string {
  if (!hostname) return '';
  return hostname.split(':')[0].toLowerCase();
}

export function isWorkersDev(hostname: string): boolean {
  return getCleanHostname(hostname).endsWith('workers.dev');
}

export function isLocalDev(hostname: string): boolean {
  const clean = getCleanHostname(hostname);
  return clean.includes('localhost') || clean.includes('127.0.0.1') || clean.endsWith('.local');
}

export function isUatFrontend(hostname: string): boolean {
  return getCleanHostname(hostname) === DOMAINS.UAT_FRONTEND;
}

export function isUatAdmin(hostname: string): boolean {
  return getCleanHostname(hostname) === DOMAINS.UAT_ADMIN;
}

export function isProdFrontend(hostname: string): boolean {
  const clean = getCleanHostname(hostname);
  return clean === DOMAINS.PRODUCTION_FRONTEND || clean === `www.${DOMAINS.PRODUCTION_FRONTEND}`;
}

export function isProdAdmin(hostname: string): boolean {
  return getCleanHostname(hostname) === DOMAINS.PRODUCTION_ADMIN;
}

/**
 * Detects if the current host is an admin subdomain (production admin or UAT admin)
 */
export function isAdminSubdomain(hostname: string): boolean {
  const clean = getCleanHostname(hostname);
  return clean === DOMAINS.PRODUCTION_ADMIN || clean === DOMAINS.UAT_ADMIN;
}

/**
 * Returns the base website domain for the current environment.
 * Useful for "Back to Website" links.
 */
export function getBaseWebsiteUrl(hostname: string): string {
  const clean = getCleanHostname(hostname);
  
  if (isLocalDev(clean)) {
    return 'http://localhost:3000';
  }
  if (isWorkersDev(clean)) {
    // For workers.dev, keep it on the same workers.dev domain
    return `https://${clean}`;
  }
  if (isUatAdmin(clean) || isUatFrontend(clean)) {
    return `https://${DOMAINS.UAT_FRONTEND}`;
  }
  // Default to production domain
  return `https://${DOMAINS.PRODUCTION_FRONTEND}`;
}

/**
 * Returns the admin subdomain/path redirect target for the current environment.
 */
export function getAdminRedirectUrl(hostname: string, pathname: string = '/'): string {
  const clean = getCleanHostname(hostname);
  const targetPath = pathname.replace(/^\/admin/, '') || '/';
  
  if (isLocalDev(clean) || isWorkersDev(clean) || isUatFrontend(clean)) {
    // No subdomain redirects for local dev, workers.dev, or UAT frontend; keep on the same host under /admin
    return `/admin${targetPath}`;
  }
  if (isUatAdmin(clean)) {
    return `https://${DOMAINS.UAT_ADMIN}${targetPath}`;
  }
  // Production
  return `https://${DOMAINS.PRODUCTION_ADMIN}${targetPath}`;
}
