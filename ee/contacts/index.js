/*
 * Copyright (c) 2026 Om Pharate
 *
 * This file is part of InteraOne Enterprise Edition (EE).
 *
 * Licensed under the InteraOne Enterprise License.
 * See LICENSE for details.
 */

// @ts-check
"use strict";

/**
 * @typedef {object} BeforeListContactsParams
 * @property {string} organizationId
 */

module.exports = {
  /**
   * Hook called before listing contacts for an organisation.
   * Reserved for EE-specific contact enrichments (e.g. CRM sync, data augmentation).
   *
   * @param {BeforeListContactsParams} _params
   * @returns {Promise<void>}
   */
  async beforeListContacts(_params) {
    // Reserved for EE-specific contact enrichments.
  },
};
