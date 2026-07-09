export interface Kid {
  id: string;
  name: string;
  avatar: string;
}

export type RequestStatus = "pending" | "approved" | "declined" | "paid";

export interface MoneyRequest {
  id: string;
  kidId: string;
  amount: number;
  reason: string;
  category: string | null;
  status: RequestStatus;
  createdAt: number;
  decidedAt?: number;
  paidAt?: number;
  parentNote: string | null;
}

export interface AppData {
  kids: Kid[];
  requests: MoneyRequest[];
  pin: string | null;
}

export const emptyData: AppData = { kids: [], requests: [], pin: null };
