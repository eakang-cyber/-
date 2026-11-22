// 단일 HTML 미리보기 빌드용 진입점(scripts/build-artifact.mjs). 앱 코드는 Next 버전과 동일하다.
import { createRoot } from "react-dom/client";
import { DestinyApp } from "@/ui/DestinyApp";

createRoot(document.getElementById("root")!).render(<DestinyApp />);
