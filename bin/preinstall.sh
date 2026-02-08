#!/bin/bash

set -e

echo "Installing electron globally..."
sudo npm install -g electron

if [ "$(uname)" = "Linux" ]; then
  echo "Fixing chrome-sandbox permissions on Linux..."
  ELECTRON_PATH=$(which electron)
  ELECTRON_DIR=$(dirname "$ELECTRON_PATH")
  SANDBOX_PATH="$ELECTRON_DIR/../lib/node_modules/electron/dist/chrome-sandbox"
  
  if [ -f "$SANDBOX_PATH" ]; then
    sudo chown root:root "$SANDBOX_PATH"
    sudo chmod 4755 "$SANDBOX_PATH"
    echo "chrome-sandbox permissions fixed"
  else
    echo "Warning: chrome-sandbox not found at $SANDBOX_PATH"
  fi
fi

echo "Electron setup complete"
