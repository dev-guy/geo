defmodule Geo.LogTrimmerTest do
  use ExUnit.Case, async: true

  alias Geo.LogTrimmer

  @test_log_file "test_geo.log"

  setup do
    # Clean up any existing test log file
    File.rm(@test_log_file)

    # Stop any running LogTrimmer to avoid conflicts
    LogTrimmer.stop()

    on_exit(fn ->
      LogTrimmer.stop()
      File.rm(@test_log_file)
    end)

    :ok
  end

  test "starts and stops correctly" do
    # Start the LogTrimmer
    assert {:ok, pid} = LogTrimmer.start_link(@test_log_file)
    assert Process.alive?(pid)

    # Check status
    assert {:ok, status} = LogTrimmer.status()
    assert status.log_file == @test_log_file
    assert status.trim_count == 0

    # Stop the LogTrimmer
    assert :ok = LogTrimmer.stop()
    refute Process.alive?(pid)
  end

  test "prevents multiple instances" do
    # Start first instance
    assert {:ok, _pid1} = LogTrimmer.start_link(@test_log_file)

    # Try to start second instance - should fail
    assert {:error, {:already_started, _pid}} = LogTrimmer.start_link(@test_log_file)

    # Clean up
    LogTrimmer.stop()
  end

  test "trims log file when it exceeds max lines" do
    # Create a log file with more than 10,000 lines
    max_lines = 10_000
    content = String.duplicate("This is a test log line\n", max_lines + 1000)
    File.write!(@test_log_file, content)

    # Start LogTrimmer
    {:ok, _pid} = LogTrimmer.start_link(@test_log_file)

    # Manually trigger a trim
    LogTrimmer.trim_now()

    # Give it a moment to process
    Process.sleep(100)

    # Check that the file was trimmed
    trimmed_content = File.read!(@test_log_file)
    trimmed_lines = String.split(trimmed_content, "\n")

    # Should have exactly max_lines (the last line might be empty due to trailing newline)
    assert length(trimmed_lines) <= max_lines + 1

    # Clean up
    LogTrimmer.stop()
  end

  test "handles non-existent log file gracefully" do
    # Start LogTrimmer with non-existent file
    assert {:ok, _pid} = LogTrimmer.start_link("non_existent.log")

    # Should not crash when trying to trim
    LogTrimmer.trim_now()
    Process.sleep(100)

    # Should still be running
    assert {:ok, _status} = LogTrimmer.status()

    # Clean up
    LogTrimmer.stop()
  end
end
