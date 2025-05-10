#!/usr/bin/env bash

# ────────────────────────────────────────────────────────────────────────────────
# 이 파일은 Continue 프로젝트의 스크립트를 수정한 버전입니다:
# https://github.com/continuedev/continue
#
# 본 수정은 개발자 배철훈에 의해 2025년 5월 8일에 이루어졌으며,
# nvm을 통한 자동 Node 버전 전환을 지원하기 위해 추가되었습니다.
#
# 이 파일은 Apache License, Version 2.0에 따라 라이선스가 부여됩니다.
# 라이선스에 명시된 조건을 충족하지 않으면 이 파일을 사용할 수 없습니다.
#
# 라이선스 전문은 아래에서 확인할 수 있습니다:
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# 해당 라이선스에 따라 명시되지 않은 경우, 본 파일은 "있는 그대로(AS IS)" 제공되며,
# 명시적이든 묵시적이든 어떠한 보증도 제공되지 않습니다.
# ────────────────────────────────────────────────────────────────────────────────

set -e

# Ensure NVM is loaded
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Check if node version matches .nvmrc
if [ -f .nvmrc ]; then
    required_node_version=$(cat .nvmrc)
    current_node_version=$(node -v 2>/dev/null || echo "v0.0.0")

    # Remove 'v' prefix from versions for comparison
    required_version=${required_node_version#v}
    current_version=${current_node_version#v}

    if [ "$required_version" != "$current_version" ]; then
        echo "🔁 Switching Node.js version to $required_node_version using nvm..."
        nvm use "$required_node_version"
    fi
fi

echo "Installing root-level dependencies..."
npm install

echo "Building config-yaml..."
pushd packages/config-yaml
npm install
npm run build
popd

echo "Installing Core extension dependencies..."
pushd core
export PUPPETEER_SKIP_DOWNLOAD='true'
npm install
npm link
popd

echo "Installing GUI extension dependencies..."
pushd gui
npm install
npm link @continuedev/core
npm run build
popd

echo "Installing VSCode extension dependencies..."
pushd extensions/vscode
npm install
npm link @continuedev/core
npm run prepackage
npm run package
popd

echo "Installing binary dependencies..."
pushd binary
npm install
npm run build
popd

echo "Installing docs dependencies..."
pushd docs
npm install
popd
