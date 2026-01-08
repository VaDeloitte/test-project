const fs = require('fs');
const XLSX = require('xlsx');
const JSZip = require('jszip');
const xml2js = require('xml2js');

import { getEncoder } from "../lib/tokenizer";

export async function convertXlsxToTxt(inputXlsx, outputTxt) {
    let outputText = "";

    // --- Process Sheets ---
    const workbook = XLSX.readFile(inputXlsx);
    workbook.SheetNames.forEach(sheetName => {
        outputText += `START OF SHEET: ${sheetName}\n`;
        const sheet = workbook.Sheets[sheetName];

        // List merged cell ranges if available
        if (sheet['!merges']) {
            outputText += "Merged Cells:\n";
            sheet['!merges'].forEach(merge => {
                const startCell = XLSX.utils.encode_cell(merge.s);
                const endCell = XLSX.utils.encode_cell(merge.e);
                outputText += ` - ${startCell}:${endCell}\n`;
            });
        }

        // Unique delimiter for cells
        const cellDelimiter = " | ";

        // Process each cell in the sheet's range
        if (sheet['!ref']) {
            const range = XLSX.utils.decode_range(sheet['!ref']);
            for (let row = range.s.r; row <= range.e.r; row++) {
                let rowText = "";
                for (let col = range.s.c; col <= range.e.c; col++) {
                    const cellAddress = { c: col, r: row };
                    const cellRef = XLSX.utils.encode_cell(cellAddress);
                    const cell = sheet[cellRef];
                    // Only process the cell if it exists and has a non-empty value.
                    if (cell && cell.v != null && cell.v !== '') {
                        let cellOutput = `Cell ${cellRef}: `;
                        // Include both evaluated value and formula (if available)
                        if (cell.f) {
                            cellOutput += `Value: ${cell.v} - Formula: ${cell.f}`;
                        } else {
                            cellOutput += cell.v;
                        }
                        rowText += cellOutput + cellDelimiter;
                    }
                }
                // Only add the row if there's at least one non-empty cell
                if (rowText.trim() !== "") {
                    outputText += rowText + "\n";
                }
            }
        }
        outputText += `END OF SHEET: ${sheetName}\n\n`;
    });

    // --- Process Charts ---
    // Read XLSX as a ZIP file to access chart XML files
    const xlsxData = fs.readFileSync(inputXlsx);
    const zip = await JSZip.loadAsync(xlsxData);
    const chartFolder = zip.folder("xl/charts");

    if (chartFolder) {
        // Gather all chart files (ending with .xml)
        let chartFiles = [];
        chartFolder.forEach((relativePath, file) => {
            if (relativePath.endsWith('.xml')) {
                chartFiles.push({ relativePath, file });
            }
        });

        // Process each chart file
        for (const chartFile of chartFiles) {
            const chartXml = await chartFile.file.async("text");
            const parser = new xml2js.Parser();
            let chartJson;
            try {
                chartJson = await parser.parseStringPromise(chartXml);
            } catch (err) {
                console.error("Error parsing chart XML:", err);
                continue;
            }

            // Skip files that are not actual charts (e.g., style or colors XML)
            if (!chartJson["c:chartSpace"] || !chartJson["c:chartSpace"]["c:chart"]) {
                continue;
            }

            // Attempt to extract chart title and chart type
            let chartTitle = "Untitled Chart";
            let chartType = "Unknown";
            try {
                const chart = chartJson["c:chartSpace"]["c:chart"][0];
                // Extract chart title if available
                if (chart["c:title"]) {
                    const titleObj = chart["c:title"][0];
                    if (titleObj["c:tx"] && titleObj["c:tx"][0]["c:rich"]) {
                        const rich = titleObj["c:tx"][0]["c:rich"][0];
                        if (
                            rich["a:p"] &&
                            rich["a:p"][0]["a:r"] &&
                            rich["a:p"][0]["a:r"][0]["a:t"]
                        ) {
                            chartTitle = rich["a:p"][0]["a:r"][0]["a:t"][0];
                        }
                    }
                }
                // Determine chart type by checking common elements in the plot area
                if (chart["c:plotArea"]) {
                    const plotArea = chart["c:plotArea"][0];
                    const possibleTypes = ["c:barChart", "c:lineChart", "c:pieChart", "c:areaChart", "c:scatterChart"];
                    for (const typeKey of possibleTypes) {
                        if (plotArea[typeKey]) {
                            chartType = typeKey.replace("c:", "");
                            break;
                        }
                    }
                }
            } catch (e) {
                console.error("Error extracting chart info:", e);
            }

            outputText += `START OF CHART: ${chartFile.relativePath}\n`;
            outputText += `Chart Title: ${chartTitle}\n`;
            outputText += `Chart Type: ${chartType}\n`;

            // --- Extract Series Data (including Category Labels) ---
            try {
                const chart = chartJson["c:chartSpace"]["c:chart"][0];
                if (chart["c:plotArea"]) {
                    const plotArea = chart["c:plotArea"][0];
                    // Build element name based on detected chart type (e.g., "c:barChart")
                    const typeElementName = "c:" + chartType;
                    if (plotArea[typeElementName]) {
                        const chartTypeElement = plotArea[typeElementName][0];
                        if (chartTypeElement["c:ser"]) {
                            chartTypeElement["c:ser"].forEach((ser, idx) => {
                                let seriesTitle = `Series ${idx + 1}`;
                                // Extract series title if available
                                if (ser["c:tx"]) {
                                    const tx = ser["c:tx"][0];
                                    if (tx["c:strRef"] && tx["c:strRef"][0]["c:strCache"] &&
                                        tx["c:strRef"][0]["c:strCache"][0]["c:pt"]) {
                                        seriesTitle = tx["c:strRef"][0]["c:strCache"][0]["c:pt"][0]["c:v"][0];
                                    } else if (tx["c:v"]) {
                                        seriesTitle = tx["c:v"][0];
                                    }
                                }
                                outputText += `   Series Title: ${seriesTitle}\n`;

                                // Extract category labels if available
                                let categoryLabels = [];
                                if (ser["c:cat"]) {
                                    const cat = ser["c:cat"][0];
                                    if (cat["c:strRef"] && cat["c:strRef"][0]["c:strCache"] &&
                                        cat["c:strRef"][0]["c:strCache"][0]["c:pt"]) {
                                        cat["c:strRef"][0]["c:strCache"][0]["c:pt"].forEach(pt => {
                                            if (pt["c:v"]) {
                                                categoryLabels.push(pt["c:v"][0]);
                                            }
                                        });
                                    } else if (cat["c:numRef"] && cat["c:numRef"][0]["c:numCache"] &&
                                        cat["c:numRef"][0]["c:numCache"][0]["c:pt"]) {
                                        cat["c:numRef"][0]["c:numCache"][0]["c:pt"].forEach(pt => {
                                            if (pt["c:v"]) {
                                                categoryLabels.push(pt["c:v"][0]);
                                            }
                                        });
                                    }
                                }
                                if (categoryLabels.length > 0) {
                                    outputText += `   Categories: ${categoryLabels.join(", ")}\n`;
                                }

                                // Extract series data points (values)
                                let values = [];
                                if (ser["c:val"] && ser["c:val"][0]["c:numRef"] &&
                                    ser["c:val"][0]["c:numRef"][0]["c:numCache"]) {
                                    let numCache = ser["c:val"][0]["c:numRef"][0]["c:numCache"][0];
                                    if (numCache["c:pt"]) {
                                        numCache["c:pt"].forEach(pt => {
                                            if (pt["c:v"]) {
                                                values.push(pt["c:v"][0]);
                                            }
                                        });
                                    }
                                }
                                if (values.length > 0) {
                                    outputText += `   Values: ${values.join(", ")}\n`;
                                }
                            });
                        }
                    }
                }
            } catch (e) {
                console.error("Error extracting series data from chart:", e);
            }

            outputText += `END OF CHART: ${chartFile.relativePath}\n\n`;
        }
    } else {
        outputText += "No charts found in this XLSX file.\n";
    }

    fs.writeFileSync(outputTxt, outputText, 'utf8');

    // Token Count
    const enc = getEncoder();
    const tokenCount = enc.encode(outputText).length;

    return { tokenCount };
}
