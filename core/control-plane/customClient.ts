/**
 * ────────────────────────────────────────────────────────────────────────────────
 * 이 파일은 Continue 프로젝트에 신규 추가한 파일입니다:
 * https://github.com/continuedev/continue
 *
 * 본 수정은 개발자 배철훈에 의해 2025년 5월 10일에 이루어졌으며, 아래와 같은 변경이 이루어졌습니다.
 * (1) listOrganizations 메서드 정의
 * ────────────────────────────────────────────────────────────────────────────────
 */

import { OrganizationDescription } from "../config/ProfileLifecycleManager";

export class CustomClient {
  constructor() {
    // 로그인 세션 없음, 초기화 필요 없음
  }

  /**
   * (1) listOrganizations 메서드 정의
   * 커스텀 Assistant를 포함하는 조직 목록을 반환
   * 추후 API 호출로 대체 예정. 현재는 mock data 반환
   */
  public async listOrganizations(): Promise<OrganizationDescription[]> {
    return [
      {
        id: "custom-org",
        iconUrl: "",
        name: "Custom Org",
        slug: "custom-org",
      },
    ];
  }
}
