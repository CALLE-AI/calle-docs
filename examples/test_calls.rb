# Supplemental checks; the documented start/resume flow also needs a real call.
require "tmpdir"
require "stringio"
require_relative "calls"

def check(value)
  raise "Check failed at #{caller.first}" unless value
end

def expect_error(type)
  begin
    yield
  rescue type
    return
  end
  raise "Expected #{type}"
end

def response(code, body)
  result = Net::HTTPResponse::CODE_TO_OBJ.fetch(code.to_s).new("1.1", code.to_s, "test")
  result.body = body.is_a?(String) ? body : JSON.generate(body)
  result.instance_variable_set(:@read, true)
  result
end

FakeHTTP = Struct.new(:read_timeout, :messages, :respond) do
  def request(message)
    messages << message
    respond.call(message)
  end
end

original_stdout, original_stderr = $stdout, $stderr
original_environment = ENV.to_h
$stdout = StringIO.new
$stderr = StringIO.new
begin
  Dir.mktmpdir do |root|
    directory = File.join(root, "run")
    phone = "+" + "12025550123" # Synthetic reserved example number; never dialed.
    ENV["CALLE_TEST_PHONE"] = phone
    ENV.delete("CALLE_API_KEY")
    check(CallsExample.main(["start", directory]) == 0)
    check(!File.exist?(directory))
    check(CallsExample.main(["start", directory, "--execute"]) == 1)
    check(CallsExample.main(["start", directory, "--execute", "--confirm-authorized-recipient"]) == 1)
    check(CallsExample.main(["resume", directory, "--execute"]) == 1)
    ENV["CALLE_TEST_PHONE"] = "not a phone"
    check(CallsExample.main(["start", directory]) == 1)
    check(!File.exist?(directory))

    http = FakeHTTP.new(nil, [], nil)
    http.respond = lambda do |message|
      check(message["Authorization"] == "Bearer synthetic-key")
      if message.method == "POST"
        saved = JSON.parse(File.read(File.join(directory, "request.json")))
        check(message["Idempotency-Key"] == saved.delete("idempotency_key"))
        check(message["Content-Type"] == "application/json")
        check(JSON.parse(message.body) == saved)
        response(201, { id: "call_test" })
      else
        check(message.path == "/v1/calls/call_test")
        check(JSON.parse(File.read(File.join(directory, "call-id.json"))) == "call_test")
        raise Net::ReadTimeout if http.messages.length == 2

        response(200, { id: "call_test", status: "failed", task_completed: nil, structured_result: nil })
      end
    end
    expect_error(Net::ReadTimeout) { CallsExample.run(http, "synthetic-key", directory, phone) }
    expect_error(Errno::EEXIST) { CallsExample.run(http, "synthetic-key", directory, phone) }
    check(CallsExample.run(http, "synthetic-key", directory) == 0)
    check(http.messages.map(&:method) == %w[POST GET GET])
    result = JSON.parse(File.read(File.join(directory, "result.json")))
    check(result["structured_result"].nil? && result["task_completed"].nil?)
    unless Gem.win_platform?
      check(File.stat(directory).mode & 0o777 == 0o700)
      Dir.glob(File.join(directory, "*.json")).each { |path| check(File.stat(path).mode & 0o777 == 0o600) }
    end

    %w[completed canceled].each do |status|
      http.respond = ->(_) { response(200, { id: "call_test", status: status, structured_result: { heard_greeting: "unknown" } }) }
      check(CallsExample.run(http, "synthetic-key", directory) == 0)
      check(JSON.parse(File.read(File.join(directory, "result.json"))).dig("structured_result", "heard_greeting") == "unknown")
    end
    previous_result = File.read(File.join(directory, "result.json"))
    http.respond = ->(_) { response(200, { id: "another_call", status: "completed" }) }
    expect_error(RuntimeError) { CallsExample.run(http, "synthetic-key", directory) }
    check(File.read(File.join(directory, "result.json")) == previous_result)

    states = %w[queued in_progress completed]
    waits = []
    CallsExample.define_singleton_method(:sleep) { |seconds| waits << seconds }
    begin
      http.respond = ->(_) { response(200, { id: "call_test", status: states.shift }) }
      check(CallsExample.run(http, "synthetic-key", directory) == 0)
      check(states.empty? && waits == [5, 5])
    ensure
      CallsExample.singleton_class.remove_method(:sleep)
    end
    clock = Process.method(:clock_gettime)
    times = [0, 301]
    before = http.messages.length
    Process.define_singleton_method(:clock_gettime) { |_| times.shift }
    begin
      expect_error(RuntimeError) { CallsExample.run(http, "synthetic-key", directory) }
      check(http.messages.length == before)
    ensure
      Process.define_singleton_method(:clock_gettime, clock)
    end
    http.respond = ->(_) { response(200, { id: "call_test", status: "unexpected" }) }
    expect_error(RuntimeError) { CallsExample.run(http, "synthetic-key", directory) }

    create_http = Net::HTTP.method(:new)
    real_http = Net::HTTP.new("api.heycall-e.com", 443)
    real_http.define_singleton_method(:request) do |message|
      check(message.method == "GET" && message.path == "/v1/calls/call_test")
      check(message["Authorization"] == "Bearer synthetic-key")
      response(200, { id: "call_test", status: "completed" })
    end
    Net::HTTP.define_singleton_method(:new) { |host, port| check(host == "api.heycall-e.com" && port == 443); real_http }
    begin
      ENV["CALLE_API_KEY"] = "synthetic-key"
      check(CallsExample.main(["resume", directory]) == 0)
      check(real_http.use_ssl? && real_http.max_retries == 0)
      check(real_http.open_timeout == 30 && real_http.read_timeout == 150 && real_http.write_timeout == 30)
    ensure
      Net::HTTP.define_singleton_method(:new, create_http)
    end

    [[422, { error: { code: "invalid_request", message: "Rejected" } }, RuntimeError],
     [502, "Bad Gateway", RuntimeError],
     [201, "not JSON", JSON::ParserError],
     [201, {}, KeyError]].each_with_index do |(code, body, error), index|
      rejected = File.join(root, "rejected-#{index}")
      transport = FakeHTTP.new(nil, [], ->(_) { response(code, body) })
      expect_error(error) { CallsExample.run(transport, "synthetic-key", rejected, phone) }
      check(File.file?(File.join(rejected, "request.json")))
      expect_error(RuntimeError) { CallsExample.run(transport, "synthetic-key", rejected) }
      check(transport.messages.map(&:method) == ["POST"])
      if code >= 400
        stored_error = JSON.parse(File.read(File.join(rejected, "error.json")))
        check(stored_error["status"] == code)
        check(stored_error["body"] == (body.is_a?(String) ? body : JSON.generate(body)))
      end
    end
    uncertain = File.join(root, "uncertain")
    transport = FakeHTTP.new(nil, [], ->(_) { raise Net::ReadTimeout })
    expect_error(Net::ReadTimeout) { CallsExample.run(transport, "synthetic-key", uncertain, phone) }
    check(File.file?(File.join(uncertain, "request.json")))
    expect_error(RuntimeError) { CallsExample.run(transport, "synthetic-key", uncertain) }
    check(transport.messages.map(&:method) == ["POST"])
    check(!$stdout.string.include?(phone) && !$stdout.string.include?("synthetic-key"))
    check(!$stderr.string.include?(phone) && !$stderr.string.include?("synthetic-key"))
  end
ensure
  $stdout, $stderr = original_stdout, original_stderr
  ENV.replace(original_environment)
end
puts "Ruby preview, request persistence, timeout/resume, terminal result and error checks passed."
