import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { z } from "zod";
import { Account } from "../models/Account";
import { AuthRequest } from "../middlewares/verifyToken";

const signupSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const signup = async (req: Request, res: Response) => {
  const { firstName, lastName, email, password } = req.body;
  if (!email || !password || !firstName) {
    return res.status(400).send({ message: "All fields are required!" });
  }
  try {
    const { success } = signupSchema.safeParse(req.body);
    if (!success) {
      return res.status(400).send({ message: "Incorrect Inputs!" });
    }
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res.status(411).send({ message: "User already exists!" });
    }
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = await User.create({
      email: email,
      password: hashedPassword,
      firstName: firstName,
      lastName: lastName,
    });
    const account = await Account.create({
      userId: user._id,
    });

    const jwtToken = jwt.sign(
      {
        _id: user._id,
        email: user.email,
      },
      process.env.JWT_KEY!,
      {
        expiresIn: "1d",
      }
    );

    res.cookie("token", jwtToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    return res.status(201).send({
      username: `${user.firstName} ${user.lastName}`,
      balance: account.balance,
    });
  } catch (err) {
    console.error("Signup error:", err); // Log the error details
    return res.status(500).send({ message: "Error signing up!", error: err });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send({ message: "All fields are required!" });
  }
  try {
    const { success } = loginSchema.safeParse(req.body);
    if (!success) {
      return res.status(411).send({ message: "Incorrect Inputs!" });
    }
    const existingUser = await User.findOne({ email: email });
    if (!existingUser) {
      return res.status(404).send({ message: "User not found" });
    }
    const account = await Account.findOne({ userId: existingUser._id });
    if (!account) {
      return res.status(404).send({ message: "Account not found" });
    }

    const passwordMatched = await bcrypt.compare(
      password,
      existingUser.password
    );

    if (!passwordMatched) {
      return res.status(400).send({ message: "Wrong password" });
    }

    const jwtToken = jwt.sign(
      {
        _id: existingUser._id,
        email: existingUser.email,
      },
      process.env.JWT_KEY!,
      {
        expiresIn: "1d",
      }
    );

    res.cookie("token", jwtToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    return res.status(200).send({
      username: `${existingUser.firstName} ${existingUser.lastName}`,
      balance: account.balance,
    });
  } catch (error) {
    console.error("Login error:", error); // Log the error details
    return res.status(500).send({ message: "Error log in!", error: error });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    res.clearCookie("token");
    return res.status(200).send({ message: "Logged out successfully!" });
  } catch (error) {
    console.error("Logout error:", error); // Log the error details
    return res.status(500).send({ message: "Error logging out!", error: error });
  }
};

export const searchBulk = async (req: AuthRequest, res: Response) => {
  const searchTerm = (req.query.user as string) || "";
  try {
    const users = await User.find({
      $or: [
        { firstName: { $regex: new RegExp(searchTerm, "i") } },
        { lastName: { $regex: new RegExp(searchTerm, "i") } },
      ],
      _id: { $ne: req._id },
    });
    return res.status(200).send({
      users: users.map((user) => ({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        _id: user._id,
      })),
    });
  } catch (error) {
    console.error("Search error:", error); // Log the error details
    return res.status(500).send({ message: "Error Searching Users!" });
  }
};
