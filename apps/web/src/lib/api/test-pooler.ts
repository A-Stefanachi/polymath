// Test support: a fake transaction-mode pooler (the part of Supavisor's behaviour the privileged pool must survive).
// Used only by *.test.ts. It forwards bytes between a client and the local database, and like Supavisor on port 6543:
// - at ReadyForQuery with status Idle the transaction is over and the server connection goes back to the pool, so any
//   server bytes that follow are dropped until the client starts a new turn (a query pipelined behind the finished
//   one never gets its reply, the staging hang of BL-0044);
// - session settings sent as startup parameters (statement_timeout, options) are not applied.
import net from "node:net";

export type FakePooler = { url: string; close: () => Promise<void> };

/** Startup message without its settings, keeping user, database and application_name only. */
function stripStartup(msg: Buffer): Buffer {
  const protocol = msg.readInt32BE(4);
  if (protocol !== 196608) return msg; // SSLRequest or CancelRequest: pass through
  const parts = msg.subarray(8, msg.length - 1).toString("utf8").split("\0");
  const kept: string[] = [];
  for (let i = 0; i + 1 < parts.length; i += 2) {
    const key = parts[i] ?? "";
    if (["user", "database", "application_name"].includes(key)) kept.push(key, parts[i + 1] ?? "");
  }
  const body = Buffer.from(kept.map((p) => `${p}\0`).join("") + "\0", "utf8");
  const head = Buffer.alloc(8);
  head.writeInt32BE(8 + body.length, 0);
  head.writeInt32BE(protocol, 4);
  return Buffer.concat([head, body]);
}

export async function startFakePooler(targetUrl: string): Promise<FakePooler> {
  const target = new URL(targetUrl);
  const sockets = new Set<net.Socket>();
  const server = net.createServer((client) => {
    const upstream = net.connect(Number(target.port || 5432), target.hostname);
    sockets.add(client).add(upstream);
    let startup = true;
    let pending = Buffer.alloc(0);
    let fromServer = Buffer.alloc(0);
    let released = false; // the transaction ended: server bytes are no longer this client's

    client.on("data", (chunk: Buffer) => {
      released = false;
      if (!startup) return void upstream.write(chunk);
      pending = Buffer.concat([pending, chunk]);
      if (pending.length < 4 || pending.length < pending.readInt32BE(0)) return;
      const len = pending.readInt32BE(0);
      upstream.write(Buffer.concat([stripStartup(pending.subarray(0, len)), pending.subarray(len)]));
      startup = false;
      pending = Buffer.alloc(0);
    });
    upstream.on("data", (chunk: Buffer) => {
      fromServer = Buffer.concat([fromServer, chunk]);
      const out: Buffer[] = [];
      while (fromServer.length >= 5 && fromServer.length >= fromServer.readInt32BE(1) + 1) {
        const size = fromServer.readInt32BE(1) + 1;
        const msg = fromServer.subarray(0, size);
        fromServer = fromServer.subarray(size);
        if (released) continue;
        out.push(msg);
        if (msg[0] === 0x5a && msg[5] === 0x49) released = true; // 'Z' with status 'I'
      }
      if (out.length > 0) client.write(Buffer.concat(out));
    });
    const end = () => {
      client.destroy();
      upstream.destroy();
    };
    client.on("close", end).on("error", end);
    upstream.on("close", end).on("error", end);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as net.AddressInfo;
  const url = new URL(targetUrl);
  url.hostname = "127.0.0.1";
  url.port = String(port);
  return {
    url: url.toString(),
    close: () =>
      new Promise<void>((resolve) => {
        for (const s of sockets) s.destroy();
        server.close(() => resolve());
      }),
  };
}
