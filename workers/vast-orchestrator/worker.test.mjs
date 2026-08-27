import test from 'node:test';
import assert from 'node:assert/strict';

import { isOfferWithinLimits, mappedPort, publicIpv4, sanitizeOffer } from './worker.js';

const env = {
  MAX_PRICE_PER_HOUR: '0.35',
  PRIMARY_CPU_CORES: '24',
  BACKUP_CPU_CORES: '16',
  MIN_CPU_RAM_MB: '64000',
  MIN_NETWORK_MBPS: '1000',
};

const offer = {
  id: 42,
  dph_total: 0.19,
  cpu_cores_effective: 24,
  cpu_cores: 112,
  cpu_ram: 64384,
  inet_down: 8000,
  inet_up: 7000,
  direct_port_count: 124,
  gpu_name: 'RTX 5060 Ti',
  geolocation: 'Germany, DE',
};

test('primary limits use effective allocated CPU and the price cap', () => {
  assert.equal(isOfferWithinLimits(offer, env, false), true);
  assert.equal(isOfferWithinLimits({ ...offer, cpu_cores_effective: 16 }, env, false), false);
  assert.equal(isOfferWithinLimits({ ...offer, dph_total: 0.351 }, env, false), false);
});

test('backup tier is never selected unless explicitly allowed', () => {
  const backup = { ...offer, cpu_cores_effective: 16 };
  assert.equal(isOfferWithinLimits(backup, env, false), false);
  assert.equal(isOfferWithinLimits(backup, env, true), true);
});

test('both upload and download must meet the network floor', () => {
  assert.equal(isOfferWithinLimits({ ...offer, inet_up: 999 }, env, false), false);
  assert.equal(isOfferWithinLimits({ ...offer, inet_down: 999 }, env, false), false);
});

test('sanitized offer exposes no provider credentials or private URLs', () => {
  const result = sanitizeOffer({ ...offer, api_key: 'secret', source_url: 'private' });
  assert.equal(result.api_key, undefined);
  assert.equal(result.source_url, undefined);
  assert.equal(result.cpu_cores_effective, 24);
});

test('mappedPort accepts Vast port mappings', () => {
  assert.equal(mappedPort({ ports: { '8080/tcp': [{ HostPort: '41799' }] } }, 8080), 41799);
  assert.equal(mappedPort({ ports: { 80: { host_port: 44384 } } }, 80), 44384);
  assert.equal(mappedPort({ ports: {} }, 8080), null);
});

test('publicIpv4 rejects local and malformed addresses', () => {
  assert.equal(publicIpv4('38.247.78.6'), '38.247.78.6');
  assert.equal(publicIpv4('127.0.0.1'), null);
  assert.equal(publicIpv4('10.0.0.1'), null);
  assert.equal(publicIpv4('example.com'), null);
});
