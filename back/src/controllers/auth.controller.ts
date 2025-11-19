import type { Request, Response } from "express";

export const registerUser = async (_req: Request, res: Response) => {
  res.status(501).json({
    message: "Not implemented yet",
    nextStep: "Add MySQL insert logic and password hashing",
  });
};

export const loginUser = async (_req: Request, res: Response) => {
  res.status(501).json({
    message: "Not implemented yet",
    nextStep: "Verify credentials against MySQL and issue a session/JWT",
  });
};

export const handleGoogleCallback = async (_req: Request, res: Response) => {
  res.status(501).json({
    message: "Not implemented yet",
    nextStep: "Exchange OAuth code and create/find user in MySQL",
  });
};
