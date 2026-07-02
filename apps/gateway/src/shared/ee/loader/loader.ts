import fs from "fs";
import path from "path";
import logger from "@shared/core/logger";
import { logEeAuditEvent } from "@shared/ee/audit/audit";
import { getInteraOneMode, isEeEnabledByEnv } from "@shared/ee/loader/env";
import { EeModule } from "@shared/ee/contracts/types";

let eeModuleCache: EeModule | null | undefined;

/**
 * Checks whether the `ee/index.js` file exists on disk.
 * Searches relative to both the API process CWD and the monorepo root.
 */
export const isEeModulePresent = (): boolean => {
  const root = process.cwd();

  try {
    require.resolve(path.resolve(root, "ee"));
    return true;
  } catch {
    try {
      require.resolve(path.resolve(root, "../../ee"));
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Returns a snapshot of the current EE availability status.
 * This is the single source of truth consumed by middleware and controllers.
 */
export const getEeStatus = () => {
  const mode = getInteraOneMode();
  const enabledByEnv = isEeEnabledByEnv();
  const modulePresent = isEeModulePresent();
  return {
    mode,
    enabledByEnv,
    modulePresent,
    isAvailable: enabledByEnv && modulePresent,
  };
};

/**
 * Validates the shape of the loaded EE module against the expected contract.
 * Logs a warning for each violated check but does not throw — the EE module
 * is still returned even if partially malformed to allow partial degradation.
 */
const validateEeModuleContract = (ee: EeModule): void => {
  if (!ee || typeof ee !== "object") {
    logEeAuditEvent({ event: "ee_contract_warning", reason: "EE module export must be an object" });
    return;
  }

  const checks: Array<{ ok: boolean; reason: string }> = [
    {
      ok: !ee.contractVersion || ee.contractVersion === "1",
      reason: "contractVersion must be '1' when provided",
    },
    { ok: !ee.billing || typeof ee.billing === "object", reason: "billing export must be an object" },
  ];

  for (const check of checks) {
    if (!check.ok) {
      logEeAuditEvent({ event: "ee_contract_warning", reason: check.reason });
    }
  }
};

/**
 * Dynamically loads the `ee/index.js` module using `require()` so that the
 * OSS build never fails due to a missing `ee/` directory.
 *
 * Results are cached in-process. Returns `null` when EE is unavailable or
 * the module fails to load.
 */
export const loadEeModule = (): EeModule | null => {
  const status = getEeStatus();
  if (!status.isAvailable) {
    eeModuleCache = null;
    return null;
  }

  if (typeof eeModuleCache !== "undefined") {
    return eeModuleCache;
  }

  try {
    const root = process.cwd();
    const candidates = [
      path.join(root, "ee", "index.js"),
      path.join(root, "..", "..", "ee", "index.js"),
    ];
    const entry = candidates.find((candidate) => fs.existsSync(candidate));
    if (!entry) {
      eeModuleCache = null;
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ee = require(entry) as EeModule;
    validateEeModuleContract(ee);
    eeModuleCache = ee;
    return ee;
  } catch (error) {
    logger.error("[EE] Failed to load EE module", {
      error: (error as Error)?.message,
      stack: (error as Error)?.stack,
    });
    eeModuleCache = null;
    return null;
  }
};

/**
 * Eagerly loads the EE module at API startup to surface contract warnings
 * in the boot logs rather than at the first customer request.
 */
export const preflightEeContractCheck = (): void => {
  const status = getEeStatus();
  if (!status.isAvailable) return;
  loadEeModule();
};
