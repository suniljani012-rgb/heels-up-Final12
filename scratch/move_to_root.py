import os
import shutil

ROOT_DIR = r"c:\Users\Cyrix HealthCare\Desktop\other\heels-up-new"
HEELSUP_DIR = os.path.join(ROOT_DIR, "heelsup")

def migrate():
    print(f"Migrating files from {HEELSUP_DIR} to {ROOT_DIR}...")
    
    # 1. Merge .gitignore if heelsup has extra rules
    root_gitignore_path = os.path.join(ROOT_DIR, ".gitignore")
    sub_gitignore_path = os.path.join(HEELSUP_DIR, ".gitignore")
    
    gitignore_rules = set()
    if os.path.exists(root_gitignore_path):
        with open(root_gitignore_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    gitignore_rules.add(line)
                    
    if os.path.exists(sub_gitignore_path):
        with open(sub_gitignore_path, 'r', encoding='utf-8') as f:
            extra_rules = []
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and line not in gitignore_rules:
                    extra_rules.append(line)
            if extra_rules:
                print(f"Adding extra gitignore rules: {extra_rules}")
                with open(root_gitignore_path, 'a', encoding='utf-8') as f:
                    f.write("\n# heelsup sub-folder specific\n" + "\n".join(extra_rules) + "\n")

    # 2. Move files and directories
    for item in os.listdir(HEELSUP_DIR):
        if item == ".gitignore":
            continue
            
        src = os.path.join(HEELSUP_DIR, item)
        dst = os.path.join(ROOT_DIR, item)
        
        print(f"Moving {item}...")
        if os.path.exists(dst):
            if os.path.isdir(dst):
                # If directory exists, merge files
                for root, dirs, files in os.walk(src):
                    rel_path = os.path.relpath(root, src)
                    dst_dir = os.path.join(dst, rel_path) if rel_path != "." else dst
                    os.makedirs(dst_dir, exist_ok=True)
                    for f in files:
                        shutil.move(os.path.join(root, f), os.path.join(dst_dir, f))
            else:
                os.remove(dst)
                shutil.move(src, dst)
        else:
            shutil.move(src, dst)
            
    print("Migration completed. Cleaning up heelsup subdirectory...")
    try:
        shutil.rmtree(HEELSUP_DIR)
        print("heelsup directory removed.")
    except Exception as e:
        print(f"Could not remove heelsup folder: {e}")

if __name__ == "__main__":
    migrate()
