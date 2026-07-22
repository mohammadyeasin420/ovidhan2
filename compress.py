import gzip
import shutil

with open('sitemap-part-1.xml', 'rb') as f_in:
    with gzip.open('sitemap-part-1.xml.gz', 'wb') as f_out:
        shutil.copyfileobj(f_in, f_out)

print("✅ Sitemap compressed to sitemap-part-1.xml.gz")