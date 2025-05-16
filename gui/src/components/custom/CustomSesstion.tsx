/**
 * ────────────────────────────────────────────────────────────────────────────────
 * Continue 프로젝트에 신규 추가한 파일입니다:
 * https://github.com/continuedev/continue
 *
 * 본 수정은 개발자 배철훈에 의해 2025-05-13에 이루어졌으며,
 * 로그인된 사용자 정보와 로그아웃 버튼 및 조직 선택 기능을 담당하는 컴포넌트입니다.
 * ────────────────────────────────────────────────────────────────────────────────
 */

import { SecondaryButton } from "..";
import { useAuth } from "../../context/Auth";
import { useCustomAuth } from "../../context/CustomAuth";
import { ScopeSelect } from "../../pages/config/ScopeSelect";

export default function CustomSesstion() {
  const { organizations } = useAuth();
  const { logout } = useCustomAuth();

  return (
    <div className="flex w-full flex-col gap-3">
      <h2 className="mb-2 mt-0 p-0">사용자 정보</h2>
      <div className="flex justify-between">
        <div className="flex flex-col">
          {/* TODO: 로그인 정보 표시 */}
          <span className="font-medium">계정 정보</span>
          <span className="text-lightgray text-sm">XXX 뱅크</span>
        </div>
        <SecondaryButton onClick={logout}>로그아웃</SecondaryButton>
      </div>

      {organizations.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-vsc-foreground text-xs">Organization</label>
          <ScopeSelect onSelect={close} />
        </div>
      )}
    </div>
  );
}
