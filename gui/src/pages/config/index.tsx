/**
 * ────────────────────────────────────────────────────────────────────────────────
 * Continue 프로젝트의 ConfigPage 파일을 수정한 버전입니다:
 * https://github.com/continuedev/continue
 *
 * 본 수정은 개발자 배철훈에 의해 2025-05-13에 이루어졌으며, 수정 사항은 다음과 같습니다.
 * (1) Continue Hub 로그인 버튼 숨김
 * (2) 로그인 폼 추가
 * (3) Custom 설정 섹션 추가
 * ────────────────────────────────────────────────────────────────────────────────
 */
import {
  AcademicCapIcon,
  CircleStackIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CustomConfigSection } from "../../components/custom/CustomConfigSection";
import CustomSesstion from "../../components/custom/CustomSesstion";
import LoginForm from "../../components/custom/LoginForm";
import { PageHeader } from "../../components/PageHeader";
import { useCustomAuth } from "../../context/CustomAuth";
import { useNavigationListener } from "../../hooks/useNavigationListener";
import { fontSize } from "../../util";
import { HelpCenterSection } from "./HelpCenterSection";
import { IndexingSettingsSection } from "./IndexingSettingsSection";
import KeyboardShortcuts from "./KeyboardShortcuts";
import { UserSettingsForm } from "./UserSettingsForm";
type TabOption = {
  id: string;
  label: string;
  component: React.ReactNode;
  icon: React.ReactNode;
};

function ConfigPage() {
  useNavigationListener();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("settings");

  const { isAuthenticated } = useCustomAuth();

  const tabs: TabOption[] = [
    {
      id: "settings",
      label: "Settings",
      component: <UserSettingsForm />,
      icon: <Cog6ToothIcon className="xs:h-4 xs:w-4 h-3 w-3 flex-shrink-0" />,
    },
    {
      id: "indexing",
      label: "Indexing",
      component: <IndexingSettingsSection />,
      icon: <CircleStackIcon className="xs:h-4 xs:w-4 h-3 w-3 flex-shrink-0" />,
    },
    {
      id: "help",
      label: "Help",
      component: <HelpCenterSection />,
      icon: (
        <QuestionMarkCircleIcon className="xs:h-4 xs:w-4 h-3 w-3 flex-shrink-0" />
      ),
    },
    {
      id: "shortcuts",
      label: "Shortcuts",
      component: <KeyboardShortcuts />,
      icon: <AcademicCapIcon className="xs:h-4 xs:w-4 h-3 w-3 flex-shrink-0" />,
    },
  ];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="bg-vsc-background sticky top-0 z-10">
        <PageHeader
          showBorder
          onTitleClick={() => navigate("/")}
          title="Chat"
          // (1) Continue Hub 로그인 버튼 숨김
          // rightContent={<AccountButton />}
        />

        {/* (2) 로그인 폼 추가 */}
        {!isAuthenticated ? (
          <div className="border-0 border-b-[1px] border-solid border-b-zinc-700 p-4 sm:flex sm:justify-center md:gap-x-2">
            <LoginForm />
          </div>
        ) : (
          <div className="border-0 border-b-[1px] border-solid border-b-zinc-700 p-4 sm:flex sm:justify-center md:gap-x-2">
            <CustomSesstion />
          </div>
        )}

        {/* (3) Custom 설정 섹션 추가 */}
        <CustomConfigSection />

        {/* Tab Headers */}
        <div className="grid grid-cols-2 border-0 border-b-[1px] border-solid border-b-zinc-700 p-0.5 sm:flex sm:justify-center md:gap-x-2">
          {tabs.map((tab) => (
            <div
              style={{
                fontSize: fontSize(-2),
              }}
              key={tab.id}
              className={`hover:bg-vsc-input-background flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-2 ${
                activeTab === tab.id ? "" : "text-gray-400"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </div>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-4">
        {tabs.find((tab) => tab.id === activeTab)?.component}
      </div>
    </div>
  );
}

export default ConfigPage;
