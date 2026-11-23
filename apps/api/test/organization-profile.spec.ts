import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { OrganizationsController } from "../src/modules/organizations/organizations.controller.js";
import type { BusinessSettingsUpdate } from "../src/modules/organizations/organization.repository.js";

const session = {
  userId: "user-a",
  organizationId: "org-a",
  role: "OWNER" as const,
  expiresAt: new Date("2026-12-01T00:00:00Z"),
};

function createController() {
  const organizations = {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  };
  const sessions = {
    requireSession: vi.fn().mockResolvedValue(session),
  };

  return {
    controller: new OrganizationsController(organizations as never, sessions as never),
    organizations,
    sessions,
  };
}

describe("OrganizationsController current profile", () => {
  it("rejects a request without a session before reading organization settings", async () => {
    const { controller, organizations, sessions } = createController();
    sessions.requireSession.mockRejectedValue(new UnauthorizedException("Authentication required"));

    await expect(controller.getCurrentSettings(undefined)).rejects.toThrow("Authentication required");

    expect(sessions.requireSession).toHaveBeenCalledWith(undefined);
    expect(organizations.getSettings).not.toHaveBeenCalled();
  });

  it("loads the current profile using the organization from the authenticated session", async () => {
    const { controller, organizations, sessions } = createController();
    const profile = { organizationId: "org-a", name: "Empresa A", timezone: "America/Sao_Paulo", version: 1 };
    organizations.getSettings.mockResolvedValue(profile);

    await expect(controller.getCurrentSettings("theme=dark; saas_lead_session=session-token")).resolves.toEqual(profile);

    expect(sessions.requireSession).toHaveBeenCalledWith("session-token");
    expect(organizations.getSettings).toHaveBeenCalledWith(
      { organizationId: "org-a", userId: "user-a", role: "OWNER" },
      "org-a",
    );
  });

  it("updates name, timezone, business hours and discount permission", async () => {
    const { controller, organizations } = createController();
    const update: BusinessSettingsUpdate = {
      name: "Empresa A",
      timezone: "America/Sao_Paulo",
      businessHours: [{ day: "MONDAY", opensAt: "09:00", closesAt: "18:00" }],
      allowDiscounts: true,
    };
    const saved = { organizationId: "org-a", ...update, version: 2 };
    organizations.updateSettings.mockResolvedValue(saved);

    await expect(controller.updateCurrentSettings(update, "saas_lead_session=session-token")).resolves.toEqual(saved);

    expect(organizations.updateSettings).toHaveBeenCalledWith(
      { organizationId: "org-a", userId: "user-a", role: "OWNER" },
      "org-a",
      update,
    );
  });

  it("does not allow the request body to change the authenticated organization", async () => {
    const { controller, organizations } = createController();
    const update = {
      organizationId: "org-b",
      name: "Tentativa de acesso cruzado",
      timezone: "America/Recife",
      businessHours: [{ day: "TUESDAY", opensAt: "10:00", closesAt: "17:00" }],
      allowDiscounts: false,
    } as BusinessSettingsUpdate & { organizationId: string };
    organizations.updateSettings.mockResolvedValue({
      organizationId: "org-a",
      name: update.name,
      timezone: update.timezone,
      businessHours: update.businessHours,
      allowDiscounts: update.allowDiscounts,
      version: 3,
    });

    await controller.updateCurrentSettings(update, "saas_lead_session=session-token");

    expect(organizations.updateSettings).toHaveBeenCalledWith(
      { organizationId: "org-a", userId: "user-a", role: "OWNER" },
      "org-a",
      {
        name: "Tentativa de acesso cruzado",
        timezone: "America/Recife",
        businessHours: update.businessHours,
        allowDiscounts: false,
      },
    );
    expect(organizations.updateSettings.mock.calls[0]?.[1]).not.toBe("org-b");
  });
});
