/**
 * ────────────────────────────────────────────────────────────────────────────────
 * Continue 프로젝트에 신규 추가한 파일입니다.
 * https://github.com/continuedev/continue
 *
 * 본 수정은 개발자 배철훈에 의해 2025-05-14에 이루어졌으며,
 * 서버에서 전달받은 커스텀 어시스턴트를 워크스페이스의 .continue/{org_id}/assistants 디렉토리에 저장하는 기능을 담당합니다.
 * ────────────────────────────────────────────────────────────────────────────────
 */

import { IDE } from "..";
import { CustomAssistant } from "../control-plane/customClient";
import { joinPathsToUri } from "../util/uri";
import { getCustomRootDir } from "./util";
/**
 * 커스텀 어시스턴트를 워크스페이스의 .continue/{org_id}/assistants 디렉토리에 저장
 * @param ide IDE 인스턴스
 * @param assistant 저장할 커스텀 어시스턴트
 * @param orgId 조직 ID (선택적)
 * @returns 어시스턴트가 저장된 경로
 */
export async function saveCustomAssistant(
  ide: IDE,
  assistant: CustomAssistant,
  orgId?: string,
): Promise<string> {
  try {
    // 워크스페이스 디렉토리 가져오기
    const workspaceDirs = await ide.getWorkspaceDirs();
    if (workspaceDirs.length === 0) {
      throw new Error("워크스페이스 디렉토리를 찾을 수 없습니다");
    }

    // 첫 번째 워크스페이스 디렉토리 사용
    const workspaceDir = workspaceDirs[0];

    // 설정 파일에서 rootDir 가져오기
    const rootDir = await getCustomRootDir(ide);

    // 저장 경로 설정
    const dirPath = orgId
      ? joinPathsToUri(workspaceDir, rootDir, orgId, "assistants")
      : joinPathsToUri(workspaceDir, rootDir, "assistants");

    // 파일명 생성 (packageSlug.yaml)
    const fileName = `${assistant.slug}.yaml`;
    const filePath = joinPathsToUri(dirPath, fileName);

    // YAML 파일 저장 (디렉토리가 없으면 자동으로 생성됨)
    await ide.writeFile(filePath, assistant.rawYaml);

    return filePath;
  } catch (error) {
    console.error("[saveCustomAssistants] 어시스턴트 저장 실패:", error);
    throw error;
  }
}
