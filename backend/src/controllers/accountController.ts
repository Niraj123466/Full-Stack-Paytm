import { Response } from "express";
import { Account } from "../models/Account";
import { AuthRequest } from "../middlewares/verifyToken";
import mongoose from "mongoose";

export const getBalance = async (req: AuthRequest, res: Response) => {
  try {
    const account = await Account.findOne({ userId: req._id });
    if (!account) {
      return res.status(404).send({ message: "Account not found!" });
    }
    return res.status(200).send({ balance: account.balance });
  } catch (error) {
    console.error("Get Balance error:", error); // Log the error details
    return res.status(500).send({ message: "Error checking balance", error: error });
  }
};

export const transferMoney = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { toAccountId, amount } = req.body;
    const myAccount = await Account.findOne({ userId: req._id }).session(session);

    if (!myAccount || myAccount.balance < amount || amount < 0) {
      await session.abortTransaction();
      return res.status(422).send({ message: "Insufficient funds!" });
    }

    const toAccount = await Account.findOne({ userId: toAccountId }).session(session);
    if (!toAccount) {
      await session.abortTransaction();
      return res.status(422).send({ message: "Receiver's account not found!" });
    }

    await Account.updateOne(
      { userId: req._id },
      { $inc: { balance: -amount } }
    ).session(session);

    await Account.updateOne(
      { userId: toAccountId },
      { $inc: { balance: amount } }
    ).session(session);

    await session.commitTransaction();
    session.endSession();

    return res.status(200).send({ message: "Funds transferred successfully!" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Transfer Money error:", error); // Log the error details
    return res.status(500).send({ message: "Error transferring money!", error: error });
  }
};
