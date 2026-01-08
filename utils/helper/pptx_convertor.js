const fs = require('fs');
const JSZip = require('jszip');
const xml2js = require('xml2js');

import { getEncoder } from "../lib/tokenizer";

export async function convertPptxToTxt(inputPptx, outputTxt) {
    // Helper: Parse the PPTX file and extract slide data
    async function parsePPTX(filePath) {
        const data = fs.readFileSync(filePath);
        const zip = await JSZip.loadAsync(data);
        let slides = [];

        // Locate the folder with slide XML files
        const slideFolder = zip.folder("ppt/slides");
        if (!slideFolder) {
            console.error("No slides folder found in the PPTX file.");
            return slides;
        }

        // Collect and sort slide file names (e.g., slide1.xml, slide2.xml)
        const slideFiles = [];
        slideFolder.forEach((relativePath, file) => {
            if (relativePath.endsWith('.xml')) {
                slideFiles.push({ path: "ppt/slides/" + relativePath, name: relativePath });
            }
        });

        slideFiles.sort((a, b) => {
            const numA = parseInt(a.name.match(/slide(\d+)\.xml/)[1]);
            const numB = parseInt(b.name.match(/slide(\d+)\.xml/)[1]);
            return numA - numB;
        });

        const parser = new xml2js.Parser();

        // Process each slide file
        for (let slideFile of slideFiles) {
            const slideXml = await zip.file(slideFile.path).async("text");
            const slideJson = await parser.parseStringPromise(slideXml);
            const slideData = extractSlideData(slideJson);
            slideData.slideNumber = parseInt(slideFile.name.match(/slide(\d+)\.xml/)[1]);
            slides.push(slideData);
        }
        return slides;
    }

    // Helper: Extracts headings and body text from slide JSON
    function extractSlideData(slideJson) {
        const slideData = { headings: [], bodies: [] };
        try {
            // Navigate to slide shapes: p:sld > p:cSld > p:spTree > p:sp
            const shapes = slideJson['p:sld']['p:cSld'][0]['p:spTree'][0]['p:sp'] || [];
            shapes.forEach(shape => {
                if (shape['p:txBody']) {
                    // If a <p:ph> placeholder is present, mark as heading
                    let isTitle = false;
                    if (
                        shape['p:nvSpPr'] &&
                        shape['p:nvSpPr'][0]['p:nvPr'] &&
                        shape['p:nvSpPr'][0]['p:nvPr'][0]['p:ph']
                    ) {
                        isTitle = true;
                    }
                    const text = extractTextFromTxBody(shape['p:txBody'][0]);
                    if (isTitle) {
                        slideData.headings.push(text);
                    } else {
                        slideData.bodies.push(text);
                    }
                }
            });
        } catch (error) {
            console.error("Error extracting slide data:", error);
        }
        return slideData;
    }

    // Helper: Recursively extracts text from a <p:txBody> element
    function extractTextFromTxBody(txBody) {
        let paragraphs = [];
        if (txBody['a:p']) {
            txBody['a:p'].forEach(paragraph => {
                let paragraphText = "";
                // Look for text runs (<a:r>)
                if (paragraph['a:r']) {
                    paragraph['a:r'].forEach(run => {
                        if (run['a:t']) {
                            paragraphText += run['a:t'].join("");
                        }
                    });
                }
                // Fallback: sometimes text may be directly under <a:p>
                if (paragraph['a:t']) {
                    paragraphText += paragraph['a:t'].join("");
                }
                if (paragraphText.trim() !== "") {
                    paragraphs.push(paragraphText.trim());
                }
            });
        }
        return paragraphs.join("\n");
    }

    // Main conversion: Process PPTX and write the structured TXT output
    const slides = await parsePPTX(inputPptx);
    let outputText = "";
    slides.forEach(slide => {
        outputText += `START OF SLIDE ${slide.slideNumber}\n`;
        if (slide.headings.length > 0) {
            slide.headings.forEach(heading => {
                outputText += `Heading: ${heading}\n`;
            });
        }
        if (slide.bodies.length > 0) {
            outputText += "Body:\n";
            slide.bodies.forEach(body => {
                outputText += `${body}\n`;
            });
        }
        outputText += `END OF SLIDE ${slide.slideNumber}\n\n`;
    });

    fs.writeFileSync(outputTxt, outputText, 'utf8');

    // Token Count
    const enc = getEncoder();
    const tokenCount = enc.encode(outputText).length;

    return { tokenCount };
}
