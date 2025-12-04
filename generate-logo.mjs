import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

async function generateLogo(prompt, filename) {
  const ai = new GoogleGenAI({ apiKey });

  console.log(`Generating ${filename}...`);
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
      config: {
        responseModalities: ["Text", "Image"]
      }
    });

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const buffer = Buffer.from(part.inlineData.data, "base64");
          fs.writeFileSync(filename, buffer);
          console.log("Saved:", filename);
          return;
        }
      }
    }
    console.log("No image in response for", filename);
  } catch (err) {
    console.log("Error:", err.message);
  }
}

// Orthogonal grid/square overlapping concepts

await generateLogo(`Minimalist logo for "Clipping.AI" - an AI news intelligence platform.
Design: Overlapping SQUARES or RECTANGLES in an orthogonal grid pattern.
Think: Multiple square frames overlapping at different positions, creating depth.
Style: Clean geometric, 90-degree angles only. Dark gray (#333). 
One tiny gold/amber accent (#D4AF37) dot or small element.
White background. No text. Premium tech aesthetic.`,
"apps/web/public/logo-grid-a.png");

await generateLogo(`Minimalist logo icon. Concept: STACKED SQUARES or grid frames overlapping.
Like newspaper clippings stacked, or data layers represented as squares.
Pure orthogonal design - only horizontal and vertical lines, 90° angles.
Dark charcoal gray main color. Tiny gold (#E6B800) accent detail.
Clean, modern, premium. White background. No text.`,
"apps/web/public/logo-grid-b.png");

await generateLogo(`Abstract logo made of OVERLAPPING SQUARE OUTLINES.
3-4 square frames at different sizes, offset/overlapping to create depth.
Suggests layers of information, data synthesis, clipping/collecting.
Dark gray lines, one small gold (#D4AF37) corner or dot accent.
Minimal, geometric, orthogonal only. White background. No text.`,
"apps/web/public/logo-grid-c.png");

await generateLogo(`Logo design: GRID of small squares with some filled, some empty.
Like a pixelated or mosaic pattern forming an abstract shape.
Orthogonal grid structure. Dark gray (#444) with one gold (#F5A623) square.
Minimal, modern tech aesthetic. White background. No text.`,
"apps/web/public/logo-grid-d.png");

await generateLogo(`Minimalist logo: TWO or THREE RECTANGLES overlapping.
Clean geometric shapes at 90° angles, creating an abstract layered effect.
Suggests documents, articles, data being clipped/collected.
Dark gray main color. Small amber/gold (#D4AF37) accent.
Premium, sophisticated. White background. No text/wordmark.`,
"apps/web/public/logo-grid-e.png");

await generateLogo(`Abstract logo: INTERLOCKING SQUARE SHAPES.
Two squares that interlock or weave through each other orthogonally.
Like puzzle pieces but with clean 90° geometry only.
Dark charcoal gray. Tiny gold dot accent. 
Modern, minimal. White background. No text.`,
"apps/web/public/logo-grid-f.png");

console.log("Done!");
