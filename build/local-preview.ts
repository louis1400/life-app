import type { Plugin } from "vite";

// The hosted dispatcher provides identity in production. This adapter exists only
// in the loopback development server, with isolated local D1/R2 data.
export function localPreview(): Plugin {
  return {
    name: "life-local-preview",
    enforce: "pre",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const address = req.socket.remoteAddress;
        const host = req.headers.host || "";
        if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address || "") || !/^(127\.0\.0\.1|localhost):\d+$/.test(host)) {
          res.writeHead(403).end("The Life preview is available on this computer only.");
          return;
        }
        for (const key of Object.keys(req.headers)) if (key.startsWith("oai-authenticated-")) delete req.headers[key];
        req.headers["oai-authenticated-user-id"] = "life-local-preview";
        req.headers["oai-authenticated-user-email"] = "preview@localhost";
        const rawHeaders: string[] = [];
        for (let index = 0; index < req.rawHeaders.length; index += 2) {
          if (!req.rawHeaders[index].toLowerCase().startsWith("oai-authenticated-")) rawHeaders.push(req.rawHeaders[index], req.rawHeaders[index + 1]);
        }
        req.rawHeaders = [...rawHeaders, "oai-authenticated-user-id", "life-local-preview", "oai-authenticated-user-email", "preview@localhost"];
        next();
      });
    },
  };
}
