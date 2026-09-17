import { expect, test } from '@playwright/test';

test('login, recette, note, planning, optimisation', async ({ page }) => {
  const password = process.env.E2E_NATHAN_PASSWORD;
  test.skip(!password, 'E2E_NATHAN_PASSWORD requis');
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Se connecter' })).toBeEnabled({ timeout: 20_000 });
  await page.getByLabel('Adresse e-mail').fill('nathan.delcambre@gmail.com');
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/planning');
  await page.goto('/recipes');
  await page.getByRole('link', { name: 'Nouvelle recette' }).click();
  await page.getByLabel('Nom').fill('Omelette e2e');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await page.getByPlaceholder(/Rechercher/).fill('oeuf');
  await expect(page.getByRole('button').filter({ hasText: /œuf|oeuf/i }).first()).toBeVisible({
    timeout: 15_000,
  });
  await page.keyboard.press('Enter');
  await page.getByPlaceholder('Étape 1').fill('Battre et cuire.');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('heading', { name: 'Omelette e2e' })).toBeVisible();
  await page.getByLabel('5 étoiles').click();
  await page.getByRole('button', { name: 'Ajouter au planning' }).click();
  await expect(page.getByRole('button', { name: 'Valider' })).toBeEnabled();
  await page.getByRole('button', { name: 'Valider' }).click();
  await page.goto('/planning');
  await expect(page.getByText(/kcal/i).first()).toBeVisible();
  await page.getByLabel('Activer').check();
  await expect(page.getByRole('button', { name: 'Optimiser ma journée' })).toBeVisible();
  await page.getByRole('button', { name: 'Optimiser ma journée' }).click();
  await expect(page.getByText(/Proposition visible|kcal|ajust/i).first()).toBeVisible();
});
