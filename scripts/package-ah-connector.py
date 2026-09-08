"""Rebuild the downloadable extension from its checked-in source and catalog."""
import json
import subprocess
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
extension = root / "extensions" / "ah-connector"
catalog = json.loads(subprocess.check_output([
    "node", "--input-type=module", "-e",
    "import {PRODUCTS} from './lib/groceries/catalog.ts'; process.stdout.write(JSON.stringify(PRODUCTS.map(({id,name,url})=>({id,name,url}))));",
], cwd=root, text=True))
(extension / "catalog.js").write_text(
    "// Generated from lib/groceries/catalog.ts by scripts/package-ah-connector.py.\n"
    + "export const CATALOG = " + json.dumps(catalog, indent=2, ensure_ascii=False) + ";\n",
    encoding="utf-8",
)
destination = root / "public" / "downloads" / "life-app-ah-connector.zip"
destination.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(extension.iterdir()):
        if path.suffix not in {".js", ".json", ".md"}:
            continue
        entry = zipfile.ZipInfo(path.name, date_time=(2026, 9, 7, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        entry.external_attr = 0o644 << 16
        archive.writestr(entry, path.read_bytes())
print(f"Packaged {len(archive.filelist)} files: {destination.relative_to(root)}")
