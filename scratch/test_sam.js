
const HF_API_URL = 'https://api-inference.huggingface.co/models/facebook/sam-vit-huge';
const hfToken = "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";

async function testSAM() {
    // Try standard format
    const samInput = {
        inputs: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        parameters: {
            points: [{ x: 0, y: 0, label: 1 }]
        }
    };

    console.log('Testing HF SAM API...');
    try {
        const response = await fetch(HF_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${hfToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(samInput)
        });

        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Response:', text);
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

testSAM();
