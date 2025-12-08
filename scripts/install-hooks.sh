#!/bin/sh

SOURCE_DIR="hooks"
TARGET_DIR=".git/hooks"

if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ Le dossier '$SOURCE_DIR' n'existe pas."
    exit 1
fi

if [ ! -d "$TARGET_DIR" ]; then
    echo "❌ Le dossier '$TARGET_DIR' n'existe pas. Assurez-vous d'être dans un dépôt Git."
    exit 1
fi

# Copier tous les hooks du dossier versionné
for hook in "$SOURCE_DIR"/*; do
    if [ -f "$hook" ]; then
        hook_name=$(basename "$hook")
        target_path="$TARGET_DIR/$hook_name"
        cp "$hook" "$target_path"
        chmod +x "$target_path"
        echo "✅ Hook '$hook_name' installé"
    fi
done

echo ""
echo "✅ Tous les hooks ont été installés avec succès!"
echo "   Les hooks seront exécutés automatiquement lors des opérations Git."

