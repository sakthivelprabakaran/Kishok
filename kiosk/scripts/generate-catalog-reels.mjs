import { spawn } from 'node:child_process';
import process from 'node:process';

const jobs = [
    { label: 'Classic Keychain', product: '' },
    { label: 'Word Art', product: 'wordart' },
    { label: 'Desk Organizer', product: 'desk_organizer' },
];

for (const job of jobs) {
    console.log(`\nGenerating ${job.label}…`);
    await new Promise((resolve, reject) => {
        const env = { ...process.env };
        if (job.product) env.CATALOG_REEL_PRODUCT = job.product;
        else delete env.CATALOG_REEL_PRODUCT;
        const child = spawn(process.execPath, ['scripts/generate-classic-reel.mjs'], {
            cwd: process.cwd(),
            env,
            stdio: 'inherit',
            windowsHide: true,
        });
        child.once('error', reject);
        child.once('exit', (code) => code === 0
            ? resolve()
            : reject(new Error(`${job.label} generator exited with code ${code}`)));
    });
}

console.log('\nHigh-resolution catalogue reel gate generated.');
