const fs = require('fs');
const { execSync } = require('child_process');

const psScript = `
Add-Type -AssemblyName System.Drawing
$imgPath = 'C:\\Users\\Konely\\.gemini\\antigravity-ide\\brain\\527afa71-78bc-4f39-99cb-bc21b2296725\\.user_uploaded\\media_1791987540437.jpg'
$img = [System.Drawing.Bitmap]::FromFile($imgPath)

$cropX = 865
$cropY = 299
$cropW = 101
$cropH = 130

$destRect = New-Object System.Drawing.Rectangle(0, 0, $cropW, $cropH)
$srcRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
$destBmp = New-Object System.Drawing.Bitmap($cropW, $cropH)
$g = [System.Drawing.Graphics]::FromImage($destBmp)
$g.DrawImage($img, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

$destBmp.Save('assets\\Market\\Booster-Pack.png', [System.Drawing.Imaging.ImageFormat]::Png)
$destBmp.Dispose()
$img.Dispose()
Write-Output "Refined Booster-Pack.png!"
`;

fs.writeFileSync('scratch/crop_booster.ps1', psScript);
const out = execSync('powershell -ExecutionPolicy Bypass -File scratch/crop_booster.ps1').toString();
console.log(out);
