import "../index.css";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { sendCode } from "../utils/sendCode";

export const Code = (prop) => {
  const [message, setMessage] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!message.trim()) {
      setError("Please enter some code");
      return;
    }

    if (!prop.selectedLanguage) {
      setError("Please select a language");
      return;
    }

    setLoading(true);
    setError("");
    setOutput("");

    try {
      const result = await sendCode(message, prop.selectedLanguage);
      setOutput(result.output);
    } catch (err) {
      setError(err.response?.data?.error || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col h-full gap-3">
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Input Side */}
          <div className="flex-1 flex flex-col">
            <h2 className="font-semibold mb-2">Code Editor</h2>
            <Textarea
              className="flex-1 resize-none font-mono text-sm"
              placeholder={prop.prop}
              value={message}
              onChange={handleMessageChange}
              disabled={loading}
            />
          </div>

          {/* Output Side */}
          <div className="flex-1 flex flex-col">
            <h2 className="font-semibold mb-2">Output</h2>
            <div className="flex-1 p-4 border rounded bg-gray-50 overflow-auto">
              {error && (
                <div className="text-red-500 p-2 border border-red-500 rounded bg-red-50">
                  <span className="font-semibold">Error:</span> {error}
                </div>
              )}

              {output && (
                <pre className="font-mono text-sm whitespace-pre-wrap">
                  {output}
                </pre>
              )}

              {!error && !output && (
                <p className="text-gray-400 italic">
                  Output will appear here...
                </p>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-gray-50 text-black rounded hover:bg-gray-400 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Executing..." : "Run Code"}
        </button>
      </form>
    </>
  );
};
