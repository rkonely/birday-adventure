const fs = require('fs');
const { execSync } = require('child_process');

const ps = `
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::FromFile('assets\\Market\\Market\\Blank.jpg')
Write-Output "Size: $($img.Width) x $($img.Height)"
$img.Dispose()
`;
fs.writeFileSync('scratch/check_blank.ps1', ps);
console.log(execSync('powershell -ExecutionPolicy Bypass -File scratch/check_blank.ps1').toString());
