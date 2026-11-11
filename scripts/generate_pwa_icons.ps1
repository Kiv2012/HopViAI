Add-Type -AssemblyName System.Drawing

$iconDir = Join-Path (Get-Location) "public\icons"
if (-not (Test-Path $iconDir)) {
    New-Item -ItemType Directory -Path $iconDir -Force | Out-Null
}

function New-HopViIcon([int]$size, [string]$outFile) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $c1 = [System.Drawing.Color]::FromArgb(255, 234, 88, 12)
    $c2 = [System.Drawing.Color]::FromArgb(255, 124, 45, 18)
    $brushBg = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45.0)
    $g.FillRectangle($brushBg, $rect)

    # Vòng tròn trang trí viền vàng cam
    $pad = [int]($size * 0.08)
    $innerSize = $size - ($pad * 2)
    $penRing = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(90, 254, 215, 170), [float]($size * 0.025))
    $g.DrawEllipse($penRing, $pad, $pad, $innerSize, $innerSize)

    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $fontMain = New-Object System.Drawing.Font("Segoe UI", [float]($size * 0.34), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $fontSub = New-Object System.Drawing.Font("Segoe UI", [float]($size * 0.11), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)

    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $creamBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 254, 215, 170))

    $mainRect = New-Object System.Drawing.RectangleF(0, [float]($size * 0.12), [float]$size, [float]($size * 0.52))
    $subRect = New-Object System.Drawing.RectangleF(0, [float]($size * 0.62), [float]$size, [float]($size * 0.22))

    $g.DrawString("HV", $fontMain, $whiteBrush, $mainRect, $sf)
    $g.DrawString("HỢP VỊ AI", $fontSub, $creamBrush, $subRect, $sf)

    $bmp.Save($outFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

New-HopViIcon 192 (Join-Path $iconDir "icon-192.png")
New-HopViIcon 512 (Join-Path $iconDir "icon-512.png")
New-HopViIcon 180 (Join-Path $iconDir "apple-touch-icon.png")
Write-Output "Generated PWA icons successfully."

