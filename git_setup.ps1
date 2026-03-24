Set-Location 'D:\workspace\mud'
$git = 'C:\Program Files\Git\cmd\git.exe'

& $git config user.name "ed100084"
& $git config user.email "ed100084@github.com"
& $git add --all
Write-Host "=== Staged files ==="
& $git status --short
Write-Host "=== Commit ==="
& $git commit -m "feat: complete single-player MUD game with GUI

- Terminal-style MUD with Vite + TypeScript + Decimal.js
- Infinite rebirth/prestige system with soul fragment tree
- 5-tier job system (Warrior→Demigod) with mastery
- Turn-based combat with enemy HP bars
- Procedural dungeon generation (Roguelike mode)
- Full town system: shops, NPCs, dialogue trees, quests
- Monster taming / companion system
- Mobile-first GUI: context panels, D-pad, slide-up sheets
- IndexedDB-ready save system with Base64 export/import
- Offline progress calculation (up to 24h)
"
Write-Host "=== Done ==="
& $git log --oneline -3
