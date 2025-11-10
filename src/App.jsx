import "./index.css";
import { Code } from "./comp/code";
import { Button } from "@/components/ui/button";
import { Combobox } from "./comp/dropdown";
import { Textarea } from "@/components/ui/textarea";
function App() {
  return (
    <>
      <div className="flex  items-center justify-center h-screen">
        <div>
          <Code prop="put your code here" />{" "}
        </div>
        <div>
          <Textarea placeholder="Output" disabled />
        </div>
        {/* <Button variant="default">Submit</Button> */}
        <div>
          <Combobox />
        </div>
      </div>
    </>
  );
}

export default App;
