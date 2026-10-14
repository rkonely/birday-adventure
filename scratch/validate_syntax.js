const fs = require('fs');
const path = require('path');
const vm = require('vm');

let errors = 0;
function checkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      checkDir(full);
    } else if (f.endsWith('.js')) {
      try {
        const code = fs.readFileSync(full, 'utf8');
        // Check ESM syntax with SourceTextModule if available or vm.compileFunction
        new vm.Script(code.replace(/import\s+.*?from\s+['"].*?['"];?/g, '// import').replace(/export\s+/g, '// export '));
        console.log('✓ OK:', full);
      } catch (e) {
        console.error('✗ ERROR in', full, ':', e.message);
        errors++;
      }
    }
  }
}

checkDir('js');
if (errors === 0) {
  console.log('All JS files passed syntax validation!');
} else {
  console.error(`Found ${errors} syntax errors!`);
}
