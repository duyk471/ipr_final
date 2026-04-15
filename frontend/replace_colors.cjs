const fs = require("fs");
const path = require("path");

const walk = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        file = dir + "/" + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith(".jsx")) {
            results.push(file);
        }
    });
    return results;
};

const componentsDir = path.join(__dirname, "src/components");
const pagesDir = path.join(__dirname, "src/pages");

const allFiles = [...walk(componentsDir), ...walk(pagesDir)];
let modified = 0;

allFiles.forEach(file => {
    let content = fs.readFileSync(file, "utf8");
    
    // Replace gray- with slate-
    let newContent = content.replace(/gray-/g, "slate-");
    
    // Replace indigo- with slate- (Neutral Premium look) using exact word matches
    const colorMap = {
        "indigo-50": "slate-100",
        "indigo-100": "slate-200",
        "indigo-200": "slate-300",
        "indigo-400": "slate-400",
        "indigo-500": "slate-600",
        "indigo-600": "slate-800",
        "indigo-700": "slate-900",
        "indigo-800": "slate-950"
    };

    Object.keys(colorMap).forEach(key => {
        const regex = new RegExp(key + "(?!\\d)", "g"); // Matches key not followed by another digit
        newContent = newContent.replace(regex, colorMap[key]);
    });

    // Fix manual errors from previous buggy run
    newContent = newContent.replace(/slate-1000/g, "slate-600");

    // Fix specific UI gradients that use purple/indigo
    newContent = newContent.replace(/from-purple-500 to-indigo-600/g, "from-slate-700 to-slate-900");
    newContent = newContent.replace(/from-purple-600 to-indigo-600/g, "from-slate-800 to-slate-900");
    newContent = newContent.replace(/from-blue-600 to-indigo-600/g, "from-slate-700 to-slate-900");
    newContent = newContent.replace(/from-blue-500 via-indigo-500 to-purple-500/g, "from-slate-400 via-slate-500 to-slate-600");
    
    // Smooth out border radiuses for a more premium calm feel
    newContent = newContent.replace(/rounded-md/g, "rounded-lg");
    
    // Specifically target some harsh dark mode backgrounds to be a bit softer
    newContent = newContent.replace(/bg-slate-900/g, "bg-[#0B1120]");
    newContent = newContent.replace(/bg-slate-800/g, "bg-[#1E293B]");

    if (content !== newContent) {
        fs.writeFileSync(file, newContent, "utf8");
        modified++;
    }
});
console.log(`Updated ${modified} files.`);
