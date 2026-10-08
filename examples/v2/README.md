# Calls V2 examples

These examples create one authorized English greeting call using `/v2/calls`.
Python requires 3.11+ and `calle-ai==1.0.1`; Ruby uses its standard library.
Check [supported regions and languages](https://docs.heycall-e.com/regions)
before choosing a number you own or are authorized to call.

From the repository root, configure the same key and environment for start
and every resume. Use a new private directory for each intentionally new call.

```bash
export CALLE_BASE_URL="https://api.heycall-e.com"
export CALLE_API_KEY="<YOUR_CALLE_API_KEY>"
export CALLE_TEST_PHONE="<AUTHORIZED_E164_PHONE>"
```

Choose one runtime. Running both start commands places two calls.

```bash
python -m pip install calle-ai==1.0.1
python examples/v2/calls.py start ../calle-v2-run --phone "$CALLE_TEST_PHONE"
python examples/v2/calls.py resume ../calle-v2-run
```

```bash
# Preview without sending a request
ruby examples/v2/calls.rb start ../calle-v2-ruby-run
ruby examples/v2/calls.rb start ../calle-v2-ruby-run --execute --confirm-authorized-recipient
ruby examples/v2/calls.rb resume ../calle-v2-ruby-run
```

Both scripts save `request.json` with the original input and idempotency key
before submission, then `call-id.json` before waiting. `resume` reads a known
Call ID; when a create response was lost before saving the ID, it resubmits
the saved input and key unchanged. It never allocates a replacement key.
If a request is rejected, inspect the private error file and follow the
[V2 retry decisions](https://docs.heycall-e.com/calls#idempotency) before
correcting input. Keep any omitted region or locale omitted during recovery.

Waiting stops when `result_status` is `available`, `unavailable` or
`not_applicable`. Exit 0 means retrieval finished, including a final null
result. It does not establish business success.

Read either runtime's saved response without making another request:

```bash
python examples/v2/read_call_result.py ../calle-v2-run/result.json
```

For Ruby, use `../calle-v2-ruby-run/result.json` instead.

The reader preserves `result`, `error`, `call_outcome`, `result_status`,
the Billing `call_id` and the top-level transcript. Use the resource `id`
for API reads; a Billing ID can remain null.

Supplemental checks make no real requests:

```bash
python -m unittest discover -s examples/v2 -p test_examples.py
ruby examples/v2/test_calls.rb
```

Files in the parent `examples/` directory are legacy examples for SDK 0.7.0.
Use their original interface for historical call-task IDs.
