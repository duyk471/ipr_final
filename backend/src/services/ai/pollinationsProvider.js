export const generateImageWithPollinations = async (prompt) => {
    try {
        const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true`;
        const response = await fetch(pollUrl);
        if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            return { buffer: Buffer.from(arrayBuffer), model: 'pollinations.ai' };
        }
        throw new Error(`Pollinations API returned status ${response.status}`);
    } catch (err) {
        throw new Error(`Pollinations API failed: ${err.message}`);
    }
};
