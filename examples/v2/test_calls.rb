require "tmpdir"
require "stringio"
require_relative "calls"

def check(value)
  raise "Check failed at #{caller.first}" unless value
end

def response(value)
  result = Net::HTTPOK.new("1.1", "200", "test")
  result.body = JSON.generate({ id: "call_test", status: "completed", result: nil, error: nil, transcript: [] }.merge(value))
  result.instance_variable_set(:@read, true)
  result
end

FakeHTTP = Struct.new(:read_timeout, :messages, :respond) do
  def request(message)
    messages << message
    respond.call(message)
  end
end

original_stdout = $stdout
$stdout = StringIO.new
CallsExample.define_singleton_method(:sleep) { |_| }
begin
  Dir.mktmpdir do |root|
    directory = File.join(root, "run")
    http = FakeHTTP.new(nil, [], nil)
    states = %w[pending unavailable]
    http.respond = lambda do |message|
      check(message["Authorization"] == "Bearer synthetic")
      if message.method == "POST"
        check(message.path == "/v2/calls")
        saved = JSON.parse(File.read(File.join(directory, "request.json")))
        check(message["Idempotency-Key"] == saved.delete("idempotency_key"))
        check(JSON.parse(message.body) == saved && saved.key?("phone") && !saved.key?("recipients"))
        raise Net::ReadTimeout if http.messages.length == 1
        response(result_status: "pending")
      else
        check(message.path == "/v2/calls/call_test")
        response(result_status: states.shift || "unavailable")
      end
    end
    begin
      CallsExample.run(http, "synthetic", directory, "+12025550123")
      raise "Expected a lost create response"
    rescue Net::ReadTimeout
    end
    original = File.read(File.join(directory, "request.json"))
    check(CallsExample.run(http, "synthetic", directory) == 0)
    check(states.empty?)
    check(CallsExample.run(http, "synthetic", directory) == 0)
    check(http.messages.map(&:method) == %w[POST POST GET GET GET])
    check(File.read(File.join(directory, "request.json")) == original)
    check(JSON.parse(File.read(File.join(directory, "result.json")))["result"].nil?)
    %w[available not_applicable].each do |state|
      http.respond = ->(_) { response(result_status: state, result: state == "available" ? {} : nil) }
      check(CallsExample.run(http, "synthetic", directory) == 0)
    end
    http.respond = ->(_) { response(result_status: "unexpected") }
    begin
      CallsExample.run(http, "synthetic", directory)
      raise "Expected unknown result status rejection"
    rescue RuntimeError => error
      check(error.message.start_with?("Unrecognized result status"))
    end
  end
ensure
  CallsExample.singleton_class.remove_method(:sleep)
  $stdout = original_stdout
end
puts "Calls V2 Ruby persistence, lost-response replay, readiness and resume checks passed."
