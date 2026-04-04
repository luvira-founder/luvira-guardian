"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { checkServicesConnectionStatus } from "@/services/api";
import { TConnection } from "@/services/types";
import { useServiceConnect } from "@/hooks/useServiceConnect";
import { useDisconnectService } from "@/services/mutations";
import { getMyAccountToken } from "@/lib/getMyAccountToken";
import { Button } from "@/components/ui/button";

type ConnectionState = "connected" | "disconnected";

interface Service {
  id: string;
  name: string;
  description: string;
  status: ConnectionState;
  scopes: string[];
  logo: string;
}

const INITIAL_SERVICES: Service[] = [
  {
    id: "gitlab",
    name: "GitLab",
    description: "Source code and incident issue tracking",
    status: "disconnected",
    scopes: ["read_api", "write_api"],
    logo: "/gitlab-logo.svg",
  },
  {
    id: "sign-in-with-slack",
    name: "Slack",
    description: "Team notifications and alerts",
    status: "disconnected",
    scopes: ["chat:write"],
    logo: "/slack-logo.svg",
  },
  {
    id: "google-oauth2",
    name: "Google Calendar",
    description: "Schedule follow-up meetings and reminders",
    status: "disconnected",
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
    logo: "/google-calendar.svg",
  },
];

function ServiceCard({
  service,
  isConnecting,
  onRevoke,
  onConnect,
}: {
  service: Service;
  isConnecting: boolean;
  onRevoke: (id: string) => void;
  onConnect: (id: string) => void;
}) {
  const isConnected = service.status === "connected";

  return (
    <div
      className={`bg-white border rounded-md p-6 flex flex-col gap-5 shadow-sm transition-colors duration-300 ${
        isConnected ? "border-green-200" : "border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-1.5 rounded-md transition-colors duration-300 ${isConnected ? "bg-green-50" : "bg-gray-50"}`}
          >
            <Image
              src={service.logo}
              alt={`${service.name} logo`}
              width={service.id === "sign-in-with-slack" ? 28 : 22}
              height={service.id === "sign-in-with-slack" ? 28 : 22}
            />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-gray-900">
              {service.name}
            </h3>
            <p className="text-[12px] text-gray-400 mt-0.5">
              {service.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isConnecting ? (
            <span className="w-3 h-3 rounded-full border-2 border-[#3bcaca] border-t-transparent animate-spin" />
          ) : (
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${isConnected ? "bg-green-500" : "bg-gray-300"}`}
            />
          )}
          <span
            className={`text-[12px] font-medium ${
              isConnecting
                ? "text-[#3bcaca]"
                : isConnected
                  ? "text-green-600"
                  : "text-gray-400"
            }`}
          >
            {isConnecting
              ? "Connecting…"
              : isConnected
                ? "Connected"
                : "Not Connected"}
          </span>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2">
          Granted Scopes
        </p>
        {isConnected && service.scopes.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {service.scopes.map((scope) => (
              <span
                key={scope}
                className="px-2 py-0.5 bg-green-50 border border-green-100 rounded-md text-[11px] text-green-700 font-mono"
              >
                {scope}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-gray-400 italic">No scopes granted</p>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        {isConnected ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onRevoke(service.id)}
            disabled={isConnecting}
            className="text-[12px] font-medium rounded-lg"
          >
            {isConnecting ? "Disconnecting…" : "Disconnect"}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => onConnect(service.id)}
            disabled={isConnecting}
            className="text-[12px] font-medium rounded-lg bg-[#3bcaca] hover:bg-[#2db8b8] text-white"
          >
            {isConnecting ? "Connecting…" : "Connect"}
          </Button>
        )}
      </div>
    </div>
  );
}

function ConnectedServicesContent() {
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [connecting, setConnecting] = useState<Set<string>>(new Set());
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const searchParams = useSearchParams();

  const { connect } = useServiceConnect();
  const { mutateAsync: disconnectServiceMutation } = useDisconnectService();

  useEffect(() => {
    const connected = searchParams.get("connected");
    if (connected) {
      setServices((prev) =>
        prev.map((s) =>
          s.id === connected ? { ...s, status: "connected" } : s,
        ),
      );
    }
  }, [searchParams]);

  const applyStatuses = (
    statuses: import("@/services/types").TServiceStatus[],
  ) => {
    setServices((prev) =>
      prev.map((s) => {
        const match = statuses.find((st) => st.service === s.name);
        if (!match) return s;
        return {
          ...s,
          status: match.state,
          scopes:
            match.granted_scopes.length > 0 ? match.granted_scopes : s.scopes,
        };
      }),
    );
    setLastChecked(new Date());
  };

  const handleCheckServices = async () => {
    setIsChecking(true);
    try {
      const { services: statuses } = await checkServicesConnectionStatus();
      applyStatuses(statuses);
    } catch (error) {
      console.error("Failed to check service status:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleConnect = async (id: string) => {
    try {
      const service = services.find((s) => s.id === id)!;
      await connect(id as TConnection, service.scopes, applyStatuses);
    } catch (error) {
      console.error(`Failed to connect ${id}:`, error);
    }
  };

  const handleRevoke = async (id: string) => {
    setConnecting((prev) => new Set(prev).add(id));
    try {
      const ma_token = await getMyAccountToken();
      if (!ma_token) return;
      await disconnectServiceMutation({
        connection: id as TConnection,
        ma_token,
      });
      const { services: statuses } = await checkServicesConnectionStatus();
      applyStatuses(statuses);
    } catch (error) {
      console.error(`Failed to disconnect ${id}:`, error);
    } finally {
      setConnecting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const connectedCount = services.filter(
    (s) => s.status === "connected",
  ).length;

  return (
    <div className="px-8 py-8 w-full">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Connected Services
          </h1>
          <p className="text-gray-500 text-sm mt-1.5">
            Manage the services Luvira Guardian can access on your behalf.{" "}
            <span className="text-gray-400">
              {connectedCount} of {services.length} connected.
            </span>
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <Button
            variant="default"
            onClick={handleCheckServices}
            disabled={isChecking}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white border bg-[#3bcaca] rounded-lg cursor-pointer hover:bg-teal-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {isChecking ? "Checking…" : "Check Services"}
          </Button>
          {lastChecked && (
            <p className="text-[11px] text-gray-400">
              Last checked {lastChecked.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            isConnecting={connecting.has(service.id)}
            onRevoke={handleRevoke}
            onConnect={handleConnect}
          />
        ))}
      </div>

      <div className="mt-8 p-4 bg-[#3bcaca]/5 border border-[#3bcaca]/20 rounded-xl">
        <div className="flex gap-3">
          <svg
            className="w-4.5 h-4.5 text-[#3bcaca] shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
            />
          </svg>
          <div>
            <p className="text-[13px] font-medium text-[#2db8b8]">
              Auth0 Token Vault
            </p>
            <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">
              All service tokens are stored and managed by Auth0 Token Vault. No
              credentials are persisted locally. Tokens are short-lived and
              automatically refreshed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConnectedServicesPage() {
  return (
    <Suspense>
      <ConnectedServicesContent />
    </Suspense>
  );
}
