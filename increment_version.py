#!/usr/bin/env python3
import sys
import re
import os

def increment_version(file_path):
    if not os.path.exists(file_path):
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Search for @version in the metadata block
    # Matches: // @version      0.1.5
    version_pattern = r'(//\s*@version\s+)(\d+\.\d+\.)(\d+)'
    
    def replace_version(match):
        prefix = match.group(1)
        base = match.group(2)
        patch = int(match.group(3))
        new_version = f"{prefix}{base}{patch + 1}"
        print(f"Incrementing {file_path}: {match.group(2)}{patch} -> {base}{patch + 1}")
        return new_version

    new_content, count = re.subn(version_pattern, replace_version, content, count=1)

    if count > 0:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

if __name__ == "__main__":
    # Get staged files from command line arguments
    staged_files = sys.argv[1:]
    for f_path in staged_files:
        if f_path.endswith('.js'):
            if increment_version(f_path):
                # Re-add the file to git to include the version change in the commit
                os.system(f'git add "{f_path}"')
