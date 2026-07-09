export interface Kid {
  id: string;
  name: string;
  avatar: string;
  /** Optional short PIN a kid enters to use the app as themselves on their
   *  own device. Keeps siblings from posing as each other. */
  pin?: string | null;
}

/** A grown-up / friend in the family group — someone who can send and receive
 *  peer money requests (parent ↔ parent, parent ↔ friend). */
export interface Member {
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

export type PeerStatus = "pending" | "paid" | "declined";

/** A CashApp-style request between two group members: `fromId` is asking
 *  `toId` to pay them `amount`. */
export interface PeerRequest {
  id: string;
  fromId: string;
  toId: string;
  amount: number;
  note: string;
  status: PeerStatus;
  createdAt: number;
  decidedAt?: number;
}

export interface AppData {
  kids: Kid[];
  requests: MoneyRequest[];
  members: Member[];
  peerRequests: PeerRequest[];
  pin: string | null;
  /** Maps a signed-in grown-up's account id (Firebase uid) to their member id,
   *  so the app knows who they are automatically after signing in. */
  memberAuth: Record<string, string>;
  /** Firebase uid of the family admin (whoever created the family). Only the
   *  admin can add/remove kids, set kid PINs, or add/remove members. */
  adminUid: string | null;
}

export const emptyData: AppData = {
  kids: [],
  requests: [],
  members: [],
  peerRequests: [],
  pin: null,
  memberAuth: {},
  adminUid: null,
};

/** Fill in any missing fields so data saved by older versions (which had no
 *  members / peerRequests / memberAuth) always loads as a complete AppData. */
export function normalizeData(d: Partial<AppData> | null | undefined): AppData {
  return {
    kids: d?.kids ?? [],
    requests: d?.requests ?? [],
    members: d?.members ?? [],
    peerRequests: d?.peerRequests ?? [],
    pin: d?.pin ?? null,
    memberAuth: d?.memberAuth ?? {},
    adminUid: d?.adminUid ?? null,
  };
}
