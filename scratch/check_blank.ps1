
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::FromFile('assets\Market\Market\Blank.jpg')
Write-Output "Size: $($img.Width) x $($img.Height)"
$img.Dispose()
