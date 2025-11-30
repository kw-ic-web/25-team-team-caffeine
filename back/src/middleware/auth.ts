import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface JwtPayload {
  id?: string;
  userId?: string;
}

// ✅ [핵심] 두 가지 타입 모두 호환되도록 정의
export interface AuthedRequest extends Request {
  user?: {
    id: string;
  };
  userId?: string; // 기존 코드 호환용
}

export const requireAuth = (
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) => {
  const header = req.headers.authorization;
  if (!header) {
    // 헤더가 없으면 401
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

    // id 또는 userId 둘 중 하나라도 있으면 가져옴
    const extractedId = payload.userId || payload.id;

    if (!extractedId) {
       return res.status(401).json({ message: "토큰 정보 오류 (ID 없음)" });
    }

    // ✅ [수정 완료] 두 가지 방식 모두 값을 채워줍니다.
    // 1. DailyTasks 컨트롤러용 (req.user.id)
    req.user = { id: extractedId };
    // 2. Goals 및 기타 기존 컨트롤러용 (req.userId)
    req.userId = extractedId;
    
    next();
  } catch (error) {
    console.error("Auth Error:", error);
    return res.status(401).json({ message: "인증 필요 (토큰 만료/오류)" });
  }
};