import os

def clean_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    if not lines:
        return

    # Check for Wayback Machine wrapper (JS specific)
    if filepath.endswith('.js') and '_____WB$wombat$assign$function_____' in lines[0]:
        print(f"Cleaning JS wrapper from {filepath}...")
        
        # Find the start of actual content. Usually line 10 (index 9)
        start_idx = 0
        for i, line in enumerate(lines):
            if 'let opens = _____WB$wombat$assign$function_____("opens");' in line:
                start_idx = i + 1
                break
        
        # Find the end of actual content. It's the last '}' before the archive footer.
        end_idx = len(lines)
        for i in range(len(lines) - 1, -1, -1):
            if 'FILE ARCHIVED ON' in lines[i]:
                # Look for the '}' above it
                for j in range(i - 1, -1, -1):
                    if lines[j].strip() == '}':
                        end_idx = j
                        break
                break
        
        lines = lines[start_idx:end_idx]

    # General footer removal for any file type (JS/CSS)
    # The archive footer starts with '/*' and contains 'FILE ARCHIVED ON'
    print(f"Checking for archive footer in {filepath}...")
    footer_start_idx = -1
    for i in range(len(lines) - 1, -1, -1):
        if 'FILE ARCHIVED ON' in lines[i]:
            # Look for the '/*' above it
            for j in range(i, -1, -1):
                if '/*' in lines[j]:
                    footer_start_idx = j
                    break
            break
    
    if footer_start_idx != -1:
        print(f"Removing archive footer from {filepath} at line {footer_start_idx}...")
        lines = lines[:footer_start_idx]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(lines)

dirs = [
    '/home/poser/Documents/github_personal/mogging/js',
    '/home/poser/Documents/github_personal/mogging/css'
]

for d in dirs:
    if os.path.exists(d):
        for filename in os.listdir(d):
            if filename.endswith('.js') or filename.endswith('.css'):
                clean_file(os.path.join(d, filename))
