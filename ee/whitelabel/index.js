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
 * @typedef {object} MongooseModel
 * @property {(id: string, update: object) => Promise<unknown>} findByIdAndUpdate
 *
 * @typedef {object} UpdateSettingsParams
 * @property {string} organizationId
 * @property {boolean} removeBranding
 * @property {{ OrganizationModel: MongooseModel }} core
 *
 * @typedef {object} UpdateSettingsResult
 * @property {boolean} removeBranding
 */

module.exports = {
  /**
   * Updates the white-label settings for an organisation.
   * Uses Dependency Injection for the OrganizationModel so this module
   * never imports directly from the core API codebase.
   *
   * @param {UpdateSettingsParams} params
   * @returns {Promise<UpdateSettingsResult>}
   */
  async updateSettings({ organizationId, removeBranding, core }) {
    const { OrganizationModel } = core;

    await OrganizationModel.findByIdAndUpdate(organizationId, {
      $set: { whiteLabelEnabled: !!removeBranding },
    });

    return { removeBranding: !!removeBranding };
  },
};
