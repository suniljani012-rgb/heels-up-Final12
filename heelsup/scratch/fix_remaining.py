import os
import re

PUBLIC_DIR = r"c:\Users\Cyrix HealthCare\Desktop\other\heels-up-new\heelsup\public"
PAGE_STYLES_PATH = os.path.join(PUBLIC_DIR, "page-styles.css")

files_to_process = [
    os.path.join(PUBLIC_DIR, "login.html"),
    os.path.join(PUBLIC_DIR, "register.html"),
    os.path.join(PUBLIC_DIR, "policy", "privacy.html"),
    os.path.join(PUBLIC_DIR, "policy", "returns.html"),
    os.path.join(PUBLIC_DIR, "policy", "terms.html")
]

extracted_styles = []

for filepath in files_to_process:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
        
        # Extract styles
        matches = re.findall(r'<style[^>]*>(.*?)</style>', content, re.DOTALL)
        if matches:
            styles = "\n".join(matches).strip()
            filename = os.path.basename(filepath)
            print(f"Extracted style from {filename} ({len(styles.splitlines())} lines)")
            extracted_styles.append(f"\n/* ==========================================\n   PAGE SPECIFIC: {filename.upper()}\n   ========================================== */")
            extracted_styles.append(styles)
            
            # Remove style block
            content = re.sub(r'<style[^>]*>.*?</style>', '', content, flags=re.DOTALL)
            
            # Clean up old css links and load page-styles.css
            content = re.sub(r'<link rel="stylesheet" href="css/pages/.*?"\s*/?>', '', content)
            content = re.sub(r'<link rel="stylesheet" href="storefront-premium.css"\s*/?>', '', content)
            
            # Check style.css link
            style_link_matches = re.search(r'<link rel="stylesheet" href="style.css"\s*/?>', content)
            # Support relative path for policy pages which are nested in /policy/
            if "policy" in filepath:
                # Replace absolute path links or relative path links to be correct
                content = content.replace('href="style.css"', 'href="../style.css"')
                content = content.replace('href="page-styles.css"', 'href="../page-styles.css"')
                # Check for ../style.css
                style_link_matches = re.search(r'<link rel="stylesheet" href="\.\./style.css"\s*/?>', content)
                
            if style_link_matches:
                style_link = style_link_matches.group(0)
                # Nesting path relative
                rel_styles_path = "../page-styles.css" if "policy" in filepath else "page-styles.css"
                content = content.replace(style_link, style_link + f'\n    <link rel="stylesheet" href="{rel_styles_path}" />')
            else:
                # Inject inside head
                head_match = re.search(r'</head>', content)
                if head_match:
                    rel_style_path = "../style.css" if "policy" in filepath else "style.css"
                    rel_styles_path = "../page-styles.css" if "policy" in filepath else "page-styles.css"
                    content = content.replace('</head>', f'    <link rel="stylesheet" href="{rel_style_path}" />\n    <link rel="stylesheet" href="{rel_styles_path}" />\n</head>')
            
            with open(filepath, 'w', encoding='utf-8', errors='replace') as f:
                f.write(content)
            print(f"Updated HTML file: {filepath}")

# Append extracted styles to page-styles.css
if extracted_styles:
    with open(PAGE_STYLES_PATH, 'r', encoding='utf-8', errors='replace') as f:
        existing = f.read()
        
    full_css = existing + "\n" + "\n".join(extracted_styles)
    
    with open(PAGE_STYLES_PATH, 'w', encoding='utf-8', errors='replace') as f:
        f.write(full_css)
        
    print(f"Appended styles to page-styles.css. New line count: {len(full_css.splitlines())}")
