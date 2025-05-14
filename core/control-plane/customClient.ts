/**
 * ────────────────────────────────────────────────────────────────────────────────
 * Continue 프로젝트에 신규 추가한 파일입니다:
 * https://github.com/continuedev/continue
 *
 * 본 수정은 개발자 배철훈에 의해 2025-05-14에 이루어졌으며, API 호출 기능을 담당하는 클래스입니다.
 * (1) 로그인 기능
 * (2) 로그아웃 기능
 * (3) 토큰 검증 기능
 * (4) 조직 목록 가져오기 기능
 * ────────────────────────────────────────────────────────────────────────────────
 */

import { IDE } from "..";
import { OrganizationDescription } from "../config/ProfileLifecycleManager.js";

export interface CustomAuthResponse {
  success: boolean;
  token?: string;
  error?: string;
}

export interface CustomOrgsResponse {
  success: boolean;
  organizations?: OrganizationDescription[];
  error?: string;
}

const CUSTOM_AUTH_TOKEN_KEY = "custom-auth-token";

export class CustomAuthClient {
  constructor(private readonly ide: IDE) {}
  // (1) 로그인 기능
  public async login(
    id: string,
    password: string,
  ): Promise<CustomAuthResponse> {
    console.log("[CustomAuth] Login attempt:", { id, password });

    try {
      // TODO: 실제 API 호출 구현
      // 임시로 성공 응답 반환 (실제로는 API 호출)
      const response = {
        success: true,
        token: "mock_token_123",
      };

      if (response.success && response.token) {
        // 토큰을 SecretStorage에 저장
        await this.ide.writeSecrets({
          [CUSTOM_AUTH_TOKEN_KEY]: response.token,
        });
      }

      return response;
    } catch (error) {
      console.error("[CustomAuth] Login failed:", error);
      return {
        success: false,
        error: "Login failed",
      };
    }
  }

  // (2) 로그아웃 기능
  public async logout(): Promise<CustomAuthResponse> {
    try {
      // SecretStorage에서 토큰 삭제
      await this.ide.writeSecrets({
        [CUSTOM_AUTH_TOKEN_KEY]: "",
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error("[CustomAuth] Logout failed:", error);
      return {
        success: false,
        error: "Logout failed",
      };
    }
  }

  // (3) 토큰 검증 기능
  public async getToken(): Promise<string | undefined> {
    try {
      const secrets = await this.ide.readSecrets([CUSTOM_AUTH_TOKEN_KEY]);
      return secrets[CUSTOM_AUTH_TOKEN_KEY];
    } catch (error) {
      console.error("[CustomAuth] Failed to get token:", error);
      return undefined;
    }
  }
  // (3) 토큰 검증 기능
  public async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  // (4) 조직 목록 가져오기 기능
  public async getOrgs(): Promise<CustomOrgsResponse> {
    console.log("[CustomAuth] Fetching organizations");

    try {
      // Mock 데이터 반환 - OrganizationDescription 인터페이스에 맞춤
      const mockOrgs: OrganizationDescription[] = [
        {
          id: "org_1",
          name: "Development Team",
          iconUrl: "",
          slug: "dev-team",
        },
        {
          id: "org_2",
          name: "Design Team",
          iconUrl: "",
          slug: "design-team",
        },
        {
          id: "org_3",
          name: "Product Team",
          iconUrl: "",
          slug: "product-team",
        },
      ];

      return {
        success: true,
        organizations: mockOrgs,
      };
    } catch (error) {
      console.error("[CustomAuth] Failed to fetch organizations:", error);
      return {
        success: false,
        error: "Failed to fetch organizations",
      };
    }
  }
}
