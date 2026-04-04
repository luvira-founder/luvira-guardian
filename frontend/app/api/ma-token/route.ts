import { auth0 } from "@/lib/auth0";
import { NextResponse } from "next/server";

const MY_ACCOUNT_AUDIENCE = `https://${process.env.AUTH0_DOMAIN}/me/`;
const MY_ACCOUNT_SCOPE =
  "create:me:connected_accounts read:me:connected_accounts delete:me:connected_accounts";

export async function GET() {
  try {
    const { token } = await auth0.getAccessToken({
      audience: MY_ACCOUNT_AUDIENCE,
      scope: MY_ACCOUNT_SCOPE,
    });
    if (!token) {
      return NextResponse.json({ error: "no_token" }, { status: 401 });
    }
    return NextResponse.json({ ma_token: token });
  } catch {
    // Token not available for this audience — client must re-authenticate
    return NextResponse.json({ error: "consent_required" }, { status: 401 });
  }
}
