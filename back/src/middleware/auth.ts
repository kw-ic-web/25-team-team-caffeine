import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface JwtPayload {
  id?: string;
  userId?: string;
}

export interface AuthedRequest extends Request {
  user?: {
    id: string;
  };
  userId?: string;
}

export const requireAuth = (
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: "인증 필요 (헤더 없음)" });
  }

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "인증 필요 (토큰 형식 오류)" });
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;
    const extractedId = payload.userId || payload.id;

    if (!extractedId) {
       return res.status(401).json({ message: "토큰 정보 오류 (ID 없음)" });
    }
    req.user = { id: extractedId };
    req.userId = extractedId;
    
    next();
  } catch (error) {
    console.error("Auth Error:", error);
    return res.status(401).json({ message: "인증 필요 (토큰 만료/오류)" });
  }
};