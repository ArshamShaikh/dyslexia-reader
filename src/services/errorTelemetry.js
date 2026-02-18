import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";

const TELEMETRY_TOKEN = String(process.env.EXPO_PUBLIC_EXTRACTION_API_TOKEN || "").trim();
let cachedBaseUrl = "";

const withAuthHeaders = (headers = {}) =>
  TELEMETRY_TOKEN
    ? {
        ...headers,
        Authorization: `Bearer ${TELEMETRY_TOKEN}`,
      }
    : headers;

const buildApiBaseCandidates = () => {
  const fromEnv = String(process.env.EXPO_PUBLIC_EXTRACTION_API_BASE_URL || "")
    .trim()
    .replace(/\/+$/, "");
  const fromConfig = String(
    Constants.expoConfig?.extra?.extractionApiBaseUrl ||
      Constants.manifest2?.extra?.extractionApiBaseUrl ||
      ""
  )
    .trim()
    .replace(/\/+$/, "");
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost;
  const fromHostUri = hostUri
    ? `http://${hostUri.split(":")[0]}:5050`
    : "";
  const scriptUrl = String(NativeModules?.SourceCode?.scriptURL || "").trim();
  const scriptUrlHostMatch = scriptUrl.match(/^https?:\/\/([^/:]+)/i);
  const fromScriptUrl = scriptUrlHostMatch?.[1]
    ? `http://${scriptUrlHostMatch[1]}:5050`
    : "";

  return [
    fromEnv,
    fromConfig,
    fromHostUri,
    fromScriptUrl,
    "http://localhost:5050",
    Platform.OS === "android" ? "http://10.0.2.2:5050" : "",
  ]
    .map((candidate) => String(candidate || "").trim().replace(/\/+$/, ""))
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index);
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 1600) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const resolveTelemetryApiBaseUrl = async () => {
  if (cachedBaseUrl) return cachedBaseUrl;
  const candidates = buildApiBaseCandidates();
  for (const candidate of candidates) {
    try {
      const response = await fetchWithTimeout(
        `${candidate}/health`,
        {
          method: "GET",
          headers: withAuthHeaders(),
        },
        1200
      );
      if (!response.ok) continue;
      cachedBaseUrl = candidate;
      return candidate;
    } catch {
      // Try next candidate.
    }
  }
  return "";
};

export const reportClientError = async (error, context = {}) => {
  try {
    const baseUrl = await resolveTelemetryApiBaseUrl();
    if (!baseUrl) return false;

    const payload = {
      message: String(error?.message || error || "Unknown client error").slice(0, 900),
      stack: String(error?.stack || "").slice(0, 8000),
      isFatal: Boolean(context?.isFatal),
      context: {
        ...context,
        scope: String(context?.scope || "app"),
      },
      appVersion: String(Constants.expoConfig?.version || "unknown"),
      platform: Platform.OS,
    };

    const response = await fetchWithTimeout(
      `${baseUrl}/events/client-error`,
      {
        method: "POST",
        headers: withAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(payload),
      },
      2500
    );
    return response.ok;
  } catch {
    return false;
  }
};
