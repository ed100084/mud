Set-Location 'D:\workspace\mud'
$git = 'C:\Program Files\Git\cmd\git.exe'

& $git remote add origin https://github.com/ed100084/mud.git
& $git branch -M main
Write-Host "=== Pushing to GitHub ==="
& $git push -u origin main 2>&1
Write-Host "=== Push complete ==="
