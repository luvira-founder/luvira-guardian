const MY_ACCOUNT_AUDIENCE = `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/me/`;
const MY_ACCOUNT_SCOPE =
  "openid create:me:connected_accounts read:me:connected_accounts delete:me:connected_accounts offline_access";

export async function getMyAccountToken(): Promise<string | null> {
  // Equivalent to getTokenSilently — ask the server to return the cached token
  const res = await fetch("/api/ma-token");

  if (res.ok) {
    const { ma_token } = await res.json();
    if (ma_token) {
      console.log("My Account token obtained silently");
      return ma_token;
    }
  }

  // Equivalent to loginWithPopup — redirect to login with the /me/ audience
  console.log("Silent failed, redirecting to login for My Account audience...");
  const params = new URLSearchParams({
    audience: MY_ACCOUNT_AUDIENCE,
    scope: MY_ACCOUNT_SCOPE,
    returnTo: window.location.pathname,
  });
  window.location.href = `/api/auth/login?${params}`;
  return null;
}
