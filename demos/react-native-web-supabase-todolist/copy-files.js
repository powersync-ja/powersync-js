const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'node_modules', '@powersync', 'web', 'dist');
const destDir = path.join(__dirname, 'public', '@powersync');

function copyRecursiveSync(src, dest) {
  if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
    // Create the destination directory if it doesn't exist
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const files = fs.readdirSync(src);
    // Copy each file/directory
    files.forEach((file) => {
      const srcFile = path.join(src, file);
      const destFile = path.join(dest, file);
      if (fs.statSync(srcFile).isDirectory()) {
        copyRecursiveSync(srcFile, destFile);
      } else {
        fs.copyFileSync(srcFile, destFile);
      }
    });
  } else {
    console.error(`Source directory ${src} does not exist or is not a directory.`);
  }
}

copyRecursiveSync(sourceDir, destDir);
console.log(`Files copied from ${sourceDir} to ${destDir} successfully.`);
