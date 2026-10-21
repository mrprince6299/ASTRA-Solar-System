import {expect, test} from '@playwright/test';

function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  return errors;
}

/** Opens the panel when it is folded in the phone layout; elsewhere it is always open. */
async function openPanel(page) {
  const toggle = page.locator('#panel-toggle');
  if ((await toggle.isVisible()) && (await toggle.getAttribute('aria-expanded')) === 'false') {
    await toggle.click();
  }
}

test('ASTRA: enters Mars exploration and verifies surface HUD', async ({page}) => {
  const errors = trackErrors(page);
  await page.goto('./');
  await expect(page.locator('#loader')).toBeHidden();

  // Select Mars from sidebar
  await page.locator('[data-planet="mars"]').click();
  await openPanel(page);
  await expect(page.locator('#planet-name')).toHaveText(/Mars/i);

  // Click Explore Mars
  const exploreBtn = page.locator('#astra-explore-action-btn');
  await expect(exploreBtn).toBeVisible();
  await exploreBtn.click();

  // Verify Exploration HUD is visible
  const hud = page.locator('#astra-exploration-hud');
  await expect(hud).toHaveClass(/astra-exploration-hud--active/);
  await expect(page.locator('#astra-hud-planet-name')).toHaveText(/MARS/i);

  // Verify view mode switcher is present for Mars
  const viewModeBar = page.locator('#astra-view-mode-bar');
  await expect(viewModeBar).toBeVisible();
  await expect(page.locator('#astra-view-surface-btn')).toHaveClass(/astra-view-mode-btn--active/);

  // Verify return action
  const returnBtn = page.locator('#astra-hud-return-btn');
  await returnBtn.click();
  await expect(hud).not.toHaveClass(/astra-exploration-hud--active/);
  await expect(page.locator('#astra-mode-text')).toHaveText(/ORBITAL SYSTEM OVERVIEW/i);

  expect(errors).toEqual([]);
});

test('ASTRA: toggles Mars surface and orbital view modes', async ({page}) => {
  const errors = trackErrors(page);
  await page.goto('./');
  await expect(page.locator('#loader')).toBeHidden();

  // Select Mars & explore
  await page.locator('[data-planet="mars"]').click();
  await openPanel(page);
  await page.locator('#astra-explore-action-btn').click();

  const surfaceBtn = page.locator('#astra-view-surface-btn');
  const orbitBtn = page.locator('#astra-view-orbit-btn');

  // Switch to Orbital Recon
  await orbitBtn.click();
  await expect(orbitBtn).toHaveClass(/astra-view-mode-btn--active/);
  await expect(page.locator('#astra-mode-text')).toHaveText(/ORBITAL RECON: MARS/i);

  // Switch back to Surface Recon
  await surfaceBtn.click();
  await expect(surfaceBtn).toHaveClass(/astra-view-mode-btn--active/);
  await expect(page.locator('#astra-mode-text')).toHaveText(/SURFACE RECON: MARS/i);

  expect(errors).toEqual([]);
});

test('ASTRA: interactive life-support equipment controls recalculate risk', async ({page}) => {
  const errors = trackErrors(page);
  await page.goto('./');
  await expect(page.locator('#loader')).toBeHidden();

  await page.locator('[data-planet="mars"]').click();
  await openPanel(page);
  await page.locator('#astra-explore-action-btn').click();

  const o2OffBtn = page.locator('[data-equip="oxygenMode"][data-val="OFF"]');
  const moxieBtn = page.locator('[data-equip="oxygenMode"][data-val="MOXIE_REBREATHER"]');
  const primaryO2Btn = page.locator('[data-equip="oxygenMode"][data-val="PRIMARY"]');
  const depressBtn = page.locator('[data-equip="pressureSuit"][data-val="EMERGENCY_DEPRESS"]');
  const sealedBtn = page.locator('[data-equip="pressureSuit"][data-val="SEALED"]');
  const vitalsBadge = page.locator('#astra-vitals-status');

  // Initially optimal or nominal
  await expect(vitalsBadge).toContainText(/OPTIMAL|WARNING|HAZARD/);

  // Shut off Oxygen
  await o2OffBtn.click();
  await expect(o2OffBtn).toHaveClass(/astra-toggle-btn--active/);
  await expect(vitalsBadge).toContainText(/CRITICAL|TERMINAL|WARNING/);

  // Emergency Depressurization
  await depressBtn.click();
  await expect(depressBtn).toHaveClass(/astra-toggle-btn--active/);
  await expect(page.locator('#astra-risk-label')).toContainText(/HIGH RISK|CRITICAL HAZARD/i);

  // Restore pressure and engage MOXIE rebreather
  await sealedBtn.click();
  await expect(sealedBtn).toHaveClass(/astra-toggle-btn--active/);
  await moxieBtn.click();
  await expect(moxieBtn).toHaveClass(/astra-toggle-btn--active/);

  // Switch to primary O2
  await primaryO2Btn.click();
  await expect(primaryO2Btn).toHaveClass(/astra-toggle-btn--active/);

  expect(errors).toEqual([]);
});

test('ASTRA: environmental hazard events trigger operational changes and reset works', async ({page}) => {
  const errors = trackErrors(page);
  await page.goto('./');
  await expect(page.locator('#loader')).toBeHidden();

  await page.locator('[data-planet="mars"]').click();
  await openPanel(page);
  await page.locator('#astra-explore-action-btn').click();

  const stormBtn = page.locator('#astra-event-storm-btn');
  const tempBtn = page.locator('#astra-event-temp-btn');
  const resetBtn = page.locator('#astra-equip-reset-btn');

  // Trigger Dust Storm
  await stormBtn.click();
  await expect(stormBtn).toHaveClass(/astra-event-btn--active/);
  await expect(stormBtn.locator('strong')).toHaveText('ACTIVE');

  // Trigger Temperature Emergency
  await tempBtn.click();
  await expect(tempBtn).toHaveClass(/astra-event-btn--active/);
  await expect(tempBtn.locator('strong')).toHaveText('ACTIVE');
  await expect(page.locator('#astra-stat-temp')).toContainText('-125°C');

  // Click Reset Equipment & Vitals
  await resetBtn.click();

  // Events should be turned off
  await expect(stormBtn).not.toHaveClass(/astra-event-btn--active/);
  await expect(stormBtn.locator('strong')).toHaveText('OFF');
  await expect(tempBtn).not.toHaveClass(/astra-event-btn--active/);
  await expect(tempBtn.locator('strong')).toHaveText('OFF');

  // Baseline equipment should be restored to active defaults
  await expect(page.locator('[data-equip="oxygenMode"][data-val="PRIMARY"]')).toHaveClass(/astra-toggle-btn--active/);
  await expect(page.locator('[data-equip="pressureSuit"][data-val="SEALED"]')).toHaveClass(/astra-toggle-btn--active/);
  await expect(page.locator('[data-equip="thermalReg"][data-val="ACTIVE"]')).toHaveClass(/astra-toggle-btn--active/);
  await expect(page.locator('#astra-vitals-status')).toHaveText('OPTIMAL');

  expect(errors).toEqual([]);
});

test('ASTRA: Mars Rover drive controls, camera views, and scientific POI modal interaction', async ({page}) => {
  const errors = trackErrors(page);
  await page.goto('./');
  await expect(page.locator('#loader')).toBeHidden();

  await page.locator('[data-planet="mars"]').click();
  await openPanel(page);
  await page.locator('#astra-explore-action-btn').click();

  // Test Camera Mode Switcher
  const cockpitCamBtn = page.locator('[data-cam="cockpit"]');
  const chaseCamBtn = page.locator('[data-cam="chase"]');
  const orbitCamBtn = page.locator('[data-cam="orbit"]');

  await cockpitCamBtn.click();
  await expect(cockpitCamBtn).toHaveClass(/astra-cam-btn--active/);

  await orbitCamBtn.click();
  await expect(orbitCamBtn).toHaveClass(/astra-cam-btn--active/);

  await chaseCamBtn.click();
  await expect(chaseCamBtn).toHaveClass(/astra-cam-btn--active/);

  // Test Rover Virtual Drive Controls (forward dispatch)
  const forwardBtn = page.locator('[data-drive="forward"]');
  await forwardBtn.dispatchEvent('pointerdown');
  await page.waitForTimeout(300);
  await forwardBtn.dispatchEvent('pointerup');

  // Verify POI selection and scientific detail modal
  const jezeroPOI = page.locator('[data-poi="jezero-delta"]');
  await expect(jezeroPOI).toBeVisible();
  await jezeroPOI.click();

  const poiModal = page.locator('#astra-poi-modal');
  await expect(poiModal).toBeVisible();
  await expect(page.locator('#astra-poi-title')).toHaveText(/Jezero Crater Paleolake Delta/i);
  await expect(page.locator('#astra-poi-cat')).toHaveText(/Astrobiology & Sedimentology/i);
  await expect(page.locator('#astra-poi-samples-list')).toContainText('Smectite Clay Core');

  // Close POI Modal via Collect & Log button
  const collectBtn = page.locator('#astra-poi-collect-btn');
  await collectBtn.click();
  await expect(poiModal).toHaveClass(/astra-modal--dismissed/);

  expect(errors).toEqual([]);
});

test('ASTRA: Jupiter atmospheric exploration, Jovian Aeroskimmer flight controls, and envelope warnings', async ({
  page,
}) => {
  const errors = trackErrors(page);
  await page.goto('./');
  await expect(page.locator('#loader')).toBeHidden();

  // Select Jupiter from sidebar
  await page.locator('[data-planet="jupiter"]').click();
  await openPanel(page);
  await expect(page.locator('#planet-name')).toHaveText(/Jupiter/i);

  // Click Explore Atmosphere
  const exploreBtn = page.locator('#astra-explore-action-btn');
  await expect(exploreBtn).toBeVisible();
  await expect(exploreBtn).toContainText(/EXPLORE/i);
  await exploreBtn.click();

  // Verify Exploration HUD is visible for Jupiter
  const hud = page.locator('#astra-exploration-hud');
  await expect(hud).toHaveClass(/astra-exploration-hud--active/);
  await expect(page.locator('#astra-hud-planet-name')).toHaveText(/JUPITER/i);

  // Jupiter has no solid surface: verify Jupiter specific flight telemetry section
  const jupSection = page.locator('#astra-jupiter-section');
  await expect(jupSection).toBeVisible();
  await expect(page.locator('#astra-rover-section')).toBeHidden();

  // Check atmospheric dive indicators
  await expect(page.locator('#astra-jup-pressure')).toContainText(/bar/i);
  await expect(page.locator('#astra-jup-speed')).toContainText(/km\/h/i);
  await expect(page.locator('#astra-jup-wind')).toContainText(/km\/h/i);

  // Test flight control inputs (dive, climb, throttle)
  const diveBtn = page.locator('[data-flight="pitchDown"]');
  const climbBtn = page.locator('[data-flight="pitchUp"]');
  const throttleUpBtn = page.locator('[data-flight="throttleUp"]');

  await diveBtn.dispatchEvent('pointerdown');
  await page.waitForTimeout(200);
  await diveBtn.dispatchEvent('pointerup');

  await climbBtn.dispatchEvent('pointerdown');
  await page.waitForTimeout(200);
  await climbBtn.dispatchEvent('pointerup');

  await throttleUpBtn.dispatchEvent('pointerdown');
  await page.waitForTimeout(200);
  await throttleUpBtn.dispatchEvent('pointerup');

  // Test Camera Switching in atmospheric flight
  const cockpitCam = page.locator('[data-cam="cockpit"]');
  await cockpitCam.click();
  await expect(cockpitCam).toHaveClass(/astra-cam-btn--active/);

  // Return to System
  const returnBtn = page.locator('#astra-hud-return-btn');
  await returnBtn.click();
  await expect(hud).not.toHaveClass(/astra-exploration-hud--active/);
  await expect(page.locator('#astra-mode-text')).toHaveText(/ORBITAL SYSTEM OVERVIEW/i);

  expect(errors).toEqual([]);
});
