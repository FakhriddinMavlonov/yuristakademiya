const webpush = require('web-push');

const keys = webpush.generateVAPIDKeys();
console.log('\n=== VAPID Keys ===');
console.log('Add these to your .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:admin@yuristakademiya.uz`);
console.log('\nAlso add VITE_VAPID_PUBLIC_KEY to apps/web .env (or root) for the frontend:\n');
console.log(`VITE_VAPID_PUBLIC_KEY=${keys.publicKey}\n`);
