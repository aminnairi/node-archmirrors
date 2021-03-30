import {createNaturalOptionParser} from "@aminnairi/natural";
import fetch from "node-fetch";
import {promises as fs} from "fs";

const parse = createNaturalOptionParser([
  {
    name: "help",
    option: "help",
    isBoolean: true,
    isMultiple: false
  },
  {
    name: "countries",
    option: "country",
    isBoolean: false,
    isMultiple: true
  },
  {
    name: "protocols",
    option: "protocol",
    isBoolean: false,
    isMultiple: true
  },
  {
    name: "countrycodes",
    option: "countrycode",
    isBoolean: false,
    isMultiple: true
  },
  {
    name: "ipv4",
    option: "ipv4",
    isBoolean: true,
    isMultiple: false
  },
  {
    name: "ipv6",
    option: "ipv6",
    isBoolean: true,
    isMultiple: false
  },
  {
    name: "lastsync",
    option: "lastsync",
    isBoolean: false,
    isMultiple: false
  },
  {
    name: "output",
    option: "output",
    isBoolean: false,
    isMultiple: false
  },
  {
    name: "sorts",
    option: "sortby",
    isBoolean: false,
    isMultiple: true
  },
  {
    name: "active",
    option: "active",
    isBoolean: true,
    isMultiple: false
  }
]);

const [parsed, unknown, lone] = parse(process.argv.slice(2));

if (parsed.help === true) {
  console.log("USAGE");
  console.log("");
  console.log("  npx @aminnairi/archmirrors [OPTIONS]");
  console.log("");
  console.log("OPTIONS");
  console.log("  active");
  console.log("    filter by only active servers");
  console.log("");
  console.log("  country COUNTRY");
  console.log("    filter by country (can be called multiple times)");
  console.log("");
  console.log("  countrycodes COUNTRYCODE");
  console.log("    filter by country code (can be called multiple times)");
  console.log("");
  console.log("  protocol PROTOCOL");
  console.log("    filter by protocol (can be called multiple times)");
  console.log("");
  console.log("  lastsync DATE");
  console.log("    filter by last synchronisation date");
  console.log("");
  console.log("  sortby SORT");
  console.log("    sort by one of the following properties (can be called multiple times):");
  console.log("    completion_pct, country, country_code, delay, duration_avg");
  console.log("    duration_stddev, last_sync or score");
  console.log("");
  console.log("  ipv4");
  console.log("    filter by ipv4 availablility");
  console.log("");
  console.log("  ipv6");
  console.log("    filter by ipv6 availablility");
  console.log("");
  console.log("  output FILENAME");
  console.log("    output the result to a file (default to the standard output)");
  console.log("");
  console.log("EXAMPLES");
  console.log("  npx @aminnairi/archmirrors");
  console.log("  npx @aminnairi/archmirrors help");
  console.log("  npx @aminnairi/archmirrors country france country spain");
  console.log("  npx @aminnairi/archmirrors sortby delay sortby score");
  console.log("  npx @aminnairi/archmirrors output mirrorlist.pacnew");
  process.exit(0);
}

if (unknown.length > 0) {
  console.log(`Unknown argument: ${unknown[0]}`);
  process.exit(1);
}

if (lone.length > 0) {
  console.log(`Lone argument: ${lone[0]}`);
  process.exit(2);
}

const numberOr = (fallback, something) => {
  if (typeof something === "number") {
    return something;
  }

  if (typeof something === "string" || Array.isArray(something)) {
    return something.length;
  }

  return fallback;
};

const main = async () => {
  const endpoint = "https://archlinux.org/mirrors/status/json/";
  const response = await fetch(endpoint);
  const status = await response.json();
  const servers = status.urls;
  const normalizedCountries = (parsed.countries ?? []).map(country => country.trim().toLowerCase());
  const normalizedProtocols = (parsed.protocols ?? []).map(protocol => protocol.trim().toLowerCase())
  const normalizedCountryCodes = (parsed.countrycodes ?? []).map(countryCode => countryCode.trim().toLowerCase());
  const serversByCountries = servers.filter(server => normalizedCountries.length === 0 || normalizedCountries.includes(server.country.trim().toLowerCase()));
  const serversByProtocols = serversByCountries.filter(server => normalizedProtocols.length === 0 || normalizedProtocols.includes(server.protocol.trim().toLowerCase()));
  const serversByCountryCodes = serversByProtocols.filter(server => normalizedCountryCodes.length === 0 || normalizedCountryCodes.includes(server.country_code.trim().toLowerCase()));
  const serversByIpv4 = serversByCountryCodes.filter(server => parsed.ipv4 === undefined || server.ipv4);
  const serversByIpv6 = serversByIpv4.filter(server => parsed.ipv6 === undefined || server.ipv6);
  const serversByLastSync = serversByIpv6.filter(server => new Date(parsed.lastsync || 0).getTime() < new Date(server.last_sync).getTime());
  const serversByActiveness = serversByLastSync.filter(server => parsed.active === undefined || server.active);
  const serversSorted = serversByActiveness.sort((firstServer, secondServer) => (parsed.sorts ?? []).reduce((score, sort) => score + numberOr(Infinity, firstServer[sort]) - numberOr(Infinity, secondServer[sort]), 0));
  const urls = serversSorted.map(server => server.url);
  const mirrorlist = urls.map(url => `Server = ${url}$repo/os/$arch`);
  const output = mirrorlist.join("\n");

  if (parsed.output === undefined) {
    console.log(output);
  } else {
    const isFile = await fs.stat(parsed.output).then(stat => stat.isFile()).catch(() => null);

    if (isFile) {
      throw new Error(`File ${parsed.output} already exists.`);
    }

    await fs.writeFile(parsed.output, output);
    console.log(`Successfully wrote mirrors to ${parsed.output}.`);
  }
};

main().catch(error => {
  console.error(error.message);
  process.exit(3);
});
