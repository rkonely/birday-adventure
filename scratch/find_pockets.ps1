
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::FromFile('assets\Market\Market\Blank.jpg')

# Find brightness along row 250 (middle of top pockets)
for ($x = 100; $x -lt 1200; $x += 20) {
    $c = $img.GetPixel($x, 250)
    # Write-Output "$x : $($c.R),$($c.G),$($c.B)"
}

# Let's inspect specific pockets by color
# The plastic sleeves have distinct lighter/bluish-grey tint
Write-Output "Left page top-left sample: X=250, Y=250: $($img.GetPixel(250, 250))"
Write-Output "Left page top-right sample: X=450, Y=250: $($img.GetPixel(450, 250))"
Write-Output "Center binder sample: X=630, Y=250: $($img.GetPixel(630, 250))"
Write-Output "Right page top-left sample: X=750, Y=250: $($img.GetPixel(750, 250))"
Write-Output "Right page top-right sample: X=950, Y=250: $($img.GetPixel(950, 250))"

# Check horizontal lines separating top and bottom rows
Write-Output "Vertical divider Y=400: $($img.GetPixel(250, 400))"
Write-Output "Vertical divider Y=415: $($img.GetPixel(250, 415))"
Write-Output "Vertical divider Y=430: $($img.GetPixel(250, 430))"

$img.Dispose()
