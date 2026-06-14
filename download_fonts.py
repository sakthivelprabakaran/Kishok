import os
import urllib.request
import urllib.parse
import urllib.error

font_dir = "/Users/sakthivelprabakaran/Downloads/Yoursgift_keychain-main-2/Fonts"
os.makedirs(font_dir, exist_ok=True)

# List of fonts and their precise urls on github
# Format: (DisplayName, TargetLocalFileName, Folder, GithubFileName)
font_definitions = [
    ("Chewy", "Chewy-Regular.ttf", "apache/chewy", "Chewy-Regular.ttf"),
    ("Bebas Neue", "BebasNeue-Regular.ttf", "ofl/bebasneue", "BebasNeue-Regular.ttf"),
    ("Lobster", "Lobster-Regular.ttf", "ofl/lobster", "Lobster-Regular.ttf"),
    ("Pacifico", "Pacifico-Regular.ttf", "ofl/pacifico", "Pacifico-Regular.ttf"),
    ("Raleway", "Raleway-Regular.ttf", "ofl/raleway", "Raleway[ital,wght].ttf"),
    ("Oswald", "Oswald-Regular.ttf", "ofl/oswald", "Oswald[wght].ttf"),
    ("Anton", "Anton-Regular.ttf", "ofl/anton", "Anton-Regular.ttf"),
    ("Archivo Black", "ArchivoBlack-Regular.ttf", "ofl/archivoblack", "ArchivoBlack-Regular.ttf"),
    ("Impact", "impact.ttf", None, "https://raw.githubusercontent.com/sophilabs/macgifer/master/static/font/impact.ttf"),
    ("Playfair Display", "PlayfairDisplay-Regular.ttf", "ofl/playfairdisplay", "PlayfairDisplay[ital,opsz,wght].ttf"),
    ("Orbitron", "Orbitron-Regular.ttf", "ofl/orbitron", "Orbitron[wght].ttf"),
    ("Press Start 2P", "PressStart2P-Regular.ttf", "ofl/pressstart2p", "PressStart2P-Regular.ttf"),
    ("Creepster", "Creepster-Regular.ttf", "ofl/creepster", "Creepster-Regular.ttf"),
    ("Poppins", "Poppins-Regular.ttf", "ofl/poppins", "Poppins-Regular.ttf"),
    ("Monoton", "Monoton-Regular.ttf", "ofl/monoton", "Monoton-Regular.ttf"),
    ("Shadows Into Light", "ShadowsIntoLight.ttf", "ofl/shadowsintolight", "ShadowsIntoLight.ttf"),
    ("Fredoka One", "FredokaOne-Regular.ttf", "ofl/fredoka", "Fredoka[wdth,wght].ttf"),
    ("Cinzel", "Cinzel-Regular.ttf", "ofl/cinzel", "Cinzel[wght].ttf"),
    ("Amatic SC", "AmaticSC-Regular.ttf", "ofl/amaticsc", "AmaticSC-Regular.ttf"),
    ("Exo 2", "Exo2-Regular.ttf", "ofl/exo2", "Exo2[ital,wght].ttf"),
]

def download_font(name, local_name, folder, github_file):
    dest_path = os.path.join(font_dir, local_name)
    if os.path.exists(dest_path):
        print(f"[Exist] {name} already exists as {local_name}")
        return True

    if folder is None:
        # Direct URL (like Impact)
        url = github_file
    else:
        # Construct URL with encoded path
        encoded_file = urllib.parse.quote(github_file)
        url = f"https://github.com/google/fonts/raw/main/{folder}/{encoded_file}"

    print(f"Downloading {name} from {url}...")
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}
        )
        with urllib.request.urlopen(req) as response:
            with open(dest_path, 'wb') as f:
                f.write(response.read())
        print(f"[Success] Downloaded {name} -> {local_name}")
        return True
    except Exception as e:
        print(f"[Failed] Could not download {name} from {url}: {e}")
        # Try fallback for variable fonts: just [wght].ttf
        if "[" in github_file and "wght" in github_file:
            fallback_file = f"{github_file.split('[')[0]}[wght].ttf"
            fallback_encoded = urllib.parse.quote(fallback_file)
            fallback_url = f"https://github.com/google/fonts/raw/main/{folder}/{fallback_encoded}"
            print(f"Trying fallback for {name}: {fallback_url}")
            try:
                req = urllib.request.Request(
                    fallback_url, 
                    headers={'User-Agent': 'Mozilla/5.0'}
                )
                with urllib.request.urlopen(req) as response:
                    with open(dest_path, 'wb') as f:
                        f.write(response.read())
                print(f"[Success] Downloaded {name} -> {local_name} (via fallback)")
                return True
            except Exception as fe:
                print(f"[Failed Fallback] {name}: {fe}")
        return False

success_count = 0
for name, local_name, folder, github_file in font_definitions:
    if download_font(name, local_name, folder, github_file):
        success_count += 1

print(f"\nFinal font sync: {success_count}/{len(font_definitions)} fonts successfully resolved.")
