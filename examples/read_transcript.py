"""Read Python SDK / HTTP transcript turns. Run directly for synthetic checks."""


def transcript_lines(call):
    for recipient_index, recipient in enumerate(call["recipients"], 1):
        for attempt_index, attempt in enumerate(recipient["attempts"], 1):
            for turn in attempt["transcript_turns"]:
                offset = turn["offset_seconds"]
                timestamp = "time unavailable" if offset is None else f"{offset}s"
                yield (
                    f"recipient {recipient_index}, attempt {attempt_index}: "
                    f"[{timestamp}] {turn['speaker']}: {turn['text']}"
                )


if __name__ == "__main__":
    sample = {"recipients": [{"attempts": [{"transcript_turns": [
        {"offset_seconds": 0, "speaker": "bot", "text": "Hello."},
        {"offset_seconds": 2, "speaker": "user", "text": "Hi."},
        {"offset_seconds": None, "speaker": "unknown", "text": "Unattributed speech."},
    ]}, {"transcript_turns": []}]}]}
    lines = list(transcript_lines(sample))
    assert lines == [
        "recipient 1, attempt 1: [0s] bot: Hello.",
        "recipient 1, attempt 1: [2s] user: Hi.",
        "recipient 1, attempt 1: [time unavailable] unknown: Unattributed speech.",
    ]
    assert sample["recipients"][0]["attempts"][0]["transcript_turns"][2]["offset_seconds"] is None
    print("\n".join(lines))
