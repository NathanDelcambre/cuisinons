import { expect, test } from '@playwright/test';

test('login, recette, note, planning, optimisation', async ({ page }) => {
  const password = process.env.E2E_NATHAN_PASSWORD;
  test.skip(!password, 'E2E_NATHAN_PASSWORD requis');
  await page.goto('/connexion');
  await expect(page.getByRole('button', { name: 'Se connecter' })).toBeEnabled({ timeout: 20_000 });
  await page.getByLabel('Adresse e-mail').fill('nathan.delcambre@gmail.com');
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/planning');
  await page.goto('/recettes');
  // Le meme lien existe dans la barre laterale : on cible celui de la page.
  await page.getByRole('main').getByRole('link', { name: 'Nouvelle recette' }).click();
  await page.getByLabel('Nom').fill('Omelette e2e');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await page.getByPlaceholder(/Rechercher/).fill('oeuf');
  await expect(page.getByRole('button').filter({ hasText: /œuf|oeuf/i }).first()).toBeVisible({
    timeout: 15_000,
  });
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await page.getByPlaceholder(/Rechercher/).fill('lait');
  await expect(page.getByRole('button').filter({ hasText: /lait/i }).first()).toBeVisible({
    timeout: 15_000,
  });
  await page.keyboard.press('Enter');
  await page.getByPlaceholder('Étape 1').fill('Battre et cuire.');
  // L'editeur expose le meme bouton en entete et en pied de formulaire.
  await page.getByRole('button', { name: 'Enregistrer' }).first().click();
  await expect(page.getByRole('heading', { name: 'Omelette e2e' })).toBeVisible();
  await page.getByRole('button', { name: 'Noter 5 sur 5' }).click();
  await page.getByRole('button', { name: 'Ajouter au planning' }).click();
  await expect(page.getByRole('button', { name: 'Valider' })).toBeEnabled();
  await page.getByRole('button', { name: 'Valider' }).click();
  await page.goto('/planning');
  await expect(page.getByText(/kcal/i).first()).toBeVisible();
  await page.getByRole('button', { name: 'Ajustement intelligent' }).click();
  await expect(page.getByRole('dialog', { name: 'Ajustement intelligent' })).toBeVisible();
});

test('courses generees depuis le planning puis versees dans les reserves', async ({ page }) => {
  const password = process.env.E2E_NATHAN_PASSWORD;
  test.skip(!password, 'E2E_NATHAN_PASSWORD requis');
  await page.goto('/connexion');
  await expect(page.getByRole('button', { name: 'Se connecter' })).toBeEnabled({ timeout: 20_000 });
  await page.getByLabel('Adresse e-mail').fill('nathan.delcambre@gmail.com');
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/planning');

  await page.goto('/courses');
  await page.getByRole('main').getByRole('button', { name: 'Générer mes courses' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Générer mes courses' })).toBeVisible();
  await page.getByRole('button', { name: 'Générer la liste' }).click();
  // « Tout cocher » n'apparait qu'avec au moins une ligne a acheter.
  await expect(page.getByRole('button', { name: 'Tout cocher' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Tout cocher' }).click();
  await page.getByRole('button', { name: 'J’ai fait les courses' }).click();
  await expect(page.getByText(/ajouté\(s\) à tes réserves/)).toBeVisible();

  await page.goto('/reserves');
  await expect(page.getByRole('heading', { name: 'Réserves', level: 1 })).toBeVisible();
  // Une ligne de stock est editable : c'est la preuve que les achats sont arrives.
  await expect(page.getByLabel(/^Quantité de /).first()).toBeVisible();
});

test('proposer un plat s’ouvre depuis les recettes', async ({ page }) => {
  const password = process.env.E2E_NATHAN_PASSWORD;
  test.skip(!password, 'E2E_NATHAN_PASSWORD requis');
  await page.goto('/connexion');
  await expect(page.getByRole('button', { name: 'Se connecter' })).toBeEnabled({ timeout: 20_000 });
  await page.getByLabel('Adresse e-mail').fill('nathan.delcambre@gmail.com');
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/planning');
  await page.goto('/recettes');
  await page.getByRole('main').getByRole('button', { name: 'Proposer un plat' }).first().click();
  await expect(page).toHaveURL(/\/recettes(?:\?|$)/);
  await expect(page.getByRole('dialog', { name: 'Proposer un plat' })).toBeVisible();
  await expect(page.getByRole('radiogroup', { name: 'Régime' })).toBeVisible();
  await expect(page.getByText('Proposition impossible')).toHaveCount(0);
  await expect(page.getByText('Une erreur est survenue.')).toHaveCount(0);
  await expect(page.getByText(/réserves/i).first()).toBeVisible();
});
