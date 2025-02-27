/* global process */
// @ts-check
import { makeHelpers } from '@agoric/deploy-script-support';
import { objectMap } from '@agoric/internal';

import {
  getManifestForInterProtocol,
  getManifestForEconCommittee,
  getManifestForMain,
} from '../src/proposals/core-proposal.js';
import { makeInstallCache } from '../src/proposals/utils.js';

/** @type {Record<string, Record<string, [string, string]>>} */
const installKeyGroups = {
  econCommittee: {
    contractGovernor: [
      '@agoric/governance/src/contractGovernor.js',
      '../../governance/bundles/bundle-contractGovernor.js',
    ],
    committee: [
      '@agoric/governance/src/committee.js',
      '../../governance/bundles/bundle-committee.js',
    ],
    binaryVoteCounter: [
      '@agoric/governance/src/binaryVoteCounter.js',
      '../../governance/bundles/bundle-binaryVoteCounter.js',
    ],
  },
  stakeFactory: {
    stakeFactory: [
      '../src/stakeFactory/stakeFactory.js',
      '../bundles/bundle-stakeFactory.js',
    ],
  },
  main: {
    amm: [
      '../src/vpool-xyk-amm/multipoolMarketMaker.js',
      '../bundles/bundle-amm.js',
    ],
    interchainPool: [
      '../src/interchainPool.js',
      '../bundles/bundle-interchainPool.js',
    ],
    vaultFactory: [
      '../src/vaultFactory/vaultFactory.js',
      '../bundles/bundle-vaultFactory.js',
    ],
    feeDistributor: [
      '../src/feeDistributor.js',
      '../bundles/bundle-feeDistributor.js',
    ],
    liquidateMinimum: [
      '../src/vaultFactory/liquidateMinimum.js',
      '../bundles/bundle-liquidateMinimum.js',
    ],
    liquidate: [
      '../src/vaultFactory/liquidateIncrementally.js',
      '../bundles/bundle-liquidateIncrementally.js',
    ],
    reserve: ['../src/reserve/assetReserve.js', '../bundles/bundle-reserve.js'],
  },
};

/**
 *
 * @param {object} opts
 * @param {(i: I) => R} opts.publishRef
 * @param {(m: string, b: string, opts?: any) => I} opts.install
 * @param {<T>(f: T) => T} [opts.wrapInstall]
 *
 * @template I
 * @template R
 */
export const committeeProposalBuilder = async ({
  publishRef,
  install: install0,
  wrapInstall,
}) => {
  const { ROLE = 'chain' } = process.env;

  const install = wrapInstall ? wrapInstall(install0) : install0;

  /** @param {Record<string, [string, string]>} group */
  const publishGroup = group =>
    objectMap(group, ([mod, bundle]) =>
      publishRef(install(mod, bundle, { persist: true })),
    );
  return harden({
    sourceSpec: '../src/proposals/core-proposal.js',
    getManifestCall: [
      getManifestForEconCommittee.name,
      {
        ROLE,
        installKeys: {
          ...publishGroup(installKeyGroups.econCommittee),
        },
      },
    ],
  });
};

/**
 *
 * @param {object} opts
 * @param {(i: I) => R} opts.publishRef
 * @param {(m: string, b: string, opts?: any) => I} opts.install
 * @param {<T>(f: T) => T} [opts.wrapInstall]
 *
 * @template I
 * @template R
 */
export const mainProposalBuilder = async ({
  publishRef,
  install: install0,
  wrapInstall,
}) => {
  const { ROLE = 'chain', VAULT_FACTORY_CONTROLLER_ADDR } = process.env;

  const install = wrapInstall ? wrapInstall(install0) : install0;

  const persist = true;
  /** @param {Record<string, [string, string]>} group */
  const publishGroup = group =>
    objectMap(group, ([mod, bundle]) =>
      publishRef(install(mod, bundle, { persist })),
    );
  return harden({
    sourceSpec: '../src/proposals/core-proposal.js',
    getManifestCall: [
      getManifestForMain.name,
      {
        ROLE,
        vaultFactoryControllerAddress: VAULT_FACTORY_CONTROLLER_ADDR,
        installKeys: {
          ...publishGroup(installKeyGroups.main),
          ...publishGroup(installKeyGroups.stakeFactory),
        },
      },
    ],
  });
};

// Build proposal for sim-chain etc.
export const defaultProposalBuilder = async (
  { publishRef, install },
  options = {},
  { env = process.env } = {},
) => {
  /** @param {string|undefined} s */
  const optBigInt = s => s && BigInt(s);
  const {
    ROLE = env.ROLE || 'chain',
    vaultFactoryControllerAddress = env.VAULT_FACTORY_CONTROLLER_ADDR,
    minInitialPoolLiquidity = env.MIN_INITIAL_POOL_LIQUIDITY,
    anchorOptions: {
      anchorDenom = env.ANCHOR_DENOM,
      anchorDecimalPlaces = '6',
      anchorKeyword = 'AUSD',
      anchorProposedName = anchorKeyword,
    } = {},
    econCommitteeOptions: {
      committeeSize: econCommitteeSize = env.ECON_COMMITTEE_SIZE || '3',
    } = {},
  } = options;

  /** @param {Record<string, [string, string]>} group */
  const publishGroup = group =>
    objectMap(group, ([mod, bundle]) => publishRef(install(mod, bundle)));

  const anchorOptions = anchorDenom && {
    denom: anchorDenom,
    decimalPlaces: parseInt(anchorDecimalPlaces, 10),
    keyword: anchorKeyword,
    proposedName: anchorProposedName,
  };

  const econCommitteeOptions = {
    committeeSize: parseInt(econCommitteeSize, 10),
  };

  return harden({
    sourceSpec: '../src/proposals/core-proposal.js',
    getManifestCall: [
      getManifestForInterProtocol.name,
      {
        ROLE,
        vaultFactoryControllerAddress,
        minInitialPoolLiquidity: optBigInt(minInitialPoolLiquidity),
        anchorOptions,
        econCommitteeOptions,
        installKeys: {
          ...publishGroup(installKeyGroups.econCommittee),
          ...publishGroup(installKeyGroups.stakeFactory),
          ...publishGroup(installKeyGroups.main),
        },
      },
    ],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);

  const tool = await makeInstallCache(homeP, {
    loadBundle: spec => import(spec),
  });
  await Promise.all([
    writeCoreProposal('gov-econ-committee', opts =>
      committeeProposalBuilder({ ...opts, wrapInstall: tool.wrapInstall }),
    ),
    writeCoreProposal('gov-amm-vaults-etc', opts =>
      mainProposalBuilder({ ...opts, wrapInstall: tool.wrapInstall }),
    ),
  ]);
  await tool.saveCache();
};
