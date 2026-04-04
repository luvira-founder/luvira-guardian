"use client";

import { useConnectService, useCompleteServiceConnection } from "@/services/mutations";
import { getMyAccountToken } from "@/lib/getMyAccountToken";
import { checkServicesConnectionStatus } from "@/services/api";
import { TConnection, TServiceStatus } from "@/services/types";

export function useServiceConnect() {
  const { mutateAsync: connectServiceMutation } = useConnectService();
  const { mutateAsync: completeConnection } = useCompleteServiceConnection();

  const connect = async (
    connection: TConnection,
    scopes: string[],
    onConnected?: (statuses: TServiceStatus[]) => void,
  ) => {
    const ma_token = await getMyAccountToken();
    if (!ma_token) return;

    const data = await connectServiceMutation({ connection, scopes, ma_token });

    const connectUrl = `${data.connect_uri}?ticket=${data.connect_params.ticket}`;
    const { width, height } = { width: 600, height: 700 };
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      connectUrl,
      "auth0_connect",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`,
    );

    if (!popup) {
      sessionStorage.setItem("connect_auth_session", data.auth_session);
      window.location.href = connectUrl;
      return;
    }

    const handleStorage = async (event: StorageEvent) => {
      if (event.key !== "oauth_connect_code" || !event.newValue) return;
      window.removeEventListener("storage", handleStorage);
      localStorage.removeItem("oauth_connect_code");
      const fresh_ma_token = await getMyAccountToken();
      if (!fresh_ma_token) return;
      await completeConnection({
        auth_session: data.auth_session,
        connect_code: event.newValue,
        ma_token: fresh_ma_token,
      });
      if (onConnected) {
        const { services } = await checkServicesConnectionStatus();
        onConnected(services);
      }
    };
    window.addEventListener("storage", handleStorage);
  };

  return { connect };
}
