// OAuth 2.0 Authorization Code flow with SumUp
//
// This example walks your through the steps necessary to implement
// OAuth 2.0 (<https://oauth.net/>) in case you are building a software
// for other people to use.
//
// To get started, you will need your client credentials.
// If you don't have any yet, you can create them in the
// [Developer Settings](https://me.sumup.com/en-us/settings/oauth2-applications).
//
// Your credentials need to be configured with the correct redirect URI,
// that's the URI the user will get redirected to once they authenticate
// and authorize your application. For development, you might want to
// use for example `http://localhost:8080/callback`. In production, you would
// redirect the user back to your host, e.g. `https://example.com/callback`.
import SumUp from "@sumup/sdk";
import cookieParser from "cookie-parser";
import express, {
  type CookieOptions,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import {
  type AuthorizationServer,
  authorizationCodeGrantRequest,
  type Client,
  calculatePKCECodeChallenge,
  generateRandomCodeVerifier,
  generateRandomState,
  isOAuth2Error,
  processAuthorizationCodeOAuth2Response,
  validateAuthResponse,
} from "oauth4webapi";

const STATE_COOKIE_NAME = "oauth_state";
const PKCE_COOKIE_NAME = "oauth_pkce";
const SCOPES = "email profile";

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI || "http://localhost:8080";

if (!clientId || !clientSecret || !redirectUri) {
  throw new Error(
    "Missing CLIENT_ID, CLIENT_SECRET or REDIRECT_URI environment variables. " +
      "Please configure them before starting the example.",
  );
}

const oauthClient: Client = {
  client_id: clientId,
  client_secret: clientSecret,
  token_endpoint_auth_method: "client_secret_basic",
};

const AUTHORIZATION_ENDPOINT = "https://api.sumup.com/authorize";
const TOKEN_ENDPOINT = "https://api.sumup.com/token";

const authorizationServer: AuthorizationServer = {
  issuer: "https://api.sumup.com",
  authorization_endpoint: AUTHORIZATION_ENDPOINT,
  token_endpoint: TOKEN_ENDPOINT,
};

const port = Number(process.env.PORT ?? 8080);
const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: false,
  path: "/",
};

const app = express();
app.use(cookieParser());

app.get("/login", async (_req, res, next) => {
  try {
    await handleLogin(res);
  } catch (error) {
    next(error);
  }
});

app.get("/callback", async (req, res, next) => {
  try {
    await handleCallback(req, res);
  } catch (error) {
    next(error);
  }
});

app.use(
  (error: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    console.error("Unhandled error:", error);
    res.status(500).send("Internal Server Error");
  },
);

app.listen(port, () => {
  console.info(`Server is running at http://localhost:${port}`);
});

async function handleLogin(res: Response) {
  const state = generateRandomState();
  const codeVerifier = generateRandomCodeVerifier();
  const codeChallenge = await calculatePKCECodeChallenge(codeVerifier);

  res.cookie(STATE_COOKIE_NAME, state, cookieOptions);
  res.cookie(PKCE_COOKIE_NAME, codeVerifier, cookieOptions);

  const url = new URL(AUTHORIZATION_ENDPOINT);
  url.search = new URLSearchParams({
    client_id: oauthClient.client_id,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  }).toString();

  res.redirect(url.toString());
}

async function handleCallback(req: Request, res: Response) {
  const expectedState = req.cookies?.[STATE_COOKIE_NAME];
  const codeVerifier = req.cookies?.[PKCE_COOKIE_NAME];

  if (!expectedState || !codeVerifier) {
    res.status(400).send("Missing OAuth cookies");
    return;
  }

  const currentUrl = buildRequestUrl(req);
  const params = validateAuthResponse(
    authorizationServer,
    oauthClient,
    currentUrl,
    expectedState,
  );

  if (isOAuth2Error(params)) {
    res
      .status(400)
      .send(`OAuth error: ${params.error_description ?? params.error}`);
    return;
  }

  const response = await authorizationCodeGrantRequest(
    authorizationServer,
    oauthClient,
    params,
    redirectUri,
    codeVerifier,
  );

  const tokenSet = await processAuthorizationCodeOAuth2Response(
    authorizationServer,
    oauthClient,
    response,
  );

  if (isOAuth2Error(tokenSet)) {
    res
      .status(400)
      .send(
        `Token exchange failed: ${tokenSet.error_description ?? tokenSet.error}`,
      );
    return;
  }

  if (!tokenSet.access_token) {
    res.status(500).send("Token response did not include an access token");
    return;
  }

  const merchantCode = getMerchantCode(req);
  if (!merchantCode) {
    res
      .status(400)
      .send("Missing merchant_code query parameter in callback response");
    return;
  }

  console.info(`Merchant code: ${merchantCode}`);

  const client = new SumUp({
    apiKey: tokenSet.access_token,
  });

  const merchant = await client.merchants.get(merchantCode);
  res.status(200).json(merchant);
}

function buildRequestUrl(req: Request): URL {
  const protocol = req.protocol || "http";
  const host = req.get("host") ?? `localhost:${port}`;
  return new URL(`${protocol}://${host}${req.originalUrl ?? ""}`);
}

function getMerchantCode(req: Request): string | undefined {
  const value = req.query.merchant_code;
  if (typeof value === "string") {
    return value;
  }
  return undefined;
}
