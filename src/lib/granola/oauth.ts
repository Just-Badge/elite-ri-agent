import crypto from "crypto";

const GRANOLA_MCP_URL = "https://mcp.granola.ai";
const DISCOVERY_URL = `${GRANOLA_MCP_URL}/.well-known/oauth-authorization-server`;

interface OAuthServerMetadata {
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint: string;
  scopes_supported: string[];
}

interface DCRResponse {
  client_id: string;
  client_secret?: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
}

// Cache the discovery response
let cachedMetadata: OAuthServerMetadata | null = null;

export async function discoverOAuthServer(): Promise<OAuthServerMetadata> {
  if (cachedMetadata) return cachedMetadata;

  const res = await fetch(DISCOVERY_URL);
  if (!res.ok) throw new Error(`OAuth discovery failed: ${res.status}`);

  cachedMetadata = (await res.json()) as OAuthServerMetadata;
  return cachedMetadata;
}

export async function registerClient(
  registrationEndpoint: string,
  redirectUri: string
): Promise<DCRResponse> {
  const res = await fetch(registrationEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "ELITE RI Agent",
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "client_secret_post",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DCR failed: ${res.status} ${text}`);
  }

  return (await res.json()) as DCRResponse;
}

export function generatePKCE(): {
  codeVerifier: string;
  codeChallenge: string;
} {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  return { codeVerifier, codeChallenge };
}

export function buildAuthorizationUrl(
  authorizationEndpoint: string,
  clientId: string,
  redirectUri: string,
  codeChallenge: string,
  state: string
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    scope: "openid email profile offline_access",
    state,
  });

  return `${authorizationEndpoint}?${params.toString()}`;
}

export async function exchangeCodeForToken(
  tokenEndpoint: string,
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string | undefined,
  codeVerifier: string
): Promise<TokenResponse> {
  const body: Record<string, string> = {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  };

  if (clientSecret) {
    body.client_secret = clientSecret;
  }

  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  return (await res.json()) as TokenResponse;
}
