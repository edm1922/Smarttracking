const { execSync } = require('child_process');

const commit = '29f53a040f7d31da9175c04e12086ca0fa47af4e';
const file = 'frontend/src/app/dashboard/unit-tracking/page.tsx';

const content = execSync(`git show ${commit}:${file}`).toString();
const lines = content.split('\n');

const keywords = [
  'transmittalHeader',
  'enabledSignatories',
  'isBuildingTransmittal',
  'handleExportExcel',
  'Transmittal Configuration'
];

for (const keyword of keywords) {
  console.log(`--- SEACHING FOR: ${keyword} ---`);
  lines.forEach((line, i) => {
    if (line.includes(keyword)) {
      console.log(`Line ${i + 1}: ${line}`);
    }
  });
}
