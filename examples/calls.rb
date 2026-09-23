# frozen_string_literal: true

require "json"
require "net/http"
require "optparse"
require "securerandom"

module CallsExample
  module_function

  def save(directory, name, value)
    File.open(File.join(directory, name), "w", 0o600) do |file|
      file.write(JSON.pretty_generate(value) + "\n")
      file.flush
      file.fsync
    end
  end

  def request(http, key, directory, message)
    message["Authorization"] = "Bearer #{key}"
    response = http.request(message)
    unless response.is_a?(Net::HTTPSuccess)
      # Keep the response private: error details can contain recipient data.
      save(directory, "error.json", { status: response.code.to_i, body: response.body })
      raise "HTTP #{response.code}; inspect error.json privately and https://docs.heycall-e.com/errors."
    end
    value = JSON.parse(response.body)
    raise "Expected a JSON object; preserve this directory for recovery." unless value.is_a?(Hash)

    value
  end

  def run(http, key, directory, phone = nil)
    if phone
      Dir.mkdir(directory, 0o700) # Refuse to overwrite an existing operation.
      operation = {
        "idempotency_key" => SecureRandom.uuid,
        "task" => "Make one authorized developer integration test call. Listen to " \
                  "the first complete greeting, then thank the other side and end " \
                  "the call. Do not press menu keys or wait on hold. The purpose " \
                  "is to verify that our application can read a real call result.",
        "recipients" => [{ "phones" => [phone], "locale" => "en-US", "region" => "US" }],
        "result_schema" => {
          "type" => "object",
          "properties" => {
            "heard_greeting" => { "type" => "string", "enum" => %w[yes no unknown] },
            "greeting_summary" => {
              "type" => "string",
              "description" => "Summarize only the greeting actually heard; use unknown if none was heard."
            }
          },
          "required" => %w[heard_greeting greeting_summary],
          "additionalProperties" => false
        }
      }
      save(directory, "request.json", operation)
      message = Net::HTTP::Post.new("/v1/calls")
      message["Content-Type"] = "application/json"
      message["Idempotency-Key"] = operation.fetch("idempotency_key")
      message.body = JSON.generate(operation.reject { |name, _| name == "idempotency_key" })
      call = request(http, key, directory, message)
      save(directory, "call-id.json", call.fetch("id"))
    end

    id_path = File.join(directory, "call-id.json")
    unless File.file?(id_path)
      raise "No saved Call ID. Keep request.json; follow https://docs.heycall-e.com/calls#recover-after-a-restart-or-lost-response."
    end
    call_id = JSON.parse(File.read(id_path))
    unless call_id.is_a?(String) && /\A[A-Za-z0-9_-]+\z/.match?(call_id)
      raise "Invalid saved Call ID; inspect call-id.json privately."
    end

    deadline = Process.clock_gettime(Process::CLOCK_MONOTONIC) + 300
    loop do
      remaining = deadline - Process.clock_gettime(Process::CLOCK_MONOTONIC)
      raise "Polling timed out; run resume to retrieve the same call." if remaining <= 0

      http.read_timeout = [150, remaining].min
      call = request(http, key, directory, Net::HTTP::Get.new("/v1/calls/#{call_id}"))
      raise "Response Call ID differs from the saved ID; stop and inspect the original call." unless call["id"] == call_id

      status = call["status"]
      if %w[completed failed canceled].include?(status)
        save(directory, "result.json", call)
        puts "Terminal status: #{status}. Result saved to result.json."
        puts "Exit 0 means retrieval finished. Review task_completed, structured_result, failure_code and transcript; null/unknown is not success."
        return 0
      end
      raise "Unrecognized call status; preserve the directory and inspect the saved call." unless %w[queued in_progress].include?(status)

      puts "Call status: #{status}; waiting for the same call."
      sleep [5, remaining].min
    end
  end

  def main(argv = ARGV)
    options = {}
    parser = OptionParser.new do |flags|
      flags.banner = "Usage: ruby examples/calls.rb start|resume DIRECTORY [--execute --confirm-authorized-recipient]"
      flags.on("--execute") { options[:execute] = true }
      flags.on("--confirm-authorized-recipient") { options[:authorized] = true }
    end
    args = parser.parse(argv)
    action, directory = args
    raise parser.to_s unless args.length == 2 && %w[start resume].include?(action)
    raise "Resume only retrieves an existing call; omit start flags." if action == "resume" && !options.empty?

    phone = nil
    if action == "start"
      phone = ENV.fetch("CALLE_TEST_PHONE", "")
      raise "Set CALLE_TEST_PHONE to an authorized US E.164 destination." unless /\A\+[1-9][0-9]{7,14}\z/.match?(phone)
      if !options[:execute]
        puts "Preview: one US English greeting call; will save its request, key and result in the new directory. No request sent."
        puts "To place the call, add --execute --confirm-authorized-recipient."
        return 0
      end
      raise "Confirm permission to call with --confirm-authorized-recipient." unless options[:authorized]
    end
    key = ENV.fetch("CALLE_API_KEY", "")
    raise "Set CALLE_API_KEY in the environment." if key.strip.empty?

    http = Net::HTTP.new("api.heycall-e.com", 443)
    http.use_ssl = true
    http.open_timeout = 30
    http.read_timeout = 150
    http.write_timeout = 30
    http.max_retries = 0
    run(http, key, directory, phone)
  rescue OptionParser::ParseError, RuntimeError => error
    warn error.message
    1
  rescue JSON::ParserError, KeyError, IOError, SystemCallError, Timeout::Error, SocketError, OpenSSL::SSL::SSLError, Net::HTTPBadResponse
    warn "Request, response or local file error. Keep the directory; use resume if call-id.json exists."
    warn "Otherwise follow https://docs.heycall-e.com/calls#recover-after-a-restart-or-lost-response before any new call."
    1
  end
end

exit CallsExample.main if $PROGRAM_NAME == __FILE__
