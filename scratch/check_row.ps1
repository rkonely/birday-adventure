
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::FromFile('assets\Market\Market\Blank.jpg')

# Find center vertical dividing line between left and right pages
# Rings are around X=610 to 670
# Let's inspect right page horizontal boundary
# Sleeve 1 of right page:
# Sleeve 2 of right page:
for ($x = 600; $x -le 1150; $x += 25) {
    $c = $img.GetPixel($x, 280)
    Write-Output "X=$x : R=$($c.R), G=$($c.G), B=$($c.B)"
}
$img.Dispose()
