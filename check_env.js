import { spawnSync } from 'child_process';
const res = spawnSync('python3', ['-m', 'ensurepip'], { encoding: 'utf8' });
console.log('ENSUREPIP:', res.stdout || res.stderr);
