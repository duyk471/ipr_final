
import { AbstractDirectoryHandle } from '../frontend/src/services/filesystemAbstractionLayer.js';
import { writeFile, readFileAsBlob, listDirectory } from '../frontend/src/services/localFilesystemService.js';

async function testWriteFileSubdir() {
    console.log("Testing writeFile with subdirectories...");
    
    // Mock files for fallback mode
    const files = [];
    const workspaceHandle = new AbstractDirectoryHandle(null, files, false);
    
    try {
        const fileName = "assets/test_image.png";
        const data = new Uint8Array([1, 2, 3, 4]);
        
        console.log(`Writing to ${fileName}...`);
        await writeFile(workspaceHandle, fileName, data);
        console.log("Write successful!");
        
        // Verify file exists
        const assetsDir = await workspaceHandle.getDirectoryHandle('assets');
        const entries = await listDirectory(assetsDir);
        console.log("Assets directory contents:", entries.map(e => e.name));
        
        const hasFile = entries.some(e => e.name === 'test_image.png');
        console.log("File present in assets:", hasFile);
        
        if (hasFile) {
            const blob = await readFileAsBlob(assetsDir, 'test_image.png');
            console.log("Read back successful! Size:", blob.size);
        } else {
            console.error("TEST FAILED: File not found!");
        }
        
    } catch (e) {
        console.error("writeFile failed:", e);
    }
}

testWriteFileSubdir();
