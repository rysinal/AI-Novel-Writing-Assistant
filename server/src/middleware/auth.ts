import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

interface BasicAuthConfig {
  username: string;
  password: string;
}

function resolveBasicAuthConfig(): BasicAuthConfig | null {
  const username = process.env.AI_NOVEL_AUTH_USERNAME?.trim() ?? "";
  const password = process.env.AI_NOVEL_AUTH_PASSWORD?.trim() ?? "";
  return username && password ? { username, password } : null;
}

function safeEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function parseBasicCredentials(header: string | undefined): BasicAuthConfig | null {
  if (!header?.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return { username: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
  } catch {
    return null;
  }
}

export function assertProductionAuthConfigured(): void {
  if (process.env.NODE_ENV === "production" && !resolveBasicAuthConfig()) {
    throw new Error("AI_NOVEL_AUTH_USERNAME and AI_NOVEL_AUTH_PASSWORD are required in production.");
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const expected = resolveBasicAuthConfig();
  if (!expected && process.env.NODE_ENV !== "production") {
    next();
    return;
  }
  if (!expected) {
    res.status(503).json({ success: false, error: "服务访问保护尚未配置。" });
    return;
  }

  const actual = parseBasicCredentials(req.header("authorization"));
  if (!actual || !safeEqual(actual.username, expected.username) || !safeEqual(actual.password, expected.password)) {
    res.setHeader("WWW-Authenticate", 'Basic realm="AI Novel"');
    res.status(401).json({ success: false, error: "需要登录后访问。" });
    return;
  }
  next();
}
