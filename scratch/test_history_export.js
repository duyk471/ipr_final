
import { AbstractDirectoryHandle } from '../frontend/src/services/filesystemAbstractionLayer.js';

async function testExportWithHistory() {
    console.log("Testing export with history simulation...");
    
    // Mock files for fallback mode
    const files = [
        { 
            path: 'project1/index.json', 
            name: 'index.json', 
            getFile: async () => ({ name: 'index.json', text: async () => "{}" })
        },
        { 
            path: 'project1/assets/image.png', 
            name: 'image.png', 
            getFile: async () => ({ name: 'image.png', arrayBuffer: async () => new Uint8Array([1,2,3]).buffer })
        },
        {
            path: 'project1/history/v1.json',
            name: 'v1.json',
            getFile: async () => ({ name: 'v1.json', text: async () => "{}" })
        }
    ];
    
    const workspaceHandle = new AbstractDirectoryHandle(null, files, false);
    const projectHandle = await workspaceHandle.getDirectoryHandle('project1');
    
    const zipStructure = {};

    const addFolderToZip = async (handle, currentPath) => {
        for await (const entry of handle.values()) {
            const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
            console.log(`    Found entry: ${entryPath}, kind: ${entry.kind}`);
            
            if (entry.kind === 'file') {
                zipStructure[entryPath] = 'file';
            } else if (entry.kind === 'directory') {
                zipStructure[entryPath] = 'directory';
                await addFolderToZip(entry, entryPath);
            }
        }
    };

    try {
        await addFolderToZip(projectHandle, '');
        console.log("Zip structure:", JSON.stringify(zipStructure, null, 2));
        
        const hasHistory = zipStructure['history'] === 'directory';
        const hasHistoryFile = zipStructure['history/v1.json'] === 'file';
        
        console.log("History folder present:", hasHistory);
        console.log("History file present:", hasHistoryFile);
        
        if (!hasHistory || !hasHistoryFile) {
            console.error("TEST FAILED: Missing history!");
        } else {
            console.log("TEST PASSED!");
        }
    } catch (e) {
        console.error("Export failed:", e);
    }
}

testExportWithHistory();
