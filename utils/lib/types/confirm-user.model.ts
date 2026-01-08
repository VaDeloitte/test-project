import mongoose from "mongoose";

const ConfirmUserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    otp: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.models.ConfirmUser || mongoose.model("ConfirmUser", ConfirmUserSchema);
