const fs = require('fs');
const { execFileSync } = require('child_process');

const evidenceDir = 'D:/Code/SciPal/.omo/evidence';
const cases = [
  {
    name: 'localhost',
    url: 'http://localhost:3102/api/preferences/education-level',
    origin: 'http://localhost:3102',
    output: 'nojs-host-repro-curl-localhost-raw.txt',
  },
  {
    name: 'loopback',
    url: 'http://127.0.0.1:3102/api/preferences/education-level',
    origin: 'http://127.0.0.1:3102',
    output: 'nojs-host-repro-curl-loopback-raw.txt',
  },
];

for (const testCase of cases) {
  const args = [
    '-i',
    '-X', 'POST',
    testCase.url,
    '-H', `Origin: ${testCase.origin}`,
    '-H', 'Content-Type: application/x-www-form-urlencoded',
    '--data', 'scope=device&level=upper_secondary',
  ];
  const output = execFileSync('curl.exe', args, { encoding: 'utf8' });
  fs.writeFileSync(`${evidenceDir}/${testCase.output}`, `Invocation: curl.exe ${args.map((arg) => JSON.stringify(arg)).join(' ')}\n\n${output}`);
  process.stdout.write(`${testCase.name}: ${testCase.output}\n${output}\n`);
}
