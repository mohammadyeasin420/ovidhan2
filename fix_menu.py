from bs4 import BeautifulSoup

file_path = "listening.html"

# Read the HTML
with open(file_path, 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

# Find the mega-menu <ul>
menu_ul = soup.find('ul', id='megaMenu')
if not menu_ul:
    print("❌ Could not find <ul id='megaMenu'>. Aborting.")
    exit(1)

# Find the Speaking <li> inside the menu
speaking_li = None
for li in menu_ul.find_all('li'):
    a = li.find('a')
    if a and '🗣 Speaking' in a.get_text():
        speaking_li = li
        break

if not speaking_li:
    print("❌ Could not find the Speaking menu item. Aborting.")
    exit(1)

# Create the new Listening <li>
new_li = soup.new_tag('li')
new_li.append(soup.new_tag('a', href='/listening.html', string='🎧 Listening'))

dropdown = soup.new_tag('div', attrs={'class': 'dropdown'})
links = [
    ('All Listening Exercises', '/listening.html#lessons'),
    ('Daily English', '/listening.html'),
    ('Travel English', '/listening.html'),
    ('Workplace English', '/listening.html'),
    ('Academic English', '/listening.html'),
    ('IELTS Listening', '/listening.html')
]
for text, url in links:
    a = soup.new_tag('a', href=url, string=text)
    dropdown.append(a)

new_li.append(dropdown)

# Insert the new <li> after the Speaking <li>
speaking_li.insert_after(new_li)

# Write the modified HTML back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(str(soup))

print(f"✅ Listening menu inserted into {file_path}")