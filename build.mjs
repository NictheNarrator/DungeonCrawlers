import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist/src',{recursive:true});
for(const file of ['index.html','style.css','src/app.mjs','src/engine.mjs'])await copyFile(file,'dist/'+file);
console.log('Static game built in dist/. No runtime dependencies required.');
