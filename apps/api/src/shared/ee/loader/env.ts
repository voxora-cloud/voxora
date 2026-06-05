import { InteraOneMode } from "../licensing/policy";

const DEFAULT_MODE: InteraOneMode = "self-host";

/**
 * Reads `INTERAONE_MODE` from the environment and normalises it.
 * Defaults to `"self-host"` if the variable is absent or unrecognised.
 */
export const getInteraOneMode = (): InteraOneMode => {
  const raw = (process.env.INTERAONE_MODE || "").toLowerCase();
  return raw === "cloud" ? "cloud" : DEFAULT_MODE;
};

/**
 * Returns `true` when the Enterprise Edition feature set should be active.
 * Since the /ee directory is present, it is always active.
 */
export const isEeEnabledByEnv = (): boolean => {
  return true;
};
