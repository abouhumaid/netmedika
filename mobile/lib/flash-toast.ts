export type FlashToastTone = 'success' | 'error';

export type FlashToast = {
  message: string;
  tone: FlashToastTone;
};

let pendingFlashToast: FlashToast | null = null;

export function setPendingFlashToast(toast: FlashToast) {
  pendingFlashToast = toast;
}

export function consumePendingFlashToast() {
  const toast = pendingFlashToast;
  pendingFlashToast = null;
  return toast;
}
