import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { AppDialog, type DialogAction } from '@/components/ui/app-dialog';
import { AppToast, type ToastTone } from '@/components/ui/app-toast';

type ToastRequest = {
  message: string;
  tone?: ToastTone;
  durationMs?: number;
};

type DialogRequest = {
  title: string;
  message?: string;
  actions: DialogAction[];
};

type AppFeedbackValue = {
  showToast: (request: ToastRequest) => void;
  showDialog: (request: DialogRequest) => void;
  confirm: (opts: {
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
  }) => Promise<boolean>;
};

const AppFeedbackContext = createContext<AppFeedbackValue | null>(null);

const DEFAULT_TOAST_MS = 3200;

export function AppFeedbackProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<(ToastRequest & { id: number }) | null>(null);
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastId = useRef(0);
  const pendingConfirm = useRef<((value: boolean) => void) | null>(null);

  const clearToastTimer = () => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
  };

  const showToast = useCallback((request: ToastRequest) => {
    clearToastTimer();
    toastId.current += 1;
    const id = toastId.current;
    setToast({ ...request, id });
    toastTimer.current = setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, request.durationMs ?? DEFAULT_TOAST_MS);
  }, []);

  const closeDialog = useCallback(() => {
    if (pendingConfirm.current) {
      pendingConfirm.current(false);
      pendingConfirm.current = null;
    }
    setDialog(null);
  }, []);

  const showDialog = useCallback((request: DialogRequest) => {
    pendingConfirm.current = null;
    setDialog(request);
  }, []);

  const confirm = useCallback(
    (opts: {
      title: string;
      message?: string;
      confirmLabel?: string;
      cancelLabel?: string;
      destructive?: boolean;
    }) =>
      new Promise<boolean>((resolve) => {
        pendingConfirm.current = resolve;
        setDialog({
          title: opts.title,
          message: opts.message,
          actions: [
            {
              label: opts.cancelLabel ?? 'Cancel',
              variant: 'ghost',
              onPress: () => {
                pendingConfirm.current = null;
                resolve(false);
              },
            },
            {
              label: opts.confirmLabel ?? 'Confirm',
              variant: opts.destructive ? 'danger' : 'primary',
              onPress: () => {
                pendingConfirm.current = null;
                resolve(true);
              },
            },
          ],
        });
      }),
    [],
  );

  const value = useMemo(
    () => ({ showToast, showDialog, confirm }),
    [showToast, showDialog, confirm],
  );

  return createElement(
    AppFeedbackContext.Provider,
    { value },
    children,
    createElement(AppToast, {
      visible: !!toast,
      message: toast?.message ?? '',
      tone: toast?.tone ?? 'info',
      onDismiss: () => {
        clearToastTimer();
        setToast(null);
      },
    }),
    createElement(AppDialog, {
      visible: !!dialog,
      title: dialog?.title ?? '',
      message: dialog?.message,
      actions: dialog?.actions ?? [],
      onClose: closeDialog,
    }),
  );
}

export function useAppFeedback(): AppFeedbackValue {
  const ctx = useContext(AppFeedbackContext);
  if (!ctx) {
    throw new Error('useAppFeedback must be used within AppFeedbackProvider');
  }
  return ctx;
}
