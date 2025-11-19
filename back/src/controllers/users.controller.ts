import type { Request, Response } from "express";

export const getCurrentUser = async (_req: Request, res: Response) => {
  res.status(501).json({
    message: "Not implemented yet",
    nextStep: "Authenticate request and load user profile from MySQL",
  });
};

export const listUsers = async (_req: Request, res: Response) => {
  res.status(501).json({
    message: "Not implemented yet",
    nextStep: "Implement filtering/pagination against MySQL",
  });
};
