#!/bin/bash
# 双击即可启动桌宠（macOS）
cd "$(dirname "$0")"
export PATH="$HOME/.nvm/versions/node/v22.22.1/bin:$PATH"
npm start
