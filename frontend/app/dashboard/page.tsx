import { auth0 } from "@/lib/auth0";
import TestHarness from "@/components/dashboard/test-harness";

export default async function DashboardPage() {
  const session = await auth0.getSession();
  let accessToken: string | null = null;
  let jwtClaims = "{}";

  try {
    const result = await auth0.getAccessToken();
    accessToken = result.token;
    jwtClaims = JSON.stringify(session!.user, null, 2);
  } catch {
    jwtClaims = JSON.stringify(session?.user ?? {}, null, 2);
  }

  return (
    <TestHarness
      user={session!.user}
      accessToken={accessToken}
      jwtClaims={jwtClaims}
    />
  );
}
