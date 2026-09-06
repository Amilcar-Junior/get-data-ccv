"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    SwaggerUIBundle?: (options: Record<string, unknown>) => void;
  }
}

export function SwaggerClient() {
  useEffect(() => {
    const cssId = "swagger-ui-css";
    if (!document.getElementById(cssId)) {
      const css = document.createElement("link");
      css.id = cssId;
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css";
      document.head.appendChild(css);
    }

    const scriptId = "swagger-ui-bundle";
    const mount = () => {
      window.SwaggerUIBundle?.({
        url: "/api/openapi",
        dom_id: "#swagger-ui",
        persistAuthorization: true,
        displayRequestDuration: true,
        tryItOutEnabled: true,
        filter: true,
        deepLinking: true,
        defaultModelsExpandDepth: 1,
      });
    };

    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
      if (window.SwaggerUIBundle) mount();
      else existing.addEventListener("load", mount);
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js";
    script.onload = mount;
    document.body.appendChild(script);
  }, []);

  return <div id="swagger-ui" className="swagger-ui-wrap" />;
}
