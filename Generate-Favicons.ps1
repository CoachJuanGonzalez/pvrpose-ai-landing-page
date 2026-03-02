# PVRPOSE AI Favicon Generator
# PowerShell script to generate all required favicon files

Write-Host "PVRPOSE AI Favicon Generator" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Load required assemblies
Add-Type -AssemblyName System.Drawing

$sourceFile = "logos-ai-rez-01.png"
$currentPath = Get-Location

# Check if source file exists
if (-not (Test-Path $sourceFile)) {
    Write-Host "Error: $sourceFile not found!" -ForegroundColor Red
    Write-Host "Make sure you run this script in the correct directory." -ForegroundColor Yellow
    exit 1
}

Write-Host "Loading source image: $sourceFile" -ForegroundColor Green

try {
    # Load source image
    $sourceImage = [System.Drawing.Image]::FromFile((Join-Path $currentPath $sourceFile))
    $sourceWidth = $sourceImage.Width
    $sourceHeight = $sourceImage.Height
    Write-Host "Source image loaded: ${sourceWidth}x${sourceHeight}" -ForegroundColor Green
    Write-Host ""

    # Define sizes to generate
    $sizes = @(
        @{Name="favicon-16x16.png"; Width=16; Height=16},
        @{Name="favicon-32x32.png"; Width=32; Height=32},
        @{Name="apple-touch-icon.png"; Width=180; Height=180},
        @{Name="android-chrome-192x192.png"; Width=192; Height=192},
        @{Name="android-chrome-512x512.png"; Width=512; Height=512}
    )

    # Generate each size
    foreach ($size in $sizes) {
        $w = $size.Width
        $h = $size.Height
        $name = $size.Name
        Write-Host "Generating ${name} (${w}x${h})..." -ForegroundColor Yellow

        # Create new bitmap
        $newImage = New-Object System.Drawing.Bitmap($w, $h)
        $graphics = [System.Drawing.Graphics]::FromImage($newImage)

        # Set high quality rendering
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

        # Fill with white background
        $graphics.Clear([System.Drawing.Color]::White)

        # Draw resized image
        $destRect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
        $graphics.DrawImage($sourceImage, $destRect)

        # Save the image
        $outputPath = Join-Path $currentPath $name
        $newImage.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

        # Cleanup
        $graphics.Dispose()
        $newImage.Dispose()

        Write-Host "  Saved: ${name}" -ForegroundColor Green
    }

    # Generate OG image (1200x630)
    Write-Host ""
    Write-Host "Generating og-image.png (1200x630) for social media..." -ForegroundColor Yellow

    $ogWidth = 1200
    $ogHeight = 630
    $ogImage = New-Object System.Drawing.Bitmap($ogWidth, $ogHeight)
    $ogGraphics = [System.Drawing.Graphics]::FromImage($ogImage)

    # Set high quality rendering
    $ogGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $ogGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $ogGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $ogGraphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    # Fill with white background
    $ogGraphics.Clear([System.Drawing.Color]::White)

    # Calculate logo size (60% of height)
    $logoHeight = [int]($ogHeight * 0.6)
    $logoWidth = [int](($sourceImage.Width / $sourceImage.Height) * $logoHeight)
    $x = [int](($ogWidth - $logoWidth) / 2)
    $y = [int](($ogHeight - $logoHeight) / 2)

    # Draw centered logo
    $ogRect = New-Object System.Drawing.Rectangle($x, $y, $logoWidth, $logoHeight)
    $ogGraphics.DrawImage($sourceImage, $ogRect)

    # Save OG image
    $ogPath = Join-Path $currentPath "og-image.png"
    $ogImage.Save($ogPath, [System.Drawing.Imaging.ImageFormat]::Png)

    # Cleanup
    $ogGraphics.Dispose()
    $ogImage.Dispose()

    Write-Host "  Saved: og-image.png" -ForegroundColor Green

    # Cleanup source image
    $sourceImage.Dispose()

    Write-Host ""
    Write-Host "All favicon images generated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Generated files:" -ForegroundColor Cyan
    foreach ($size in $sizes) {
        Write-Host "  * $($size.Name)" -ForegroundColor White
    }
    Write-Host "  * og-image.png" -ForegroundColor White
    Write-Host ""
    Write-Host "Note: For favicon.ico, use favicon-32x32.png with:" -ForegroundColor Yellow
    Write-Host "https://www.favicon-generator.org/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Done! All favicons are ready!" -ForegroundColor Green

}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
