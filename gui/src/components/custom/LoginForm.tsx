/**
 * ────────────────────────────────────────────────────────────────────────────────
 * Continue 프로젝트에 신규 추가한 컴포넌트입니다:
 * https://github.com/continuedev/continue
 *
 * 본 수정은 개발자 배철훈에 의해 2025-05-13에 이루어졌으며, 수정 사항은 다음과 같습니다.
 * (1) 신규 로그인 폼 UI 추가
 * (2) 로그인 메서드 정의
 * ────────────────────────────────────────────────────────────────────────────────
 */
import { Input, SecondaryButton } from "..";
import { useCustomAuth } from "../../context/CustomAuth";
export default function LoginForm() {
  const { login } = useCustomAuth();

  // (2) 로그인 메서드 정의
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const id = formData.get("id") as string;
    const password = formData.get("password") as string;
    await login(id, password);
  };

  return (
    // (1) 신규 로그인 폼 UI 추가
    <form className="flex w-full flex-col gap-2" onSubmit={handleSubmit}>
      <Input type="text" id="id" name="id" placeholder="아이디를 입력하세요" />
      <Input
        type="password"
        id="password"
        name="password"
        placeholder="비밀번호를 입력하세요"
      />
      <SecondaryButton type="submit" className="!m-0 w-full">
        로그인
      </SecondaryButton>
    </form>
  );
}
