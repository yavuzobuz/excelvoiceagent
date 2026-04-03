import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generate() {
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  try {
    console.log('Generating logo...');
    const logoRes = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: 'A modern, minimal, and memorable app icon logo for an AI Excel Voice Assistant. Combines a spreadsheet grid and a sound wave. Emerald green and dark slate colors, flat vector style, clean white background. No text.',
    });
    
    for (const part of logoRes.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        fs.writeFileSync(path.join(publicDir, 'logo.png'), Buffer.from(part.inlineData.data, 'base64'));
        console.log('Logo generated successfully.');
        break;
      }
    }

    console.log('Generating mockup...');
    const mockupRes = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: 'A premium, high-quality 3D isometric mockup of a modern web application dashboard on a laptop screen. The UI shows data analytics, charts, and a voice assistant interface. Light theme, emerald green accents, soft shadows, clean white background.',
    });
    
    for (const part of mockupRes.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        fs.writeFileSync(path.join(publicDir, 'mockup.png'), Buffer.from(part.inlineData.data, 'base64'));
        console.log('Mockup generated successfully.');
        break;
      }
    }
  } catch (e) {
    console.error('Error generating images:', e);
  }
}

generate();
