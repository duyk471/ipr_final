import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.HUGGINGFACE_API_KEY;

async function testImg2Img() {
    const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const buf = Buffer.from(b64, 'base64');
    
    const res = await fetch(`https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix`, {
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
    console.log(await res.text());
}
testImg2Img();
