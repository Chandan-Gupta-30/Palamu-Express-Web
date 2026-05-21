import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const operators = ['$ne', '$in', '$nin', '$gt', '$lt', '$gte', '$lte', '$or', '$and', '$regex', '$elemMatch'];

const results = {};
operators.forEach(op => results[op] = []);

const searchInDir = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchInDir(fullPath);
    } else if (stat.isFile() && file.endsWith('.js') && !file.includes('findImports')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      operators.forEach(op => {
        if (content.includes(op)) {
          results[op].push(path.relative(rootDir, fullPath));
        }
      });
    }
  }
};

searchInDir(rootDir);

operators.forEach(op => {
  console.log(`\n--- Results for: ${op} ---`);
  if (results[op].length === 0) {
    console.log('None');
  } else {
    results[op].forEach(f => console.log(f));
  }
});
