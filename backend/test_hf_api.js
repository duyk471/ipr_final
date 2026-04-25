import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.HUGGINGFACE_API_KEY;

async function testImg2Img() {
    // 1x1 pixel base64 image
    const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const prompt = "A seamless, professional photo-composite";

    const models = [
        "stabilityai/stable-diffusion-xl-refiner-1.0",
        "runwayml/stable-diffusion-v1-5",
        "timbrooks/instruct-pix2pix"
    ];

    for (const model of models) {
        console.log(`Testing ${model} with JSON string inputs...`);
        try {
            const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputs: b64,
                    parameters: { prompt: prompt, strength: 0.5 }
                })
            });
            if (res.ok) console.log(`SUCCESS string inputs for ${model}`);
            else console.log(`FAILED string inputs for ${model}:`, await res.text());
        } catch(e) {}
    }
}

testImg2Img();
