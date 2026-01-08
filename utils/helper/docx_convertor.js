const mammoth = require('mammoth');
const fs = require('fs');

import { getEncoder } from "../lib/tokenizer";

export async function convertDocxToText(docxPath) {
    try {
        const buffer = fs.readFileSync(docxPath);
        const result = await mammoth.extractRawText({ buffer });
  
        // Format text with paragraph spacing
        const formattedText = result.value.trim().replace(/\n/g, "\n\n");
  
        // Token Count
        const enc = getEncoder();
        const tokenCount = enc.encode(formattedText).length;

        return {formattedText, tokenCount}
    } catch (error) {
        console.error("Error processing DOCX:", error);
        return "The document could not be parsed due to an error. Please try again"
    }
  }