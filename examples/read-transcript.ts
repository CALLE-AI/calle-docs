import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

type Turn = {
  offset_seconds: number | null;
  speaker: "bot" | "user" | "unknown";
  text: string;
};
type TranscriptCall = {
  recipients: { attempts: { transcriptTurns: Turn[] }[] }[];
};

export function* transcriptLines(call: TranscriptCall): Generator<string> {
  for (const [recipientIndex, recipient] of call.recipients.entries()) {
    for (const [attemptIndex, attempt] of recipient.attempts.entries()) {
      for (const turn of attempt.transcriptTurns) {
        const timestamp = turn.offset_seconds === null
          ? "time unavailable"
          : `${turn.offset_seconds}s`;
        yield `recipient ${recipientIndex + 1}, attempt ${attemptIndex + 1}: [${timestamp}] ${turn.speaker}: ${turn.text}`;
      }
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sample: TranscriptCall = { recipients: [{ attempts: [{ transcriptTurns: [
    { offset_seconds: 0, speaker: "bot", text: "Hello." },
    { offset_seconds: 2, speaker: "user", text: "Hi." },
    { offset_seconds: null, speaker: "unknown", text: "Unattributed speech." },
  ] }, { transcriptTurns: [] }] }] };
  const lines = [...transcriptLines(sample)];
  assert.deepEqual(lines, [
    "recipient 1, attempt 1: [0s] bot: Hello.",
    "recipient 1, attempt 1: [2s] user: Hi.",
    "recipient 1, attempt 1: [time unavailable] unknown: Unattributed speech.",
  ]);
  assert.equal(sample.recipients[0].attempts[0].transcriptTurns[2].offset_seconds, null);
  console.log(lines.join("\n"));
}
