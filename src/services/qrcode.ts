import {authFetch} from './api';

export async function scanQrCode(qrCodeId: string): Promise<void> {
  await authFetch<void>(`/auth/qrcode/scan/${qrCodeId}`, {
    method: 'POST',
  });
}

export async function confirmQrCode(qrCodeId: string): Promise<void> {
  await authFetch<void>(`/auth/qrcode/confirm/${qrCodeId}`, {
    method: 'POST',
  });
}

export async function cancelQrCode(qrCodeId: string): Promise<void> {
  await authFetch<void>(`/auth/qrcode/cancel/${qrCodeId}`, {
    method: 'POST',
  });
}
