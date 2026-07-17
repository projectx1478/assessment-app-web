import type { MiddlewareHandler } from "hono";

/** リクエストごとにpath/status/所要時間をログ出力する（Cloudflare Workers tail logsで確認可能）。 */
export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(
    JSON.stringify({
      path: c.req.path,
      method: c.req.method,
      status: c.res.status,
      ms,
    })
  );
};
