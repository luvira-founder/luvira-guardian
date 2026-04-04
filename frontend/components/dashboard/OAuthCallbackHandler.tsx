"use client";

import { useEffect } from "react";
import { getMyAccountToken } from "@/lib/getMyAccountToken";
import { completeServiceConnection } from "@/services/api";

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; max-age=0; path=/`;
}

export default function OAuthCallbackHandler() {
  useEffect(() => {
    const connect_code = getCookie("oauth_connect_code");
    if (!connect_code) return;

    deleteCookie("oauth_connect_code");

    const auth_session = sessionStorage.getItem("connect_auth_session");

    if (auth_session) {
      // Full-page redirect fallback (popup was blocked)
      sessionStorage.removeItem("connect_auth_session");
      (async () => {
        const ma_token = await getMyAccountToken();
        if (!ma_token) return;
        await completeServiceConnection({ auth_session, connect_code, ma_token });
      })();
    } else {
      // Popup flow: signal parent via localStorage and close
      localStorage.setItem("oauth_connect_code", connect_code);
      window.close();
    }
  }, []);

  return null;
}
