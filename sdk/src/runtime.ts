import { API_VERSION } from "./api-version";
import { VERSION } from "./version";

const UNKNOWN = "unknown";

type Arch = "x86_64" | "x86" | "arm" | "arm64" | string;

type RuntimeInfo = {
  runtime: string;
  runtimeVersion: string;
  os: string;
  arch: Arch;
};

const normalizeArch = (arch: string): Arch => {
  const lower = arch.toLowerCase();
  if (lower === "x64" || lower === "x86_64" || lower === "amd64")
    return "x86_64";
  if (lower === "ia32" || lower === "x86" || lower === "x32") return "x86";
  if (lower === "aarch64" || lower === "arm64") return "arm64";
  if (lower === "arm") return "arm";
  return lower || UNKNOWN;
};

let cachedRuntimeInfo: RuntimeInfo | undefined;

function getRuntimeInfo(): RuntimeInfo {
  if (cachedRuntimeInfo) {
    return cachedRuntimeInfo;
  }

  const isVercel =
    typeof process !== "undefined" && process.env.VERCEL === "1";

  const globalAny = globalThis as {
    process?: {
      versions?: { node?: string };
      version?: string;
      platform?: string;
      arch?: string;
    };
    Deno?: {
      version?: { deno?: string };
      build?: { os?: string; arch?: string };
    };
    Bun?: {
      version?: string;
    };
    EdgeRuntime?: string;
    navigator?: {
      userAgent?: string;
      platform?: string;
      userAgentData?: { platform?: string };
    };
  };

  if (globalAny.Bun?.version) {
    cachedRuntimeInfo = {
      runtime: "bun",
      runtimeVersion: globalAny.Bun.version || UNKNOWN,
      os: globalAny.process?.platform || UNKNOWN,
      arch: normalizeArch(globalAny.process?.arch || ""),
    };
    return cachedRuntimeInfo;
  }

  if (globalAny.Deno?.version?.deno) {
    cachedRuntimeInfo = {
      runtime: "deno",
      runtimeVersion: globalAny.Deno.version.deno || UNKNOWN,
      os: globalAny.Deno.build?.os || UNKNOWN,
      arch: normalizeArch(globalAny.Deno.build?.arch || ""),
    };
    return cachedRuntimeInfo;
  }

  if (globalAny.process?.versions?.node) {
    cachedRuntimeInfo = {
      runtime: isVercel ? "vercel" : "node",
      runtimeVersion: globalAny.process.version || UNKNOWN,
      os: globalAny.process.platform || UNKNOWN,
      arch: normalizeArch(globalAny.process.arch || ""),
    };
    return cachedRuntimeInfo;
  }

  if (globalAny.EdgeRuntime) {
    cachedRuntimeInfo = {
      runtime: isVercel ? "vercel-edge" : "edge",
      runtimeVersion: globalAny.process?.version || UNKNOWN,
      os: UNKNOWN,
      arch: `${globalAny.EdgeRuntime}`,
    };
    return cachedRuntimeInfo;
  }

  if (globalAny.navigator) {
    const userAgent = globalAny.navigator.userAgent || "";
    if (userAgent.includes("Cloudflare-Workers")) {
      cachedRuntimeInfo = {
        runtime: "cloudflare-workers",
        runtimeVersion: userAgent,
        os: UNKNOWN,
        arch: UNKNOWN,
      };
      return cachedRuntimeInfo;
    }

    const platform =
      globalAny.navigator.userAgentData?.platform ||
      globalAny.navigator.platform ||
      "";

    cachedRuntimeInfo = {
      runtime: "browser",
      runtimeVersion: UNKNOWN,
      os: platform || UNKNOWN,
      arch: UNKNOWN,
    };
    return cachedRuntimeInfo;
  }

  cachedRuntimeInfo = {
    runtime: UNKNOWN,
    runtimeVersion: UNKNOWN,
    os: UNKNOWN,
    arch: UNKNOWN,
  };
  return cachedRuntimeInfo;
}

export function buildRuntimeHeaders(): Record<string, string> {
  const { runtime, runtimeVersion, os, arch } = getRuntimeInfo();

  return {
    "X-Sumup-Api-Version": API_VERSION,
    "X-Sumup-Lang": "javascript",
    "X-Sumup-Package-Version": VERSION,
    "X-Sumup-Os": os,
    "X-Sumup-Arch": arch,
    "X-Sumup-Runtime": runtime,
    "X-Sumup-Runtime-Version": runtimeVersion,
  };
}
