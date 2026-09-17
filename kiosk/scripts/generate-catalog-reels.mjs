import { spawn } from 'node:child_process';
import process from 'node:process';

const jobs = [
    { label: 'Classic Keychain', product: '' },
    { label: 'Bubble Badge', product: 'bubble_keychain' },
    { label: 'Flower Initial', product: 'flower_keychain' },
    { label: 'Wavy Nametag', product: 'nametag' },
    { label: 'Girly Keychain', product: 'girly_keychain' },
    { label: 'Letter Tiles', product: 'tilekey' },
    { label: 'Linked Initials', product: 'linked_initials' },
    { label: 'Name Beads', product: 'name_beads' },
    { label: 'Supported Name', product: 'supported_text' },
    { label: 'Word Art', product: 'wordart' },
    { label: 'LOVE Series', product: 'loveseries' },
    { label: 'Desk Nameplate', product: 'nameplate' },
    { label: 'LED Word Stand', product: 'led_word_stand' },
    { label: 'Desk Organizer', product: 'desk_organizer' },
    { label: 'LED Word Art', product: 'led_word_art' },
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
