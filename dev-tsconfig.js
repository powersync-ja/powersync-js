import fs from 'fs';
import path from 'path';

/**
 * For developing SDKs and demos inside the monorepo it is convenient to have certain references in the tsconfig.json files.
 * This allows us to apply the references when developing inside the monorepo without having those references checked in for the demos, which are meant to be standalone.
 */
function updateTsConfigReferences(tsconfigPath, newReferences) {
  try {
    const tsconfigFullPath = path.resolve(tsconfigPath);
    const tsconfigContent = fs.readFileSync(tsconfigFullPath, 'utf8');
    const tsconfig = JSON.parse(tsconfigContent);

    tsconfig.references = newReferences;

    // Write the updated tsconfig.json back to the file
    fs.writeFileSync(tsconfigFullPath, JSON.stringify(tsconfig, null, 2));

    console.log('Successfully updated references in', tsconfigPath);
  } catch (error) {
    console.error('Error updating tsconfig.json:', error);
  }
}

const newReferences = [
  {
    path: '../../packages/web'
  }
];

const demos = ['react-supabase-todolist'];

console.log('Updating demo projects tsconfig.json references...', demos);
demos.forEach((demo) => {
  const demoTsconfigPath = `./demos/${demo}/tsconfig.json`;
  updateTsConfigReferences(demoTsconfigPath, newReferences);
});
