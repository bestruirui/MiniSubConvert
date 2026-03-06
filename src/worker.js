import { ProxyUtils } from "@/core/proxy-utils";

export default {
    async fetch(request, env) {
        const method = request.method.toUpperCase();
        const pathname = new URL(request.url).pathname;
        const secret = env.SECRET || "secret";

        if (
            !(method === "POST" && pathname === `/${secret}/api/proxy/parse`) &&
            !(method === "GET" && pathname === `/${secret}/sub`)
        ) {
            return new Response(null, { status: 403 });
        }

        try {
            return await env.MiniSubConvert.get(env.MiniSubConvert.idFromName("minisubconvert")).fetch(request);
        } catch {
            return new Response(null, { status: 500 });
        }
    },
};
export class MiniSubConvert {
    async fetch(request) {
        const method = request.method.toUpperCase();

        try {
            if (method === "POST") {
                const { data, client } = JSON.parse((await request.text()) || "{}");
                const proxies = ProxyUtils.parse(data);
                const par_res = ProxyUtils.produce(proxies, client);
                console.log(`parsed ${proxies.length} nodes, target client: ${client || "-"}`);

                return new Response(
                    JSON.stringify({
                        status: "success",
                        data: { par_res },
                    }),
                    {
                        status: 200,
                        headers: { "Content-Type": "application/json; charset=utf-8" },
                    },
                );
            }

            if (method === "GET") {
                const searchParams = new URL(request.url).searchParams;
                const target = searchParams.get("target");
                const rawUrls = searchParams.get("url");

                if (!target || !rawUrls) {
                    return new Response("missing target or url", { status: 400 });
                }

                const client = target;
                const proxies = (
                    await Promise.all(
                        rawUrls
                            .split("|")
                            .map((item) => item.trim())
                            .filter(Boolean)
                            .map((subscribeUrl) => fetch(subscribeUrl).then((response) => response.text())),
                    )
                ).flatMap((subContent) => ProxyUtils.parse(subContent));
                const result = ProxyUtils.produce(proxies, client);
                console.log(`parsed ${proxies.length} nodes, target client: ${client || "-"}`);

                return new Response(result, {
                    status: 200,
                    headers: { "Content-Type": "text/plain; charset=utf-8" },
                });
            }

            return new Response(null, { status: 403 });
        } catch {
            return new Response(null, { status: 500 });
        }
    }
}
