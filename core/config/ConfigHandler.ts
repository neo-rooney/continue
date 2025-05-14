/**
 * ────────────────────────────────────────────────────────────────────────────────
 * Continue 프로젝트의 core.ts 파일을 수정한 버전입니다:
 * https://github.com/continuedev/continue
 *
 * 본 수정은 개발자 배철훈에 의해 2025-05-14에 이루어졌으며, 수정 사항은 다음과 같습니다.
 * (1) custom login을 한 경우, custom Org 목록을 가져오는 방식을 추가(getOrgs)
 * (2) custom login 성공하는 경우 cascadeInit 호출하도록 메서드 정의(updateCustomSessionInfo)
 * (3) 커스텀 조직의 어시스턴트를 로드하고 프로필 생성 메서드 추가(getCustomOrg)
 * (4) 커스텀 로그인을 한 경우, 커스텀 조직의 어시스턴트를 로드하고 프로필 생성하도록 분기(getLocalProfiles)
 * (5) 기본 조직의 경우 .continue/assistants 디렉토리에서만 프로필 로드 수정(getLocalProfiles)
 * ────────────────────────────────────────────────────────────────────────────────
 */

import { ConfigResult } from "@continuedev/config-yaml";

import {
  ControlPlaneClient,
  ControlPlaneSessionInfo,
} from "../control-plane/client.js";
import { getControlPlaneEnv } from "../control-plane/env.js";
import {
  BrowserSerializedContinueConfig,
  ContinueConfig,
  IContextProvider,
  IDE,
  IdeSettings,
  ILLMLogger,
} from "../index.js";
import { GlobalContext } from "../util/GlobalContext.js";

import { CustomAuthClient } from "../control-plane/customClient.js";
import { logger } from "../util/logger.js";
import { joinPathsToUri } from "../util/uri.js";
import {
  ASSISTANTS,
  getAllDotContinueYamlFiles,
  listYamlFilesInDir,
  LoadAssistantFilesOptions,
} from "./loadLocalAssistants.js";
import LocalProfileLoader from "./profile/LocalProfileLoader.js";
import PlatformProfileLoader from "./profile/PlatformProfileLoader.js";
import {
  OrganizationDescription,
  OrgWithProfiles,
  ProfileDescription,
  ProfileLifecycleManager,
  SerializedOrgWithProfiles,
} from "./ProfileLifecycleManager.js";
import { saveCustomAssistant } from "./saveCustomAssistants.js";
export type { ProfileDescription };

type ConfigUpdateFunction = (payload: ConfigResult<ContinueConfig>) => void;

export class ConfigHandler {
  controlPlaneClient: ControlPlaneClient;
  private readonly globalContext = new GlobalContext();
  private globalLocalProfileManager: ProfileLifecycleManager;

  private organizations: OrgWithProfiles[] = [];
  currentProfile: ProfileLifecycleManager | null;
  currentOrg: OrgWithProfiles;
  private customAuthClient: CustomAuthClient;
  constructor(
    private readonly ide: IDE,
    private ideSettingsPromise: Promise<IdeSettings>,
    private llmLogger: ILLMLogger,
    sessionInfoPromise: Promise<ControlPlaneSessionInfo | undefined>,
  ) {
    this.ide = ide;
    this.ideSettingsPromise = ideSettingsPromise;
    this.controlPlaneClient = new ControlPlaneClient(
      sessionInfoPromise,
      ideSettingsPromise,
    );

    this.customAuthClient = new CustomAuthClient(ide);

    // This profile manager will always be available
    this.globalLocalProfileManager = new ProfileLifecycleManager(
      new LocalProfileLoader(
        ide,
        ideSettingsPromise,
        this.controlPlaneClient,
        this.llmLogger,
      ),
      this.ide,
    );

    // Just to be safe, always force a default personal org with local profile manager
    this.currentProfile = this.globalLocalProfileManager;
    const personalOrg: OrgWithProfiles = {
      currentProfile: this.globalLocalProfileManager,
      profiles: [this.globalLocalProfileManager],
      ...this.PERSONAL_ORG_DESC,
    };

    this.currentOrg = personalOrg;
    this.organizations = [personalOrg];

    void this.cascadeInit();
  }

  private workspaceDirs: string[] | null = null;
  async getWorkspaceId() {
    if (!this.workspaceDirs) {
      this.workspaceDirs = await this.ide.getWorkspaceDirs();
    }
    return this.workspaceDirs.join("&");
  }

  async getProfileKey(orgId: string) {
    const workspaceId = await this.getWorkspaceId();
    return `${workspaceId}:::${orgId}`;
  }

  private async cascadeInit() {
    this.workspaceDirs = null; // forces workspace dirs reload

    const orgs = await this.getOrgs();

    // Figure out selected org
    const workspaceId = await this.getWorkspaceId();
    const selectedOrgs =
      this.globalContext.get("lastSelectedOrgIdForWorkspace") ?? {};
    const currentSelection = selectedOrgs[workspaceId];

    const firstNonPersonal = orgs.find(
      (org) => org.id !== this.PERSONAL_ORG_DESC.id,
    );
    const fallback = firstNonPersonal ?? orgs[0];
    // note, ignoring case of zero orgs since should never happen

    let selectedOrg: OrgWithProfiles;
    if (!currentSelection) {
      selectedOrg = fallback;
    } else {
      const match = orgs.find((org) => org.id === currentSelection);
      if (match) {
        selectedOrg = match;
      } else {
        selectedOrg = fallback;
      }
    }

    this.globalContext.update("lastSelectedOrgIdForWorkspace", {
      ...selectedOrgs,
      [workspaceId]: selectedOrg.id,
    });

    this.organizations = orgs;
    this.currentOrg = selectedOrg;
    this.currentProfile = selectedOrg.currentProfile;
    await this.reloadConfig();
  }
  /**
   * @description 조직 목록을 가져오는 함수
   * @changes
   * (1) custom login을 한 경우, custom Org 목록을 가져오는 방식을 추가
   * @returns 조직 목록
   */
  private async getOrgs(): Promise<OrgWithProfiles[]> {
    const userId = await this.controlPlaneClient.userId;
    const isCustomAuthenticated = await this.customAuthClient.isAuthenticated();
    if (userId) {
      const orgDescs = await this.controlPlaneClient.listOrganizations();
      const personalHubOrg = await this.getPersonalHubOrg();
      const hubOrgs = await Promise.all(
        orgDescs.map((org) => this.getNonPersonalHubOrg(org)),
      );
      return [...hubOrgs, personalHubOrg];
    } else if (isCustomAuthenticated) {
      const customOrgDescs = await this.customAuthClient.getOrgs();
      const orgs = await Promise.all(
        customOrgDescs.organizations?.map((org) => this.getCustomOrg(org)) ??
          [],
      );
      return [...orgs, await this.getLocalOrg()];
    } else {
      return [await this.getLocalOrg()];
    }
  }

  getSerializedOrgs(): SerializedOrgWithProfiles[] {
    return this.organizations.map((org) => ({
      iconUrl: org.iconUrl,
      id: org.id,
      name: org.name,
      slug: org.slug,
      profiles: org.profiles.map((profile) => profile.profileDescription),
      selectedProfileId: org.currentProfile?.profileDescription.id || null,
    }));
  }

  private async getHubProfiles(orgScopeId: string | null) {
    const assistants = await this.controlPlaneClient.listAssistants(orgScopeId);

    return await Promise.all(
      assistants.map(async (assistant) => {
        const profileLoader = await PlatformProfileLoader.create({
          configResult: {
            ...assistant.configResult,
            config: assistant.configResult.config,
          },
          ownerSlug: assistant.ownerSlug,
          packageSlug: assistant.packageSlug,
          iconUrl: assistant.iconUrl,
          versionSlug: assistant.configResult.config?.version ?? "latest",
          controlPlaneClient: this.controlPlaneClient,
          ide: this.ide,
          ideSettingsPromise: this.ideSettingsPromise,
          llmLogger: this.llmLogger,
          rawYaml: assistant.rawYaml,
          orgScopeId: orgScopeId,
        });

        return new ProfileLifecycleManager(profileLoader, this.ide);
      }),
    );
  }

  private async getNonPersonalHubOrg(
    org: OrganizationDescription,
  ): Promise<OrgWithProfiles> {
    const localProfiles = await this.getLocalProfiles({
      includeGlobal: false,
      includeWorkspace: true,
    });
    const profiles = [...(await this.getHubProfiles(org.id)), ...localProfiles];
    return this.rectifyProfilesForOrg(org, profiles);
  }

  private PERSONAL_ORG_DESC: OrganizationDescription = {
    iconUrl: "",
    id: "personal",
    name: "Personal",
    slug: undefined,
  };
  private async getPersonalHubOrg() {
    const localProfiles = await this.getLocalProfiles({
      includeGlobal: true,
      includeWorkspace: true,
    });
    const hubProfiles = await this.getHubProfiles(null);
    const profiles = [...hubProfiles, ...localProfiles];
    return this.rectifyProfilesForOrg(this.PERSONAL_ORG_DESC, profiles);
  }
  /**
   * @description 로컬 조직을 가져오는 함수
   * @changes
   * (5) 기본 조직의 경우 .continue/assistants 디렉토리에서만 프로필 로드 수정
   * @returns 로컬 조직
   */
  private async getLocalOrg() {
    const localProfiles = await this.getLocalProfiles({
      includeGlobal: true,
      includeWorkspace: true,
      customDir: ".continue/assistants",
    });
    return this.rectifyProfilesForOrg(this.PERSONAL_ORG_DESC, localProfiles);
  }

  private async rectifyProfilesForOrg(
    org: OrganizationDescription,
    profiles: ProfileLifecycleManager[],
  ): Promise<OrgWithProfiles> {
    const profileKey = await this.getProfileKey(org.id);
    const selectedProfiles =
      this.globalContext.get("lastSelectedProfileForWorkspace") ?? {};

    const currentSelection = selectedProfiles[profileKey];

    const firstNonLocal = profiles.find(
      (profile) => profile.profileDescription.profileType !== "local",
    );
    const fallback =
      firstNonLocal ?? (profiles.length > 0 ? profiles[0] : null);

    let currentProfile: ProfileLifecycleManager | null;
    if (!currentSelection) {
      currentProfile = fallback;
    } else {
      const match = profiles.find(
        (profile) => profile.profileDescription.id === currentSelection,
      );
      if (match) {
        currentProfile = match;
      } else {
        currentProfile = fallback;
      }
    }

    if (currentProfile) {
      this.globalContext.update("lastSelectedProfileForWorkspace", {
        ...selectedProfiles,
        [profileKey]: selectedProfiles.id ?? null,
      });
    }

    return {
      ...org,
      profiles,
      currentProfile,
    };
  }
  /**
   * @description 로컬 프로필을 가져오는 함수
   * @changes
   * (4) 커스텀 로그인을 한 경우, 커스텀 조직의 어시스턴트를 로드하고 프로필 생성하도록 분기
   * @param options
   * @returns 로컬 프로필 목록
   */
  async getLocalProfiles(options: LoadAssistantFilesOptions) {
    /**
     * Users can define as many local assistants as they want in a `.continue/assistants` folder
     */
    const localProfiles: ProfileLifecycleManager[] = [];

    if (options.includeGlobal) {
      localProfiles.push(this.globalLocalProfileManager);
    }

    if (options.includeWorkspace) {
      const assistantFiles = options.customDir
        ? await listYamlFilesInDir(this.ide, options.customDir)
        : await getAllDotContinueYamlFiles(this.ide, options, ASSISTANTS);

      const profiles = assistantFiles.map((assistant) => {
        return new LocalProfileLoader(
          this.ide,
          this.ideSettingsPromise,
          this.controlPlaneClient,
          this.llmLogger,
          assistant,
        );
      });
      const localAssistantProfiles = profiles.map(
        (profile) => new ProfileLifecycleManager(profile, this.ide),
      );
      localProfiles.push(...localAssistantProfiles);
    }

    return localProfiles;
  }

  //////////////////
  // External actions that can cause a cascading config refresh
  // Should not be used internally
  //////////////////
  async refreshAll() {
    await this.cascadeInit();
  }

  // Ide settings change: refresh session and cascade refresh from the top
  async updateIdeSettings(ideSettings: IdeSettings) {
    this.ideSettingsPromise = Promise.resolve(ideSettings);
    await this.cascadeInit();
  }

  // Session change: refresh session and cascade refresh from the top
  async updateControlPlaneSessionInfo(
    sessionInfo: ControlPlaneSessionInfo | undefined,
  ) {
    this.controlPlaneClient = new ControlPlaneClient(
      Promise.resolve(sessionInfo),
      this.ideSettingsPromise,
    );
    await this.cascadeInit();
  }

  // Org id: check id validity, save selection, switch and reload
  async setSelectedOrgId(orgId: string, profileId?: string) {
    if (orgId === this.currentOrg.id) {
      return;
    }
    const org = this.organizations.find((org) => org.id === orgId);
    if (!org) {
      throw new Error(`Org ${orgId} not found`);
    }

    const workspaceId = await this.getWorkspaceId();
    const selectedOrgs =
      this.globalContext.get("lastSelectedOrgIdForWorkspace") ?? {};
    this.globalContext.update("lastSelectedOrgIdForWorkspace", {
      ...selectedOrgs,
      [workspaceId]: org.id,
    });

    this.currentOrg = org;

    if (profileId) {
      await this.setSelectedProfileId(profileId);
    } else {
      this.currentProfile = org.currentProfile;
      await this.reloadConfig();
    }
  }

  // Profile id: check id validity, save selection, switch and reload
  async setSelectedProfileId(profileId: string) {
    if (
      this.currentProfile &&
      profileId === this.currentProfile.profileDescription.id
    ) {
      return;
    }
    const profile = this.currentOrg.profiles.find(
      (profile) => profile.profileDescription.id === profileId,
    );
    if (!profile) {
      throw new Error(`Profile ${profileId} not found in current org`);
    }

    const profileKey = await this.getProfileKey(this.currentOrg.id);
    const selectedProfiles =
      this.globalContext.get("lastSelectedProfileForWorkspace") ?? {};
    this.globalContext.update("lastSelectedProfileForWorkspace", {
      ...selectedProfiles,
      [profileKey]: profileId,
    });

    this.currentProfile = profile;
    await this.reloadConfig();
  }

  // Bottom level of cascade: refresh the current profile
  // IMPORTANT - must always refresh when switching profiles
  // Because of e.g. MCP singleton and docs service using things from config
  // Could improve this
  async reloadConfig() {
    if (!this.currentProfile) {
      return {
        config: undefined,
        errors: [],
        configLoadInterrupted: true,
      };
    }

    for (const org of this.organizations) {
      for (const profile of org.profiles) {
        if (
          profile.profileDescription.id !==
          this.currentProfile.profileDescription.id
        ) {
          profile.clearConfig();
        }
      }
    }

    const { config, errors, configLoadInterrupted } =
      await this.currentProfile.reloadConfig(this.additionalContextProviders);

    this.notifyConfigListeners({ config, errors, configLoadInterrupted });
    return { config, errors, configLoadInterrupted };
  }

  // Listeners setup - can listen to current profile updates
  private notifyConfigListeners(result: ConfigResult<ContinueConfig>) {
    for (const listener of this.updateListeners) {
      listener(result);
    }
  }

  private updateListeners: ConfigUpdateFunction[] = [];

  onConfigUpdate(listener: ConfigUpdateFunction) {
    this.updateListeners.push(listener);
  }

  // Methods for loading (without reloading) config
  // Serialized for passing to GUI
  // Load for just awaiting current config load promise for the profile
  async getSerializedConfig(): Promise<
    ConfigResult<BrowserSerializedContinueConfig>
  > {
    if (!this.currentProfile) {
      return {
        config: undefined,
        errors: [],
        configLoadInterrupted: true,
      };
    }
    return await this.currentProfile.getSerializedConfig(
      this.additionalContextProviders,
    );
  }

  async loadConfig(): Promise<ConfigResult<ContinueConfig>> {
    if (!this.currentProfile) {
      return {
        config: undefined,
        errors: [],
        configLoadInterrupted: true,
      };
    }
    const config = await this.currentProfile.loadConfig(
      this.additionalContextProviders,
    );

    if (config.errors?.length) {
      logger.warn("Errors loading config: ", config.errors);
    }
    return config;
  }

  async openConfigProfile(profileId?: string) {
    let openProfileId = profileId || this.currentProfile?.profileDescription.id;
    if (!openProfileId) {
      return;
    }
    const profile = this.currentOrg.profiles.find(
      (p) => p.profileDescription.id === openProfileId,
    );
    if (profile?.profileDescription.profileType === "local") {
      await this.ide.openFile(profile.profileDescription.uri);
    } else {
      const env = await getControlPlaneEnv(this.ide.getIdeSettings());
      await this.ide.openUrl(`${env.APP_URL}${openProfileId}`);
    }
  }

  // Ancient method of adding custom providers through vs code
  private additionalContextProviders: IContextProvider[] = [];
  registerCustomContextProvider(contextProvider: IContextProvider) {
    this.additionalContextProviders.push(contextProvider);
    void this.reloadConfig();
  }
  /**
   * Retrieves the titles of additional context providers that are of type "submenu".
   *
   * @returns {string[]} An array of titles of the additional context providers that have a description type of "submenu".
   */
  getAdditionalSubmenuContextProviders(): string[] {
    return this.additionalContextProviders
      .filter((provider) => provider.description.type === "submenu")
      .map((provider) => provider.description.title);
  }
  /**
   * @description 커스텀 세션 정보를 업데이트하여 조직 목록을 갱신하는 함수
   * @changes
   * (1) custom login 성공하는 경우 cascadeInit 호출하도록 메서드 정의
   */
  async updateCustomSessionInfo() {
    await this.cascadeInit();
  }
  /**
   * (3) 커스텀 조직의 어시스턴트를 로드하고 프로필 생성 메서드 추가
   * @description 커스텀 조직의 어시스턴트를 로드하고 프로필 생성
   * @param org 커스텀 조직 정보
   * @returns 커스텀 조직의 프로필 정보
   */
  private async getCustomOrg(
    org: OrganizationDescription,
  ): Promise<OrgWithProfiles> {
    try {
      // 1. 서버에서 어시스턴트 목록 가져오기
      const assistants = await this.customAuthClient.getAssistants(org.id);

      // 2. 각 어시스턴트를 로컬에 저장
      await Promise.all(
        assistants.map((assistant) =>
          saveCustomAssistant(this.ide, assistant, org.id),
        ),
      );

      // 3. 워크스페이스 디렉토리 가져오기
      const workspaceDirs = await this.ide.getWorkspaceDirs();
      if (workspaceDirs.length === 0) {
        throw new Error("워크스페이스 디렉토리를 찾을 수 없습니다");
      }

      // 4. 해당 org의 디렉토리에서만 프로필 로드 (URI 형식 사용)
      const customDir = joinPathsToUri(
        workspaceDirs[0],
        ".continue",
        org.id,
        "assistants",
      );

      const customProfiles = await this.getLocalProfiles({
        includeGlobal: false,
        includeWorkspace: true,
        customDir,
      });

      // 5. 조직 정보와 프로필을 결합
      const result = this.rectifyProfilesForOrg(org, customProfiles);

      return result;
    } catch (error) {
      console.error(
        `[ConfigHandler] 커스텀 조직(${org.id})의 어시스턴트 로드 실패:`,
        error,
      );
      return this.rectifyProfilesForOrg(org, []);
    }
  }
}
