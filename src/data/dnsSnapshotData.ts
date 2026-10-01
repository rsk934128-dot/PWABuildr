export interface DnsAnswerRecord {
  name: string;
  type: number;
  typeName: 'A' | 'AAAA' | 'MX' | 'TXT' | 'NS' | 'CNAME' | 'SOA' | string;
  TTL: number;
  data: string;
  priority?: number;
}

export interface DnsResolutionSnapshot {
  domain: string;
  recordType: string;
  resolver: 'google' | 'cloudflare' | string;
  status: number;
  statusName: string;
  latencyMs: number;
  isDnssecValidated: boolean;
  answers: DnsAnswerRecord[];
  timestamp: string;
}

export const GITKRAKEN_DNS_SNAPSHOT: DnsResolutionSnapshot = {
  domain: 'gitkraken.com',
  recordType: 'ALL',
  resolver: 'google',
  status: 0,
  statusName: 'NOERROR (Success)',
  latencyMs: 4580,
  isDnssecValidated: false,
  answers: [
    {
      name: 'gitkraken.com.',
      type: 1,
      typeName: 'A',
      TTL: 300,
      data: '104.26.15.125',
    },
    {
      name: 'gitkraken.com.',
      type: 1,
      typeName: 'A',
      TTL: 300,
      data: '172.67.72.141',
    },
    {
      name: 'gitkraken.com.',
      type: 1,
      typeName: 'A',
      TTL: 300,
      data: '104.26.14.125',
    },
    {
      name: 'gitkraken.com.',
      type: 28,
      typeName: 'AAAA',
      TTL: 300,
      data: '2606:4700:20::ac43:488d',
    },
    {
      name: 'gitkraken.com.',
      type: 28,
      typeName: 'AAAA',
      TTL: 300,
      data: '2606:4700:20::681a:f7d',
    },
    {
      name: 'gitkraken.com.',
      type: 28,
      typeName: 'AAAA',
      TTL: 300,
      data: '2606:4700:20::681a:e7d',
    },
    {
      name: 'gitkraken.com.',
      type: 15,
      typeName: 'MX',
      TTL: 300,
      data: 'aspmx.l.google.com.',
      priority: 1,
    },
    {
      name: 'gitkraken.com.',
      type: 15,
      typeName: 'MX',
      TTL: 300,
      data: 'aspmx2.googlemail.com.',
      priority: 10,
    },
    {
      name: 'gitkraken.com.',
      type: 15,
      typeName: 'MX',
      TTL: 300,
      data: 'gkprodapi.gitkraken.com.',
      priority: 50,
    },
    {
      name: 'gitkraken.com.',
      type: 15,
      typeName: 'MX',
      TTL: 300,
      data: 'aspmx3.googlemail.com.',
      priority: 10,
    },
    {
      name: 'gitkraken.com.',
      type: 15,
      typeName: 'MX',
      TTL: 300,
      data: 'alt1.aspmx.l.google.com.',
      priority: 5,
    },
    {
      name: 'gitkraken.com.',
      type: 15,
      typeName: 'MX',
      TTL: 300,
      data: 'alt2.aspmx.l.google.com.',
      priority: 5,
    },
    {
      name: 'gitkraken.com.',
      type: 15,
      typeName: 'MX',
      TTL: 300,
      data: 'gkmail.axosoft.com.',
      priority: 50,
    },
    {
      name: 'gitkraken.com.',
      type: 16,
      typeName: 'TXT',
      TTL: 300,
      data: 'google-site-verification=KjzZsBe_BNfL5krsPA8Uz8aNoQW84K2LDedFbiHxyDM',
    },
    {
      name: 'gitkraken.com.',
      type: 16,
      typeName: 'TXT',
      TTL: 300,
      data: 'atlassian-domain-verification=c9h+E8Gog7/Y3DNjBXtWpfqSqnnhRY+JsRLhJjmLLwpB54aXUSm8OHuG0nGGiMYM',
    },
    {
      name: 'gitkraken.com.',
      type: 16,
      typeName: 'TXT',
      TTL: 300,
      data: 'v=MCPv1; k=ed25519; p=amNKFsZnpGBKfALUcLCFdfFYxf6qmlSQZWkR586wPgo=',
    },
    {
      name: 'gitkraken.com.',
      type: 16,
      typeName: 'TXT',
      TTL: 300,
      data: 'v=spf1 mx include:amazonses.com include:_spf.google.com include:544893.spf08.hubspotemail.net include:stspg-customer.com include:spf.protection.outlook.com -all',
    },
    {
      name: 'gitkraken.com.',
      type: 16,
      typeName: 'TXT',
      TTL: 300,
      data: 'apple-domain-verification=7PoMho8XSit0AXJp',
    },
    {
      name: 'gitkraken.com.',
      type: 16,
      typeName: 'TXT',
      TTL: 300,
      data: 'gitkraken-domain-verification=b09e764745b01e754433c9bc760322a448c61552510c4bfeb0809ff95c73f956',
    },
    {
      name: 'gitkraken.com.',
      type: 16,
      typeName: 'TXT',
      TTL: 300,
      data: 'google-site-verification=MOuLSXmnCalIwCuHWTdUtNxmIxcCQTBmlaUvY3-U8K0',
    },
    {
      name: 'gitkraken.com.',
      type: 16,
      typeName: 'TXT',
      TTL: 300,
      data: 'status-page-domain-verification=cy7vlzrrjjj9',
    },
    {
      name: 'gitkraken.com.',
      type: 16,
      typeName: 'TXT',
      TTL: 300,
      data: 'google-site-overification=82Dj907V7Z4GYfOCidGdNIYHomkC1goENGtzh_rU0Fc',
    },
    {
      name: 'gitkraken.com.',
      type: 16,
      typeName: 'TXT',
      TTL: 300,
      data: 'facebook-domain-verification=m2jhpi0s7q2w8df1d1124ocyrvamif',
    },
    {
      name: 'gitkraken.com.',
      type: 16,
      typeName: 'TXT',
      TTL: 300,
      data: 'MS=ms67060587',
    },
    {
      name: 'gitkraken.com.',
      type: 2,
      typeName: 'NS',
      TTL: 21600,
      data: 'lola.ns.cloudflare.com.',
    },
    {
      name: 'gitkraken.com.',
      type: 2,
      typeName: 'NS',
      TTL: 21600,
      data: 'seth.ns.cloudflare.com.',
    },
  ],
  timestamp: '11:08:20 PM',
};
