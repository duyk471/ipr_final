import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fonts = [
    { family: 'Inter', category: 'sans-serif' },
    { family: 'Roboto', category: 'sans-serif' },
    { family: 'Montserrat', category: 'sans-serif' },
    { family: 'Poppins', category: 'sans-serif' },
    { family: 'Open Sans', category: 'sans-serif' },
    { family: 'Lato', category: 'sans-serif' },
    { family: 'Raleway', category: 'sans-serif' },
    { family: 'Nunito', category: 'sans-serif' },
    { family: 'Playfair Display', category: 'serif' },
    { family: 'Lora', category: 'serif' },
    { family: 'Merriweather', category: 'serif' },
    { family: 'PT Serif', category: 'serif' },
    { family: 'Crimson Text', category: 'serif' },
    { family: 'Oswald', category: 'display' },
    { family: 'Syne', category: 'display' },
    { family: 'Anton', category: 'display' },
    { family: 'Bebas Neue', category: 'display' },
    { family: 'Pacifico', category: 'handwriting' },
    { family: 'Dancing Script', category: 'handwriting' },
    { family: 'Caveat', category: 'handwriting' }
];

const FONTS_DIR = path.resolve(__dirname, '../src/assets/fonts');
const CSS_FILE = path.join(FONTS_DIR, 'fonts.css');
const JSON_FILE = path.join(FONTS_DIR, 'fonts.json');

if (!fs.existsSync(FONTS_DIR)) {
    fs.mkdirSync(FONTS_DIR, { recursive: true });
}

function fetchCSS(fontFamily) {
    const url = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:ital,wght@0,400;0,700;1,400;1,700&display=swap`;
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    const cmd = `curl -s -L -H "User-Agent: ${ua}" "${url}"`;
    return execSync(cmd).toString();
}

function downloadFont(url, dest) {
    const cmd = `curl -s -L "${url}" -o "${dest}"`;
    execSync(cmd);
}

async function main() {
    console.log('--- Professional Font System Downloader ---');
    console.log(`Target directory: ${FONTS_DIR}`);
    
    const fontFaces = [];
    const fontRegistry = [];

    for (const font of fonts) {
        process.stdout.write(`Processing ${font.family}... `);
        try {
            const css = fetchCSS(font.family);
            const latinSections = css.split('/* latin */').slice(1);
            
            const variantRegistry = [];
            const processedVariants = new Set();

            for (const section of latinSections) {
                const weightMatch = section.match(/font-weight:\s*(\d+|normal|bold)/);
                const styleMatch = section.match(/font-style:\s*(italic|normal)/);
                const urlMatch = section.match(/src:\s*url\((https:\/\/fonts\.gstatic\.com\/[^\)]+)\)/);
                
                if (weightMatch && styleMatch && urlMatch) {
                    let weight = weightMatch[1];
                    const style = styleMatch[1];
                    if (weight === '400') weight = 'normal';
                    if (weight === '700') weight = 'bold';
                    
                    const variantKey = `${style}-${weight}`;
                    if (processedVariants.has(variantKey)) continue;
                    processedVariants.add(variantKey);

                    const url = urlMatch[1];
                    const fileName = `${font.family.toLowerCase().replace(/ /g, '-')}-${style}-${weight}.woff2`;
                    const dest = path.join(FONTS_DIR, fileName);
                    
                    downloadFont(url, dest);

                    fontFaces.push(`@font-face {
  font-family: '${font.family}';
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url('./${fileName}') format('woff2');
}`);
                    variantRegistry.push({ weight, style, file: fileName });
                }
            }

            if (variantRegistry.length > 0) {
                fontRegistry.push({
                    family: font.family,
                    category: font.category,
                    variants: variantRegistry
                });
                console.log('✅');
            } else {
                console.log('❌ (No variants found)');
            }
        } catch (err) {
            console.log(`❌ (${err.message})`);
        }
    }

    fs.writeFileSync(CSS_FILE, fontFaces.join('\n\n'));
    fs.writeFileSync(JSON_FILE, JSON.stringify(fontRegistry, null, 2));
    console.log('\nDeployment Complete!');
    console.log(`Fonts CSS: ${CSS_FILE}`);
    console.log(`Fonts JSON: ${JSON_FILE}`);
}

main();
