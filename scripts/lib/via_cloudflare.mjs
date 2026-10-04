/**
 * Preload: resolve *.admissionhands.com through Cloudflare's own resolver.
 *
 *   node --import ./scripts/lib/via_cloudflare.mjs scripts/smoke.mjs https://www.admissionhands.com
 *
 * A check is only worth running against the path a visitor takes. After the
 * nameserver move, this machine's ISP resolver kept the old Hostinger answer for
 * days and sent "checks through Cloudflare" straight to the old server — they
 * passed, and proved nothing about Cloudflare. 1.1.1.1 answers for a zone
 * Cloudflare hosts with what Cloudflare itself serves, so this is the edge.
 *
 * Every other hostname resolves normally.
 */
import { Agent, setGlobalDispatcher } from "undici";
import dns from "node:dns";

const cfResolver = new dns.Resolver();
cfResolver.setServers(["1.1.1.1", "1.0.0.1"]);
const cache = new Map();

function viaCloudflare(host, cb) {
  if (cache.has(host)) return cb(null, cache.get(host));
  cfResolver.resolve4(host, (err, addrs) => {
    if (err || !addrs?.length) return cb(err || new Error(`no A record for ${host} at 1.1.1.1`));
    cache.set(host, addrs[0]);
    cb(null, addrs[0]);
  });
}

setGlobalDispatcher(
  new Agent({
    connect: {
      lookup(host, opts, cb) {
        if (!/(^|\.)admissionhands\.com$/.test(host)) return dns.lookup(host, opts, cb);
        viaCloudflare(host, (err, ip) => {
          if (err) return cb(err);
          return opts && opts.all ? cb(null, [{ address: ip, family: 4 }]) : cb(null, ip, 4);
        });
      },
    },
  }),
);
