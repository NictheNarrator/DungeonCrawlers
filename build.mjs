import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist/src',{recursive:true});
for(const file of ['index.html','style.css','manifest.webmanifest','icon.svg','apple-touch-icon.png','src/app.mjs','src/engine.mjs','src/controls.mjs'])await copyFile(file,'dist/'+file);
console.log('Static game built in dist/. No runtime dependencies required.');
