import "../index.css";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { sendCode } from "../utils/sendCode";
import { ModeToggle } from "../comp/mode-toggle";

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
            <Textarea
              className="flex-1 resize-none font-mono text-sm"
              value={
                error
                  ? `Error: ${error}`
                  : output || "Output will appear here..."
              }
              readOnly
              placeholder="Output will appear here..."
            />
          </div>
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? "Executing..." : "Run Code"}
        </Button>
      </form>
    </>
  );
};
