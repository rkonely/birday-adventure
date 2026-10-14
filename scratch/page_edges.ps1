
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::FromFile('assets\Market\Market\Blank.jpg')

# Let's find exact plastic page bounds:
# Search along Y=200 for where R,G,B jump from dark leather to light plastic
for ($x = 140; $x -le 210; $x++) {
    $c = $img.GetPixel($x, 200)
    if ($c.B -gt 150 -and $c.R -gt 140) {
        Write-Output "Left page start X: $x"
        break
    }
}
for ($x = 550; $x -le 620; $x++) {
    $c = $img.GetPixel($x, 200)
    if ($c.B -lt 100) {
        Write-Output "Left page end X: $x"
        break
    }
}
for ($x = 640; $x -le 700; $x++) {
    $c = $img.GetPixel($x, 200)
    if ($c.B -gt 150 -and $c.R -gt 140) {
        Write-Output "Right page start X: $x"
        break
    }
}
for ($x = 1050; $x -le 1120; $x++) {
    $c = $img.GetPixel($x, 200)
    if ($c.B -lt 100) {
        Write-Output "Right page end X: $x"
        break
    }
}

# Top and bottom bounds
for ($y = 120; $y -le 180; $y++) {
    $c = $img.GetPixel(300, $y)
    if ($c.B -gt 150 -and $c.R -gt 140) {
        Write-Output "Page top Y: $y"
        break
    }
}
for ($y = 660; $y -le 710; $y++) {
    $c = $img.GetPixel(300, $y)
    if ($c.B -lt 120) {
        Write-Output "Page bottom Y: $y"
        break
    }
}

$img.Dispose()
