// back/src/middleware/auth.ts
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface JwtPayload {
  userId: string;
}

export interface AuthedRequest extends Request {
  userId?: string;
}

export const requireAuth = (
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: "인증 필요" });
  }

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "인증 필요" });
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ message: "토큰이 유효하지 않습니다." });
  }
};
