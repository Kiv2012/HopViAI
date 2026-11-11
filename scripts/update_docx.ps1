Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$docxPath = (Resolve-Path "BẢN MÔ TẢ CHI TIẾT.docx").Path
$backupPath = Join-Path (Split-Path $docxPath) "BẢN MÔ TẢ CHI TIẾT_GỐC.docx"

if (-not (Test-Path $backupPath)) {
    Copy-Item -Path $docxPath -Destination $backupPath -Force
    Write-Output "Created backup: BẢN MÔ TẢ CHI TIẾT_GỐC.docx"
} else {
    Copy-Item -Path $backupPath -Destination $docxPath -Force
}

$zip = [System.IO.Compression.ZipFile]::Open($docxPath, [System.IO.Compression.ZipArchiveMode]::Update)
$entry = $zip.GetEntry("word/document.xml")

$reader = New-Object System.IO.StreamReader($entry.Open(), [System.Text.Encoding]::UTF8)
[xml]$xml = $reader.ReadToEnd()
$reader.Close()

$ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
$ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")

function Set-ParagraphText($pNode, [string]$newText) {
    $tNodes = $pNode.SelectNodes(".//w:t", $ns)
    if ($tNodes.Count -gt 0) {
        $tNodes[0].InnerText = $newText
        for ($i = 1; $i -lt $tNodes.Count; $i++) {
            $tNodes[$i].InnerText = ""
        }
    }
}

$updatedCount = 0
foreach ($p in $xml.SelectNodes("//w:p", $ns)) {
    $fullText = (($p.SelectNodes(".//w:t", $ns) | ForEach-Object { $_.InnerText }) -join "").Trim()

    if ($fullText -eq "3–5 quán") {
        Set-ParagraphText $p "18 quán ăn tại TP. Biên Hòa (Trấn Biên, Tam Hiệp, Tân Triều, Bửu Long, Thanh Bình, Thống Nhất)"
        $updatedCount++
    }
    elseif ($fullText -eq "Khoảng 15–25 món") {
        Set-ParagraphText $p "130 món ăn và combo có nguồn giá xác minh (từ Hợp vị AI.xlsx)"
        $updatedCount++
    }
    elseif ($fullText -eq "Khoảng 30 tình huống") {
        Set-ParagraphText $p "30 tình huống kiểm thử tự động (Đạt 30/30 - 100%)"
        $updatedCount++
    }
    elseif ($fullText -like "Quy mô mục tiêu gồm 8 - 10 quán*") {
        Set-ParagraphText $p "Quy mô thực nghiệm đã triển khai gồm 18 quán ăn đã xác minh, 130 món ăn/combo tại Biên Hòa – Đồng Nai, 04 chuyên mục đặc sản có tư liệu kiểm chứng và khả năng hỗ trợ yêu cầu từ 1–5 người (kèm bản đồ số dẫn đường trực tiếp)."
        $updatedCount++
    }
    elseif ($fullText -like "Dự án đã có bản đề xuất và nguyên mẫu website gồm bốn danh mục chính*") {
        Set-ParagraphText $p "Dự án đã hoàn thiện sản phẩm Website Full-stack (triển khai trực tuyến tại https://hop-vi-ai.vercel.app và kho mã nguồn https://github.com/Kiv2012/HopViAI, tối ưu giao diện máy tính & điện thoại di động kèm bản đồ dẫn đường trực tiếp) gồm bốn danh mục chính, ba khu vực sử dụng (Người dùng, Đối tác, Admin) và bộ giải tổ hợp món theo nguyên tắc Công bằng nhóm (Maximin Fairness) trên cơ sở dữ liệu 18 quán ăn (130 món) tại Đồng Nai."
        $updatedCount++
    }
    elseif ($fullText -like "Tuy nhiên, phần phân tích câu nhập trong nguyên mẫu hiện dựa trên từ khóa*") {
        Set-ParagraphText $p "Hệ thống đã tích hợp mô hình ngôn ngữ và thị giác máy tính Google Gemini 2.5 Flash (gemini-2.5-flash) thông qua REST API với JSON Schema chặt chẽ, kết hợp cơ chế kiểm soát chi phí Token (Cost-Aware Pipeline) và bộ phân tích ngữ nghĩa dự phòng (Semantic Fallback) kèm bước xác nhận nhu cầu trung gian."
        $updatedCount++
    }
    elseif ($fullText -like "Các nội dung chưa có minh chứng hoàn thành gồm tích hợp API AI*") {
        Set-ParagraphText $p "Các nội dung đã hoàn thành minh chứng thực nghiệm gồm: (1) Tích hợp API Gemini 2.5 Flash cho phân tích nhu cầu và AI Scan Menu; (2) Chuẩn hóa dữ liệu thực đơn 18 quán ăn với 130 món tại Đồng Nai; (3) Kiểm thử tự động 30 tình huống đạt 30/30 (100% PASS, độ chính xác kiểm tra ngân sách tuyệt đối 100%, thời gian giải tổ hợp trung bình < 5ms)."
        $updatedCount++
    }
    elseif ($fullText -like "Thiếu minh chứng định lượng: Chưa có kết quả kiểm thử*") {
        Set-ParagraphText $p "Minh chứng định lượng bước đầu: Đã hoàn thành kiểm thử tự động trên 30 tình huống tiêu chuẩn (đạt 30/30 - 100% PASS) tại báo cáo EVALUATION_REPORT.md; giai đoạn tiếp theo sẽ mở rộng khảo sát định lượng trên quy mô người dùng thực tế lớn hơn."
        $updatedCount++
    }
}

$entry.Delete()
$newEntry = $zip.CreateEntry("word/document.xml")
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$writer = New-Object System.IO.StreamWriter($newEntry.Open(), $utf8NoBom)
$xml.Save($writer)
$writer.Flush()
$writer.Close()
$zip.Dispose()

Write-Output ("Successfully updated " + $updatedCount + " sections in BẢN MÔ TẢ CHI TIẾT.docx")
