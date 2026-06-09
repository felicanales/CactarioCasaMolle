# Migracion De Fotos Embebidas

El script `migrate_photos.py` lee el Excel en `data/photo-migration/Especies de cactus CasaMolle (2).xlsx` y genera el CSV en `data/photo-migration/migracion_resultado.csv`.

Para uso manual, preferir login OTP interactivo. No copies tokens JWT desde el navegador.

## Dry Run

```powershell
cd "C:\Users\CACTARIO CM\CactarioCasaMolle"
python -m pip install -r requirements_migration.txt
$env:CACTARIO_API_URL="https://cactariocasamolle-production.up.railway.app"
python migrate_photos.py
```

## Subir 3 Especies

```powershell
cd "C:\Users\CACTARIO CM\CactarioCasaMolle"
$env:CACTARIO_API_URL="https://cactariocasamolle-production.up.railway.app"
Remove-Item Env:CACTARIO_AUTH_TOKEN -ErrorAction SilentlyContinue
python migrate_photos.py --no-dry-run
```

El script pedira email staff y codigo OTP. El access token queda solo en memoria del proceso.

## Subir Todo

```powershell
cd "C:\Users\CACTARIO CM\CactarioCasaMolle"
$env:CACTARIO_API_URL="https://cactariocasamolle-production.up.railway.app"
Remove-Item Env:CACTARIO_AUTH_TOKEN -ErrorAction SilentlyContinue
python migrate_photos.py --no-dry-run --all
```

`CACTARIO_AUTH_TOKEN` queda disponible solo como fallback para automatizacion controlada. Si se usa temporalmente, limpiar la variable al terminar:

```powershell
Remove-Item Env:CACTARIO_AUTH_TOKEN
```
