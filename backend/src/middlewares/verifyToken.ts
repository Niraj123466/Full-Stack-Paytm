import { NextFunction, Request, Response } from "express";
import jwt, { JsonWebTokenError } from "jsonwebtoken";

export interface AuthRequest extends Request {
  _id?: string;
}

export const verifyToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // const token = req.headers.authorization;
  const token = req.cookies.token;

  try {
    if (!token) {
      return res.status(401).send({ message: "You are Unauthorized" });
    }

    if (!process.env.JWT_KEY) {
      throw new Error("JWT_KEY is not defined");
    }

    jwt.verify(
      token,
      process.env.JWT_KEY,
      (err: JsonWebTokenError | null, data: any) => {
        if (err) {
          console.error("Token verification error:", err); // Log the error details
          return res.status(401).send({ message: "Invalid token" });
        }
        req._id = data._id;
        next();
      }
    );
  } catch (error) {
    console.error("Verify token error:", error); // Log the error details
    return res.status(500).send({ message: "Something went wrong!", error: error });
  }
};
