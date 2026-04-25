import { HfInference } from '@huggingface/inference';
import dotenv from 'dotenv';
dotenv.config();

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

async function test() {
    const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const buf = Buffer.from(b64, 'base64');
    const blob = new Blob([buf], { type: 'image/png' });

    const models = [
        'stabilityai/stable-diffusion-xl-refiner-1.0',
        'stabilityai/stable-diffusion-3.5-large',
        'SG161222/RealVisXL_V4.0',
        'black-forest-labs/FLUX.2-dev'
    ];

    for (const model of models) {
        try {
            await hf.imageToImage({
                model: model,
                inputs: blob,
                parameters: { prompt: 'merge them' }
            });
            console.log(`Success ${model}`);
        } catch(e) {
            console.error(`Failed ${model}:`, e.message);
        }
    }
}
test();
