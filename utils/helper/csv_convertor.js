const fs = require('fs');
const { parse } = require('csv-parse/sync'); // Using the synchronous parser

import { getEncoder } from "../lib/tokenizer";


// Helper function to convert a zero-indexed column number to Excel-style letter(s)
function columnToLetter(colIndex) {
    let letter = '';
    while (colIndex >= 0) {
        letter = String.fromCharCode((colIndex % 26) + 65) + letter;
        colIndex = Math.floor(colIndex / 26) - 1;
    }
    return letter;
}

export async function convertCsvToTxt(inputCsv, outputTxt) {
    // Read CSV file as UTF-8 text
    const csvData = fs.readFileSync(inputCsv, 'utf8');
    // Parse CSV content into an array of rows, each row being an array of cell values.
    const records = parse(csvData, { skip_empty_lines: true });

    let outputText = "START OF CSV\n";
    const cellDelimiter = " | ";

    // Process each row in the CSV file
    records.forEach((row, rowIndex) => {
        let rowText = "";
        row.forEach((cell, colIndex) => {
            // Only include non-empty cells (after trimming)
            if (cell && cell.trim() !== '') {
                const cellAddress = columnToLetter(colIndex) + (rowIndex + 1);
                rowText += `Cell ${cellAddress}: ${cell}` + cellDelimiter;
            }
        });
        // Only add the row if there's at least one non-empty cell
        if (rowText.trim() !== "") {
            outputText += rowText + "\n";
        }
    });

    outputText += "END OF CSV\n";

    fs.writeFileSync(outputTxt, outputText, 'utf8');

    // Token Count
    const enc = getEncoder();
    const tokenCount = enc.encode(outputText).length;

    return { tokenCount };
}

