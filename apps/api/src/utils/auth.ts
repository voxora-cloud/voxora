import jwt from "jsonwebtoken";
import config from "../config";

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  type: "access" | "refresh";
}

export const generateTokens = (payload: Omit<JWTPayload, "type">) => {
  if (!config.jwt.secret || !config.jwt.refreshSecret) {
    throw new Error("JWT secrets are not configured");
  }

  // Explicit casting to work around TypeScript strict type checking
  const jwtSign = jwt.sign as any;

  const accessToken = jwtSign(
    { ...payload, type: "access" as const },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn },
  );

  const refreshToken = jwtSign(
    { ...payload, type: "refresh" as const },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn },
  );

  return { accessToken, refreshToken };
};

export const verifyToken = (
  token: string,
  type: "access" | "refresh" = "access",
): JWTPayload => {
  const secret =
    type === "access" ? config.jwt.secret : config.jwt.refreshSecret;

  if (!secret) {
    throw new Error(`JWT ${type} secret is not configured`);
  }

  try {
    return jwt.verify(token, secret as string) as JWTPayload;
  } catch (error) {
    throw new Error(
      `Invalid ${type} token: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
};
