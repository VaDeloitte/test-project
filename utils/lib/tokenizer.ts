import { encoding_for_model } from "@dqbd/tiktoken";

let encoder: ReturnType<typeof encoding_for_model> | null = null;

export function getEncoder() {
  if (!encoder) {
    encoder = encoding_for_model("gpt-4");
  }
  return encoder;
}
