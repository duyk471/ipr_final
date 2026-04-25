import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.HUGGINGFACE_API_KEY;

async function testT2I() {
    const res = await fetch(`https://router.huggingface.co/hf-inference/models/runwayml/stable-diffusion-v1-5`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            inputs: "A beautiful sunset"
        })
    });
    console.log(res.status, await res.text());
}
testT2I();
