"use client";

import { useState } from "react";
import Image from "next/image";

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
    status: "connected",
    scopes: ["read_api", "write_api"],
    logo: "/gitlab-logo.svg",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Professional network notifications and alerts",
    status: "connected",
    scopes: ["w_member_social"],
    logo: "/linkedin-logo.svg",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Schedule follow-up meetings and reminders",
    status: "disconnected",
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
    logo: "/google-calendar.svg",
  },
];

function ServiceCard({
  service,
  onRevoke,
  onConnect,
}: {
  service: Service;
  onRevoke: (id: string) => void;
  onConnect: (id: string) => void;
}) {
  const isConnected = service.status === "connected";

  return (
    <div className="bg-white border border-gray-200 rounded-md p-6 flex flex-col gap-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Image
            src={service.logo}
            alt={`${service.name} logo`}
            width={service.id === "linkedin" ? 40 : 30}
            height={service.id === "linkedin" ? 40 : 30}
          />
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
          <span
            className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-300"}`}
          />
          <span
            className={`text-[12px] font-medium ${isConnected ? "text-green-600" : "text-gray-400"}`}
          >
            {isConnected ? "Connected" : "Not Connected"}
          </span>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2">
          Granted Scopes
        </p>
        {isConnected ? (
          <div className="flex flex-wrap gap-1.5">
            {service.scopes.map((scope) => (
              <span
                key={scope}
                className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-md text-[11px] text-gray-600 font-mono"
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
          <button
            onClick={() => onRevoke(service.id)}
            className="px-3 py-1.5 text-[12px] font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            Revoke Access
          </button>
        ) : (
          <button
            onClick={() => onConnect(service.id)}
            className="px-3 py-1.5 text-[12px] font-medium text-white bg-[#3bcaca] border border-[#3bcaca] rounded-lg hover:bg-[#2db8b8] transition-colors"
          >
            Connect
          </button>
        )}
        {isConnected && (
          <button
            onClick={() => onRevoke(service.id)}
            className="px-3 py-1.5 text-[12px] font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reconnect
          </button>
        )}
      </div>
    </div>
  );
}

export default function ConnectedServicesPage() {
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);

  const handleRevoke = (id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "disconnected" } : s)),
    );
  };

  const handleConnect = (id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "connected" } : s)),
    );
  };

  const connectedCount = services.filter(
    (s) => s.status === "connected",
  ).length;

  return (
    <div className="px-8 py-8 w-full">
      <div className="mb-8">
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

      <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
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
