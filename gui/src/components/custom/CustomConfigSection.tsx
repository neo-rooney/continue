// gui/src/components/custom/CustomSettingSection.tsx

import { useContext, useEffect, useState } from "react";
import { Input, SecondaryButton } from "..";
import { IdeMessengerContext } from "../../context/IdeMessenger";

export function CustomConfigSection() {
  const [rootDir, setRootDir] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const ideMessenger = useContext(IdeMessengerContext);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await ideMessenger.request("custom/getConfig", undefined);
        if (res.status === "success") {
          setRootDir(res.content.rootDir);
          setApiUrl(res.content.apiUrl);
        }
      } catch (error) {
        console.error("Failed to load Config:", error);
      }
    };
    void loadConfig();
  }, []);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const res = await ideMessenger.request("custom/setConfig", {
        rootDir,
        apiUrl,
      });
      if (res.status === "success") {
        setRootDir(res.content.rootDir);
        setApiUrl(res.content.apiUrl);
        setIsEditing(false);
      } else {
        console.error("Failed to save Config:", res.error);
      }
    } catch (error) {
      console.error("Failed to save Config:", error);
    }
  };

  return (
    <div className="flex flex-col gap-2 border-0 border-b-[1px] border-solid border-b-zinc-700 p-4">
      <div>
        <h2 className="mb-2 mt-0 p-0">사용자 설정</h2>
      </div>
      <div>
        <span className="font-medium">Assistant 디렉토리 이름</span>
        <Input
          type="text"
          id="rootDir"
          name="rootDir"
          value={rootDir}
          onChange={(e) => setRootDir(e.target.value)}
          placeholder="Assistant 디렉토리 이름을 입력하세요"
          readOnly={!isEditing}
        />
      </div>
      <div>
        <span className="font-medium">API URL</span>
        <Input
          type="text"
          id="apiUrl"
          name="apiUrl"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          placeholder="API URL을 입력하세요"
          readOnly={!isEditing}
        />
      </div>
      <div className="flex justify-end">
        <SecondaryButton onClick={isEditing ? handleSave : handleEdit}>
          {isEditing ? "저장" : "수정"}
        </SecondaryButton>
      </div>
    </div>
  );
}
