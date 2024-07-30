import mongoose from "mongoose";

export const dbconnect = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017');
    console.log("Connected to Paytm DB!");
  } catch (error) {
    console.error(error);
  }
};
