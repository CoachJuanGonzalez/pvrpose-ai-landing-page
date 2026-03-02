# Create favicon.ico from PNG files
# Combines 16x16 and 32x32 into multi-resolution ICO

Write-Host "Creating favicon.ico..." -ForegroundColor Cyan

Add-Type -AssemblyName System.Drawing

$currentPath = Get-Location
$icon16Path = Join-Path $currentPath "favicon-16x16.png"
$icon32Path = Join-Path $currentPath "favicon-32x32.png"
$outputPath = Join-Path $currentPath "favicon.ico"

# Check if source files exist
if (-not (Test-Path $icon16Path)) {
    Write-Host "Error: favicon-16x16.png not found!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $icon32Path)) {
    Write-Host "Error: favicon-32x32.png not found!" -ForegroundColor Red
    exit 1
}

try {
    # Load the images
    $img16 = [System.Drawing.Image]::FromFile($icon16Path)
    $img32 = [System.Drawing.Image]::FromFile($icon32Path)

    # Create icon from images
    $iconStream = New-Object System.IO.MemoryStream
    $iconWriter = New-Object System.IO.BinaryWriter($iconStream)

    # Write ICO header
    $iconWriter.Write([UInt16]0)  # Reserved (must be 0)
    $iconWriter.Write([UInt16]1)  # Type (1 = ICO)
    $iconWriter.Write([UInt16]2)  # Number of images

    # Helper function to write PNG as ICO entry
    function Write-IconEntry {
        param($image, $writer, $offset)

        $pngStream = New-Object System.IO.MemoryStream
        $image.Save($pngStream, [System.Drawing.Imaging.ImageFormat]::Png)
        $pngBytes = $pngStream.ToArray()
        $pngStream.Close()

        # Write ICO directory entry
        $writer.Write([byte]$image.Width)    # Width
        $writer.Write([byte]$image.Height)   # Height
        $writer.Write([byte]0)               # Color palette
        $writer.Write([byte]0)               # Reserved
        $writer.Write([UInt16]1)             # Color planes
        $writer.Write([UInt16]32)            # Bits per pixel
        $writer.Write([UInt32]$pngBytes.Length)  # Size of data
        $writer.Write([UInt32]$offset)       # Offset to data

        return $pngBytes
    }

    # Calculate offsets (header = 6 bytes, each entry = 16 bytes)
    $headerSize = 6
    $entrySize = 16
    $offset16 = $headerSize + (2 * $entrySize)

    # Get PNG data
    $stream16 = New-Object System.IO.MemoryStream
    $img16.Save($stream16, [System.Drawing.Imaging.ImageFormat]::Png)
    $png16 = $stream16.ToArray()
    $stream16.Close()

    $stream32 = New-Object System.IO.MemoryStream
    $img32.Save($stream32, [System.Drawing.Imaging.ImageFormat]::Png)
    $png32 = $stream32.ToArray()
    $stream32.Close()

    $offset32 = $offset16 + $png16.Length

    # Write directory entries
    # 16x16 entry
    $iconWriter.Write([byte]16)              # Width
    $iconWriter.Write([byte]16)              # Height
    $iconWriter.Write([byte]0)               # Color palette
    $iconWriter.Write([byte]0)               # Reserved
    $iconWriter.Write([UInt16]1)             # Color planes
    $iconWriter.Write([UInt16]32)            # Bits per pixel
    $iconWriter.Write([UInt32]$png16.Length) # Size
    $iconWriter.Write([UInt32]$offset16)     # Offset

    # 32x32 entry
    $iconWriter.Write([byte]32)              # Width
    $iconWriter.Write([byte]32)              # Height
    $iconWriter.Write([byte]0)               # Color palette
    $iconWriter.Write([byte]0)               # Reserved
    $iconWriter.Write([UInt16]1)             # Color planes
    $iconWriter.Write([UInt16]32)            # Bits per pixel
    $iconWriter.Write([UInt32]$png32.Length) # Size
    $iconWriter.Write([UInt32]$offset32)     # Offset

    # Write image data
    $iconWriter.Write($png16)
    $iconWriter.Write($png32)

    # Save to file
    $iconBytes = $iconStream.ToArray()
    [System.IO.File]::WriteAllBytes($outputPath, $iconBytes)

    # Cleanup
    $iconWriter.Close()
    $iconStream.Close()
    $img16.Dispose()
    $img32.Dispose()

    Write-Host "  Saved: favicon.ico" -ForegroundColor Green
    Write-Host "Done! Multi-resolution favicon.ico created (16x16 + 32x32)" -ForegroundColor Green

}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Stack: $($_.Exception.StackTrace)" -ForegroundColor Red
    exit 1
}
