import mongoose from "mongoose";
import { MONGODB_URI, DB_NAME } from "../app/const";

async function dbConnect() {
  try {
    await mongoose.connect(MONGODB_URI!, {dbName: DB_NAME});
  } catch (error) {
    throw new Error("Connection failed!");
  }
}

export default dbConnect;