import { config } from '../../config/env.js';

export const generateImageWithHF = async (prompt) => {
    if (!config.HUGGINGFACE_API_KEY) throw new Error('HUGGINGFACE_API_KEY is missing');

    const models = [
        "black-forest-labs/FLUX.1-schnell",
        "stabilityai/stable-diffusion-xl-base-1.0",
        "runwayml/stable-diffusion-v1-5"
    ];

    let lastError = "";

    for (const modelId of models) {
        try {
            console.log(`Trying HF model: ${modelId}...`);
            const url = `https://router.huggingface.co/hf-inference/models/${modelId}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.HUGGINGFACE_API_KEY}`,
                    'Content-Type': 'application/json',
                    'x-use-cache': 'false'
                },
                body: JSON.stringify({ inputs: prompt })
            });

            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                return { buffer: Buffer.from(arrayBuffer), model: modelId };
            } else if (response.status === 503) {
                lastError = "503"; // Specific handling for model loading
            } else {
                const err = await response.json().catch(() => ({ error: 'Unknown' }));
                lastError = err.error || `Status ${response.status}`;
            }
        } catch (err) {
            lastError = err.message;
        }
    }

    throw new Error(lastError);
};
