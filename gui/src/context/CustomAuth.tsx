/**
 * ────────────────────────────────────────────────────────────────────────────────
 * Continue 프로젝트에 신규 추가한 Context Provider입니다:
 * https://github.com/continuedev/continue
 *
 * 본 수정은 개발자 배철훈에 의해 2025-05-13에 이루어졌으며, 수정 사항은 다음과 같습니다.
 * (1) 로그인 기능
 * (2) 로그아웃 기능
 * (3) 세션 체크 기능
 * ────────────────────────────────────────────────────────────────────────────────
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import ConfirmationDialog from "../components/dialogs/ConfirmationDialog";
import { useAppDispatch } from "../redux/hooks";
import { setDialogMessage, setShowDialog } from "../redux/slices/uiSlice";
import { IdeMessengerContext } from "./IdeMessenger";

interface CustomAuthContextType {
  isAuthenticated: boolean;
  user: {
    id: string;
    // 필요한 사용자 정보를 여기에 추가
  } | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  error: string | null;
}

const CustomAuthContext = createContext<CustomAuthContextType | undefined>(
  undefined,
);

export const CustomAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const dispatch = useAppDispatch();
  const ideMessenger = useContext(IdeMessengerContext);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<CustomAuthContextType["user"]>(null);
  const [error, setError] = useState<string | null>(null);

  // (1) 로그인 기능
  const login: CustomAuthContextType["login"] = async (
    id: string,
    password: string,
  ) => {
    try {
      // TODO: 실제 로그인 API 호출 구현
      // 예시:
      // const response = await ideMessenger.request("customLogin", {
      //   id,
      //   password,
      // });

      // 임시 로그인 로직 (실제 구현 시 제거)
      if (id && password) {
        setUser({ id });
        setIsAuthenticated(true);
        setError(null);
        return true;
      }

      return false;
    } catch (err) {
      setError("로그인에 실패했습니다.");
      return false;
    }
  };

  // (2) 로그아웃 기능
  const logout = () => {
    dispatch(setShowDialog(true));
    dispatch(
      setDialogMessage(
        <ConfirmationDialog
          confirmText="로그아웃"
          text="정말 로그아웃 하시겠습니까?"
          onConfirm={() => {
            // TODO: 실제 로그아웃 API 호출 구현
            setUser(null);
            setIsAuthenticated(false);
            setError(null);
            dispatch(setDialogMessage(undefined));
            dispatch(setShowDialog(false));
          }}
          onCancel={() => {
            dispatch(setDialogMessage(undefined));
            dispatch(setShowDialog(false));
          }}
        />,
      ),
    );
  };

  // (3) 세션 체크
  useEffect(() => {
    const checkSession = async () => {
      try {
        // TODO: 실제 세션 체크 API 호출 구현
        // 예시:
        // const result = await ideMessenger.request("checkSession", undefined);
        // if (result.status === "success") {
        //   setUser(result.content.user);
        //   setIsAuthenticated(true);
        // }
      } catch (err) {
        console.error("세션 체크 실패", err);
      }
    };

    void checkSession();
  }, []);

  return (
    <CustomAuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        logout,
        error,
      }}
    >
      {children}
    </CustomAuthContext.Provider>
  );
};

export const useCustomAuth = (): CustomAuthContextType => {
  const context = useContext(CustomAuthContext);
  if (!context) {
    throw new Error("useCustomAuth must be used within a CustomAuthProvider");
  }
  return context;
};
