/**
 * A demo document that exercises every tool:
 *  - Tree / Query: nested objects + arrays, mixed types
 *  - Anonymize: emails, phones, SSNs, credit cards, IPs, names, addresses, UUIDs, URLs, DOBs
 *  - Format / Validate: valid, well-structured JSON
 *  - Convert: arrays of objects (CSV), nested structures (YAML/XML/types/schema)
 *  - Unescape: `metadata.rawPayload` is a stringified-JSON value to expand
 *  - Transform: flatten/unflatten, sort keys; Diff: copy & tweak into the right pane
 */
export const SAMPLE_JSON = `{
  "company": {
    "name": "Acme Corp",
    "website": "https://acme.example.com",
    "founded": "2009-04-12",
    "public": false,
    "employeeCount": 3,
    "rating": 4.5,
    "parent": null
  },
  "employees": [
    {
      "id": "5f8d04b3-1c2a-4e6f-9b7a-2d3e4f5a6b7c",
      "firstName": "Ada",
      "lastName": "Lovelace",
      "email": "ada.lovelace@example.com",
      "phone": "+1 (415) 555-0132",
      "ssn": "123-45-6789",
      "creditCard": "4532015112830366",
      "ipAddress": "192.168.1.42",
      "dateOfBirth": "1990-12-10",
      "salary": 145000,
      "remote": true,
      "address": { "street": "100 Analytical Engine Way", "city": "London", "zip": "EC1A 1BB", "country": "UK" },
      "tags": ["research", "engineering"]
    },
    {
      "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "firstName": "Alan",
      "lastName": "Turing",
      "email": "alan.turing@example.com",
      "phone": "+44 20 7946 0958",
      "ssn": "987-65-4321",
      "creditCard": "6011000990139424",
      "ipAddress": "10.0.0.7",
      "dateOfBirth": "1912-06-23",
      "salary": 152000,
      "remote": false,
      "address": { "street": "1 Bletchley Park", "city": "Milton Keynes", "zip": "MK3 6EB", "country": "UK" },
      "tags": ["research", "cryptography"]
    },
    {
      "id": "f6e5d4c3-b2a1-0f9e-8d7c-6b5a4f3e2d1c",
      "firstName": "Grace",
      "lastName": "Hopper",
      "email": "grace.hopper@example.com",
      "phone": "+1 (202) 555-0174",
      "ssn": "555-12-3456",
      "creditCard": "378282246310005",
      "ipAddress": "172.16.0.21",
      "dateOfBirth": "1906-12-09",
      "salary": 161000,
      "remote": true,
      "address": { "street": "2 Compiler Court", "city": "Arlington", "zip": "22201", "country": "US" },
      "tags": ["engineering", "compilers"]
    }
  ],
  "metadata": {
    "createdAt": "2026-06-10",
    "version": 2,
    "active": true,
    "rawPayload": "{\\"source\\":\\"import\\",\\"records\\":3,\\"nested\\":{\\"ok\\":true,\\"ratio\\":0.75}}"
  }
}`;

/** Intentionally broken JSON for trying out Repair. */
export const BROKEN_JSON = `{
  // a config with several problems
  name: 'kuya-json',
  version: '0.1.0',
  active: True,
  retries: NaN,
  features: ['format', 'repair', 'anonymize',],
  author: None
}`;
