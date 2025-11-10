import { useState } from "react";
import "../index.css";
import { Textarea } from "@/components/ui/textarea";
import { sendCode } from "../utils/sendCode";
export const Code = (prop) => {
  const [message, Setmessage] = useState("");
  const handlemessageChange = (e) => {
    Setmessage(e.target.value);
  };
  const handleSubmit = () => {
    event.preventDefault();
    sendCode(message);
  };
  return (
    <>
      <form onSubmit={handleSubmit} className="grid w-full gap-3">
        <Textarea
          placeholder={prop.prop}
          value={message}
          onChange={handlemessageChange}
        />
        <button type="submit">Submit</button>
      </form>
    </>
  );
};
