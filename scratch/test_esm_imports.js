const fs = require('fs');
const path = require('path');

async function checkDir(dir) {
  const files = fs.readdirSync(dir);
  let errCount = 0;
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      errCount += await checkDir(full);
    } else if (f.endsWith('.js')) {
      try {
        const fileUrl = 'file:///' + path.resolve(full).replace(/\\/g, '/');
        await import(fileUrl);
        console.log('✓ Valid Module:', full);
      } catch (e) {
        // If error is just missing DOM window/document, that's normal in node, but check for SyntaxError
        if (e.name === 'SyntaxError') {
          console.error('✗ SYNTAX ERROR in', full, ':', e.message);
          errCount++;
        } else {
          console.log('✓ Syntax OK (Runtime DOM dependency):', full, '-', e.message);
        }
      }
    }
  }
  return errCount;
}

(async () => {
  const errors = await checkDir('js');
  if (errors === 0) {
    console.log('🎉 ALL JS MODULES HAVE VALID SYNTAX!');
  } else {
    console.error(`Found ${errors} syntax errors.`);
    process.exit(1);
  }
})();
