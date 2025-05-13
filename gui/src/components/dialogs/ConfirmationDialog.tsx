/**
 * ────────────────────────────────────────────────────────────────────────────────
 * Continue 프로젝트의 ConfirmationDialog를 수정한 버전입니다:
 * https://github.com/continuedev/continue
 *
 * 본 수정은 개발자 배철훈에 의해 2025-05-13에 이루어졌으며, 수정 사항은 다음과 같습니다.
 * (1) cancelText Props 추가
 * ────────────────────────────────────────────────────────────────────────────────
 */

import { useDispatch } from "react-redux";
import { Button, SecondaryButton } from "..";
import { setDialogMessage, setShowDialog } from "../../redux/slices/uiSlice";

interface ConfirmationDialogProps {
  onConfirm: () => void;
  onCancel?: () => void;
  text: string;
  title?: string;
  hideCancelButton?: boolean;
  confirmText?: string;
  cancelText?: string;
}

function ConfirmationDialog(props: ConfirmationDialogProps) {
  const dispatch = useDispatch();

  return (
    <div className="p-4 pt-0">
      <h1 className="mb-1 text-center text-xl">
        {props.title ?? "Confirmation"}
      </h1>
      <p className="text-center text-base" style={{ whiteSpace: "pre-wrap" }}>
        {props.text}
      </p>

      <div className="w/1/2 flex justify-end gap-2">
        {!!props.hideCancelButton || (
          <SecondaryButton
            className="text-lightgray"
            onClick={() => {
              dispatch(setShowDialog(false));
              dispatch(setDialogMessage(undefined));
              props.onCancel?.();
            }}
          >
            {/* (1) cancelText Props 추가*/}
            {props.cancelText ?? "Cancel"}
          </SecondaryButton>
        )}
        <Button
          onClick={() => {
            props.onConfirm();
            dispatch(setShowDialog(false));
            dispatch(setDialogMessage(undefined));
          }}
        >
          {props.confirmText ?? "Confirm"}
        </Button>
      </div>
    </div>
  );
}

export default ConfirmationDialog;
