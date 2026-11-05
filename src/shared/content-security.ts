export const appPolicy =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' ws://127.0.0.1:*; frame-src 'self' http://127.0.0.1:*; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'none'";

// Only the bundled legacy simulator needs its interpreter and inline scripts.
export const gearsPolicy =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob:; worker-src 'self' blob:; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'";

const lanPolicy =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

export function lanAssetPolicy(pathname: string) {
  return pathname.startsWith('/gears/') ? `${gearsPolicy}; frame-ancestors 'self'` : lanPolicy;
}
