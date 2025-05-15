/**
 * ────────────────────────────────────────────────────────────────────────────────
 * Continue 프로젝트의 util.ts 파일을 수정한 버전입니다:
 * https://github.com/continuedev/continue
 *
 * 본 수정은 개발자 배철훈에 의해 2025-05-15에 이루어졌으며, 수정 사항은 다음과 같습니다.
 * (1) 커스텀 Config 관련 메서드 추가
 * (2) 커스텀 Config 초기화 메서드 추가
 * (3) 커스텀 Config 루트 디렉토리 가져오는 메서드 추가
 * (4) 커스텀 Config 업데이트 메서드 추가
 * ────────────────────────────────────────────────────────────────────────────────
 */

import { ModelConfig } from "@continuedev/config-yaml";
import fs from "fs";
import * as path from "node:path";
import os from "os";
import {
  ContinueConfig,
  ExperimentalModelRoles,
  IDE,
  ILLM,
  JSONModelDescription,
  PromptTemplate,
} from "../";
import { DEFAULT_CHAT_SYSTEM_MESSAGE } from "../llm/constructMessages";
import { GlobalContext } from "../util/GlobalContext";
import { editConfigFile } from "../util/paths";
import { joinPathsToUri } from "../util/uri";

function stringify(obj: any, indentation?: number): string {
  return JSON.stringify(
    obj,
    (key, value) => {
      return value === null ? undefined : value;
    },
    indentation,
  );
}

export function addModel(
  model: JSONModelDescription,
  role?: keyof ExperimentalModelRoles,
) {
  editConfigFile(
    (config) => {
      if (config.models?.some((m) => stringify(m) === stringify(model))) {
        return config;
      }

      const numMatches = config.models?.reduce(
        (prev, curr) => (curr.title.startsWith(model.title) ? prev + 1 : prev),
        0,
      );
      if (numMatches !== undefined && numMatches > 0) {
        model.title = `${model.title} (${numMatches})`;
      }

      config.models.push(model);

      // Set the role for the model
      if (role) {
        if (!config.experimental) {
          config.experimental = {};
        }
        if (!config.experimental.modelRoles) {
          config.experimental.modelRoles = {};
        }
        config.experimental.modelRoles[role] = model.title;
      }

      return config;
    },
    (config) => {
      const numMatches = config.models?.reduce(
        (prev, curr) =>
          "name" in curr && curr.name.startsWith(model.title) ? prev + 1 : prev,
        0,
      );
      if (numMatches !== undefined && numMatches > 0) {
        model.title = `${model.title} (${numMatches})`;
      }

      if (!config.models) {
        config.models = [];
      }

      const desc: ModelConfig = {
        name: model.title,
        provider: model.provider,
        model: model.model,
        apiKey: model.apiKey,
        apiBase: model.apiBase,
        defaultCompletionOptions: model.completionOptions,
      };
      if (model.systemMessage) {
        desc.chatOptions = {
          baseSystemMessage:
            DEFAULT_CHAT_SYSTEM_MESSAGE + "\n\n" + model.systemMessage,
        };
      }
      config.models.push(desc);
      return config;
    },
  );
}

export function deleteModel(title: string) {
  editConfigFile(
    (config) => {
      config.models = config.models.filter((m: any) => m.title !== title);
      return config;
    },
    (config) => {
      config.models = config.models?.filter((m: any) => m.name !== title);
      return config;
    },
  );
}

export function getModelByRole<T extends keyof ExperimentalModelRoles>(
  config: ContinueConfig,
  role: T,
): ILLM | undefined {
  const roleTitle = config.experimental?.modelRoles?.[role];

  if (!roleTitle) {
    return undefined;
  }

  const matchingModel = config.modelsByRole.chat.find(
    (model) => model.title === roleTitle,
  );

  return matchingModel;
}

/**
 * This check is to determine if the user is on an unsupported CPU
 * target for our Lance DB binaries.
 *
 * See here for details: https://github.com/continuedev/continue/issues/940
 */
export function isSupportedLanceDbCpuTargetForLinux(ide?: IDE) {
  const CPU_FEATURES_TO_CHECK = ["avx2", "fma"] as const;

  const globalContext = new GlobalContext();
  const globalContextVal = globalContext.get(
    "isSupportedLanceDbCpuTargetForLinux",
  );

  // If we've already checked the CPU target, return the cached value
  if (globalContextVal !== undefined) {
    return globalContextVal;
  }

  const arch = os.arch();

  // This check only applies to x64
  //https://github.com/lancedb/lance/issues/2195#issuecomment-2057841311
  if (arch !== "x64") {
    globalContext.update("isSupportedLanceDbCpuTargetForLinux", true);
    return true;
  }

  try {
    const cpuFlags = fs.readFileSync("/proc/cpuinfo", "utf-8").toLowerCase();

    const isSupportedLanceDbCpuTargetForLinux = cpuFlags
      ? CPU_FEATURES_TO_CHECK.every((feature) => cpuFlags.includes(feature))
      : true;

    // If it's not a supported CPU target, and it's the first time we are checking,
    // show a toast to inform the user that we are going to disable indexing.
    if (!isSupportedLanceDbCpuTargetForLinux && ide) {
      // We offload our async toast to `showUnsupportedCpuToast` to prevent making
      // our config loading async upstream of `isSupportedLanceDbCpuTargetForLinux`
      void showUnsupportedCpuToast(ide);
    }

    globalContext.update(
      "isSupportedLanceDbCpuTargetForLinux",
      isSupportedLanceDbCpuTargetForLinux,
    );

    return isSupportedLanceDbCpuTargetForLinux;
  } catch (error) {
    // If we can't determine CPU features, default to true
    return true;
  }
}

async function showUnsupportedCpuToast(ide: IDE) {
  const shouldOpenLink = await ide.showToast(
    "warning",
    "Codebase indexing disabled - Your Linux system lacks required CPU features (AVX2, FMA)",
    "Learn more",
  );

  if (shouldOpenLink) {
    void ide.openUrl(
      "https://docs.continue.dev/troubleshooting#i-received-a-codebase-indexing-disabled---your-linux-system-lacks-required-cpu-features-avx2-fma-notification",
    );
  }
}

/**
 * This is required because users are only able to define prompt templates as a
 * string, while internally we also allow prompt templates to be functions
 * @param templates
 * @returns
 */
export function serializePromptTemplates(
  templates: Record<string, PromptTemplate> | undefined,
): Record<string, string> | undefined {
  if (!templates) return undefined;

  return Object.fromEntries(
    Object.entries(templates).map(([key, template]) => {
      const serialized = typeof template === "function" ? "" : template;
      return [key, serialized];
    }),
  );
}

export interface CustomToolDefaultConfig {
  assistant: {
    rootDir: string;
    apiUrl: string;
  };
}

const CONFIG_FILE_NAME = ".cus-config.json";

//(1) 기본 커스텀 Config 가져오는 메서드 추가
export function customToolDefaultConfig(): CustomToolDefaultConfig | null {
  try {
    const projectRoot = path.resolve(__dirname, "../../../");
    const configPath = path.join(projectRoot, CONFIG_FILE_NAME);

    if (fs.existsSync(configPath)) {
      const configRaw = fs.readFileSync(configPath, "utf-8");
      return JSON.parse(configRaw);
    }
  } catch (error) {
    console.warn("Failed to load dev config:", error);
  }
  return null;
}
//(2) 커스텀 Config 초기화 메서드 추가
export async function initializeCustomConfig(ide: IDE): Promise<void> {
  try {
    // 1. 초기 설정 가져오기
    const defaultConfig = customToolDefaultConfig();
    if (!defaultConfig) {
      console.warn("No default config found");
      return;
    }

    // 2. 워크스페이스 디렉토리 가져오기
    const workspaceDirs = await ide.getWorkspaceDirs();
    if (workspaceDirs.length === 0) {
      throw new Error("워크스페이스 디렉토리를 찾을 수 없습니다");
    }

    // 3. 워크스페이스 루트에 파일 생성
    const configPath = joinPathsToUri(workspaceDirs[0], CONFIG_FILE_NAME);

    // 4. 파일이 이미 존재하는지 확인
    const exists = await ide.fileExists(configPath);
    if (exists) {
      console.log("Custom config already exists in workspace");
      return;
    }

    // 5. 초기 설정 파일 저장
    await ide.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log("Initialized custom config in workspace");
  } catch (error) {
    console.error("Failed to initialize custom config:", error);
  }
}
export const DEFAULT_ROOT_DIR = ".continue";

//(3) 커스텀 Config 루트 디렉토리 가져오는 메서드 추가
export async function getCustomRootDir(ide: IDE): Promise<string> {
  try {
    const workspaceDirs = await ide.getWorkspaceDirs();
    if (workspaceDirs.length === 0) {
      return DEFAULT_ROOT_DIR;
    }

    const workspaceDir = workspaceDirs[0];
    const configPath = joinPathsToUri(workspaceDir, CONFIG_FILE_NAME);

    const configExists = await ide.fileExists(configPath);
    if (configExists) {
      const configRaw = await ide.readFile(configPath);
      const config = JSON.parse(configRaw);
      return config?.assistant?.rootDir || DEFAULT_ROOT_DIR;
    }
  } catch (error) {
    console.warn(
      "Failed to load custom config, using default root dir:",
      error,
    );
  }
  return DEFAULT_ROOT_DIR;
}
//(4) 커스텀 Config 업데이트 메서드 추가
export async function updateCustomConfig(
  ide: IDE,
  rootDir: string,
  apiUrl: string,
): Promise<void> {
  try {
    // 1. 워크스페이스 디렉토리 가져오기
    const workspaceDirs = await ide.getWorkspaceDirs();
    if (workspaceDirs.length === 0) {
      throw new Error("워크스페이스 디렉토리를 찾을 수 없습니다");
    }

    // 2. 설정 파일 경로 생성
    const configPath = joinPathsToUri(workspaceDirs[0], CONFIG_FILE_NAME);

    // 3. 기존 설정 파일 읽기
    const exists = await ide.fileExists(configPath);
    let currentConfig: CustomToolDefaultConfig;
    let oldRootDir: string | undefined;

    if (exists) {
      const configRaw = await ide.readFile(configPath);
      currentConfig = JSON.parse(configRaw);
      oldRootDir = currentConfig.assistant.rootDir; // 기존 rootDir 저장
    } else {
      currentConfig = {
        assistant: {
          rootDir: "",
          apiUrl: "",
        },
      };
    }

    // 4. 새로운 설정으로 업데이트
    currentConfig.assistant = {
      rootDir,
      apiUrl,
    };

    // 5. 업데이트된 설정 저장
    await ide.writeFile(configPath, JSON.stringify(currentConfig, null, 2));

    // 6. 설정이 실제로 저장되었는지 확인 (재시도 로직 추가)
    let retryCount = 0;
    const maxRetries = 200;
    let configUpdated = false;

    while (retryCount < maxRetries) {
      const fileExists = await ide.fileExists(configPath);
      if (!fileExists) {
        throw new Error("설정 파일이 존재하지 않습니다");
      }

      const verifyConfig = await ide.readFile(configPath);
      const savedConfig = JSON.parse(verifyConfig);

      if (savedConfig.assistant.rootDir === rootDir) {
        console.log("Custom config updated successfully");
        configUpdated = true;
        break;
      }

      retryCount++;
      if (retryCount < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    if (!configUpdated) {
      throw new Error("설정이 올바르게 저장되지 않았습니다");
    }

    // 7. 기존 config 폴더가 있고, 새로운 rootDir과 다른 경우 삭제
    if (oldRootDir && oldRootDir !== rootDir) {
      try {
        const oldConfigDir = joinPathsToUri(workspaceDirs[0], oldRootDir);
        const oldDirExists = await ide.fileExists(oldConfigDir);

        if (oldDirExists) {
          // 재귀적으로 디렉토리 삭제하는 함수
          async function deleteDirectory(dirPath: string) {
            const files = await ide.listDir(dirPath);

            // 먼저 모든 하위 항목 삭제
            for (const [name, type] of files) {
              const fullPath = joinPathsToUri(dirPath, name);
              if (type === 2) {
                // 디렉토리인 경우
                await deleteDirectory(fullPath); // 재귀적으로 하위 디렉토리 삭제
              } else {
                await ide.deleteFile(fullPath); // 파일 삭제
              }
            }

            // 디렉토리가 비어있으면 삭제
            await ide.deleteFile(dirPath);
          }

          // 재귀적으로 디렉토리 삭제 시작
          await deleteDirectory(oldConfigDir);
          console.log(`Old config directory deleted: ${oldRootDir}`);
        }
      } catch (deleteError) {
        console.warn("Failed to delete old config directory:", deleteError);
      }
    }
  } catch (error) {
    console.error("Failed to update custom config:", error);
    throw error;
  }
}
