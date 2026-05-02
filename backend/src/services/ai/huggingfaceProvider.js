import { config } from '../../config/env.js';

export const generateImageWithHF = async (prompt) => {
    if (!config.HUGGINGFACE_API_KEY) throw new Error('HUGGINGFACE_API_KEY is missing');

    const models = [
        "black-forest-labs/FLUX.1-schnell"
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

export const describeImageWithHF = async (imageBuffer) => {
    if (!config.HUGGINGFACE_API_KEY) throw new Error('HUGGINGFACE_API_KEY is missing');

    // Use Salesforce/blip-image-captioning-large for Image-to-Text
    const modelId = "Salesforce/blip-image-captioning-large";
    const url = `https://router.huggingface.co/hf-inference/models/${modelId}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/octet-stream',
        },
        body: imageBuffer
    });

    if (response.ok) {
        const result = await response.json();
        return result[0]?.generated_text || "A beautiful design element.";
    }

    const err = await response.json().catch(() => ({ error: 'Unknown' }));
    throw new Error(err.error || `Status ${response.status}`);
};

export const generateTextWithHF = async (prompt, systemInstruction = "") => {
    if (!config.HUGGINGFACE_API_KEY) throw new Error('HUGGINGFACE_API_KEY is missing');

    const modelId = "katanemo/Arch-Router-1.5B:hf-inference";
    const url = "https://router.huggingface.co/v1/chat/completions";

    const messages = [];
    if (systemInstruction) {
        messages.push({ role: "system", content: systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: modelId,
            messages: messages,
            max_tokens: 250,
            temperature: 0.7
        })
    });

    if (response.ok) {
        const result = await response.json();
        return result.choices?.[0]?.message?.content?.trim() || "";
    }

    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || errorData.message || `Status ${response.status}`;
    throw new Error(errorMessage);
};
