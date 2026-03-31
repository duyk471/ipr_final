import * as cheerio from 'cheerio';
import axios from 'axios';
import { Cluster } from 'puppeteer-cluster';

const getUserAgent = () => {
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';
};

const defaultOptions = {
    limit: 5,
    engine: 'puppeteer'
};

const scrapeWithPuppeteer = async (url, options) => {
    console.log('-> Using full Puppeteer for initial search to bypass blocks...');
    const results = [];
    let browser;
    try {
        const puppeteer = (await import('puppeteer')).default;
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        });
        const page = await browser.newPage();
        await page.setUserAgent(getUserAgent());
        await page.setViewport({ width: 1280, height: 800 });

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });

        // Handle Google consent if it appears
        const consentButton = await page.$("#L2AGLb");
        if (consentButton) {
            console.log('-> Clicking Google consent button...');
            await consentButton.click();
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {});
        }

        // Wait for one of the common image result containers
        await page.waitForSelector('img', { timeout: 10000 });

        // Extract high-res candidate links from the page
        const images = await page.evaluate((limit) => {
            const list = [];
            // Strategy: Look for all images and find those that look like search results
            const imgs = document.querySelectorAll('img');
            for (const img of imgs) {
                if (list.length >= limit) break;
                // High res images in preview usually have these classes or are inside specific parents
                // But simpler is to find the data-src or src of the main thumbnails
                const src = img.src || img.getAttribute('data-src');
                if (src && src.startsWith('http') && !src.includes('googlelogo')) {
                    list.push(src);
                }
            }
            return list;
        }, options.limit || 5);

        results.push(...images);
        console.log(`-> Puppeteer search found ${results.length} images.`);

    } catch (err) {
        console.error('scrapeWithPuppeteer error:', err.message);
    } finally {
        if (browser) await browser.close();
    }
    return results;
};

const scrapeWithUnsplash = async (query) => {
    console.log(`-> Attempting Unsplash fallback for: "${query}"`);
    try {
        const response = await axios.get(`https://unsplash.com/s/photos/${encodeURIComponent(query)}`, {
            headers: { 'User-Agent': getUserAgent() },
            timeout: 5000
        });
        const $ = cheerio.load(response.data);
        const images = [];
        $('img').each((i, el) => {
            if (images.length >= 5) return;
            const src = $(el).attr('src');
            if (src && src.includes('images.unsplash.com/photo-')) {
                // Return high res version by stripping size params
                images.push(src.split('?')[0] + '?auto=format&fit=crop&w=1080&q=80');
            }
        });
        return images;
    } catch (err) {
        console.warn('Unsplash fallback failed:', err.message);
        return [];
    }
};

const scrapeWithCheerio = async (url, options) => {
    const results = [];
    try {
        console.log('-> Attempting Cheerio + Axios fetch...');
        const response = await axios.get(url, {
            headers: {
                'User-Agent': getUserAgent(),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            timeout: 5000
        });

        const $ = cheerio.load(response.data);
        const elements = Array.from($('.eA0Zlc'));

        if (elements.length === 0) {
            const title = $('title').text();
            console.log(`-> No elements found with .eA0Zlc. Page title: "${title}". Possibly blocked or different layout.`);
            
            // Try very basic img extraction as desperate fallback
            $('img').each((i, el) => {
                if (results.length >= 5) return;
                const src = $(el).attr('src');
                if (src && src.startsWith('http')) results.push(src);
            });

            if (results.length > 0) {
                console.log(`-> Extracted ${results.length} basic images via desperate fallback.`);
                return results;
            }
            return [];
        }

        const elementsData = elements.slice(0, Math.min(options.limit || 5, elements.length)).map((element) => {
            return {
                lpage: $(element).attr('data-lpage'),
                docid: $(element).attr('data-ref-docid'),
                tbnid: $(element).attr('data-docid')
            };
        }).filter(d => d.docid && d.tbnid);

        if (elementsData.length === 0) {
            console.log('-> Found listing elements but they lacked required metadata attributes.');
            return [];
        }

        const cluster = await Cluster.launch({
            concurrency: Cluster.CONCURRENCY_CONTEXT,
            maxConcurrency: 3,
            monitor: false,
            puppeteerOptions: {
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
            }
        });

        await cluster.task(async ({ page, data }) => {
            try {
                const googleImageUrl = `https://www.google.com/imgres?docid=${data.docid}&tbnid=${data.tbnid}`;
                await page.setViewport({ width: 1920, height: 1080 });
                await page.goto(googleImageUrl, { waitUntil: 'networkidle2', timeout: 10000 });

                const src = await page.evaluate(() => {
                    const img = document.querySelector('img.sFlh5c.pT0Scc.iPVvYb') || 
                                document.querySelector('.p7sI2 img') ||
                                document.querySelector('img[src^="http"]:not([src*="googlelogo"])');

                    if (img && img.src && !img.src.startsWith('data:')) {
                        return img.src;
                    }
                    return null;
                });
                return src;
            } catch (err) {
                return null;
            }
        });

        console.log(`-> Running cluster for ${elementsData.length} items...`);
        for (let i = 0; i < elementsData.length; i++) {
            const data = await cluster.execute(elementsData[i]);
            if (data) results.push(data);
        }

        await cluster.idle();
        await cluster.close();

        return results;

    } catch (err) {
        console.error('scrapeWithCheerio error:', err.message);
        return [];
    }
};

export const scrapeImages = async (query, options = {}) => {
    if (!query) throw new Error('Query is required');
    const queryOptions = { ...defaultOptions, ...options };
    const encodedQuery = query.replace(/&/g, '%26');
    const url = `https://www.google.com/search?as_st=y&as_q=${encodedQuery}&udm=2&safe=active`;

    console.log(`\n--- [Image Search: "${query}"] ---`);
    
    // 1. Try Cheerio (Fast, but prone to blocks)
    let results = await scrapeWithCheerio(url, queryOptions);
    
    // 2. Try Puppeteer (Slow but robust, bypasses consent/blocks)
    if (results.length === 0) {
        results = await scrapeWithPuppeteer(url, queryOptions);
    }

    // 3. Try Unsplash (Safe, high-quality fallback)
    if (results.length === 0) {
        results = await scrapeWithUnsplash(query);
    }

    console.log(`-> Final search results count: ${results.length}`);
    return results;
};

