import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.HUGGINGFACE_API_KEY;

async function testImg2Img() {
    const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    
    const res = await fetch(`https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-3.5-large`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            inputs: b64,
            parameters: { prompt: "merge them" }
        })
    });
    console.log(res.status, await res.text());
}
testImg2Img();
