import os
import re
import glob

desktop_nav = '''      <nav class="header-nav" id="desktopNav">
        <div class="nav-item">
          <a href="nosotros.html" class="nav-link">Nosotros</a>
        </div>
        <div class="nav-item">
          <a href="casas.html" class="nav-link">Conecta</a>
        </div>
        <div class="nav-item">
          <a href="lectura.html" class="nav-link">Crece</a>
        </div>
        <div class="nav-item">
          <a href="sirve.html" class="nav-link">Sirve</a>
        </div>
        <div class="nav-item">
          <a href="eventos.html" class="nav-link">Eventos</a>
        </div>
        <div class="nav-item">
          <a href="registro.html" class="nav-link">Planea tu visita</a>
        </div>
        <div class="nav-item">
          <a href="dar.html" class="nav-link">Dar</a>
        </div>
      </nav>'''

mobile_nav = '''  <!-- MOBILE NAV -->
  <div class="mobile-nav" id="mobileNav">
    <a href="nosotros.html" class="mobile-nav-link">Nosotros</a>
    <a href="casas.html" class="mobile-nav-link">Conecta</a>
    <a href="lectura.html" class="mobile-nav-link">Crece</a>
    <a href="sirve.html" class="mobile-nav-link">Sirve</a>
    <a href="eventos.html" class="mobile-nav-link">Eventos</a>
    <a href="registro.html" class="mobile-nav-link">Planea tu visita</a>
    <a href="dar.html" class="mobile-nav-link">Dar</a>
'''

def update_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace desktop nav
    content = re.sub(r'<nav class="header-nav" id="desktopNav">.*?</nav>', desktop_nav, content, flags=re.DOTALL)
    
    # Replace mobile nav (be careful about footer)
    # We will replace from <div class="mobile-nav" id="mobileNav"> until either <div class="mobile-nav-footer"> or </header> or <main> or <!-- HERO -->
    # Actually it's easier to find the inner links and replace them.
    
    # A safer way: find `<div class="mobile-nav" id="mobileNav">` and the list of `<a ...>` tags and replace them.
    # We can match <div class="mobile-nav" id="mobileNav"> up to the last </a> before </div> or <div class="mobile-nav-footer">
    
    mobile_pattern = r'<!-- MOBILE NAV -->\s*<div class="mobile-nav" id="mobileNav">(.*?)(?=<div class="mobile-nav-footer">|</main>|<!-- HERO -->|<section|</div>\s*<!-- HERO -->|</div>\s*<main>)'
    # Wait, the mobile nav might end with </div> directly.
    # It's better to replace the whole mobile nav block if we are sure what it is.
    
    # Let's just use string replacement for the known variants, or a regex that looks for all <a class="mobile-nav-link"> tags.
    link_pattern = r'(<div class="mobile-nav" id="mobileNav">\s*)(<a href=.*?class="mobile-nav-link">.*?</a>\s*)+'
    replacement = r'\g<1>' + '\n    '.join([
        '<a href="nosotros.html" class="mobile-nav-link">Nosotros</a>',
        '<a href="casas.html" class="mobile-nav-link">Conecta</a>',
        '<a href="lectura.html" class="mobile-nav-link">Crece</a>',
        '<a href="sirve.html" class="mobile-nav-link">Sirve</a>',
        '<a href="eventos.html" class="mobile-nav-link">Eventos</a>',
        '<a href="registro.html" class="mobile-nav-link">Planea tu visita</a>',
        '<a href="dar.html" class="mobile-nav-link">Dar</a>\n  '
    ])
    
    content = re.sub(link_pattern, replacement, content, flags=re.DOTALL)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for filepath in glob.glob('*.html'):
    update_file(filepath)
    print(f"Updated {filepath}")
