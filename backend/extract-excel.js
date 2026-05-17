const { execSync } = require('child_process');

const commit = '29f53a040f7d31da9175c04e12086ca0fa47af4e';
const file = 'frontend/src/app/dashboard/unit-tracking/page.tsx';

const content = execSync(`git show ${commit}:${file}`).toString();
const lines = content.split('\n');

let start = -1;
let end = -1;
let braceCount = 0;
let started = false;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const handleExportExcel = async () =>')) {
    start = i;
    started = true;
  }
  
  if (started) {
    const openingBraces = (lines[i].match(/{/g) || []).length;
    const closingBraces = (lines[i].match(/}/g) || []).length;
    braceCount += openingBraces - closingBraces;
    
    if (braceCount === 0 && lines[i].includes('}')) {
      end = i;
      break;
    }
  }
}

if (start !== -1 && end !== -1) {
  console.log(lines.slice(start, end + 1).join('\n'));
} else {
  console.error('Could not find function');
}
