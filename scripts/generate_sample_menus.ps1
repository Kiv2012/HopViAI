Add-Type -AssemblyName System.Drawing

New-Item -ItemType Directory -Force -Path "sample-menus" | Out-Null

function New-MenuImage($fileName, $title, $subtitle, $lines) {
    $bmp = New-Object System.Drawing.Bitmap(820, 560)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::FromArgb(255, 253, 246))

    $penBorder = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(194, 65, 12), 4)
    $g.DrawRectangle($penBorder, 16, 16, 788, 528)

    $fontTitle = New-Object System.Drawing.Font("Segoe UI", 22, [System.Drawing.FontStyle]::Bold)
    $fontSub = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Italic)
    $fontItem = New-Object System.Drawing.Font("Segoe UI", 15, [System.Drawing.FontStyle]::Bold)
    $fontPrice = New-Object System.Drawing.Font("Segoe UI", 15, [System.Drawing.FontStyle]::Bold)

    $brushPrimary = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(154, 52, 18))
    $brushText = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(28, 25, 23))
    $brushMuted = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(87, 83, 78))

    $g.DrawString($title, $fontTitle, $brushPrimary, 40, 38)
    $g.DrawString($subtitle, $fontSub, $brushMuted, 42, 82)

    $y = 135
    foreach ($line in $lines) {
        $g.DrawString($line.Name, $fontItem, $brushText, 48, $y)
        $g.DrawString($line.Price, $fontPrice, $brushPrimary, 560, $y)
        $y += 58
    }

    $outFile = Join-Path (Resolve-Path "sample-menus").Path $fileName
    $bmp.Save($outFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Created $outFile"
}

New-MenuImage "menu-bun-thai-thanh-minh.png" "BÚN THÁI & MÌ TRỘN THÀNH MINH" "Địa chỉ: 129 Hưng Đạo Vương, P. Trấn Biên, Đồng Nai" @(
    @{ Name = "1. Bún Thái Viên"; Price = "39.000 VNĐ" },
    @{ Name = "2. Bún Thái Bò Trứng / Thập Cẩm"; Price = "55.000 VNĐ" },
    @{ Name = "3. Bún Thái Hải Sản"; Price = "60.000 VNĐ" },
    @{ Name = "4. Mì Trộn Viên"; Price = "42.000 VNĐ" },
    @{ Name = "5. Mì Trộn Hải Sản"; Price = "63.000 VNĐ" },
    @{ Name = "6. Mì Trộn Đặc Biệt"; Price = "68.000 VNĐ" }
)

New-MenuImage "menu-lang-buoi-tan-trieu.png" "ĐẶC SẢN LÀNG BƯỞI TÂN TRIỀU" "Khu phố Tân Triều, P. Tân Triều, Biên Hòa, Đồng Nai" @(
    @{ Name = "1. Gỏi Làng Bưởi Đặc Biệt"; Price = "170.000đ / đĩa" },
    @{ Name = "2. Gỏi Bưởi Trong Trái Bưởi"; Price = "320.000đ / đĩa" },
    @{ Name = "3. Gà Hấp Trái Bưởi Tân Triều"; Price = "250.000đ / con" },
    @{ Name = "4. Gà Nướng Muối Ớt (1 món / 2 món)"; Price = "300k - 340k / kg" },
    @{ Name = "5. Xôi Bồ Câu Rôti"; Price = "130.000đ / phần" }
)

