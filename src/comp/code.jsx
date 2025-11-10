import "../index.css";
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendCode } from "../utils/sendCode";
import { createSnippet, updateSnippet } from "../services/snippetService";
import { Save, Play } from "lucide-react";
import { toast } from "sonner";

export const Code = ({
  prop,
  selectedLanguage,
  snippetId = null,
  initialCode = "",
  initialTitle = "",
}) => {
  const [message, setMessage] = useState(initialCode);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState(initialTitle);

  // Update code and title when initial values change
  useEffect(() => {
    setMessage(initialCode);
    setTitle(initialTitle);
  }, [initialCode, initialTitle]);

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!message.trim()) {
      setError("Please enter some code");
      return;
    }

    if (!selectedLanguage) {
      setError("Please select a language");
      return;
    }

    setLoading(true);
    setError("");
    setOutput("");

    try {
      const result = await sendCode(message, selectedLanguage);
      setOutput(result.output);
      toast.success("Code executed successfully!");
    } catch (err) {
      const errorMsg = err.response?.data?.error || "An error occurred";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSnippet = async () => {
    if (!message.trim()) {
      toast.error("Please enter some code to save");
      return;
    }

    if (!selectedLanguage) {
      toast.error("Please select a language");
      return;
    }

    if (!title.trim()) {
      toast.error("Please enter a title for your snippet");
      return;
    }

    setSaving(true);

    try {
      const snippetData = {
        title,
        code: message,
        language: selectedLanguage,
        output: output || null,
      };

      if (snippetId) {
        await updateSnippet(snippetId, snippetData);
        toast.success("Snippet updated successfully!");
      } else {
        await createSnippet(snippetData);
        toast.success("Snippet saved successfully!");
        setTitle(""); // Clear title after saving new snippet
      }
    } catch (err) {
      console.error("Error saving snippet:", err);
      toast.error("Failed to save snippet");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col h-full gap-3">
        {/* Save snippet section */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              placeholder="Snippet title (required for saving)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveSnippet}
            disabled={
              saving || !message.trim() || !selectedLanguage || !title.trim()
            }
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : snippetId ? "Update" : "Save"}
          </Button>
        </div>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Input Side */}
          <div className="flex-1 flex flex-col">
            <h2 className="font-semibold mb-2">Code Editor</h2>
            <Textarea
              className="flex-1 resize-none font-mono text-sm"
              placeholder={prop}
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
          <Play className="mr-2 h-4 w-4" />
          {loading ? "Executing..." : "Run Code"}
        </Button>
      </form>
    </>
  );
};
