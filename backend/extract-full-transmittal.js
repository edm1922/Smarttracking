const { execSync } = require('child_process');

const commit = '29f53a040f7d31da9175c04e12086ca0fa47af4e';
const file = 'frontend/src/app/dashboard/unit-tracking/page.tsx';

const content = execSync(`git show ${commit}:${file}`).toString();
const lines = content.split('\n');

// Extract handleExportExcel
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
    braceCount += (lines[i].match(/{/g) || []).length;
    braceCount -= (lines[i].match(/}/g) || []).length;
    if (braceCount === 0 && lines[i].includes('}')) {
      end = i;
      break;
    }
  }
}
const excelFunc = lines.slice(start, end + 1).join('\n');

// Extract the states
const states = lines.filter(l => l.includes('transmittalHeader') || l.includes('enabledSignatories') || l.includes('isBuildingTransmittal')).filter(l => l.includes('useState'));

// Extract the Modal
let modalStart = -1;
let modalEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{isBuildingTransmittal && (')) {
    modalStart = i;
    break;
  }
}
if (modalStart !== -1) {
    let divCount = 0;
    for (let i = modalStart; i < lines.length; i++) {
        divCount += (lines[i].match(/<div/g) || []).length;
        divCount -= (lines[i].match(/<\/div>/g) || []).length;
        if (divCount === 0 && lines[i].includes(')}')) {
            modalEnd = i;
            break;
        }
    }
}
const modalHtml = lines.slice(modalStart, modalEnd + 1).join('\n');

console.log('--- STATES ---');
console.log(states.join('\n'));
console.log('\n--- EXCEL FUNCTION ---');
console.log(excelFunc);
console.log('\n--- MODAL HTML ---');
console.log(modalHtml);
