
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs-extra';

dotenv.config({ path: './backend/.env' });

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

async function testGeminiSegmentation() {
    console.log('Testing Gemini for segmentation...');
    
    // 1x1 white pixel for testing (in real life it would be the actual image)
    const base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    
    const prompt = `
        I have an image (attached). 
        The user has selected a region at points: [[100, 100]].
        Please identify the object at this location.
        Return a JSON object with a "polygon" property containing a list of [x, y] points (at least 20 points) that form a detailed boundary around that object.
        Return ONLY JSON.
    `;

    try {
        const result = await model.generateContent([
            { text: prompt },
            {
                inlineData: {
                    data: base64Image,
                    mimeType: "image/png"
                }
            }
        ]);

        console.log('Response:', result.response.text());
    } catch (e) {
        console.error('Gemini error:', e);
    }
}

testGeminiSegmentation();
