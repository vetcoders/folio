/** Session ids and error kinds for Folio's in-browser dictation.
 *  Not AcousticLedger occurrence identity. See src/lib/codescribe/README.md. */

export type SessionId = string;

export type EventIdentity = {
  sessionId: SessionId;
  utteranceId: number;
  sequenceId: number;
};

export type AudioRange = {
  startSecs: number;
  endSecs: number;
};

export type AsrErrorKind =
  | "transport"
  | "auth"
  | "rate_limited"
  | "quota"
  | "overflow"
  | "unsupported"
  | "protocol"
  | "cancelled";

export type TranscriptEvent = {
  identity: EventIdentity;
  text: string;
  range?: AudioRange;
};

export type AsrSessionEvent =
  | { token: "partial"; event: TranscriptEvent }
  | { token: "final"; event: TranscriptEvent }
  | { token: "error"; identity: EventIdentity; kind: AsrErrorKind }
  | { token: "usage"; identity: EventIdentity; audioSecs: number };

export function mintSessionId(): SessionId {
  return `cs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isRetryable(kind: AsrErrorKind): boolean {
  return kind === "transport" || kind === "rate_limited" || kind === "overflow";
}
