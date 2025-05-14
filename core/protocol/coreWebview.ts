/**
 * ────────────────────────────────────────────────────────────────────────────────
 * Continue 프로젝트의 coreWebview.ts 파일을 수정한 버전입니다:
 * https://github.com/continuedev/continue
 *
 * 본 수정은 개발자 배철훈에 의해 2025-05-13에 이루어졌으며, 수정 사항은 다음과 같습니다.
 * (1) 로그인 메세지 핸들러 Type 정의
 * (2) 로그아웃 메세지 핸들러 Type 정의
 * (3) 토큰 검증 메세지 핸들러 Type 정의
 * ────────────────────────────────────────────────────────────────────────────────
 */

import { ToCoreFromIdeOrWebviewProtocol } from "./core.js";
import { ToWebviewFromIdeOrCoreProtocol } from "./webview.js";

export type ToCoreFromWebviewProtocol = ToCoreFromIdeOrWebviewProtocol & {
  didChangeSelectedProfile: [{ id: string }, void];
  didChangeSelectedOrg: [{ id: string; profileId?: string }, void];
  // (1) 로그인 메세지 핸들러 Type 정의
  "custom/login": [
    { id: string; password: string },
    { success: boolean; token?: string },
  ];
  // (2) 로그아웃 메세지 핸들러 Type 정의
  "custom/logout": [undefined, { success: boolean }];
  // (3) 토큰 검증 메세지 핸들러 Type 정의
  "custom/checkAuth": [undefined, { isAuthenticated: boolean }];
};
export type ToWebviewFromCoreProtocol = ToWebviewFromIdeOrCoreProtocol;
