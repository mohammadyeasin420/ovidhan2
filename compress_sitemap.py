import gzip
import shutil

files = [
    'sitemap-part-1.xml',
    'sitemap-part-2.xml',
    'sitemap-part-3.xml',
    'sitemap-part-4.xml'
]

for fname in files:
    with open(fname, 'rb') as f_in:
        with gzip.open(fname + '.gz', 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)
    print(f"✅ Compressed {fname} -> {fname}.gz")