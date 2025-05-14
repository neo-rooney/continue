/**
 * ────────────────────────────────────────────────────────────────────────────────
 * Continue 프로젝트의 passThrough.ts 파일을 수정한 버전입니다:
 * https://github.com/continuedev/continue
 *
 * 본 수정은 개발자 배철훈에 의해 2025-05-13에 이루어졌으며, 수정 사항은 다음과 같습니다.
 * (1) 로그인 메세지 핸들러 PASS THROUGH 추가
 * (2) 로그아웃 메세지 핸들러 PASS THROUGH 추가
 * (3) 토큰 검증 메세지 핸들러 PASS THROUGH 추가
 * ────────────────────────────────────────────────────────────────────────────────
 */

import {
  ToCoreFromWebviewProtocol,
  ToWebviewFromCoreProtocol,
} from "./coreWebview.js";

// Message types to pass through from webview to core
// Note: If updating these values, make a corresponding update in
// extensions/intellij/src/main/kotlin/com/github/continuedev/continueintellijextension/toolWindow/ContinueBrowser.kt
export const WEBVIEW_TO_CORE_PASS_THROUGH: (keyof ToCoreFromWebviewProtocol)[] =
  [
    "ping",
    "abort",
    "history/list",
    "history/delete",
    "history/load",
    "history/save",
    "history/clear",
    "devdata/log",
    "config/addModel",
    "config/newPromptFile",
    "config/ideSettingsUpdate",
    "config/addLocalWorkspaceBlock",
    "config/getSerializedProfileInfo",
    "config/deleteModel",
    "config/refreshProfiles",
    "config/openProfile",
    "config/updateSharedConfig",
    "config/updateSelectedModel",
    "mcp/reloadServer",
    "context/getContextItems",
    "context/getSymbolsForFiles",
    "context/loadSubmenuItems",
    "context/addDocs",
    "context/removeDocs",
    "context/indexDocs",
    "autocomplete/complete",
    "autocomplete/cancel",
    "autocomplete/accept",
    "tts/kill",
    "llm/complete",
    "llm/streamChat",
    "llm/listModels",
    "streamDiffLines",
    "chatDescriber/describe",
    "stats/getTokensPerDay",
    "stats/getTokensPerModel",
    // Codebase
    "index/setPaused",
    "index/forceReIndex",
    "index/indexingProgressBarInitialized",
    // Docs, etc.
    "indexing/reindex",
    "indexing/abort",
    "indexing/setPaused",
    "docs/initStatuses",
    "docs/getDetails",
    //
    "completeOnboarding",
    "addAutocompleteModel",
    "didChangeSelectedProfile",
    "didChangeSelectedOrg",
    "tools/call",
    "controlPlane/openUrl",
    "isItemTooBig",
    "process/markAsBackgrounded",
    "process/isBackgrounded",
    // (1) 로그인 메세지 핸들러 PASS THROUGH 추가
    "custom/login",
    // (2) 로그아웃 메세지 핸들러 PASS THROUGH 추가
    "custom/logout",
    // (3) 토큰 검증 메세지 핸들러 PASS THROUGH 추가
    "custom/checkAuth",
  ];

// Message types to pass through from core to webview
// Note: If updating these values, make a corresponding update in
// extensions/intellij/src/main/kotlin/com/github/continuedev/continueintellijextension/constants/MessageTypes.kt
export const CORE_TO_WEBVIEW_PASS_THROUGH: (keyof ToWebviewFromCoreProtocol)[] =
  [
    "configUpdate",
    "indexProgress", // Codebase
    "indexing/statusUpdate", // Docs, etc.
    "addContextItem",
    "refreshSubmenuItems",
    "isContinueInputFocused",
    "setTTSActive",
    "getWebviewHistoryLength",
    "getCurrentSessionId",
    "sessionUpdate",
    "didCloseFiles",
    "toolCallPartialOutput",
  ];
