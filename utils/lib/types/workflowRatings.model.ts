import mongoose from "mongoose";

const workflowRatings = new mongoose.Schema(
  {
    workflowId: {
      type: String,
      required: true,
    },
    version: {
      type: Number,
      required: true,
    },
    userId: {
      type: String,
      required: true
    },
    rating: {
      type: Number,
      required: true,
    },
    ratedAt: {
      type: Date,
      required: true,
    },
  },
  { collection: "workflowRatings" },
);

export default mongoose.models.WorkflowRatings || mongoose.model("WorkflowRatings", workflowRatings);